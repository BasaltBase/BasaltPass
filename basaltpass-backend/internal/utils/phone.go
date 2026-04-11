package utils

import (
	"errors"
	"strconv"
	"strings"

	"github.com/nyaruka/phonenumbers"
)

// PhoneValidator 提供E.164格式手机号验证和转换功能
type PhoneValidator struct {
	// 默认国家代码（当用户输入没有国家代码时使用）
	DefaultCountryCode string
	defaultRegion      string
}

// NewPhoneValidator 创建新的手机号验证器
func NewPhoneValidator(defaultCountryCode string) *PhoneValidator {
	if defaultCountryCode == "" {
		defaultCountryCode = "+86" // 默认中国
	}

	region := countryCodeToRegion(defaultCountryCode)
	if region == "" {
		region = "CN"
	}

	return &PhoneValidator{
		DefaultCountryCode: defaultCountryCode,
		defaultRegion:      region,
	}
}

// ValidateE164 验证手机号是否符合E.164标准
// E.164格式: +[国家代码][电话号码]，总长度不超过15位数字
func (pv *PhoneValidator) ValidateE164(phone string) error {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return errors.New("手机号不能为空")
	}

	if !isStrictE164Format(phone) {
		return errors.New("手机号格式不正确，应为E.164格式（例：+8613812345678）")
	}

	num, err := phonenumbers.Parse(phone, "ZZ")
	if err != nil || !phonenumbers.IsValidNumber(num) {
		return errors.New("手机号格式不正确，应为E.164格式（例：+8613812345678）")
	}

	if phonenumbers.Format(num, phonenumbers.E164) != phone {
		return errors.New("手机号格式不正确，应为E.164格式（例：+8613812345678）")
	}

	return nil
}

// NormalizeToE164 将各种格式的手机号转换为E.164格式
func (pv *PhoneValidator) NormalizeToE164(phone string) (string, error) {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return "", errors.New("手机号不能为空")
	}

	parseRegion := pv.defaultRegion
	if strings.HasPrefix(phone, "+") {
		parseRegion = "ZZ"
	}

	num, err := phonenumbers.Parse(phone, parseRegion)
	if err != nil {
		return "", err
	}
	if !phonenumbers.IsValidNumber(num) {
		return "", errors.New("无法识别手机号格式")
	}

	return phonenumbers.Format(num, phonenumbers.E164), nil
}

// FormatForDisplay 将E.164格式的手机号转换为用户友好的显示格式
func (pv *PhoneValidator) FormatForDisplay(e164Phone string) string {
	e164Phone = strings.TrimSpace(e164Phone)
	if e164Phone == "" {
		return ""
	}

	num, err := phonenumbers.Parse(e164Phone, "ZZ")
	if err != nil || !phonenumbers.IsValidNumber(num) {
		return e164Phone
	}

	return phonenumbers.Format(num, phonenumbers.INTERNATIONAL)
}

// isValidCountryCode 检查是否为有效的国家代码
func (pv *PhoneValidator) isValidCountryCode(code string) bool {
	region := countryCodeToRegion(code)
	return region != ""
}

// GetCountryCode 从E.164格式手机号中提取国家代码
func (pv *PhoneValidator) GetCountryCode(e164Phone string) string {
	num, err := phonenumbers.Parse(strings.TrimSpace(e164Phone), "ZZ")
	if err != nil || !phonenumbers.IsValidNumber(num) {
		return ""
	}

	return "+" + strconv.Itoa(int(num.GetCountryCode()))
}

// IsValidPhoneForCountry 检查手机号是否符合指定国家的格式
func (pv *PhoneValidator) IsValidPhoneForCountry(phone, countryCode string) bool {
	num, err := phonenumbers.Parse(strings.TrimSpace(phone), "ZZ")
	if err != nil || !phonenumbers.IsValidNumber(num) {
		return false
	}

	digits := strings.TrimPrefix(strings.TrimSpace(countryCode), "+")
	expectedCode, err := strconv.Atoi(digits)
	if err != nil || expectedCode <= 0 {
		return false
	}

	return int(num.GetCountryCode()) == expectedCode
}

func isStrictE164Format(phone string) bool {
	if len(phone) < 8 || len(phone) > 16 || !strings.HasPrefix(phone, "+") {
		return false
	}
	for i, ch := range phone {
		if i == 0 {
			continue
		}
		if ch < '0' || ch > '9' {
			return false
		}
	}
	if phone[1] == '0' {
		return false
	}
	return true
}

func countryCodeToRegion(code string) string {
	digits := strings.TrimPrefix(strings.TrimSpace(code), "+")
	if digits == "" {
		return ""
	}

	cc, err := strconv.Atoi(digits)
	if err != nil {
		return ""
	}

	region := phonenumbers.GetRegionCodeForCountryCode(cc)
	if region == "ZZ" {
		return ""
	}
	return region
}
