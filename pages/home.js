/*=========================================================
نام فایل: home.js

وظیفه: صفحه اصلی (Home Page) شامل رندر بخش‌های Hero، Brand،
Stats، Products، Services، News، Gallery، FAQ، Contact و سایر
بخش‌های ثابت با استفاده از کامپوننت‌های مربوطه

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { api } from '../js/api.js';
import { Modal } from '../js/modal.js';
import { utils } from '../js/utils.js';
import { ProductCardList } from '../components/productCard.js';
import { ServiceCardList } from '../components/serviceCard.js';
import { NewsCardList } from '../components/newsCard.js';
import { FAQItemList } from '../components/faqItem.js';

/*---------------------------------------------------------
کلاس HomePage

وظیفه: مدیریت و رندر صفحه اصلی

---------------------------------------------------------*/
class HomePage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه اصلی

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#home',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._productList = null;
        this._serviceList = null;
        this._newsList = null;
        this._faqList = null;
        this._data = {
            products: [],
            services: [],
            news: [],
            faq: [],
        };
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه اصلی

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه اصلی یافت نشد.');
            return;
        }

        // بارگذاری داده‌ها
        await this._loadData();

        // مقداردهی کامپوننت‌ها
        this._initComponents();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ HomePage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadData

    وظیفه: بارگذاری داده‌های مورد نیاز از API

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadData() {
        try {
            // بارگذاری محصولات
            const productsResponse = await api.get('/products');
            if (productsResponse?.success && productsResponse?.data) {
                this._data.products = productsResponse.data;
            }

            // بارگذاری خدمات
            const servicesResponse = await api.get('/services');
            if (servicesResponse?.success && servicesResponse?.data) {
                this._data.services = servicesResponse.data;
            }

            // بارگذاری اخبار
            const newsResponse = await api.get('/news');
            if (newsResponse?.success && newsResponse?.data) {
                this._data.news = newsResponse.data;
            }

            // بارگذاری سوالات متداول
            const faqResponse = await api.get('/faq');
            if (faqResponse?.success && faqResponse?.data) {
                this._data.faq = faqResponse.data;
            }

        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری داده‌های صفحه اصلی:', error);
            // در صورت خطا، داده‌های خالی استفاده می‌شوند
        }
    }

    /*---------------------------------------------------------
    متد _initComponents

    وظیفه: مقداردهی و رندر کامپوننت‌های صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _initComponents() {
        // ---- محصولات ----
        const productsContainer = document.getElementById('productsContainer');
        if (productsContainer) {
            this._productList = new ProductCardList(productsContainer, {
                showPrice: true,
                showDescription: true,
                showFeatures: false,
                showAddToCart: true,
                showDetails: true,
                showImage: true,
                onAddToCart: (product) => {
                    utils.toast(
                        translator.translate('addedToCart') || 'محصول به سبد خرید اضافه شد.',
                        'success'
                    );
                },
                onViewDetails: (product) => {
                    Modal.showProductDetail(product);
                },
            });
            this._productList.init();
            // فقط ۳ محصول اول را نمایش می‌دهیم (در صورت تمایل می‌توان همه را نمایش داد)
            this._productList.setProducts(this._data.products.slice(0, 3));
        }

        // ---- خدمات ----
        const servicesContainer = document.getElementById('servicesList');
        if (servicesContainer) {
            this._serviceList = new ServiceCardList(servicesContainer, {
                showIcon: true,
                showDescription: true,
                showRequestButton: true,
                onRequest: (service, formData) => {
                    utils.toast(
                        translator.translate('serviceRequestSubmitted') || 'درخواست خدمت با موفقیت ثبت شد.',
                        'success'
                    );
                },
            });
            this._serviceList.init();
            this._serviceList.setServices(this._data.services);
        }

        // ---- اخبار ----
        const newsContainer = document.getElementById('newsContainer');
        if (newsContainer) {
            this._newsList = new NewsCardList(newsContainer, {
                showImage: true,
                showBadge: true,
                showDate: true,
                showDescription: true,
                showReadMore: true,
                onReadMore: (news) => {
                    // نمایش جزییات خبر در مودال
                    const content = `
                        <div class="news-detail">
                            ${news.image ? `<img src="${news.image}" alt="${news.title}" style="width:100%;border-radius:1rem;margin-bottom:1rem;max-height:400px;object-fit:cover;" />` : ''}
                            ${news.badge ? `<span style="display:inline-block;background:#2563eb;color:white;padding:0.25rem 1rem;border-radius:9999px;font-size:0.85rem;margin-bottom:0.75rem;">${news.badge}</span>` : ''}
                            <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">${news.title}</h2>
                            ${news.date ? `<p style="color:#64748b;font-size:0.9rem;margin-bottom:1rem;"><i class="fas fa-calendar-alt"></i> ${utils.formatDate(news.date, this._language === 'fa' ? 'fa-IR' : 'en-US')}</p>` : ''}
                            <div style="color:#334155;line-height:1.8;white-space:pre-wrap;">${news.description || ''}</div>
                            ${news.link ? `<a href="${news.link}" target="_blank" rel="noopener noreferrer" class="btn btn--primary" style="margin-top:1.5rem;display:inline-flex;">
                                ${translator.translate('readFullNews') || 'مطالعه کامل خبر'} <i class="fas fa-external-link-alt"></i>
                            </a>` : ''}
                        </div>
                    `;
                    Modal.open(content, {
                        maxWidth: '700px',
                        className: 'news-detail-modal',
                    });
                },
            });
            this._newsList.init();
            this._newsList.setNews(this._data.news);
        }

        // ---- سوالات متداول ----
        const faqContainer = document.getElementById('faqContainer');
        if (faqContainer) {
            this._faqList = new FAQItemList(faqContainer, {
                openByDefault: true,
                allowMultipleOpen: false,
                onToggle: (faq, isOpen) => {
                    // در صورت نیاز
                },
            });
            this._faqList.init();
            this._faqList.setFAQ(this._data.faq);
        }
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای خاص صفحه اصلی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // رویداد کلیک روی تصاویر گالری برای نمایش بزرگ‌تر
        const galleryImages = document.querySelectorAll('.gallery__img');
        galleryImages.forEach((img) => {
            img.addEventListener('click', () => {
                const src = img.getAttribute('src');
                if (src) {
                    const content = `
                        <div style="text-align:center;">
                            <img src="${src}" alt="تصویر گالری" style="max-width:100%;max-height:80vh;border-radius:1rem;" />
                        </div>
                    `;
                    Modal.open(content, {
                        maxWidth: '900px',
                        className: 'gallery-modal',
                        closeOnOverlay: true,
                    });
                }
            });
        });

        // رویداد کلیک روی دکمه مشاوره
        const consultBtn = document.getElementById('consultBtn');
        if (consultBtn) {
            consultBtn.addEventListener('click', () => {
                const contactSection = document.querySelector('#contact');
                if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        // رویداد کلیک روی دکمه ورود/ثبت نام در هدر
        const authBtn = document.getElementById('authBtnNav');
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                const authSection = document.querySelector('#auth');
                if (authSection) {
                    authSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }

    /*---------------------------------------------------------
    متد _subscribeToState

    وظیفه: اشتراک در تغییرات وضعیت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _subscribeToState() {
        // تغییر زبان
        State.subscribe('language', (lang) => {
            this._language = lang || 'fa';
            this._updateLanguage();
        });

        document.addEventListener('langChanged', (e) => {
            this._language = e.detail.lang || 'fa';
            this._updateLanguage();
        });
    }

    /*---------------------------------------------------------
    متد _updateLanguage

    وظیفه: به‌روزرسانی زبان کامپوننت‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateLanguage() {
        if (this._productList) {
            this._productList._updateLanguage();
        }
        if (this._serviceList) {
            this._serviceList._updateLanguage();
        }
        if (this._newsList) {
            this._newsList._updateLanguage();
        }
        if (this._faqList) {
            this._faqList._updateLanguage();
        }
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی کامل صفحه

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async refresh() {
        await this._loadData();
        this._initComponents();
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        if (this._productList) {
            this._productList.destroy();
            this._productList = null;
        }
        if (this._serviceList) {
            this._serviceList.destroy();
            this._serviceList = null;
        }
        if (this._newsList) {
            this._newsList.destroy();
            this._newsList = null;
        }
        if (this._faqList) {
            this._faqList.destroy();
            this._faqList = null;
        }
        this._initialized = false;
        console.log('🧹 HomePage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { HomePage };
export default HomePage;