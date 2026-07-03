/*=========================================================
نام فایل: services.js

وظیفه: صفحه خدمات با قابلیت نمایش لیست خدمات، جستجو،
فیلتر بر اساس نوع، درخواست خدمت، صفحه‌بندی و مشاهده جزییات

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { api } from '../js/api.js';
import { Modal } from '../js/modal.js';
import { utils } from '../js/utils.js';
import { ServiceCardList } from '../components/serviceCard.js';
import { Pagination } from '../components/pagination.js';

/*---------------------------------------------------------
کلاس ServicesPage

وظیفه: مدیریت و رندر صفحه خدمات

---------------------------------------------------------*/
class ServicesPage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه خدمات

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#services',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._serviceList = null;
        this._pagination = null;
        this._services = [];
        this._filteredServices = [];
        this._serviceTypes = [];
        this._currentPage = 1;
        this._itemsPerPage = 8;
        this._searchQuery = '';
        this._selectedType = '';
        this._isLoading = false;
        this._searchDebounceTimer = null;
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه خدمات

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه خدمات یافت نشد.');
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
        console.log('✅ ServicesPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadData

    وظیفه: بارگذاری داده‌های خدمات از API

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadData() {
        try {
            this._isLoading = true;
            this._showLoading();

            const response = await api.get('/services');
            if (response?.success && response?.data) {
                this._services = response.data;
                this._filteredServices = [...this._services];

                // استخراج انواع خدمات
                const types = new Set();
                this._services.forEach(service => {
                    if (service.type) {
                        types.add(service.type);
                    }
                });
                this._serviceTypes = Array.from(types);
            }

        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری خدمات:', error);
            utils.toast(
                translator.translate('loadServicesError') || 'خطا در بارگذاری خدمات.',
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
        if (this._element.querySelector('.services-page__wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'services-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'services-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="servicesTitle">خدمات تخصصی</h2>
            <p class="section__subtitle" data-i18n="servicesSub">ارائه خدمات نمونه‌گیری، تحلیل و تفسیر داده‌های آلرژن و اسپور قارچ</p>
        `;
        wrapper.appendChild(header);

        // نوار ابزار (جستجو و فیلتر)
        const toolbar = document.createElement('div');
        toolbar.className = 'services-page__toolbar';
        toolbar.innerHTML = `
            <div class="services-page__search">
                <input type="text" id="serviceSearchInput" class="auth__input" 
                       placeholder="${translator.translate('searchServices') || 'جستجوی خدمات...'}" 
                       data-placeholder="searchServices" />
                <button class="btn btn--primary" id="serviceSearchBtn">
                    <i class="fas fa-search"></i>
                </button>
            </div>
            <div class="services-page__filters">
                <select id="serviceTypeFilter" class="auth__input">
                    <option value="">${translator.translate('allTypes') || 'همه انواع'}</option>
                </select>
            </div>
            <div class="services-page__results">
                <span id="serviceResultsCount">0 ${translator.translate('services') || 'خدمت'}</span>
            </div>
        `;
        wrapper.appendChild(toolbar);

        // کانتینر خدمات
        const servicesContainer = document.createElement('div');
        servicesContainer.id = 'servicesList';
        servicesContainer.className = 'services__grid';
        wrapper.appendChild(servicesContainer);

        // کانتینر صفحه‌بندی
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'servicesPagination';
        paginationContainer.className = 'services-page__pagination';
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
        // ---- لیست خدمات ----
        const servicesContainer = document.getElementById('servicesList');
        if (servicesContainer) {
            this._serviceList = new ServiceCardList(servicesContainer, {
                showIcon: true,
                showDescription: true,
                showRequestButton: true,
                onRequest: (service, formData) => {
                    // ثبت درخواست خدمت
                    this._submitServiceRequest(service, formData);
                },
            });
            this._serviceList.init();
        }

        // ---- صفحه‌بندی ----
        const paginationContainer = document.getElementById('servicesPagination');
        if (paginationContainer) {
            this._pagination = new Pagination({
                totalItems: this._filteredServices.length,
                itemsPerPage: this._itemsPerPage,
                currentPage: this._currentPage,
                visiblePages: 5,
                showFirstLast: true,
                showPrevNext: true,
                showPageSize: true,
                pageSizes: [4, 8, 16, 32],
                onPageChange: (page) => {
                    this._currentPage = page;
                    this._renderServices();
                },
                onPageSizeChange: (size) => {
                    this._itemsPerPage = size;
                    this._currentPage = 1;
                    this._renderServices();
                },
            });
            paginationContainer.appendChild(this._pagination.render());
        }

        // پر کردن انواع خدمات
        this._populateTypes();

        // رندر اولیه خدمات
        this._renderServices();
    }

    /*---------------------------------------------------------
    متد _populateTypes

    وظیفه: پر کردن لیست انواع خدمات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _populateTypes() {
        const select = document.getElementById('serviceTypeFilter');
        if (!select) return;

        while (select.options.length > 1) {
            select.remove(1);
        }

        const typeLabels = {
            'sampling': translator.translate('typeSampling') || 'نمونه‌گیری',
            'analysis': translator.translate('typeAnalysis') || 'تحلیل',
            'consulting': translator.translate('typeConsulting') || 'مشاوره',
            'training': translator.translate('typeTraining') || 'آموزش',
        };

        this._serviceTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = typeLabels[type] || type;
            select.appendChild(option);
        });
    }

    /*---------------------------------------------------------
    متد _renderServices

    وظیفه: رندر خدمات بر اساس فیلترها و صفحه‌بندی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderServices() {
        if (!this._serviceList) return;

        // اعمال فیلترها
        this._applyFilters();

        // محاسبه offset و limit
        const start = (this._currentPage - 1) * this._itemsPerPage;
        const end = Math.min(start + this._itemsPerPage, this._filteredServices.length);
        const pageItems = this._filteredServices.slice(start, end);

        // به‌روزرسانی لیست خدمات
        this._serviceList.setServices(pageItems);

        // به‌روزرسانی تعداد نتایج
        const countEl = document.getElementById('serviceResultsCount');
        if (countEl) {
            const total = this._filteredServices.length;
            const text = translator.translate('services') || 'خدمت';
            countEl.textContent = `${total} ${text}`;
        }

        // به‌روزرسانی صفحه‌بندی
        if (this._pagination) {
            this._pagination.setTotalItems(this._filteredServices.length);
            this._pagination.goToPage(this._currentPage);
        }

        // اگر نتیجه‌ای وجود نداشت، پیام نمایش داده شود
        if (this._filteredServices.length === 0) {
            const container = document.getElementById('servicesList');
            if (container) {
                const emptyMsg = document.createElement('p');
                emptyMsg.className = 'text-center text-muted';
                emptyMsg.textContent = translator.translate('noServicesFound') || 'خدماتی یافت نشد.';
                emptyMsg.setAttribute('data-i18n', 'noServicesFound');
                container.appendChild(emptyMsg);
                if (translator && translator.loaded) {
                    translator.translateElement(emptyMsg);
                }
            }
        }
    }

    /*---------------------------------------------------------
    متد _applyFilters

    وظیفه: اعمال فیلترهای جستجو و نوع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _applyFilters() {
        let filtered = [...this._services];

        // فیلتر جستجو
        if (this._searchQuery) {
            const query = this._searchQuery.toLowerCase().trim();
            filtered = filtered.filter(service =>
                service.title?.toLowerCase().includes(query) ||
                service.description?.toLowerCase().includes(query) ||
                service.type?.toLowerCase().includes(query)
            );
        }

        // فیلتر نوع
        if (this._selectedType) {
            filtered = filtered.filter(service =>
                service.type === this._selectedType
            );
        }

        this._filteredServices = filtered;
    }

    /*---------------------------------------------------------
    متد _submitServiceRequest

    وظیفه: ارسال درخواست خدمت به سرور

    ورودی‌ها: service (object), formData (object)

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _submitServiceRequest(service, formData) {
        try {
            const data = {
                serviceId: service.id,
                serviceTitle: service.title,
                ...formData,
            };

            const response = await api.post('/services/request', data);
            if (response?.success) {
                utils.toast(
                    translator.translate('serviceRequestSubmitted') || 'درخواست خدمت با موفقیت ثبت شد.',
                    'success'
                );
            } else {
                throw new Error(response?.message || 'خطا در ثبت درخواست');
            }
        } catch (error) {
            console.error('❌ خطا در ثبت درخواست خدمت:', error);
            utils.toast(
                translator.translate('serviceRequestError') || 'خطا در ثبت درخواست. لطفاً مجدداً تلاش کنید.',
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
        const searchInput = document.getElementById('serviceSearchInput');
        const searchBtn = document.getElementById('serviceSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this._searchDebounceTimer);
                this._searchDebounceTimer = setTimeout(() => {
                    this._searchQuery = e.target.value;
                    this._currentPage = 1;
                    this._renderServices();
                }, 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._searchQuery = searchInput.value;
                    this._currentPage = 1;
                    this._renderServices();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) {
                    this._searchQuery = searchInput.value;
                    this._currentPage = 1;
                    this._renderServices();
                }
            });
        }

        // فیلتر نوع
        const typeFilter = document.getElementById('serviceTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this._selectedType = e.target.value;
                this._currentPage = 1;
                this._renderServices();
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
        if (this._serviceList) {
            this._serviceList._updateLanguage();
        }
        if (this._pagination) {
            this._pagination.setLanguage(this._language);
        }
        // به‌روزرسانی placeholder جستجو
        const searchInput = document.getElementById('serviceSearchInput');
        if (searchInput) {
            searchInput.placeholder = translator.translate('searchServices') || 'جستجوی خدمات...';
        }
        // به‌روزرسانی گزینه‌های فیلتر
        this._populateTypes();
        // به‌روزرسانی تعداد نتایج
        this._renderServices();
    }

    /*---------------------------------------------------------
    متد _showLoading

    وظیفه: نمایش وضعیت بارگذاری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _showLoading() {
        const container = document.getElementById('servicesList');
        if (container) {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:3rem 0;">
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
        // توسط _renderServices مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی کامل صفحه

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async refresh() {
        this._searchQuery = '';
        this._selectedType = '';
        this._currentPage = 1;
        await this._loadData();
        this._populateTypes();
        this._renderServices();
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        if (this._serviceList) {
            this._serviceList.destroy();
            this._serviceList = null;
        }
        if (this._pagination) {
            this._pagination.destroy();
            this._pagination = null;
        }
        clearTimeout(this._searchDebounceTimer);
        this._initialized = false;
        console.log('🧹 ServicesPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { ServicesPage };
export default ServicesPage;