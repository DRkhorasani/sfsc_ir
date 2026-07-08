/*=========================================================
نام فایل: products.js (سرویس)

وظیفه: مدیریت داده‌های محصولات شامل دریافت از API، کش کردن،
جستجو، فیلتر بر اساس دسته‌بندی، مرتب‌سازی و دریافت جزئیات

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { api } from './api.js';
import { State } from './state.js';
import { Storage } from './storage.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس ProductService

وظیفه: مدیریت داده‌های محصولات

---------------------------------------------------------*/
class ProductService {
    constructor() {
        this._cacheKey = 'products_data';
        this._cacheTTL = 10 * 60 * 1000; // ۱۰ دقیقه
        this._items = [];
        this._categories = [];
        this._loaded = false;
        this._lastFetch = 0;
    }

    /*---------------------------------------------------------
    متد loadProducts

    وظیفه: بارگذاری محصولات از کش یا API

    ورودی‌ها: forceRefresh (boolean)

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async loadProducts(forceRefresh = false) {
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
                this._extractCategories();
                return this._items;
            }
        }

        // دریافت از API
        try {
            const response = await api.get('/products');
            if (response?.success && response?.data) {
                this._items = response.data;
                this._loaded = true;
                this._lastFetch = Date.now();
                this._extractCategories();
                // ذخیره در کش
                Storage.set(this._cacheKey, {
                    data: this._items,
                    timestamp: this._lastFetch,
                });
                // ذخیره در State
                State.set('products', this._items);
                return this._items;
            } else {
                throw new Error(response?.message || 'خطا در دریافت محصولات');
            }
        } catch (error) {
            console.error('❌ خطا در دریافت محصولات:', error);
            // در صورت خطا، داده‌های نمونه برگردانده می‌شود
            this._items = this._getMockProducts();
            this._loaded = true;
            this._extractCategories();
            return this._items;
        }
    }

    /*---------------------------------------------------------
    متد getProducts

    وظیفه: دریافت لیست محصولات

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    async getProducts() {
        if (!this._loaded) {
            await this.loadProducts();
        }
        return [...this._items];
    }

    /*---------------------------------------------------------
    متد getProductById

    وظیفه: دریافت یک محصول با شناسه

    ورودی‌ها: id (string|number)

    خروجی: object|null

    ---------------------------------------------------------*/
    async getProductById(id) {
        const items = await this.getProducts();
        return items.find(item => item.id === id) || null;
    }

    /*---------------------------------------------------------
    متد getCategories

    وظیفه: دریافت لیست دسته‌بندی‌های موجود

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    async getCategories() {
        if (!this._loaded) {
            await this.loadProducts();
        }
        return [...this._categories];
    }

    /*---------------------------------------------------------
    متد searchProducts

    وظیفه: جستجوی محصولات بر اساس کلیدواژه

    ورودی‌ها: query (string)

    خروجی: array

    ---------------------------------------------------------*/
    async searchProducts(query) {
        const items = await this.getProducts();
        if (!query || typeof query !== 'string' || query.trim() === '') {
            return items;
        }
        const q = query.trim().toLowerCase();
        return items.filter(item =>
            item.title?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q)
        );
    }

    /*---------------------------------------------------------
    متد filterByCategory

    وظیفه: فیلتر محصولات بر اساس دسته‌بندی

    ورودی‌ها: category (string)

    خروجی: array

    ---------------------------------------------------------*/
    async filterByCategory(category) {
        const items = await this.getProducts();
        if (!category || typeof category !== 'string' || category.trim() === '') {
            return items;
        }
        return items.filter(item => item.category === category);
    }

    /*---------------------------------------------------------
    متد sortProducts

    وظیفه: مرتب‌سازی محصولات

    ورودی‌ها: sortType (string) - 'default', 'price_asc', 'price_desc', 'name_asc', 'name_desc'

    خروجی: array

    ---------------------------------------------------------*/
    async sortProducts(sortType = 'default') {
        const items = await this.getProducts();
        const sorted = [...items];

        switch (sortType) {
            case 'price_asc':
                sorted.sort((a, b) => {
                    const priceA = this._parsePrice(a.price);
                    const priceB = this._parsePrice(b.price);
                    return priceA - priceB;
                });
                break;
            case 'price_desc':
                sorted.sort((a, b) => {
                    const priceA = this._parsePrice(a.price);
                    const priceB = this._parsePrice(b.price);
                    return priceB - priceA;
                });
                break;
            case 'name_asc':
                sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'name_desc':
                sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
            default:
                break;
        }
        return sorted;
    }

    /*---------------------------------------------------------
    متد searchAndFilter

    وظیفه: ترکیب جستجو، فیلتر و مرتب‌سازی

    ورودی‌ها: options (object) شامل query, category, sort

    خروجی: array

    ---------------------------------------------------------*/
    async searchAndFilter(options = {}) {
        let items = await this.getProducts();
        const { query, category, sort } = options;

        // جستجو
        if (query && typeof query === 'string' && query.trim() !== '') {
            const q = query.trim().toLowerCase();
            items = items.filter(item =>
                item.title?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q) ||
                item.category?.toLowerCase().includes(q)
            );
        }

        // فیلتر دسته‌بندی
        if (category && typeof category === 'string' && category.trim() !== '') {
            items = items.filter(item => item.category === category);
        }

        // مرتب‌سازی
        if (sort && sort !== 'default') {
            switch (sort) {
                case 'price_asc':
                    items.sort((a, b) => this._parsePrice(a.price) - this._parsePrice(b.price));
                    break;
                case 'price_desc':
                    items.sort((a, b) => this._parsePrice(b.price) - this._parsePrice(a.price));
                    break;
                case 'name_asc':
                    items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                    break;
                case 'name_desc':
                    items.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                    break;
                default:
                    break;
            }
        }

        return items;
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی اجباری محصولات از سرور

    ورودی‌ها: none

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async refresh() {
        Storage.remove(this._cacheKey);
        this._loaded = false;
        this._items = [];
        this._categories = [];
        return this.loadProducts(true);
    }

    /*---------------------------------------------------------
    متد _extractCategories

    وظیفه: استخراج دسته‌بندی‌های منحصربه‌فرد از محصولات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _extractCategories() {
        const categorySet = new Set();
        this._items.forEach(item => {
            if (item.category) {
                categorySet.add(item.category);
            }
        });
        this._categories = Array.from(categorySet);
    }

    /*---------------------------------------------------------
    متد _parsePrice

    وظیفه: تبدیل قیمت به عدد

    ورودی‌ها: price (string|number)

    خروجی: number

    ---------------------------------------------------------*/
    _parsePrice(price) {
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            const num = parseInt(price.replace(/[^0-9]/g, ''), 10);
            return isNaN(num) ? 0 : num;
        }
        return 0;
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
        this._categories = [];
        this._lastFetch = 0;
    }

    /*---------------------------------------------------------
    متد _getMockProducts

    وظیفه: داده‌های نمونه برای حالت آفلاین یا خطا

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    _getMockProducts() {
        return [
            {
                id: 1,
                title: 'دستگاه نمونه‌گیر خودکار آلاینده‌های بیولوژیک هوا',
                description: 'دستگاه حجمی ۷ روزه با قابلیت پایش مداوم اسپور قارچ و گرده گیاهان، مجهز به کنترل جریان هوا، نمایشگر LCD و اتصال به سامانه ابری. شکست انحصار Burkard.',
                price: '۷۲۰ میلیون تومان',
                images: ['/pics/Sp01.jpg', '/pics/Sp02.jpg', '/pics/Sp03.jpg', '/pics/Sp04.jpg', '/pics/Sp05.jpg'],
                features: ['پایش ۷ روزه', 'اتصال ابری', 'دقت حجمی بالا', 'قابل استفاده در ایستگاه‌های پایش'],
                category: 'sampler',
                badge: 'محصول برتر',
            },
            {
                id: 2,
                title: 'نمونه‌گیر هوای اماکن (Indoor Air Sampler)',
                description: 'مناسب بیمارستان‌ها، مدارس، صنایع غذایی و دفاتر. جمع‌آوری ذرات آلرژن و قارچ با کارتریج Air-O-Cell.',
                price: '۳۹۰ میلیون تومان',
                images: ['https://picsum.photos/id/20/400/300', 'https://picsum.photos/id/21/400/300'],
                features: ['سبک و پرتابل', 'نمونه‌گیری سریع', 'قابل استفاده با کارتریج استاندارد'],
                category: 'sampler',
                badge: 'پرفروش',
            },
            {
                id: 3,
                title: 'دستگاه اسپورتراپ دیجیتال (Spore Trap Pro)',
                description: 'نمونه‌گیر دوکاره با قابلیت تنظیم دوره نمونه‌گیری ۱ تا ۱۴ روز، دارای حافظه داخلی و خروجی USB.',
                price: '۵۹۰ میلیون تومان',
                images: ['/pics/mic01.jpg', '/pics/mic02.jpg', '/pics/mic03.jpg'],
                features: ['تنظیم بازه زمانی', 'حافظه ۱۰۰ نمونه', 'باطری اضطراری'],
                category: 'spore_trap',
                detailTitle: 'تصاویر میکروسپی از دانه‌های گرده و اسپور قارچ‌ها',
            },
            {
                id: 4,
                title: 'دستگاه پایش هوای آلرژن مدل SFS-5000',
                description: 'پیشرفته‌ترین نمونه‌گیر هوای دیجیتال با نمایشگر لمسی، قابلیت کالیبراسیون خودکار و اتصال به اینترنت.',
                price: '۸۲۰ میلیون تومان',
                images: ['/pics/Sam01.jpg', '/pics/Sam02.jpg', '/pics/Sam03.jpg', '/pics/Sam04.jpg'],
                features: ['اتصال اینترنت', 'گارانتی ۳ ساله', 'نمایشگر لمسی', 'خروجی آنلاین'],
                category: 'digital',
                detailTitle: 'اجزای دستگاه',
            },
            {
                id: 5,
                title: 'تله حجمی اسپور ۷ روزه (مدل SFS-7000)',
                description: 'نسخه حرفه‌ای مشابه Burkard با قابلیت آنالیز آنلاین و سامانه هشدار. ساخت ایران.',
                price: '۷۵۰ میلیون تومان',
                images: ['https://picsum.photos/id/11/400/300', 'https://picsum.photos/id/12/400/300'],
                features: ['پایش ۷ روزه', 'داده آنلاین', 'نرم‌افزار اختصاصی', 'هشدار آلودگی'],
                category: 'volumetric',
            },
        ];
    }
}

// ===== ایجاد نمونه واحد =====
const Products = new ProductService();

// ===== صادرات =====
export { ProductService, Products };
export default Products;