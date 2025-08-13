package oauth

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

var clientService = NewClientService()

// CreateClientHandler 创建OAuth2客户端
// POST /tenant/oauth/clients
func CreateClientHandler(c *fiber.Ctx) error {
	var req CreateClientRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 获取当前用户ID
	userID := c.Locals("userID").(uint)

	// 创建客户端
	client, err := clientService.CreateClient(userID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    client,
		"message": "OAuth2客户端创建成功",
	})
}

// ListClientsHandler 获取OAuth2客户端列表
// GET /tenant/oauth/clients
func ListClientsHandler(c *fiber.Ctx) error {
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

	// 获取客户端列表
	clients, total, err := clientService.ListClients(page, pageSize, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"clients":   clients,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// GetClientHandler 获取OAuth2客户端详情
// GET /tenant/oauth/clients/:client_id
func GetClientHandler(c *fiber.Ctx) error {
	clientID := c.Params("client_id")

	client, err := clientService.GetClient(clientID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": client,
	})
}

// UpdateClientHandler 更新OAuth2客户端
// PUT /tenant/oauth/clients/:client_id
func UpdateClientHandler(c *fiber.Ctx) error {
	clientID := c.Params("client_id")

	var req UpdateClientRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	client, err := clientService.UpdateClient(clientID, &req)
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

// DeleteClientHandler 删除OAuth2客户端
// DELETE /tenant/oauth/clients/:client_id
func DeleteClientHandler(c *fiber.Ctx) error {
	clientID := c.Params("client_id")

	if err := clientService.DeleteClient(clientID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "OAuth2客户端删除成功",
	})
}

// RegenerateSecretHandler 重新生成客户端密钥
// POST /tenant/oauth/clients/:client_id/regenerate-secret
func RegenerateSecretHandler(c *fiber.Ctx) error {
	clientID := c.Params("client_id")

	newSecret, err := clientService.RegenerateSecret(clientID)
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

// GetClientStatsHandler 获取客户端统计信息
// GET /tenant/oauth/clients/:client_id/stats
func GetClientStatsHandler(c *fiber.Ctx) error {
	clientID := c.Params("client_id")

	stats, err := clientService.GetClientStats(clientID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": stats,
	})
}

// GetTokensHandler 获取客户端的活跃令牌列表
// GET /tenant/oauth/clients/:client_id/tokens
func GetTokensHandler(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// 这里可以实现获取令牌列表的逻辑
	// 暂时返回空列表
	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"tokens":    []interface{}{},
			"total":     0,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// RevokeClientTokensHandler 撤销客户端的所有令牌
// POST /tenant/oauth/clients/:client_id/revoke-tokens
func RevokeClientTokensHandler(c *fiber.Ctx) error {
	clientID := c.Params("client_id")

	// 撤销该客户端的所有令牌
	err := clientService.RevokeClientTokens(clientID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "撤销令牌失败",
		})
	}

	return c.JSON(fiber.Map{
		"message": "已撤销该客户端的所有令牌",
	})
}
