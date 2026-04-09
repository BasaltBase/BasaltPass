// phone numbertranslatedandtranslated
export class PhoneValidator {
  private defaultCountryCode: string;

  constructor(defaultCountryCode: string = '+86') {
    this.defaultCountryCode = defaultCountryCode;
  }

  // translatedE.164translatedphone number
  validateE164(phone: string): { isValid: boolean; error?: string } {
    if (!phone) {
      return { isValid: false, error: 'phone numberrequired' };
    }

    // E.164translated：translated+translated，translated1-15translated，translated7-16translated
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    
    if (!e164Regex.test(phone)) {
      return { 
        isValid: false, 
        error: 'phone formattranslated，translated（translated：+8613812345678）' 
      };
    }

    return { isValid: true };
  }

  // translatedphone numbertranslatedE.164translated
  normalizeToE164(phone: string): { phone?: string; error?: string } {
    if (!phone) {
      return { error: 'phone numberrequired' };
    }

    // translated、translated
    const cleaned = this.cleanPhone(phone);
    
    // translatedalreadytranslatedisE.164translated，translatedback
    if (cleaned.startsWith('+')) {
      const validation = this.validateE164(cleaned);
      if (validation.isValid) {
        return { phone: cleaned };
      } else {
        return { error: validation.error };
      }
    }

    // translatedphone format
    const normalized = this.normalizeByPattern(cleaned);
    if (normalized.error) {
      return normalized;
    }

    // translated
    const validation = this.validateE164(normalized.phone!);
    if (!validation.isValid) {
      return { error: validation.error };
    }

    return normalized;
  }

  // translatedphone numbertranslated（translated+translated）
  private cleanPhone(phone: string): string {
    // translated+translatedandtranslated，translated
    return phone.replace(/[^\d+]/g, '').trim();
  }

  // translatedphone number
  private normalizeByPattern(phone: string): { phone?: string; error?: string } {
    // translatedcantranslated0
    phone = phone.replace(/^0+/, '');

    // translatedphone numbertranslated - translated7translated
    if (this.isUKMobileNumber(phone)) {
      return { phone: '+44' + phone };
    }

    // translatedphone numbertranslated
    if (this.isChinaMobileNumber(phone)) {
      return { phone: '+86' + phone };
    }

    // translated/translatedphone numbertranslated
    if (this.isNorthAmericaMobileNumber(phone)) {
      return { phone: '+1' + phone };
    }

    // translatednonetranslated，translateddefaulttranslated
    if (phone.length >= 7 && phone.length <= 11) {
      // translateddefaulttranslated+translated
      const countryCode = this.defaultCountryCode.replace('+', '');
      return { phone: '+' + countryCode + phone };
    }

    return { error: 'nonetranslatedphone format' };
  }

  // translatedisnotranslatedphone number
  private isChinaMobileNumber(phone: string): boolean {
    // translatedphone number：11translated，translated1translated
    if (phone.length === 11 && phone.startsWith('1')) {
      // translatedisnotranslatedhastranslated
      const secondDigit = phone.charAt(1);
      const validSecondDigits = ['3', '4', '5', '6', '7', '8', '9'];
      return validSecondDigits.includes(secondDigit);
    }
    return false;
  }

  // translatedisnotranslatedphone number
  private isNorthAmericaMobileNumber(phone: string): boolean {
    // translatedphone number：10translated
    if (phone.length === 10) {
      // translatedis0or1
      const firstDigit = phone.charAt(0);
      return firstDigit !== '0' && firstDigit !== '1';
    }
    return false;
  }

  // translatedisnotranslatedphone number
  private isUKMobileNumber(phone: string): boolean {
    // translatedphone number：translatedis10-11translated，translated7translated
    return (phone.length === 10 || phone.length === 11) && phone.startsWith('7');
  }

  // translatedE.164translatedphone numbertranslatedusertranslated
  formatForDisplay(e164Phone: string): string {
    if (!e164Phone) {
      return '';
    }

    // translatedisE.164translated，translatedback
    if (!e164Phone.startsWith('+')) {
      return e164Phone;
    }

    // translatedphone formattranslated
    if (e164Phone.startsWith('+86') && e164Phone.length === 14) {
      const number = e164Phone.slice(3);
      return `+86 ${number.slice(0, 3)} ${number.slice(3, 7)} ${number.slice(7)}`;
    }

    // translated/translatedphone formattranslated
    if (e164Phone.startsWith('+1') && e164Phone.length === 12) {
      const number = e164Phone.slice(2);
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }

    // translatedphone formattranslated
    if (e164Phone.startsWith('+44')) {
      const number = e164Phone.slice(3);
      if (number.length >= 10) {
        return `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
      }
    }

    // defaulttranslated：translated + translated + translated
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

  // translatedisnotranslatedhastranslated
  private isValidCountryCode(code: string): boolean {
    // translatedlist
    const validCodes = [
      '+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36', '+39', '+40',
      '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49', '+51', '+52', '+53', '+54',
      '+55', '+56', '+57', '+58', '+60', '+61', '+62', '+63', '+64', '+65', '+66', '+81',
      '+82', '+84', '+86', '+90', '+91', '+92', '+93', '+94', '+95', '+98',
    ];

    return validCodes.includes(code);
  }

  // translatedE.164translatedphone numbertranslated
  getCountryCode(e164Phone: string): string {
    if (!e164Phone.startsWith('+')) {
      return '';
    }

    // translated1-4translated
    for (let i = 2; i <= 5 && i <= e164Phone.length; i++) {
      const countryCode = e164Phone.slice(0, i);
      if (this.isValidCountryCode(countryCode)) {
        return countryCode;
      }
    }

    return '';
  }

  // translatedphone numberisnotranslated
  isValidPhoneForCountry(phone: string, countryCode: string): boolean {
    if (!phone.startsWith(countryCode)) {
      return false;
    }

    const number = phone.slice(countryCode.length);
    
    switch (countryCode) {
      case '+86':
        // translatedphone number：11translated，translated1translated
        return number.length === 11 && number.startsWith('1');
      case '+1':
        // translatedphone number：10translated
        return number.length === 10;
      case '+44':
        // translatedphone number：10-11translated，translated7translated
        return (number.length === 10 || number.length === 11) && number.startsWith('7');
      default:
        // translatedE.164translated
        return this.validateE164(phone).isValid;
    }
  }
}

// createdefaulttranslated
export const phoneValidator = new PhoneValidator('+86');

// translated
export const validatePhone = (phone: string) => phoneValidator.validateE164(phone);
export const normalizePhone = (phone: string) => phoneValidator.normalizeToE164(phone);
export const formatPhoneForDisplay = (phone: string) => phoneValidator.formatForDisplay(phone);