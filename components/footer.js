/*=========================================================
نام فایل: footer.js

وظیفه: مدیریت فوتر سایت شامل اطلاعات برند، لینک‌های اجتماعی،
کپی‌رایت و ترجمه‌های مربوطه

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { router } from '../js/router.js';

/*---------------------------------------------------------
کلاس Footer

وظیفه: کنترل تمام رفتارهای مربوط به فوتر

---------------------------------------------------------*/
class Footer {
    constructor() {
        this._element = null;
        this._initialized = false;
        this._language = 'fa';
        this._year = new Date().getFullYear();
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه فوتر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    init() {
        if (this._initialized) return;

        // دریافت المان فوتر
        this._element = document.querySelector('.footer');

        if (!this._element) {
            console.warn('⚠️ المان .footer یافت نشد.');
            return;
        }

        // بارگذاری وضعیت اولیه
        this._loadState();

        // به‌روزرسانی سال در کپی‌رایت
        this._updateCopyrightYear();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ Footer مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadState

    وظیفه: بارگذاری وضعیت از State

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _loadState() {
        this._language = State.get('language') || 'fa';
    }

    /*---------------------------------------------------------
    متد _subscribeToState

    وظیفه: اشتراک در تغییرات وضعیت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _subscribeToState() {
        // تغییر زبان
        State.subscribe('language', (lang) => {
            this._language = lang || 'fa';
            this._updateUI();
        });

        // رویداد تغییر زبان
        document.addEventListener('langChanged', (e) => {
            this._language = e.detail.lang || 'fa';
            this._updateUI();
        });
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای مربوط به فوتر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // کلیک روی لینک‌های شبکه‌های اجتماعی
        const socialLinks = this._element?.querySelectorAll('.footer__social a');
        if (socialLinks) {
            socialLinks.forEach((link) => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (href && (href === '#' || href.startsWith('#'))) {
                        e.preventDefault();
                        // در صورت نیاز می‌توان پیام نمایش داد
                        console.log('🔗 لینک شبکه اجتماعی:', link.getAttribute('aria-label') || '');
                    }
                });
            });
        }

        // کلیک روی لینک‌های داخلی فوتر (در صورت وجود)
        const internalLinks = this._element?.querySelectorAll('.footer__nav a, .footer__links a');
        if (internalLinks) {
            internalLinks.forEach((link) => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        e.preventDefault();
                        const targetId = href.substring(1);
                        if (targetId) {
                            const target = document.getElementById(targetId);
                            if (target) {
                                target.scrollIntoView({ behavior: 'smooth' });
                            }
                        }
                    }
                });
            });
        }
    }

    /*---------------------------------------------------------
    متد _updateUI

    وظیفه: به‌روزرسانی کامل UI فوتر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateUI() {
        // ترجمه‌ها توسط translator به‌طور خودکار انجام می‌شود
        // اما در صورت نیاز می‌توان برخی المان‌ها را دستی به‌روز کرد
        this._updateCopyrightYear();
    }

    /*---------------------------------------------------------
    متد _updateCopyrightYear

    وظیفه: به‌روزرسانی سال در کپی‌رایت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateCopyrightYear() {
        const copyrightEl = this._element?.querySelector('.footer__copy');
        if (!copyrightEl) return;

        // اگر کپی‌رایت شامل سال باشد، آن را به‌روز می‌کنیم
        const text = copyrightEl.textContent || '';
        // جایگزینی سال با سال جاری (اگر الگوی ۲۰۲۴-۲۰۲۶ یا مشابه باشد)
        const yearPattern = /\d{4}/g;
        const years = text.match(yearPattern);
        if (years && years.length > 0) {
            // آخرین سال را با سال جاری جایگزین می‌کنیم
            const lastYear = years[years.length - 1];
            if (lastYear !== String(this._year)) {
                const newText = text.replace(lastYear, String(this._year));
                // بررسی اینکه آیا متن حاوی data-i18n است یا خیر
                if (copyrightEl.hasAttribute('data-i18n')) {
                    // ترجمه توسط translator مدیریت می‌شود
                    // فقط سال را در متن ترجمه شده به‌روز می‌کنیم
                    const translated = translator.translate('copyright');
                    if (translated) {
                        const updated = translated.replace(/\d{4}/g, (match) => {
                            // آخرین سال را جایگزین می‌کنیم
                            return String(this._year);
                        });
                        copyrightEl.innerHTML = updated;
                    }
                } else {
                    copyrightEl.textContent = newText;
                }
            }
        } else if (!copyrightEl.hasAttribute('data-i18n')) {
            // اگر سالی در متن نبود، سال جاری را اضافه می‌کنیم
            const currentText = copyrightEl.textContent || '';
            if (!currentText.includes(String(this._year))) {
                copyrightEl.textContent = `${currentText} ${this._year}`.trim();
            }
        }
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
            this._updateUI();
        }
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی کامل فوتر

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
        this._initialized = false;
        console.log('🧹 Footer پاکسازی شد.');
    }
}

// ===== صادرات =====
export { Footer };
export default Footer;