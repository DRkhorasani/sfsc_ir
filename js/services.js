/*=========================================================
نام فایل: services.js (سرویس)

وظیفه: مدیریت داده‌های خدمات شامل دریافت از API، کش کردن،
جستجو، فیلتر بر اساس نوع و ارائه به صفحات

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { api } from './api.js';
import { State } from './state.js';
import { Storage } from './storage.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس ServiceManager

وظیفه: مدیریت داده‌های خدمات

---------------------------------------------------------*/
class ServiceManager {
    constructor() {
        this._cacheKey = 'services_data';
        this._cacheTTL = 30 * 60 * 1000; // ۳۰ دقیقه
        this._items = [];
        this._types = [];
        this._loaded = false;
        this._lastFetch = 0;
    }

    /*---------------------------------------------------------
    متد loadServices

    وظیفه: بارگذاری خدمات از کش یا API

    ورودی‌ها: forceRefresh (boolean)

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async loadServices(forceRefresh = false) {
        // اگر داده در حافظه موجود است و نیاز به بازخوانی نیست
        if (!forceRefresh && this._loaded && this._items.length > 0) {
            return this._items;
        }

        // بررسی کش در Storage
        if (!forceRefresh) {
            const cached = Storage.get(this._cacheKey);
            if (cached && cached.timestamp && (Date.now() - cached.timestamp) < this._cacheTTL) {
                this._items = cached.data || [];
                this._loaded = true;
                this._lastFetch = cached.timestamp;
                this._extractTypes();
                return this._items;
            }
        }

        // دریافت از API
        try {
            const response = await api.get('/services');
            if (response?.success && response?.data) {
                this._items = response.data;
                this._loaded = true;
                this._lastFetch = Date.now();
                this._extractTypes();
                // ذخیره در کش
                Storage.set(this._cacheKey, {
                    data: this._items,
                    timestamp: this._lastFetch,
                });
                // ذخیره در State
                State.set('services', this._items);
                return this._items;
            } else {
                throw new Error(response?.message || 'خطا در دریافت خدمات');
            }
        } catch (error) {
            console.error('❌ خطا در دریافت خدمات:', error);
            // در صورت خطا، داده‌های نمونه برگردانده می‌شود
            this._items = this._getMockServices();
            this._loaded = true;
            this._extractTypes();
            return this._items;
        }
    }

    /*---------------------------------------------------------
    متد getServices

    وظیفه: دریافت لیست خدمات

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    async getServices() {
        if (!this._loaded) {
            await this.loadServices();
        }
        return [...this._items];
    }

    /*---------------------------------------------------------
    متد getServiceById

    وظیفه: دریافت یک خدمت با شناسه

    ورودی‌ها: id (string|number)

    خروجی: object|null

    ---------------------------------------------------------*/
    async getServiceById(id) {
        const items = await this.getServices();
        return items.find(item => item.id === id) || null;
    }

    /*---------------------------------------------------------
    متد getTypes

    وظیفه: دریافت لیست انواع خدمات موجود

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    async getTypes() {
        if (!this._loaded) {
            await this.loadServices();
        }
        return [...this._types];
    }

    /*---------------------------------------------------------
    متد searchServices

    وظیفه: جستجوی خدمات بر اساس کلیدواژه

    ورودی‌ها: query (string)

    خروجی: array

    ---------------------------------------------------------*/
    async searchServices(query) {
        const items = await this.getServices();
        if (!query || typeof query !== 'string' || query.trim() === '') {
            return items;
        }
        const q = query.trim().toLowerCase();
        return items.filter(item =>
            item.title?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.type?.toLowerCase().includes(q)
        );
    }

    /*---------------------------------------------------------
    متد filterByType

    وظیفه: فیلتر خدمات بر اساس نوع

    ورودی‌ها: type (string)

    خروجی: array

    ---------------------------------------------------------*/
    async filterByType(type) {
        const items = await this.getServices();
        if (!type || typeof type !== 'string' || type.trim() === '') {
            return items;
        }
        return items.filter(item => item.type === type);
    }

    /*---------------------------------------------------------
    متد searchAndFilter

    وظیفه: ترکیب جستجو و فیلتر بر اساس نوع

    ورودی‌ها: options (object) شامل query, type

    خروجی: array

    ---------------------------------------------------------*/
    async searchAndFilter(options = {}) {
        let items = await this.getServices();
        const { query, type } = options;

        // جستجو
        if (query && typeof query === 'string' && query.trim() !== '') {
            const q = query.trim().toLowerCase();
            items = items.filter(item =>
                item.title?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q) ||
                item.type?.toLowerCase().includes(q)
            );
        }

        // فیلتر نوع
        if (type && typeof type === 'string' && type.trim() !== '') {
            items = items.filter(item => item.type === type);
        }

        return items;
    }

    /*---------------------------------------------------------
    متد requestService

    وظیفه: ارسال درخواست خدمت

    ورودی‌ها: serviceId (string|number), formData (object)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async requestService(serviceId, formData) {
        if (!serviceId) {
            throw new Error('شناسه خدمت نامعتبر است.');
        }

        try {
            const data = {
                serviceId,
                ...formData,
            };
            const response = await api.post('/services/request', data);
            if (response?.success) {
                return {
                    success: true,
                    message: response.message || 'درخواست خدمت با موفقیت ثبت شد.',
                    data: response.data,
                };
            } else {
                throw new Error(response?.message || 'ثبت درخواست با شکست مواجه شد.');
            }
        } catch (error) {
            console.error('❌ خطا در ثبت درخواست خدمت:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی اجباری خدمات از سرور

    ورودی‌ها: none

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async refresh() {
        Storage.remove(this._cacheKey);
        this._loaded = false;
        this._items = [];
        this._types = [];
        return this.loadServices(true);
    }

    /*---------------------------------------------------------
    متد _extractTypes

    وظیفه: استخراج انواع منحصربه‌فرد از خدمات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _extractTypes() {
        const typeSet = new Set();
        this._items.forEach(item => {
            if (item.type) {
                typeSet.add(item.type);
            }
        });
        this._types = Array.from(typeSet);
    }

    /*---------------------------------------------------------
    متد clearCache

    وظیفه: پاکسازی کش

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clearCache() {
        Storage.remove(this._cacheKey);
        this._loaded = false;
        this._items = [];
        this._types = [];
        this._lastFetch = 0;
    }

    /*---------------------------------------------------------
    متد _getMockServices

    وظیفه: داده‌های نمونه برای حالت آفلاین یا خطا

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    _getMockServices() {
        return [
            {
                id: 1,
                title: 'نمونه‌گیری هوا',
                description: 'اعزام تیم تخصصی به محل برای نمونه‌گیری آلرژن‌ها، اسپور قارچ و ذرات معلق با استفاده از دستگاه‌های پیشرفته',
                icon: 'fas fa-wind',
                type: 'sampling',
                badge: 'تخصصی',
            },
            {
                id: 2,
                title: 'تحلیل میکروسکوپی',
                description: 'شناسایی و شمارش دقیق دانه‌های گرده، اسپور قارچ و سایر ذرات بیولوژیک با استفاده از میکروسکوپ‌های پیشرفته',
                icon: 'fas fa-microscope',
                type: 'analysis',
                badge: 'آزمایشگاهی',
            },
            {
                id: 3,
                title: 'تحلیل داده و گزارش‌دهی',
                description: 'مدل‌سازی آماری، تحلیل روند، تهیه گزارش‌های تخصصی و تفسیر نتایج نمونه‌گیری برای کاربردهای مختلف',
                icon: 'fas fa-chart-line',
                type: 'analysis',
                badge: 'حرفه‌ای',
            },
            {
                id: 4,
                title: 'کشاورزی دقیق',
                description: 'مدیریت بیماری‌های گیاهی با استفاده از پایش اسپور قارچ‌ها و گرده‌ها در مزارع و گلخانه‌ها',
                icon: 'fas fa-leaf',
                type: 'sampling',
                badge: 'کشاورزی',
            },
            {
                id: 5,
                title: 'مشاوره و آموزش',
                description: 'ارائه مشاوره تخصصی در زمینه پایش آلرژن‌ها، برگزاری دوره‌های آموزشی و کارگاه‌های تخصصی',
                icon: 'fas fa-graduation-cap',
                type: 'consulting',
                badge: 'آموزشی',
            },
            {
                id: 6,
                title: 'کالیبراسیون و تعمیرات',
                description: 'خدمات کالیبراسیون دقیق دستگاه‌های نمونه‌گیری، تعمیرات تخصصی و ارائه خدمات پس از فروش',
                icon: 'fas fa-tools',
                type: 'service',
                badge: 'فنی',
            },
            {
                id: 7,
                title: 'پایش بیمارستانی',
                description: 'پایش کیفیت هوای بیمارستان‌ها، اتاق‌های عمل و بخش‌های حساس برای کنترل آلودگی‌های قارچی و باکتریایی',
                icon: 'fas fa-hospital',
                type: 'sampling',
                badge: 'بیمارستانی',
            },
            {
                id: 8,
                title: 'تحلیل محیط‌های صنعتی',
                description: 'پایش و تحلیل آلاینده‌های بیولوژیک در محیط‌های صنعتی، کارخانه‌ها و صنایع غذایی',
                icon: 'fas fa-industry',
                type: 'analysis',
                badge: 'صنعتی',
            },
        ];
    }
}

// ===== ایجاد نمونه واحد =====
const Services = new ServiceManager();

// ===== صادرات =====
export { ServiceManager, Services };
export default Services;