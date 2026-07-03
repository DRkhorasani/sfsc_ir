/*=========================================================
نام فایل: dashboard.js

وظیفه: صفحه داشبورد کاربری با نمایش آمار، نمودارها،
اطلاعات کاربری، فعالیت‌های اخیر و وضعیت دستگاه‌ها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { api } from '../js/api.js';
import { Auth } from '../js/auth.js';
import { utils } from '../js/utils.js';
import { router } from '../js/router.js';

/*---------------------------------------------------------
کلاس DashboardPage

وظیفه: مدیریت و رندر صفحه داشبورد

---------------------------------------------------------*/
class DashboardPage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه داشبورد

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#dashboard',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._isLoading = false;
        this._dashboardData = null;
        this._refreshInterval = null;
        this._refreshIntervalTime = 60000; // ۱ دقیقه
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه داشبورد

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه داشبورد یافت نشد.');
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

        // شروع تایمر به‌روزرسانی خودکار
        this._startAutoRefresh();

        this._initialized = true;
        console.log('✅ DashboardPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadData

    وظیفه: بارگذاری داده‌های داشبورد از API

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadData() {
        try {
            this._isLoading = true;
            this._showLoading();

            const response = await api.get('/dashboard/data');
            if (response?.success && response?.data) {
                this._dashboardData = response.data;
                // ذخیره در State
                State.set('dashboardData', this._dashboardData);
            } else {
                throw new Error(response?.message || 'خطا در بارگذاری داده‌های داشبورد');
            }

        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری داشبورد:', error);
            // استفاده از داده‌های نمونه در صورت خطا
            this._dashboardData = this._getMockData();
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
    متد _getMockData

    وظیفه: دریافت داده‌های نمونه برای نمایش در داشبورد

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    _getMockData() {
        return {
            stats: {
                totalSamples: 1247,
                activeDevices: 38,
                alerts: 5,
                averageAccuracy: 96.7,
                totalUsers: 12,
                pendingOrders: 3,
            },
            chartData: {
                labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
                datasets: [
                    { label: 'اسپور قارچ', data: [45, 52, 38, 65, 78, 92] },
                    { label: 'گرده گیاهان', data: [30, 35, 42, 50, 45, 38] },
                ],
            },
            recentActivities: [
                { id: 1, type: 'sample', title: 'نمونه‌گیری جدید در ایستگاه شماره ۳', time: '۲۰ دقیقه پیش', status: 'completed' },
                { id: 2, type: 'device', title: 'دستگاه SFS-5000 کالیبره شد', time: '۱ ساعت پیش', status: 'success' },
                { id: 3, type: 'alert', title: 'هشدار: افزایش اسپور قارچ', time: '۲ ساعت پیش', status: 'warning' },
                { id: 4, type: 'order', title: 'سفارش جدید ثبت شد (شماره ORD-12345)', time: '۳ ساعت پیش', status: 'pending' },
                { id: 5, type: 'user', title: 'کاربر جدید ثبت نام کرد', time: '۵ ساعت پیش', status: 'info' },
            ],
            devices: [
                { id: 1, name: 'دستگاه SFS-5000', status: 'online', lastUpdate: '۲ دقیقه پیش', location: 'آزمایشگاه مرکزی' },
                { id: 2, name: 'دستگاه SFS-7000', status: 'online', lastUpdate: '۵ دقیقه پیش', location: 'ایستگاه شماره ۱' },
                { id: 3, name: 'نمونه‌گیر هوای اماکن', status: 'offline', lastUpdate: '۲ ساعت پیش', location: 'بیمارستان' },
                { id: 4, name: 'اسپورتراپ دیجیتال', status: 'online', lastUpdate: '۱۰ دقیقه پیش', location: 'ایستگاه شماره ۲' },
            ],
            recentOrders: [
                { id: 'ORD-001', customer: 'شرکت نمونه', total: 720000000, status: 'delivered', date: '۱۴۰۵/۰۴/۱۰' },
                { id: 'ORD-002', customer: 'آزمایشگاه مرکزی', total: 390000000, status: 'processing', date: '۱۴۰۵/۰۴/۰۸' },
                { id: 'ORD-003', customer: 'دانشگاه علوم پزشکی', total: 820000000, status: 'pending', date: '۱۴۰۵/۰۴/۰۵' },
            ],
        };
    }

    /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _buildPageStructure() {
        if (this._element.querySelector('.dashboard-page__wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'dashboard-page__wrapper';

        // هدر صفحه
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
                <div class="dashboard-page__user-avatar">
                    <i class="fas fa-user"></i>
                </div>
            </div>
        `;
        wrapper.appendChild(header);

        // آمارها
        const statsGrid = document.createElement('div');
        statsGrid.id = 'dashboardStats';
        statsGrid.className = 'dashboard-page__stats';
        wrapper.appendChild(statsGrid);

        // نمودارها (ساده با استفاده از CSS)
        const chartsSection = document.createElement('div');
        chartsSection.className = 'dashboard-page__charts';
        chartsSection.innerHTML = `
            <div class="dashboard-page__chart-card">
                <h3 data-i18n="dashboardChartTitle">روند نمونه‌گیری</h3>
                <div id="dashboardChart" class="dashboard-page__chart-container"></div>
            </div>
        `;
        wrapper.appendChild(chartsSection);

        // بخش فعالیت‌های اخیر و دستگاه‌ها
        const twoCol = document.createElement('div');
        twoCol.className = 'dashboard-page__two-col';

        // فعالیت‌های اخیر
        const activities = document.createElement('div');
        activities.className = 'dashboard-page__card';
        activities.innerHTML = `
            <h3 data-i18n="recentActivities">فعالیت‌های اخیر</h3>
            <div id="recentActivitiesList" class="dashboard-page__activity-list"></div>
        `;
        twoCol.appendChild(activities);

        // دستگاه‌ها
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
            setTimeout(() => {
                translator.translateElement(this._element);
            }, 50);
        }
    }

    /*---------------------------------------------------------
    متد _renderDashboard

    وظیفه: رندر کردن داده‌ها در داشبورد

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderDashboard() {
        if (!this._dashboardData) return;

        // رندر آمار
        this._renderStats();

        // رندر نمودار
        this._renderChart();

        // رندر فعالیت‌های اخیر
        this._renderActivities();

        // رندر دستگاه‌ها
        this._renderDevices();

        // رندر سفارشات اخیر
        this._renderOrders();
    }

    /*---------------------------------------------------------
    متد _renderStats

    وظیفه: رندر کردن کارت‌های آماری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderStats() {
        const container = document.getElementById('dashboardStats');
        if (!container) return;

        const stats = this._dashboardData.stats || {};
        const statItems = [
            { key: 'totalSamples', label: translator.translate('totalSamples') || 'کل نمونه‌ها', icon: 'fa-flask', color: '#2563eb' },
            { key: 'activeDevices', label: translator.translate('activeDevices') || 'دستگاه‌های فعال', icon: 'fa-microchip', color: '#22c55e' },
            { key: 'alerts', label: translator.translate('alerts') || 'هشدارها', icon: 'fa-bell', color: '#eab308' },
            { key: 'averageAccuracy', label: translator.translate('avgAccuracy') || 'میانگین دقت %', icon: 'fa-percentage', color: '#8b5cf6' },
            { key: 'totalUsers', label: translator.translate('totalUsers') || 'کاربران', icon: 'fa-users', color: '#ec4899' },
            { key: 'pendingOrders', label: translator.translate('pendingOrders') || 'سفارشات در انتظار', icon: 'fa-clock', color: '#f97316' },
        ];

        container.innerHTML = statItems.map(item => {
            const value = stats[item.key] !== undefined ? stats[item.key] : 0;
            // فرمت‌سازی عدد
            const formattedValue = typeof value === 'number' ? value.toLocaleString('fa-IR') : value;
            return `
                <div class="dashboard-page__stat-card">
                    <div class="dashboard-page__stat-icon" style="color:${item.color};background:${item.color}22;">
                        <i class="fas ${item.icon}"></i>
                    </div>
                    <div class="dashboard-page__stat-content">
                        <span class="dashboard-page__stat-value">${formattedValue}</span>
                        <span class="dashboard-page__stat-label">${item.label}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /*---------------------------------------------------------
    متد _renderChart

    وظیفه: رندر نمودار ساده با CSS

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderChart() {
        const container = document.getElementById('dashboardChart');
        if (!container) return;

        const chartData = this._dashboardData.chartData;
        if (!chartData || !chartData.labels || !chartData.datasets) {
            container.innerHTML = `<p class="text-muted">${translator.translate('noChartData') || 'داده‌ای برای نمایش وجود ندارد.'}</p>`;
            return;
        }

        const labels = chartData.labels;
        const datasets = chartData.datasets;
        const colors = ['#2563eb', '#22c55e', '#eab308', '#8b5cf6'];

        // ساخت نمودار میله‌ای ساده با CSS
        const maxValue = Math.max(...datasets.flatMap(d => d.data));
        const chartHeight = 200;

        let html = `<div class="dashboard-page__chart-bars" style="height:${chartHeight + 40}px;">`;

        // محور X
        html += `<div class="dashboard-page__chart-x">`;
        labels.forEach(label => {
            html += `<span class="dashboard-page__chart-label">${label}</span>`;
        });
        html += `</div>`;

        // میله‌ها برای هر مجموعه داده
        datasets.forEach((dataset, datasetIndex) => {
            const color = colors[datasetIndex % colors.length];
            html += `<div class="dashboard-page__chart-dataset">`;
            dataset.data.forEach((value, index) => {
                const height = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
                html += `
                    <div class="dashboard-page__chart-bar-wrapper">
                        <div class="dashboard-page__chart-bar" style="height:${height}px;background:${color};">
                            <span class="dashboard-page__chart-bar-value">${value}</span>
                        </div>
                        <span class="dashboard-page__chart-bar-label" style="display:none;">${dataset.label}</span>
                    </div>
                `;
            });
            html += `</div>`;
        });

        // افسانه
        html += `<div class="dashboard-page__chart-legend">`;
        datasets.forEach((dataset, index) => {
            const color = colors[index % colors.length];
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
    متد _renderActivities

    وظیفه: رندر لیست فعالیت‌های اخیر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderActivities() {
        const container = document.getElementById('recentActivitiesList');
        if (!container) return;

        const activities = this._dashboardData.recentActivities || [];

        if (activities.length === 0) {
            container.innerHTML = `<p class="text-muted">${translator.translate('noActivities') || 'فعالیتی یافت نشد.'}</p>`;
            return;
        }

        const statusIcons = {
            completed: 'fa-check-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            pending: 'fa-clock',
            info: 'fa-info-circle',
        };

        const statusColors = {
            completed: '#22c55e',
            success: '#22c55e',
            warning: '#eab308',
            pending: '#f97316',
            info: '#2563eb',
        };

        container.innerHTML = activities.map(activity => {
            const icon = statusIcons[activity.status] || 'fa-circle';
            const color = statusColors[activity.status] || '#64748b';
            return `
                <div class="dashboard-page__activity-item">
                    <span class="dashboard-page__activity-icon" style="color:${color};">
                        <i class="fas ${icon}"></i>
                    </span>
                    <div class="dashboard-page__activity-content">
                        <span class="dashboard-page__activity-title">${activity.title}</span>
                        <span class="dashboard-page__activity-time">${activity.time}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /*---------------------------------------------------------
    متد _renderDevices

    وظیفه: رندر لیست دستگاه‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderDevices() {
        const container = document.getElementById('devicesList');
        if (!container) return;

        const devices = this._dashboardData.devices || [];

        if (devices.length === 0) {
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
    متد _renderOrders

    وظیفه: رندر لیست سفارشات اخیر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderOrders() {
        const container = document.getElementById('recentOrdersList');
        if (!container) return;

        const orders = this._dashboardData.recentOrders || [];

        if (orders.length === 0) {
            container.innerHTML = `<p class="text-muted">${translator.translate('noOrders') || 'سفارشی یافت نشد.'}</p>`;
            return;
        }

        const statusLabels = {
            pending: translator.translate('pending') || 'در انتظار',
            processing: translator.translate('processing') || 'در حال پردازش',
            delivered: translator.translate('delivered') || 'تحویل داده شد',
            cancelled: translator.translate('cancelled') || 'لغو شده',
        };

        const statusColors = {
            pending: '#f97316',
            processing: '#2563eb',
            delivered: '#22c55e',
            cancelled: '#ef4444',
        };

        container.innerHTML = `
            <table class="dashboard-page__orders-table">
                <thead>
                    <tr>
                        <th>${translator.translate('orderId') || 'شماره سفارش'}</th>
                        <th>${translator.translate('customer') || 'مشتری'}</th>
                        <th>${translator.translate('total') || 'مبلغ کل'}</th>
                        <th>${translator.translate('status') || 'وضعیت'}</th>
                        <th>${translator.translate('date') || 'تاریخ'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customer}</td>
                            <td>${utils.formatPrice(order.total)}</td>
                            <td>
                                <span class="dashboard-page__order-status" style="background:${statusColors[order.status] || '#64748b'}22;color:${statusColors[order.status] || '#64748b'};">
                                    ${statusLabels[order.status] || order.status}
                                </span>
                            </td>
                            <td>${order.date}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /*---------------------------------------------------------
    متد _showLoading

    وظیفه: نمایش وضعیت بارگذاری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _showLoading() {
        const stats = document.getElementById('dashboardStats');
        if (stats) {
            stats.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:2rem 0;">
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
        // توسط _renderDashboard مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد _refreshDashboard

    وظیفه: بازخوانی داده‌های داشبورد

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
            await this._loadData();
            this._renderDashboard();
            utils.toast(
                translator.translate('dashboardRefreshed') || 'داشبورد به‌روزرسانی شد.',
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
    متد _exportReport

    وظیفه: خروجی گرفتن گزارش

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _exportReport() {
        if (!this._dashboardData) {
            utils.toast(
                translator.translate('noDataToExport') || 'داده‌ای برای خروجی وجود ندارد.',
                'error'
            );
            return;
        }

        try {
            const data = {
                exportedAt: new Date().toISOString(),
                user: Auth.getCurrentUser()?.username || 'کاربر',
                dashboard: this._dashboardData,
            };

            const filename = `dashboard_report_${new Date().toISOString().slice(0,10)}.json`;
            utils.downloadJSON(data, filename);

            utils.toast(
                translator.translate('reportExported') || 'گزارش با موفقیت خروجی گرفته شد.',
                'success'
            );
        } catch (error) {
            console.error('❌ خطا در خروجی گزارش:', error);
            utils.toast(
                translator.translate('exportFailed') || 'خطا در خروجی گرفتن گزارش.',
                'error'
            );
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
            // فقط اگر صفحه قابل مشاهده باشد
            if (this._element && this._element.isConnected) {
                this._loadData().then(() => {
                    this._renderDashboard();
                }).catch(() => {});
            }
        }, this._refreshIntervalTime);
    }

    /*---------------------------------------------------------
    متد _clearAutoRefresh

    وظیفه: پاکسازی تایمر به‌روزرسانی خودکار

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _clearAutoRefresh() {
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = null;
        }
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // دکمه به‌روزرسانی
        const refreshBtn = document.getElementById('dashboardRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this._refreshDashboard();
            });
        }

        // دکمه خروجی گزارش
        const exportBtn = document.getElementById('dashboardExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this._exportReport();
            });
        }

        // کلید F5 برای به‌روزرسانی (جلوگیری از بازloading صفحه)
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

        // رویداد تغییر وضعیت احراز هویت
        document.addEventListener('authChanged', (e) => {
            if (!e.detail.isAuthenticated) {
                router.navigate('login');
            }
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
            // بازرندر محتوای دینامیک
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