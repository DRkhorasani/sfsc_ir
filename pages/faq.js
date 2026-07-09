/*=========================================================
نام فایل: faq.js (صفحه)

وظیفه: کنترلر صفحه سوالات متداول – رندر UI، جستجو،
باز و بسته کردن آیتم‌ها، مدیریت رویدادها و استفاده از سرویس FAQ

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { FAQ } from '../js/faq.js';
import { utils } from '../js/utils.js';
import { router } from '../js/router.js';
import { FAQItemList } from '../components/faqItem.js';
import { Pagination } from '../components/pagination.js';

/*---------------------------------------------------------
کلاس FAQPage

وظیفه: مدیریت صفحه سوالات متداول

---------------------------------------------------------*/
class FAQPage {
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

    وظیفه: مقداردهی اولیه و رندر صفحه

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

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

        // رندر سوالات
        this._renderFAQ();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ FAQPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadData

    وظیفه: بارگذاری داده‌ها از سرویس

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadData() {
        try {
            this._isLoading = true;
            this._showLoading();
            this._faqItems = await FAQ.getFAQ();
            this._filteredItems = [...this._faqItems];
        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری سوالات:', error);
            this._faqItems = await FAQ.getFAQ(); // داده‌های نمونه
            this._filteredItems = [...this._faqItems];
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
        if (this._element.querySelector('.faq-page__wrapper')) return;

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

        // نوار ابزار (جستجو و دکمه‌ها)
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

        // پیام خالی بودن
        const emptyMsg = document.createElement('div');
        emptyMsg.id = 'faqEmptyMessage';
        emptyMsg.className = 'faq-page__empty hidden';
        emptyMsg.innerHTML = `
            <i class="fas fa-question-circle" style="font-size:3rem;color:#94a3b8;display:block;margin-bottom:1rem;"></i>
            <p data-i18n="noFAQFound">سوالی یافت نشد.</p>
        `;
        wrapper.appendChild(emptyMsg);

        this._element.appendChild(wrapper);

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => translator.translateElement(this._element), 50);
        }
    }

    /*---------------------------------------------------------
    متد _initComponents

    وظیفه: مقداردهی کامپوننت‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _initComponents() {
        // لیست سوالات
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

        // صفحه‌بندی
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
    }

    /*---------------------------------------------------------
    متد _renderFAQ

    وظیفه: رندر سوالات با اعمال فیلتر و صفحه‌بندی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderFAQ() {
        if (!this._faqList) return;

        const emptyMessage = document.getElementById('faqEmptyMessage');
        const countEl = document.getElementById('faqResultsCount');

        // اعمال فیلتر جستجو
        this._applyFilters();

        const totalItems = this._filteredItems.length;
        const currentPage = Math.min(this._currentPage, Math.ceil(totalItems / this._itemsPerPage) || 1);
        const start = (currentPage - 1) * this._itemsPerPage;
        const end = Math.min(start + this._itemsPerPage, totalItems);
        const pageItems = this._filteredItems.slice(start, end);

        // به‌روزرسانی تعداد
        if (countEl) {
            const text = translator.translate('questions') || 'سوال';
            countEl.textContent = `${totalItems} ${text}`;
        }

        // اگر نتیجه‌ای وجود نداشت
        if (totalItems === 0) {
            this._faqList.setFAQ([]);
            if (emptyMessage) emptyMessage.classList.remove('hidden');
            if (this._pagination) {
                this._pagination.setTotalItems(0);
                this._pagination.render();
            }
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('hidden');

        // به‌روزرسانی لیست
        this._faqList.setFAQ(pageItems);

        // به‌روزرسانی صفحه‌بندی
        if (this._pagination) {
            this._pagination.setTotalItems(totalItems);
            this._pagination.goToPage(currentPage);
        }

        // باز کردن اولین سوال (اگر تنظیم شده باشد)
        if (this._openFirstByDefault && pageItems.length > 0) {
            const items = this._faqList.getItems();
            if (items.length > 0) {
                items.forEach((item, index) => {
                    if (index === 0) item.open();
                    else item.close();
                });
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

        if (this._searchQuery && this._searchQuery.trim() !== '') {
            const query = this._searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item =>
                item.question?.toLowerCase().includes(query) ||
                item.answer?.toLowerCase().includes(query)
            );
        }

        this._filteredItems = filtered;
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

    _hideLoading() {
        // توسط _renderFAQ مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد _handleSearch

    وظیفه: مدیریت جستجوی سوالات

    ورودی‌ها: query (string)

    خروجی: void

    ---------------------------------------------------------*/
    _handleSearch(query) {
        this._searchQuery = query || '';
        this._currentPage = 1;
        this._renderFAQ();
    }

    /*---------------------------------------------------------
    متد _expandAll

    وظیفه: باز کردن تمام سوالات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _expandAll() {
        if (this._faqList) {
            this._faqList.openAll();
        }
    }

    /*---------------------------------------------------------
    متد _collapseAll

    وظیفه: بستن تمام سوالات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _collapseAll() {
        if (this._faqList) {
            this._faqList.closeAll();
        }
    }

    /*---------------------------------------------------------
    متد _refreshFAQ

    وظیفه: بازخوانی سوالات از سرور

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _refreshFAQ() {
        try {
            this._faqItems = await FAQ.refresh();
            this._filteredItems = [...this._faqItems];
            this._currentPage = 1;
            this._renderFAQ();
            utils.toast(
                translator.translate('faqRefreshed') || 'سوالات به‌روزرسانی شدند.',
                'success'
            );
        } catch (error) {
            utils.toast(
                translator.translate('refreshFailed') || 'به‌روزرسانی با شکست مواجه شد.',
                'error'
            );
        }
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
                    this._handleSearch(e.target.value);
                }, 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._handleSearch(searchInput.value);
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) {
                    this._handleSearch(searchInput.value);
                }
            });
        }

        // دکمه‌های باز و بسته کردن
        document.getElementById('faqExpandAllBtn')?.addEventListener('click', () => this._expandAll());
        document.getElementById('faqCollapseAllBtn')?.addEventListener('click', () => this._collapseAll());
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
        if (this._element && translator && translator.loaded) {
            translator.translateElement(this._element);
            // بازرندر سوالات
            this._renderFAQ();
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