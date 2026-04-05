package s2s

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	emailsvc "basaltpass-backend/internal/service/email"
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type s2sCreateTeamRequest struct {
	Name          string `json:"name"`
	Description   string `json:"description"`
	AvatarURL     string `json:"avatar_url"`
	OwnerUserID   uint   `json:"owner_user_id"`
	MemberUserIDs []uint `json:"member_user_ids"`
}

type s2sSendNotificationsRequest struct {
	Title      string `json:"title"`
	Content    string `json:"content"`
	Type       string `json:"type"`
	UserIDs    []uint `json:"user_ids"`
	Broadcast  bool   `json:"broadcast"`
	SenderName string `json:"sender_name"`
}

type s2sSendEmailsRequest struct {
	Subject   string            `json:"subject"`
	TextBody  string            `json:"text_body"`
	HTMLBody  string            `json:"html_body"`
	UserIDs   []uint            `json:"user_ids"`
	Broadcast bool              `json:"broadcast"`
	ReplyTo   string            `json:"reply_to"`
	Headers   map[string]string `json:"headers"`
	From      string            `json:"from"`
	FromName  string            `json:"from_name"`
}

func uniqueUint(values []uint) []uint {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[uint]struct{}, len(values))
	out := make([]uint, 0, len(values))
	for _, v := range values {
		if v == 0 {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}

func currentS2SApp(c *fiber.Ctx) (*model.App, error) {
	appIDAny := c.Locals("s2s_app_id")
	appID, ok := appIDAny.(uint)
	if !ok || appID == 0 {
		return nil, fiber.NewError(fiber.StatusBadRequest, "invalid app context")
	}
	tenantID, err := s2sTenantID(c)
	if err != nil {
		return nil, err
	}

	var app model.App
	if err := common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fiber.NewError(fiber.StatusNotFound, "app not found")
		}
		return nil, err
	}
	return &app, nil
}

func ensureUsersInTenant(tenantID uint, userIDs []uint) error {
	userIDs = uniqueUint(userIDs)
	if len(userIDs) == 0 {
		return nil
	}

	var count int64
	if err := common.DB().Table("tenant_users").Where("tenant_id = ? AND user_id IN ?", tenantID, userIDs).Count(&count).Error; err != nil {
		return err
	}
	if int(count) != len(userIDs) {
		return fiber.NewError(fiber.StatusBadRequest, "one or more users are outside the tenant")
	}
	return nil
}

func loadAuthorizedAppUsers(appID uint, requested []uint) ([]model.User, error) {
	requested = uniqueUint(requested)

	q := common.DB().Model(&model.User{}).
		Joins("JOIN app_users au ON au.user_id = system_auth_users.id").
		Where("au.app_id = ? AND au.status = ?", appID, model.AppUserStatusActive).
		Distinct("system_auth_users.id")

	if len(requested) > 0 {
		q = q.Where("system_auth_users.id IN ?", requested)
	}

	var users []model.User
	if err := q.Order("system_auth_users.id ASC").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func teamMemberResponse(m model.TeamMember) fiber.Map {
	return fiber.Map{
		"id":         m.ID,
		"user_id":    m.UserID,
		"role":       m.Role,
		"status":     m.Status,
		"joined_at":  time.Unix(m.JoinedAt, 0).UTC().Format(time.RFC3339),
		"created_at": m.CreatedAt,
		"user": fiber.Map{
			"id":         m.User.ID,
			"email":      m.User.Email,
			"nickname":   m.User.Nickname,
			"avatar_url": m.User.AvatarURL,
		},
	}
}

func teamDetailResponse(t model.Team) fiber.Map {
	members := make([]fiber.Map, 0, len(t.Members))
	for _, m := range t.Members {
		members = append(members, teamMemberResponse(m))
	}
	return fiber.Map{
		"id":           t.ID,
		"tenant_id":    t.TenantID,
		"name":         t.Name,
		"description":  t.Description,
		"avatar_url":   t.AvatarURL,
		"is_active":    t.IsActive,
		"member_count": len(t.Members),
		"created_at":   t.CreatedAt,
		"updated_at":   t.UpdatedAt,
		"members":      members,
	}
}

// GET /api/v1/s2s/teams
// Optional: user_id, q, page, page_size
func ListTeamsHandler(c *fiber.Ctx) error {
	tenantID, err := s2sTenantID(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	userIDStr := strings.TrimSpace(c.Query("user_id"))
	var userID uint
	if userIDStr != "" {
		uid64, parseErr := strconv.ParseUint(userIDStr, 10, 64)
		if parseErr != nil || uid64 == 0 {
			return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
		}
		userID = uint(uid64)
		ok, checkErr := userInTenant(userID, tenantID)
		if checkErr != nil {
			return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": checkErr.Error()})
		}
		if !ok {
			return unifiedResponse(c, fiber.StatusNotFound, nil, fiber.Map{"code": "not_found", "message": "user not found"})
		}
	}

	keyword := strings.TrimSpace(c.Query("q"))
	db := common.DB().Model(&model.Team{}).Where("tenant_id = ?", tenantID)
	if userID > 0 {
		db = db.Joins("JOIN system_auth_team_members tm ON tm.team_id = system_auth_teams.id").Where("tm.user_id = ?", userID)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		db = db.Where("name LIKE ? OR description LIKE ?", like, like)
	}

	var total int64
	if err := db.Distinct("system_auth_teams.id").Count(&total).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}

	var teams []model.Team
	if err := db.Preload("Members").
		Distinct("system_auth_teams.id").
		Order("system_auth_teams.id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&teams).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}

	items := make([]fiber.Map, 0, len(teams))
	for _, t := range teams {
		items = append(items, fiber.Map{
			"id":           t.ID,
			"tenant_id":    t.TenantID,
			"name":         t.Name,
			"description":  t.Description,
			"avatar_url":   t.AvatarURL,
			"is_active":    t.IsActive,
			"member_count": len(t.Members),
			"created_at":   t.CreatedAt,
			"updated_at":   t.UpdatedAt,
		})
	}

	return unifiedResponse(c, fiber.StatusOK, fiber.Map{
		"teams":     items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, nil)
}

// POST /api/v1/s2s/teams
func CreateTeamHandler(c *fiber.Ctx) error {
	tenantID, err := s2sTenantID(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}

	var req s2sCreateTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid JSON body"})
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.AvatarURL = strings.TrimSpace(req.AvatarURL)
	req.MemberUserIDs = uniqueUint(req.MemberUserIDs)

	if req.Name == "" {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "name is required"})
	}
	if len(req.Name) > 100 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "name too long"})
	}
	if len(req.Description) > 500 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "description too long"})
	}

	userIDs := make([]uint, 0, len(req.MemberUserIDs)+1)
	if req.OwnerUserID > 0 {
		userIDs = append(userIDs, req.OwnerUserID)
	}
	userIDs = append(userIDs, req.MemberUserIDs...)
	if err := ensureUsersInTenant(tenantID, userIDs); err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}

	var team model.Team
	err = common.DB().Transaction(func(tx *gorm.DB) error {
		team = model.Team{
			TenantID:    tenantID,
			Name:        req.Name,
			Description: req.Description,
			AvatarURL:   req.AvatarURL,
			IsActive:    true,
		}
		if err := tx.Create(&team).Error; err != nil {
			return err
		}

		members := make([]model.TeamMember, 0, len(userIDs))
		seen := make(map[uint]struct{}, len(userIDs))
		if req.OwnerUserID > 0 {
			members = append(members, model.TeamMember{
				TeamID:   team.ID,
				UserID:   req.OwnerUserID,
				Role:     model.TeamRoleOwner,
				Status:   "active",
				JoinedAt: time.Now().Unix(),
			})
			seen[req.OwnerUserID] = struct{}{}
		}
		for _, uid := range req.MemberUserIDs {
			if _, ok := seen[uid]; ok {
				continue
			}
			seen[uid] = struct{}{}
			members = append(members, model.TeamMember{
				TeamID:   team.ID,
				UserID:   uid,
				Role:     model.TeamRoleMember,
				Status:   "active",
				JoinedAt: time.Now().Unix(),
			})
		}
		if len(members) > 0 {
			if err := tx.Create(&members).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}

	var created model.Team
	if err := common.DB().Preload("Members.User").First(&created, team.ID).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	return unifiedResponse(c, fiber.StatusCreated, teamDetailResponse(created), nil)
}

// GET /api/v1/s2s/teams/:id
func GetTeamHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	tid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || tid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid team id"})
	}

	tenantID, err := s2sTenantID(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}

	var team model.Team
	if err := common.DB().Preload("Members.User").Where("id = ? AND tenant_id = ?", uint(tid64), tenantID).First(&team).Error; err != nil {
		return unifiedResponse(c, fiber.StatusNotFound, nil, fiber.Map{"code": "not_found", "message": "team not found"})
	}
	return unifiedResponse(c, fiber.StatusOK, teamDetailResponse(team), nil)
}

// GET /api/v1/s2s/users/:id/teams
func GetUserTeamsHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
	}

	tenantID, err := s2sTenantID(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}
	ok, err := userInTenant(uint(uid64), tenantID)
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	if !ok {
		return unifiedResponse(c, fiber.StatusNotFound, nil, fiber.Map{"code": "not_found", "message": "user not found"})
	}

	var memberships []model.TeamMember
	if err := common.DB().
		Preload("Team.Members").
		Where("user_id = ?", uint(uid64)).
		Joins("JOIN system_auth_teams t ON t.id = system_auth_team_members.team_id").
		Where("t.tenant_id = ?", tenantID).
		Order("system_auth_team_members.id DESC").
		Find(&memberships).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}

	teams := make([]fiber.Map, 0, len(memberships))
	for _, membership := range memberships {
		teams = append(teams, fiber.Map{
			"id":           membership.Team.ID,
			"tenant_id":    membership.Team.TenantID,
			"name":         membership.Team.Name,
			"description":  membership.Team.Description,
			"avatar_url":   membership.Team.AvatarURL,
			"is_active":    membership.Team.IsActive,
			"member_count": len(membership.Team.Members),
			"role":         membership.Role,
			"status":       membership.Status,
			"joined_at":    time.Unix(membership.JoinedAt, 0).UTC().Format(time.RFC3339),
			"created_at":   membership.Team.CreatedAt,
			"updated_at":   membership.Team.UpdatedAt,
		})
	}

	return unifiedResponse(c, fiber.StatusOK, fiber.Map{"teams": teams}, nil)
}

// POST /api/v1/s2s/notifications
func SendNotificationsHandler(c *fiber.Ctx) error {
	app, err := currentS2SApp(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_context", "message": err.Error()})
	}

	var req s2sSendNotificationsRequest
	if err := c.BodyParser(&req); err != nil {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid JSON body"})
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	req.Type = strings.ToLower(strings.TrimSpace(req.Type))
	req.SenderName = strings.TrimSpace(req.SenderName)
	req.UserIDs = uniqueUint(req.UserIDs)

	if req.Title == "" || req.Content == "" {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "title and content are required"})
	}
	if req.Type == "" {
		req.Type = "info"
	}
	switch req.Type {
	case "info", "success", "warning", "error":
	default:
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid notification type"})
	}
	if !req.Broadcast && len(req.UserIDs) == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "user_ids is required unless broadcast=true"})
	}

	targetUsers, err := loadAuthorizedAppUsers(app.ID, req.UserIDs)
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	if req.Broadcast {
		targetUsers, err = loadAuthorizedAppUsers(app.ID, nil)
		if err != nil {
			return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
		}
	}
	if len(targetUsers) == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "no authorized app users matched"})
	}

	senderName := req.SenderName
	if senderName == "" {
		senderName = app.Name
	}

	now := time.Now()
	notifs := make([]model.Notification, 0, len(targetUsers))
	userIDs := make([]uint, 0, len(targetUsers))
	for _, user := range targetUsers {
		userIDs = append(userIDs, user.ID)
		notifs = append(notifs, model.Notification{
			Title:      req.Title,
			Content:    req.Content,
			Type:       req.Type,
			SenderName: senderName,
			ReceiverID: user.ID,
			CreatedAt:  now,
		})
	}
	if err := common.DB().Create(&notifs).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}

	return unifiedResponse(c, fiber.StatusCreated, fiber.Map{
		"sent_count":        len(notifs),
		"target_user_ids":   userIDs,
		"notification_type": req.Type,
		"broadcast":         req.Broadcast,
	}, nil)
}

func sendEmailAndTrack(service *emailsvc.Service, msg *emailsvc.Message, emailContext string) (*model.EmailLog, *emailsvc.SendResult, error) {
	emailsvc.ApplyDefaultSender(msg)
	logSvc := service.GetLoggingService()
	emailLog, err := logSvc.LogEmailSend(context.Background(), msg, service.GetSender().Provider(), nil, emailContext)
	if err != nil {
		return nil, nil, err
	}

	result, sendErr := service.GetSender().Send(context.Background(), msg)
	if updateErr := logSvc.UpdateEmailSendStatus(context.Background(), emailLog.ID, result, sendErr); updateErr != nil && sendErr == nil {
		sendErr = updateErr
	}
	return emailLog, result, sendErr
}

// POST /api/v1/s2s/emails/send
func SendEmailsHandler(c *fiber.Ctx) error {
	app, err := currentS2SApp(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_context", "message": err.Error()})
	}

	var req s2sSendEmailsRequest
	if err := c.BodyParser(&req); err != nil {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid JSON body"})
	}
	req.Subject = strings.TrimSpace(req.Subject)
	req.TextBody = strings.TrimSpace(req.TextBody)
	req.HTMLBody = strings.TrimSpace(req.HTMLBody)
	req.ReplyTo = strings.TrimSpace(req.ReplyTo)
	req.From = strings.TrimSpace(req.From)
	req.FromName = strings.TrimSpace(req.FromName)
	req.UserIDs = uniqueUint(req.UserIDs)

	if req.Subject == "" {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "subject is required"})
	}
	if req.TextBody == "" && req.HTMLBody == "" {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "text_body or html_body is required"})
	}
	if !req.Broadcast && len(req.UserIDs) == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "user_ids is required unless broadcast=true"})
	}

	targetUsers, err := loadAuthorizedAppUsers(app.ID, req.UserIDs)
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	if req.Broadcast {
		targetUsers, err = loadAuthorizedAppUsers(app.ID, nil)
		if err != nil {
			return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
		}
	}
	if len(targetUsers) == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "no authorized app users matched"})
	}

	service, err := emailsvc.NewServiceFromConfig(config.Get())
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "email_unavailable", "message": err.Error()})
	}

	results := make([]fiber.Map, 0, len(targetUsers))
	sentCount := 0
	failedCount := 0
	for _, user := range targetUsers {
		if strings.TrimSpace(user.Email) == "" {
			failedCount++
			results = append(results, fiber.Map{
				"user_id": user.ID,
				"email":   "",
				"status":  model.EmailStatusFailed,
				"error":   "user email is empty",
			})
			continue
		}

		msg := &emailsvc.Message{
			From:     req.From,
			FromName: req.FromName,
			To:       []string{user.Email},
			Subject:  req.Subject,
			TextBody: req.TextBody,
			HTMLBody: req.HTMLBody,
			ReplyTo:  req.ReplyTo,
			Headers:  req.Headers,
		}
		if msg.Headers == nil {
			msg.Headers = map[string]string{}
		}
		msg.Headers["X-BasaltPass-App-ID"] = strconv.FormatUint(uint64(app.ID), 10)
		msg.Headers["X-BasaltPass-App-Name"] = app.Name

		emailLog, result, sendErr := sendEmailAndTrack(service, msg, "s2s_app_send")
		status := model.EmailStatusSent
		if sendErr != nil {
			status = model.EmailStatusFailed
			failedCount++
		} else {
			sentCount++
		}

		item := fiber.Map{
			"user_id": user.ID,
			"email":   user.Email,
			"status":  status,
		}
		if emailLog != nil {
			item["email_log_id"] = emailLog.ID
		}
		if result != nil {
			item["provider"] = result.Provider
			item["message_id"] = result.MessageID
			item["sent_at"] = result.SentAt
		}
		if sendErr != nil {
			item["error"] = sendErr.Error()
		}
		results = append(results, item)
	}

	return unifiedResponse(c, fiber.StatusOK, fiber.Map{
		"results":      results,
		"sent_count":   sentCount,
		"failed_count": failedCount,
		"broadcast":    req.Broadcast,
	}, nil)
}
