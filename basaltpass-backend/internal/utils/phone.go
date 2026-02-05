package utils

import (
	"errors"
	"regexp"
	"strings"
)

// PhoneValidator 提供E.164格式手机号验证和转换功能
type PhoneValidator struct {
	// 默认国家代码（当用户输入没有国家代码时使用）
	DefaultCountryCode string
}

// NewPhoneValidator 创建新的手机号验证器
func NewPhoneValidator(defaultCountryCode string) *PhoneValidator {
	if defaultCountryCode == "" {
		defaultCountryCode = "+86" // 默认中国
	}
	return &PhoneValidator{
		DefaultCountryCode: defaultCountryCode,
	}
}

// ValidateE164 验证手机号是否符合E.164标准
// E.164格式: +[国家代码][电话号码]，总长度不超过15位数字
func (pv *PhoneValidator) ValidateE164(phone string) error {
	if phone == "" {
		return errors.New("手机号不能为空")
	}

	// E.164格式正则表达式：以+开头，后跟1-15位数字
	e164Regex := regexp.MustCompile(`^\+[1-9]\d{6,14}$`)
	
	if !e164Regex.MatchString(phone) {
		return errors.New("手机号格式不正确，应为E.164格式（例：+8613812345678）")
	}

	return nil
}

// NormalizeToE164 将各种格式的手机号转换为E.164格式
func (pv *PhoneValidator) NormalizeToE164(phone string) (string, error) {
	if phone == "" {
		return "", errors.New("手机号不能为空")
	}

	// 去除空格、连字符等分隔符
	cleaned := pv.cleanPhone(phone)
	
	// 如果已经是E.164格式，直接验证并返回
	if strings.HasPrefix(cleaned, "+") {
		if err := pv.ValidateE164(cleaned); err != nil {
			return "", err
		}
		return cleaned, nil
	}

	// 处理不同国家的手机号格式
	normalized, err := pv.normalizeByPattern(cleaned)
	if err != nil {
		return "", err
	}

	// 验证转换后的格式
	if err := pv.ValidateE164(normalized); err != nil {
		return "", err
	}

	return normalized, nil
}

// cleanPhone 清理手机号中的非数字字符（保留+号）
func (pv *PhoneValidator) cleanPhone(phone string) string {
	// 保留+号和数字
	cleaned := regexp.MustCompile(`[^\d+]`).ReplaceAllString(phone, "")
	return strings.TrimSpace(cleaned)
}

// normalizeByPattern 根据常见格式模式转换手机号
func (pv *PhoneValidator) normalizeByPattern(phone string) (string, error) {
	// 移除可能的前导0
	phone = strings.TrimLeft(phone, "0")

	// 英国手机号处理 - 需要优先处理以7开头的英国号码
	if pv.isUKMobileNumber(phone) {
		return "+44" + phone, nil
	}

	// 中国手机号处理
	if pv.isChinaMobileNumber(phone) {
		return "+86" + phone, nil
	}

	// 美国/加拿大手机号处理
	if pv.isNorthAmericaMobileNumber(phone) {
		return "+1" + phone, nil
	}

	// 如果无法识别格式，使用默认国家代码
	if len(phone) >= 7 && len(phone) <= 11 {
		// 移除默认国家代码中的+号
		countryCode := strings.TrimPrefix(pv.DefaultCountryCode, "+")
		return "+" + countryCode + phone, nil
	}

	return "", errors.New("无法识别手机号格式")
}

// isChinaMobileNumber 判断是否为中国手机号
func (pv *PhoneValidator) isChinaMobileNumber(phone string) bool {
	// 中国手机号：11位数字，以1开头
	if len(phone) == 11 && strings.HasPrefix(phone, "1") {
		// 验证第二位是否为有效的运营商号码
		if len(phone) > 1 {
			secondDigit := phone[1:2]
			validSecondDigits := []string{"3", "4", "5", "6", "7", "8", "9"}
			for _, digit := range validSecondDigits {
				if secondDigit == digit {
					return true
				}
			}
		}
	}
	return false
}

// isNorthAmericaMobileNumber 判断是否为北美手机号
func (pv *PhoneValidator) isNorthAmericaMobileNumber(phone string) bool {
	// 北美手机号：10位数字
	if len(phone) == 10 {
		// 第一位不能是0或1
		if phone[0] != '0' && phone[0] != '1' {
			return true
		}
	}
	return false
}

// isUKMobileNumber 判断是否为英国手机号
func (pv *PhoneValidator) isUKMobileNumber(phone string) bool {
	// 英国手机号：去掉国家代码后通常是10-11位，以7开头
	if (len(phone) == 10 || len(phone) == 11) && strings.HasPrefix(phone, "7") {
		return true
	}
	return false
}

// FormatForDisplay 将E.164格式的手机号转换为用户友好的显示格式
func (pv *PhoneValidator) FormatForDisplay(e164Phone string) string {
	if e164Phone == "" {
		return ""
	}

	// 如果不是E.164格式，直接返回
	if !strings.HasPrefix(e164Phone, "+") {
		return e164Phone
	}

	// 中国手机号格式化
	if strings.HasPrefix(e164Phone, "+86") && len(e164Phone) == 14 {
		number := e164Phone[3:]
		return "+86 " + number[:3] + " " + number[3:7] + " " + number[7:]
	}

	// 美国/加拿大手机号格式化
	if strings.HasPrefix(e164Phone, "+1") && len(e164Phone) == 12 {
		number := e164Phone[2:]
		return "+1 (" + number[:3] + ") " + number[3:6] + "-" + number[6:]
	}

	// 英国手机号格式化
	if strings.HasPrefix(e164Phone, "+44") {
		number := e164Phone[3:]
		if len(number) >= 10 {
			return "+44 " + number[:4] + " " + number[4:7] + " " + number[7:]
		}
	}

	// 默认格式：国家代码 + 空格 + 号码
	for i := 2; i <= 4; i++ {
		if i < len(e164Phone) {
			countryCode := e164Phone[:i]
			number := e164Phone[i:]
			if pv.isValidCountryCode(countryCode) {
				return countryCode + " " + number
			}
		}
	}

	return e164Phone
}

// isValidCountryCode 检查是否为有效的国家代码
func (pv *PhoneValidator) isValidCountryCode(code string) bool {
	// 常见国家代码列表
	validCodes := []string{
		"+1", "+7", "+20", "+27", "+30", "+31", "+32", "+33", "+34", "+36", "+39", "+40",
		"+41", "+43", "+44", "+45", "+46", "+47", "+48", "+49", "+51", "+52", "+53", "+54",
		"+55", "+56", "+57", "+58", "+60", "+61", "+62", "+63", "+64", "+65", "+66", "+81",
		"+82", "+84", "+86", "+90", "+91", "+92", "+93", "+94", "+95", "+98",
	}

	for _, validCode := range validCodes {
		if code == validCode {
			return true
		}
	}
	return false
}

// GetCountryCode 从E.164格式手机号中提取国家代码
func (pv *PhoneValidator) GetCountryCode(e164Phone string) string {
	if !strings.HasPrefix(e164Phone, "+") {
		return ""
	}

	// 尝试1-4位国家代码
	for i := 2; i <= 5 && i <= len(e164Phone); i++ {
		countryCode := e164Phone[:i]
		if pv.isValidCountryCode(countryCode) {
			return countryCode
		}
	}

	return ""
}

// IsValidPhoneForCountry 检查手机号是否符合指定国家的格式
func (pv *PhoneValidator) IsValidPhoneForCountry(phone, countryCode string) bool {
	if !strings.HasPrefix(phone, countryCode) {
		return false
	}

	number := phone[len(countryCode):]
	
	switch countryCode {
	case "+86":
		// 中国手机号：11位，以1开头
		return len(number) == 11 && strings.HasPrefix(number, "1")
	case "+1":
		// 北美手机号：10位
		return len(number) == 10
	case "+44":
		// 英国手机号：10-11位，通常以7开头
		return (len(number) == 10 || len(number) == 11) && strings.HasPrefix(number, "7")
	default:
		// 其他国家使用基本E.164验证
		return pv.ValidateE164(phone) == nil
	}
}