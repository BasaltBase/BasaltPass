package giftcard

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/currency"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Service struct{}

type CreateBatchInput struct {
	TenantID     uint
	CurrencyCode string
	Amount       float64
	Quantity     uint
	ExpiresAt    *time.Time
	Note         string
	CreatedBy    uint
}

type GiftCardDTO struct {
	ID         uint   `json:"id"`
	BatchID    uint   `json:"batch_id"`
	TenantID   uint   `json:"tenant_id"`
	Code       string `json:"code"`
	CurrencyID uint   `json:"currency_id"`
	Currency   *struct {
		Code   string `json:"code"`
		Name   string `json:"name"`
		Symbol string `json:"symbol"`
	} `json:"currency,omitempty"`
	Amount        int64      `json:"amount"`
	Status        string     `json:"status"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
	RedeemedBy    *uint      `json:"redeemed_by,omitempty"`
	RedeemedAt    *time.Time `json:"redeemed_at,omitempty"`
	InvalidatedBy *uint      `json:"invalidated_by,omitempty"`
	InvalidatedAt *time.Time `json:"invalidated_at,omitempty"`
	Reference     string     `json:"reference,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type ListFilter struct {
	TenantID uint
	Code     string
	Status   string
	Page     int
	PageSize int
}

func NewService() *Service {
	return &Service{}
}

func toSmallestUnit(amount float64, decimalPlaces int) int64 {
	multiplier := float64(1)
	for i := 0; i < decimalPlaces; i++ {
		multiplier *= 10
	}
	return int64(amount * multiplier)
}

func newCardCode() (string, error) {
	buf := make([]byte, 10)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	enc := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(buf)
	enc = strings.ToUpper(enc)
	return fmt.Sprintf("GC-%s-%s", enc[:5], enc[5:10]), nil
}

func toDTO(card model.GiftCard) GiftCardDTO {
	resp := GiftCardDTO{
		ID:            card.ID,
		BatchID:       card.BatchID,
		TenantID:      card.TenantID,
		Code:          card.Code,
		CurrencyID:    card.CurrencyID,
		Amount:        card.Amount,
		Status:        card.Status,
		ExpiresAt:     card.ExpiresAt,
		RedeemedBy:    card.RedeemedBy,
		RedeemedAt:    card.RedeemedAt,
		InvalidatedBy: card.InvalidatedBy,
		InvalidatedAt: card.InvalidatedAt,
		Reference:     card.Reference,
		CreatedAt:     card.CreatedAt,
	}
	if card.Currency.ID != 0 {
		resp.Currency = &struct {
			Code   string `json:"code"`
			Name   string `json:"name"`
			Symbol string `json:"symbol"`
		}{
			Code:   card.Currency.Code,
			Name:   card.Currency.Name,
			Symbol: card.Currency.Symbol,
		}
	}
	return resp
}

func (s *Service) CreateBatch(input CreateBatchInput) ([]GiftCardDTO, error) {
	if input.TenantID == 0 {
		return nil, errors.New("tenant_id is required")
	}
	if strings.TrimSpace(input.CurrencyCode) == "" {
		return nil, errors.New("currency_code is required")
	}
	if input.Quantity == 0 {
		return nil, errors.New("quantity must be greater than 0")
	}
	if input.Amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	curr, err := currency.GetCurrencyByCode(strings.ToUpper(strings.TrimSpace(input.CurrencyCode)))
	if err != nil {
		return nil, errors.New("invalid currency code")
	}
	amountSmallest := toSmallestUnit(input.Amount, curr.DecimalPlaces)
	if amountSmallest <= 0 {
		return nil, errors.New("amount is too small")
	}

	db := common.DB()
	var result []GiftCardDTO
	err = db.Transaction(func(tx *gorm.DB) error {
		batch := model.GiftCardBatch{
			TenantID:   input.TenantID,
			CurrencyID: curr.ID,
			Amount:     amountSmallest,
			Quantity:   input.Quantity,
			CreatedBy:  input.CreatedBy,
			ExpiresAt:  input.ExpiresAt,
			Note:       strings.TrimSpace(input.Note),
		}
		if err := tx.Create(&batch).Error; err != nil {
			return err
		}

		cards := make([]model.GiftCard, 0, input.Quantity)
		for i := uint(0); i < input.Quantity; i++ {
			code := ""
			for attempt := 0; attempt < 5; attempt++ {
				c, e := newCardCode()
				if e != nil {
					return e
				}
				var cnt int64
				if err := tx.Model(&model.GiftCard{}).Where("code = ?", c).Count(&cnt).Error; err != nil {
					return err
				}
				if cnt == 0 {
					code = c
					break
				}
			}
			if code == "" {
				return errors.New("failed to generate unique code")
			}
			cards = append(cards, model.GiftCard{
				BatchID:    batch.ID,
				TenantID:   input.TenantID,
				Code:       code,
				CurrencyID: curr.ID,
				Amount:     amountSmallest,
				Status:     model.GiftCardStatusActive,
				ExpiresAt:  input.ExpiresAt,
			})
		}

		if err := tx.Create(&cards).Error; err != nil {
			return err
		}
		for _, card := range cards {
			card.Currency = curr
			result = append(result, toDTO(card))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *Service) ListByTenant(filter ListFilter) ([]GiftCardDTO, int64, error) {
	db := common.DB()
	q := db.Model(&model.GiftCard{}).Where("tenant_id = ?", filter.TenantID)
	if strings.TrimSpace(filter.Code) != "" {
		q = q.Where("code LIKE ?", "%"+strings.TrimSpace(filter.Code)+"%")
	}
	if strings.TrimSpace(filter.Status) != "" {
		q = q.Where("status = ?", strings.TrimSpace(filter.Status))
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 || filter.PageSize > 200 {
		filter.PageSize = 20
	}
	var cards []model.GiftCard
	if err := q.Preload("Currency").Order("created_at DESC").Limit(filter.PageSize).Offset((filter.Page - 1) * filter.PageSize).Find(&cards).Error; err != nil {
		return nil, 0, err
	}
	items := make([]GiftCardDTO, 0, len(cards))
	for _, card := range cards {
		items = append(items, toDTO(card))
	}
	return items, total, nil
}

func (s *Service) GetByCode(code string) (*GiftCardDTO, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" {
		return nil, errors.New("code is required")
	}
	var card model.GiftCard
	if err := common.DB().Preload("Currency").Where("code = ?", code).First(&card).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("gift card not found")
		}
		return nil, err
	}
	dto := toDTO(card)
	return &dto, nil
}

func (s *Service) InvalidateByID(tenantID, cardID, operatorID uint) error {
	now := time.Now().UTC()
	return common.DB().Transaction(func(tx *gorm.DB) error {
		var card model.GiftCard
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND tenant_id = ?", cardID, tenantID).First(&card).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("gift card not found")
			}
			return err
		}
		if card.Status == model.GiftCardStatusRedeemed {
			return errors.New("gift card already redeemed")
		}
		if card.Status == model.GiftCardStatusInvalid {
			return nil
		}
		return tx.Model(&card).Updates(map[string]any{
			"status":         model.GiftCardStatusInvalid,
			"invalidated_by": operatorID,
			"invalidated_at": &now,
		}).Error
	})
}

func (s *Service) Redeem(userID uint, code string) (*GiftCardDTO, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if userID == 0 {
		return nil, errors.New("user_id is required")
	}
	if code == "" {
		return nil, errors.New("code is required")
	}

	now := time.Now().UTC()
	var out model.GiftCard
	err := common.DB().Transaction(func(tx *gorm.DB) error {
		var card model.GiftCard
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code = ?", code).First(&card).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("gift card not found")
			}
			return err
		}

		if card.Status == model.GiftCardStatusRedeemed {
			return errors.New("gift card already redeemed")
		}
		if card.Status == model.GiftCardStatusInvalid {
			return errors.New("gift card is invalid")
		}
		if card.ExpiresAt != nil && now.After(*card.ExpiresAt) {
			_ = tx.Model(&card).Update("status", model.GiftCardStatusExpired).Error
			return errors.New("gift card is expired")
		}

		var walletModel model.Wallet
		if err := tx.Where("user_id = ? AND currency_id = ? AND tenant_id = ?", userID, card.CurrencyID, card.TenantID).
			FirstOrCreate(&walletModel, model.Wallet{TenantID: card.TenantID, UserID: &userID, CurrencyID: &card.CurrencyID}).Error; err != nil {
			return err
		}
		newBalance := walletModel.Balance + card.Amount
		if err := tx.Model(&walletModel).Update("balance", newBalance).Error; err != nil {
			return err
		}

		walletTx := model.WalletTx{
			WalletID:  walletModel.ID,
			Type:      "gift_card_redeem",
			Amount:    card.Amount,
			Status:    "success",
			Reference: fmt.Sprintf("gift_card:%s", card.Code),
		}
		if err := tx.Create(&walletTx).Error; err != nil {
			return err
		}

		if err := tx.Model(&card).Updates(map[string]any{
			"status":      model.GiftCardStatusRedeemed,
			"redeemed_by": userID,
			"redeemed_at": &now,
			"reference":   fmt.Sprintf("wallet_tx:%d", walletTx.ID),
		}).Error; err != nil {
			return err
		}

		if err := tx.Preload("Currency").First(&out, card.ID).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	dto := toDTO(out)
	return &dto, nil
}
