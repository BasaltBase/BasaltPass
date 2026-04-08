package tenant

import (
	"basaltpass-backend/internal/service/giftcard"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

var tenantGiftCardService = giftcard.NewService()

type createGiftCardBatchRequest struct {
	CurrencyCode string  `json:"currency_code"`
	Amount       float64 `json:"amount"`
	Quantity     uint    `json:"quantity"`
	ExpiresAt    string  `json:"expires_at"`
	Note         string  `json:"note"`
}

func TenantCreateGiftCardBatchHandler(c *fiber.Ctx) error {
	tenantID, ok := c.Locals("tenantID").(uint)
	if !ok || tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant context required"})
	}
	operatorID, _ := c.Locals("userID").(uint)

	var req createGiftCardBatchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	var expiresAt *time.Time
	if req.ExpiresAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "expires_at must be RFC3339"})
		}
		expiresAt = &parsed
	}

	cards, err := tenantGiftCardService.CreateBatch(giftcard.CreateBatchInput{
		TenantID:     tenantID,
		CurrencyCode: req.CurrencyCode,
		Amount:       req.Amount,
		Quantity:     req.Quantity,
		ExpiresAt:    expiresAt,
		Note:         req.Note,
		CreatedBy:    operatorID,
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": cards})
}

func TenantListGiftCardsHandler(c *fiber.Ctx) error {
	tenantID, ok := c.Locals("tenantID").(uint)
	if !ok || tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant context required"})
	}
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	items, total, err := tenantGiftCardService.ListByTenant(giftcard.ListFilter{
		TenantID: tenantID,
		Code:     c.Query("code", ""),
		Status:   c.Query("status", ""),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	return c.JSON(fiber.Map{
		"data": items,
		"meta": fiber.Map{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

func TenantGetGiftCardByCodeHandler(c *fiber.Ctx) error {
	tenantID, ok := c.Locals("tenantID").(uint)
	if !ok || tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant context required"})
	}
	code := c.Params("code")
	item, err := tenantGiftCardService.GetByCode(code)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	if item.TenantID != tenantID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "gift card not found"})
	}
	return c.JSON(fiber.Map{"data": item})
}

func TenantInvalidateGiftCardHandler(c *fiber.Ctx) error {
	tenantID, ok := c.Locals("tenantID").(uint)
	if !ok || tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "tenant context required"})
	}
	operatorID, _ := c.Locals("userID").(uint)
	cardID64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid gift card id"})
	}
	if err := tenantGiftCardService.InvalidateByID(tenantID, uint(cardID64), operatorID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "gift card invalidated"})
}
