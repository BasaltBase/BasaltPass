package main

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 初始化数据库
	common.RunMigrations()

	// 创建测试用户
	password := "password123"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}

	user := &model.User{
		Email:        "test@example.com",
		PasswordHash: string(hash),
		Nickname:     "测试用户",
	}

	db := common.DB()
	if err := db.Create(user).Error; err != nil {
		log.Printf("创建用户失败: %v", err)
		return
	}

	fmt.Println("✅ 测试用户创建成功!")
	fmt.Println("📧 邮箱: test@example.com")
	fmt.Println("🔑 密码: password123")
	fmt.Println("🆔 用户ID:", user.ID)
	fmt.Println("\n现在你可以使用这些凭据登录系统了!")
}
