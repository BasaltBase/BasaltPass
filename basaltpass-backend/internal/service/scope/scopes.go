package scope

import "strings"

type Meta struct {
	Scope       string `json:"scope"`
	Category    string `json:"category"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

func DefaultAllowedScopes() []string {
	return []string{
		OpenID,
		Profile,
		Email,
		OfflineAccess,
		S2SRead,
		S2SUserRead,
		S2SUserWrite,
		S2SRBACRead,
		S2STeamRead,
		S2STeamWrite,
		S2SWalletRead,
		S2SWalletWrite,
		S2SMessagesRead,
		S2SNotificationsWrite,
		S2SProductsRead,
		S2SEmailSend,
		S2STokenExchange,
	}
}

func DefaultClientScopes() []string {
	// Preserve existing behavior: if not specified, create clients with basic OIDC scopes.
	return []string{OpenID, Profile, Email}
}

func Describe(s string) Meta {
	s = strings.TrimSpace(s)
	if s == "" {
		return Meta{}
	}

	// Keep descriptions short and UI-friendly.
	switch s {
	case OpenID:
		return Meta{Scope: s, Category: "oidc", Title: "OpenID", Description: "启用 OIDC 标准身份能力（建议保留）"}
	case Profile:
		return Meta{Scope: s, Category: "oidc", Title: "Profile", Description: "允许通过 userinfo 获取昵称/头像等基础资料"}
	case Email:
		return Meta{Scope: s, Category: "oidc", Title: "Email", Description: "允许通过 userinfo 获取邮箱与邮箱验证状态"}
	case OfflineAccess:
		return Meta{Scope: s, Category: "oidc", Title: "Offline access", Description: "允许申请 refresh_token（需要服务端启用刷新令牌）"}
	case S2SRead:
		return Meta{Scope: s, Category: "s2s", Title: "S2S (legacy)", Description: "旧版聚合只读权限：等同于所有 s2s.*.read（建议逐步迁移到细分 scope）"}
	case S2SUserRead:
		return Meta{Scope: s, Category: "s2s", Title: "S2S User Read", Description: "读取用户基础信息（/api/v1/s2s/users/:id）"}
	case S2SUserWrite:
		return Meta{Scope: s, Category: "s2s", Title: "S2S User Write", Description: "修改用户基础资料（PATCH /api/v1/s2s/users/:id，仅限昵称等测试写入）"}
	case S2SRBACRead:
		return Meta{Scope: s, Category: "s2s", Title: "S2S RBAC Read", Description: "读取用户角色/权限（/roles、/permissions）"}
	case S2STeamRead:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Team Read", Description: "读取团队信息与用户所属团队（/teams）"}
	case S2STeamWrite:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Team Write", Description: "创建团队（POST /api/v1/s2s/teams）"}
	case S2SWalletRead:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Wallet Read", Description: "读取用户钱包与交易记录（/wallets）"}
	case S2SWalletWrite:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Wallet Write", Description: "调整用户钱包余额（POST /api/v1/s2s/users/:id/wallets/adjust）"}
	case S2SMessagesRead:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Messages Read", Description: "读取用户消息/通知（/messages）"}
	case S2SNotificationsWrite:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Notifications Write", Description: "向当前应用已授权用户发送通知（POST /api/v1/s2s/notifications）"}
	case S2SProductsRead:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Products Read", Description: "读取用户产品拥有情况（/products、/ownership）"}
	case S2SEmailSend:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Email Send", Description: "向当前应用已授权用户发送邮件（POST /api/v1/s2s/emails/send）"}
	case S2STokenExchange:
		return Meta{Scope: s, Category: "s2s", Title: "S2S Token Exchange", Description: "允许通过 Token Exchange (RFC 8693) 代用户获取其他应用的受限 token"}
	default:
		return Meta{Scope: s, Category: "custom", Title: s, Description: "自定义/未知 scope（请确认后端是否有实际使用）"}
	}
}

// OAuth/OIDC standard scopes.
const (
	OpenID        = "openid"
	Profile       = "profile"
	Email         = "email"
	OfflineAccess = "offline_access"
)

// S2S (third-party app / service-to-service) scopes.
//
// Backward compatibility:
// - Legacy umbrella scope "s2s.read" implies all "s2s.*.read" scopes.
const (
	S2SRead               = "s2s.read"
	S2SUserRead           = "s2s.user.read"
	S2SUserWrite          = "s2s.user.write"
	S2SRBACRead           = "s2s.rbac.read"
	S2STeamRead           = "s2s.team.read"
	S2STeamWrite          = "s2s.team.write"
	S2SWalletRead         = "s2s.wallet.read"
	S2SWalletWrite        = "s2s.wallet.write"
	S2SMessagesRead       = "s2s.messages.read"
	S2SNotificationsWrite = "s2s.notifications.write"
	S2SProductsRead       = "s2s.products.read"
	S2SEmailSend          = "s2s.email.send"
	S2STokenExchange      = "s2s.token_exchange"
)

func NormalizeList(in []string) []string {
	out := make([]string, 0, len(in))
	seen := map[string]struct{}{}
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

func HasScope(have []string, required string) bool {
	required = strings.TrimSpace(required)
	if required == "" {
		return true
	}

	have = NormalizeList(have)
	for _, s := range have {
		if s == required {
			return true
		}
	}

	// Legacy umbrella implication: s2s.read => any s2s.<resource>.read
	if strings.HasPrefix(required, "s2s.") && strings.HasSuffix(required, ".read") {
		for _, s := range have {
			if s == S2SRead {
				return true
			}
		}
	}

	return false
}

func SatisfiesAll(have []string, requiredScopes []string) bool {
	for _, req := range requiredScopes {
		if !HasScope(have, req) {
			return false
		}
	}
	return true
}
