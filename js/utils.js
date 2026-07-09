/*=========================================================
نام فایل: utils.js

وظیفه: مجموعه توابع کمکی عمومی برای استفاده در سراسر برنامه
شامل: دبونس، تروتل، تولید شناسه، فرمت‌سازی تاریخ و قیمت،
کپی در کلیپ‌بورد، دانلود فایل، سانی‌تایز HTML، و سایر ابزارها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

/*---------------------------------------------------------
کلاس Utils

وظیفه: ارائه توابع کمکی استاتیک

---------------------------------------------------------*/
class Utils {
    /*---------------------------------------------------------
    debounce

    وظیفه: اجرای تابع پس از توقف فراخوانی برای مدت مشخص

    ورودی‌ها: func (function), wait (number), immediate (boolean)

    خروجی: function (debounced)

    ---------------------------------------------------------*/
    static debounce(func, wait = 300, immediate = false) {
        let timeout;

        return function executedFunction(...args) {
            const context = this;

            const later = () => {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };

            const callNow = immediate && !timeout;

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);

            if (callNow) func.apply(context, args);
        };
    }

    /*---------------------------------------------------------
    throttle

    وظیفه: محدود کردن تعداد دفعات اجرای تابع در بازه زمانی مشخص

    ورودی‌ها: func (function), limit (number)

    خروجی: function (throttled)

    ---------------------------------------------------------*/
    static throttle(func, limit = 300) {
        let inThrottle;
        let lastFunc;
        let lastRan;

        return function executedFunction(...args) {
            const context = this;

            if (!inThrottle) {
                func.apply(context, args);
                lastRan = Date.now();
                inThrottle = true;
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if (Date.now() - lastRan >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    /*---------------------------------------------------------
    generateId

    وظیفه: تولید شناسه یکتا (UUID v4)

    ورودی‌ها: none

    خروجی: string (UUID)

    ---------------------------------------------------------*/
    static generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /*---------------------------------------------------------
    generateShortId

    وظیفه: تولید شناسه کوتاه (۸ کاراکتری)

    ورودی‌ها: length (number)

    خروجی: string

    ---------------------------------------------------------*/
    static generateShortId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /*---------------------------------------------------------
    formatDate

    وظیفه: فرمت‌سازی تاریخ به شکل قابل خواندن

    ورودی‌ها: date (Date|string|number), locale (string)

    خروجی: string

    ---------------------------------------------------------*/
    static formatDate(date, locale = 'fa-IR') {
        if (!date) return '';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (error) {
            console.warn('⚠️ خطا در فرمت‌سازی تاریخ:', error);
            return '';
        }
    }

    /*---------------------------------------------------------
    formatDateTime

    وظیفه: فرمت‌سازی تاریخ و زمان

    ورودی‌ها: date (Date|string|number), locale (string)

    خروجی: string

    ---------------------------------------------------------*/
    static formatDateTime(date, locale = 'fa-IR') {
        if (!date) return '';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (error) {
            console.warn('⚠️ خطا در فرمت‌سازی تاریخ و زمان:', error);
            return '';
        }
    }

    /*---------------------------------------------------------
    formatPrice

    وظیفه: فرمت‌سازی قیمت با جداکننده هزارگان

    ورودی‌ها: price (number|string), currency (string)

    خروجی: string

    ---------------------------------------------------------*/
    static formatPrice(price, currency = 'تومان') {
        if (price === undefined || price === null) return '0 تومان';
        try {
            const num = typeof price === 'string' ? parseInt(price.replace(/[^0-9]/g, ''), 10) : price;
            if (isNaN(num)) return '0 تومان';
            return num.toLocaleString('fa-IR') + ' ' + currency;
        } catch (error) {
            console.warn('⚠️ خطا در فرمت‌سازی قیمت:', error);
            return String(price);
        }
    }

    /*---------------------------------------------------------
    truncate

    وظیفه: برش متن با تعداد کاراکتر مشخص و افزودن ...

    ورودی‌ها: text (string), maxLength (number)

    خروجی: string

    ---------------------------------------------------------*/
    static truncate(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /*---------------------------------------------------------
    sanitizeHTML

    وظیفه: پاکسازی HTML برای جلوگیری از XSS

    ورودی‌ها: html (string)

    خروجی: string (پاکسازی شده)

    ---------------------------------------------------------*/
    static sanitizeHTML(html) {
        if (!html) return '';
        // حذف تگ‌های خطرناک
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'blockquote', 'pre', 'code'];
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
        const nodesToRemove = [];
        let node = walker.nextNode();
        while (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                if (!allowedTags.includes(tagName)) {
                    nodesToRemove.push(node);
                }
                // حذف event handlers
                Array.from(node.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        node.removeAttribute(attr.name);
                    }
                });
            }
            node = walker.nextNode();
        }
        nodesToRemove.forEach(n => n.parentNode?.removeChild(n));
        return doc.body.innerHTML;
    }

    /*---------------------------------------------------------
    escapeHTML

    وظیفه: Escape کردن کاراکترهای خاص HTML

    ورودی‌ها: text (string)

    خروجی: string

    ---------------------------------------------------------*/
    static escapeHTML(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /*---------------------------------------------------------
    unescapeHTML

    وظیفه: برگرداندن کاراکترهای escape شده به حالت عادی

    ورودی‌ها: text (string)

    خروجی: string

    ---------------------------------------------------------*/
    static unescapeHTML(text) {
        if (!text) return '';
        const map = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#039;': "'",
        };
        return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (m) => map[m]);
    }

    /*---------------------------------------------------------
    copyToClipboard

    وظیفه: کپی متن در کلیپ‌بورد

    ورودی‌ها: text (string)

    خروجی: Promise<boolean>

    ---------------------------------------------------------*/
    static async copyToClipboard(text) {
        if (!text) return false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            // Fallback برای مرورگرهای قدیمی
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (error) {
            console.error('❌ خطا در کپی به کلیپ‌بورد:', error);
            return false;
        }
    }

    /*---------------------------------------------------------
    downloadFile

    وظیفه: دانلود فایل از طریق URL یا محتوای متنی

    ورودی‌ها: url (string), filename (string), content (string)

    خروجی: void

    ---------------------------------------------------------*/
    static downloadFile(url, filename = 'download', content = null) {
        try {
            if (content) {
                // دانلود محتوای متنی
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } else if (url) {
                // دانلود از URL
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('❌ خطا در دانلود فایل:', error);
        }
    }

    /*---------------------------------------------------------
    downloadJSON

    وظیفه: دانلود داده به صورت فایل JSON

    ورودی‌ها: data (any), filename (string)

    خروجی: void

    ---------------------------------------------------------*/
    static downloadJSON(data, filename = 'data.json') {
        try {
            const json = JSON.stringify(data, null, 2);
            this.downloadFile(null, filename, json);
        } catch (error) {
            console.error('❌ خطا در دانلود JSON:', error);
        }
    }

    /*---------------------------------------------------------
    sleep

    وظیفه: توقف اجرا برای مدت مشخص (Promise-based)

    ورودی‌ها: ms (number)

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /*---------------------------------------------------------
    debouncePromise

    وظیفه: دبونس برای Promise

    ورودی‌ها: func (function), wait (number)

    خروجی: function (debounced)

    ---------------------------------------------------------*/
    static debouncePromise(func, wait = 300) {
        let timeout;
        let resolveList = [];
        let rejectList = [];

        return function executedFunction(...args) {
            return new Promise((resolve, reject) => {
                const context = this;

                resolveList.push(resolve);
                rejectList.push(reject);

                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const currentResolve = resolveList;
                    const currentReject = rejectList;
                    resolveList = [];
                    rejectList = [];

                    try {
                        const result = func.apply(context, args);
                        Promise.resolve(result).then(
                            (value) => currentResolve.forEach(r => r(value)),
                            (error) => currentReject.forEach(r => r(error))
                        );
                    } catch (error) {
                        currentReject.forEach(r => r(error));
                    }
                }, wait);
            });
        };
    }

    /*---------------------------------------------------------
    retry

    وظیفه: اجرای مجدد تابع در صورت شکست

    ورودی‌ها: fn (function), retries (number), delay (number)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    static async retry(fn, retries = 3, delay = 1000) {
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < retries - 1) {
                    await this.sleep(delay * (i + 1));
                }
            }
        }
        throw lastError;
    }

    /*---------------------------------------------------------
    deepClone

    وظیفه: کپی عمیق از یک شیء

    ورودی‌ها: obj (any)

    خروجی: any

    ---------------------------------------------------------*/
    static deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.warn('⚠️ خطا در کپی عمیق:', error);
            return obj;
        }
    }

    /*---------------------------------------------------------
    deepMerge

    وظیفه: ادغام عمیق دو شیء

    ورودی‌ها: target (object), source (object)

    خروجی: object

    ---------------------------------------------------------*/
    static deepMerge(target, source) {
        const result = this.deepClone(target);
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }

    /*---------------------------------------------------------
    isEmpty

    وظیفه: بررسی خالی بودن مقدار (null, undefined, [], {}, '')

    ورودی‌ها: value (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        if (Array.isArray(value) && value.length === 0) return true;
        if (typeof value === 'object' && Object.keys(value).length === 0) return true;
        return false;
    }

    /*---------------------------------------------------------
    isObject

    وظیفه: بررسی شیء بودن مقدار

    ورودی‌ها: value (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /*---------------------------------------------------------
    isFunction

    وظیفه: بررسی تابع بودن مقدار

    ورودی‌ها: value (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isFunction(value) {
        return typeof value === 'function';
    }

    /*---------------------------------------------------------
    isPromise

    وظیفه: بررسی Promise بودن مقدار

    ورودی‌ها: value (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    static isPromise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }

    /*---------------------------------------------------------
    getQueryParam

    وظیفه: دریافت پارامتر از URL

    ورودی‌ها: key (string), url (string)

    خروجی: string|null

    ---------------------------------------------------------*/
    static getQueryParam(key, url = window.location.search) {
        const params = new URLSearchParams(url);
        return params.get(key);
    }

    /*---------------------------------------------------------
    getQueryParams

    وظیفه: دریافت تمام پارامترهای URL

    ورودی‌ها: url (string)

    خروجی: object

    ---------------------------------------------------------*/
    static getQueryParams(url = window.location.search) {
        const params = new URLSearchParams(url);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    /*---------------------------------------------------------
    buildQueryString

    وظیفه: ساخت رشته query از شیء پارامترها

    ورودی‌ها: params (object)

    خروجی: string

    ---------------------------------------------------------*/
    static buildQueryString(params) {
        if (!params || typeof params !== 'object') return '';
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        }
        return searchParams.toString();
    }

    /*---------------------------------------------------------
    getBaseURL

    وظیفه: دریافت آدرس پایه سایت

    ورودی‌ها: none

    خروجی: string

    ---------------------------------------------------------*/
    static getBaseURL() {
        return window.location.origin;
    }

    /*---------------------------------------------------------
    getCurrentURL

    وظیفه: دریافت آدرس کامل صفحه فعلی

    ورودی‌ها: withQuery (boolean)

    خروجی: string

    ---------------------------------------------------------*/
    static getCurrentURL(withQuery = true) {
        const { origin, pathname, search, hash } = window.location;
        let url = origin + pathname;
        if (withQuery && search) url += search;
        if (withQuery && hash) url += hash;
        return url;
    }

    /*---------------------------------------------------------
    removeDiacritics

    وظیفه: حذف اعراب از متن (برای جستجو)

    ورودی‌ها: text (string)

    خروجی: string

    ---------------------------------------------------------*/
    static removeDiacritics(text) {
        if (!text) return '';
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /*---------------------------------------------------------
    slugify

    وظیفه: تبدیل متن به slug مناسب برای URL

    ورودی‌ها: text (string)

    خروجی: string

    ---------------------------------------------------------*/
    static slugify(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '-');
    }

    /*---------------------------------------------------------
    randomBetween

    وظیفه: تولید عدد تصادفی بین دو مقدار

    ورودی‌ها: min (number), max (number)

    خروجی: number

    ---------------------------------------------------------*/
    static randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /*---------------------------------------------------------
    shuffleArray

    وظیفه: تصادفی‌سازی آرایه (Fisher-Yates)

    ورودی‌ها: array (array)

    خروجی: array (جدید)

    ---------------------------------------------------------*/
    static shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /*---------------------------------------------------------
    groupBy

    وظیفه: گروه‌بندی آرایه بر اساس کلید

    ورودی‌ها: array (array), key (string|function)

    خروجی: object

    ---------------------------------------------------------*/
    static groupBy(array, key) {
        if (!Array.isArray(array)) return {};
        return array.reduce((result, item) => {
            const groupKey = typeof key === 'function' ? key(item) : item[key];
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(item);
            return result;
        }, {});
    }

    /*---------------------------------------------------------
    unique

    وظیفه: حذف المان‌های تکراری از آرایه

    ورودی‌ها: array (array), key (string|null)

    خروجی: array

    ---------------------------------------------------------*/
    static unique(array, key = null) {
        if (!Array.isArray(array)) return [];
        if (!key) {
            return [...new Set(array)];
        }
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        });
    }

    /*---------------------------------------------------------
    debounce (نسخه غیراستاتیک برای استفاده آسان)

    وظیفه: ایجاد تابع دبونس شده

    ورودی‌ها: func (function), wait (number)

    خروجی: function

    ---------------------------------------------------------*/
    static debounce = Utils.debounce;

    /*---------------------------------------------------------
    throttle (نسخه غیراستاتیک برای استفاده آسان)

    وظیفه: ایجاد تابع تروتل شده

    ورودی‌ها: func (function), limit (number)

    خروجی: function

    ---------------------------------------------------------*/
    static throttle = Utils.throttle;

    /*---------------------------------------------------------
    toast

    وظیفه: نمایش پیام اعلان (Notification)

    ورودی‌ها: message (string), type (string), duration (number)

    خروجی: void

    ---------------------------------------------------------*/
    static toast(message, type = 'info', duration = 4000) {
        // استفاده از سیستم toast موجود در برنامه
        // اگر toast سیستم موجود نبود، از alert ساده استفاده می‌شود
        try {
            const event = new CustomEvent('showToast', {
                detail: { message, type, duration }
            });
            document.dispatchEvent(event);
        } catch (error) {
            // Fallback: نمایش با console
            console.log(`[${type.toUpperCase()}] ${message}`);
            // در صورت نیاز، می‌توان از alert استفاده کرد
            // alert(message);
        }
    }
}

// ===== صادرات =====
export { Utils };
export const utils = Utils;
export default Utils;