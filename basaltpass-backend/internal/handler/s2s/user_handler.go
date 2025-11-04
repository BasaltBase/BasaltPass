package s2s

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/rbac"
	"basaltpass-backend/internal/service/wallet"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// unifiedResponse 统一响应结构
func unifiedResponse(c *fiber.Ctx, status int, data interface{}, errObj interface{}) error {
	if status >= 400 {
		return c.Status(status).JSON(fiber.Map{"error": errObj, "data": nil, "request_id": c.GetRespHeader("X-Request-ID")})
	}
	return c.Status(status).JSON(fiber.Map{"data": data, "error": nil, "request_id": c.GetRespHeader("X-Request-ID")})
}

// GET /api/v1/s2s/users/:id
func GetUserByIDHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
	}

	var user model.User
	if err := common.DB().First(&user, uint(uid64)).Error; err != nil {
		return unifiedResponse(c, fiber.StatusNotFound, nil, fiber.Map{"code": "not_found", "message": "user not found"})
	}

	// 精简返回，避免隐私字段泄露
	resp := fiber.Map{
		"id":             user.ID,
		"email":          user.Email,
		"nickname":       user.Nickname,
		"avatar_url":     user.AvatarURL,
		"email_verified": user.EmailVerified,
		"phone":          user.Phone,
		"phone_verified": user.PhoneVerified,
		"created_at":     user.CreatedAt,
		"updated_at":     user.UpdatedAt,
	}
	return unifiedResponse(c, fiber.StatusOK, resp, nil)
}

// GET /api/v1/s2s/users/:id/roles?tenant_id=xxx
func GetUserRolesHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
	}
	tenantStr := c.Query("tenant_id")
	if tenantStr == "" {
		// 如果未显式传入，则使用客户端所在租户
		if v := c.Locals("s2s_tenant_id"); v != nil {
			tenantStr = strconv.FormatUint(uint64(v.(uint)), 10)
		}
	}
	tid64, err := strconv.ParseUint(tenantStr, 10, 64)
	if err != nil || tid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid tenant id"})
	}

	roles, err := rbac.GetUserRoles(uint(uid64), uint(tid64))
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
	tenantStr := c.Query("tenant_id")
	if tenantStr == "" {
		if v := c.Locals("s2s_tenant_id"); v != nil {
			tenantStr = strconv.FormatUint(uint64(v.(uint)), 10)
		}
	}
	tid64, err := strconv.ParseUint(tenantStr, 10, 64)
	if err != nil || tid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid tenant id"})
	}

	// 通过角色聚合权限（简单返回角色代码，细粒度权限扩展可以新增service）
	roleCodes, err := rbac.GetUserRoleCodes(uint(uid64), uint(tid64))
	if err != nil {
		return unifiedResponse(c, fiber.StatusInternalServerError, nil, fiber.Map{"code": "server_error", "message": err.Error()})
	}
	return unifiedResponse(c, fiber.StatusOK, fiber.Map{"roles": roleCodes}, nil)
}

// GET /api/v1/s2s/users/:id/wallets
// 支持可选参数：currency=CODE（如 CNY, USD），limit=20（交易记录条数）
func GetUserWalletHandler(c *fiber.Ctx) error {
	idStr := c.Params("id")
	uid64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || uid64 == 0 {
		return unifiedResponse(c, fiber.StatusBadRequest, nil, fiber.Map{"code": "invalid_parameter", "message": "invalid user id"})
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
