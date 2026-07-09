/*=========================================================
نام فایل: orders.js

وظیفه: صفحه سفارشات با نمایش لیست سفارشات کاربر، جزییات هر سفارش،
وضعیت سفارش، فیلتر بر اساس وضعیت، و امکان لغو سفارش

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { api } from '../js/api.js';
import { Auth } from '../js/auth.js';
import { utils } from '../js/utils.js';
import { router } from '../js/router.js';
import { Modal } from '../js/modal.js';
import { Pagination } from '../components/pagination.js';

/*---------------------------------------------------------
کلاس OrdersPage

وظیفه: مدیریت و رندر صفحه سفارشات

---------------------------------------------------------*/
class OrdersPage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه سفارشات

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#orders',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._orders = [];
        this._filteredOrders = [];
        this._currentPage = 1;
        this._itemsPerPage = 10;
        this._statusFilter = '';
        this._isLoading = false;
        this._pagination = null;
        this._selectedOrder = null;
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه سفارشات

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه سفارشات یافت نشد.');
            return;
        }

        // بررسی احراز هویت
        if (!Auth.isAuthenticated()) {
            router.navigate('login');
            return;
        }

        // بارگذاری داده‌ها
        await this._loadOrders();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // رندر سفارشات
        this._renderOrders();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ OrdersPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadOrders

    وظیفه: بارگذاری لیست سفارشات از API

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadOrders() {
        try {
            this._isLoading = true;
            this._showLoading();

            const response = await api.get('/orders');
            if (response?.success && response?.data) {
                this._orders = response.data;
                this._filteredOrders = [...this._orders];
            } else {
                // در صورت نبود داده، از داده‌های نمونه استفاده می‌شود
                this._orders = this._getMockOrders();
                this._filteredOrders = [...this._orders];
            }

        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری سفارشات:', error);
            this._orders = this._getMockOrders();
            this._filteredOrders = [...this._orders];
            utils.toast(
                translator.translate('loadOrdersError') || 'خطا در بارگذاری سفارشات.',
                'error'
            );
        } finally {
            this._isLoading = false;
            this._hideLoading();
        }
    }

    /*---------------------------------------------------------
    متد _getMockOrders

    وظیفه: دریافت داده‌های نمونه سفارشات

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    _getMockOrders() {
        return [
            {
                id: 'ORD-001',
                date: '۱۴۰۵/۰۴/۱۰',
                total: 720000000,
                status: 'delivered',
                items: [
                    { id: 1, title: 'دستگاه نمونه‌گیر خودکار آلاینده‌های بیولوژیک هوا', quantity: 1, price: 720000000 },
                ],
                customer: 'شرکت نمونه',
                address: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
                trackingCode: 'TRK-123456',
            },
            {
                id: 'ORD-002',
                date: '۱۴۰۵/۰۴/۰۸',
                total: 390000000,
                status: 'processing',
                items: [
                    { id: 2, title: 'نمونه‌گیر هوای اماکن (Indoor Air Sampler)', quantity: 1, price: 390000000 },
                ],
                customer: 'آزمایشگاه مرکزی',
                address: 'اصفهان، خیابان دانشگاه، پلاک ۴۵',
                trackingCode: null,
            },
            {
                id: 'ORD-003',
                date: '۱۴۰۵/۰۴/۰۵',
                total: 820000000,
                status: 'pending',
                items: [
                    { id: 4, title: 'دستگاه پایش هوای آلرژن مدل SFS-5000', quantity: 1, price: 820000000 },
                ],
                customer: 'دانشگاه علوم پزشکی',
                address: 'شیراز، بلوار مدرس، پلاک ۷۸',
                trackingCode: null,
            },
            {
                id: 'ORD-004',
                date: '۱۴۰۵/۰۳/۲۸',
                total: 1500000000,
                status: 'delivered',
                items: [
                    { id: 1, title: 'دستگاه نمونه‌گیر خودکار آلاینده‌های بیولوژیک هوا', quantity: 2, price: 720000000 },
                ],
                customer: 'مرکز تحقیقات کشاورزی',
                address: 'اهواز، دانشگاه شهید چمران، مرکز رشد',
                trackingCode: 'TRK-789012',
            },
            {
                id: 'ORD-005',
                date: '۱۴۰۵/۰۳/۲۰',
                total: 590000000,
                status: 'cancelled',
                items: [
                    { id: 3, title: 'دستگاه اسپورتراپ دیجیتال (Spore Trap Pro)', quantity: 1, price: 590000000 },
                ],
                customer: 'بیمارستان امام خمینی',
                address: 'تهران، خیابان کارگر، پلاک ۵۶',
                trackingCode: null,
            },
            {
                id: 'ORD-006',
                date: '۱۴۰۵/۰۴/۰۱',
                total: 750000000,
                status: 'processing',
                items: [
                    { id: 5, title: 'تله حجمی اسپور ۷ روزه (مدل SFS-7000)', quantity: 1, price: 750000000 },
                ],
                customer: 'ایستگاه پایش محیط زیست',
                address: 'کرمانشاه، بلوار طاق‌بستان، پلاک ۳۴',
                trackingCode: null,
            },
        ];
    }

    /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _buildPageStructure() {
        if (this._element.querySelector('.orders-page__wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'orders-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'orders-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="ordersTitle">سفارشات</h2>
            <p class="section__subtitle" data-i18n="ordersSub">لیست سفارشات ثبت شده شما</p>
        `;
        wrapper.appendChild(header);

        // نوار ابزار (فیلتر وضعیت)
        const toolbar = document.createElement('div');
        toolbar.className = 'orders-page__toolbar';
        toolbar.innerHTML = `
            <div class="orders-page__filters">
                <select id="ordersStatusFilter" class="auth__input">
                    <option value="" data-i18n="allStatus">همه وضعیت‌ها</option>
                    <option value="pending" data-i18n="statusPending">در انتظار</option>
                    <option value="processing" data-i18n="statusProcessing">در حال پردازش</option>
                    <option value="delivered" data-i18n="statusDelivered">تحویل داده شد</option>
                    <option value="cancelled" data-i18n="statusCancelled">لغو شده</option>
                </select>
            </div>
            <div class="orders-page__results">
                <span id="ordersResultsCount">0 ${translator.translate('orders') || 'سفارش'}</span>
            </div>
            <button class="btn btn--primary" id="ordersRefreshBtn">
                <i class="fas fa-sync-alt"></i> ${translator.translate('refresh') || 'به‌روزرسانی'}
            </button>
        `;
        wrapper.appendChild(toolbar);

        // کانتینر لیست سفارشات
        const listContainer = document.createElement('div');
        listContainer.id = 'ordersList';
        listContainer.className = 'orders-page__list';
        wrapper.appendChild(listContainer);

        // کانتینر صفحه‌بندی
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'ordersPagination';
        paginationContainer.className = 'orders-page__pagination';
        wrapper.appendChild(paginationContainer);

        // پیام خالی بودن
        const emptyMsg = document.createElement('div');
        emptyMsg.id = 'ordersEmptyMessage';
        emptyMsg.className = 'orders-page__empty hidden';
        emptyMsg.innerHTML = `
            <i class="fas fa-box" style="font-size:3rem;color:#94a3b8;display:block;margin-bottom:1rem;"></i>
            <p data-i18n="noOrders">هیچ سفارشی یافت نشد.</p>
            <a href="#products" class="btn btn--primary" style="margin-top:1rem;">
                ${translator.translate('startShopping') || 'شروع خرید'}
            </a>
        `;
        wrapper.appendChild(emptyMsg);

        this._element.appendChild(wrapper);

        // پر کردن گزینه‌های فیلتر با ترجمه
        this._populateFilterOptions();

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(this._element);
            }, 50);
        }
    }

    /*---------------------------------------------------------
    متد _populateFilterOptions

    وظیفه: پر کردن گزینه‌های فیلتر وضعیت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _populateFilterOptions() {
        const select = document.getElementById('ordersStatusFilter');
        if (!select) return;

        const options = [
            { value: '', key: 'allStatus' },
            { value: 'pending', key: 'statusPending' },
            { value: 'processing', key: 'statusProcessing' },
            { value: 'delivered', key: 'statusDelivered' },
            { value: 'cancelled', key: 'statusCancelled' },
        ];

        options.forEach((opt, index) => {
            if (index === 0) {
                // گزینه اول از قبل وجود دارد
                const firstOption = select.options[0];
                if (firstOption) {
                    firstOption.value = opt.value;
                    firstOption.textContent = translator.translate(opt.key) || opt.key;
                    firstOption.setAttribute('data-i18n', opt.key);
                }
            } else {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = translator.translate(opt.key) || opt.key;
                option.setAttribute('data-i18n', opt.key);
                select.appendChild(option);
            }
        });
    }

    /*---------------------------------------------------------
    متد _renderOrders

    وظیفه: رندر کردن لیست سفارشات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderOrders() {
        const listContainer = document.getElementById('ordersList');
        const emptyMessage = document.getElementById('ordersEmptyMessage');
        const countEl = document.getElementById('ordersResultsCount');

        if (!listContainer) return;

        // اعمال فیلترها
        this._applyFilters();

        // محاسبه صفحه‌بندی
        const totalItems = this._filteredOrders.length;
        const totalPages = Math.ceil(totalItems / this._itemsPerPage);
        const currentPage = Math.min(this._currentPage, totalPages || 1);
        const start = (currentPage - 1) * this._itemsPerPage;
        const end = Math.min(start + this._itemsPerPage, totalItems);
        const pageItems = this._filteredOrders.slice(start, end);

        // به‌روزرسانی تعداد
        if (countEl) {
            const text = translator.translate('orders') || 'سفارش';
            countEl.textContent = `${totalItems} ${text}`;
        }

        // اگر سفارشی وجود نداشت
        if (totalItems === 0) {
            listContainer.innerHTML = '';
            if (emptyMessage) emptyMessage.classList.remove('hidden');
            if (this._pagination) {
                this._pagination.setTotalItems(0);
                this._pagination.render();
            }
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('hidden');

        // رندر هر سفارش
        listContainer.innerHTML = pageItems.map(order => {
            const statusLabels = {
                pending: translator.translate('statusPending') || 'در انتظار',
                processing: translator.translate('statusProcessing') || 'در حال پردازش',
                delivered: translator.translate('statusDelivered') || 'تحویل داده شد',
                cancelled: translator.translate('statusCancelled') || 'لغو شده',
            };
            const statusColors = {
                pending: '#f97316',
                processing: '#2563eb',
                delivered: '#22c55e',
                cancelled: '#ef4444',
            };
            const statusClass = order.status || 'pending';

            const itemsList = order.items.map(item =>
                `<div class="orders-page__order-item-mini">
                    <span>${item.title}</span>
                    <span>${utils.formatPrice(item.price)} × ${item.quantity}</span>
                </div>`
            ).join('');

            const trackingHtml = order.trackingCode
                ? `<div class="orders-page__order-tracking">
                    <i class="fas fa-truck"></i>
                    <span>${translator.translate('trackingCode') || 'کد رهگیری:'} ${order.trackingCode}</span>
                   </div>`
                : '';

            return `
                <div class="orders-page__order-card" data-order-id="${order.id}">
                    <div class="orders-page__order-header">
                        <div class="orders-page__order-id">
                            <span class="orders-page__order-label">${translator.translate('orderId') || 'شماره سفارش'}:</span>
                            <span class="orders-page__order-value">${order.id}</span>
                        </div>
                        <div class="orders-page__order-status">
                            <span class="orders-page__order-status-badge" style="background:${statusColors[statusClass]}22;color:${statusColors[statusClass]};">
                                ${statusLabels[statusClass] || order.status}
                            </span>
                            <span class="orders-page__order-date">${order.date || ''}</span>
                        </div>
                    </div>
                    <div class="orders-page__order-body">
                        <div class="orders-page__order-items">
                            ${itemsList}
                        </div>
                        <div class="orders-page__order-summary">
                            <div class="orders-page__order-total">
                                <span>${translator.translate('total') || 'جمع کل:'}</span>
                                <span class="orders-page__order-total-price">${utils.formatPrice(order.total)}</span>
                            </div>
                            ${trackingHtml}
                            <div class="orders-page__order-actions">
                                <button class="btn btn--primary btn--sm" data-action="view-details" data-order-id="${order.id}">
                                    <i class="fas fa-eye"></i> ${translator.translate('viewDetails') || 'جزییات'}
                                </button>
                                ${order.status === 'pending' || order.status === 'processing' ? `
                                    <button class="btn btn--danger btn--sm" data-action="cancel-order" data-order-id="${order.id}">
                                        <i class="fas fa-times"></i> ${translator.translate('cancel') || 'لغو'}
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // به‌روزرسانی صفحه‌بندی
        if (this._pagination) {
            this._pagination.setTotalItems(totalItems);
            this._pagination.goToPage(currentPage);
        } else {
            // ایجاد صفحه‌بندی
            const paginationContainer = document.getElementById('ordersPagination');
            if (paginationContainer) {
                this._pagination = new Pagination({
                    totalItems: totalItems,
                    itemsPerPage: this._itemsPerPage,
                    currentPage: currentPage,
                    visiblePages: 5,
                    showFirstLast: true,
                    showPrevNext: true,
                    showPageSize: true,
                    pageSizes: [5, 10, 20, 50],
                    onPageChange: (page) => {
                        this._currentPage = page;
                        this._renderOrders();
                    },
                    onPageSizeChange: (size) => {
                        this._itemsPerPage = size;
                        this._currentPage = 1;
                        this._renderOrders();
                    },
                });
                paginationContainer.appendChild(this._pagination.render());
            }
        }

        // ذخیره وضعیت فیلتر در sessionStorage برای حفظ در بازخوانی
        try {
            sessionStorage.setItem('orders_filter_status', this._statusFilter);
            sessionStorage.setItem('orders_page', String(this._currentPage));
        } catch (e) {}
    }

    /*---------------------------------------------------------
    متد _applyFilters

    وظیفه: اعمال فیلتر وضعیت روی سفارشات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _applyFilters() {
        let filtered = [...this._orders];

        if (this._statusFilter) {
            filtered = filtered.filter(order => order.status === this._statusFilter);
        }

        // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
        filtered.sort((a, b) => {
            const dateA = new Date(a.date?.split('/').reverse().join('-') || 0);
            const dateB = new Date(b.date?.split('/').reverse().join('-') || 0);
            return dateB - dateA;
        });

        this._filteredOrders = filtered;
    }

    /*---------------------------------------------------------
    متد _showLoading

    وظیفه: نمایش وضعیت بارگذاری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _showLoading() {
        const listContainer = document.getElementById('ordersList');
        if (listContainer) {
            listContainer.innerHTML = `
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
        // توسط _renderOrders مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد _viewOrderDetails

    وظیفه: نمایش جزییات کامل یک سفارش در مودال

    ورودی‌ها: orderId (string)

    خروجی: void

    ---------------------------------------------------------*/
    _viewOrderDetails(orderId) {
        const order = this._orders.find(o => o.id === orderId);
        if (!order) {
            utils.toast(
                translator.translate('orderNotFound') || 'سفارش یافت نشد.',
                'error'
            );
            return;
        }

        const statusLabels = {
            pending: translator.translate('statusPending') || 'در انتظار',
            processing: translator.translate('statusProcessing') || 'در حال پردازش',
            delivered: translator.translate('statusDelivered') || 'تحویل داده شد',
            cancelled: translator.translate('statusCancelled') || 'لغو شده',
        };
        const statusColors = {
            pending: '#f97316',
            processing: '#2563eb',
            delivered: '#22c55e',
            cancelled: '#ef4444',
        };
        const statusClass = order.status || 'pending';

        const itemsHtml = order.items.map(item => `
            <div class="orders-page__detail-item">
                <span>${item.title}</span>
                <span>${utils.formatPrice(item.price)} × ${item.quantity} = ${utils.formatPrice(item.price * item.quantity)}</span>
            </div>
        `).join('');

        const content = `
            <div class="orders-page__detail">
                <div class="orders-page__detail-header">
                    <h3 style="font-size:1.25rem;font-weight:700;">
                        ${translator.translate('orderId') || 'شماره سفارش'}: ${order.id}
                    </h3>
                    <span class="orders-page__order-status-badge" style="background:${statusColors[statusClass]}22;color:${statusColors[statusClass]};font-size:0.9rem;padding:0.25rem 0.75rem;border-radius:9999px;">
                        ${statusLabels[statusClass] || order.status}
                    </span>
                </div>
                <div class="orders-page__detail-body">
                    <div class="orders-page__detail-row">
                        <span class="orders-page__detail-label">${translator.translate('date') || 'تاریخ:'}</span>
                        <span>${order.date || '-'}</span>
                    </div>
                    <div class="orders-page__detail-row">
                        <span class="orders-page__detail-label">${translator.translate('customer') || 'مشتری:'}</span>
                        <span>${order.customer || '-'}</span>
                    </div>
                    <div class="orders-page__detail-row">
                        <span class="orders-page__detail-label">${translator.translate('address') || 'آدرس:'}</span>
                        <span>${order.address || '-'}</span>
                    </div>
                    ${order.trackingCode ? `
                        <div class="orders-page__detail-row">
                            <span class="orders-page__detail-label">${translator.translate('trackingCode') || 'کد رهگیری:'}</span>
                            <span style="color:#2563eb;font-weight:600;">${order.trackingCode}</span>
                        </div>
                    ` : ''}
                    <div class="orders-page__detail-items">
                        <h4 style="font-weight:600;margin-bottom:0.5rem;">${translator.translate('items') || 'محصولات:'}</h4>
                        ${itemsHtml}
                    </div>
                    <div class="orders-page__detail-total">
                        <span style="font-weight:700;">${translator.translate('total') || 'جمع کل:'}</span>
                        <span style="font-size:1.25rem;font-weight:700;color:#2563eb;">${utils.formatPrice(order.total)}</span>
                    </div>
                </div>
                <div class="orders-page__detail-actions" style="display:flex;gap:0.75rem;margin-top:1rem;border-top:1px solid #e2e8f0;padding-top:1rem;">
                    <button class="btn btn--primary" onclick="window.__MODAL__?.closeLast()">
                        ${translator.translate('close') || 'بستن'}
                    </button>
                    ${order.status === 'pending' || order.status === 'processing' ? `
                        <button class="btn btn--danger" data-action="cancel-order" data-order-id="${order.id}">
                            <i class="fas fa-times"></i> ${translator.translate('cancel') || 'لغو سفارش'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        const modalId = Modal.open(content, {
            maxWidth: '600px',
            className: 'order-detail-modal',
            onOpen: (modal) => {
                // مدیریت لغو سفارش از داخل مودال
                const cancelBtn = modal.element.querySelector('[data-action="cancel-order"]');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        Modal.close(modal.id);
                        this._cancelOrder(order.id);
                    });
                }

                // ترجمه
                if (translator && translator.loaded) {
                    setTimeout(() => {
                        translator.translateElement(modal.element);
                    }, 50);
                }
            },
        });
    }

    /*---------------------------------------------------------
    متد _cancelOrder

    وظیفه: لغو یک سفارش

    ورودی‌ها: orderId (string)

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _cancelOrder(orderId) {
        const order = this._orders.find(o => o.id === orderId);
        if (!order) {
            utils.toast(
                translator.translate('orderNotFound') || 'سفارش یافت نشد.',
                'error'
            );
            return;
        }

        if (order.status === 'delivered' || order.status === 'cancelled') {
            utils.toast(
                translator.translate('cannotCancelOrder') || 'این سفارش قابل لغو نیست.',
                'warning'
            );
            return;
        }

        Modal.showConfirm(
            translator.translate('cancelOrderConfirm') || 'آیا از لغو این سفارش اطمینان دارید؟',
            async () => {
                try {
                    const response = await api.post(`/orders/${orderId}/cancel`);

                    if (response?.success) {
                        // به‌روزرسانی وضعیت سفارش
                        order.status = 'cancelled';
                        this._renderOrders();

                        utils.toast(
                            response.message || translator.translate('orderCancelled') || 'سفارش با موفقیت لغو شد.',
                            'success'
                        );
                    } else {
                        utils.toast(
                            response.message || translator.translate('cancelOrderFailed') || 'لغو سفارش با شکست مواجه شد.',
                            'error'
                        );
                    }
                } catch (error) {
                    utils.toast(
                        error.message || translator.translate('cancelOrderError') || 'خطا در لغو سفارش.',
                        'error'
                    );
                }
            },
            null,
            {
                className: 'cancel-order-confirm-modal',
                maxWidth: '450px',
            }
        );
    }

    /*---------------------------------------------------------
    متد _refreshOrders

    وظیفه: بازخوانی سفارشات از سرور

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _refreshOrders() {
        const btn = document.getElementById('ordersRefreshBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translator.translate('refreshing') || 'در حال به‌روزرسانی...'}`;
        }

        try {
            await this._loadOrders();
            this._renderOrders();
            utils.toast(
                translator.translate('ordersRefreshed') || 'سفارشات به‌روزرسانی شدند.',
                'success'
            );
        } catch (error) {
            utils.toast(
                translator.translate('refreshFailed') || 'به‌روزرسانی با شکست مواجه شد.',
                'error'
            );
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fas fa-sync-alt"></i> ${translator.translate('refresh') || 'به‌روزرسانی'}`;
            }
        }
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // Event Delegation برای دکمه‌های داخل سفارشات
        document.addEventListener('click', (e) => {
            // جزییات سفارش
            const detailBtn = e.target.closest('[data-action="view-details"]');
            if (detailBtn) {
                const orderId = detailBtn.dataset.orderId;
                if (orderId) {
                    this._viewOrderDetails(orderId);
                }
                return;
            }

            // لغو سفارش
            const cancelBtn = e.target.closest('[data-action="cancel-order"]');
            if (cancelBtn) {
                const orderId = cancelBtn.dataset.orderId;
                if (orderId) {
                    this._cancelOrder(orderId);
                }
                return;
            }
        });

        // فیلتر وضعیت
        const filterSelect = document.getElementById('ordersStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this._statusFilter = e.target.value;
                this._currentPage = 1;
                this._renderOrders();
            });

            // بازیابی فیلتر از sessionStorage
            try {
                const savedFilter = sessionStorage.getItem('orders_filter_status');
                if (savedFilter) {
                    this._statusFilter = savedFilter;
                    filterSelect.value = savedFilter;
                }
                const savedPage = parseInt(sessionStorage.getItem('orders_page'), 10);
                if (savedPage && savedPage > 0) {
                    this._currentPage = savedPage;
                }
            } catch (e) {}
        }

        // دکمه به‌روزرسانی
        const refreshBtn = document.getElementById('ordersRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this._refreshOrders();
            });
        }

        // لینک شروع خرید
        const startBtn = document.querySelector('#ordersEmptyMessage .btn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                router.navigate('products');
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

        // رویداد تغییر احراز هویت
        document.addEventListener('authChanged', (e) => {
            if (!e.detail.isAuthenticated) {
                router.navigate('login');
            } else {
                this._refreshOrders();
            }
        });

        // رویداد ثبت سفارش جدید (از صفحه سبد خرید)
        document.addEventListener('orderPlaced', () => {
            this._refreshOrders();
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
            this._populateFilterOptions();
            // بازرندر سفارشات
            this._renderOrders();
        }
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        if (this._pagination) {
            this._pagination.destroy();
            this._pagination = null;
        }
        this._initialized = false;
        console.log('🧹 OrdersPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { OrdersPage };
export default OrdersPage;