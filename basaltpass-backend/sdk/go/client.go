package basaltpasss2s

import (
	context "context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

type Client struct {
	BaseURL        string
	ClientID       string
	ClientSecret   string
	HTTP           *http.Client
	DefaultHeaders map[string]string
}

type ErrorObject struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type envelope[T any] struct {
	Data      T            `json:"data"`
	Error     *ErrorObject `json:"error"`
	RequestID string       `json:"request_id"`
}

// ApiError represents an API error with optional code and request id
type ApiError struct {
	Status    int
	Code      string
	Message   string
	RequestID string
}

func (e *ApiError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("ApiError %d %s: %s (request_id=%s)", e.Status, e.Code, e.Message, e.RequestID)
	}
	return fmt.Sprintf("ApiError %d: %s (request_id=%s)", e.Status, e.Message, e.RequestID)
}

type S2SUser struct {
	ID            int64  `json:"id"`
	Email         string `json:"email"`
	Nickname      string `json:"nickname"`
	AvatarURL     string `json:"avatar_url"`
	EmailVerified bool   `json:"email_verified"`
	Phone         string `json:"phone"`
	PhoneVerified bool   `json:"phone_verified"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

type S2SRole struct {
	ID          int64  `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type S2SWalletTx struct {
	ID        int64  `json:"id"`
	WalletID  int64  `json:"wallet_id"`
	Type      string `json:"type"`
	Amount    int64  `json:"amount"`
	Status    string `json:"status"`
	Reference string `json:"reference"`
	CreatedAt string `json:"created_at"`
}

type S2SUserWallet struct {
	Currency     string        `json:"currency"`
	Balance      int64         `json:"balance"`
	WalletID     int64         `json:"wallet_id"`
	Transactions []S2SWalletTx `json:"transactions"`
}

type S2SMessage struct {
	ID         int64   `json:"id"`
	AppID      int64   `json:"app_id"`
	Title      string  `json:"title"`
	Content    string  `json:"content"`
	Type       string  `json:"type"`
	SenderID   *int64  `json:"sender_id"`
	SenderName string  `json:"sender_name"`
	ReceiverID int64   `json:"receiver_id"`
	IsRead     bool    `json:"is_read"`
	ReadAt     *string `json:"read_at"`
	CreatedAt  string  `json:"created_at"`
}

type S2SProduct struct {
	ID           int64   `json:"id"`
	Code         string  `json:"code"`
	Name         string  `json:"name"`
	Description  *string `json:"description"`
	EffectiveAt  *string `json:"effective_at"`
	DeprecatedAt *string `json:"deprecated_at"`
}

type S2SOwnership struct {
	HasOwnership bool     `json:"has_ownership"`
	Via          []string `json:"via"`
}

type ClientOption func(*Client)

// WithHTTPClient overrides the default http.Client
func WithHTTPClient(h *http.Client) ClientOption { return func(c *Client) { c.HTTP = h } }

// WithDefaultHeaders sets additional default headers on every request
func WithDefaultHeaders(h map[string]string) ClientOption {
	return func(c *Client) { c.DefaultHeaders = h }
}

func New(baseURL, clientID, clientSecret string, opts ...ClientOption) *Client {
	c := &Client{BaseURL: trimRight(baseURL, "/"), ClientID: clientID, ClientSecret: clientSecret, HTTP: http.DefaultClient, DefaultHeaders: map[string]string{}}
	for _, o := range opts {
		o(c)
	}
	return c
}

func trimRight(s, cutset string) string {
	for len(s) > 0 && len(cutset) > 0 && s[len(s)-1] == cutset[0] {
		s = s[:len(s)-1]
	}
	return s
}

func (c *Client) headers(req *http.Request) {
	req.Header.Set("client_id", c.ClientID)
	req.Header.Set("client_secret", c.ClientSecret)
	req.Header.Set("Accept", "application/json")
	for k, v := range c.DefaultHeaders {
		req.Header.Set(k, v)
	}
}

func (c *Client) do(ctx context.Context, method, path string, q url.Values, out any) error {
	u, err := url.Parse(c.BaseURL + path)
	if err != nil {
		return err
	}
	if q != nil {
		u.RawQuery = q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, u.String(), nil)
	if err != nil {
		return err
	}
	c.headers(req)
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	// Read body to support decoding error envelope or success in one pass
	var raw map[string]any
	dec := json.NewDecoder(resp.Body)
	if resp.StatusCode >= 400 {
		// Attempt to parse error envelope
		if err := dec.Decode(&raw); err == nil {
			var e struct {
				Error     *ErrorObject `json:"error"`
				RequestID string       `json:"request_id"`
			}
			b, _ := json.Marshal(raw)
			if json.Unmarshal(b, &e) == nil && e.Error != nil {
				return &ApiError{Status: resp.StatusCode, Code: e.Error.Code, Message: e.Error.Message, RequestID: e.RequestID}
			}
		}
		return &ApiError{Status: resp.StatusCode, Message: resp.Status}
	}
	// success
	if err := dec.Decode(out); err != nil {
		return err
	}
	return nil
}

func (c *Client) GetUser(ctx context.Context, id int64) (S2SUser, error) {
	var env envelope[S2SUser]
	err := c.do(ctx, http.MethodGet, fmt.Sprintf("/api/v1/s2s/users/%d", id), nil, &env)
	if err != nil {
		return S2SUser{}, err
	}
	if env.Error != nil {
		return S2SUser{}, fmt.Errorf("api error: %s - %s", env.Error.Code, env.Error.Message)
	}
	return env.Data, nil
}

func (c *Client) GetUserRoles(ctx context.Context, id int64, tenantID *int64) ([]S2SRole, error) {
	q := url.Values{}
	if tenantID != nil {
		q.Set("tenant_id", fmt.Sprintf("%d", *tenantID))
	}
	var env envelope[struct {
		Roles []S2SRole `json:"roles"`
	}]
	err := c.do(ctx, http.MethodGet, fmt.Sprintf("/api/v1/s2s/users/%d/roles", id), q, &env)
	if err != nil {
		return nil, err
	}
	if env.Error != nil {
		return nil, fmt.Errorf("api error: %s - %s", env.Error.Code, env.Error.Message)
	}
	return env.Data.Roles, nil
}

func (c *Client) GetUserRoleCodes(ctx context.Context, id int64, tenantID *int64) ([]string, error) {
	q := url.Values{}
	if tenantID != nil {
		q.Set("tenant_id", fmt.Sprintf("%d", *tenantID))
	}
	var env envelope[struct {
		Roles []string `json:"roles"`
	}]
	err := c.do(ctx, http.MethodGet, fmt.Sprintf("/api/v1/s2s/users/%d/permissions", id), q, &env)
	if err != nil {
		return nil, err
	}
	if env.Error != nil {
		return nil, fmt.Errorf("api error: %s - %s", env.Error.Code, env.Error.Message)
	}
	return env.Data.Roles, nil
}

func (c *Client) GetUserWallet(ctx context.Context, id int64, currency string, limit *int) (S2SUserWallet, error) {
	q := url.Values{}
	q.Set("currency", currency)
	if limit != nil {
		q.Set("limit", fmt.Sprintf("%d", *limit))
	}
	var env envelope[S2SUserWallet]
	err := c.do(ctx, http.MethodGet, fmt.Sprintf("/api/v1/s2s/users/%d/wallets", id), q, &env)
	if err != nil {
		return S2SUserWallet{}, err
	}
	if env.Error != nil {
		return S2SUserWallet{}, fmt.Errorf("api error: %s - %s", env.Error.Code, env.Error.Message)
	}
	return env.Data, nil
}

func (c *Client) GetUserMessages(ctx context.Context, id int64, status *string, page, pageSize *int) ([]S2SMessage, int64, int, int, error) {
	q := url.Values{}
	if status != nil {
		q.Set("status", *status)
	}
	if page != nil {
		q.Set("page", fmt.Sprintf("%d", *page))
	}
	if pageSize != nil {
		q.Set("page_size", fmt.Sprintf("%d", *pageSize))
	}
	var env envelope[struct {
		Messages []S2SMessage `json:"messages"`
		Total    int64        `json:"total"`
		Page     int          `json:"page"`
		PageSize int          `json:"page_size"`
	}]
	if err := c.do(ctx, http.MethodGet, fmt.Sprintf("/api/v1/s2s/users/%d/messages", id), q, &env); err != nil {
		return nil, 0, 0, 0, err
	}
	if env.Error != nil {
		return nil, 0, 0, 0, fmt.Errorf("api error: %s - %s", env.Error.Code, env.Error.Message)
	}
	return env.Data.Messages, env.Data.Total, env.Data.Page, env.Data.PageSize, nil
}

func (c *Client) GetUserProducts(ctx context.Context, id int64) ([]S2SProduct, error) {
	var env envelope[struct {
		Products []S2SProduct `json:"products"`
	}]
	if err := c.do(ctx, http.MethodGet, fmt.Sprintf("/api/v1/s2s/users/%d/products", id), nil, &env); err != nil {
		return nil, err
	}
	if env.Error != nil {
		return nil, fmt.Errorf("api error: %s - %s", env.Error.Code, env.Error.Message)
	}
	return env.Data.Products, nil
}

func (c *Client) CheckUserProductOwnership(ctx context.Context, id, productID int64) (S2SOwnership, error) {
	var env envelope[S2SOwnership]
	if err := c.do(ctx, http.MethodGet, fmt.Sprintf("/api/v1/s2s/users/%d/products/%d/ownership", id, productID), nil, &env); err != nil {
		return S2SOwnership{}, err
	}
	if env.Error != nil {
		return S2SOwnership{}, fmt.Errorf("api error: %s - %s", env.Error.Code, env.Error.Message)
	}
	return env.Data, nil
}
