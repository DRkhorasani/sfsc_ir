/*=========================================================
نام فایل: storage.js

وظیفه: مدیریت تمام دسترسی‌ها به LocalStorage و SessionStorage
با قابلیت ذخیره‌سازی، بازیابی، حذف، بررسی وجود،
انقضای داده و مدیریت خطاها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { Config } from './config.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس StorageManager

وظیفه: مدیریت ذخیره‌سازی محلی با پشتیبانی از LocalStorage و SessionStorage

---------------------------------------------------------*/
class StorageManager {
    constructor() {
        this._prefix = Config.STORAGE.PREFIX || 'sorena_';
        this._defaultTTL = Config.STORAGE.EXPIRE_TIME || 7 * 24 * 60 * 60 * 1000; // ۷ روز
        this._storage = window.localStorage;
        this._session = window.sessionStorage;
        this._memoryCache = new Map();
        this._cacheEnabled = true;
    }

    /*---------------------------------------------------------
    متد _getKey

    وظیفه: ساخت کلید کامل با پیشوند

    ورودی‌ها: key (string)

    خروجی: string

    ---------------------------------------------------------*/
    _getKey(key) {
        return `${this._prefix}${key}`;
    }

    /*---------------------------------------------------------
    متد _isValid

    وظیفه: اعتبارسنجی کلید و مقدار

    ورودی‌ها: key (string), value (any)

    خروجی: boolean

    ---------------------------------------------------------*/
    _isValid(key, value = null) {
        if (!key || typeof key !== 'string') {
            console.warn('⚠️ کلید نامعتبر:', key);
            return false;
        }
        if (key.length === 0) {
            console.warn('⚠️ کلید نمی‌تواند خالی باشد.');
            return false;
        }
        return true;
    }

    /*---------------------------------------------------------
    متد _serialize

    وظیفه: تبدیل داده به رشته JSON با اطلاعات اضافی (انقضا)

    ورودی‌ها: value (any), ttl (number|null)

    خروجی: string

    ---------------------------------------------------------*/
    _serialize(value, ttl = null) {
        try {
            const data = {
                value: value,
                timestamp: Date.now(),
                ttl: ttl || this._defaultTTL,
            };
            return JSON.stringify(data);
        } catch (error) {
            console.error('❌ خطا در سریالایز کردن داده:', error);
            return JSON.stringify({ value: null, timestamp: Date.now(), ttl: 0 });
        }
    }

    /*---------------------------------------------------------
    متد _deserialize

    وظیفه: تبدیل رشته JSON به داده و بررسی انقضا

    ورودی‌ها: data (string)

    خروجی: any|null

    ---------------------------------------------------------*/
    _deserialize(data) {
        if (!data || typeof data !== 'string') return null;

        try {
            const parsed = JSON.parse(data);

            // بررسی ساختار داده
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }

            // بررسی انقضا
            if (parsed.ttl && parsed.ttl > 0) {
                const age = Date.now() - parsed.timestamp;
                if (age > parsed.ttl) {
                    // داده منقضی شده است
                    return null;
                }
            }

            return parsed.value;
        } catch (error) {
            console.error('❌ خطا در دسریالایز کردن داده:', error);
            return null;
        }
    }

    /*---------------------------------------------------------
    متد set

    وظیفه: ذخیره داده در LocalStorage

    ورودی‌ها: key (string), value (any), ttl (number|null)

    خروجی: boolean (موفقیت عملیات)

    ---------------------------------------------------------*/
    set(key, value, ttl = null) {
        if (!this._isValid(key)) return false;

        try {
            const fullKey = this._getKey(key);
            const serialized = this._serialize(value, ttl);
            this._storage.setItem(fullKey, serialized);

            // به‌روزرسانی کش
            if (this._cacheEnabled) {
                this._memoryCache.set(key, {
                    value: value,
                    timestamp: Date.now(),
                    ttl: ttl || this._defaultTTL,
                });
            }

            return true;
        } catch (error) {
            console.error(`❌ خطا در ذخیره کلید "${key}":`, error);
            // تلاش برای ذخیره در SessionStorage در صورت پر بودن LocalStorage
            try {
                this._session.setItem(this._getKey(key), this._serialize(value, ttl));
                return true;
            } catch (sessionError) {
                console.error(`❌ خطا در ذخیره کلید "${key}" در SessionStorage:`, sessionError);
                return false;
            }
        }
    }

    /*---------------------------------------------------------
    متد get

    وظیفه: بازیابی داده از LocalStorage

    ورودی‌ها: key (string), defaultValue (any)

    خروجی: any

    ---------------------------------------------------------*/
    get(key, defaultValue = null) {
        if (!this._isValid(key)) return defaultValue;

        // بررسی کش
        if (this._cacheEnabled && this._memoryCache.has(key)) {
            const cached = this._memoryCache.get(key);
            // بررسی انقضای کش
            if (cached.ttl && cached.ttl > 0) {
                const age = Date.now() - cached.timestamp;
                if (age < cached.ttl) {
                    return cached.value;
                }
                // کش منقضی شده است
                this._memoryCache.delete(key);
            } else {
                return cached.value;
            }
        }

        try {
            const fullKey = this._getKey(key);
            let data = this._storage.getItem(fullKey);

            // اگر در LocalStorage نبود، در SessionStorage جستجو می‌شود
            if (!data) {
                data = this._session.getItem(fullKey);
            }

            if (!data) {
                return defaultValue;
            }

            const value = this._deserialize(data);

            // اگر داده منقضی شده باشد، حذف می‌شود
            if (value === null) {
                this.remove(key);
                return defaultValue;
            }

            // به‌روزرسانی کش
            if (this._cacheEnabled) {
                // برای محاسبه ttl، باید داده اصلی را داشته باشیم
                try {
                    const parsed = JSON.parse(data);
                    this._memoryCache.set(key, {
                        value: value,
                        timestamp: parsed.timestamp || Date.now(),
                        ttl: parsed.ttl || this._defaultTTL,
                    });
                } catch {
                    this._memoryCache.set(key, {
                        value: value,
                        timestamp: Date.now(),
                        ttl: this._defaultTTL,
                    });
                }
            }

            return value;
        } catch (error) {
            console.error(`❌ خطا در بازیابی کلید "${key}":`, error);
            return defaultValue;
        }
    }

    /*---------------------------------------------------------
    متد remove

    وظیفه: حذف داده از LocalStorage

    ورودی‌ها: key (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    remove(key) {
        if (!this._isValid(key)) return false;

        try {
            const fullKey = this._getKey(key);
            this._storage.removeItem(fullKey);
            this._session.removeItem(fullKey);
            this._memoryCache.delete(key);
            return true;
        } catch (error) {
            console.error(`❌ خطا در حذف کلید "${key}":`, error);
            return false;
        }
    }

    /*---------------------------------------------------------
    متد clear

    وظیفه: حذف تمام داده‌های مرتبط با برنامه

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    clear() {
        try {
            const keysToRemove = [];
            // پیدا کردن کلیدهای مرتبط با برنامه
            for (let i = 0; i < this._storage.length; i++) {
                const key = this._storage.key(i);
                if (key && key.startsWith(this._prefix)) {
                    keysToRemove.push(key);
                }
            }
            // حذف کلیدها
            keysToRemove.forEach(key => this._storage.removeItem(key));

            // پاکسازی SessionStorage
            for (let i = 0; i < this._session.length; i++) {
                const key = this._session.key(i);
                if (key && key.startsWith(this._prefix)) {
                    this._session.removeItem(key);
                }
            }

            // پاکسازی کش
            this._memoryCache.clear();
            return true;
        } catch (error) {
            console.error('❌ خطا در پاکسازی داده‌ها:', error);
            return false;
        }
    }

    /*---------------------------------------------------------
    متد has

    وظیفه: بررسی وجود کلید در LocalStorage

    ورودی‌ها: key (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    has(key) {
        if (!this._isValid(key)) return false;

        // بررسی کش
        if (this._cacheEnabled && this._memoryCache.has(key)) {
            return true;
        }

        const fullKey = this._getKey(key);
        return this._storage.getItem(fullKey) !== null ||
               this._session.getItem(fullKey) !== null;
    }

    /*---------------------------------------------------------
    متد getKeys

    وظیفه: دریافت لیست کلیدهای ذخیره شده

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getKeys() {
        const keys = [];
        try {
            for (let i = 0; i < this._storage.length; i++) {
                const key = this._storage.key(i);
                if (key && key.startsWith(this._prefix)) {
                    keys.push(key.substring(this._prefix.length));
                }
            }
        } catch (error) {
            console.error('❌ خطا در دریافت کلیدها:', error);
        }
        return keys;
    }

    /*---------------------------------------------------------
    متد getAll

    وظیفه: دریافت تمام داده‌های ذخیره شده

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    getAll() {
        const result = {};
        try {
            const keys = this.getKeys();
            keys.forEach(key => {
                result[key] = this.get(key);
            });
        } catch (error) {
            console.error('❌ خطا در دریافت تمام داده‌ها:', error);
        }
        return result;
    }

    /*---------------------------------------------------------
    متد getSize

    وظیفه: دریافت تعداد کلیدهای ذخیره شده

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getSize() {
        try {
            let count = 0;
            for (let i = 0; i < this._storage.length; i++) {
                const key = this._storage.key(i);
                if (key && key.startsWith(this._prefix)) {
                    count++;
                }
            }
            return count;
        } catch (error) {
            console.error('❌ خطا در دریافت تعداد کلیدها:', error);
            return 0;
        }
    }

    /*---------------------------------------------------------
    متد setSession

    وظیفه: ذخیره داده در SessionStorage (موقت)

    ورودی‌ها: key (string), value (any), ttl (number|null)

    خروجی: boolean

    ---------------------------------------------------------*/
    setSession(key, value, ttl = null) {
        if (!this._isValid(key)) return false;

        try {
            const fullKey = this._getKey(key);
            const serialized = this._serialize(value, ttl);
            this._session.setItem(fullKey, serialized);
            return true;
        } catch (error) {
            console.error(`❌ خطا در ذخیره کلید "${key}" در SessionStorage:`, error);
            return false;
        }
    }

    /*---------------------------------------------------------
    متد getSession

    وظیفه: بازیابی داده از SessionStorage

    ورودی‌ها: key (string), defaultValue (any)

    خروجی: any

    ---------------------------------------------------------*/
    getSession(key, defaultValue = null) {
        if (!this._isValid(key)) return defaultValue;

        try {
            const fullKey = this._getKey(key);
            const data = this._session.getItem(fullKey);
            if (!data) return defaultValue;
            const value = this._deserialize(data);
            if (value === null) {
                this.removeSession(key);
                return defaultValue;
            }
            return value;
        } catch (error) {
            console.error(`❌ خطا در بازیابی کلید "${key}" از SessionStorage:`, error);
            return defaultValue;
        }
    }

    /*---------------------------------------------------------
    متد removeSession

    وظیفه: حذف داده از SessionStorage

    ورودی‌ها: key (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    removeSession(key) {
        if (!this._isValid(key)) return false;

        try {
            const fullKey = this._getKey(key);
            this._session.removeItem(fullKey);
            return true;
        } catch (error) {
            console.error(`❌ خطا در حذف کلید "${key}" از SessionStorage:`, error);
            return false;
        }
    }

    /*---------------------------------------------------------
    متد clearSession

    وظیفه: پاکسازی تمام داده‌های SessionStorage مرتبط با برنامه

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    clearSession() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < this._session.length; i++) {
                const key = this._session.key(i);
                if (key && key.startsWith(this._prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => this._session.removeItem(key));
            return true;
        } catch (error) {
            console.error('❌ خطا در پاکسازی SessionStorage:', error);
            return false;
        }
    }

    /*---------------------------------------------------------
    متد setTTL

    وظیفه: تنظیم زمان انقضا برای یک کلید خاص

    ورودی‌ها: key (string), ttl (number)

    خروجی: boolean

    ---------------------------------------------------------*/
    setTTL(key, ttl) {
        if (!this._isValid(key)) return false;
        if (typeof ttl !== 'number' || ttl < 0) {
            console.warn('⚠️ TTL باید یک عدد مثبت باشد.');
            return false;
        }

        const value = this.get(key);
        if (value === null) return false;

        return this.set(key, value, ttl);
    }

    /*---------------------------------------------------------
    متد getTTL

    وظیفه: دریافت زمان انقضای باقی‌مانده برای یک کلید

    ورودی‌ها: key (string)

    خروجی: number|null (زمان باقی‌مانده به میلی‌ثانیه)

    ---------------------------------------------------------*/
    getTTL(key) {
        if (!this._isValid(key)) return null;

        try {
            const fullKey = this._getKey(key);
            let data = this._storage.getItem(fullKey);
            if (!data) {
                data = this._session.getItem(fullKey);
            }
            if (!data) return null;

            const parsed = JSON.parse(data);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.ttl || parsed.ttl <= 0) return null;

            const age = Date.now() - parsed.timestamp;
            const remaining = parsed.ttl - age;
            return remaining > 0 ? remaining : 0;
        } catch (error) {
            console.error(`❌ خطا در دریافت TTL کلید "${key}":`, error);
            return null;
        }
    }

    /*---------------------------------------------------------
    متد clearExpired

    وظیفه: حذف تمام داده‌های منقضی شده

    ورودی‌ها: none

    خروجی: number (تعداد داده‌های حذف شده)

    ---------------------------------------------------------*/
    clearExpired() {
        let count = 0;
        try {
            const keys = this.getKeys();
            keys.forEach(key => {
                const ttl = this.getTTL(key);
                if (ttl !== null && ttl <= 0) {
                    this.remove(key);
                    count++;
                }
            });
        } catch (error) {
            console.error('❌ خطا در حذف داده‌های منقضی:', error);
        }
        return count;
    }

    /*---------------------------------------------------------
    متد enableCache

    وظیفه: فعال/غیرفعال کردن کش حافظه

    ورودی‌ها: enabled (boolean)

    خروجی: void

    ---------------------------------------------------------*/
    enableCache(enabled) {
        this._cacheEnabled = enabled;
        if (!enabled) {
            this._memoryCache.clear();
        }
    }

    /*---------------------------------------------------------
    متد clearCache

    وظیفه: پاکسازی کش حافظه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clearCache() {
        this._memoryCache.clear();
    }

    /*---------------------------------------------------------
    متد getStorageInfo

    وظیفه: دریافت اطلاعات مربوط به فضای ذخیره‌سازی

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    getStorageInfo() {
        let totalSize = 0;
        let itemCount = 0;

        try {
            for (let i = 0; i < this._storage.length; i++) {
                const key = this._storage.key(i);
                if (key && key.startsWith(this._prefix)) {
                    const value = this._storage.getItem(key);
                    if (value) {
                        totalSize += value.length * 2; // تخمین اندازه به بایت
                        itemCount++;
                    }
                }
            }

            // تخمین فضای باقی‌مانده (حداکثر ۵ مگابایت برای LocalStorage)
            const maxSize = 5 * 1024 * 1024; // 5MB
            const usedSize = totalSize;
            const remainingSize = Math.max(0, maxSize - usedSize);

            return {
                itemCount,
                usedSize,
                remainingSize,
                totalSize: maxSize,
                percentUsed: Math.min(100, (usedSize / maxSize) * 100),
                storageType: 'localStorage',
            };
        } catch (error) {
            console.error('❌ خطا در دریافت اطلاعات ذخیره‌سازی:', error);
            return {
                itemCount: 0,
                usedSize: 0,
                remainingSize: 0,
                totalSize: 0,
                percentUsed: 0,
                storageType: 'localStorage',
                error: error.message,
            };
        }
    }

    /*---------------------------------------------------------
    متد isAvailable

    وظیفه: بررسی در دسترس بودن LocalStorage

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    isAvailable() {
        try {
            const testKey = this._getKey('_test_');
            this._storage.setItem(testKey, 'test');
            this._storage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('⚠️ LocalStorage در دسترس نیست:', error);
            return false;
        }
    }
}

// ===== ایجاد نمونه واحد =====
const Storage = new StorageManager();

// ===== صادرات =====
export { StorageManager, Storage };
export default Storage;