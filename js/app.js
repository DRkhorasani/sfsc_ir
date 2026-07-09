/*=========================================================
نام فایل: app.js

وظیفه: نقطه ورود اصلی برنامه. بارگذاری و مقداردهی اولیه تمام ماژول‌ها،
راه‌اندازی رویدادهای عمومی و مدیریت چرخه حیات برنامه

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from './state.js';
import { Router } from './router.js';
import { translator } from './translator.js';
import { Storage } from './storage.js';
import { Auth } from './auth.js';
import Modal from './modal.js';
import ProductsPage from '../pages/products.js';
import ServicesPage from '../pages/services.js';
import NewsPage from '../pages/news.js';
import FAQPage from '../pages/faq.js';
import DashboardPage from '../pages/dashboard.js';
import CartPage from '../pages/cart.js';
import { validators } from './validators.js';
import { utils } from './utils.js';
import Navbar from '../components/navbar.js';
import Footer from '../components/footer.js';

/*---------------------------------------------------------
کلاس App

وظیفه: مدیریت چرخه حیات برنامه، مقداردهی اولیه ماژول‌ها،
اتصال رویدادها و هماهنگی بین کامپوننت‌ها

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
            this.modules.translator = translator;
            await this.modules.translator.init(savedLang);

            // 3. اعمال ترجمه اولیه
            this.modules.translator.translatePage();

            // 4. مقداردهی Auth (قبل از Router)
            this.modules.auth = Auth;
            this.modules.auth.init();

            // 5. مقداردهی Router (بعد از Auth)
            this.modules.router = new Router();
            this.modules.router.init();

            // 6. مقداردهی Modal
            this.modules.modal = Modal;

            // 7. مقداردهی کامپوننت‌ها
            this.modules.navbar = new Navbar();
            this.modules.navbar.init();

            this.modules.footer = new Footer();
            this.modules.footer.init();

            // 8. مقداردهی بخش‌های اصلی (با بررسی مسیر فعلی)
            await this._initPages();

            // 9. راه‌اندازی رویدادهای عمومی
            this._bindGlobalEvents();

            // 10. راه‌اندازی رویدادهای احراز هویت
            this._bindAuthEvents();

            // 11. تعریف توابع سراسری برای سازگاری با onclick
            this._defineGlobalFunctions();

            // 12. شمارنده‌های آماری
            this._initCounters();

            // 13. افکت Reveal
            this._initReveal();

            // 14. پارالاکس
            this._initParallax();

            // 15. بارگذاری وضعیت کاربر از LocalStorage
            this._loadUserState();

            // 16. حذف هش از URL و اسکرول به بالای صفحه
            if (window.location.hash) {
                history.replaceState(null, '', window.location.pathname);
            }
            window.scrollTo(0, 0);

            this.initialized = true;
            console.log('✅ برنامه با موفقیت مقداردهی شد.');

        } catch (error) {
            console.error('❌ خطا در مقداردهی برنامه:', error);
        }
    }

    /*---------------------------------------------------------
    متد _initPages

    وظیفه: مقداردهی صفحات بر اساس مسیر فعلی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async _initPages() {
        const currentRoute = this.modules.router.getCurrentRoute();
        const currentPageId = currentRoute?.id || 'home';

        // مقداردهی صفحات عمومی (همیشه نیاز نیست)
        this.modules.products = new ProductsPage();
        this.modules.services = new ServicesPage();
        this.modules.news = new NewsPage();
        this.modules.faq = new FAQPage();

        // مقداردهی صفحات عمومی بدون شرط (چون نیازی به احراز هویت ندارند)
        await this.modules.products.init();
        await this.modules.services.init();
        await this.modules.news.init();
        await this.modules.faq.init();

        // مقداردهی صفحات نیازمند احراز هویت فقط در صورت نیاز
        if (currentPageId === 'dashboard') {
            this.modules.dashboard = new DashboardPage();
            await this.modules.dashboard.init();
        } else {
            // یک نمونه خالی برای جلوگیری از خطا
            this.modules.dashboard = { init: () => {} };
        }

        if (currentPageId === 'cart') {
            this.modules.cart = new CartPage();
            await this.modules.cart.init();
        } else {
            this.modules.cart = { init: () => {} };
        }

        console.log(`✅ صفحات مقداردهی شدند (صفحه فعلی: ${currentPageId})`);
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
            document.documentElement.dir = e.detail.lang === 'fa' ? 'rtl' : 'ltr';

            const refreshModule = (module) => {
                if (!module || typeof module._updateLanguage !== 'function') return;
                module._updateLanguage();
            };

            refreshModule(this.modules.products);
            refreshModule(this.modules.services);
            refreshModule(this.modules.news);
            refreshModule(this.modules.faq);
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

        // ===== باز کردن تصاویر گالری و گواهی‌ها در مودال =====
        document.addEventListener('click', (e) => {
            const img = e.target.closest('.gallery__img, .brand__gallery-img');
            if (img && img.tagName === 'IMG') {
                const src = img.getAttribute('src');
                if (src) {
                    e.preventDefault();
                    this.modules.modal.open(
                        `<div style="text-align:center;padding:0.5rem;">
                            <img src="${src}" style="max-width:100%;max-height:80vh;border-radius:1rem;box-shadow:0 10px 30px rgba(0,0,0,0.3);" alt="تصویر گالری" />
                        </div>`,
                        {
                            maxWidth: '90vw',
                            className: 'gallery-modal',
                            closeOnOverlay: true,
                            closeOnEscape: true,
                        }
                    );
                }
            }
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

        // رویداد تغییر تم
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
    متد _bindAuthEvents

    وظیفه: اتصال رویدادهای مربوط به احراز هویت (ثبت‌نام، ورود، پروفایل)

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindAuthEvents() {
        // ===== دکمه ثبت نام =====
        const registerBtn = document.getElementById('authRegisterPrimary');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this._handleRegister();
            });
        }

        // ===== دکمه ورود =====
        const loginBtn = document.getElementById('authLoginPrimary');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this._handleLogin();
            });
        }

        // ===== دکمه خروج =====
        const logoutBtn = document.getElementById('authLogoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this._handleLogout();
            });
        }

        // ===== دکمه تغییر رمز عبور =====
        const changePasswordBtn = document.getElementById('authSavePasswordButton');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this._handleChangePassword();
            });
        }

        // ===== دکمه تایید OTP در ثبت نام =====
        const otpBtn = document.getElementById('authRegisterOtpButton');
        if (otpBtn) {
            otpBtn.addEventListener('click', () => {
                this._handleRegisterOtp();
            });
        }

        // ===== دکمه تایید OTP در ورود =====
        const loginOtpVerifyBtn = document.getElementById('authLoginVerifyButton');
        if (loginOtpVerifyBtn) {
            loginOtpVerifyBtn.addEventListener('click', () => {
                this._handleLoginOtpVerify();
            });
        }

        // ===== تب‌های ثبت نام، ورود و پروفایل =====
        const tabs = document.querySelectorAll('.auth__tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const panel = tab.dataset.panel;
                if (panel) {
                    this._switchAuthPanel(panel);
                }
            });
        });

        // ===== لینک "قبلاً حساب دارم" =====
        const altRegister = document.getElementById('authRegisterAlt');
        if (altRegister) {
            altRegister.addEventListener('click', () => {
                this._switchAuthPanel('login');
            });
        }

        // ===== لینک "ثبت نام جدید" =====
        const altLogin = document.getElementById('authLoginAlt');
        if (altLogin) {
            altLogin.addEventListener('click', () => {
                this._switchAuthPanel('register');
            });
        }
    }

    /*---------------------------------------------------------
    متدهای مدیریت احراز هویت
    ---------------------------------------------------------*/

    /*---------------------------------------------------------
    _switchAuthPanel

    وظیفه: تغییر پنل احراز هویت (ثبت نام، ورود، پروفایل)

    ورودی‌ها: panel (string)

    خروجی: void

    ---------------------------------------------------------*/
    _switchAuthPanel(panel) {
        const registerPanel = document.getElementById('registerPanel');
        const loginPanel = document.getElementById('loginPanel');
        const profilePanel = document.getElementById('profilePanel');
        const tabs = document.querySelectorAll('.auth__tab');

        // مخفی کردن همه پنل‌ها
        if (registerPanel) registerPanel.classList.add('hidden');
        if (loginPanel) loginPanel.classList.add('hidden');
        if (profilePanel) profilePanel.classList.add('hidden');

        // نمایش پنل انتخاب شده
        if (panel === 'register' && registerPanel) {
            registerPanel.classList.remove('hidden');
        } else if (panel === 'login' && loginPanel) {
            loginPanel.classList.remove('hidden');
        } else if (panel === 'profile' && profilePanel) {
            profilePanel.classList.remove('hidden');
            // بارگذاری اطلاعات پروفایل
            this._loadProfile();
        }

        // به‌روزرسانی کلاس فعال تب‌ها
        tabs.forEach(tab => {
            tab.classList.toggle('auth__tab--active', tab.dataset.panel === panel);
        });
    }

    /*---------------------------------------------------------
    _handleRegister

    وظیفه: مدیریت ثبت نام کاربر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async _handleRegister() {
        const username = document.getElementById('regUsername')?.value?.trim();
        const mobile = document.getElementById('regMobile')?.value?.trim();
        const email = document.getElementById('regEmail')?.value?.trim();
        const password = document.getElementById('regPassword')?.value;
        const confirmPassword = document.getElementById('regConfirmPassword')?.value;

        if (!username || !mobile || !email || !password || !confirmPassword) {
            utils.toast('لطفاً تمام فیلدها را پر کنید.', 'error');
            return;
        }

        try {
            const result = await Auth.register({
                username,
                mobile,
                email,
                password,
                confirmPassword,
            });

            if (result.success) {
                utils.toast(result.message, 'success');
                // نمایش بخش OTP
                const otpWrapper = document.getElementById('regOtpWrapper');
                if (otpWrapper) otpWrapper.classList.remove('hidden');
            } else {
                utils.toast(result.message || 'خطا در ثبت نام', 'error');
            }
        } catch (error) {
            utils.toast(error.message || 'خطا در ثبت نام', 'error');
        }
    }

    /*---------------------------------------------------------
    _handleRegisterOtp

    وظیفه: تایید OTP ثبت نام

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async _handleRegisterOtp() {
        const otp = document.getElementById('regOtp')?.value?.trim();
        const mobile = document.getElementById('regMobile')?.value?.trim();

        if (!otp) {
            utils.toast('لطفاً کد تایید را وارد کنید.', 'error');
            return;
        }

        try {
            const result = await Auth.verifyOTP(mobile, otp, 'register');
            if (result.success) {
                utils.toast(result.message || 'ثبت نام با موفقیت تکمیل شد.', 'success');
                // هدایت به صفحه ورود یا پروفایل
                setTimeout(() => {
                    this._switchAuthPanel('login');
                }, 1000);
            } else {
                utils.toast(result.message || 'کد تایید نامعتبر است.', 'error');
            }
        } catch (error) {
            utils.toast(error.message || 'خطا در تایید کد', 'error');
        }
    }

    /*---------------------------------------------------------
    _handleLogin

    وظیفه: مدیریت ورود کاربر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async _handleLogin() {
        const method = document.getElementById('loginMethod')?.value || 'password';
        const mobile = document.getElementById('loginMobile')?.value?.trim();

        if (!mobile) {
            utils.toast('لطفاً شماره موبایل را وارد کنید.', 'error');
            return;
        }

        if (method === 'password') {
            const password = document.getElementById('loginPassword')?.value;
            if (!password) {
                utils.toast('لطفاً رمز عبور را وارد کنید.', 'error');
                return;
            }
            try {
                const result = await Auth.login({ mobile, password });
                if (result.success) {
                    utils.toast(result.message, 'success');
                    // به‌روزرسانی UI
                    this._switchAuthPanel('profile');
                } else {
                    utils.toast(result.message || 'خطا در ورود', 'error');
                }
            } catch (error) {
                utils.toast(error.message || 'خطا در ورود', 'error');
            }
        } else {
            // روش OTP
            try {
                const result = await Auth.sendOTP(mobile, 'login');
                if (result.success) {
                    utils.toast(result.message, 'success');
                    // نمایش بخش OTP
                    const otpWrapper = document.getElementById('otpLoginWrapper');
                    if (otpWrapper) otpWrapper.classList.remove('hidden');
                } else {
                    utils.toast(result.message || 'خطا در ارسال کد', 'error');
                }
            } catch (error) {
                utils.toast(error.message || 'خطا در ارسال کد', 'error');
            }
        }
    }

    /*---------------------------------------------------------
    _handleLoginOtpVerify

    وظیفه: تایید OTP ورود

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async _handleLoginOtpVerify() {
        const otp = document.getElementById('loginOtp')?.value?.trim();
        const mobile = document.getElementById('loginMobile')?.value?.trim();

        if (!otp) {
            utils.toast('لطفاً کد OTP را وارد کنید.', 'error');
            return;
        }

        try {
            const result = await Auth.verifyOTP(mobile, otp, 'login');
            if (result.success) {
                utils.toast(result.message || 'ورود با موفقیت انجام شد.', 'success');
                this._switchAuthPanel('profile');
            } else {
                utils.toast(result.message || 'کد نامعتبر است.', 'error');
            }
        } catch (error) {
            utils.toast(error.message || 'خطا در تایید کد', 'error');
        }
    }

    /*---------------------------------------------------------
    _handleLogout

    وظیفه: خروج از حساب کاربری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async _handleLogout() {
        try {
            await Auth.logout();
            utils.toast('با موفقیت خارج شدید.', 'success');
            this._switchAuthPanel('login');
            // به‌روزرسانی نوار ناوبری
            this.modules.navbar.updateAuthState(null);
        } catch (error) {
            utils.toast(error.message || 'خطا در خروج', 'error');
        }
    }

    /*---------------------------------------------------------
    _handleChangePassword

    وظیفه: تغییر رمز عبور

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async _handleChangePassword() {
        const currentPassword = document.getElementById('profileCurrentPassword')?.value;
        const newPassword = document.getElementById('profileNewPassword')?.value;

        if (!currentPassword || !newPassword) {
            utils.toast('لطفاً هر دو فیلد را پر کنید.', 'error');
            return;
        }

        try {
            const result = await Auth.changePassword(currentPassword, newPassword);
            if (result.success) {
                utils.toast(result.message, 'success');
                document.getElementById('profileCurrentPassword').value = '';
                document.getElementById('profileNewPassword').value = '';
            } else {
                utils.toast(result.message || 'خطا در تغییر رمز', 'error');
            }
        } catch (error) {
            utils.toast(error.message || 'خطا در تغییر رمز', 'error');
        }
    }

    /*---------------------------------------------------------
    _loadProfile

    وظیفه: بارگذاری اطلاعات پروفایل کاربر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    async _loadProfile() {
        const user = Auth.getCurrentUser();
        if (user) {
            document.getElementById('profileUsername').textContent = user.username || '-';
            document.getElementById('profileMobile').textContent = user.mobile || '-';
            document.getElementById('profileEmail').textContent = user.email || '-';
        } else {
            // تلاش برای دریافت از سرور
            try {
                const result = await Auth.getProfile();
                if (result.success) {
                    const data = result.data?.user || result.data;
                    document.getElementById('profileUsername').textContent = data.username || '-';
                    document.getElementById('profileMobile').textContent = data.mobile || '-';
                    document.getElementById('profileEmail').textContent = data.email || '-';
                }
            } catch (error) {
                console.warn('⚠️ خطا در بارگذاری پروفایل:', error);
            }
        }
    }

    /*---------------------------------------------------------
    _defineGlobalFunctions

    وظیفه: تعریف توابع سراسری برای سازگاری با onclick در HTML

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _defineGlobalFunctions() {
        // تعریف تابع switchAuthPanel در سطح global
        window.switchAuthPanel = (panel) => {
            this._switchAuthPanel(panel);
        };

        // تعریف تابع handleRegister در سطح global
        window.handleRegister = () => {
            this._handleRegister();
        };

        // تعریف تابع handleLogin در سطح global
        window.handleLogin = () => {
            this._handleLogin();
        };

        // تعریف تابع handleLogout در سطح global
        window.handleLogout = () => {
            this._handleLogout();
        };

        // تعریف تابع handleChangePassword در سطح global
        window.handleChangePassword = () => {
            this._handleChangePassword();
        };

        // تعریف تابع handleRegisterOtp در سطح global
        window.handleRegisterOtp = () => {
            this._handleRegisterOtp();
        };

        // تعریف تابع handleLoginOtpVerify در سطح global
        window.handleLoginOtpVerify = () => {
            this._handleLoginOtpVerify();
        };
    }

    /*---------------------------------------------------------
    متدهای کمکی (شمارنده، Reveal، پارالاکس، ...)
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

    _loadUserState() {
        const user = Storage.get('user', null);
        if (user) {
            State.set('currentUser', user);
            document.dispatchEvent(new CustomEvent('authChanged', {
                detail: { user }
            }));
        }
    }

    _updateAuthPanels(user) {
        // به‌روزرسانی نوار ناوبری و سایر بخش‌ها
    }

    destroy() {
        this.initialized = false;
        console.log('🧹 برنامه پاکسازی شد.');
    }
}

// ===== مقداردهی اولیه برنامه =====
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    window.__APP__ = app;
});

window.addEventListener('error', (e) => {
    console.error('❌ خطای全局:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ خطای Promise مدیریت نشده:', e.reason);
});

export default App;