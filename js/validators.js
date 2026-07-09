/*=========================================================
نام فایل: validators.js

وظیفه: مجموعه توابع اعتبارسنجی برای ورودی‌های کاربر
شامل: اعتبارسنجی ایمیل، موبایل، کد ملی، رمز عبور، نام کاربری،
URL، تاریخ، و سایر الگوهای رایج

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

/*---------------------------------------------------------
کلاس Validators

وظیفه: ارائه توابع اعتبارسنجی استاتیک

---------------------------------------------------------*/
class Validators {
    /*---------------------------------------------------------
    isEmpty

    وظیفه: بررسی خالی بودن مقدار

    ورودی‌ها: value (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /*---------------------------------------------------------
    isEmail

    وظیفه: اعتبارسنجی آدرس ایمیل

    ورودی‌ها: email (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return pattern.test(email.trim());
    }

    /*---------------------------------------------------------
    isMobile

    وظیفه: اعتبارسنجی شماره موبایل ایران

    ورودی‌ها: mobile (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isMobile(mobile) {
        if (!mobile || typeof mobile !== 'string') return false;
        const cleaned = mobile.trim().replace(/\s/g, '');
        // پشتیبانی از فرمت‌های: 0912xxxxxxx, 912xxxxxxx, +98912xxxxxxx, 0098912xxxxxxx
        const pattern = /^(0|98|\+98|0098)?9[0-9]{9}$/;
        if (!pattern.test(cleaned)) return false;
        // حذف کد کشور و صفر اول
        const normalized = cleaned.replace(/^(\+98|98|0098|0)/, '');
        return normalized.length === 10 && normalized.startsWith('9');
    }

    /*---------------------------------------------------------
    isNationalCode

    وظیفه: اعتبارسنجی کد ملی ایران

    ورودی‌ها: code (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isNationalCode(code) {
        if (!code || typeof code !== 'string') return false;
        const clean = code.trim().replace(/\s/g, '');
        if (clean.length !== 10) return false;
        if (!/^\d{10}$/.test(clean)) return false;

        // ارقام تکراری معتبر نیستند
        const duplicates = ['0000000000', '1111111111', '2222222222', '3333333333',
            '4444444444', '5555555555', '6666666666', '7777777777',
            '8888888888', '9999999999'];
        if (duplicates.includes(clean)) return false;

        // الگوریتم اعتبارسنجی کد ملی
        const digits = clean.split('').map(Number);
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += digits[i] * (10 - i);
        }
        const remainder = sum % 11;
        const controlDigit = digits[9];
        return (remainder < 2 && controlDigit === remainder) ||
               (remainder >= 2 && controlDigit === (11 - remainder));
    }

    /*---------------------------------------------------------
    isPhone

    وظیفه: اعتبارسنجی شماره تلفن ثابت ایران

    ورودی‌ها: phone (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const clean = phone.trim().replace(/\s/g, '');
        // پشتیبانی از فرمت‌های: 021xxxxxxxx, 051xxxxxxxx, 021xxxx, 051xxxx
        const pattern = /^0[1-9]{1,2}[0-9]{7,8}$/;
        return pattern.test(clean);
    }

    /*---------------------------------------------------------
    isUsername

    وظیفه: اعتبارسنجی نام کاربری (۳ تا ۳۰ کاراکتر، حروف و اعداد و خط زیر)

    ورودی‌ها: username (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isUsername(username) {
        if (!username || typeof username !== 'string') return false;
        const clean = username.trim();
        if (clean.length < 3 || clean.length > 30) return false;
        // پشتیبانی از حروف فارسی، انگلیسی، اعداد و خط زیر
        const pattern = /^[a-zA-Z0-9_\u0600-\u06FF]{3,30}$/;
        return pattern.test(clean);
    }

    /*---------------------------------------------------------
    isPassword

    وظیفه: اعتبارسنجی رمز عبور (حداقل ۸ کاراکتر، شامل حرف و عدد)

    ورودی‌ها: password (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isPassword(password) {
        if (!password || typeof password !== 'string') return false;
        if (password.length < 8 || password.length > 64) return false;
        // حداقل یک حرف و یک عدد
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        return hasLetter && hasNumber;
    }

    /*---------------------------------------------------------
    isPasswordStrong

    وظیفه: اعتبارسنجی رمز عبور قوی (حرف بزرگ، حرف کوچک، عدد، کاراکتر خاص)

    ورودی‌ها: password (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isPasswordStrong(password) {
        if (!password || typeof password !== 'string') return false;
        if (password.length < 8 || password.length > 64) return false;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
    }

    /*---------------------------------------------------------
    isURL

    وظیفه: اعتبارسنجی آدرس URL

    ورودی‌ها: url (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isURL(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /*---------------------------------------------------------
    isDate

    وظیفه: اعتبارسنجی تاریخ

    ورودی‌ها: date (string|Date)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isDate(date) {
        if (!date) return false;
        const d = new Date(date);
        return d instanceof Date && !isNaN(d.getTime());
    }

    /*---------------------------------------------------------
    isDateInRange

    وظیفه: بررسی اینکه تاریخ در بازه مشخص است

    ورودی‌ها: date (string|Date), start (string|Date), end (string|Date)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isDateInRange(date, start, end) {
        if (!this.isDate(date)) return false;
        const d = new Date(date);
        if (start && !this.isDate(start)) return false;
        if (end && !this.isDate(end)) return false;
        const startDate = start ? new Date(start) : new Date(0);
        const endDate = end ? new Date(end) : new Date(8640000000000000);
        return d >= startDate && d <= endDate;
    }

    /*---------------------------------------------------------
    isIP

    وظیفه: اعتبارسنجی آدرس IP (ورژن ۴)

    ورودی‌ها: ip (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isIP(ip) {
        if (!ip || typeof ip !== 'string') return false;
        const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!pattern.test(ip)) return false;
        const parts = ip.split('.').map(Number);
        return parts.every(part => part >= 0 && part <= 255);
    }

    /*---------------------------------------------------------
    isIPv6

    وظیفه: اعتبارسنجی آدرس IP (ورژن ۶)

    ورودی‌ها: ip (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isIPv6(ip) {
        if (!ip || typeof ip !== 'string') return false;
        const pattern = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return pattern.test(ip);
    }

    /*---------------------------------------------------------
    isPostalCode

    وظیفه: اعتبارسنجی کد پستی ایران (۱۰ رقمی)

    ورودی‌ها: code (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isPostalCode(code) {
        if (!code || typeof code !== 'string') return false;
        const clean = code.trim().replace(/\s/g, '');
        return /^[0-9]{10}$/.test(clean);
    }

    /*---------------------------------------------------------
    isBankCardNumber

    وظیفه: اعتبارسنجی شماره کارت بانکی (۱۶ رقمی)

    ورودی‌ها: number (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isBankCardNumber(number) {
        if (!number || typeof number !== 'string') return false;
        const clean = number.trim().replace(/\s/g, '');
        if (!/^\d{16}$/.test(clean)) return false;

        // الگوریتم Luhn
        let sum = 0;
        let alternate = false;
        for (let i = clean.length - 1; i >= 0; i--) {
            let n = parseInt(clean[i], 10);
            if (alternate) {
                n *= 2;
                if (n > 9) n = (n % 10) + 1;
            }
            sum += n;
            alternate = !alternate;
        }
        return sum % 10 === 0;
    }

    /*---------------------------------------------------------
    isIBAN

    وظیفه: اعتبارسنجی شماره شبا ایران

    ورودی‌ها: iban (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isIBAN(iban) {
        if (!iban || typeof iban !== 'string') return false;
        const clean = iban.trim().replace(/\s/g, '').toUpperCase();
        // IR + 24 رقم
        if (!/^IR[0-9]{24}$/.test(clean)) return false;

        // الگوریتم اعتبارسنجی شبا (IBAN)
        const rearranged = clean.slice(4) + clean.slice(0, 4);
        const numeric = rearranged.split('').map(c => {
            const code = c.charCodeAt(0);
            if (code >= 65 && code <= 90) {
                return String(code - 55);
            }
            return c;
        }).join('');

        // محاسبه mod 97
        let remainder = 0;
        for (let i = 0; i < numeric.length; i++) {
            remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
        }
        return remainder === 1;
    }

    /*---------------------------------------------------------
    isAge

    وظیفه: بررسی سن در محدوده مشخص

    ورودی‌ها: birthDate (string|Date), minAge (number), maxAge (number)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isAge(birthDate, minAge = 18, maxAge = 100) {
        if (!this.isDate(birthDate)) return false;
        const birth = new Date(birthDate);
        const now = new Date();
        const age = now.getFullYear() - birth.getFullYear();
        const monthDiff = now.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
            return age - 1 >= minAge && age - 1 <= maxAge;
        }
        return age >= minAge && age <= maxAge;
    }

    /*---------------------------------------------------------
    isHexColor

    وظیفه: اعتبارسنجی کد رنگ هگزادسیمال

    ورودی‌ها: color (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isHexColor(color) {
        if (!color || typeof color !== 'string') return false;
        return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color.trim());
    }

    /*---------------------------------------------------------
    isJSON

    وظیفه: اعتبارسنجی رشته JSON

    ورودی‌ها: json (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isJSON(json) {
        if (!json || typeof json !== 'string') return false;
        try {
            JSON.parse(json);
            return true;
        } catch {
            return false;
        }
    }

    /*---------------------------------------------------------
    isObjectId

    وظیفه: اعتبارسنجی شناسه MongoDB (ObjectId)

    ورودی‌ها: id (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isObjectId(id) {
        if (!id || typeof id !== 'string') return false;
        return /^[0-9a-fA-F]{24}$/.test(id.trim());
    }

    /*---------------------------------------------------------
    isUUID

    وظیفه: اعتبارسنجی شناسه UUID (ورژن ۴)

    ورودی‌ها: uuid (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isUUID(uuid) {
        if (!uuid || typeof uuid !== 'string') return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(uuid.trim());
    }

    /*---------------------------------------------------------
    isAlpha

    وظیفه: بررسی اینکه رشته فقط شامل حروف است

    ورودی‌ها: text (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isAlpha(text) {
        if (!text || typeof text !== 'string') return false;
        return /^[a-zA-Z\u0600-\u06FF\s]+$/.test(text.trim());
    }

    /*---------------------------------------------------------
    isAlphaNumeric

    وظیفه: بررسی اینکه رشته فقط شامل حروف و اعداد است

    ورودی‌ها: text (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isAlphaNumeric(text) {
        if (!text || typeof text !== 'string') return false;
        return /^[a-zA-Z0-9\u0600-\u06FF\s]+$/.test(text.trim());
    }

    /*---------------------------------------------------------
    isNumeric

    وظیفه: بررسی اینکه رشته فقط شامل اعداد است

    ورودی‌ها: text (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isNumeric(text) {
        if (!text || typeof text !== 'string') return false;
        return /^[0-9]+$/.test(text.trim());
    }

    /*---------------------------------------------------------
    isInteger

    وظیفه: بررسی اینکه مقدار یک عدد صحیح است

    ورودی‌ها: value (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isInteger(value) {
        return Number.isInteger(value) || (typeof value === 'string' && /^-?\d+$/.test(value.trim()));
    }

    /*---------------------------------------------------------
    isFloat

    وظیفه: بررسی اینکه مقدار یک عدد اعشاری است

    ورودی‌ها: value (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isFloat(value) {
        if (typeof value === 'number') return !Number.isInteger(value);
        if (typeof value === 'string') return /^-?\d+(\.\d+)?$/.test(value.trim());
        return false;
    }

    /*---------------------------------------------------------
    isInRange

    وظیفه: بررسی اینکه عدد در بازه مشخص است

    ورودی‌ها: value (number|string), min (number), max (number)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isInRange(value, min, max) {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return false;
        return num >= min && num <= max;
    }

    /*---------------------------------------------------------
    isLengthInRange

    وظیفه: بررسی اینکه طول رشته در بازه مشخص است

    ورودی‌ها: text (string), min (number), max (number)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isLengthInRange(text, min, max) {
        if (!text || typeof text !== 'string') return false;
        const length = text.trim().length;
        return length >= min && length <= max;
    }

    /*---------------------------------------------------------
    isMatch

    وظیفه: بررسی تطابق دو مقدار

    ورودی‌ها: value1 (any), value2 (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isMatch(value1, value2) {
        return value1 === value2;
    }

    /*---------------------------------------------------------
    validateAll

    وظیفه: اعتبارسنجی چندین فیلد به‌طور همزمان

    ورودی‌ها: fields (object) - { fieldName: { value, validators: [...] } }

    خروجی: object - { isValid: boolean, errors: { fieldName: [errors] } }

    ---------------------------------------------------------*/
    static validateAll(fields) {
        const errors = {};
        let isValid = true;

        for (const [fieldName, config] of Object.entries(fields)) {
            const { value, validators, messages } = config;
            const fieldErrors = [];

            for (const validator of validators) {
                let result;
                if (typeof validator === 'function') {
                    result = validator(value);
                } else if (Array.isArray(validator)) {
                    const [fn, ...args] = validator;
                    result = fn(value, ...args);
                } else {
                    continue;
                }

                if (!result) {
                    const errorMessage = messages?.[fieldErrors.length] || `خطا در ${fieldName}`;
                    fieldErrors.push(errorMessage);
                    isValid = false;
                    break;
                }
            }

            if (fieldErrors.length > 0) {
                errors[fieldName] = fieldErrors;
            }
        }

        return { isValid, errors };
    }

    /*---------------------------------------------------------
    getErrorMessage

    وظیفه: دریافت پیام خطا برای یک اعتبارسنجی خاص

    ورودی‌ها: validator (string|function), fieldName (string)

    خروجی: string

    ---------------------------------------------------------*/
    static getErrorMessage(validator, fieldName = 'فیلد') {
        const messages = {
            isEmail: 'ایمیل وارد شده معتبر نیست.',
            isMobile: 'شماره موبایل وارد شده معتبر نیست.',
            isNationalCode: 'کد ملی وارد شده معتبر نیست.',
            isUsername: 'نام کاربری باید بین ۳ تا ۳۰ کاراکتر و شامل حروف، اعداد یا خط زیر باشد.',
            isPassword: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.',
            isPasswordStrong: 'رمز عبور باید حداقل ۸ کاراکتر، شامل حرف بزرگ، حرف کوچک، عدد و کاراکتر خاص باشد.',
            isURL: 'آدرس وارد شده معتبر نیست.',
            isDate: 'تاریخ وارد شده معتبر نیست.',
            isIP: 'آدرس IP وارد شده معتبر نیست.',
            isPostalCode: 'کد پستی باید ۱۰ رقم باشد.',
            isBankCardNumber: 'شماره کارت وارد شده معتبر نیست.',
            isIBAN: 'شماره شبا وارد شده معتبر نیست.',
            isAge: 'سن وارد شده در محدوده مجاز نیست.',
            isHexColor: 'کد رنگ وارد شده معتبر نیست.',
            isJSON: 'فرمت JSON وارد شده معتبر نیست.',
            isObjectId: 'شناسه وارد شده معتبر نیست.',
            isUUID: 'شناسه UUID وارد شده معتبر نیست.',
            isAlpha: 'فقط حروف مجاز است.',
            isAlphaNumeric: 'فقط حروف و اعداد مجاز است.',
            isNumeric: 'فقط اعداد مجاز است.',
            isInteger: 'عدد صحیح وارد کنید.',
            isFloat: 'عدد اعشاری معتبر وارد کنید.',
            isInRange: 'عدد باید در محدوده مجاز باشد.',
            isLengthInRange: 'طول متن باید در محدوده مجاز باشد.',
            isMatch: 'مقادیر تطابق ندارند.',
        };

        const key = typeof validator === 'function' ? validator.name : validator;
        return messages[key] || `${fieldName} معتبر نیست.`;
    }
}

// ===== صادرات =====
export { Validators };
export default Validators;
export const validators = Validators;