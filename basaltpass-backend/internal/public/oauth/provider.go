package oauth

import "golang.org/x/oauth2"

// Provider represents an OAuth2 provider configuration.
type Provider struct {
	Name   string
	Config *oauth2.Config
}

var providers = map[string]*Provider{}

// Register adds provider to registry.
func Register(p *Provider) {
	providers[p.Name] = p
}

// Get returns provider by name, or nil if not found.
func Get(name string) *Provider {
	return providers[name]
}

// List returns all registered provider names.
func List() []string {
	keys := make([]string, 0, len(providers))
	for k := range providers {
		keys = append(keys, k)
	}
	return keys
}
