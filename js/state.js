/*=========================================================
نام فایل: state.js

وظیفه: مدیریت وضعیت مرکزی برنامه (State Management)
با قابلیت اشتراک‌گذاری تغییرات و ذخیره‌سازی در LocalStorage

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { Config } from './config.js';
import { Storage } from './storage.js';

/*---------------------------------------------------------
وضعیت اولیه برنامه
---------------------------------------------------------*/
const initialState = {
    language: Config.APP.DEFAULT_LANGUAGE,
    theme: Config.APP.DEFAULT_THEME,
    currentUser: null,
    cart: [],
    favorites: [],
    currentPage: 'home',
    isLoading: false,
    errors: [],
    notifications: [],
    dashboardData: null,
    products: [],
    services: [],
    news: [],
    faq: [],
};

/*---------------------------------------------------------
کلاس StateManager

وظیفه: مدیریت وضعیت مرکزی با قابلیت اشتراک‌گذاری و ذخیره‌سازی

---------------------------------------------------------*/
class StateManager {
    constructor() {
        this._state = { ...initialState };
        this._listeners = new Map();
        this._storageKey = Config.getStorageKey('state');

        // بارگذاری وضعیت ذخیره شده از LocalStorage
        this._loadFromStorage();
    }

    /*---------------------------------------------------------
    متد _loadFromStorage

    وظیفه: بارگذاری وضعیت ذخیره شده از LocalStorage

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _loadFromStorage() {
        try {
            const saved = Storage.get(this._storageKey, null);
            if (saved && typeof saved === 'object') {
                // ادغام با initialState برای اطمینان از وجود کلیدها
                this._state = { ...initialState, ...saved };
            }
        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری وضعیت از LocalStorage:', error);
        }
    }

    /*---------------------------------------------------------
    متد _saveToStorage

    وظیفه: ذخیره وضعیت فعلی در LocalStorage

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _saveToStorage() {
        try {
            Storage.set(this._storageKey, this._state);
        } catch (error) {
            console.warn('⚠️ خطا در ذخیره وضعیت در LocalStorage:', error);
        }
    }

    /*---------------------------------------------------------
    متد get

    وظیفه: دریافت مقدار یک کلید از وضعیت

    ورودی‌ها: key (string), defaultValue (any)

    خروجی: any

    ---------------------------------------------------------*/
    get(key, defaultValue = undefined) {
        if (key === undefined) {
            return { ...this._state };
        }
        return this._state[key] !== undefined ? this._state[key] : defaultValue;
    }

    /*---------------------------------------------------------
    متد set

    وظیفه: تنظیم مقدار یک کلید در وضعیت و انتشار رویداد تغییر

    ورودی‌ها: key (string), value (any), silent (boolean)

    خروجی: void

    ---------------------------------------------------------*/
    set(key, value, silent = false) {
        if (key === undefined) {
            throw new Error('❌ کلید وضعیت نمی‌تواند undefined باشد.');
        }

        const oldValue = this._state[key];
        if (oldValue === value) return;

        this._state[key] = value;

        // ذخیره خودکار در LocalStorage (به جز موارد حساس مانند خطاها)
        if (key !== 'errors' && key !== 'notifications' && key !== 'isLoading') {
            this._saveToStorage();
        }

        // انتشار رویداد تغییر
        if (!silent) {
            this._notify(key, value, oldValue);
        }
    }

    /*---------------------------------------------------------
    متد update

    وظیفه: به‌روزرسانی چند کلید به‌طور همزمان

    ورودی‌ها: updates (object), silent (boolean)

    خروجی: void

    ---------------------------------------------------------*/
    update(updates, silent = false) {
        if (typeof updates !== 'object' || updates === null) {
            throw new Error('❌ ورودی update باید یک شیء باشد.');
        }

        const changedKeys = [];
        Object.keys(updates).forEach(key => {
            const oldValue = this._state[key];
            const newValue = updates[key];
            if (oldValue !== newValue) {
                this._state[key] = newValue;
                changedKeys.push({ key, oldValue, newValue });
            }
        });

        if (changedKeys.length === 0) return;

        // ذخیره در LocalStorage
        const shouldSave = changedKeys.some(
            ({ key }) => key !== 'errors' && key !== 'notifications' && key !== 'isLoading'
        );
        if (shouldSave) {
            this._saveToStorage();
        }

        // انتشار رویدادهای تغییر
        if (!silent) {
            changedKeys.forEach(({ key, oldValue, newValue }) => {
                this._notify(key, newValue, oldValue);
            });
        }
    }

    /*---------------------------------------------------------
    متد subscribe

    وظیفه: اشتراک‌گذاری برای شنیدن تغییرات یک کلید خاص

    ورودی‌ها: key (string), callback (function)

    خروجی: function (unsubscribe)

    ---------------------------------------------------------*/
    subscribe(key, callback) {
        if (typeof callback !== 'function') {
            throw new Error('❌ callback باید یک تابع باشد.');
        }

        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);

        // بازگشت تابع لغو اشتراک
        return () => {
            const listeners = this._listeners.get(key);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this._listeners.delete(key);
                }
            }
        };
    }

    /*---------------------------------------------------------
    متد subscribeAll

    وظیفه: اشتراک‌گذاری برای شنیدن تمام تغییرات وضعیت

    ورودی‌ها: callback (function)

    خروجی: function (unsubscribe)

    ---------------------------------------------------------*/
    subscribeAll(callback) {
        if (typeof callback !== 'function') {
            throw new Error('❌ callback باید یک تابع باشد.');
        }

        // استفاده از کلید ویژه '*' برای تمام تغییرات
        return this.subscribe('*', callback);
    }

    /*---------------------------------------------------------
    متد _notify

    وظیفه: انتشار رویداد تغییر به شنوندگان

    ورودی‌ها: key (string), newValue (any), oldValue (any)

    خروجی: void

    ---------------------------------------------------------*/
    _notify(key, newValue, oldValue) {
        const listeners = this._listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`❌ خطا در اجرای callback برای کلید "${key}":`, error);
                }
            });
        }

        // شنوندگان '*' (همه تغییرات)
        const allListeners = this._listeners.get('*');
        if (allListeners) {
            allListeners.forEach(callback => {
                try {
                    callback(key, newValue, oldValue);
                } catch (error) {
                    console.error('❌ خطا در اجرای callback همه‌تغییرات:', error);
                }
            });
        }

        // انتشار رویداد DOM برای هماهنگی با سایر بخش‌ها
        try {
            const event = new CustomEvent('stateChanged', {
                detail: { key, newValue, oldValue }
            });
            document.dispatchEvent(event);
        } catch (error) {
            // نادیده گرفته شود
        }
    }

    /*---------------------------------------------------------
    متد reset

    وظیفه: بازنشانی وضعیت به initialState

    ورودی‌ها: silent (boolean)

    خروجی: void

    ---------------------------------------------------------*/
    reset(silent = false) {
        const oldState = { ...this._state };
        this._state = { ...initialState };

        if (!silent) {
            Object.keys(this._state).forEach(key => {
                const oldValue = oldState[key];
                const newValue = this._state[key];
                if (oldValue !== newValue) {
                    this._notify(key, newValue, oldValue);
                }
            });
        }

        this._saveToStorage();
    }

    /*---------------------------------------------------------
    متد clear

    وظیفه: پاکسازی کامل وضعیت (بدون بازنشانی به initialState)

    ورودی‌ها: silent (boolean)

    خروجی: void

    ---------------------------------------------------------*/
    clear(silent = false) {
        const oldState = { ...this._state };
        this._state = {};

        if (!silent) {
            Object.keys(this._state).forEach(key => {
                const oldValue = oldState[key];
                const newValue = this._state[key];
                if (oldValue !== newValue) {
                    this._notify(key, newValue, oldValue);
                }
            });
        }

        this._saveToStorage();
    }

    /*---------------------------------------------------------
    متد getState

    وظیفه: دریافت کپی از کل وضعیت (برای اطمینان از عدم تغییر مستقیم)

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    getState() {
        return { ...this._state };
    }

    /*---------------------------------------------------------
    متد has

    وظیفه: بررسی وجود کلید در وضعیت

    ورودی‌ها: key (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    has(key) {
        return this._state.hasOwnProperty(key);
    }

    /*---------------------------------------------------------
    متد keys

    وظیفه: دریافت لیست کلیدهای وضعیت

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    keys() {
        return Object.keys(this._state);
    }

    /*---------------------------------------------------------
    متد size

    وظیفه: تعداد کلیدهای وضعیت

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    get size() {
        return Object.keys(this._state).length;
    }
}

// ===== ایجاد یک نمونه واحد (Singleton) از StateManager =====
const State = new StateManager();

// ===== فریز کردن متدهای اصلی برای جلوگیری از تغییر =====
Object.freeze(State.get);
Object.freeze(State.getState);
Object.freeze(State.has);
Object.freeze(State.keys);
Object.freeze(State.size);

// ===== صادرات =====
export { State, StateManager };
export default State;