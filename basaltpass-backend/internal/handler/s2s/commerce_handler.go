package s2s

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// GET /api/v1/s2s/users/:id/messages
// 可选参数：status=unread|all（默认all），page=1，page_size=20
func GetUserMessagesHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
	}
	status := c.Query("status", "all")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	db := common.DB()
	q := db.Model(&model.Notification{}).Where("receiver_id = ? OR receiver_id = 0", uint(uid64))
	if status == "unread" {
		q = q.Where("is_read = ?", false)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	var list []model.Notification
	if err := q.Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Preload("App").Find(&list).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	// 返回分页结果
	return unifiedResponse(c, fiber.StatusOK, fiber.Map{
		"messages":  list,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, nil)
}

// GET /api/v1/s2s/users/:id/products
// 返回用户通过活跃订阅或已支付订单拥有的产品列表
func GetUserPurchasedProductsHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
	}
	db := common.DB()

	productIDs := map[uint]struct{}{}

	// 通过订阅获取产品
	type pidRow struct{ ID uint }
	var subRows []pidRow
	if err := db.Table("market_subscriptions s").
		Select("p.id as id").
		Joins("JOIN market_prices pr ON s.current_price_id = pr.id").
		Joins("JOIN market_plans pl ON pr.plan_id = pl.id").
		Joins("JOIN market_products p ON pl.product_id = p.id").
		Where("s.user_id = ? AND s.status IN ?", uint(uid64), []string{"trialing", "active"}).
		Group("p.id").
		Scan(&subRows).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	for _, r := range subRows {
		productIDs[r.ID] = struct{}{}
	}

	// 通过已支付订单获取产品
	var ordRows []pidRow
	if err := db.Table("orders o").
		Select("p.id as id").
		Joins("JOIN market_prices pr ON o.price_id = pr.id").
		Joins("JOIN market_plans pl ON pr.plan_id = pl.id").
		Joins("JOIN market_products p ON pl.product_id = p.id").
		Where("o.user_id = ? AND o.status = ?", uint(uid64), "paid").
		Group("p.id").
		Scan(&ordRows).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	for _, r := range ordRows {
		productIDs[r.ID] = struct{}{}
	}

	// 查询产品详情
	ids := make([]uint, 0, len(productIDs))
	for id := range productIDs {
		ids = append(ids, id)
	}
	var products []model.Product
	if len(ids) > 0 {
		if err := db.Where("id IN ?", ids).Find(&products).Error; err != nil {
			return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
		}
	}
	return unifiedResponse(c, fiber.StatusOK, fiber.Map{"products": products}, nil)
}

// GET /api/v1/s2s/users/:id/products/:product_id/ownership
// 返回 { has_ownership: bool, via: ["subscription","order"] }
func CheckUserProductOwnershipHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
	}
	pidStr := c.Params("product_id")
	pid64, err := strconv.ParseUint(pidStr, 10, 64)
	if err != nil || pid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid product id"})
	}

	db := common.DB()
	var count int64
	// 订阅路径
	if err := db.Table("market_subscriptions s").
		Joins("JOIN market_prices pr ON s.current_price_id = pr.id").
		Joins("JOIN market_plans pl ON pr.plan_id = pl.id").
		Joins("JOIN market_products p ON pl.product_id = p.id").
		Where("s.user_id = ? AND s.status IN ? AND p.id = ?", uint(uid64), []string{"trialing", "active"}, uint(pid64)).
		Count(&count).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	via := []string{}
	has := count > 0
	if has {
		via = append(via, "subscription")
	}

	// 订单路径
	count = 0
	if err := db.Table("orders o").
		Joins("JOIN market_prices pr ON o.price_id = pr.id").
		Joins("JOIN market_plans pl ON pr.plan_id = pl.id").
		Joins("JOIN market_products p ON pl.product_id = p.id").
		Where("o.user_id = ? AND o.status = ? AND p.id = ?", uint(uid64), "paid", uint(pid64)).
		Count(&count).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	if count > 0 {
		has = true
		via = append(via, "order")
	}

	return unifiedResponse(c, fiber.StatusOK, fiber.Map{
		"has_ownership": has,
		"via":           via,
	}, nil)
}
