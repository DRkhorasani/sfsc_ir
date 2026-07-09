/*=========================================================
نام فایل: dashboard.js (صفحه)

وظیفه: کنترلر صفحه داشبورد – رندر UI، مدیریت رویدادها،
استفاده از سرویس Dashboard و کامپوننت‌ها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Dashboard } from '../js/dashboard.js';
import { Auth } from '../js/auth.js';
import { router } from '../js/router.js';
import { utils } from '../js/utils.js';
import { Modal } from '../js/modal.js';

/*---------------------------------------------------------
کلاس DashboardPage

وظیفه: مدیریت صفحه داشبورد

---------------------------------------------------------*/
class DashboardPage {
    constructor(options = {}) {
        this.options = {
            container: '#dashboard',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._isLoading = false;
        this._data = null;
        this._refreshInterval = null;
        this._refreshIntervalTime = 60000; // ۱ دقیقه
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
            console.warn('⚠️ المان صفحه داشبورد یافت نشد.');
            return;
        }
        
    const currentRoute = router.getCurrentRoute();
    if (currentRoute?.id !== 'dashboard') {
         return;
}

        // بررسی احراز هویت
        if (!Auth.isAuthenticated()) {
            router.navigate('login');
            return;
        }

        // بارگذاری داده‌ها
        await this._loadData();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // رندر داده‌ها
        this._renderDashboard();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        // شروع به‌روزرسانی خودکار
        this._startAutoRefresh();

        this._initialized = true;
        console.log('✅ DashboardPage مقداردهی شد.');
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
            this._data = await Dashboard.getDashboardData();
        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری داده‌ها:', error);
            this._data = await Dashboard.getDashboardData(); // داده‌های نمونه
            utils.toast(
                translator.translate('dashboardLoadError') || 'خطا در بارگذاری داده‌های داشبورد.',
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
        if (this._element.querySelector('.dashboard-page__wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'dashboard-page__wrapper';

        // هدر
        const header = document.createElement('div');
        header.className = 'dashboard-page__header';
        const user = Auth.getCurrentUser();
        header.innerHTML = `
            <div>
                <h2 class="section__title" data-i18n="dashboardTitle">داشبورد</h2>
                <p class="section__subtitle" data-i18n="dashboardSub">خلاصه وضعیت سیستم و فعالیت‌ها</p>
            </div>
            <div class="dashboard-page__user">
                <span class="dashboard-page__user-name">${user?.username || 'کاربر'}</span>
                <div class="dashboard-page__user-avatar"><i class="fas fa-user"></i></div>
            </div>
        `;
        wrapper.appendChild(header);

        // آمارها
        const statsGrid = document.createElement('div');
        statsGrid.id = 'dashboardStats';
        statsGrid.className = 'dashboard-page__stats';
        wrapper.appendChild(statsGrid);

        // نمودار
        const chartsSection = document.createElement('div');
        chartsSection.className = 'dashboard-page__charts';
        chartsSection.innerHTML = `
            <div class="dashboard-page__chart-card">
                <h3 data-i18n="dashboardChartTitle">روند نمونه‌گیری</h3>
                <div id="dashboardChart" class="dashboard-page__chart-container"></div>
            </div>
        `;
        wrapper.appendChild(chartsSection);

        // دو ستون: فعالیت‌ها و دستگاه‌ها
        const twoCol = document.createElement('div');
        twoCol.className = 'dashboard-page__two-col';

        const activities = document.createElement('div');
        activities.className = 'dashboard-page__card';
        activities.innerHTML = `
            <h3 data-i18n="recentActivities">فعالیت‌های اخیر</h3>
            <div id="recentActivitiesList" class="dashboard-page__activity-list"></div>
        `;
        twoCol.appendChild(activities);

        const devices = document.createElement('div');
        devices.className = 'dashboard-page__card';
        devices.innerHTML = `
            <h3 data-i18n="devicesStatus">وضعیت دستگاه‌ها</h3>
            <div id="devicesList" class="dashboard-page__devices-list"></div>
        `;
        twoCol.appendChild(devices);

        wrapper.appendChild(twoCol);

        // سفارشات اخیر
        const ordersSection = document.createElement('div');
        ordersSection.className = 'dashboard-page__card dashboard-page__orders';
        ordersSection.innerHTML = `
            <h3 data-i18n="recentOrders">سفارشات اخیر</h3>
            <div id="recentOrdersList" class="dashboard-page__orders-list"></div>
        `;
        wrapper.appendChild(ordersSection);

        // دکمه‌های اقدام
        const actions = document.createElement('div');
        actions.className = 'dashboard-page__actions';
        actions.innerHTML = `
            <button class="btn btn--primary" id="dashboardRefreshBtn">
                <i class="fas fa-sync-alt"></i> ${translator.translate('refresh') || 'به‌روزرسانی'}
            </button>
            <button class="btn btn--outline" id="dashboardExportBtn">
                <i class="fas fa-download"></i> ${translator.translate('exportReport') || 'گزارش خروجی'}
            </button>
        `;
        wrapper.appendChild(actions);

        // پیام‌ها
        const message = document.createElement('div');
        message.id = 'dashboardMessage';
        message.className = 'dashboard-page__message';
        wrapper.appendChild(message);

        this._element.appendChild(wrapper);

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => translator.translateElement(this._element), 50);
        }
    }

    /*---------------------------------------------------------
    متد _renderDashboard

    وظیفه: رندر کردن داده‌ها در UI

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderDashboard() {
        if (!this._data) return;
        this._renderStats();
        this._renderChart();
        this._renderActivities();
        this._renderDevices();
        this._renderOrders();
    }

    /*---------------------------------------------------------
    متد _renderStats - رندر آمار

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderStats() {
        const container = document.getElementById('dashboardStats');
        if (!container) return;

        const stats = this._data.stats || {};
        const items = [
            { key: 'totalSamples', label: translator.translate('totalSamples') || 'کل نمونه‌ها', icon: 'fa-flask', color: '#2563eb' },
            { key: 'activeDevices', label: translator.translate('activeDevices') || 'دستگاه‌های فعال', icon: 'fa-microchip', color: '#22c55e' },
            { key: 'alerts', label: translator.translate('alerts') || 'هشدارها', icon: 'fa-bell', color: '#eab308' },
            { key: 'averageAccuracy', label: translator.translate('avgAccuracy') || 'میانگین دقت %', icon: 'fa-percentage', color: '#8b5cf6' },
        ];

        container.innerHTML = items.map(item => {
            const value = stats[item.key] !== undefined ? stats[item.key] : 0;
            const formatted = typeof value === 'number' ? value.toLocaleString('fa-IR') : value;
            return `
                <div class="dashboard-page__stat-card">
                    <div class="dashboard-page__stat-icon" style="color:${item.color};background:${item.color}22;">
                        <i class="fas ${item.icon}"></i>
                    </div>
                    <div class="dashboard-page__stat-content">
                        <span class="dashboard-page__stat-value">${formatted}</span>
                        <span class="dashboard-page__stat-label">${item.label}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /*---------------------------------------------------------
    متد _renderChart - رندر نمودار ساده

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderChart() {
        const container = document.getElementById('dashboardChart');
        if (!container) return;

        const chartData = this._data.chartData;
        if (!chartData?.labels?.length || !chartData?.datasets?.length) {
            container.innerHTML = `<p class="text-muted">${translator.translate('noChartData') || 'داده‌ای برای نمایش وجود ندارد.'}</p>`;
            return;
        }

        const labels = chartData.labels;
        const datasets = chartData.datasets;
        const colors = ['#2563eb', '#22c55e', '#eab308', '#8b5cf6'];
        const maxValue = Math.max(...datasets.flatMap(d => d.data));
        const chartHeight = 200;

        let html = `<div class="dashboard-page__chart-bars" style="height:${chartHeight + 40}px;">`;
        // محور X
        html += `<div class="dashboard-page__chart-x">`;
        labels.forEach(label => html += `<span class="dashboard-page__chart-label">${label}</span>`);
        html += `</div>`;

        datasets.forEach((dataset, idx) => {
            const color = colors[idx % colors.length];
            html += `<div class="dashboard-page__chart-dataset">`;
            dataset.data.forEach((value, i) => {
                const height = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
                html += `
                    <div class="dashboard-page__chart-bar-wrapper">
                        <div class="dashboard-page__chart-bar" style="height:${height}px;background:${color};">
                            <span class="dashboard-page__chart-bar-value">${value}</span>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        });

        // افسانه
        html += `<div class="dashboard-page__chart-legend">`;
        datasets.forEach((dataset, idx) => {
            const color = colors[idx % colors.length];
            html += `
                <span class="dashboard-page__chart-legend-item">
                    <span class="dashboard-page__chart-legend-color" style="background:${color};"></span>
                    ${dataset.label}
                </span>
            `;
        });
        html += `</div>`;
        html += `</div>`;
        container.innerHTML = html;
    }

    /*---------------------------------------------------------
    متد _renderActivities - رندر فعالیت‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderActivities() {
        const container = document.getElementById('recentActivitiesList');
        if (!container) return;

        const activities = this._data.recentActivities || [];
        if (!activities.length) {
            container.innerHTML = `<p class="text-muted">${translator.translate('noActivities') || 'فعالیتی یافت نشد.'}</p>`;
            return;
        }

        const icons = { completed: 'fa-check-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', pending: 'fa-clock', info: 'fa-info-circle' };
        const colors = { completed: '#22c55e', success: '#22c55e', warning: '#eab308', pending: '#f97316', info: '#2563eb' };

        container.innerHTML = activities.map(act => `
            <div class="dashboard-page__activity-item">
                <span class="dashboard-page__activity-icon" style="color:${colors[act.status] || '#64748b'};">
                    <i class="fas ${icons[act.status] || 'fa-circle'}"></i>
                </span>
                <div class="dashboard-page__activity-content">
                    <span class="dashboard-page__activity-title">${act.title}</span>
                    <span class="dashboard-page__activity-time">${act.time}</span>
                </div>
            </div>
        `).join('');
    }

    /*---------------------------------------------------------
    متد _renderDevices - رندر دستگاه‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderDevices() {
        const container = document.getElementById('devicesList');
        if (!container) return;

        const devices = this._data.devices || [];
        if (!devices.length) {
            container.innerHTML = `<p class="text-muted">${translator.translate('noDevices') || 'دستگاهی یافت نشد.'}</p>`;
            return;
        }

        container.innerHTML = devices.map(device => {
            const statusClass = device.status === 'online' ? 'dashboard-page__device-status--online' : 'dashboard-page__device-status--offline';
            const statusText = device.status === 'online' ? (translator.translate('online') || 'آنلاین') : (translator.translate('offline') || 'آفلاین');
            return `
                <div class="dashboard-page__device-item">
                    <div class="dashboard-page__device-info">
                        <span class="dashboard-page__device-name">${device.name}</span>
                        <span class="dashboard-page__device-location"><i class="fas fa-map-marker-alt"></i> ${device.location}</span>
                    </div>
                    <div class="dashboard-page__device-status">
                        <span class="dashboard-page__device-status-dot ${statusClass}"></span>
                        <span>${statusText}</span>
                        <span class="dashboard-page__device-time">${device.lastUpdate}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /*---------------------------------------------------------
    متد _renderOrders - رندر سفارشات

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderOrders() {
        const container = document.getElementById('recentOrdersList');
        if (!container) return;

        const orders = this._data.recentOrders || [];
        if (!orders.length) {
            container.innerHTML = `<p class="text-muted">${translator.translate('noOrders') || 'سفارشی یافت نشد.'}</p>`;
            return;
        }

        const statusLabels = { pending: translator.translate('statusPending') || 'در انتظار', processing: translator.translate('statusProcessing') || 'در حال پردازش', delivered: translator.translate('statusDelivered') || 'تحویل داده شد', cancelled: translator.translate('statusCancelled') || 'لغو شده' };
        const statusColors = { pending: '#f97316', processing: '#2563eb', delivered: '#22c55e', cancelled: '#ef4444' };

        container.innerHTML = `
            <table class="dashboard-page__orders-table">
                <thead><tr>
                    <th>${translator.translate('orderId') || 'شماره سفارش'}</th>
                    <th>${translator.translate('customer') || 'مشتری'}</th>
                    <th>${translator.translate('total') || 'مبلغ کل'}</th>
                    <th>${translator.translate('status') || 'وضعیت'}</th>
                    <th>${translator.translate('date') || 'تاریخ'}</th>
                </tr></thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customer}</td>
                            <td>${utils.formatPrice(order.total)}</td>
                            <td><span class="dashboard-page__order-status" style="background:${statusColors[order.status] || '#64748b'}22;color:${statusColors[order.status] || '#64748b'};">${statusLabels[order.status] || order.status}</span></td>
                            <td>${order.date}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /*---------------------------------------------------------
    متدهای کمکی _showLoading, _hideLoading

    ---------------------------------------------------------*/
    _showLoading() {
        const stats = document.getElementById('dashboardStats');
        if (stats) {
            stats.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem 0;"><div class="spinner" style="margin:0 auto 1rem;"></div><p>${translator.translate('loading') || 'در حال بارگذاری...'}</p></div>`;
        }
    }
    _hideLoading() {}

    /*---------------------------------------------------------
    متد _refreshDashboard

    وظیفه: بازخوانی دستی داده‌ها

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _refreshDashboard() {
        const btn = document.getElementById('dashboardRefreshBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translator.translate('refreshing') || 'در حال به‌روزرسانی...'}`;
        }
        try {
            this._data = await Dashboard.refresh();
            this._renderDashboard();
            utils.toast(translator.translate('dashboardRefreshed') || 'داشبورد به‌روزرسانی شد.', 'success');
        } catch (e) {
            utils.toast(translator.translate('refreshFailed') || 'به‌روزرسانی با شکست مواجه شد.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fas fa-sync-alt"></i> ${translator.translate('refresh') || 'به‌روزرسانی'}`;
            }
        }
    }

    /*---------------------------------------------------------
    متد _exportReport

    وظیفه: خروجی گزارش

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _exportReport() {
        if (!this._data) {
            utils.toast(translator.translate('noDataToExport') || 'داده‌ای برای خروجی وجود ندارد.', 'error');
            return;
        }
        try {
            const data = { exportedAt: new Date().toISOString(), user: Auth.getCurrentUser()?.username || 'کاربر', dashboard: this._data };
            const filename = `dashboard_report_${new Date().toISOString().slice(0,10)}.json`;
            utils.downloadJSON(data, filename);
            utils.toast(translator.translate('reportExported') || 'گزارش با موفقیت خروجی گرفته شد.', 'success');
        } catch (e) {
            utils.toast(translator.translate('exportFailed') || 'خطا در خروجی گرفتن گزارش.', 'error');
        }
    }

    /*---------------------------------------------------------
    متد _startAutoRefresh

    وظیفه: شروع تایمر به‌روزرسانی خودکار

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _startAutoRefresh() {
        this._clearAutoRefresh();
        this._refreshInterval = setInterval(() => {
            if (this._element && this._element.isConnected) {
                this._loadData().then(() => this._renderDashboard()).catch(() => {});
            }
        }, this._refreshIntervalTime);
    }

    _clearAutoRefresh() {
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = null;
        }
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        document.getElementById('dashboardRefreshBtn')?.addEventListener('click', () => this._refreshDashboard());
        document.getElementById('dashboardExportBtn')?.addEventListener('click', () => this._exportReport());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5' && this._element && this._element.isConnected) {
                e.preventDefault();
                this._refreshDashboard();
            }
        });
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
        document.addEventListener('authChanged', (e) => {
            if (!e.detail.isAuthenticated) router.navigate('login');
        });
    }

    _updateLanguage() {
        if (this._element && translator && translator.loaded) {
            translator.translateElement(this._element);
            this._renderDashboard();
        }
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        this._clearAutoRefresh();
        this._initialized = false;
        console.log('🧹 DashboardPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { DashboardPage };
export default DashboardPage;