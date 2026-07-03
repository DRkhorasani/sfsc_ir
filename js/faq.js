/*=========================================================
نام فایل: faq.js

وظیفه: صفحه سوالات متداول (FAQ) با قابلیت نمایش لیست سوالات،
جستجو، فیلتر، باز و بسته شدن خودکار، و صفحه‌بندی

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { api } from '../js/api.js';
import { utils } from '../js/utils.js';
import { FAQItemList } from '../components/faqItem.js';
import { Pagination } from '../components/pagination.js';

/*---------------------------------------------------------
کلاس FAQPage

وظیفه: مدیریت و رندر صفحه سوالات متداول

---------------------------------------------------------*/
class FAQPage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه سوالات متداول

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#faq',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._faqList = null;
        this._pagination = null;
        this._faqItems = [];
        this._filteredItems = [];
        this._currentPage = 1;
        this._itemsPerPage = 10;
        this._searchQuery = '';
        this._isLoading = false;
        this._searchDebounceTimer = null;
        this._openFirstByDefault = true;
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه سوالات متداول

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه سوالات متداول یافت نشد.');
            return;
        }

        // بارگذاری داده‌ها
        await this._loadData();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // مقداردهی کامپوننت‌ها
        this._initComponents();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ FAQPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadData

    وظیفه: بارگذاری داده‌های سوالات متداول از API

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadData() {
        try {
            this._isLoading = true;
            this._showLoading();

            const response = await api.get('/faq');
            if (response?.success && response?.data) {
                this._faqItems = response.data;
                this._filteredItems = [...this._faqItems];
            }

        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری سوالات متداول:', error);
            utils.toast(
                translator.translate('loadFAQError') || 'خطا در بارگذاری سوالات متداول.',
                'error'
            );
        } finally {
            this._isLoading = false;
            this._hideLoading();
        }
    }

    /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _buildPageStructure() {
        if (this._element.querySelector('.faq-page__wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'faq-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'faq-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="faqTitle">سوالات متداول</h2>
            <p class="section__subtitle" data-i18n="faqSub">پاسخ به سوالات رایج درباره محصولات و خدمات شرکت</p>
        `;
        wrapper.appendChild(header);

        // نوار ابزار (جستجو)
        const toolbar = document.createElement('div');
        toolbar.className = 'faq-page__toolbar';
        toolbar.innerHTML = `
            <div class="faq-page__search">
                <input type="text" id="faqSearchInput" class="auth__input" 
                       placeholder="${translator.translate('searchFAQ') || 'جستجوی سوالات...'}" 
                       data-placeholder="searchFAQ" />
                <button class="btn btn--primary" id="faqSearchBtn">
                    <i class="fas fa-search"></i>
                </button>
            </div>
            <div class="faq-page__actions">
                <button class="btn btn--outline" id="faqExpandAllBtn">
                    <i class="fas fa-plus-circle"></i> ${translator.translate('expandAll') || 'باز کردن همه'}
                </button>
                <button class="btn btn--outline" id="faqCollapseAllBtn">
                    <i class="fas fa-minus-circle"></i> ${translator.translate('collapseAll') || 'بستن همه'}
                </button>
            </div>
            <div class="faq-page__results">
                <span id="faqResultsCount">0 ${translator.translate('questions') || 'سوال'}</span>
            </div>
        `;
        wrapper.appendChild(toolbar);

        // کانتینر سوالات
        const faqContainer = document.createElement('div');
        faqContainer.id = 'faqContainer';
        faqContainer.className = 'faq__list';
        wrapper.appendChild(faqContainer);

        // کانتینر صفحه‌بندی
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'faqPagination';
        paginationContainer.className = 'faq-page__pagination';
        wrapper.appendChild(paginationContainer);

        // افزودن به صفحه
        this._element.appendChild(wrapper);

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(this._element);
            }, 50);
        }
    }

    /*---------------------------------------------------------
    متد _initComponents

    وظیفه: مقداردهی کامپوننت‌های صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _initComponents() {
        // ---- لیست سوالات ----
        const faqContainer = document.getElementById('faqContainer');
        if (faqContainer) {
            this._faqList = new FAQItemList(faqContainer, {
                openByDefault: this._openFirstByDefault,
                allowMultipleOpen: true,
                onToggle: (faq, isOpen) => {
                    // در صورت نیاز
                },
            });
            this._faqList.init();
        }

        // ---- صفحه‌بندی ----
        const paginationContainer = document.getElementById('faqPagination');
        if (paginationContainer) {
            this._pagination = new Pagination({
                totalItems: this._filteredItems.length,
                itemsPerPage: this._itemsPerPage,
                currentPage: this._currentPage,
                visiblePages: 5,
                showFirstLast: true,
                showPrevNext: true,
                showPageSize: true,
                pageSizes: [5, 10, 20, 50],
                onPageChange: (page) => {
                    this._currentPage = page;
                    this._renderFAQ();
                },
                onPageSizeChange: (size) => {
                    this._itemsPerPage = size;
                    this._currentPage = 1;
                    this._renderFAQ();
                },
            });
            paginationContainer.appendChild(this._pagination.render());
        }

        // رندر اولیه سوالات
        this._renderFAQ();
    }

    /*---------------------------------------------------------
    متد _renderFAQ

    وظیفه: رندر سوالات بر اساس جستجو و صفحه‌بندی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderFAQ() {
        if (!this._faqList) return;

        // اعمال فیلتر جستجو
        this._applyFilters();

        // محاسبه offset و limit
        const start = (this._currentPage - 1) * this._itemsPerPage;
        const end = Math.min(start + this._itemsPerPage, this._filteredItems.length);
        const pageItems = this._filteredItems.slice(start, end);

        // به‌روزرسانی لیست سوالات
        this._faqList.setFAQ(pageItems);

        // به‌روزرسانی تعداد نتایج
        const countEl = document.getElementById('faqResultsCount');
        if (countEl) {
            const total = this._filteredItems.length;
            const text = translator.translate('questions') || 'سوال';
            countEl.textContent = `${total} ${text}`;
        }

        // به‌روزرسانی صفحه‌بندی
        if (this._pagination) {
            this._pagination.setTotalItems(this._filteredItems.length);
            this._pagination.goToPage(this._currentPage);
        }

        // اگر نتیجه‌ای وجود نداشت، پیام نمایش داده شود
        if (this._filteredItems.length === 0) {
            const container = document.getElementById('faqContainer');
            if (container) {
                const emptyMsg = document.createElement('p');
                emptyMsg.className = 'text-center text-muted';
                emptyMsg.textContent = translator.translate('noFAQFound') || 'سوالی یافت نشد.';
                emptyMsg.setAttribute('data-i18n', 'noFAQFound');
                container.appendChild(emptyMsg);
                if (translator && translator.loaded) {
                    translator.translateElement(emptyMsg);
                }
            }
        } else {
            // اگر اولین سوال باز باشد
            if (this._openFirstByDefault && pageItems.length > 0) {
                const items = this._faqList.getItems();
                if (items.length > 0) {
                    // فقط اولین آیتم را باز می‌کنیم
                    items.forEach((item, index) => {
                        if (index === 0) {
                            item.open();
                        } else {
                            item.close();
                        }
                    });
                }
            }
        }
    }

    /*---------------------------------------------------------
    متد _applyFilters

    وظیفه: اعمال فیلتر جستجو

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _applyFilters() {
        let filtered = [...this._faqItems];

        // فیلتر جستجو
        if (this._searchQuery) {
            const query = this._searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item =>
                item.question?.toLowerCase().includes(query) ||
                item.answer?.toLowerCase().includes(query)
            );
        }

        this._filteredItems = filtered;
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // جستجو
        const searchInput = document.getElementById('faqSearchInput');
        const searchBtn = document.getElementById('faqSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this._searchDebounceTimer);
                this._searchDebounceTimer = setTimeout(() => {
                    this._searchQuery = e.target.value;
                    this._currentPage = 1;
                    this._renderFAQ();
                }, 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._searchQuery = searchInput.value;
                    this._currentPage = 1;
                    this._renderFAQ();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) {
                    this._searchQuery = searchInput.value;
                    this._currentPage = 1;
                    this._renderFAQ();
                }
            });
        }

        // دکمه باز کردن همه
        const expandBtn = document.getElementById('faqExpandAllBtn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                if (this._faqList) {
                    this._faqList.openAll();
                }
            });
        }

        // دکمه بستن همه
        const collapseBtn = document.getElementById('faqCollapseAllBtn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                if (this._faqList) {
                    this._faqList.closeAll();
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

    وظیفه: به‌روزرسانی زبان

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateLanguage() {
        if (this._faqList) {
            this._faqList._updateLanguage();
        }
        if (this._pagination) {
            this._pagination.setLanguage(this._language);
        }
        // به‌روزرسانی placeholder جستجو
        const searchInput = document.getElementById('faqSearchInput');
        if (searchInput) {
            searchInput.placeholder = translator.translate('searchFAQ') || 'جستجوی سوالات...';
        }
        // به‌روزرسانی دکمه‌ها
        const expandBtn = document.getElementById('faqExpandAllBtn');
        if (expandBtn) {
            expandBtn.innerHTML = `<i class="fas fa-plus-circle"></i> ${translator.translate('expandAll') || 'باز کردن همه'}`;
        }
        const collapseBtn = document.getElementById('faqCollapseAllBtn');
        if (collapseBtn) {
            collapseBtn.innerHTML = `<i class="fas fa-minus-circle"></i> ${translator.translate('collapseAll') || 'بستن همه'}`;
        }
        // به‌روزرسانی تعداد نتایج
        this._renderFAQ();
    }

    /*---------------------------------------------------------
    متد _showLoading

    وظیفه: نمایش وضعیت بارگذاری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _showLoading() {
        const container = document.getElementById('faqContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:3rem 0;">
                    <div class="spinner" style="margin:0 auto 1rem;"></div>
                    <p>${translator.translate('loading') || 'در حال بارگذاری...'}</p>
                </div>
            `;
        }
    }

    /*---------------------------------------------------------
    متد _hideLoading

    وظیفه: مخفی کردن وضعیت بارگذاری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _hideLoading() {
        // توسط _renderFAQ مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد search

    وظیفه: جستجوی سوالات با کلیدواژه مشخص

    ورودی‌ها: query (string)

    خروجی: void

    ---------------------------------------------------------*/
    search(query) {
        this._searchQuery = query || '';
        this._currentPage = 1;
        this._renderFAQ();

        // به‌روزرسانی input جستجو
        const searchInput = document.getElementById('faqSearchInput');
        if (searchInput) {
            searchInput.value = this._searchQuery;
        }
    }

    /*---------------------------------------------------------
    متد expandAll

    وظیفه: باز کردن تمام سوالات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    expandAll() {
        if (this._faqList) {
            this._faqList.openAll();
        }
    }

    /*---------------------------------------------------------
    متد collapseAll

    وظیفه: بستن تمام سوالات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    collapseAll() {
        if (this._faqList) {
            this._faqList.closeAll();
        }
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی کامل صفحه

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async refresh() {
        this._searchQuery = '';
        this._currentPage = 1;
        await this._loadData();
        this._renderFAQ();
        // به‌روزرسانی input جستجو
        const searchInput = document.getElementById('faqSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        if (this._faqList) {
            this._faqList.destroy();
            this._faqList = null;
        }
        if (this._pagination) {
            this._pagination.destroy();
            this._pagination = null;
        }
        clearTimeout(this._searchDebounceTimer);
        this._initialized = false;
        console.log('🧹 FAQPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { FAQPage };
export default FAQPage;