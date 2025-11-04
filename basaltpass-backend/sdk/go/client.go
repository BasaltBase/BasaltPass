package basaltpasss2s

import (
	context "context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

type Client struct {
	BaseURL      string
	ClientID     string
	ClientSecret string
	HTTP         *http.Client
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

func New(baseURL, clientID, clientSecret string) *Client {
	return &Client{BaseURL: trimRight(baseURL, "/"), ClientID: clientID, ClientSecret: clientSecret, HTTP: http.DefaultClient}
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
	if resp.StatusCode >= 400 {
		return fmt.Errorf("http error: %s", resp.Status)
	}
	dec := json.NewDecoder(resp.Body)
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
