package basaltimport

import "testing"

func TestValidateBundleRejectsUnknownPermissionReference(t *testing.T) {
	bundle := &Bundle{
		App: AppFile{
			App: AppDefinition{
				AppID:       "demo",
				AppKey:      "demo",
				DisplayName: "Demo",
			},
		},
		RBAC: RBACFile{
			Permissions: []PermissionDef{
				{PermissionKey: "demo.read"},
			},
			Roles: []RoleDef{
				{RoleKey: "demo_viewer"},
			},
			RolePermissions: []RolePermissionLink{
				{RoleKey: "demo_viewer", PermissionKey: "demo.write", Effect: "allow"},
			},
		},
	}

	if err := ValidateBundle(bundle); err == nil {
		t.Fatalf("expected validation error")
	}
}

func TestCollectAllowedOriginsDeduplicatesOrigins(t *testing.T) {
	bundle := &Bundle{
		App: AppFile{
			App: AppDefinition{
				HomepageURL: "http://localhost:5101",
			},
		},
		Resources: ResourcesFile{
			Navigation: []NavigationDef{
				{URL: "http://localhost:5101/dashboard"},
				{URL: "http://localhost:5102"},
			},
		},
	}

	got := collectAllowedOrigins(bundle)
	if len(got) != 2 {
		t.Fatalf("expected 2 origins, got %d: %#v", len(got), got)
	}
	if got[0] != "http://localhost:5101" {
		t.Fatalf("unexpected first origin: %s", got[0])
	}
	if got[1] != "http://localhost:5102" {
		t.Fatalf("unexpected second origin: %s", got[1])
	}
}
