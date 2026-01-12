package notification

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	notif "basaltpass-backend/internal/service/notification"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type TenantUserLite struct {
	ID       uint   `json:"id"`
	Email    string `json:"email"`
	Phone    string `json:"phone,omitempty"`
	Nickname string `json:"nickname"`
	Role     string `json:"role,omitempty"`
}

func getTenantAdminUserIDs(tenantID uint) ([]uint, error) {
	db := common.DB()
	var ids []uint
	if err := db.Table("tenant_admins").Where("tenant_id = ?", tenantID).Pluck("user_id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

func getTenantUserIDs(tenantID uint) ([]uint, error) {
	db := common.DB()
	var ids []uint
	if err := db.Table("app_users au").
		Select("DISTINCT au.user_id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Where("a.tenant_id = ?", tenantID).
		Pluck("au.user_id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

func listTenantUsersLite(tenantID uint, search string, limit int) ([]TenantUserLite, error) {
	db := common.DB()
	q := db.Table("users u").
		Select("DISTINCT u.id, u.email, u.phone, u.nickname, COALESCE(ta.role, 'member') as role").
		Joins("JOIN app_users au ON au.user_id = u.id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Joins("LEFT JOIN tenant_admins ta ON ta.user_id = u.id AND ta.tenant_id = ?", tenantID).
		Where("a.tenant_id = ?", tenantID)

	if s := strings.TrimSpace(search); s != "" {
		like := "%" + s + "%"
		q = q.Where(
			"LOWER(u.email) LIKE LOWER(?) OR LOWER(u.nickname) LIKE LOWER(?) OR LOWER(u.phone) LIKE LOWER(?)",
			like, like, like,
		)
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	var rows []TenantUserLite
	if err := q.Order("u.id DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func intersectUint(requested []uint, allowed []uint) []uint {
	if len(requested) == 0 || len(allowed) == 0 {
		return nil
	}
	allowedSet := make(map[uint]struct{}, len(allowed))
	for _, id := range allowed {
		allowedSet[id] = struct{}{}
	}
	res := make([]uint, 0, len(requested))
	seen := make(map[uint]struct{}, len(requested))
	for _, id := range requested {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		if _, ok := allowedSet[id]; ok {
			res = append(res, id)
		}
	}
	return res
}

type TenantCreateRequest struct {
	AppName     string `json:"app_name"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	Type        string `json:"type"`
	ReceiverIDs []uint `json:"receiver_ids"`
}

// TenantCreateHandler POST /tenant/notifications
func TenantCreateHandler(c *fiber.Ctx) error {
	var req TenantCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	tenantID := c.Locals("tenantID").(uint)
	senderID := c.Locals("userID").(uint)
	// 验证/展开 receiver 属于租户；当为空时表示向租户下所有用户广播（按用户逐条写入，避免 receiver_id=0 导致全局已读问题）
	tenantUserIDs, err := getTenantUserIDs(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(tenantUserIDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "租户暂无可接收通知的用户"})
	}

	var rids []uint
	if len(req.ReceiverIDs) == 0 {
		rids = tenantUserIDs
	} else {
		rids = intersectUint(req.ReceiverIDs, tenantUserIDs)
	}
	if len(rids) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无有效接收者"})
	}

	if err := notif.Send(req.AppName, req.Title, req.Content, req.Type, &senderID, "租户管理员", rids); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "通知发送成功"})
}

// TenantListHandler GET /tenant/notifications
func TenantListHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	search := strings.TrimSpace(c.Query("search", ""))
	db := common.DB()
	adminIDs, err := getTenantAdminUserIDs(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(adminIDs) == 0 {
		return c.JSON(fiber.Map{"data": []model.Notification{}, "total": 0, "page": page, "page_size": pageSize})
	}

	tenantUserIDs, err := getTenantUserIDs(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(tenantUserIDs) == 0 {
		return c.JSON(fiber.Map{"data": []model.Notification{}, "total": 0, "page": page, "page_size": pageSize})
	}

	var notifs []model.Notification
	var total int64
	q := db.Model(&model.Notification{}).
		Where("sender_id IN ?", adminIDs).
		Where("receiver_id IN ?", tenantUserIDs)
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("title LIKE ? OR content LIKE ?", like, like)
	}
	if err := q.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := q.Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Preload("App").Find(&notifs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": notifs, "total": total, "page": page, "page_size": pageSize})
}

// 其余租户通知管理接口（删除、详情、更新、统计）
func TenantDeleteHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	db := common.DB()
	adminIDs, err := getTenantAdminUserIDs(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(adminIDs) == 0 {
		return c.SendStatus(fiber.StatusNoContent)
	}
	if err := db.Where("id = ? AND sender_id IN ?", uint(nid), adminIDs).Delete(&model.Notification{}).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func TenantGetNotificationHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	db := common.DB()
	adminIDs, err := getTenantAdminUserIDs(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	var notif model.Notification
	if err := db.Where("id = ? AND sender_id IN ?", uint(nid), adminIDs).Preload("App").First(&notif).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": notif})
}

func TenantUpdateNotificationHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	var req struct{ Title, Content, Type string }
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	db := common.DB()
	adminIDs, err := getTenantAdminUserIDs(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	res := db.Model(&model.Notification{}).Where("id = ? AND sender_id IN ?", uint(nid), adminIDs).Updates(map[string]any{"title": req.Title, "content": req.Content, "type": req.Type})
	if res.Error != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": res.Error.Error()})
	}
	if res.RowsAffected == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无权限或不存在"})
	}
	return c.JSON(fiber.Map{"message": "更新成功"})
}

func TenantGetNotificationStatsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	db := common.DB()
	adminIDs, err := getTenantAdminUserIDs(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(adminIDs) == 0 {
		return c.JSON(fiber.Map{"data": fiber.Map{"total_sent": 0, "total_read": 0, "total_unread": 0, "read_rate": 0}})
	}

	tenantUserIDs, err := getTenantUserIDs(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(tenantUserIDs) == 0 {
		return c.JSON(fiber.Map{"data": fiber.Map{"total_sent": 0, "total_read": 0, "total_unread": 0, "read_rate": 0}})
	}

	var total, read int64
	base := db.Model(&model.Notification{}).Where("sender_id IN ?", adminIDs).Where("receiver_id IN ?", tenantUserIDs)
	if err := base.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if err := base.Where("is_read = ?", true).Count(&read).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	unread := total - read
	var typeStats []struct {
		Type  string
		Count int64
	}
	base.Select("type, COUNT(*) as count").Group("type").Find(&typeStats)
	m := map[string]int64{}
	for _, s := range typeStats {
		m[s.Type] = s.Count
	}
	readRate := 0.0
	if total > 0 {
		readRate = (float64(read) / float64(total)) * 100
	}
	return c.JSON(fiber.Map{"data": fiber.Map{"total_sent": total, "total_read": read, "total_unread": unread, "read_rate": readRate, "type_stats": m}})
}

// TenantListUsersHandler GET /tenant/notifications/users
func TenantListUsersHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	search := strings.TrimSpace(c.Query("search", ""))
	users, err := listTenantUsersLite(tenantID, search, 50)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": users})
}

// TenantSearchUsersHandler GET /tenant/notifications/users/search
func TenantSearchUsersHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	search := strings.TrimSpace(c.Query("search", ""))
	users, err := listTenantUsersLite(tenantID, search, 20)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": users})
}
