/*=========================================================
نام فایل: faq.js (سرویس)

وظیفه: مدیریت داده‌های سوالات متداول شامل دریافت از API،
کش کردن، جستجو و ارائه به صفحات

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { api } from './api.js';
import { State } from './state.js';
import { Storage } from './storage.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس FAQService

وظیفه: مدیریت داده‌های سوالات متداول

---------------------------------------------------------*/
class FAQService {
    constructor() {
        this._cacheKey = 'faq_data';
        this._cacheTTL = 30 * 60 * 1000; // ۳۰ دقیقه
        this._items = [];
        this._loaded = false;
        this._lastFetch = 0;
    }

    /*---------------------------------------------------------
    متد loadFAQ

    وظیفه: بارگذاری سوالات متداول از کش یا API

    ورودی‌ها: forceRefresh (boolean)

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async loadFAQ(forceRefresh = false) {
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
                return this._items;
            }
        }

        // دریافت از API
        try {
            const response = await api.get('/faq');
            if (response?.success && response?.data) {
                this._items = response.data;
                this._loaded = true;
                this._lastFetch = Date.now();
                // ذخیره در کش
                Storage.set(this._cacheKey, {
                    data: this._items,
                    timestamp: this._lastFetch,
                });
                // ذخیره در State
                State.set('faq', this._items);
                return this._items;
            } else {
                throw new Error(response?.message || 'خطا در دریافت سوالات متداول');
            }
        } catch (error) {
            console.error('❌ خطا در دریافت سوالات متداول:', error);
            // در صورت خطا، داده‌های نمونه برگردانده می‌شود
            this._items = this._getMockFAQ();
            this._loaded = true;
            return this._items;
        }
    }

    /*---------------------------------------------------------
    متد getFAQ

    وظیفه: دریافت لیست سوالات متداول

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    async getFAQ() {
        if (!this._loaded) {
            await this.loadFAQ();
        }
        return [...this._items];
    }

    /*---------------------------------------------------------
    متد getFAQById

    وظیفه: دریافت یک سوال با شناسه

    ورودی‌ها: id (string|number)

    خروجی: object|null

    ---------------------------------------------------------*/
    async getFAQById(id) {
        const items = await this.getFAQ();
        return items.find(item => item.id === id) || null;
    }

    /*---------------------------------------------------------
    متد searchFAQ

    وظیفه: جستجوی سوالات بر اساس کلیدواژه

    ورودی‌ها: query (string)

    خروجی: array

    ---------------------------------------------------------*/
    async searchFAQ(query) {
        const items = await this.getFAQ();
        if (!query || typeof query !== 'string' || query.trim() === '') {
            return items;
        }
        const q = query.trim().toLowerCase();
        return items.filter(item =>
            item.question?.toLowerCase().includes(q) ||
            item.answer?.toLowerCase().includes(q)
        );
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی اجباری سوالات از سرور

    ورودی‌ها: none

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async refresh() {
        Storage.remove(this._cacheKey);
        this._loaded = false;
        this._items = [];
        return this.loadFAQ(true);
    }

    /*---------------------------------------------------------
    متد addFAQ

    وظیفه: افزودن سوال جدید (در صورت وجود API)

    ورودی‌ها: faq (object)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async addFAQ(faq) {
        try {
            const response = await api.post('/faq', faq);
            if (response?.success) {
                // بازخوانی لیست
                await this.refresh();
                return {
                    success: true,
                    message: response.message || 'سوال با موفقیت اضافه شد.',
                    data: response.data,
                };
            } else {
                throw new Error(response?.message || 'افزودن سوال با شکست مواجه شد.');
            }
        } catch (error) {
            console.error('❌ خطا در افزودن سوال:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد updateFAQ

    وظیفه: به‌روزرسانی سوال (در صورت وجود API)

    ورودی‌ها: id (string|number), faq (object)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async updateFAQ(id, faq) {
        try {
            const response = await api.put(`/faq/${id}`, faq);
            if (response?.success) {
                await this.refresh();
                return {
                    success: true,
                    message: response.message || 'سوال با موفقیت به‌روزرسانی شد.',
                    data: response.data,
                };
            } else {
                throw new Error(response?.message || 'به‌روزرسانی سوال با شکست مواجه شد.');
            }
        } catch (error) {
            console.error('❌ خطا در به‌روزرسانی سوال:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد deleteFAQ

    وظیفه: حذف سوال (در صورت وجود API)

    ورودی‌ها: id (string|number)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async deleteFAQ(id) {
        try {
            const response = await api.delete(`/faq/${id}`);
            if (response?.success) {
                await this.refresh();
                return {
                    success: true,
                    message: response.message || 'سوال با موفقیت حذف شد.',
                };
            } else {
                throw new Error(response?.message || 'حذف سوال با شکست مواجه شد.');
            }
        } catch (error) {
            console.error('❌ خطا در حذف سوال:', error);
            throw error;
        }
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
        this._lastFetch = 0;
    }

    /*---------------------------------------------------------
    متد _getMockFAQ

    وظیفه: داده‌های نمونه برای حالت آفلاین یا خطا

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    _getMockFAQ() {
        return [
            {
                id: 1,
                question: 'تفاوت سیستم حجمی با Air-O-Cell چیست؟',
                answer: 'سیستم حجمی امکان نمونه‌گیری مداوم و کمی‌سازی دقیق را فراهم می‌کند، در حالی که Air-O-Cell بیشتر برای تست سریع محیط‌های داخلی کاربرد دارد.'
            },
            {
                id: 2,
                question: 'آیا دستگاه‌ها قابلیت اتصال آنلاین دارند؟',
                answer: 'بله، مدل‌های جدید دستگاه‌های نمونه‌گیری مانند SFS-5000 و SFS-7000 دارای قابلیت انتقال داده، ذخیره‌سازی ابری و داشبورد تحت وب هستند.'
            },
            {
                id: 3,
                question: 'آیا خدمات نمونه‌گیری در محل انجام می‌شود؟',
                answer: 'بله، تیم تخصصی نمونه‌گیری شرکت سورنا فناور سینا برای بیمارستان‌ها، صنایع غذایی، گلخانه‌ها و سایر محیط‌های مورد نیاز اعزام می‌شود.'
            },
            {
                id: 4,
                question: 'هزینه خرید دستگاه‌ها چگونه محاسبه می‌شود؟',
                answer: 'هزینه دستگاه‌ها بر اساس مدل، قابلیت‌ها و تجهیزات جانبی محاسبه می‌شود. برای دریافت قیمت دقیق با واحد فروش تماس بگیرید.'
            },
            {
                id: 5,
                question: 'آیا گارانتی و خدمات پس از فروش ارائه می‌شود؟',
                answer: 'بله، تمام دستگاه‌های شرکت دارای گارانتی ۱۲ تا ۳۶ ماهه و خدمات پس از فروش شامل تعمیرات، کالیبراسیون و تأمین قطعات یدکی هستند.'
            },
            {
                id: 6,
                question: 'آیا امکان سفارش دستگاه به صورت آنلاین وجود دارد؟',
                answer: 'بله، شما می‌توانید از طریق وب‌سایت شرکت، بخش محصولات، دستگاه مورد نظر را انتخاب و سفارش دهید.'
            }
        ];
    }
}

// ===== ایجاد نمونه واحد =====
const FAQ = new FAQService();

// ===== صادرات =====
export { FAQService, FAQ };
export default FAQ;