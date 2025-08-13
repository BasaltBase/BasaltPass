package wallet

import (
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/currency"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// WalletResponse represents a wallet with computed status field for API response
type WalletResponse struct {
	ID         uint        `json:"id"`
	UserID     *uint       `json:"user_id"`
	TeamID     *uint       `json:"team_id"`
	CurrencyID *uint       `json:"currency_id"`
	Balance    int64       `json:"balance"`
	Status     string      `json:"status"` // computed from Freeze field
	CreatedAt  string      `json:"created_at"`
	UpdatedAt  string      `json:"updated_at"`
	Currency   interface{} `json:"currency,omitempty"`
	User       interface{} `json:"user,omitempty"`
	Team       interface{} `json:"team,omitempty"`
}

// AdminWalletHandler handles tenant wallet operations
type AdminWalletHandler struct {
	service *AdminWalletService
}

// NewAdminWalletHandler creates a new tenant wallet handler
func NewAdminWalletHandler() *AdminWalletHandler {
	return &AdminWalletHandler{
		service: NewAdminWalletService(),
	}
}

// walletToResponse converts a wallet to response format with computed status
func walletToResponse(wallet model.Wallet) WalletResponse {
	status := "active"
	if wallet.Freeze > 0 {
		status = "frozen"
	}

	return WalletResponse{
		ID:         wallet.ID,
		UserID:     wallet.UserID,
		TeamID:     wallet.TeamID,
		CurrencyID: wallet.CurrencyID,
		Balance:    wallet.Balance,
		Status:     status,
		CreatedAt:  wallet.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:  wallet.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Currency:   wallet.Currency,
		User:       wallet.User,
		Team:       wallet.Team,
	}
}

// walletsToResponse converts a slice of wallets to response format
func walletsToResponse(wallets []model.Wallet) []WalletResponse {
	result := make([]WalletResponse, len(wallets))
	for i, wallet := range wallets {
		result[i] = walletToResponse(wallet)
	}
	return result
}

// ListWalletsRequest represents the request for listing wallets
type ListWalletsRequest struct {
	Page         int    `query:"page"`
	PageSize     int    `query:"page_size"`
	UserID       *uint  `query:"user_id"`
	TeamID       *uint  `query:"team_id"`
	CurrencyCode string `query:"currency_code"`
}

// CreateWalletRequest represents the request for creating a wallet
type CreateWalletRequest struct {
	UserID         *uint   `json:"user_id"`
	TeamID         *uint   `json:"team_id"`
	CurrencyCode   string  `json:"currency_code" validate:"required"`
	InitialBalance float64 `json:"initial_balance"`
}

// AdjustBalanceRequest represents the request for adjusting wallet balance
type AdjustBalanceRequest struct {
	Amount float64 `json:"amount" validate:"required"`
	Reason string  `json:"reason" validate:"required"`
}

// ListWallets GET /tenant/wallets - List all wallets with filtering and pagination
func (h *AdminWalletHandler) ListWallets(c *fiber.Ctx) error {
	var req ListWalletsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Set default pagination
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 || req.PageSize > 100 {
		req.PageSize = 20
	}

	wallets, total, err := h.service.GetAllWallets(req.Page, req.PageSize, req.UserID, req.TeamID, req.CurrencyCode)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch wallets",
		})
	}

	return c.JSON(fiber.Map{
		"data": walletsToResponse(wallets),
		"meta": fiber.Map{
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total":       total,
			"total_pages": (total + int64(req.PageSize) - 1) / int64(req.PageSize),
		},
	})
}

// GetUserWallets GET /tenant/users/:id/wallets - Get all wallets for a specific user
func (h *AdminWalletHandler) GetUserWallets(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	wallets, err := h.service.GetUserWallets(uint(userID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user wallets",
		})
	}

	return c.JSON(fiber.Map{
		"data": walletsToResponse(wallets),
	})
}

// GetTeamWallets GET /tenant/teams/:id/wallets - Get all wallets for a specific team
func (h *AdminWalletHandler) GetTeamWallets(c *fiber.Ctx) error {
	teamID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid team ID",
		})
	}

	wallets, err := h.service.GetTeamWallets(uint(teamID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch team wallets",
		})
	}

	return c.JSON(fiber.Map{
		"data": walletsToResponse(wallets),
	})
}

// CreateWallet POST /tenant/wallets - Create a new wallet
func (h *AdminWalletHandler) CreateWallet(c *fiber.Ctx) error {
	var req CreateWalletRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate that either UserID or TeamID is provided, but not both
	if req.UserID == nil && req.TeamID == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Either user_id or team_id must be provided",
		})
	}
	if req.UserID != nil && req.TeamID != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot specify both user_id and team_id",
		})
	}

	var wallet *model.Wallet
	var err error

	if req.UserID != nil {
		wallet, err = h.service.CreateWalletForUser(*req.UserID, req.CurrencyCode, req.InitialBalance)
	} else {
		wallet, err = h.service.CreateWalletForTeam(*req.TeamID, req.CurrencyCode, req.InitialBalance)
	}

	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": walletToResponse(*wallet),
	})
}

// AdjustBalance POST /tenant/wallets/:id/adjust - Adjust wallet balance
func (h *AdminWalletHandler) AdjustBalance(c *fiber.Ctx) error {
	walletID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid wallet ID",
		})
	}

	var req AdjustBalanceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get operator ID from JWT claims
	userIDInterface := c.Locals("userID")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in token",
		})
	}
	operatorID, ok := userIDInterface.(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID format",
		})
	}

	err = h.service.AdjustBalance(uint(walletID), req.Amount, req.Reason, operatorID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Balance adjusted successfully",
	})
}

// FreezeWallet POST /tenant/wallets/:id/freeze - Freeze a wallet
func (h *AdminWalletHandler) FreezeWallet(c *fiber.Ctx) error {
	walletID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid wallet ID",
		})
	}

	// Get operator ID from JWT claims
	userIDInterface := c.Locals("userID")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in token",
		})
	}
	operatorID, ok := userIDInterface.(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID format",
		})
	}

	err = h.service.FreezeWallet(uint(walletID), operatorID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to freeze wallet",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Wallet frozen successfully",
	})
}

// UnfreezeWallet POST /tenant/wallets/:id/unfreeze - Unfreeze a wallet
func (h *AdminWalletHandler) UnfreezeWallet(c *fiber.Ctx) error {
	walletID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid wallet ID",
		})
	}

	// Get operator ID from JWT claims
	userIDInterface := c.Locals("userID")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in token",
		})
	}
	operatorID, ok := userIDInterface.(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID format",
		})
	}

	err = h.service.UnfreezeWallet(uint(walletID), operatorID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to unfreeze wallet",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Wallet unfrozen successfully",
	})
}

// DeleteWallet DELETE /tenant/wallets/:id - Delete a wallet
func (h *AdminWalletHandler) DeleteWallet(c *fiber.Ctx) error {
	walletID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid wallet ID",
		})
	}

	// Get operator ID from JWT claims
	userIDInterface := c.Locals("userID")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in token",
		})
	}
	operatorID, ok := userIDInterface.(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID format",
		})
	}

	err = h.service.DeleteWallet(uint(walletID), operatorID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Wallet deleted successfully",
	})
}

// GetWalletTransactions GET /tenant/wallets/:id/transactions - Get wallet transaction history
func (h *AdminWalletHandler) GetWalletTransactions(c *fiber.Ctx) error {
	walletID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid wallet ID",
		})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	transactions, total, err := h.service.GetWalletTransactions(uint(walletID), page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch wallet transactions",
		})
	}

	return c.JSON(fiber.Map{
		"data": transactions,
		"meta": fiber.Map{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// GetWalletStats GET /tenant/wallets/stats - Get wallet statistics
func (h *AdminWalletHandler) GetWalletStats(c *fiber.Ctx) error {
	stats, err := h.service.GetWalletStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch wallet statistics",
		})
	}

	return c.JSON(fiber.Map{
		"data": stats,
	})
}

// GetCurrencies GET /tenant/currencies - Get all available currencies
func (h *AdminWalletHandler) GetCurrencies(c *fiber.Ctx) error {
	currencies, err := currency.GetAllCurrencies()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch currencies",
		})
	}

	return c.JSON(fiber.Map{
		"data": currencies,
	})
}
