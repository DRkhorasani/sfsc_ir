/*=========================================================
نام فایل: app.js

وظیفه: نقطه ورود اصلی برنامه. بارگذاری و مقداردهی اولیه تمام ماژول‌ها،
راه‌اندازی رویدادهای عمومی و مدیریت چرخه حیات برنامه

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from './state.js';
import { Router } from './router.js';
import { Translator } from './translator.js';
import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { Modal } from './modal.js';
import { Products } from './products.js';
import { Services } from './services.js';
import { News } from './news.js';
import { FAQ } from './faq.js';
import { Dashboard } from './dashboard.js';
import { Cart } from './cart.js';
import { validators } from './validators.js';
import { utils } from './utils.js';
import { Navbar } from '../components/navbar.js';
import { Footer } from '../components/footer.js';

/*---------------------------------------------------------
کلاس App

وظیفه: مدیریت چرخه حیات برنامه، مقداردهی اولیه ماژول‌ها،
اتصال رویدادها و هماهنگی بین کامپوننت‌ها

ورودی‌ها: none

خروجی: نمونه‌ای از کلاس App

---------------------------------------------------------*/
class App {
    constructor() {
        this.initialized = false;
        this.modules = {};
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه تمام ماژول‌های برنامه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async init() {
        if (this.initialized) return;

        try {
            // 1. بارگذاری زبان ذخیره شده
            const savedLang = Storage.get('language', 'fa');
            State.set('language', savedLang);

            // 2. مقداردهی Translator
            this.modules.translator = new Translator();
            await this.modules.translator.init(savedLang);

            // 3. اعمال ترجمه اولیه
            this.modules.translator.translatePage();

            // 4. مقداردهی Router
            this.modules.router = new Router();
            this.modules.router.init();

            // 5. مقداردهی Auth
            this.modules.auth = new Auth();
            this.modules.auth.init();

            // 6. مقداردهی Modal
            this.modules.modal = new Modal();

            // 7. مقداردهی کامپوننت‌ها
            this.modules.navbar = new Navbar();
            this.modules.navbar.init();

            this.modules.footer = new Footer();
            this.modules.footer.init();

            // 8. مقداردهی بخش‌های اصلی
            this.modules.products = new Products();
            await this.modules.products.init();

            this.modules.services = new Services();
            await this.modules.services.init();

            this.modules.news = new News();
            await this.modules.news.init();

            this.modules.faq = new FAQ();
            await this.modules.faq.init();

            this.modules.dashboard = new Dashboard();
            await this.modules.dashboard.init();

            this.modules.cart = new Cart();
            await this.modules.cart.init();

            // 9. راه‌اندازی رویدادهای عمومی
            this._bindGlobalEvents();

            // 10. شمارنده‌های آماری
            this._initCounters();

            // 11. افکت Reveal
            this._initReveal();

            // 12. پارالاکس
            this._initParallax();

            // 13. بارگذاری وضعیت کاربر از LocalStorage
            this._loadUserState();

            this.initialized = true;
            console.log('✅ برنامه با موفقیت مقداردهی شد.');

        } catch (error) {
            console.error('❌ خطا در مقداردهی برنامه:', error);
        }
    }

    /*---------------------------------------------------------
    متد _bindGlobalEvents

    وظیفه: اتصال رویدادهای عمومی سطح برنامه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindGlobalEvents() {
        // رویداد تغییر زبان
        document.addEventListener('langChanged', (e) => {
            State.set('language', e.detail.lang);
            this.modules.translator.setLanguage(e.detail.lang);
            this.modules.translator.translatePage();
            // به‌روزرسانی جهت صفحه
            document.documentElement.dir = e.detail.lang === 'fa' ? 'rtl' : 'ltr';
            // بازرندر بخش‌های دینامیک
            this.modules.products.render();
            this.modules.services.render();
            this.modules.news.render();
            this.modules.faq.render();
        });

        // رویداد تغییر وضعیت احراز هویت
        document.addEventListener('authChanged', (e) => {
            State.set('currentUser', e.detail.user);
            this.modules.navbar.updateAuthState(e.detail.user);
            this._updateAuthPanels(e.detail.user);
        });

        // رویداد تغییر وضعیت سبد خرید
        document.addEventListener('cartUpdated', (e) => {
            State.set('cart', e.detail.cart);
            this.modules.navbar.updateCartCount(e.detail.cart.length);
        });

        // Event Delegation برای دکمه‌های عمومی
        document.addEventListener('click', (e) => {
            // دکمه مشاوره
            const consultBtn = e.target.closest('#consultBtn, [data-action="consult"]');
            if (consultBtn) {
                e.preventDefault();
                const contactSection = document.querySelector('#contact');
                if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                }
            }

            // دکمه منوی موبایل
            const mobileBtn = e.target.closest('#mobileMenuBtn');
            if (mobileBtn) {
                const menu = document.getElementById('mobileMenu');
                if (menu) {
                    menu.classList.toggle('open');
                }
            }

            // دکمه ورود/ثبت نام
            const authBtn = e.target.closest('#authBtnNav, [data-action="auth"]');
            if (authBtn) {
                e.preventDefault();
                const authSection = document.querySelector('#auth');
                if (authSection) {
                    authSection.scrollIntoView({ behavior: 'smooth' });
                }
            }

            // بستن منوی موبایل با کلیک روی لینک‌ها
            const mobileLink = e.target.closest('.navbar__mobile a');
            if (mobileLink) {
                const menu = document.getElementById('mobileMenu');
                if (menu) {
                    menu.classList.remove('open');
                }
            }

            // کلیک روی دکمه‌های زبان
            const langBtn = e.target.closest('.lang-btn');
            if (langBtn) {
                const lang = langBtn.dataset.lang;
                if (lang && lang !== State.get('language')) {
                    document.dispatchEvent(new CustomEvent('langChanged', {
                        detail: { lang }
                    }));
                    // به‌روزرسانی کلاس فعال
                    document.querySelectorAll('.lang-btn').forEach(btn => {
                        btn.classList.toggle('lang-btn--active', btn.dataset.lang === lang);
                    });
                }
            }
        });

        // Event Delegation برای فرم تماس
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('cname')?.value?.trim();
                const email = document.getElementById('cemail')?.value?.trim();
                const type = document.getElementById('ctype')?.value;
                const msg = document.getElementById('cmsg')?.value?.trim();

                if (!name || !email || !msg) {
                    utils.toast('لطفاً تمام فیلدهای ضروری را پر کنید.', 'error');
                    return;
                }

                if (!validators.isEmail(email)) {
                    utils.toast('ایمیل وارد شده معتبر نیست.', 'error');
                    return;
                }

                // شبیه‌سازی ارسال
                utils.toast('درخواست شما با موفقیت ثبت شد.', 'success');
                contactForm.reset();
            });
        }

        // رویداد تغییر متد ورود
        const loginMethod = document.getElementById('loginMethod');
        if (loginMethod) {
            loginMethod.addEventListener('change', (e) => {
                const method = e.target.value;
                const passwordWrapper = document.getElementById('passwordLoginWrapper');
                const otpWrapper = document.getElementById('otpLoginWrapper');
                if (passwordWrapper) {
                    passwordWrapper.classList.toggle('hidden', method === 'otp');
                }
                if (otpWrapper) {
                    otpWrapper.classList.toggle('hidden', method === 'password');
                }
            });
        }

        // رویداد تغییر تم (در صورت نیاز)
        const themeToggle = document.querySelector('[data-action="theme-toggle"]');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                Storage.set('theme', newTheme);
                State.set('theme', newTheme);
            });
        }
    }

    /*---------------------------------------------------------
    متد _initCounters

    وظیفه: راه‌اندازی شمارنده‌های آماری با افکت شمارش

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _initCounters() {
        const counters = document.querySelectorAll('.stats__number[data-target]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.getAttribute('data-target'), 10);
                    if (isNaN(target) || target <= 0) return;

                    let current = 0;
                    const increment = Math.ceil(target / 60);
                    const duration = 1500;
                    const stepTime = Math.floor(duration / 60);

                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            el.textContent = target;
                            clearInterval(timer);
                            el.classList.add('counter-pop');
                        } else {
                            el.textContent = current;
                        }
                    }, stepTime);

                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.3 });

        counters.forEach(c => observer.observe(c));
    }

    /*---------------------------------------------------------
    متد _initReveal

    وظیفه: راه‌اندازی افکت نمایش تدریجی المان‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _initReveal() {
        const elements = document.querySelectorAll('.reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        elements.forEach(el => observer.observe(el));
    }

    /*---------------------------------------------------------
    متد _initParallax

    وظیفه: راه‌اندازی افکت پارالاکس برای المان‌های دارای data-parallax

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _initParallax() {
        const items = document.querySelectorAll('[data-parallax]');
        if (items.length === 0) return;

        const handleScroll = () => {
            const scrollY = window.scrollY;
            items.forEach(item => {
                const speed = parseFloat(item.dataset.parallax) || 0.2;
                const offset = scrollY * speed;
                item.style.transform = `translateY(${offset}px)`;
            });
        };

        // استفاده از requestAnimationFrame برای بهبود عملکرد
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    /*---------------------------------------------------------
    متد _loadUserState

    وظیفه: بارگذاری وضعیت کاربر از LocalStorage

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _loadUserState() {
        const user = Storage.get('user', null);
        if (user) {
            State.set('currentUser', user);
            document.dispatchEvent(new CustomEvent('authChanged', {
                detail: { user }
            }));
        }
    }

    /*---------------------------------------------------------
    متد _updateAuthPanels

    وظیفه: به‌روزرسانی وضعیت پنل‌های احراز هویت بر اساس کاربر

    ورودی‌ها: user (object|null)

    خروجی: void

    ---------------------------------------------------------*/
    _updateAuthPanels(user) {
        // این متد توسط کامپوننت Auth مدیریت می‌شود
        // اما برای هماهنگی، رویداد را مجدداً ارسال می‌کنیم
        const authModule = this.modules.auth;
        if (authModule) {
            authModule.updateUI(user);
        }
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع و رویدادها (در صورت نیاز)

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        // پاکسازی observerها و event listenerها در صورت نیاز
        this.initialized = false;
        console.log('🧹 برنامه پاکسازی شد.');
    }
}

// ===== مقداردهی اولیه برنامه پس از بارگذاری کامل DOM =====
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

    // ذخیره نمونه برنامه در window برای دسترسی در کنسول (debug)
    window.__APP__ = app;
});

// ===== مدیریت خطاهای کلی =====
window.addEventListener('error', (e) => {
    console.error('❌ خطای全局:', e.message, e.filename, e.lineno);
});

// ===== مدیریت promise rejection =====
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ خطای Promise مدیریت نشده:', e.reason);
});

export default App;