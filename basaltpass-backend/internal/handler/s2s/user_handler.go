package s2s

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/wallet"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// unifiedResponse 统一响应结构
func unifiedResponse(c *fiber.Ctx, status int, data interface{}, errObj interface{}) error {
	requestID, _ := c.Locals("requestid").(string)
	if status >= 400 {
		return c.Status(status).JSON(fiber.Map{"error": errObj, "data": nil, "request_id": requestID})
	}
	return c.Status(status).JSON(fiber.Map{"data": data, "error": nil, "request_id": requestID})
}

func userSummary(u model.User) fiber.Map {
	return fiber.Map{
		"id":             u.ID,
		"email":          u.Email,
		"nickname":       u.Nickname,
		"avatar_url":     u.AvatarURL,
		"email_verified": u.EmailVerified,
		"phone":          u.Phone,
		"phone_verified": u.PhoneVerified,
		"created_at":     u.CreatedAt,
		"updated_at":     u.UpdatedAt,
	}
}

func s2sTenantID(c *fiber.Ctx) (uint, error) {
	// tenant_id can be omitted (defaults to authenticated client's tenant).
	// If explicitly provided, it must exactly match the authenticated tenant
	// to prevent cross-tenant probing.
	clientTenantAny := c.Locals("s2s_tenant_id")
	clientTenantID, ok := clientTenantAny.(uint)
	if !ok || clientTenantID == 0 {
		return 0, fiber.NewError(fiber.StatusBadRequest, "invalid tenant context")
	}

	tenantStr := strings.TrimSpace(c.Query("tenant_id"))
	if tenantStr == "" {
		return clientTenantID, nil
	}
	tid64, err := strconv.ParseUint(tenantStr, 10, 64)
	if err != nil || tid64 == 0 {
		return 0, fiber.NewError(fiber.StatusBadRequest, "invalid tenant id")
	}
	requestedTenantID := uint(tid64)
	if requestedTenantID != clientTenantID {
		return 0, fiber.NewError(fiber.StatusForbidden, "tenant mismatch")
	}
	return requestedTenantID, nil
}

func userInTenant(userID uint, tenantID uint) (bool, error) {
	var count int64
	err := common.DB().Table("tenant_users").
		Where("user_id = ? AND tenant_id = ?", userID, tenantID).
		Count(&count).Error
	return count > 0, err
}

func s2sAppID(c *fiber.Ctx) (uint, error) {
	appIDAny := c.Locals("s2s_app_id")
	appID, ok := appIDAny.(uint)
	if !ok || appID == 0 {
		return 0, fiber.NewError(fiber.StatusBadRequest, "invalid app context")
	}
	return appID, nil
}

// GET /api/v1/s2s/users/:id
func GetUserByIDHandler(c *fiber.Ctx) error {
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

	var user model.User
	if err := common.DB().First(&user, uint(uid64)).Error; err != nil {
		return unifiedResponse(c, fiber.StatusNotFound, nil, fiber.Map{"code": "not_found", "message": "user not found"})
	}

	// 精简返回，避免隐私字段泄露
	return unifiedResponse(c, fiber.StatusOK, userSummary(user), nil)
}

// GET /api/v1/s2s/users/:id/roles?tenant_id=xxx
func GetUserRolesHandler(c *fiber.Ctx) error {
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

	appID, err := s2sAppID(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}

	var roles []model.AppRole
	err = common.DB().Table("app_user_roles").
		Select("app_roles.*").
		Joins("JOIN app_roles ON app_roles.id = app_user_roles.role_id").
		Where("app_user_roles.user_id = ? AND app_user_roles.app_id = ?", uint(uid64), appID).
		Where("app_user_roles.expires_at IS NULL OR app_user_roles.expires_at > ?", time.Now()).
		Order("app_roles.id ASC").
		Find(&roles).Error
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	// 只返回必要字段
	list := make([]fiber.Map, 0, len(roles))
	for _, r := range roles {
		list = append(list, fiber.Map{"id": r.ID, "code": r.Code, "name": r.Name, "description": r.Description})
	}
	return unifiedResponse(c, fiber.StatusOK, fiber.Map{"roles": list}, nil)
}

// GET /api/v1/s2s/users/:id/permissions?tenant_id=xxx
func GetUserPermissionsHandler(c *fiber.Ctx) error {
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

	appID, err := s2sAppID(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}

	permissionSet := map[string]struct{}{}

	var directPermissionCodes []string
	err = common.DB().Table("app_user_permissions").
		Select("app_permissions.code").
		Joins("JOIN app_permissions ON app_permissions.id = app_user_permissions.permission_id").
		Where("app_user_permissions.user_id = ? AND app_user_permissions.app_id = ?", uint(uid64), appID).
		Where("app_user_permissions.expires_at IS NULL OR app_user_permissions.expires_at > ?", time.Now()).
		Pluck("app_permissions.code", &directPermissionCodes).Error
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	for _, code := range directPermissionCodes {
		permissionSet[code] = struct{}{}
	}

	var rolePermissionCodes []string
	err = common.DB().Table("app_user_roles").
		Select("DISTINCT app_permissions.code").
		Joins("JOIN app_roles ON app_roles.id = app_user_roles.role_id").
		Joins("JOIN app_role_permissions ON app_role_permissions.app_role_id = app_roles.id").
		Joins("JOIN app_permissions ON app_permissions.id = app_role_permissions.app_permission_id").
		Where("app_user_roles.user_id = ? AND app_user_roles.app_id = ?", uint(uid64), appID).
		Where("app_user_roles.expires_at IS NULL OR app_user_roles.expires_at > ?", time.Now()).
		Pluck("app_permissions.code", &rolePermissionCodes).Error
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	for _, code := range rolePermissionCodes {
		permissionSet[code] = struct{}{}
	}

	permissionCodes := make([]string, 0, len(permissionSet))
	for code := range permissionSet {
		permissionCodes = append(permissionCodes, code)
	}
	sort.Strings(permissionCodes)

	// Backward compatibility: keep returning role codes too (previously mislabeled as permissions).
	var roleCodes []string
	err = common.DB().Table("app_user_roles").
		Select("DISTINCT app_roles.code").
		Joins("JOIN app_roles ON app_roles.id = app_user_roles.role_id").
		Where("app_user_roles.user_id = ? AND app_user_roles.app_id = ?", uint(uid64), appID).
		Where("app_user_roles.expires_at IS NULL OR app_user_roles.expires_at > ?", time.Now()).
		Pluck("app_roles.code", &roleCodes).Error
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	sort.Strings(roleCodes)

	return unifiedResponse(c, fiber.StatusOK, fiber.Map{
		"permission_codes": permissionCodes,
		"role_codes":       roleCodes,
		"roles":            roleCodes,
	}, nil)
}

// GET /api/v1/s2s/users/:id/role-codes?tenant_id=xxx
func GetUserRoleCodesHandler(c *fiber.Ctx) error {
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

	appID, err := s2sAppID(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}

	var roleCodes []string
	err = common.DB().Table("app_user_roles").
		Select("DISTINCT app_roles.code").
		Joins("JOIN app_roles ON app_roles.id = app_user_roles.role_id").
		Where("app_user_roles.user_id = ? AND app_user_roles.app_id = ?", uint(uid64), appID).
		Where("app_user_roles.expires_at IS NULL OR app_user_roles.expires_at > ?", time.Now()).
		Pluck("app_roles.code", &roleCodes).Error
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	sort.Strings(roleCodes)
	return unifiedResponse(c, fiber.StatusOK, fiber.Map{"role_codes": roleCodes}, nil)
}

// GET /api/v1/s2s/users/lookup?email=... | phone=... | q=...
// Optional: page=1&page_size=20 (only meaningful for q)
func LookupUsersHandler(c *fiber.Ctx) error {
	tenantAny := c.Locals("s2s_tenant_id")
	if tenantAny == nil {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "tenant context missing"})
	}
	tenantID, _ := tenantAny.(uint)
	if tenantID == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid tenant id"})
	}

	email := strings.TrimSpace(c.Query("email"))
	phone := strings.TrimSpace(c.Query("phone"))
	q := strings.TrimSpace(c.Query("q"))

	setCount := 0
	if email != "" {
		setCount++
	}
	if phone != "" {
		setCount++
	}
	if q != "" {
		setCount++
	}
	if setCount == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "one of email/phone/q is required"})
	}
	if setCount > 1 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "only one of email/phone/q can be used"})
	}

	db := common.DB().Model(&model.User{}).
		Joins("JOIN system_auth_user_roles ur ON ur.user_id = system_auth_users.id").
		Joins("JOIN system_auth_roles r ON r.id = ur.role_id").
		Where("r.tenant_id = ?", tenantID)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	if email != "" {
		var u model.User
		if err := db.Where("lower(system_auth_users.email) = lower(?)", email).First(&u).Error; err != nil {
			return unifiedResponse(c, fiber.StatusOK, fiber.Map{"users": []fiber.Map{}}, nil)
		}
		return unifiedResponse(c, fiber.StatusOK, fiber.Map{"users": []fiber.Map{userSummary(u)}}, nil)
	}
	if phone != "" {
		var u model.User
		if err := db.Where("system_auth_users.phone = ?", phone).First(&u).Error; err != nil {
			return unifiedResponse(c, fiber.StatusOK, fiber.Map{"users": []fiber.Map{}}, nil)
		}
		return unifiedResponse(c, fiber.StatusOK, fiber.Map{"users": []fiber.Map{userSummary(u)}}, nil)
	}

	like := "%" + strings.ToLower(q) + "%"
	var total int64
	if err := db.Where("lower(system_auth_users.email) LIKE ? OR lower(system_auth_users.nickname) LIKE ?", like, like).Distinct("system_auth_users.id").Count(&total).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	var users []model.User
	if err := db.Where("lower(system_auth_users.email) LIKE ? OR lower(system_auth_users.nickname) LIKE ?", like, like).
		Distinct("system_auth_users.id").
		Order("system_auth_users.id desc").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&users).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	resp := make([]fiber.Map, 0, len(users))
	for _, u := range users {
		resp = append(resp, userSummary(u))
	}
	return unifiedResponse(c, fiber.StatusOK, fiber.Map{"users": resp, "total": total, "page": page, "page_size": pageSize}, nil)
}

type patchUserRequest struct {
	Nickname string `json:"nickname"`
	Username string `json:"username"`
}

type adjustUserWalletRequest struct {
	Operation string `json:"operation"`
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
	Reference string `json:"reference"`
}

// PATCH /api/v1/s2s/users/:id
// Body: {"nickname": "..."} (or legacy alias "username")
func PatchUserHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
	}
	userID := uint(uid64)

	tenantAny := c.Locals("s2s_tenant_id")
	if tenantAny == nil {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "tenant context missing"})
	}
	tenantID, _ := tenantAny.(uint)
	if tenantID == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid tenant id"})
	}

	ok, err := userInTenant(userID, tenantID)
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	if !ok {
		return unifiedResponse(c, fiber.StatusNotFound, nil, fiber.Map{"code": "not_found", "message": "user not found"})
	}

	var req patchUserRequest
	if err := c.BodyParser(&req); err != nil {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid JSON body"})
	}
	newNickname := strings.TrimSpace(req.Nickname)
	if newNickname == "" {
		newNickname = strings.TrimSpace(req.Username)
	}
	if newNickname == "" {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "nickname is required"})
	}
	if len(newNickname) > 64 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "nickname too long"})
	}

	if err := common.DB().Model(&model.User{}).Where("id = ?", userID).Update("nickname", newNickname).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}

	var user model.User
	if err := common.DB().First(&user, userID).Error; err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	return unifiedResponse(c, fiber.StatusOK, userSummary(user), nil)
}

// GET /api/v1/s2s/users/:id/wallets
// 支持可选参数：currency=CODE（如 CNY, USD），limit=20（交易记录条数）
func GetUserWalletHandler(c *fiber.Ctx) error {
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

	currency := c.Query("currency")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit <= 0 {
		limit = 20
	}

	if currency == "" {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "currency is required"})
	}

	// 查询余额
	w, err := wallet.GetBalanceByCode(uint(uid64), currency)
	if err != nil {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "wallet_error", "message": err.Error()})
	}
	// 查询交易记录
	txs, err := wallet.HistoryByCode(uint(uid64), currency, limit)
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "wallet_error", "message": err.Error()})
	}

	// 组装响应
	resp := fiber.Map{
		"currency":     currency,
		"balance":      w.Balance,
		"wallet_id":    w.ID,
		"transactions": txs,
	}
	return unifiedResponse(c, fiber.StatusOK, resp, nil)
}

// POST /api/v1/s2s/users/:id/wallets/adjust
// Body: {"operation":"increase|decrease","amount":100,"currency":"USD","reference":"invoice_123"}
func AdjustUserWalletHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
	}
	userID := uint(uid64)

	tenantID, err := s2sTenantID(c)
	if err != nil {
		status := fiber.StatusBadRequest
		if ferr, ok := err.(*fiber.Error); ok {
			status = ferr.Code
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "invalid_parameter", "message": err.Error()})
	}
	ok, err := userInTenant(userID, tenantID)
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	if !ok {
		return unifiedResponse(c, fiber.StatusNotFound, nil, fiber.Map{"code": "not_found", "message": "user not found"})
	}

	var req adjustUserWalletRequest
	if err := c.BodyParser(&req); err != nil {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid JSON body"})
	}

	req.Operation = strings.ToLower(strings.TrimSpace(req.Operation))
	req.Currency = strings.ToUpper(strings.TrimSpace(req.Currency))
	req.Reference = strings.TrimSpace(req.Reference)

	if req.Operation != "increase" && req.Operation != "decrease" {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "operation must be increase or decrease"})
	}
	if req.Amount <= 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "amount must be positive"})
	}
	if req.Currency == "" {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "currency is required"})
	}

	delta := req.Amount
	txType := "s2s_wallet_increase"
	if req.Operation == "decrease" {
		delta = -req.Amount
		txType = "s2s_wallet_decrease"
	}

	w, err := wallet.AdjustByCode(userID, req.Currency, delta, txType, req.Reference)
	if err != nil {
		status := fiber.StatusBadRequest
		if err.Error() == "insufficient funds" {
			status = fiber.StatusConflict
		}
		return unifiedResponse(c, status, nil, fiber.Map{"code": "wallet_error", "message": err.Error()})
	}

	resp := fiber.Map{
		"user_id":       userID,
		"wallet_id":     w.ID,
		"currency":      req.Currency,
		"operation":     req.Operation,
		"amount":        req.Amount,
		"balance":       w.Balance,
		"balance_delta": delta,
		"reference":     req.Reference,
	}
	return unifiedResponse(c, fiber.StatusOK, resp, nil)
}
