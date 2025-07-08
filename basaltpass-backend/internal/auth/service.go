package auth

import (
	"errors"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Service encapsulates auth related operations.
type Service struct{}

// Register creates a new user with hashed password.
func (s Service) Register(req RegisterRequest) (*model.User, error) {
	if req.Email == "" && req.Phone == "" {
		return nil, errors.New("email or phone required")
	}
	if req.Password == "" {
		return nil, errors.New("password required")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hash),
		Nickname:     "New User",
	}
	if err := common.DB().Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// Login authenticates user by email or phone and returns token pair.
func (s Service) Login(req LoginRequest) (TokenPair, error) {
	if req.EmailOrPhone == "" || req.Password == "" {
		return TokenPair{}, errors.New("identifier and password required")
	}

	var user model.User
	db := common.DB()
	if err := db.Where("email = ? OR phone = ?", req.EmailOrPhone, req.EmailOrPhone).First(&user).Error; err != nil {
		return TokenPair{}, errors.New("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return TokenPair{}, errors.New("invalid credentials")
	}

	return GenerateTokenPair(user.ID)
}

// Refresh validates a refresh token and returns a new token pair.
func (s Service) Refresh(refreshToken string) (TokenPair, error) {
	token, err := ParseToken(refreshToken)
	if err != nil || !token.Valid {
		return TokenPair{}, errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != "refresh" {
		return TokenPair{}, errors.New("invalid token type")
	}
	userIDFloat, ok := claims["sub"].(float64)
	if !ok {
		return TokenPair{}, errors.New("invalid subject")
	}
	return GenerateTokenPair(uint(userIDFloat))
}
