package auth

// RegisterRequest defines the input for user registration.
type RegisterRequest struct {
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

// LoginRequest defines input for login.
type LoginRequest struct {
	EmailOrPhone string `json:"identifier"`
	Password     string `json:"password"`
}
