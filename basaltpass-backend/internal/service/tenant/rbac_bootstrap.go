package tenant

import (
	"fmt"
	"log"
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

type tenantPermissionSeed struct {
	Code        string
	Name        string
	Description string
	Category    string
}

type tenantRoleSeed struct {
	Code            string
	Name            string
	Description     string
	PermissionCodes []string
}

var defaultTenantPermissionSeeds = []tenantPermissionSeed{
	{Code: "tenant.info.read", Name: "查看租户信息", Description: "查看当前租户基础信息", Category: "tenant"},

	{Code: "tenant.users.read", Name: "查看租户用户", Description: "查看租户用户列表与详情", Category: "user"},
	{Code: "tenant.users.update", Name: "编辑租户用户", Description: "更新租户用户信息与状态", Category: "user"},
	{Code: "tenant.users.delete", Name: "移除租户用户", Description: "将用户移出租户", Category: "user"},
	{Code: "tenant.users.invite", Name: "邀请租户用户", Description: "邀请用户加入租户", Category: "user"},
	{Code: "tenant.users.resend_invitation", Name: "重发租户邀请", Description: "重新发送租户邀请邮件", Category: "user"},
	{Code: "tenant.users.stats.read", Name: "查看用户统计", Description: "查看租户用户统计信息", Category: "user"},

	{Code: "tenant.roles.read", Name: "查看角色", Description: "查看租户角色列表", Category: "access"},
	{Code: "tenant.roles.create", Name: "创建角色", Description: "创建租户角色", Category: "access"},
	{Code: "tenant.roles.update", Name: "编辑角色", Description: "编辑租户角色", Category: "access"},
	{Code: "tenant.roles.delete", Name: "删除角色", Description: "删除租户角色", Category: "access"},
	{Code: "tenant.roles.assign", Name: "分配角色", Description: "为租户用户分配角色", Category: "access"},
	{Code: "tenant.roles.permissions.read", Name: "查看角色权限", Description: "查看角色已绑定权限", Category: "access"},
	{Code: "tenant.roles.permissions.set", Name: "设置角色权限", Description: "为角色绑定权限", Category: "access"},
	{Code: "tenant.roles.permissions.remove", Name: "移除角色权限", Description: "从角色移除权限", Category: "access"},

	{Code: "tenant.permissions.read", Name: "查看权限", Description: "查看租户权限列表", Category: "access"},
	{Code: "tenant.permissions.create", Name: "创建权限", Description: "创建租户权限", Category: "access"},
	{Code: "tenant.permissions.update", Name: "编辑权限", Description: "编辑租户权限", Category: "access"},
	{Code: "tenant.permissions.delete", Name: "删除权限", Description: "删除租户权限", Category: "access"},

	{Code: "tenant.teams.read", Name: "查看团队", Description: "查看租户团队与成员", Category: "team"},
	{Code: "tenant.teams.create", Name: "创建团队", Description: "创建租户团队", Category: "team"},
	{Code: "tenant.teams.update", Name: "编辑团队", Description: "编辑租户团队信息", Category: "team"},
	{Code: "tenant.teams.delete", Name: "删除团队", Description: "删除租户团队", Category: "team"},
	{Code: "tenant.teams.members.manage", Name: "管理团队成员", Description: "增删改团队成员与成员角色", Category: "team"},
	{Code: "tenant.teams.transfer", Name: "转移团队所有权", Description: "转移租户团队所有权", Category: "team"},

	{Code: "tenant.notifications.read", Name: "查看通知", Description: "查看租户通知与通知用户列表", Category: "notification"},
	{Code: "tenant.notifications.create", Name: "创建通知", Description: "创建租户通知", Category: "notification"},
	{Code: "tenant.notifications.update", Name: "编辑通知", Description: "更新租户通知", Category: "notification"},
	{Code: "tenant.notifications.delete", Name: "删除通知", Description: "删除租户通知", Category: "notification"},
	{Code: "tenant.notifications.stats.read", Name: "查看通知统计", Description: "查看租户通知统计", Category: "notification"},

	{Code: "tenant.apps.read", Name: "查看应用", Description: "查看租户应用列表与详情", Category: "app"},
	{Code: "tenant.apps.create", Name: "创建应用", Description: "创建租户应用", Category: "app"},
	{Code: "tenant.apps.update", Name: "编辑应用", Description: "编辑租户应用", Category: "app"},
	{Code: "tenant.apps.delete", Name: "删除应用", Description: "删除租户应用", Category: "app"},
	{Code: "tenant.apps.status.update", Name: "切换应用状态", Description: "启用或停用租户应用", Category: "app"},
	{Code: "tenant.apps.stats.read", Name: "查看应用统计", Description: "查看租户应用统计", Category: "app"},

	{Code: "tenant.oauth.clients.read", Name: "查看 OAuth 客户端", Description: "查看租户 OAuth 客户端", Category: "oauth"},
	{Code: "tenant.oauth.clients.create", Name: "创建 OAuth 客户端", Description: "创建租户 OAuth 客户端", Category: "oauth"},
	{Code: "tenant.oauth.clients.update", Name: "编辑 OAuth 客户端", Description: "编辑租户 OAuth 客户端", Category: "oauth"},
	{Code: "tenant.oauth.clients.delete", Name: "删除 OAuth 客户端", Description: "删除租户 OAuth 客户端", Category: "oauth"},
	{Code: "tenant.oauth.clients.secret.regenerate", Name: "重置 OAuth 密钥", Description: "重置 OAuth 客户端密钥", Category: "oauth"},

	{Code: "tenant.manual_api.keys.create", Name: "创建手动 API Key", Description: "创建租户手动 API Key", Category: "integration"},

	{Code: "tenant.products.read", Name: "查看产品", Description: "查看租户产品", Category: "billing"},
	{Code: "tenant.products.create", Name: "创建产品", Description: "创建租户产品", Category: "billing"},
	{Code: "tenant.products.update", Name: "编辑产品", Description: "编辑租户产品", Category: "billing"},
	{Code: "tenant.products.delete", Name: "删除产品", Description: "删除租户产品", Category: "billing"},

	{Code: "tenant.plans.read", Name: "查看套餐", Description: "查看租户套餐", Category: "billing"},
	{Code: "tenant.plans.create", Name: "创建套餐", Description: "创建租户套餐", Category: "billing"},
	{Code: "tenant.plans.update", Name: "编辑套餐", Description: "编辑租户套餐", Category: "billing"},
	{Code: "tenant.plans.delete", Name: "删除套餐", Description: "删除租户套餐", Category: "billing"},

	{Code: "tenant.prices.read", Name: "查看价格", Description: "查看租户价格", Category: "billing"},
	{Code: "tenant.prices.create", Name: "创建价格", Description: "创建租户价格", Category: "billing"},
	{Code: "tenant.prices.update", Name: "编辑价格", Description: "编辑租户价格", Category: "billing"},
	{Code: "tenant.prices.delete", Name: "删除价格", Description: "删除租户价格", Category: "billing"},

	{Code: "tenant.coupons.read", Name: "查看优惠券", Description: "查看租户优惠券", Category: "billing"},
	{Code: "tenant.coupons.create", Name: "创建优惠券", Description: "创建租户优惠券", Category: "billing"},
	{Code: "tenant.coupons.update", Name: "编辑优惠券", Description: "编辑租户优惠券", Category: "billing"},
	{Code: "tenant.coupons.delete", Name: "删除优惠券", Description: "删除租户优惠券", Category: "billing"},
	{Code: "tenant.coupons.validate", Name: "校验优惠券", Description: "校验租户优惠券", Category: "billing"},

	{Code: "tenant.subscriptions.read", Name: "查看订阅", Description: "查看租户订阅", Category: "billing"},
	{Code: "tenant.subscriptions.create", Name: "创建订阅", Description: "创建租户订阅", Category: "billing"},
	{Code: "tenant.subscriptions.cancel", Name: "取消订阅", Description: "取消租户订阅", Category: "billing"},
	{Code: "tenant.subscriptions.stats.read", Name: "查看订阅统计", Description: "查看租户订阅统计", Category: "billing"},

	{Code: "tenant.invoices.read", Name: "查看账单", Description: "查看租户账单", Category: "billing"},
	{Code: "tenant.invoices.create", Name: "创建账单", Description: "创建租户账单", Category: "billing"},

	{Code: "tenant.catalog.categories.read", Name: "查看产品分类", Description: "查看产品分类", Category: "catalog"},
	{Code: "tenant.catalog.categories.create", Name: "创建产品分类", Description: "创建产品分类", Category: "catalog"},
	{Code: "tenant.catalog.categories.update", Name: "编辑产品分类", Description: "编辑产品分类", Category: "catalog"},
	{Code: "tenant.catalog.categories.delete", Name: "删除产品分类", Description: "删除产品分类", Category: "catalog"},

	{Code: "tenant.catalog.tags.read", Name: "查看产品标签", Description: "查看产品标签", Category: "catalog"},
	{Code: "tenant.catalog.tags.create", Name: "创建产品标签", Description: "创建产品标签", Category: "catalog"},
	{Code: "tenant.catalog.tags.update", Name: "编辑产品标签", Description: "编辑产品标签", Category: "catalog"},
	{Code: "tenant.catalog.tags.delete", Name: "删除产品标签", Description: "删除产品标签", Category: "catalog"},

	{Code: "tenant.catalog.price_templates.read", Name: "查看价格模板", Description: "查看价格模板", Category: "catalog"},
	{Code: "tenant.catalog.price_templates.create", Name: "创建价格模板", Description: "创建价格模板", Category: "catalog"},
	{Code: "tenant.catalog.price_templates.update", Name: "编辑价格模板", Description: "编辑价格模板", Category: "catalog"},
	{Code: "tenant.catalog.price_templates.delete", Name: "删除价格模板", Description: "删除价格模板", Category: "catalog"},
}

var defaultTenantRoleSeeds = []tenantRoleSeed{
	{Code: "owner", Name: "Owner", Description: "租户拥有者，拥有全部租户权限", PermissionCodes: tenantAllPermissionCodes()},
	{Code: "admin", Name: "Admin", Description: "租户管理员，负责日常租户管理", PermissionCodes: tenantAllPermissionCodes()},
	{Code: "access_admin", Name: "Access Admin", Description: "负责用户、角色、权限与团队管理", PermissionCodes: []string{
		"tenant.info.read",
		"tenant.users.read", "tenant.users.update", "tenant.users.delete", "tenant.users.invite", "tenant.users.resend_invitation", "tenant.users.stats.read",
		"tenant.roles.read", "tenant.roles.create", "tenant.roles.update", "tenant.roles.delete", "tenant.roles.assign",
		"tenant.roles.permissions.read", "tenant.roles.permissions.set", "tenant.roles.permissions.remove",
		"tenant.permissions.read", "tenant.permissions.create", "tenant.permissions.update", "tenant.permissions.delete",
		"tenant.teams.read", "tenant.teams.create", "tenant.teams.update", "tenant.teams.delete", "tenant.teams.members.manage", "tenant.teams.transfer",
	}},
	{Code: "app_admin", Name: "App Admin", Description: "负责应用、OAuth 与接入能力", PermissionCodes: []string{
		"tenant.info.read",
		"tenant.apps.read", "tenant.apps.create", "tenant.apps.update", "tenant.apps.delete", "tenant.apps.status.update", "tenant.apps.stats.read",
		"tenant.oauth.clients.read", "tenant.oauth.clients.create", "tenant.oauth.clients.update", "tenant.oauth.clients.delete", "tenant.oauth.clients.secret.regenerate",
		"tenant.manual_api.keys.create",
		"tenant.notifications.read", "tenant.notifications.stats.read",
	}},
	{Code: "billing_admin", Name: "Billing Admin", Description: "负责商品、定价、订阅与账单", PermissionCodes: []string{
		"tenant.info.read",
		"tenant.products.read", "tenant.products.create", "tenant.products.update", "tenant.products.delete",
		"tenant.plans.read", "tenant.plans.create", "tenant.plans.update", "tenant.plans.delete",
		"tenant.prices.read", "tenant.prices.create", "tenant.prices.update", "tenant.prices.delete",
		"tenant.coupons.read", "tenant.coupons.create", "tenant.coupons.update", "tenant.coupons.delete", "tenant.coupons.validate",
		"tenant.subscriptions.read", "tenant.subscriptions.create", "tenant.subscriptions.cancel", "tenant.subscriptions.stats.read",
		"tenant.invoices.read", "tenant.invoices.create",
		"tenant.catalog.categories.read", "tenant.catalog.categories.create", "tenant.catalog.categories.update", "tenant.catalog.categories.delete",
		"tenant.catalog.tags.read", "tenant.catalog.tags.create", "tenant.catalog.tags.update", "tenant.catalog.tags.delete",
		"tenant.catalog.price_templates.read", "tenant.catalog.price_templates.create", "tenant.catalog.price_templates.update", "tenant.catalog.price_templates.delete",
	}},
	{Code: "support", Name: "Support", Description: "客服与运营支持角色", PermissionCodes: []string{
		"tenant.info.read",
		"tenant.users.read", "tenant.users.update", "tenant.users.stats.read",
		"tenant.teams.read",
		"tenant.notifications.read", "tenant.notifications.create", "tenant.notifications.stats.read",
		"tenant.apps.read", "tenant.apps.stats.read",
		"tenant.products.read", "tenant.plans.read", "tenant.prices.read", "tenant.coupons.read", "tenant.coupons.validate",
		"tenant.subscriptions.read", "tenant.subscriptions.cancel", "tenant.subscriptions.stats.read",
		"tenant.invoices.read",
	}},
	{Code: "viewer", Name: "Viewer", Description: "只读租户观察角色", PermissionCodes: tenantViewerPermissionCodes()},
	{Code: "member", Name: "Member", Description: "普通租户成员，可查看基础租户数据", PermissionCodes: []string{
		"tenant.info.read",
		"tenant.teams.read",
		"tenant.notifications.read",
		"tenant.apps.read",
		"tenant.products.read", "tenant.plans.read", "tenant.prices.read", "tenant.coupons.read",
		"tenant.subscriptions.read",
		"tenant.invoices.read",
	}},
}

func tenantAllPermissionCodes() []string {
	codes := make([]string, 0, len(defaultTenantPermissionSeeds))
	for _, seed := range defaultTenantPermissionSeeds {
		codes = append(codes, seed.Code)
	}
	return codes
}

func tenantViewerPermissionCodes() []string {
	codes := []string{}
	for _, seed := range defaultTenantPermissionSeeds {
		switch {
		case seed.Code == "tenant.info.read":
			codes = append(codes, seed.Code)
		case len(seed.Code) >= 5 && seed.Code[len(seed.Code)-5:] == ".read":
			codes = append(codes, seed.Code)
		case len(seed.Code) >= 11 && seed.Code[len(seed.Code)-11:] == ".stats.read":
			codes = append(codes, seed.Code)
		case len(seed.Code) >= 9 && seed.Code[len(seed.Code)-9:] == ".validate":
			codes = append(codes, seed.Code)
		}
	}
	return codes
}

// EnsureTenantRBACBootstrap creates the default tenant RBAC permissions, roles and owner-role binding.
func EnsureTenantRBACBootstrap(tx *gorm.DB, tenantID uint, ownerUserID uint) error {
	if tx == nil {
		return fmt.Errorf("tenant rbac bootstrap requires a db transaction")
	}
	if tenantID == 0 {
		return fmt.Errorf("tenant rbac bootstrap requires a valid tenant id")
	}

	permissionIDs := make(map[string]uint, len(defaultTenantPermissionSeeds))
	for _, seed := range defaultTenantPermissionSeeds {
		perm := model.TenantRbacPermission{
			TenantID:    tenantID,
			Code:        seed.Code,
			Name:        seed.Name,
			Description: seed.Description,
			Category:    seed.Category,
		}
		if err := upsertTenantPermission(tx, &perm); err != nil {
			return fmt.Errorf("bootstrap tenant permission %s: %w", seed.Code, err)
		}
		permissionIDs[seed.Code] = perm.ID
	}

	roleIDs := make(map[string]uint, len(defaultTenantRoleSeeds))
	for _, seed := range defaultTenantRoleSeeds {
		role := model.TenantRbacRole{
			TenantID:    tenantID,
			Code:        seed.Code,
			Name:        seed.Name,
			Description: seed.Description,
			IsSystem:    true,
		}
		if err := upsertTenantRole(tx, &role); err != nil {
			return fmt.Errorf("bootstrap tenant role %s: %w", seed.Code, err)
		}
		roleIDs[seed.Code] = role.ID

		for _, code := range seed.PermissionCodes {
			permissionID, ok := permissionIDs[code]
			if !ok {
				return fmt.Errorf("bootstrap tenant role %s references missing permission %s", seed.Code, code)
			}
			link := model.TenantRbacRolePermission{
				RoleID:       role.ID,
				PermissionID: permissionID,
			}
			if err := tx.Where("role_id = ? AND permission_id = ?", role.ID, permissionID).FirstOrCreate(&link).Error; err != nil {
				return fmt.Errorf("bind permission %s to role %s: %w", code, seed.Code, err)
			}
		}
	}

	if ownerUserID != 0 {
		ownerRoleID, ok := roleIDs["owner"]
		if !ok {
			return fmt.Errorf("owner role missing after tenant rbac bootstrap")
		}
		now := time.Now()
		ownerAssignment := model.TenantUserRbacRole{
			UserID:     ownerUserID,
			TenantID:   tenantID,
			RoleID:     ownerRoleID,
			AssignedAt: now,
			AssignedBy: ownerUserID,
		}
		if err := tx.Where("user_id = ? AND tenant_id = ? AND role_id = ?", ownerUserID, tenantID, ownerRoleID).
			FirstOrCreate(&ownerAssignment).Error; err != nil {
			return fmt.Errorf("assign owner role to user %d: %w", ownerUserID, err)
		}
	}

	return nil
}

// EnsureTenantRBACBootstrapForAllTenants backfills the default RBAC data for all existing tenants.
func EnsureTenantRBACBootstrapForAllTenants(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("tenant rbac bootstrap requires a db instance")
	}

	var tenants []model.Tenant
	if err := db.Find(&tenants).Error; err != nil {
		return err
	}

	for _, tenant := range tenants {
		var owner model.TenantUser
		ownerUserID := uint(0)
		if err := db.Where("tenant_id = ? AND role = ?", tenant.ID, model.TenantRoleOwner).
			Order("id ASC").
			First(&owner).Error; err == nil {
			ownerUserID = owner.UserID
		}

		if err := db.Transaction(func(tx *gorm.DB) error {
			return EnsureTenantRBACBootstrap(tx, tenant.ID, ownerUserID)
		}); err != nil {
			return err
		}

		log.Printf("[Migration] Ensured tenant RBAC bootstrap for tenant %d (%s)", tenant.ID, tenant.Code)
	}

	return nil
}

func upsertTenantPermission(tx *gorm.DB, perm *model.TenantRbacPermission) error {
	var existing model.TenantRbacPermission
	err := tx.Where("tenant_id = ? AND code = ?", perm.TenantID, perm.Code).First(&existing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return tx.Create(perm).Error
		}
		return err
	}

	perm.ID = existing.ID
	updates := map[string]interface{}{}
	if existing.Name != perm.Name {
		updates["name"] = perm.Name
	}
	if existing.Description != perm.Description {
		updates["description"] = perm.Description
	}
	if existing.Category != perm.Category {
		updates["category"] = perm.Category
	}
	if len(updates) == 0 {
		return nil
	}
	return tx.Model(&existing).Updates(updates).Error
}

func upsertTenantRole(tx *gorm.DB, role *model.TenantRbacRole) error {
	var existing model.TenantRbacRole
	err := tx.Where("tenant_id = ? AND code = ?", role.TenantID, role.Code).First(&existing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return tx.Create(role).Error
		}
		return err
	}

	role.ID = existing.ID
	updates := map[string]interface{}{}
	if existing.Name != role.Name {
		updates["name"] = role.Name
	}
	if existing.Description != role.Description {
		updates["description"] = role.Description
	}
	if existing.IsSystem != role.IsSystem {
		updates["is_system"] = role.IsSystem
	}
	if len(updates) == 0 {
		return nil
	}
	return tx.Model(&existing).Updates(updates).Error
}
