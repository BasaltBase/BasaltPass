// 手机号验证和格式化工具类
export class PhoneValidator {
  private defaultCountryCode: string;

  constructor(defaultCountryCode: string = '+86') {
    this.defaultCountryCode = defaultCountryCode;
  }

  // 验证E.164格式的手机号
  validateE164(phone: string): { isValid: boolean; error?: string } {
    if (!phone) {
      return { isValid: false, error: '手机号不能为空' };
    }

    // E.164格式正则表达式：以+开头，后跟1-15位数字，总长度7-16位
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    
    if (!e164Regex.test(phone)) {
      return { 
        isValid: false, 
        error: '手机号格式不正确，应为国际格式（例：+8613812345678）' 
      };
    }

    return { isValid: true };
  }

  // 将各种格式的手机号转换为E.164格式
  normalizeToE164(phone: string): { phone?: string; error?: string } {
    if (!phone) {
      return { error: '手机号不能为空' };
    }

    // 去除空格、连字符等分隔符
    const cleaned = this.cleanPhone(phone);
    
    // 如果已经是E.164格式，直接验证并返回
    if (cleaned.startsWith('+')) {
      const validation = this.validateE164(cleaned);
      if (validation.isValid) {
        return { phone: cleaned };
      } else {
        return { error: validation.error };
      }
    }

    // 处理不同国家的手机号格式
    const normalized = this.normalizeByPattern(cleaned);
    if (normalized.error) {
      return normalized;
    }

    // 验证转换后的格式
    const validation = this.validateE164(normalized.phone!);
    if (!validation.isValid) {
      return { error: validation.error };
    }

    return normalized;
  }

  // 清理手机号中的非数字字符（保留+号）
  private cleanPhone(phone: string): string {
    // 保留+号和数字，移除其他字符
    return phone.replace(/[^\d+]/g, '').trim();
  }

  // 根据常见格式模式转换手机号
  private normalizeByPattern(phone: string): { phone?: string; error?: string } {
    // 移除可能的前导0
    phone = phone.replace(/^0+/, '');

    // 英国手机号处理 - 需要优先处理以7开头的英国号码
    if (this.isUKMobileNumber(phone)) {
      return { phone: '+44' + phone };
    }

    // 中国手机号处理
    if (this.isChinaMobileNumber(phone)) {
      return { phone: '+86' + phone };
    }

    // 美国/加拿大手机号处理
    if (this.isNorthAmericaMobileNumber(phone)) {
      return { phone: '+1' + phone };
    }

    // 如果无法识别格式，使用默认国家代码
    if (phone.length >= 7 && phone.length <= 11) {
      // 移除默认国家代码中的+号
      const countryCode = this.defaultCountryCode.replace('+', '');
      return { phone: '+' + countryCode + phone };
    }

    return { error: '无法识别手机号格式' };
  }

  // 判断是否为中国手机号
  private isChinaMobileNumber(phone: string): boolean {
    // 中国手机号：11位数字，以1开头
    if (phone.length === 11 && phone.startsWith('1')) {
      // 验证第二位是否为有效的运营商号码
      const secondDigit = phone.charAt(1);
      const validSecondDigits = ['3', '4', '5', '6', '7', '8', '9'];
      return validSecondDigits.includes(secondDigit);
    }
    return false;
  }

  // 判断是否为北美手机号
  private isNorthAmericaMobileNumber(phone: string): boolean {
    // 北美手机号：10位数字
    if (phone.length === 10) {
      // 第一位不能是0或1
      const firstDigit = phone.charAt(0);
      return firstDigit !== '0' && firstDigit !== '1';
    }
    return false;
  }

  // 判断是否为英国手机号
  private isUKMobileNumber(phone: string): boolean {
    // 英国手机号：去掉国家代码后通常是10-11位，以7开头
    return (phone.length === 10 || phone.length === 11) && phone.startsWith('7');
  }

  // 将E.164格式的手机号转换为用户友好的显示格式
  formatForDisplay(e164Phone: string): string {
    if (!e164Phone) {
      return '';
    }

    // 如果不是E.164格式，直接返回
    if (!e164Phone.startsWith('+')) {
      return e164Phone;
    }

    // 中国手机号格式化
    if (e164Phone.startsWith('+86') && e164Phone.length === 14) {
      const number = e164Phone.slice(3);
      return `+86 ${number.slice(0, 3)} ${number.slice(3, 7)} ${number.slice(7)}`;
    }

    // 美国/加拿大手机号格式化
    if (e164Phone.startsWith('+1') && e164Phone.length === 12) {
      const number = e164Phone.slice(2);
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }

    // 英国手机号格式化
    if (e164Phone.startsWith('+44')) {
      const number = e164Phone.slice(3);
      if (number.length >= 10) {
        return `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
      }
    }

    // 默认格式：国家代码 + 空格 + 号码
    for (let i = 2; i <= 4; i++) {
      if (i < e164Phone.length) {
        const countryCode = e164Phone.slice(0, i);
        const number = e164Phone.slice(i);
        if (this.isValidCountryCode(countryCode)) {
          return `${countryCode} ${number}`;
        }
      }
    }

    return e164Phone;
  }

  // 检查是否为有效的国家代码
  private isValidCountryCode(code: string): boolean {
    // 常见国家代码列表
    const validCodes = [
      '+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36', '+39', '+40',
      '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49', '+51', '+52', '+53', '+54',
      '+55', '+56', '+57', '+58', '+60', '+61', '+62', '+63', '+64', '+65', '+66', '+81',
      '+82', '+84', '+86', '+90', '+91', '+92', '+93', '+94', '+95', '+98',
    ];

    return validCodes.includes(code);
  }

  // 从E.164格式手机号中提取国家代码
  getCountryCode(e164Phone: string): string {
    if (!e164Phone.startsWith('+')) {
      return '';
    }

    // 尝试1-4位国家代码
    for (let i = 2; i <= 5 && i <= e164Phone.length; i++) {
      const countryCode = e164Phone.slice(0, i);
      if (this.isValidCountryCode(countryCode)) {
        return countryCode;
      }
    }

    return '';
  }

  // 检查手机号是否符合指定国家的格式
  isValidPhoneForCountry(phone: string, countryCode: string): boolean {
    if (!phone.startsWith(countryCode)) {
      return false;
    }

    const number = phone.slice(countryCode.length);
    
    switch (countryCode) {
      case '+86':
        // 中国手机号：11位，以1开头
        return number.length === 11 && number.startsWith('1');
      case '+1':
        // 北美手机号：10位
        return number.length === 10;
      case '+44':
        // 英国手机号：10-11位，通常以7开头
        return (number.length === 10 || number.length === 11) && number.startsWith('7');
      default:
        // 其他国家使用基本E.164验证
        return this.validateE164(phone).isValid;
    }
  }
}

// 创建默认实例
export const phoneValidator = new PhoneValidator('+86');

// 工具函数
export const validatePhone = (phone: string) => phoneValidator.validateE164(phone);
export const normalizePhone = (phone: string) => phoneValidator.normalizeToE164(phone);
export const formatPhoneForDisplay = (phone: string) => phoneValidator.formatForDisplay(phone);