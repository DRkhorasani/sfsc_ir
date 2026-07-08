/*=========================================================
نام فایل: api.js

وظیفه: مدیریت تمام ارتباطات با سرور (API Calls)
با قابلیت استفاده از Mock داده‌ها در حالت توسعه،
مدیریت خطاها، Retry، کش و اعتبارسنجی پاسخ‌ها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { Config } from './config.js';
import { State } from './state.js';
import { Storage } from './storage.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس ApiClient

وظیفه: ارائه متدهای GET, POST, PUT, DELETE با قابلیت‌های
پیشرفته مانند Retry, Cache, Mock, Interceptors

---------------------------------------------------------*/
class ApiClient {
    constructor() {
        this.baseURL = Config.API.BASE_URL;
        this.timeout = Config.API.TIMEOUT || 30000;
        this.retryCount = Config.API.RETRY_COUNT || 3;
        this.retryDelay = Config.API.RETRY_DELAY || 1000;
        this.mockEnabled = Config.MOCK.ENABLED || true;
        this.mockDelay = Config.MOCK.DELAY || 500;
        this.mockErrorRate = Config.MOCK.ERROR_RATE || 0.05;
        this.cacheEnabled = Config.CACHE.ENABLED || true;
        this.cacheTTL = Config.CACHE.TTL || 5 * 60 * 1000;
        this._cache = new Map();
        this._pendingRequests = new Map();
        this._interceptors = {
            request: [],
            response: [],
            error: [],
        };
        this._abortControllers = new Map();
    }

    /*---------------------------------------------------------
    متد _getHeaders

    وظیفه: دریافت هدرهای درخواست با توکن احراز هویت

    ورودی‌ها: customHeaders (object)

    خروجی: object

    ---------------------------------------------------------*/
    _getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...customHeaders,
        };

        // افزودن توکن احراز هویت
        const token = Storage.get(Config.AUTH.TOKEN_KEY);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // افزودن زبان
        const lang = State.get('language') || Config.APP.DEFAULT_LANGUAGE;
        headers['Accept-Language'] = lang;

        return headers;
    }

    /*---------------------------------------------------------
    متد _applyInterceptors

    وظیفه: اعمال اینترسپتورها روی درخواست یا پاسخ

    ورودی‌ها: type (string), data (any)

    خروجی: any

    ---------------------------------------------------------*/
    async _applyInterceptors(type, data) {
        const interceptors = this._interceptors[type] || [];
        let result = data;
        for (const interceptor of interceptors) {
            try {
                result = await interceptor(result);
            } catch (error) {
                console.warn(`⚠️ خطا در اینترسپتور ${type}:`, error);
            }
        }
        return result;
    }

    /*---------------------------------------------------------
    متد _fetch

    وظیفه: اجرای درخواست اصلی با مدیریت تایم‌اوت و Abort

    ورودی‌ها: url (string), options (object)

    خروجی: Promise<Response>

    ---------------------------------------------------------*/
    async _fetch(url, options = {}) {
        const controller = new AbortController();
        const signal = controller.signal;

        // ذخیره controller برای لغو درخواست
        const requestId = `${url}_${Date.now()}`;
        this._abortControllers.set(requestId, controller);

        try {
            // تنظیم تایم‌اوت
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, this.timeout);

            const response = await fetch(url, {
                ...options,
                signal,
            });

            clearTimeout(timeoutId);
            this._abortControllers.delete(requestId);

            return response;
        } catch (error) {
            this._abortControllers.delete(requestId);
            if (error.name === 'AbortError') {
                throw new Error('درخواست به دلیل تایم‌اوت لغو شد.');
            }
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد _request

    وظیفه: متد اصلی برای ارسال درخواست با قابلیت Retry و Mock

    ورودی‌ها: method (string), endpoint (string), data (object), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async _request(method, endpoint, data = null, options = {}) {
        const {
            retries = this.retryCount,
            delay = this.retryDelay,
            useCache = this.cacheEnabled,
            cacheTTL = this.cacheTTL,
            mockData = null,
            mockResponse = null,
            skipMock = false,
            headers = {},
            params = {},
            timeout = this.timeout,
        } = options;

        // ساخت URL کامل
        let url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        // افزودن پارامترهای query
        if (params && Object.keys(params).length > 0) {
            const queryString = utils.buildQueryString(params);
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }

        // بررسی Mock
        if (this.mockEnabled && !skipMock) {
            const mockResult = await this._handleMock(method, endpoint, data, mockData, mockResponse);
            if (mockResult !== null) {
                return mockResult;
            }
        }

        // بررسی کش (فقط برای GET)
        const cacheKey = `${method}:${url}:${JSON.stringify(data)}`;
        if (useCache && method === 'GET' && this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            const age = Date.now() - cached.timestamp;
            if (age < cacheTTL) {
                return cached.data;
            }
            // کش منقضی شده است
            this._cache.delete(cacheKey);
        }

        // ایجاد کلید برای درخواست‌های همزمان
        const requestKey = `${method}:${url}`;
        if (this._pendingRequests.has(requestKey)) {
            return this._pendingRequests.get(requestKey);
        }

        // اجرای درخواست با Retry
        const promise = this._executeWithRetry(method, url, data, headers, timeout, retries, delay);

        // ذخیره درخواست برای جلوگیری از درخواست‌های همزمان
        this._pendingRequests.set(requestKey, promise);

        try {
            const result = await promise;

            // ذخیره در کش (فقط برای GET)
            if (useCache && method === 'GET') {
                this._cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now(),
                });
            }

            return result;
        } finally {
            this._pendingRequests.delete(requestKey);
        }
    }

    /*---------------------------------------------------------
    متد _executeWithRetry

    وظیفه: اجرای درخواست با قابلیت Retry

    ورودی‌ها: method (string), url (string), data (object), headers (object), timeout (number), retries (number), delay (number)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async _executeWithRetry(method, url, data, headers, timeout, retries, delay) {
        let lastError;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // اعمال اینترسپتورهای درخواست
                const requestData = await this._applyInterceptors('request', {
                    method,
                    url,
                    data,
                    headers: { ...this._getHeaders(headers) },
                });

                // آماده‌سازی گزینه‌های fetch
                const fetchOptions = {
                    method: requestData.method,
                    headers: requestData.headers,
                    signal: null, // توسط _fetch مدیریت می‌شود
                };

                if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                    fetchOptions.body = JSON.stringify(requestData.data);
                }

                const response = await this._fetch(requestData.url, fetchOptions);

                // دریافت محتوای پاسخ
                const contentType = response.headers.get('content-type') || '';
                let responseData;

                if (contentType.includes('application/json')) {
                    responseData = await response.json();
                } else if (contentType.includes('text/')) {
                    responseData = await response.text();
                } else {
                    responseData = await response.blob();
                }

                // بررسی وضعیت پاسخ
                if (!response.ok) {
                    throw new Error(responseData?.message || responseData?.error || `خطای HTTP ${response.status}`);
                }

                // اعمال اینترسپتورهای پاسخ
                const finalData = await this._applyInterceptors('response', {
                    data: responseData,
                    status: response.status,
                    headers: response.headers,
                });

                return finalData.data || responseData;

            } catch (error) {
                lastError = error;

                // اعمال اینترسپتورهای خطا
                try {
                    await this._applyInterceptors('error', { error, attempt, method, url });
                } catch (e) {
                    // نادیده گرفته شود
                }

                // اگر آخرین تلاش است، خطا را پرتاب کن
                if (attempt === retries) {
                    throw lastError;
                }

                // تاخیر قبل از تلاش مجدد
                const backoffDelay = delay * Math.pow(2, attempt);
                await utils.sleep(backoffDelay);

                console.warn(`🔄 تلاش مجدد ${attempt + 1}/${retries} برای ${method} ${url}`);
            }
        }

        throw lastError;
    }

    /*---------------------------------------------------------
    متد _handleMock

    وظیفه: مدیریت پاسخ‌های Mock

    ورودی‌ها: method (string), endpoint (string), data (object), mockData (any), mockResponse (any)

    خروجی: Promise<any>|null

    ---------------------------------------------------------*/
    async _handleMock(method, endpoint, data, mockData, mockResponse) {
        // اگر mockResponse به‌طور مستقیم داده شده باشد
        if (mockResponse !== null) {
            await utils.sleep(this.mockDelay);

            // شبیه‌سازی خطا
            if (Math.random() < this.mockErrorRate) {
                throw new Error('خطای شبیه‌سازی شده در Mock');
            }

            return typeof mockResponse === 'function' ? mockResponse(data) : mockResponse;
        }

        // استفاده از mockData از پیش تعریف شده
        if (mockData !== null) {
            await utils.sleep(this.mockDelay);

            if (Math.random() < this.mockErrorRate) {
                throw new Error('خطای شبیه‌سازی شده در Mock');
            }

            return typeof mockData === 'function' ? mockData(data) : mockData;
        }

        // Mock داده‌های پیش‌فرض برای endpoints خاص
        const mockHandlers = this._getMockHandlers();
        const handler = mockHandlers[`${method}:${endpoint}`] || mockHandlers[`${method}:*`];

        if (handler) {
            await utils.sleep(this.mockDelay);

            if (Math.random() < this.mockErrorRate) {
                throw new Error('خطای شبیه‌سازی شده در Mock');
            }

            return handler(data);
        }

        return null;
    }

    /*---------------------------------------------------------
    متد _getMockHandlers

    وظیفه: دریافت هندلرهای Mock برای endpoints مختلف

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    _getMockHandlers() {
        return {
            // احراز هویت
            'POST:/auth/login': (data) => ({
                success: true,
                data: {
                    user: {
                        id: 1,
                        username: 'admin',
                        email: 'admin@example.com',
                        mobile: '09123456789',
                    },
                    token: 'mock_token_12345',
                    refreshToken: 'mock_refresh_token_67890',
                },
            }),
            'POST:/auth/register': (data) => ({
                success: true,
                data: {
                    user: {
                        id: 2,
                        username: data.username || 'new_user',
                        email: data.email || 'user@example.com',
                        mobile: data.mobile || '09123456789',
                    },
                    token: 'mock_token_67890',
                },
            }),
            'POST:/auth/verify-otp': () => ({
                success: true,
                data: { verified: true },
            }),
            'POST:/auth/send-otp': () => ({
                success: true,
                data: { message: 'کد تایید ارسال شد.' },
            }),
            'POST:/auth/logout': () => ({
                success: true,
                data: { message: 'خروج موفق' },
            }),
            'GET:/auth/profile': () => ({
                success: true,
                data: {
                    id: 1,
                    username: 'admin',
                    email: 'admin@example.com',
                    mobile: '09123456789',
                    createdAt: '2024-01-01T00:00:00Z',
                },
            }),
            'POST:/auth/change-password': () => ({
                success: true,
                data: { message: 'رمز عبور با موفقیت تغییر کرد.' },
            }),

            // محصولات
            'GET:/products': () => ({
                success: true,
                data: [
                    {
                        id: 1,
                        title: 'دستگاه نمونه‌گیر خودکار آلاینده‌های بیولوژیک هوا',
                        description: 'دستگاه حجمی ۷ روزه با قابلیت پایش مداوم اسپور قارچ و گرده گیاهان',
                        price: '۷۲۰ میلیون تومان',
                        images: ['/pics/Sp01.jpg', '/pics/Sp02.jpg', '/pics/Sp03.jpg', '/pics/Sp04.jpg', '/pics/Sp05.jpg'],
                        features: ['پایش ۷ روزه', 'اتصال ابری', 'دقت حجمی بالا', 'قابل استفاده در ایستگاه‌های پایش'],
                        category: 'sampler',
                    },
                    {
                        id: 2,
                        title: 'نمونه‌گیر هوای اماکن (Indoor Air Sampler)',
                        description: 'مناسب بیمارستان‌ها، مدارس، صنایع غذایی و دفاتر',
                        price: '۳۹۰ میلیون تومان',
                        images: ['https://picsum.photos/id/20/400/300', 'https://picsum.photos/id/21/400/300'],
                        features: ['سبک و پرتابل', 'نمونه‌گیری سریع', 'قابل استفاده با کارتریج استاندارد'],
                        category: 'sampler',
                    },
                    {
                        id: 3,
                        title: 'دستگاه اسپورتراپ دیجیتال (Spore Trap Pro)',
                        description: 'نمونه‌گیر دوکاره با قابلیت تنظیم دوره نمونه‌گیری ۱ تا ۱۴ روز',
                        price: '۵۹۰ میلیون تومان',
                        images: ['/pics/mic01.jpg', '/pics/mic02.jpg', '/pics/mic03.jpg'],
                        features: ['تنظیم بازه زمانی', 'حافظه ۱۰۰ نمونه', 'باطری اضطراری'],
                        category: 'spore_trap',
                    },
                    {
                        id: 4,
                        title: 'دستگاه پایش هوای آلرژن مدل SFS-5000',
                        description: 'پیشرفته‌ترین نمونه‌گیر هوای دیجیتال با نمایشگر لمسی',
                        price: '۸۲۰ میلیون تومان',
                        images: ['/pics/Sam01.jpg', '/pics/Sam02.jpg', '/pics/Sam03.jpg', '/pics/Sam04.jpg'],
                        features: ['اتصال اینترنت', 'گارانتی ۳ ساله', 'نمایشگر لمسی', 'خروجی آنلاین'],
                        category: 'digital',
                    },
                    {
                        id: 5,
                        title: 'تله حجمی اسپور ۷ روزه (مدل SFS-7000)',
                        description: 'نسخه حرفه‌ای مشابه Burkard با قابلیت آنالیز آنلاین',
                        price: '۷۵۰ میلیون تومان',
                        images: ['https://picsum.photos/id/11/400/300', 'https://picsum.photos/id/12/400/300'],
                        features: ['پایش ۷ روزه', 'داده آنلاین', 'نرم‌افزار اختصاصی', 'هشدار آلودگی'],
                        category: 'volumetric',
                    },
                ],
            }),
            'GET:/products/:id': (data) => {
                const id = data?.id || 1;
                return {
                    success: true,
                    data: {
                        id: id,
                        title: `محصول شماره ${id}`,
                        description: 'توضیحات کامل محصول',
                        price: `${500 + id * 50} میلیون تومان`,
                        images: ['/pics/Sp01.jpg', '/pics/Sp02.jpg'],
                        features: ['ویژگی ۱', 'ویژگی ۲', 'ویژگی ۳'],
                        category: 'sampler',
                    },
                };
            },
            'GET:/products/categories': () => ({
                success: true,
                data: ['sampler', 'spore_trap', 'digital', 'volumetric', 'accessory'],
            }),
            'GET:/products/search': (data) => ({
                success: true,
                data: {
                    items: [],
                    total: 0,
                    page: data?.page || 1,
                    limit: data?.limit || 12,
                },
            }),

            // خدمات
            'GET:/services': () => ({
                success: true,
                data: [
                    { id: 1, title: 'نمونه‌گیری هوا', description: 'اعزام تیم به محل برای نمونه‌گیری آلرژن‌ها', icon: 'fas fa-wind', type: 'sampling' },
                    { id: 2, title: 'تحلیل میکروسکوپی', description: 'شناسایی گرده و اسپور قارچ', icon: 'fas fa-microscope', type: 'analysis' },
                    { id: 3, title: 'تحلیل داده', description: 'مدل‌سازی و گزارش تخصصی', icon: 'fas fa-chart-line', type: 'analysis' },
                    { id: 4, title: 'کشاورزی دقیق', description: 'مدیریت بیماری‌های گیاهی', icon: 'fas fa-leaf', type: 'sampling' },
                ],
            }),
            'POST:/services/request': () => ({
                success: true,
                data: { message: 'درخواست خدمت با موفقیت ثبت شد.', requestId: 'SRV-12345' },
            }),

            // اخبار
            'GET:/news': () => ({
                success: true,
                data: [
                    {
                        id: 1,
                        title: 'رونمایی از دستگاه خودکار نمونه‌گیری آلاینده‌های بیولوژیک هوا',
                        description: 'با حضور مسئولین وزارت علوم و جهاد کشاورزی، دستگاه بومی نمونه‌گیر اسپور قارچ رونمایی شد.',
                        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200',
                        badge: 'دولت',
                        date: '2026-06-15',
                        link: 'https://dolat.ir/detail/437746',
                    },
                    {
                        id: 2,
                        title: 'حضور استاد دانشگاه در نوزدهمین فراخوان ثبت اختراعات',
                        description: 'دستگاه نمونه‌گیر خودکار آلاینده‌های بیولوژیک هوا در جمع دستاوردهای برتر کشاورزی قرار گرفت.',
                        image: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=1200',
                        badge: 'دانشگاه کشاورزی',
                        date: '2026-06-10',
                        link: 'https://agri.scu.ac.ir/fa/w/...',
                    },
                    {
                        id: 3,
                        title: 'بیست و پنجمین نمایشگاه پژوهش و فناوری',
                        description: 'ارائه آخرین نسخه دستگاه نمونه‌گیر هوای اماکن با قابلیت اتصال ابری در نمایشگاه پژوهش.',
                        image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=1200',
                        badge: 'پژوهشگاه',
                        date: '2026-06-05',
                        link: 'https://agri.scu.ac.ir/fa/w/...',
                    },
                ],
            }),

            // سوالات متداول
            'GET:/faq': () => ({
                success: true,
                data: [
                    { id: 1, question: 'تفاوت سیستم حجمی با Air-O-Cell چیست؟', answer: 'سیستم حجمی امکان نمونه‌گیری مداوم و کمی‌سازی دقیق را فراهم می‌کند، در حالی که Air-O-Cell بیشتر برای تست سریع محیط‌های داخلی کاربرد دارد.' },
                    { id: 2, question: 'آیا دستگاه‌ها قابلیت اتصال آنلاین دارند؟', answer: 'بله، مدل‌های جدید دارای انتقال داده، ذخیره‌سازی ابری و داشبورد تحت وب هستند.' },
                    { id: 3, question: 'آیا خدمات نمونه‌گیری در محل انجام می‌شود؟', answer: 'بله، تیم تخصصی نمونه‌گیری برای بیمارستان‌ها، صنایع غذایی، گلخانه‌ها و ساختمان‌ها اعزام می‌شود.' },
                ],
            }),

            // داشبورد
            'GET:/dashboard/data': () => ({
                success: true,
                data: {
                    stats: {
                        totalSamples: 1247,
                        activeDevices: 38,
                        alerts: 5,
                        averageAccuracy: 96.7,
                    },
                    chartData: {
                        labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
                        datasets: [
                            { label: 'اسپور قارچ', data: [45, 52, 38, 65, 78, 92] },
                            { label: 'گرده گیاهان', data: [30, 35, 42, 50, 45, 38] },
                        ],
                    },
                    recentAlerts: [
                        { id: 1, type: 'warning', message: 'افزایش اسپور قارچ در ایستگاه شماره ۳', time: '۲۰ دقیقه پیش' },
                        { id: 2, type: 'info', message: 'کالیبراسیون دستگاه SFS-5000 انجام شد', time: '۱ ساعت پیش' },
                    ],
                },
            }),
            'GET:/dashboard/stats': () => ({
                success: true,
                data: {
                    totalSamples: 1247,
                    activeDevices: 38,
                    alerts: 5,
                    averageAccuracy: 96.7,
                },
            }),
            'GET:/dashboard/alerts': () => ({
                success: true,
                data: [
                    { id: 1, type: 'warning', message: 'افزایش اسپور قارچ در ایستگاه شماره ۳', time: '۲۰ دقیقه پیش', resolved: false },
                    { id: 2, type: 'info', message: 'کالیبراسیون دستگاه SFS-5000 انجام شد', time: '۱ ساعت پیش', resolved: true },
                ],
            }),

            // سبد خرید
            'GET:/cart': () => ({
                success: true,
                data: {
                    items: [],
                    total: 0,
                    count: 0,
                },
            }),
            'POST:/cart/add': (data) => ({
                success: true,
                data: {
                    message: 'محصول به سبد خرید اضافه شد.',
                    item: data,
                    cart: { items: [data], total: data.price || 0, count: 1 },
                },
            }),
            'POST:/cart/remove': () => ({
                success: true,
                data: { message: 'محصول از سبد خرید حذف شد.' },
            }),
            'POST:/cart/update': () => ({
                success: true,
                data: { message: 'سبد خرید به‌روزرسانی شد.' },
            }),
            'POST:/cart/clear': () => ({
                success: true,
                data: { message: 'سبد خرید خالی شد.' },
            }),
            'POST:/cart/checkout': () => ({
                success: true,
                data: {
                    orderId: 'ORD-12345',
                    message: 'سفارش با موفقیت ثبت شد.',
                    total: 1000000,
                },
            }),

            // سفارشات
            'GET:/orders': () => ({
                success: true,
                data: [
                    { id: 'ORD-001', date: '2026-06-01', total: 720000000, status: 'delivered', items: 2 },
                    { id: 'ORD-002', date: '2026-06-10', total: 390000000, status: 'processing', items: 1 },
                ],
            }),
            'POST:/orders/create': () => ({
                success: true,
                data: { orderId: 'ORD-12345', message: 'سفارش با موفقیت ایجاد شد.' },
            }),
            'POST:/orders/:id/cancel': () => ({
                success: true,
                data: { message: 'سفارش با موفقیت لغو شد.' },
            }),

            // تماس
            'POST:/contact/send': () => ({
                success: true,
                data: { message: 'پیام شما با موفقیت ارسال شد.' },
            }),

            // آپلود
            'POST:/upload/image': () => ({
                success: true,
                data: { url: 'https://example.com/uploads/image.jpg', message: 'تصویر با موفقیت آپلود شد.' },
            }),
            'POST:/upload/file': () => ({
                success: true,
                data: { url: 'https://example.com/uploads/file.pdf', message: 'فایل با موفقیت آپلود شد.' },
            }),
        };
    }

    /*---------------------------------------------------------
    متدهای عمومی HTTP
    ---------------------------------------------------------*/

    /*---------------------------------------------------------
    get

    وظیفه: ارسال درخواست GET

    ورودی‌ها: endpoint (string), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async get(endpoint, options = {}) {
        return this._request('GET', endpoint, null, options);
    }

    /*---------------------------------------------------------
    post

    وظیفه: ارسال درخواست POST

    ورودی‌ها: endpoint (string), data (object), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async post(endpoint, data = {}, options = {}) {
        return this._request('POST', endpoint, data, options);
    }

    /*---------------------------------------------------------
    put

    وظیفه: ارسال درخواست PUT

    ورودی‌ها: endpoint (string), data (object), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async put(endpoint, data = {}, options = {}) {
        return this._request('PUT', endpoint, data, options);
    }

    /*---------------------------------------------------------
    patch

    وظیفه: ارسال درخواست PATCH

    ورودی‌ها: endpoint (string), data (object), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async patch(endpoint, data = {}, options = {}) {
        return this._request('PATCH', endpoint, data, options);
    }

    /*---------------------------------------------------------
    delete

    وظیفه: ارسال درخواست DELETE

    ورودی‌ها: endpoint (string), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async delete(endpoint, options = {}) {
        return this._request('DELETE', endpoint, null, options);
    }

    /*---------------------------------------------------------
    upload

    وظیفه: آپلود فایل با multipart/form-data

    ورودی‌ها: endpoint (string), file (File), data (object), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async upload(endpoint, file, data = {}, options = {}) {
        const formData = new FormData();
        formData.append('file', file);

        for (const [key, value] of Object.entries(data)) {
            formData.append(key, String(value));
        }

        const headers = {
            'Content-Type': 'multipart/form-data',
        };

        return this._request('POST', endpoint, formData, {
            ...options,
            headers: { ...headers, ...(options.headers || {}) },
            skipMock: true, // آپلود معمولاً Mock نمی‌شود
        });
    }

    /*---------------------------------------------------------
    uploadImage

    وظیفه: آپلود تصویر

    ورودی‌ها: file (File), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async uploadImage(file, options = {}) {
        return this.upload(Config.API.ENDPOINTS.UPLOAD.IMAGE, file, {}, options);
    }

    /*---------------------------------------------------------
    uploadFile

    وظیفه: آپلود فایل عمومی

    ورودی‌ها: file (File), options (object)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async uploadFile(file, options = {}) {
        return this.upload(Config.API.ENDPOINTS.UPLOAD.FILE, file, {}, options);
    }

    /*---------------------------------------------------------
    addInterceptor

    وظیفه: افزودن اینترسپتور

    ورودی‌ها: type (string), interceptor (function)

    خروجی: void

    ---------------------------------------------------------*/
    addInterceptor(type, interceptor) {
        if (!this._interceptors[type]) {
            this._interceptors[type] = [];
        }
        this._interceptors[type].push(interceptor);
    }

    /*---------------------------------------------------------
    removeInterceptor

    وظیفه: حذف اینترسپتور

    ورودی‌ها: type (string), interceptor (function)

    خروجی: void

    ---------------------------------------------------------*/
    removeInterceptor(type, interceptor) {
        if (!this._interceptors[type]) return;
        const index = this._interceptors[type].indexOf(interceptor);
        if (index !== -1) {
            this._interceptors[type].splice(index, 1);
        }
    }

    /*---------------------------------------------------------
    clearCache

    وظیفه: پاکسازی کش

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clearCache() {
        this._cache.clear();
        console.log('🧹 کش API پاکسازی شد.');
    }

    /*---------------------------------------------------------
    abortRequest

    وظیفه: لغو یک درخواست در حال اجرا

    ورودی‌ها: requestId (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    abortRequest(requestId) {
        const controller = this._abortControllers.get(requestId);
        if (controller) {
            controller.abort();
            this._abortControllers.delete(requestId);
            return true;
        }
        return false;
    }

    /*---------------------------------------------------------
    abortAll

    وظیفه: لغو تمام درخواست‌های در حال اجرا

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    abortAll() {
        for (const [id, controller] of this._abortControllers) {
            controller.abort();
        }
        this._abortControllers.clear();
        this._pendingRequests.clear();
        console.log('🧹 تمام درخواست‌های API لغو شدند.');
    }

    /*---------------------------------------------------------
    setBaseURL

    وظیفه: تغییر آدرس پایه API

    ورودی‌ها: url (string)

    خروجی: void

    ---------------------------------------------------------*/
    setBaseURL(url) {
        this.baseURL = url;
    }

    /*---------------------------------------------------------
    setMockEnabled

    وظیفه: فعال/غیرفعال کردن Mock

    ورودی‌ها: enabled (boolean)

    خروجی: void

    ---------------------------------------------------------*/
    setMockEnabled(enabled) {
        this.mockEnabled = enabled;
    }

    /*---------------------------------------------------------
    setToken

    وظیفه: تنظیم توکن احراز هویت

    ورودی‌ها: token (string)

    خروجی: void

    ---------------------------------------------------------*/
    setToken(token) {
        if (token) {
            Storage.set(Config.AUTH.TOKEN_KEY, token);
        } else {
            Storage.remove(Config.AUTH.TOKEN_KEY);
        }
    }

    /*---------------------------------------------------------
    getToken

    وظیفه: دریافت توکن احراز هویت

    ورودی‌ها: none

    خروجی: string|null

    ---------------------------------------------------------*/
    getToken() {
        return Storage.get(Config.AUTH.TOKEN_KEY);
    }

    /*---------------------------------------------------------
    setRefreshToken

    وظیفه: تنظیم توکن Refresh

    ورودی‌ها: token (string)

    خروجی: void

    ---------------------------------------------------------*/
    setRefreshToken(token) {
        if (token) {
            Storage.set(Config.AUTH.REFRESH_TOKEN_KEY, token);
        } else {
            Storage.remove(Config.AUTH.REFRESH_TOKEN_KEY);
        }
    }

    /*---------------------------------------------------------
    getRefreshToken

    وظیفه: دریافت توکن Refresh

    ورودی‌ها: none

    خروجی: string|null

    ---------------------------------------------------------*/
    getRefreshToken() {
        return Storage.get(Config.AUTH.REFRESH_TOKEN_KEY);
    }

    /*---------------------------------------------------------
    clearTokens

    وظیفه: پاکسازی توکن‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clearTokens() {
        Storage.remove(Config.AUTH.TOKEN_KEY);
        Storage.remove(Config.AUTH.REFRESH_TOKEN_KEY);
    }

    /*---------------------------------------------------------
    isAuthenticated

    وظیفه: بررسی احراز هویت کاربر

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    isAuthenticated() {
        return !!this.getToken();
    }
}

// ===== ایجاد نمونه واحد =====
const api = new ApiClient();

// ===== صادرات =====
export { ApiClient, api };
export default api;