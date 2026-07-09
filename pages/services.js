/*=========================================================
نام فایل: services.js (صفحه)

وظیفه: کنترلر صفحه خدمات – رندر UI، جستجو، فیلتر بر اساس نوع،
صفحه‌بندی، درخواست خدمت (با نمایش فرم مودال) و مدیریت رویدادها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Services } from '../js/services.js';
import { utils } from '../js/utils.js';
import { Modal } from '../js/modal.js';
import { ServiceCardList } from '../components/serviceCard.js';
import { Pagination } from '../components/pagination.js';

/*---------------------------------------------------------
کلاس ServicesPage

وظیفه: مدیریت صفحه خدمات

---------------------------------------------------------*/
class ServicesPage {
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
        this._types = [];
        this._currentPage = 1;
        this._itemsPerPage = 8;
        this._searchQuery = '';
        this._selectedType = '';
        this._isLoading = false;
        this._searchDebounceTimer = null;
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
            console.warn('⚠️ المان صفحه خدمات یافت نشد.');
            return;
        }

        // بارگذاری داده‌ها
        await this._loadData();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // مقداردهی کامپوننت‌ها
        this._initComponents();

        // رندر خدمات
        this._renderServices();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ ServicesPage مقداردهی شد.');
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
            this._services = await Services.getServices();
            this._types = await Services.getTypes();
            this._filteredServices = [...this._services];
        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری خدمات:', error);
            this._services = await Services.getServices(); // داده‌های نمونه
            this._types = await Services.getTypes();
            this._filteredServices = [...this._services];
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
        if (this._element.querySelector('.services-page__wrapper')) return;

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

        // پیام خالی بودن
        const emptyMsg = document.createElement('div');
        emptyMsg.id = 'servicesEmptyMessage';
        emptyMsg.className = 'services-page__empty hidden';
        emptyMsg.innerHTML = `
            <i class="fas fa-concierge-bell" style="font-size:3rem;color:#94a3b8;display:block;margin-bottom:1rem;"></i>
            <p data-i18n="noServicesFound">خدماتی یافت نشد.</p>
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
        // لیست خدمات
        const servicesContainer = document.getElementById('servicesList');
        if (servicesContainer) {
            this._serviceList = new ServiceCardList(servicesContainer, {
                showIcon: true,
                showDescription: true,
                showRequestButton: true,
                onRequest: (service) => {
                    this._showServiceRequestForm(service);
                },
            });
            this._serviceList.init();
        }

        // صفحه‌بندی
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

        // پر کردن انواع
        this._populateTypes();
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
            sampling: translator.translate('typeSampling') || 'نمونه‌گیری',
            analysis: translator.translate('typeAnalysis') || 'تحلیل',
            consulting: translator.translate('typeConsulting') || 'مشاوره',
            training: translator.translate('typeTraining') || 'آموزش',
            service: translator.translate('typeService') || 'خدمات فنی',
        };

        this._types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = typeLabels[type] || type;
            select.appendChild(option);
        });
    }

    /*---------------------------------------------------------
    متد _renderServices

    وظیفه: رندر خدمات با اعمال فیلترها و صفحه‌بندی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderServices() {
        if (!this._serviceList) return;

        const emptyMessage = document.getElementById('servicesEmptyMessage');
        const countEl = document.getElementById('serviceResultsCount');

        // اعمال فیلترها
        this._applyFilters();

        const totalItems = this._filteredServices.length;
        const currentPage = Math.min(this._currentPage, Math.ceil(totalItems / this._itemsPerPage) || 1);
        const start = (currentPage - 1) * this._itemsPerPage;
        const end = Math.min(start + this._itemsPerPage, totalItems);
        const pageItems = this._filteredServices.slice(start, end);

        // به‌روزرسانی تعداد
        if (countEl) {
            const text = translator.translate('services') || 'خدمت';
            countEl.textContent = `${totalItems} ${text}`;
        }

        // اگر نتیجه‌ای وجود نداشت
        if (totalItems === 0) {
            this._serviceList.setServices([]);
            if (emptyMessage) emptyMessage.classList.remove('hidden');
            if (this._pagination) {
                this._pagination.setTotalItems(0);
                this._pagination.render();
            }
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('hidden');

        // به‌روزرسانی لیست
        this._serviceList.setServices(pageItems);

        // به‌روزرسانی صفحه‌بندی
        if (this._pagination) {
            this._pagination.setTotalItems(totalItems);
            this._pagination.goToPage(currentPage);
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
        if (this._searchQuery && this._searchQuery.trim() !== '') {
            const query = this._searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item =>
                item.title?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.type?.toLowerCase().includes(query)
            );
        }

        // فیلتر نوع
        if (this._selectedType && this._selectedType.trim() !== '') {
            filtered = filtered.filter(item => item.type === this._selectedType);
        }

        this._filteredServices = filtered;
    }

    /*---------------------------------------------------------
    متد _showServiceRequestForm

    وظیفه: نمایش فرم درخواست خدمت در مودال و ثبت درخواست

    ورودی‌ها: service (object)

    خروجی: void

    ---------------------------------------------------------*/
    _showServiceRequestForm(service) {
        if (!service) return;

        const content = `
            <div class="service-request-modal">
                <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">
                    ${translator.translate('requestServiceTitle') || 'درخواست خدمت:'} ${service.title || ''}
                </h3>
                <form id="serviceRequestForm">
                    <div style="margin-bottom:0.75rem;">
                        <label style="display:block;font-weight:600;margin-bottom:0.25rem;">${translator.translate('fullName') || 'نام کامل'}</label>
                        <input type="text" id="servName" class="auth__input" 
                               placeholder="${translator.translate('fullName') || 'نام کامل'}" 
                               data-placeholder="fullName" required />
                    </div>
                    <div style="margin-bottom:0.75rem;">
                        <label style="display:block;font-weight:600;margin-bottom:0.25rem;">${translator.translate('phoneNumber') || 'شماره تماس'}</label>
                        <input type="tel" id="servPhone" class="auth__input" 
                               placeholder="${translator.translate('phoneNumber') || 'شماره تماس'}" 
                               data-placeholder="phoneNumber" required />
                    </div>
                    <div style="margin-bottom:0.75rem;">
                        <label style="display:block;font-weight:600;margin-bottom:0.25rem;">ایمیل</label>
                        <input type="email" id="servEmail" class="auth__input" 
                               placeholder="example@mail.com" required />
                    </div>
                    <div style="margin-bottom:0.75rem;">
                        <label style="display:block;font-weight:600;margin-bottom:0.25rem;">${translator.translate('requestDescription') || 'توضیحات درخواست'}</label>
                        <textarea id="servDesc" rows="4" class="auth__input" 
                                  placeholder="${translator.translate('requestDescription') || 'توضیحات درخواست'}" 
                                  data-placeholder="requestDescription" required></textarea>
                    </div>
                    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                        <button type="submit" class="btn btn--primary" style="flex:1;">
                            ${translator.translate('submitRequest') || 'ارسال درخواست'}
                        </button>
                        <button type="button" class="btn btn--outline" data-modal-close>
                            ${translator.translate('cancel') || 'انصراف'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        // باز کردن مودال با غیرفعال کردن بسته شدن با کلیک روی overlay
        const modalId = Modal.open(content, {
            maxWidth: '500px',
            className: 'service-request-modal',
            closeOnOverlay: false, // جلوگیری از بسته شدن با کلیک خارج از مودال
            closeOnEscape: true,   // اما با کلید Escape بسته شود
            onOpen: (modal) => {
                const form = modal.element.querySelector('#serviceRequestForm');
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const name = document.getElementById('servName')?.value?.trim();
                        const phone = document.getElementById('servPhone')?.value?.trim();
                        const email = document.getElementById('servEmail')?.value?.trim();
                        const desc = document.getElementById('servDesc')?.value?.trim();

                        if (!name || !phone || !email || !desc) {
                            utils.toast(
                                translator.translate('fillRequiredFields') || 'لطفاً تمام فیلدهای ضروری را پر کنید.',
                                'error'
                            );
                            return;
                        }

                        // بستن مودال
                        Modal.close(modal.id);

                        // ارسال درخواست به سرور
                        try {
                            const result = await Services.requestService(service.id, {
                                name,
                                phone,
                                email,
                                description: desc,
                            });
                            if (result.success) {
                                utils.toast(
                                    result.message || translator.translate('serviceRequestSubmitted') || 'درخواست خدمت با موفقیت ثبت شد.',
                                    'success'
                                );
                            }
                        } catch (error) {
                            utils.toast(
                                error.message || translator.translate('serviceRequestError') || 'خطا در ثبت درخواست خدمت.',
                                'error'
                            );
                        }
                    });
                }

                const closeBtn = modal.element.querySelector('[data-modal-close]');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        Modal.close(modal.id);
                    });
                }

                // ترجمه محتوای مودال
                if (translator && translator.loaded) {
                    setTimeout(() => {
                        translator.translateElement(modal.element);
                    }, 50);
                }
            },
        });
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

    _hideLoading() {
        // توسط _renderServices مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد _handleSearch

    وظیفه: مدیریت جستجوی خدمات

    ورودی‌ها: query (string)

    خروجی: void

    ---------------------------------------------------------*/
    _handleSearch(query) {
        this._searchQuery = query || '';
        this._currentPage = 1;
        this._renderServices();
    }

    /*---------------------------------------------------------
    متد _handleTypeFilter

    وظیفه: مدیریت فیلتر نوع

    ورودی‌ها: type (string)

    خروجی: void

    ---------------------------------------------------------*/
    _handleTypeFilter(type) {
        this._selectedType = type || '';
        this._currentPage = 1;
        this._renderServices();
    }

    /*---------------------------------------------------------
    متد _refreshServices

    وظیفه: بازخوانی خدمات از سرور

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _refreshServices() {
        try {
            this._services = await Services.refresh();
            this._types = await Services.getTypes();
            this._filteredServices = [...this._services];
            this._currentPage = 1;
            this._populateTypes();
            this._renderServices();
            utils.toast(
                translator.translate('servicesRefreshed') || 'خدمات به‌روزرسانی شدند.',
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
        const searchInput = document.getElementById('serviceSearchInput');
        const searchBtn = document.getElementById('serviceSearchBtn');

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

        // فیلتر نوع
        const typeFilter = document.getElementById('serviceTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this._handleTypeFilter(e.target.value);
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
        if (this._element && translator && translator.loaded) {
            translator.translateElement(this._element);
            // بازرندر گزینه‌های فیلتر
            this._populateTypes();
            // بازرندر خدمات
            this._renderServices();
        }
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