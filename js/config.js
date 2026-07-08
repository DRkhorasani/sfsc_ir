/*=========================================================
نام فایل: config.js

وظیفه: تنظیمات عمومی برنامه شامل آدرس‌های API، کلیدهای برنامه،
تنظیمات پیش‌فرض و ثابت‌های سراسری

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

export const Config = {
    /*---------------------------------------------------------
    تنظیمات اصلی برنامه
    ---------------------------------------------------------*/
    APP: {
        NAME: 'سورنا فناور سینا',
        VERSION: '1.0.0',
        ENV: 'development', // 'development' | 'staging' | 'production'
        DEBUG: true,
        DEFAULT_LANGUAGE: 'fa',
        SUPPORTED_LANGUAGES: ['fa', 'en'],
        DEFAULT_THEME: 'light',
        SUPPORTED_THEMES: ['light', 'dark'],
    },

    /*---------------------------------------------------------
    آدرس‌های API - در صورت اتصال به Backend
    ---------------------------------------------------------*/
    API: {
        BASE_URL: 'https://api.sorenashop.ir/v1',
        ENDPOINTS: {
            AUTH: {
                LOGIN: '/auth/login',
                REGISTER: '/auth/register',
                VERIFY_OTP: '/auth/verify-otp',
                SEND_OTP: '/auth/send-otp',
                LOGOUT: '/auth/logout',
                REFRESH: '/auth/refresh',
                PROFILE: '/auth/profile',
                CHANGE_PASSWORD: '/auth/change-password',
            },
            PRODUCTS: {
                LIST: '/products',
                DETAIL: '/products/:id',
                CATEGORIES: '/products/categories',
                SEARCH: '/products/search',
            },
            SERVICES: {
                LIST: '/services',
                DETAIL: '/services/:id',
                REQUEST: '/services/request',
            },
            NEWS: {
                LIST: '/news',
                DETAIL: '/news/:id',
            },
            FAQ: {
                LIST: '/faq',
            },
            DASHBOARD: {
                DATA: '/dashboard/data',
                STATS: '/dashboard/stats',
                ALERTS: '/dashboard/alerts',
            },
            CART: {
                LIST: '/cart',
                ADD: '/cart/add',
                REMOVE: '/cart/remove',
                UPDATE: '/cart/update',
                CLEAR: '/cart/clear',
                CHECKOUT: '/cart/checkout',
            },
            ORDERS: {
                LIST: '/orders',
                DETAIL: '/orders/:id',
                CREATE: '/orders/create',
                CANCEL: '/orders/:id/cancel',
            },
            CONTACT: {
                SEND: '/contact/send',
            },
            UPLOAD: {
                FILE: '/upload/file',
                IMAGE: '/upload/image',
            },
        },
        TIMEOUT: 30000,
        RETRY_COUNT: 3,
        RETRY_DELAY: 1000,
    },

    /*---------------------------------------------------------
    تنظیمات احراز هویت
    ---------------------------------------------------------*/
    AUTH: {
        TOKEN_KEY: 'access_token',
        REFRESH_TOKEN_KEY: 'refresh_token',
        USER_KEY: 'user',
        REMEMBER_ME_KEY: 'remember_me',
        SESSION_TIMEOUT: 3600, // ثانیه
        OTP_LENGTH: 6,
        OTP_EXPIRE_TIME: 120, // ثانیه
        MIN_PASSWORD_LENGTH: 8,
        MAX_PASSWORD_LENGTH: 64,
    },

    /*---------------------------------------------------------
    تنظیمات ذخیره‌سازی محلی (LocalStorage)
    ---------------------------------------------------------*/
    STORAGE: {
        PREFIX: 'sorena_',
        KEYS: {
            LANGUAGE: 'language',
            THEME: 'theme',
            USER: 'user',
            TOKEN: 'token',
            REFRESH_TOKEN: 'refresh_token',
            CART: 'cart',
            FAVORITES: 'favorites',
            RECENT_PRODUCTS: 'recent_products',
            AUTH_USERS: 'auth_users', // برای شبیه‌سازی
        },
        EXPIRE_TIME: 7 * 24 * 60 * 60 * 1000, // ۷ روز
    },

    /*---------------------------------------------------------
    تنظیمات صفحه‌بندی
    ---------------------------------------------------------*/
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 12,
        MAX_LIMIT: 100,
        SIZES: [6, 12, 24, 48, 96],
        VISIBLE_PAGES: 5,
    },

    /*---------------------------------------------------------
    تنظیمات گالری و تصاویر
    ---------------------------------------------------------*/
    MEDIA: {
        IMAGE_PLACEHOLDER: 'https://via.placeholder.com/400x300?text=No+Image',
        THUMBNAIL_WIDTH: 400,
        THUMBNAIL_HEIGHT: 300,
        GALLERY_IMAGES: [
            '/pics/gallery01.jpg',
            '/pics/gallery02.jpg',
            '/pics/gallery03.jpg',
            '/pics/gallery04.jpg',
            '/pics/gallery05.jpg',
            '/pics/gallery06.jpg',
            '/pics/gallery07.jpg',
            '/pics/gallery08.jpg',
            '/pics/gallery09.jpg',
        ],
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
        MAX_IMAGE_SIZE: 5 * 1024 * 1024, // ۵ مگابایت
    },

    /*---------------------------------------------------------
    تنظیمات فرم‌ها و اعتبارسنجی
    ---------------------------------------------------------*/
    VALIDATION: {
        EMAIL_PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        MOBILE_PATTERN: /^09[0-9]{9}$/,
        USERNAME_PATTERN: /^[a-zA-Z0-9_\u0600-\u06FF]{3,30}$/,
        PASSWORD_MIN_LENGTH: 8,
        PASSWORD_MAX_LENGTH: 64,
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 50,
        MESSAGE_MIN_LENGTH: 5,
        MESSAGE_MAX_LENGTH: 1000,
        OTP_PATTERN: /^[0-9]{6}$/,
    },

    /*---------------------------------------------------------
    تنظیمات پیام‌های سیستمی
    ---------------------------------------------------------*/
    MESSAGES: {
        TOAST_DURATION: 4000, // میلی‌ثانیه
        TOAST_POSITION: 'top-right',
        CONFIRM_DURATION: 5000,
        LOADING_TEXT: 'در حال بارگذاری...',
        NO_DATA_TEXT: 'اطلاعاتی یافت نشد',
        ERROR_TEXT: 'خطایی رخ داده است',
        SUCCESS_TEXT: 'عملیات با موفقیت انجام شد',
    },

    /*---------------------------------------------------------
    تنظیمات تحلیل و آمار (در صورت اتصال)
    ---------------------------------------------------------*/
    ANALYTICS: {
        ENABLED: false,
        PROVIDER: 'google', // 'google' | 'matomo' | 'custom'
        TRACKING_ID: '',
        EVENTS: {
            PAGE_VIEW: 'page_view',
            PRODUCT_VIEW: 'product_view',
            ADD_TO_CART: 'add_to_cart',
            REMOVE_FROM_CART: 'remove_from_cart',
            CHECKOUT: 'checkout',
            PURCHASE: 'purchase',
            SEARCH: 'search',
            CONTACT: 'contact',
        },
    },

    /*---------------------------------------------------------
    تنظیمات شبیه‌سازی (Mock) - در صورت عدم وجود Backend واقعی
    ---------------------------------------------------------*/
    MOCK: {
        ENABLED: true,
        DELAY: 500, // میلی‌ثانیه تاخیر شبیه‌سازی
        ERROR_RATE: 0.05, // احتمال خطا (۵٪)
        SEED: 12345, // برای داده‌های تصادفی قابل تکرار
    },

    /*---------------------------------------------------------
    تنظیمات کش
    ---------------------------------------------------------*/
    CACHE: {
        ENABLED: true,
        TTL: 5 * 60 * 1000, // ۵ دقیقه
        MAX_ITEMS: 100,
        STORAGE: 'memory', // 'memory' | 'localStorage' | 'sessionStorage'
    },

    /*---------------------------------------------------------
    تنظیمات لاگ
    ---------------------------------------------------------*/
    LOGGING: {
        ENABLED: true,
        LEVEL: 'debug', // 'debug' | 'info' | 'warn' | 'error' | 'none'
        OUTPUT: 'console', // 'console' | 'file' | 'remote'
        REMOTE_URL: '',
    },

    /*---------------------------------------------------------
    تنظیمات مربوط به قالب و ظاهر
    ---------------------------------------------------------*/
    THEME: {
        COLORS: {
            primary: '#2563eb',
            secondary: '#0ea5e9',
            accent: '#38bdf8',
            success: '#22c55e',
            warning: '#eab308',
            danger: '#ef4444',
            info: '#06b6d4',
        },
        FONTS: {
            primary: "'Vazirmatn', sans-serif",
            fallback: 'sans-serif',
        },
        BREAKPOINTS: {
            xs: 480,
            sm: 576,
            md: 768,
            lg: 992,
            xl: 1200,
            xxl: 1400,
        },
        RTL_LANGUAGES: ['fa', 'ar', 'he', 'ur'],
    },

    /*---------------------------------------------------------
    تنظیمات سرویس‌های خارجی (External APIs)
    ---------------------------------------------------------*/
    EXTERNAL_APIS: {
        DEEPSEEK: {
            ENABLED: false,
            API_KEY: '', // بدون آن را در .env فایل قرار دهید
            API_URL: 'https://api.deepseek.com/v1',
            MODEL: 'deepseek-chat',
            TIMEOUT: 60000, // میلی‌ثانیه
            MAX_TOKENS: 2000,
            TEMPERATURE: 0.7,
            TOP_P: 0.9,
            RETRY_COUNT: 3,
            RETRY_DELAY: 1000,
        },
    },

    /*---------------------------------------------------------
    متدهای کمکی پیکربندی
    ---------------------------------------------------------*/
    /*---------------------------------------------------------
    isRTL

    وظیفه: بررسی اینکه آیا زبان فعلی راست‌چین است یا خیر

    ورودی‌ها: lang (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    isRTL(lang) {
        return this.THEME.RTL_LANGUAGES.includes(lang || this.APP.DEFAULT_LANGUAGE);
    },

    /*---------------------------------------------------------
    getApiUrl

    وظیفه: ساخت آدرس کامل API از روی نام endpoint

    ورودی‌ها: endpoint (string), params (object)

    خروجی: string

    ---------------------------------------------------------*/
    getApiUrl(endpoint, params = {}) {
        let url = `${this.API.BASE_URL}${endpoint}`;
        // جایگزینی پارامترهای مسیر
        Object.keys(params).forEach(key => {
            if (url.includes(`:${key}`)) {
                url = url.replace(`:${key}`, encodeURIComponent(params[key]));
                delete params[key];
            }
        });
        // افزودن query string
        const query = new URLSearchParams(params);
        if (query.toString()) {
            url += (url.includes('?') ? '&' : '?') + query.toString();
        }
        return url;
    },

    /*---------------------------------------------------------
    getStorageKey

    وظیفه: ساخت کلید ذخیره‌سازی با پیشوند برنامه

    ورودی‌ها: key (string)

    خروجی: string

    ---------------------------------------------------------*/
    getStorageKey(key) {
        return `${this.STORAGE.PREFIX}${key}`;
    },

    /*---------------------------------------------------------
    isProduction

    وظیفه: بررسی اینکه برنامه در حالت Production اجرا می‌شود

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    isProduction() {
        return this.APP.ENV === 'production';
    },

    /*---------------------------------------------------------
    isDevelopment

    وظیفه: بررسی اینکه برنامه در حالت Development اجرا می‌شود

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    isDevelopment() {
        return this.APP.ENV === 'development';
    },

    /*---------------------------------------------------------
    getBreakpoint

    وظیفه: دریافت نام breakpoint بر اساس عرض صفحه

    ورودی‌ها: width (number)

    خروجی: string

    ---------------------------------------------------------*/
    getBreakpoint(width = window.innerWidth) {
        const bp = this.THEME.BREAKPOINTS;
        if (width < bp.xs) return 'xs';
        if (width < bp.sm) return 'sm';
        if (width < bp.md) return 'md';
        if (width < bp.lg) return 'lg';
        if (width < bp.xl) return 'xl';
        return 'xxl';
    },
};

// ===== ثابت‌های اضافی که ممکن است در بخش‌های مختلف استفاده شوند =====
export const APP_NAME = Config.APP.NAME;
export const APP_VERSION = Config.APP.VERSION;
export const DEFAULT_LANG = Config.APP.DEFAULT_LANGUAGE;
export const SUPPORTED_LANGS = Config.APP.SUPPORTED_LANGUAGES;
export const API_BASE = Config.API.BASE_URL;
export const STORAGE_PREFIX = Config.STORAGE.PREFIX;

// ===== فریز کردن شی Config برای جلوگیری از تغییرات意外ی =====
Object.freeze(Config);
Object.freeze(Config.APP);
Object.freeze(Config.API);
Object.freeze(Config.API.ENDPOINTS);
Object.freeze(Config.AUTH);
Object.freeze(Config.STORAGE);
Object.freeze(Config.PAGINATION);
Object.freeze(Config.MEDIA);
Object.freeze(Config.VALIDATION);
Object.freeze(Config.MESSAGES);
Object.freeze(Config.ANALYTICS);
Object.freeze(Config.MOCK);
Object.freeze(Config.CACHE);
Object.freeze(Config.LOGGING);
Object.freeze(Config.EXTERNAL_APIS);
Object.freeze(Config.EXTERNAL_APIS.DEEPSEEK);
Object.freeze(Config.THEME);
Object.freeze(Config.THEME.COLORS);
Object.freeze(Config.THEME.BREAKPOINTS);
Object.freeze(Config.THEME.RTL_LANGUAGES);

export default Config;