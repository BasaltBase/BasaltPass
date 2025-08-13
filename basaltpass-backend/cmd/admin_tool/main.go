package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
)

func main() {
	// 初始化数据库连接
	db := common.DB()
	if db == nil {
		log.Fatal("数据库连接失败")
	}

	if len(os.Args) < 2 {
		fmt.Println("用法:")
		fmt.Println("  go run cmd/admin_tool/main.go list-users")
		fmt.Println("  go run cmd/admin_tool/main.go list-roles")
		fmt.Println("  go run cmd/admin_tool/main.go assign-tenant <user_id>")
		fmt.Println("  go run cmd/admin_tool/main.go create-tenant-role")
		return
	}

	command := os.Args[1]

	switch command {
	case "list-users":
		listUsers()
	case "list-roles":
		listRoles()
	case "assign-tenant":
		if len(os.Args) < 3 {
			fmt.Println("请提供用户ID")
			return
		}
		userID, err := strconv.Atoi(os.Args[2])
		if err != nil {
			fmt.Println("无效的用户ID")
			return
		}
		assignAdmin(uint(userID))
	case "create-tenant-role":
		createAdminRole()
	default:
		fmt.Println("未知命令:", command)
	}
}

func listUsers() {
	var users []model.User
	if err := common.DB().Find(&users).Error; err != nil {
		log.Fatal("查询用户失败:", err)
	}

	fmt.Println("用户列表:")
	for _, user := range users {
		fmt.Printf("ID: %d, Email: %s, Nickname: %s\n", user.ID, user.Email, user.Nickname)

		// 查询用户的角色
		var userRoles []model.UserRole
		if err := common.DB().Where("user_id = ?", user.ID).Find(&userRoles).Error; err == nil {
			for _, ur := range userRoles {
				var role model.Role
				if err := common.DB().First(&role, ur.RoleID).Error; err == nil {
					fmt.Printf("  - 角色: %s (ID: %d)\n", role.Name, role.ID)
				}
			}
		}
	}
}

func listRoles() {
	var roles []model.Role
	if err := common.DB().Find(&roles).Error; err != nil {
		log.Fatal("查询角色失败:", err)
	}

	fmt.Println("角色列表:")
	for _, role := range roles {
		fmt.Printf("ID: %d, Name: %s, Code: %s, Description: %s\n",
			role.ID, role.Name, role.Code, role.Description)
	}
}

func createAdminRole() {
	// 检查admin角色是否已存在
	var existingRole model.Role
	if err := common.DB().Where("name = ?", "tenant").First(&existingRole).Error; err == nil {
		fmt.Println("admin角色已存在")
		return
	}

	// 创建admin角色
	role := model.Role{
		Name:        "tenant",
		Code:        "tenant",
		Description: "系统管理员",
	}

	if err := common.DB().Create(&role).Error; err != nil {
		log.Fatal("创建admin角色失败:", err)
	}

	fmt.Println("admin角色创建成功")
}

func assignAdmin(userID uint) {
	// 检查用户是否存在
	var user model.User
	if err := common.DB().First(&user, userID).Error; err != nil {
		fmt.Println("用户不存在")
		return
	}

	// 检查admin角色是否存在
	var adminRole model.Role
	if err := common.DB().Where("name = ?", "tenant").First(&adminRole).Error; err != nil {
		fmt.Println("admin角色不存在，正在创建...")
		createAdminRole()
		// 重新查询
		if err := common.DB().Where("name = ?", "tenant").First(&adminRole).Error; err != nil {
			fmt.Println("创建admin角色失败")
			return
		}
	}

	// 检查用户是否已有admin角色
	var existingUserRole model.UserRole
	if err := common.DB().Where("user_id = ? AND role_id = ?", userID, adminRole.ID).First(&existingUserRole).Error; err == nil {
		fmt.Printf("用户 %s 已经是管理员\n", user.Email)
		return
	}

	// 分配admin角色
	userRole := model.UserRole{
		UserID: userID,
		RoleID: adminRole.ID,
	}

	if err := common.DB().Create(&userRole).Error; err != nil {
		log.Fatal("分配admin角色失败:", err)
	}

	fmt.Printf("成功为用户 %s 分配admin角色\n", user.Email)
}
