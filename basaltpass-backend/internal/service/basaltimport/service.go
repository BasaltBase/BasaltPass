package basaltimport

import (
	"basaltpass-backend/internal/model"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
)

type Bundle struct {
	App       AppFile       `json:"app"`
	RBAC      RBACFile      `json:"rbac"`
	Resources ResourcesFile `json:"resources"`
}

type AppFile struct {
	SchemaVersion string             `json:"schema_version"`
	Type          string             `json:"type"`
	App           AppDefinition      `json:"app"`
}

type AppDefinition struct {
	AppID           string        `json:"app_id"`
	AppKey          string        `json:"app_key"`
	DisplayName     string        `json:"display_name"`
	Description     string        `json:"description"`
	HomepageURL     string        `json:"homepage_url"`
	APIBaseURL      string        `json:"api_base_url"`
	CallbackURLs    []string      `json:"callback_urls"`
	DefaultRoleKey  string        `json:"default_role_key"`
	Status          string        `json:"status"`
	Tags            []string      `json:"tags"`
	ServicePorts    []ServicePort `json:"service_ports"`
	Metadata        model.JSONMap `json:"metadata"`
}

type ServicePort struct {
	Service  string `json:"service"`
	Port     int    `json:"port"`
	Protocol string `json:"protocol"`
}

type RBACFile struct {
	SchemaVersion   string               `json:"schema_version"`
	Type            string               `json:"type"`
	Permissions     []PermissionDef      `json:"permissions"`
	Roles           []RoleDef            `json:"roles"`
	RolePermissions []RolePermissionLink `json:"role_permissions"`
}

type PermissionDef struct {
	PermissionKey string `json:"permission_key"`
	DisplayName   string `json:"display_name"`
	Resource      string `json:"resource"`
	Action        string `json:"action"`
	Scope         string `json:"scope"`
	Description   string `json:"description"`
	Status        string `json:"status"`
}

type RoleDef struct {
	RoleKey     string `json:"role_key"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	Assignable  bool   `json:"assignable"`
	Priority    int    `json:"priority"`
	Status      string `json:"status"`
}

type RolePermissionLink struct {
	RoleKey       string `json:"role_key"`
	PermissionKey string `json:"permission_key"`
	Effect        string `json:"effect"`
}

type ResourcesFile struct {
	SchemaVersion string          `json:"schema_version"`
	Type          string          `json:"type"`
	Navigation    []NavigationDef `json:"navigation"`
	OAuthClients  []OAuthClientDef `json:"oauth_clients"`
	Webhooks      []model.JSONMap `json:"webhooks"`
	Claims        []ClaimDef      `json:"claims"`
	Extra         model.JSONMap   `json:"extra"`
}

type NavigationDef struct {
	Key           string `json:"key"`
	Label         string `json:"label"`
	Path          string `json:"path"`
	URL           string `json:"url"`
	PermissionKey string `json:"permission_key"`
}

type OAuthClientDef struct {
	ClientName   string   `json:"client_name"`
	RedirectURIs []string `json:"redirect_uris"`
}

type ClaimDef struct {
	Claim string `json:"claim"`
	Value string `json:"value"`
}

type Options struct {
	TenantID uint
	UserID   uint
	DryRun   bool
}

type Report struct {
	App               AppReport       `json:"app"`
	Permissions       EntityReport    `json:"permissions"`
	Roles             EntityReport    `json:"roles"`
	RolePermissions   LinkReport      `json:"role_permissions"`
	Resources         ResourcesReport `json:"resources"`
	Warnings          []string        `json:"warnings"`
	ImportedAt        time.Time       `json:"imported_at"`
}

type AppReport struct {
	AppID            uint     `json:"app_id,omitempty"`
	Name             string   `json:"name"`
	Created          bool     `json:"created"`
	Updated          bool     `json:"updated"`
	OAuthClientID    uint     `json:"oauth_client_id,omitempty"`
	OAuthCreated     bool     `json:"oauth_created"`
	OAuthUpdated     bool     `json:"oauth_updated"`
	PlainClientSecret string  `json:"plain_client_secret,omitempty"`
	RedirectURIs     []string `json:"redirect_uris"`
	AllowedOrigins   []string `json:"allowed_origins"`
}

type EntityReport struct {
	Created []string `json:"created"`
	Updated []string `json:"updated"`
	Skipped []string `json:"skipped"`
}

type LinkReport struct {
	Applied []string `json:"applied"`
	Skipped []string `json:"skipped"`
}

type ResourcesReport struct {
	NavigationCount   int `json:"navigation_count"`
	OAuthClientsCount int `json:"oauth_clients_count"`
	ClaimsCount       int `json:"claims_count"`
	WebhooksCount     int `json:"webhooks_count"`
}

func LoadBundleFromDir(dir string) (*Bundle, error) {
	read := func(name string, dest interface{}) error {
		path := filepath.Join(dir, name)
		raw, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		if err := json.Unmarshal(raw, dest); err != nil {
			return fmt.Errorf("parse %s: %w", name, err)
		}
		return nil
	}

	bundle := &Bundle{}
	if err := read("app.json", &bundle.App); err != nil {
		return nil, err
	}
	if err := read("rbac.json", &bundle.RBAC); err != nil {
		return nil, err
	}
	if err := read("resources.json", &bundle.Resources); err != nil {
		return nil, err
	}
	return bundle, nil
}

func ValidateBundle(bundle *Bundle) error {
	if bundle == nil {
		return errors.New("bundle is required")
	}
	app := bundle.App.App
	if strings.TrimSpace(app.AppID) == "" {
		return errors.New("app.app_id is required")
	}
	if strings.TrimSpace(app.AppKey) == "" {
		return errors.New("app.app_key is required")
	}
	if strings.TrimSpace(app.DisplayName) == "" {
		return errors.New("app.display_name is required")
	}

	permissionKeys := make(map[string]struct{}, len(bundle.RBAC.Permissions))
	for _, p := range bundle.RBAC.Permissions {
		key := strings.TrimSpace(p.PermissionKey)
		if key == "" {
			return errors.New("rbac.permissions.permission_key is required")
		}
		if _, exists := permissionKeys[key]; exists {
			return fmt.Errorf("duplicate permission_key: %s", key)
		}
		permissionKeys[key] = struct{}{}
	}

	roleKeys := make(map[string]struct{}, len(bundle.RBAC.Roles))
	for _, r := range bundle.RBAC.Roles {
		key := strings.TrimSpace(r.RoleKey)
		if key == "" {
			return errors.New("rbac.roles.role_key is required")
		}
		if _, exists := roleKeys[key]; exists {
			return fmt.Errorf("duplicate role_key: %s", key)
		}
		roleKeys[key] = struct{}{}
	}

	for _, link := range bundle.RBAC.RolePermissions {
		if strings.TrimSpace(link.RoleKey) == "" || strings.TrimSpace(link.PermissionKey) == "" {
			return errors.New("rbac.role_permissions requires role_key and permission_key")
		}
		if _, exists := roleKeys[strings.TrimSpace(link.RoleKey)]; !exists {
			return fmt.Errorf("role_permissions references unknown role_key: %s", link.RoleKey)
		}
		if _, exists := permissionKeys[strings.TrimSpace(link.PermissionKey)]; !exists {
			return fmt.Errorf("role_permissions references unknown permission_key: %s", link.PermissionKey)
		}
	}

	return nil
}

func ImportBundle(db *gorm.DB, bundle *Bundle, opts Options) (*Report, error) {
	if db == nil {
		return nil, errors.New("db is required")
	}
	if opts.TenantID == 0 {
		return nil, errors.New("tenant_id is required")
	}
	if opts.UserID == 0 {
		return nil, errors.New("user_id is required")
	}
	if err := ValidateBundle(bundle); err != nil {
		return nil, err
	}

	report := &Report{
		App: AppReport{
			Name:         bundle.App.App.DisplayName,
			RedirectURIs: collectRedirectURIs(bundle),
			AllowedOrigins: collectAllowedOrigins(bundle),
		},
		Warnings:   []string{},
		ImportedAt: time.Now().UTC(),
		Resources: ResourcesReport{
			NavigationCount:   len(bundle.Resources.Navigation),
			OAuthClientsCount: len(bundle.Resources.OAuthClients),
			ClaimsCount:       len(bundle.Resources.Claims),
			WebhooksCount:     len(bundle.Resources.Webhooks),
		},
	}

	if opts.DryRun {
		fillDryRunReport(report, bundle)
		return report, nil
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		app, plainSecret, appReport, err := ensureApp(tx, bundle, opts)
		if err != nil {
			return err
		}
		report.App = appReport
		report.App.AppID = app.ID
		report.App.PlainClientSecret = plainSecret

		permissionIDs, permReport, err := upsertPermissions(tx, app, bundle, opts.TenantID)
		if err != nil {
			return err
		}
		report.Permissions = permReport

		roleIDs, roleReport, err := upsertRoles(tx, app, bundle, opts.TenantID)
		if err != nil {
			return err
		}
		report.Roles = roleReport

		linkReport, warnings, err := applyRolePermissions(tx, roleIDs, permissionIDs, bundle)
		if err != nil {
			return err
		}
		report.RolePermissions = linkReport
		report.Warnings = append(report.Warnings, warnings...)
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Strings(report.Permissions.Created)
	sort.Strings(report.Permissions.Updated)
	sort.Strings(report.Roles.Created)
	sort.Strings(report.Roles.Updated)
	sort.Strings(report.RolePermissions.Applied)
	sort.Strings(report.RolePermissions.Skipped)
	sort.Strings(report.Warnings)

	return report, nil
}

func fillDryRunReport(report *Report, bundle *Bundle) {
	for _, p := range bundle.RBAC.Permissions {
		report.Permissions.Created = append(report.Permissions.Created, p.PermissionKey)
	}
	for _, r := range bundle.RBAC.Roles {
		report.Roles.Created = append(report.Roles.Created, r.RoleKey)
	}
	for _, link := range bundle.RBAC.RolePermissions {
		entry := link.RoleKey + " -> " + link.PermissionKey
		if strings.EqualFold(strings.TrimSpace(link.Effect), "deny") {
			report.RolePermissions.Skipped = append(report.RolePermissions.Skipped, entry+" (deny not imported)")
			continue
		}
		report.RolePermissions.Applied = append(report.RolePermissions.Applied, entry)
	}
	report.App.Created = true
}

func ensureApp(tx *gorm.DB, bundle *Bundle, opts Options) (*model.App, string, AppReport, error) {
	appDef := bundle.App.App
	report := AppReport{
		Name:          appDef.DisplayName,
		RedirectURIs:  collectRedirectURIs(bundle),
		AllowedOrigins: collectAllowedOrigins(bundle),
	}

	var app model.App
	err := tx.Where("tenant_id = ? AND name = ?", opts.TenantID, appDef.DisplayName).First(&app).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		app = model.App{
			TenantID:    opts.TenantID,
			Name:        appDef.DisplayName,
			Description: appDef.Description,
			HomepageURL: appDef.HomepageURL,
			Status:      mapAppStatus(appDef.Status),
		}
		if err := tx.Create(&app).Error; err != nil {
			return nil, "", report, err
		}
		report.Created = true
	case err != nil:
		return nil, "", report, err
	default:
		updates := map[string]interface{}{
			"description":  appDef.Description,
			"homepage_url": appDef.HomepageURL,
			"status":       mapAppStatus(appDef.Status),
			"updated_at":   time.Now(),
		}
		if err := tx.Model(&app).Updates(updates).Error; err != nil {
			return nil, "", report, err
		}
		report.Updated = true
	}

	redirectURIs := collectRedirectURIs(bundle)
	if len(redirectURIs) == 0 {
		redirectURIs = []string{strings.TrimSpace(appDef.HomepageURL)}
	}
	redirectURIs = filterNonEmptyUnique(redirectURIs)
	allowedOrigins := collectAllowedOrigins(bundle)

	var client model.OAuthClient
	clientErr := tx.Where("app_id = ? AND is_active = ?", app.ID, true).First(&client).Error
	if errors.Is(clientErr, gorm.ErrRecordNotFound) {
		client = model.OAuthClient{
			AppID:     app.ID,
			IsActive:  true,
			CreatedBy: opts.UserID,
		}
		if err := client.GenerateClientCredentials(); err != nil {
			return nil, "", report, err
		}
		plainSecret := client.ClientSecret
		client.HashClientSecret()
		client.SetRedirectURIList(redirectURIs)
		client.SetScopeList([]string{"openid", "profile", "email"})
		client.SetAllowedOriginList(allowedOrigins)
		if err := tx.Create(&client).Error; err != nil {
			return nil, "", report, err
		}
		report.OAuthClientID = client.ID
		report.OAuthCreated = true
		return &app, plainSecret, report, nil
	}
	if clientErr != nil {
		return nil, "", report, clientErr
	}

	client.SetRedirectURIList(redirectURIs)
	client.SetAllowedOriginList(allowedOrigins)
	if err := tx.Save(&client).Error; err != nil {
		return nil, "", report, err
	}
	report.OAuthClientID = client.ID
	report.OAuthUpdated = true
	return &app, "", report, nil
}

func upsertPermissions(tx *gorm.DB, app *model.App, bundle *Bundle, tenantID uint) (map[string]uint, EntityReport, error) {
	ids := make(map[string]uint, len(bundle.RBAC.Permissions))
	report := EntityReport{}
	now := time.Now()
	for _, item := range bundle.RBAC.Permissions {
		key := strings.TrimSpace(item.PermissionKey)
		category := firstNonEmpty(item.Resource, item.Scope, "basalt")
		var permission model.AppPermission
		err := tx.Where("app_id = ? AND code = ?", app.ID, key).First(&permission).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			permission = model.AppPermission{
				Code:        key,
				Name:        firstNonEmpty(item.DisplayName, key),
				Description: item.Description,
				Category:    category,
				AppID:       app.ID,
				TenantID:    tenantID,
				CreatedAt:   now,
				UpdatedAt:   now,
			}
			if err := tx.Create(&permission).Error; err != nil {
				return nil, report, err
			}
			report.Created = append(report.Created, key)
		case err != nil:
			return nil, report, err
		default:
			updates := map[string]interface{}{
				"name":        firstNonEmpty(item.DisplayName, key),
				"description": item.Description,
				"category":    category,
				"updated_at":  now,
			}
			if err := tx.Model(&permission).Updates(updates).Error; err != nil {
				return nil, report, err
			}
			report.Updated = append(report.Updated, key)
		}
		ids[key] = permission.ID
	}
	return ids, report, nil
}

func upsertRoles(tx *gorm.DB, app *model.App, bundle *Bundle, tenantID uint) (map[string]uint, EntityReport, error) {
	ids := make(map[string]uint, len(bundle.RBAC.Roles))
	report := EntityReport{}
	now := time.Now()
	for _, item := range bundle.RBAC.Roles {
		key := strings.TrimSpace(item.RoleKey)
		var role model.AppRole
		err := tx.Where("app_id = ? AND code = ?", app.ID, key).First(&role).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			role = model.AppRole{
				Code:        key,
				Name:        firstNonEmpty(item.DisplayName, key),
				Description: item.Description,
				AppID:       app.ID,
				TenantID:    tenantID,
				CreatedAt:   now,
				UpdatedAt:   now,
			}
			if err := tx.Create(&role).Error; err != nil {
				return nil, report, err
			}
			report.Created = append(report.Created, key)
		case err != nil:
			return nil, report, err
		default:
			updates := map[string]interface{}{
				"name":        firstNonEmpty(item.DisplayName, key),
				"description": item.Description,
				"updated_at":  now,
			}
			if err := tx.Model(&role).Updates(updates).Error; err != nil {
				return nil, report, err
			}
			report.Updated = append(report.Updated, key)
		}
		ids[key] = role.ID
	}
	return ids, report, nil
}

func applyRolePermissions(tx *gorm.DB, roleIDs map[string]uint, permissionIDs map[string]uint, bundle *Bundle) (LinkReport, []string, error) {
	report := LinkReport{}
	var warnings []string
	for _, link := range bundle.RBAC.RolePermissions {
		entry := strings.TrimSpace(link.RoleKey) + " -> " + strings.TrimSpace(link.PermissionKey)
		if strings.EqualFold(strings.TrimSpace(link.Effect), "deny") {
			report.Skipped = append(report.Skipped, entry+" (deny not imported)")
			warnings = append(warnings, "ignored deny link: "+entry)
			continue
		}
		roleID, roleOK := roleIDs[strings.TrimSpace(link.RoleKey)]
		permissionID, permOK := permissionIDs[strings.TrimSpace(link.PermissionKey)]
		if !roleOK || !permOK {
			report.Skipped = append(report.Skipped, entry+" (missing dependency)")
			continue
		}

		var role model.AppRole
		if err := tx.Preload("Permissions").First(&role, roleID).Error; err != nil {
			return report, warnings, err
		}
		exists := false
		for _, permission := range role.Permissions {
			if permission.ID == permissionID {
				exists = true
				break
			}
		}
		if exists {
			report.Skipped = append(report.Skipped, entry+" (already linked)")
			continue
		}

		permission := model.AppPermission{ID: permissionID}
		if err := tx.Model(&role).Association("Permissions").Append(&permission); err != nil {
			return report, warnings, err
		}
		report.Applied = append(report.Applied, entry)
	}
	return report, warnings, nil
}

func collectRedirectURIs(bundle *Bundle) []string {
	var uris []string
	for _, uri := range bundle.App.App.CallbackURLs {
		uris = append(uris, strings.TrimSpace(uri))
	}
	for _, client := range bundle.Resources.OAuthClients {
		uris = append(uris, client.RedirectURIs...)
	}
	return filterNonEmptyUnique(uris)
}

func collectAllowedOrigins(bundle *Bundle) []string {
	var candidates []string
	if strings.TrimSpace(bundle.App.App.HomepageURL) != "" {
		candidates = append(candidates, bundle.App.App.HomepageURL)
	}
	for _, nav := range bundle.Resources.Navigation {
		if strings.TrimSpace(nav.URL) != "" {
			candidates = append(candidates, nav.URL)
		}
	}
	var origins []string
	for _, candidate := range candidates {
		origin := toOrigin(candidate)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	return filterNonEmptyUnique(origins)
}

func toOrigin(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

func filterNonEmptyUnique(items []string) []string {
	seen := make(map[string]struct{}, len(items))
	out := make([]string, 0, len(items))
	for _, item := range items {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func mapAppStatus(status string) model.AppStatus {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "suspended", "inactive":
		return model.AppStatusSuspended
	case "deleted":
		return model.AppStatusDeleted
	default:
		return model.AppStatusActive
	}
}
