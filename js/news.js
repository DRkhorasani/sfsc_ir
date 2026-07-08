/*=========================================================
نام فایل: news.js (سرویس)

وظیفه: مدیریت داده‌های اخبار شامل دریافت از API، کش کردن،
جستجو، فیلتر بر اساس برچسب و ارائه به صفحات

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { api } from './api.js';
import { State } from './state.js';
import { Storage } from './storage.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس NewsService

وظیفه: مدیریت داده‌های اخبار

---------------------------------------------------------*/
class NewsService {
    constructor() {
        this._cacheKey = 'news_data';
        this._cacheTTL = 15 * 60 * 1000; // ۱۵ دقیقه
        this._items = [];
        this._loaded = false;
        this._lastFetch = 0;
        this._badges = [];
    }

    /*---------------------------------------------------------
    متد loadNews

    وظیفه: بارگذاری اخبار از کش یا API

    ورودی‌ها: forceRefresh (boolean)

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async loadNews(forceRefresh = false) {
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
                this._extractBadges();
                return this._items;
            }
        }

        // دریافت از API
        try {
            const response = await api.get('/news');
            if (response?.success && response?.data) {
                this._items = response.data;
                this._loaded = true;
                this._lastFetch = Date.now();
                this._extractBadges();
                // ذخیره در کش
                Storage.set(this._cacheKey, {
                    data: this._items,
                    timestamp: this._lastFetch,
                });
                // ذخیره در State
                State.set('news', this._items);
                return this._items;
            } else {
                throw new Error(response?.message || 'خطا در دریافت اخبار');
            }
        } catch (error) {
            console.error('❌ خطا در دریافت اخبار:', error);
            // در صورت خطا، داده‌های نمونه برگردانده می‌شود
            this._items = this._getMockNews();
            this._loaded = true;
            this._extractBadges();
            return this._items;
        }
    }

    /*---------------------------------------------------------
    متد getNews

    وظیفه: دریافت لیست اخبار

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    async getNews() {
        if (!this._loaded) {
            await this.loadNews();
        }
        return [...this._items];
    }

    /*---------------------------------------------------------
    متد getNewsById

    وظیفه: دریافت یک خبر با شناسه

    ورودی‌ها: id (string|number)

    خروجی: object|null

    ---------------------------------------------------------*/
    async getNewsById(id) {
        const items = await this.getNews();
        return items.find(item => item.id === id) || null;
    }

    /*---------------------------------------------------------
    متد getBadges

    وظیفه: دریافت لیست برچسب‌های موجود در اخبار

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    async getBadges() {
        if (!this._loaded) {
            await this.loadNews();
        }
        return [...this._badges];
    }

    /*---------------------------------------------------------
    متد searchNews

    وظیفه: جستجوی اخبار بر اساس کلیدواژه

    ورودی‌ها: query (string)

    خروجی: array

    ---------------------------------------------------------*/
    async searchNews(query) {
        const items = await this.getNews();
        if (!query || typeof query !== 'string' || query.trim() === '') {
            return items;
        }
        const q = query.trim().toLowerCase();
        return items.filter(item =>
            item.title?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.content?.toLowerCase().includes(q) ||
            item.badge?.toLowerCase().includes(q)
        );
    }

    /*---------------------------------------------------------
    متد filterByBadge

    وظیفه: فیلتر اخبار بر اساس برچسب

    ورودی‌ها: badge (string)

    خروجی: array

    ---------------------------------------------------------*/
    async filterByBadge(badge) {
        const items = await this.getNews();
        if (!badge || typeof badge !== 'string' || badge.trim() === '') {
            return items;
        }
        return items.filter(item => item.badge === badge);
    }

    /*---------------------------------------------------------
    متد getLatestNews

    وظیفه: دریافت آخرین اخبار

    ورودی‌ها: limit (number)

    خروجی: array

    ---------------------------------------------------------*/
    async getLatestNews(limit = 3) {
        const items = await this.getNews();
        // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
        const sorted = [...items].sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        return sorted.slice(0, limit);
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی اجباری اخبار از سرور

    ورودی‌ها: none

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async refresh() {
        Storage.remove(this._cacheKey);
        this._loaded = false;
        this._items = [];
        this._badges = [];
        return this.loadNews(true);
    }

    /*---------------------------------------------------------
    متد _extractBadges

    وظیفه: استخراج برچسب‌های منحصربه‌فرد از اخبار

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _extractBadges() {
        const badgeSet = new Set();
        this._items.forEach(item => {
            if (item.badge) {
                badgeSet.add(item.badge);
            }
        });
        this._badges = Array.from(badgeSet);
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
        this._badges = [];
        this._lastFetch = 0;
    }

    /*---------------------------------------------------------
    متد _getMockNews

    وظیفه: داده‌های نمونه برای حالت آفلاین یا خطا

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    _getMockNews() {
        return [
            {
                id: 1,
                title: 'رونمایی از دستگاه خودکار نمونه‌گیری آلاینده‌های بیولوژیک هوا',
                description: 'با حضور مسئولین وزارت علوم و جهاد کشاورزی، دستگاه بومی نمونه‌گیر اسپور قارچ رونمایی شد.',
                image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200',
                badge: 'دولت',
                date: '2026-06-15',
                link: 'https://dolat.ir/detail/437746',
                content: 'مراسم رونمایی از دستگاه خودکار نمونه‌گیری آلاینده‌های بیولوژیک هوا با حضور معاون وزیر علوم برگزار شد...'
            },
            {
                id: 2,
                title: 'حضور استاد دانشگاه در نوزدهمین فراخوان ثبت اختراعات',
                description: 'دستگاه نمونه‌گیر خودکار آلاینده‌های بیولوژیک هوا در جمع دستاوردهای برتر کشاورزی قرار گرفت.',
                image: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=1200',
                badge: 'دانشگاه کشاورزی',
                date: '2026-06-10',
                link: 'https://agri.scu.ac.ir/fa/w/...',
                content: 'دستگاه نمونه‌گیر خودکار آلاینده‌های بیولوژیک هوا که توسط تیم تحقیقاتی دانشگاه شهید چمران اهواز طراحی شده است...'
            },
            {
                id: 3,
                title: 'بیست و پنجمین نمایشگاه پژوهش و فناوری',
                description: 'ارائه آخرین نسخه دستگاه نمونه‌گیر هوای اماکن با قابلیت اتصال ابری در نمایشگاه پژوهش.',
                image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=1200',
                badge: 'پژوهشگاه',
                date: '2026-06-05',
                link: 'https://agri.scu.ac.ir/fa/w/...',
                content: 'شرکت سورنا فناور سینا در بیست و پنجمین نمایشگاه پژوهش و فناوری با ارائه آخرین نسخه دستگاه نمونه‌گیر هوای اماکن حضور یافت...'
            }
        ];
    }
}

// ===== ایجاد نمونه واحد =====
const News = new NewsService();

// ===== صادرات =====
export { NewsService, News };
export default News;