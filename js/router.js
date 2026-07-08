/*=========================================================
نام فایل: router.js

وظیفه: مدیریت مسیریابی برنامه (Routing) با استفاده از History API
و بارگذاری صفحات به صورت Component-based

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from './state.js';
import { Config } from './config.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
تعریف مسیرها
---------------------------------------------------------*/
const routes = {
    '/': {
        id: 'home',
        title: 'خانه',
        component: 'home',
        section: '#home',
    },
    '/products': {
        id: 'products',
        title: 'محصولات',
        component: 'products',
        section: '#products',
    },
    '/services': {
        id: 'services',
        title: 'خدمات',
        component: 'services',
        section: '#services',
    },
    '/news': {
        id: 'news',
        title: 'اخبار',
        component: 'news',
        section: '#news',
    },
    '/faq': {
        id: 'faq',
        title: 'سوالات متداول',
        component: 'faq',
        section: '#faq',
    },
    '/gallery': {
        id: 'gallery',
        title: 'گالری',
        component: 'gallery',
        section: '#gallery',
    },
    '/dashboard': {
        id: 'dashboard',
        title: 'داشبورد',
        component: 'dashboard',
        section: '#dashboard',
        requiresAuth: true,
    },
    '/profile': {
        id: 'profile',
        title: 'پروفایل',
        component: 'profile',
        section: '#auth',
        requiresAuth: true,
    },
    '/cart': {
        id: 'cart',
        title: 'سبد خرید',
        component: 'cart',
        section: '#cart',
        requiresAuth: false,
    },
    '/orders': {
        id: 'orders',
        title: 'سفارشات',
        component: 'orders',
        section: '#orders',
        requiresAuth: true,
    },
    '/login': {
        id: 'login',
        title: 'ورود',
        component: 'login',
        section: '#auth',
        requiresAuth: false,
    },
    '/register': {
        id: 'register',
        title: 'ثبت نام',
        component: 'register',
        section: '#auth',
        requiresAuth: false,
    },
    '/auth': {
        id: 'auth',
        title: 'ورود / ثبت نام',
        component: 'auth',
        section: '#auth',
        requiresAuth: false,
    },
    '/brand': {
        id: 'brand',
        title: 'درباره ما',
        component: 'brand',
        section: '#brand',
    },
    '/contact': {
        id: 'contact',
        title: 'تماس با ما',
        component: 'contact',
        section: '#contact',
    },
    '/patent': {
        id: 'patent',
        title: 'ثبت اختراع',
        component: 'patent',
        section: '#patent',
    },
};

/*---------------------------------------------------------
کلاس Router

وظیفه: مدیریت مسیریابی، تغییر مسیر، بارگذاری صفحات

---------------------------------------------------------*/
class Router {
    constructor() {
        this.routes = routes;
        this.currentRoute = null;
        this.currentPage = null;
        this.initialized = false;
        this._pageCache = new Map();
        this._transitioning = false;
        this._scrollPositions = new Map();
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه مسیریاب

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    init() {
        if (this.initialized) return;

        // مدیریت رویداد popstate (عقب/جلو در مرورگر)
        window.addEventListener('popstate', (event) => {
            const path = window.location.pathname;
            this._handleRoute(path, false);
        });

        // مدیریت کلیک روی لینک‌های داخلی
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');
            // فقط لینک‌های داخلی (شروع با # یا /)
            if (href && (href.startsWith('/') || href.startsWith('#'))) {
                // اگر لینک با # شروع شود، به مسیر مربوطه تبدیل می‌شود
                if (href.startsWith('#')) {
                    const targetId = href.substring(1);
                    // بررسی اینکه آیا مسیری برای این id وجود دارد
                    const route = Object.values(this.routes).find(r => r.section === `#${targetId}`);
                    if (route) {
                        e.preventDefault();
                        this.navigate(route.id);
                        return;
                    }
                    // اگر مسیر نباشد، فقط اسکرول به بخش مربوطه
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'smooth' });
                        return;
                    }
                }

                // لینک‌های شروع با /
                if (href.startsWith('/')) {
                    e.preventDefault();
                    const routeKey = href;
                    const route = this.routes[routeKey];
                    if (route) {
                        this.navigate(route.id);
                    } else {
                        // تلاش برای یافتن مسیر با تطابق بخشی
                        const found = Object.values(this.routes).find(r => r.section === href);
                        if (found) {
                            this.navigate(found.id);
                        }
                    }
                }
            }
        });

        // مدیریت لینک‌های منوی موبایل
        document.querySelectorAll('.navbar__mobile a, .navbar__nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const targetId = href.substring(1);
                    const route = Object.values(this.routes).find(r => r.section === `#${targetId}`);
                    if (route) {
                        e.preventDefault();
                        this.navigate(route.id);
                    }
                }
            });
        });

        // بارگذاری مسیر اولیه
        const initialPath = window.location.pathname || '/';
        const initialRoute = this._findRouteByPath(initialPath);
        if (initialRoute) {
            this._handleRoute(initialPath, true);
        } else {
            // پیش‌فرض: صفحه اصلی
            this.navigate('home', true);
        }

        this.initialized = true;
        console.log('✅ Router مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد navigate

    وظیفه: تغییر مسیر به صفحه مشخص

    ورودی‌ها: routeId (string), replace (boolean)

    خروجی: void

    ---------------------------------------------------------*/
    navigate(routeId, replace = false) {
        if (this._transitioning) {
            console.warn('⚠️ در حال انتقال به صفحه دیگر، صبر کنید...');
            return;
        }

        const route = this._findRouteById(routeId);
        if (!route) {
            console.error(`❌ مسیر "${routeId}" یافت نشد.`);
            return;
        }

        // بررسی نیاز به احراز هویت
        if (route.requiresAuth) {
            const user = State.get('currentUser');
            if (!user) {
                utils.toast('لطفاً ابتدا وارد حساب کاربری خود شوید.', 'warning');
                this.navigate('login');
                return;
            }
        }

        const path = this._getPathForRoute(route);
        if (!path) {
            console.error(`❌ مسیر برای "${routeId}" یافت نشد.`);
            return;
        }

        // به‌روزرسانی URL
        if (replace) {
            window.history.replaceState({ route: routeId }, '', path);
        } else {
            window.history.pushState({ route: routeId }, '', path);
        }

        // مدیریت نمایش صفحه
        this._handleRoute(path, true);
    }

    /*---------------------------------------------------------
    متد goBack

    وظیفه: بازگشت به صفحه قبلی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    goBack() {
        window.history.back();
    }

    /*---------------------------------------------------------
    متد goForward

    وظیفه: رفتن به صفحه بعدی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    goForward() {
        window.history.forward();
    }

    /*---------------------------------------------------------
    متد reload

    وظیفه: بارگذاری مجدد صفحه فعلی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    reload() {
        if (this.currentRoute) {
            this.navigate(this.currentRoute.id, true);
        } else {
            window.location.reload();
        }
    }

    /*---------------------------------------------------------
    متد getCurrentRoute

    وظیفه: دریافت مسیر فعلی

    ورودی‌ها: none

    خروجی: object|null

    ---------------------------------------------------------*/
    getCurrentRoute() {
        return this.currentRoute;
    }

    /*---------------------------------------------------------
    متد getCurrentPage

    وظیفه: دریافت صفحه فعلی

    ورودی‌ها: none

    خروجی: string|null

    ---------------------------------------------------------*/
    getCurrentPage() {
        return this.currentPage;
    }

    /*---------------------------------------------------------
    متد _findRouteById

    وظیفه: یافتن مسیر با شناسه

    ورودی‌ها: id (string)

    خروجی: object|null

    ---------------------------------------------------------*/
    _findRouteById(id) {
        if (!id) return null;
        const normalizedId = String(id).trim();
        let route = Object.values(this.routes).find(route => route.id === normalizedId);
        if (!route) {
            route = Object.values(this.routes).find(route => route.component === normalizedId);
        }
        if (!route && normalizedId.startsWith('/')) {
            route = this._findRouteByPath(normalizedId);
        }
        return route || null;
    }

    /*---------------------------------------------------------
    متد _normalizePath

    وظیفه: تبدیل آدرس‌ها به قالب مسیر داخلی

    ورودی‌ها: path (string)

    خروجی: string

    ---------------------------------------------------------*/
    _normalizePath(path) {
        if (!path || typeof path !== 'string') return '/';
        let cleanPath = path.replace(/\\/g, '/');
        if (cleanPath.endsWith('/index.html')) {
            return '/';
        }
        if (cleanPath.includes('/index.html')) {
            cleanPath = cleanPath.substring(0, cleanPath.indexOf('/index.html')) || '/';
        }
        cleanPath = cleanPath.replace(/\/$/, '') || '/';
        return cleanPath;
    }

    /*---------------------------------------------------------
    متد _findRouteByPath

    وظیفه: یافتن مسیر با آدرس

    ورودی‌ها: path (string)

    خروجی: object|null

    ---------------------------------------------------------*/
    _findRouteByPath(path) {
        const cleanPath = this._normalizePath(path);
        return this.routes[cleanPath] || null;
    }

    /*---------------------------------------------------------
    متد _getPathForRoute

    وظیفه: دریافت آدرس برای یک مسیر

    ورودی‌ها: route (object)

    خروجی: string|null

    ---------------------------------------------------------*/
    _getPathForRoute(route) {
        for (const [path, r] of Object.entries(this.routes)) {
            if (r === route) {
                return path;
            }
        }
        return null;
    }

    /*---------------------------------------------------------
    متد _handleRoute

    وظیفه: پردازش و نمایش مسیر

    ورودی‌ها: path (string), updateState (boolean)

    خروجی: void

    ---------------------------------------------------------*/
    async _handleRoute(path, updateState = true) {
        if (this._transitioning) return;

        const route = this._findRouteByPath(path);
        if (!route) {
            console.warn(`⚠️ مسیر "${path}" یافت نشد، بازگشت به خانه.`);
            this.navigate('home');
            return;
        }

        // بررسی نیاز به احراز هویت
        if (route.requiresAuth) {
            const user = State.get('currentUser');
            if (!user) {
                this.navigate('login');
                return;
            }
        }

        this._transitioning = true;

        try {
            // ذخیره موقعیت اسکرول صفحه قبلی
            if (this.currentRoute) {
                this._scrollPositions.set(this.currentRoute.id, window.scrollY);
            }

            // به‌روزرسانی مسیر جاری
            const previousRoute = this.currentRoute;
            this.currentRoute = route;
            this.currentPage = route.component;

            // به‌روزرسانی وضعیت
            if (updateState) {
                State.set('currentPage', route.component);
            }

            // نمایش صفحه
            await this._renderPage(route, previousRoute);

            // مدیریت اسکرول
            this._handleScroll(route);

            // انتشار رویداد تغییر مسیر
            document.dispatchEvent(new CustomEvent('routeChanged', {
                detail: { route, previousRoute }
            }));

            // به‌روزرسانی عنوان صفحه
            this._updateTitle(route);

            // به‌روزرسانی لینک‌های فعال
            this._updateActiveLinks(route);

        } catch (error) {
            console.error('❌ خطا در نمایش مسیر:', error);
        } finally {
            this._transitioning = false;
        }
    }

    /*---------------------------------------------------------
    متد _renderPage

    وظیفه: رندر صفحه مربوط به مسیر

    ورودی‌ها: route (object), previousRoute (object|null)

    خروجی: void

    ---------------------------------------------------------*/
    async _renderPage(route, previousRoute) {
        // اگر صفحه دارای بخش مشخص است، به آن بخش اسکرول می‌شود
        if (route.section) {
            const section = document.querySelector(route.section);
            if (section) {
                // نمایش بخش
                section.style.display = '';
                // مخفی کردن بخش‌های دیگر (اختیاری)
                if (previousRoute && previousRoute.section && previousRoute.section !== route.section) {
                    const prevSection = document.querySelector(previousRoute.section);
                    if (prevSection) {
                        // برخی بخش‌ها را مخفی نمی‌کنیم تا تجربه کاربری بهتر باشد
                        // فقط اگر بخش خاصی باشد که نباید نمایش داده شود
                    }
                }
                return;
            }
        }

        // اگر صفحه نیاز به رندر دینامیک دارد (مثل dashboard, cart, orders)
        // این بخش توسط کامپوننت‌های مربوطه مدیریت می‌شود
        // فقط اطمینان از نمایش بخش مربوطه
        if (route.section) {
            const section = document.querySelector(route.section);
            if (section) {
                section.style.display = '';
            }
        }
    }

    /*---------------------------------------------------------
    متد _handleScroll

    وظیفه: مدیریت اسکرول به بخش مربوطه

    ورودی‌ها: route (object)

    خروجی: void

    ---------------------------------------------------------*/
    _handleScroll(route) {
        if (route.section) {
            const target = document.querySelector(route.section);
            if (target) {
                // اگر موقعیت اسکرول قبلی برای این مسیر ذخیره شده است
                const savedScroll = this._scrollPositions.get(route.id);
                if (savedScroll !== undefined && savedScroll > 0) {
                    window.scrollTo({ top: savedScroll, behavior: 'smooth' });
                    return;
                }

                // اسکرول به بخش
                const offset = 80; // ارتفاع هدر ثابت
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        } else {
            // اگر مسیر خاصی ندارد، به بالای صفحه بروید
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /*---------------------------------------------------------
    متد _updateTitle

    وظیفه: به‌روزرسانی عنوان صفحه

    ورودی‌ها: route (object)

    خروجی: void

    ---------------------------------------------------------*/
    _updateTitle(route) {
        const title = `${route.title} | ${Config.APP.NAME}`;
        document.title = title;
    }

    /*---------------------------------------------------------
    متد _updateActiveLinks

    وظیفه: به‌روزرسانی کلاس فعال لینک‌های منو

    ورودی‌ها: route (object)

    خروجی: void

    ---------------------------------------------------------*/
    _updateActiveLinks(route) {
        const activeClass = 'active';
        const sectionId = route.section ? route.section.substring(1) : route.id;

        // به‌روزرسانی لینک‌های منوی اصلی و موبایل
        document.querySelectorAll('.navbar__nav a, .navbar__mobile a').forEach(link => {
            const href = link.getAttribute('href');
            link.classList.remove(activeClass);

            if (href) {
                const targetId = href.startsWith('#') ? href.substring(1) : href;
                if (targetId === sectionId || targetId === route.id) {
                    link.classList.add(activeClass);
                }
                // اگر مسیر با #home و بخش home باشد
                if (sectionId === 'home' && (targetId === '/' || targetId === 'home')) {
                    link.classList.add(activeClass);
                }
            }
        });
    }

    /*---------------------------------------------------------
    متد addRoute

    وظیفه: افزودن مسیر جدید به صورت پویا

    ورودی‌ها: path (string), config (object)

    خروجی: void

    ---------------------------------------------------------*/
    addRoute(path, config) {
        if (this.routes[path]) {
            console.warn(`⚠️ مسیر "${path}" از قبل وجود دارد.`);
            return;
        }
        this.routes[path] = {
            id: config.id || path.replace('/', ''),
            title: config.title || path,
            component: config.component || config.id,
            section: config.section || null,
            requiresAuth: config.requiresAuth || false,
        };
    }

    /*---------------------------------------------------------
    متد removeRoute

    وظیفه: حذف مسیر

    ورودی‌ها: path (string)

    خروجی: void

    ---------------------------------------------------------*/
    removeRoute(path) {
        if (this.routes[path]) {
            delete this.routes[path];
        }
    }

    /*---------------------------------------------------------
    متد getRoutes

    وظیفه: دریافت لیست تمام مسیرها

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    getRoutes() {
        return { ...this.routes };
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        // پاکسازی event listenerها
        // (در این پیاده‌سازی ساده، نیازی به حذف دستی نیست)
        this.initialized = false;
        console.log('🧹 Router پاکسازی شد.');
    }
}

// ===== ایجاد نمونه واحد =====
const router = new Router();

// ===== صادرات =====
export { Router, router };
export default router;