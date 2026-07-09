/*=========================================================
نام فایل: navbar.js

وظیفه: مدیریت نوار ناوبری (Header) شامل برند، منو، دکمه‌ها،
زبان، وضعیت احراز هویت و سبد خرید

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { Storage } from '../js/storage.js';
import { translator } from '../js/translator.js';
import { router } from '../js/router.js';
import { utils } from '../js/utils.js';

/*---------------------------------------------------------
کلاس Navbar

وظیفه: کنترل تمام رفتارهای مربوط به نوار ناوبری

---------------------------------------------------------*/
class Navbar {
    constructor() {
        this._element = null;
        this._mobileMenu = null;
        this._initialized = false;
        this._cartCount = 0;
        this._user = null;
        this._language = 'fa';
        this._subscribers = [];
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه نوار ناوبری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    init() {
        if (this._initialized) return;

        // دریافت المان‌ها
        this._element = document.querySelector('#navbar');
        this._mobileMenu = document.getElementById('mobileMenu');

        if (!this._element) {
            console.warn('⚠️ المان #navbar یافت نشد.');
            return;
        }

        // بارگذاری وضعیت اولیه
        this._loadState();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        // به‌روزرسانی اولیه UI
        this._updateUI();

        this._initialized = true;
        console.log('✅ Navbar مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadState

    وظیفه: بارگذاری وضعیت از State و Storage

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _loadState() {
        this._user = State.get('currentUser');
        this._language = State.get('language') || Storage.get('language', 'fa');
        const cart = State.get('cart') || Storage.get('cart', []);
        this._cartCount = Array.isArray(cart) ? cart.length : 0;
    }

    /*---------------------------------------------------------
    متد _subscribeToState

    وظیفه: اشتراک در تغییرات وضعیت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _subscribeToState() {
        // تغییر کاربر
        State.subscribe('currentUser', (user) => {
            this._user = user;
            this._updateAuthUI();
        });

        // تغییر سبد خرید
        State.subscribe('cart', (cart) => {
            this._cartCount = Array.isArray(cart) ? cart.length : 0;
            this._updateCartUI();
        });

        // تغییر زبان
        State.subscribe('language', (lang) => {
            this._language = lang || 'fa';
            this._updateLangUI();
        });

        // رویدادهای DOM
        document.addEventListener('authChanged', (e) => {
            this._user = e.detail.user;
            this._updateAuthUI();
        });

        document.addEventListener('cartUpdated', (e) => {
            this._cartCount = e.detail.cart?.length || 0;
            this._updateCartUI();
        });
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای مربوط به نوار ناوبری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // دکمه منوی موبایل
        const mobileBtn = document.getElementById('mobileMenuBtn');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileMenu();
            });
        }

        // بستن منو با کلیک بیرون
        document.addEventListener('click', (e) => {
            if (this._mobileMenu && this._mobileMenu.classList.contains('open')) {
                const isInside = this._element?.contains(e.target);
                if (!isInside) {
                    this.closeMobileMenu();
                }
            }
        });

        // بستن منو با کلید Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._mobileMenu?.classList.contains('open')) {
                this.closeMobileMenu();
            }
        });

        // رویداد تغییر مسیر برای بستن منو
        document.addEventListener('routeChanged', () => {
            this.closeMobileMenu();
        });

        // رویداد تغییر زبان از طریق دکمه‌های زبان
        document.querySelectorAll('.lang-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const lang = btn.dataset.lang;
                if (lang && lang !== this._language) {
                    document.dispatchEvent(new CustomEvent('langChanged', {
                        detail: { lang }
                    }));
                }
            });
        });

        // رویداد تغییر زبان از translator
        document.addEventListener('langChanged', (e) => {
            this._language = e.detail.lang;
            this._updateLangUI();
        });

        // اسکرول برای تغییر استایل هدر
        this._handleScroll();
    }

    /*---------------------------------------------------------
    متد _handleScroll

    وظیفه: مدیریت تغییرات استایل هدر هنگام اسکرول

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _handleScroll() {
        let lastScrollY = 0;
        let ticking = false;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const header = this._element;

            if (!header) return;

            // اضافه کردن سایه در هنگام اسکرول
            if (currentScrollY > 50) {
                header.classList.add('navbar--scrolled');
            } else {
                header.classList.remove('navbar--scrolled');
            }

            // مخفی/نمایش هدر در هنگام اسکرول (اختیاری)
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // اسکرول به پایین
                header.classList.add('navbar--hidden');
            } else {
                header.classList.remove('navbar--hidden');
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // اجرای اولیه
        handleScroll();
    }

    /*---------------------------------------------------------
    متد _updateUI

    وظیفه: به‌روزرسانی کامل UI

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateUI() {
        this._updateAuthUI();
        this._updateCartUI();
        this._updateLangUI();
        this._updateActiveLink();
    }

    /*---------------------------------------------------------
    متد _updateAuthUI

    وظیفه: به‌روزرسانی وضعیت احراز هویت در UI

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateAuthUI() {
        const authBtn = document.getElementById('authBtnNav');
        const consultBtn = document.getElementById('consultBtn');

        if (!authBtn) return;

        if (this._user) {
            // کاربر وارد شده
            const username = this._user.username || this._user.mobile || 'کاربر';
            const translated = translator.translate('authBtn') || 'ورود / ثبت نام';
            authBtn.innerHTML = `<i class="fas fa-user"></i> ${username}`;
            authBtn.setAttribute('data-i18n', '');
            authBtn.setAttribute('data-user', 'true');

            // تغییر رنگ و استایل
            authBtn.classList.add('btn--primary');
            authBtn.classList.remove('btn--dark');

            // دکمه مشاوره
            if (consultBtn) {
                consultBtn.style.display = '';
            }
        } else {
            // کاربر خارج شده
            const translated = translator.translate('authBtn') || 'ورود / ثبت نام';
            authBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${translated}`;
            authBtn.setAttribute('data-i18n', 'authBtn');
            authBtn.removeAttribute('data-user');

            authBtn.classList.remove('btn--primary');
            authBtn.classList.add('btn--dark');

            if (consultBtn) {
                consultBtn.style.display = '';
            }
        }
    }

    /*---------------------------------------------------------
    متد _updateCartUI

    وظیفه: به‌روزرسانی نشانگر سبد خرید

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateCartUI() {
        // پیدا کردن یا ایجاد نشانگر سبد خرید
        let cartBadge = this._element?.querySelector('.navbar__cart-badge');

        if (!cartBadge) {
            // ایجاد نشانگر اگر وجود ندارد
            const cartLink = this._element?.querySelector('[data-action="cart"]');
            if (cartLink) {
                cartBadge = document.createElement('span');
                cartBadge.className = 'navbar__cart-badge';
                cartLink.appendChild(cartBadge);
            }
        }

        if (cartBadge) {
            if (this._cartCount > 0) {
                cartBadge.textContent = this._cartCount > 99 ? '99+' : String(this._cartCount);
                cartBadge.style.display = 'inline-flex';
            } else {
                cartBadge.style.display = 'none';
            }
        }
    }

    /*---------------------------------------------------------
    متد _updateLangUI

    وظیفه: به‌روزرسانی وضعیت دکمه‌های زبان

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateLangUI() {
        document.querySelectorAll('.lang-btn').forEach((btn) => {
            const lang = btn.dataset.lang;
            btn.classList.toggle('lang-btn--active', lang === this._language);
        });
    }

    /*---------------------------------------------------------
    متد _updateActiveLink

    وظیفه: به‌روزرسانی لینک فعال در منو

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateActiveLink() {
        const currentRoute = router.getCurrentRoute();
        if (!currentRoute) return;

        const sectionId = currentRoute.section ? currentRoute.section.substring(1) : currentRoute.id;

        document.querySelectorAll('.navbar__nav a, .navbar__mobile a').forEach((link) => {
            const href = link.getAttribute('href');
            link.classList.remove('active');

            if (href) {
                const targetId = href.startsWith('#') ? href.substring(1) : href.replace('/', '');
                if (targetId === sectionId || targetId === currentRoute.id) {
                    link.classList.add('active');
                }
                if (sectionId === 'home' && (targetId === '/' || targetId === 'home' || targetId === '')) {
                    link.classList.add('active');
                }
            }
        });
    }

    /*---------------------------------------------------------
    متد toggleMobileMenu

    وظیفه: باز/بسته کردن منوی موبایل

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    toggleMobileMenu() {
        if (!this._mobileMenu) return;

        const isOpen = this._mobileMenu.classList.contains('open');
        if (isOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    /*---------------------------------------------------------
    متد openMobileMenu

    وظیفه: باز کردن منوی موبایل

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    openMobileMenu() {
        if (!this._mobileMenu) return;
        this._mobileMenu.classList.add('open');
        document.body.style.overflow = 'hidden';

        // فوکوس روی اولین آیتم منو
        const firstLink = this._mobileMenu.querySelector('a');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    }

    /*---------------------------------------------------------
    متد closeMobileMenu

    وظیفه: بستن منوی موبایل

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    closeMobileMenu() {
        if (!this._mobileMenu) return;
        this._mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
    }

    /*---------------------------------------------------------
    متد updateAuthState

    وظیفه: به‌روزرسانی وضعیت احراز هویت از خارج

    ورودی‌ها: user (object|null)

    خروجی: void

    ---------------------------------------------------------*/
    updateAuthState(user) {
        this._user = user;
        this._updateAuthUI();
    }

    /*---------------------------------------------------------
    متد updateCartCount

    وظیفه: به‌روزرسانی تعداد سبد خرید از خارج

    ورودی‌ها: count (number)

    خروجی: void

    ---------------------------------------------------------*/
    updateCartCount(count) {
        this._cartCount = count || 0;
        this._updateCartUI();
    }

    /*---------------------------------------------------------
    متد setLanguage

    وظیفه: تغییر زبان از خارج

    ورودی‌ها: lang (string)

    خروجی: void

    ---------------------------------------------------------*/
    setLanguage(lang) {
        if (lang && lang !== this._language) {
            this._language = lang;
            this._updateLangUI();
        }
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی کامل نوار ناوبری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    refresh() {
        this._loadState();
        this._updateUI();
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        // حذف event listenerها در صورت نیاز
        this._initialized = false;
        console.log('🧹 Navbar پاکسازی شد.');
    }
}

// ===== صادرات =====
export { Navbar };
export default Navbar;