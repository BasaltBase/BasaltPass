package oauth

import (
	"basaltpass-backend/internal/handler/public/app"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// 使用全局的clientService实例
var tenantClientService = NewClientService()

// TenantListOAuthClientsHandler 获取租户的OAuth客户端列表
// GET /api/v1/tenant/oauth/clients
func TenantListOAuthClientsHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	// 解析分页参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))
	search := c.Query("search", "")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// 使用应用服务获取租户的应用和OAuth客户端
	appService := app.NewAppService()
	appsWithClients, total, err := appService.GetTenantAppsWithOAuthClients(tenantID, page, pageSize, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"apps":      appsWithClients,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// TenantCreateOAuthClientHandler 为租户的应用创建OAuth客户端
// POST /api/v1/tenant/oauth/clients
func TenantCreateOAuthClientHandler(c *fiber.Ctx) error {
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	var req struct {
		AppID          uint     `json:"app_id" validate:"required"`
		Name           string   `json:"name" validate:"required,min=1,max=100"`
		Description    string   `json:"description" validate:"max=500"`
		RedirectURIs   []string `json:"redirect_uris" validate:"required,min=1"`
		Scopes         []string `json:"scopes"`
		AllowedOrigins []string `json:"allowed_origins"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 验证应用属于该租户
	appService := app.NewAppService()
	appInfo, err := appService.GetApp(tenantID, req.AppID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "应用不存在或无权限访问",
		})
	}

	// 创建OAuth客户端请求
	createReq := &CreateClientRequest{
		Name:           req.Name,
		Description:    req.Description,
		RedirectURIs:   req.RedirectURIs,
		Scopes:         req.Scopes,
		AllowedOrigins: req.AllowedOrigins,
	}

	// 获取当前用户ID
	userID := c.Locals("userID").(uint)

	// 创建OAuth客户端并关联到应用
	client, err := tenantClientService.CreateClientForApp(req.AppID, userID, createReq)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": fiber.Map{
			"client": client,
			"app":    appInfo,
		},
		"message": "OAuth2客户端创建成功",
	})
}

// TenantUpdateOAuthClientHandler 更新租户的OAuth客户端
// PUT /api/v1/tenant/oauth/clients/:client_id
func TenantUpdateOAuthClientHandler(c *fiber.Ctx) error {
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	clientID := c.Params("client_id")

	// 验证客户端属于该租户
	if !tenantClientService.ClientBelongsToTenant(clientID, tenantID) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "OAuth客户端不存在或无权限访问",
		})
	}

	var req UpdateClientRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	client, err := tenantClientService.UpdateClient(clientID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    client,
		"message": "OAuth2客户端更新成功",
	})
}

// TenantDeleteOAuthClientHandler 删除租户的OAuth客户端
// DELETE /api/v1/tenant/oauth/clients/:client_id
func TenantDeleteOAuthClientHandler(c *fiber.Ctx) error {
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	clientID := c.Params("client_id")

	// 验证客户端属于该租户
	if !tenantClientService.ClientBelongsToTenant(clientID, tenantID) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "OAuth客户端不存在或无权限访问",
		})
	}

	if err := tenantClientService.DeleteClient(clientID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "OAuth2客户端删除成功",
	})
}

// TenantRegenerateClientSecretHandler 重新生成租户OAuth客户端密钥
// POST /api/v1/tenant/oauth/clients/:client_id/regenerate-secret
func TenantRegenerateClientSecretHandler(c *fiber.Ctx) error {
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	clientID := c.Params("client_id")

	// 验证客户端属于该租户
	if !tenantClientService.ClientBelongsToTenant(clientID, tenantID) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "OAuth客户端不存在或无权限访问",
		})
	}

	newSecret, err := tenantClientService.RegenerateSecret(clientID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"client_secret": newSecret,
		},
		"message": "客户端密钥已重新生成",
	})
}

// 获取租户ID的辅助函数
func getTenantIDFromContext(c *fiber.Ctx) uint {
	tenantID, ok := c.Locals("tenantID").(uint)
	if !ok {
		return 0
	}
	return tenantID
}
