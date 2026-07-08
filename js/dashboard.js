/*=========================================================
نام فایل: dashboard.js (سرویس)

وظیفه: دریافت و مدیریت داده‌های داشبورد از API،
پردازش آمار، کش کردن و ارائه به صفحات

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { api } from './api.js';
import { State } from './state.js';
import { Storage } from './storage.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس DashboardService

وظیفه: مدیریت داده‌های داشبورد

---------------------------------------------------------*/
class DashboardService {
    constructor() {
        this._cacheKey = 'dashboard_data';
        this._cacheTTL = 5 * 60 * 1000; // ۵ دقیقه
        this._data = null;
        this._lastFetch = 0;
    }

    /*---------------------------------------------------------
    متد getDashboardData

    وظیفه: دریافت داده‌های داشبورد (با کش)

    ورودی‌ها: forceRefresh (boolean)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async getDashboardData(forceRefresh = false) {
        // بررسی کش
        if (!forceRefresh && this._data && (Date.now() - this._lastFetch) < this._cacheTTL) {
            return this._data;
        }

        // بررسی کش در Storage
        if (!forceRefresh) {
            const cached = Storage.get(this._cacheKey);
            if (cached && cached.timestamp && (Date.now() - cached.timestamp) < this._cacheTTL) {
                this._data = cached.data;
                this._lastFetch = cached.timestamp;
                return this._data;
            }
        }

        // دریافت از API
        try {
            const response = await api.get('/dashboard/data');
            if (response?.success && response?.data) {
                this._data = response.data;
                this._lastFetch = Date.now();
                // ذخیره در کش
                Storage.set(this._cacheKey, {
                    data: this._data,
                    timestamp: this._lastFetch,
                });
                // ذخیره در State
                State.set('dashboardData', this._data);
                return this._data;
            } else {
                throw new Error(response?.message || 'خطا در دریافت داده‌های داشبورد');
            }
        } catch (error) {
            console.error('❌ خطا در دریافت داده‌های داشبورد:', error);
            // در صورت خطا، داده‌های نمونه برگردانده می‌شود
            return this._getMockData();
        }
    }

    /*---------------------------------------------------------
    متد getStats

    وظیفه: دریافت آمار داشبورد

    ورودی‌ها: none

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async getStats() {
        const data = await this.getDashboardData();
        return data?.stats || {};
    }

    /*---------------------------------------------------------
    متد getChartData

    وظیفه: دریافت داده‌های نمودار

    ورودی‌ها: none

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async getChartData() {
        const data = await this.getDashboardData();
        return data?.chartData || null;
    }

    /*---------------------------------------------------------
    متد getRecentActivities

    وظیفه: دریافت فعالیت‌های اخیر

    ورودی‌ها: limit (number)

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async getRecentActivities(limit = 10) {
        const data = await this.getDashboardData();
        const activities = data?.recentActivities || [];
        return activities.slice(0, limit);
    }

    /*---------------------------------------------------------
    متد getDevices

    وظیفه: دریافت لیست دستگاه‌ها

    ورودی‌ها: none

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async getDevices() {
        const data = await this.getDashboardData();
        return data?.devices || [];
    }

    /*---------------------------------------------------------
    متد getRecentOrders

    وظیفه: دریافت سفارشات اخیر

    ورودی‌ها: limit (number)

    خروجی: Promise<array>

    ---------------------------------------------------------*/
    async getRecentOrders(limit = 5) {
        const data = await this.getDashboardData();
        const orders = data?.recentOrders || [];
        return orders.slice(0, limit);
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی اجباری داده‌ها

    ورودی‌ها: none

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async refresh() {
        Storage.remove(this._cacheKey);
        this._data = null;
        this._lastFetch = 0;
        return this.getDashboardData(true);
    }

    /*---------------------------------------------------------
    متد _getMockData

    وظیفه: داده‌های نمونه برای حالت آفلاین یا خطا

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
    متد clearCache

    وظیفه: پاکسازی کش

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clearCache() {
        Storage.remove(this._cacheKey);
        this._data = null;
        this._lastFetch = 0;
    }
}

// ===== ایجاد نمونه واحد =====
const Dashboard = new DashboardService();

// ===== صادرات =====
export { DashboardService, Dashboard };
export default Dashboard;