package auth

import (
	"os"
	"testing"
)

func TestGenerateTokenPair(t *testing.T) {
	// 设置测试环境变量
	os.Setenv("JWT_SECRET", "test-secret-for-unit-tests")
	
	// 使用不需要数据库的函数进行测试
	p, err := GenerateTokenPairWithTenantAndScope(1, 1, ConsoleScopeUser)
	if err != nil || p.AccessToken == "" || p.RefreshToken == "" {
		t.Fatalf("token pair invalid %v", err)
	}
}
