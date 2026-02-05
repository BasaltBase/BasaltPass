package main

import (
	"fmt"
	"log"
	"os"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/utils"

	"gorm.io/gorm"
)

// PhoneMigration 处理现有手机号数据的E.164格式迁移
type PhoneMigration struct {
	db               *gorm.DB
	phoneValidator   *utils.PhoneValidator
	successCount     int
	failureCount     int
	failedRecords    []FailedRecord
}

type FailedRecord struct {
	UserID      uint   `json:"user_id"`
	OriginalPhone string `json:"original_phone"`
	Error       string `json:"error"`
}

// NewPhoneMigration 创建新的手机号迁移实例
func NewPhoneMigration(db *gorm.DB) *PhoneMigration {
	return &PhoneMigration{
		db:             db,
		phoneValidator: utils.NewPhoneValidator("+86"), // 默认使用中国为国家代码
		failedRecords:  make([]FailedRecord, 0),
	}
}

// MigratePhoneNumbers 迁移所有现有的手机号到E.164格式
func (pm *PhoneMigration) MigratePhoneNumbers(dryRun bool) error {
	log.Printf("开始手机号E.164格式迁移...")
	if dryRun {
		log.Printf("运行模式：试运行（不会实际修改数据库）")
	} else {
		log.Printf("运行模式：实际迁移")
	}

	// 获取所有有手机号的用户
	var users []model.User
	if err := pm.db.Where("phone IS NOT NULL AND phone != ''").Find(&users).Error; err != nil {
		return fmt.Errorf("查询用户失败: %v", err)
	}

	log.Printf("找到 %d 个有手机号的用户", len(users))

	// 开始迁移
	for _, user := range users {
		if err := pm.migrateUserPhone(&user, dryRun); err != nil {
			log.Printf("用户 %d 的手机号迁移失败: %v", user.ID, err)
			pm.failureCount++
			pm.failedRecords = append(pm.failedRecords, FailedRecord{
				UserID:        user.ID,
				OriginalPhone: user.Phone,
				Error:         err.Error(),
			})
		} else {
			pm.successCount++
		}
	}

	// 打印迁移结果
	pm.printMigrationSummary()
	return nil
}

// migrateUserPhone 迁移单个用户的手机号
func (pm *PhoneMigration) migrateUserPhone(user *model.User, dryRun bool) error {
	originalPhone := user.Phone

	// 检查是否已经是E.164格式
	if err := pm.phoneValidator.ValidateE164(originalPhone); err == nil {
		log.Printf("用户 %d 的手机号 %s 已经是E.164格式，跳过", user.ID, originalPhone)
		return nil
	}

	// 尝试转换为E.164格式
	normalizedPhone, err := pm.phoneValidator.NormalizeToE164(originalPhone)
	if err != nil {
		return fmt.Errorf("无法转换手机号 %s: %v", originalPhone, err)
	}

	log.Printf("用户 %d: %s -> %s", user.ID, originalPhone, normalizedPhone)

	if !dryRun {
		// 实际更新数据库
		if err := pm.db.Model(user).Update("phone", normalizedPhone).Error; err != nil {
			return fmt.Errorf("更新数据库失败: %v", err)
		}
	}

	return nil
}

// printMigrationSummary 打印迁移总结
func (pm *PhoneMigration) printMigrationSummary() {
	log.Printf("\n=== 迁移总结 ===")
	log.Printf("成功: %d", pm.successCount)
	log.Printf("失败: %d", pm.failureCount)

	if len(pm.failedRecords) > 0 {
		log.Printf("\n失败的记录:")
		for _, record := range pm.failedRecords {
			log.Printf("- 用户ID %d, 原始手机号: %s, 错误: %s", 
				record.UserID, record.OriginalPhone, record.Error)
		}
	}
}

// ValidateAllPhoneNumbers 验证所有现有手机号是否为有效的E.164格式
func (pm *PhoneMigration) ValidateAllPhoneNumbers() error {
	log.Printf("验证所有手机号格式...")

	var users []model.User
	if err := pm.db.Where("phone IS NOT NULL AND phone != ''").Find(&users).Error; err != nil {
		return fmt.Errorf("查询用户失败: %v", err)
	}

	validCount := 0
	invalidCount := 0

	for _, user := range users {
		if err := pm.phoneValidator.ValidateE164(user.Phone); err != nil {
			log.Printf("无效格式 - 用户ID %d: %s (%s)", user.ID, user.Phone, err.Error())
			invalidCount++
		} else {
			validCount++
		}
	}

	log.Printf("\n=== 验证结果 ===")
	log.Printf("有效的E.164格式: %d", validCount)
	log.Printf("无效格式: %d", invalidCount)

	return nil
}

func main() {
	// 初始化数据库连接
	common.Init("../config/config.yaml")
	db := common.DB()

	migration := NewPhoneMigration(db)

	// 解析命令行参数
	if len(os.Args) < 2 {
		fmt.Println("用法: go run phone_migration.go [command]")
		fmt.Println("命令:")
		fmt.Println("  validate  - 验证所有现有手机号格式")
		fmt.Println("  migrate   - 实际执行迁移")
		fmt.Println("  dry-run   - 试运行迁移（不修改数据）")
		return
	}

	command := os.Args[1]
	switch command {
	case "validate":
		if err := migration.ValidateAllPhoneNumbers(); err != nil {
			log.Fatalf("验证失败: %v", err)
		}
	case "migrate":
		if err := migration.MigratePhoneNumbers(false); err != nil {
			log.Fatalf("迁移失败: %v", err)
		}
	case "dry-run":
		if err := migration.MigratePhoneNumbers(true); err != nil {
			log.Fatalf("试运行失败: %v", err)
		}
	default:
		fmt.Printf("未知命令: %s\n", command)
	}
}