/*=========================================================
نام فایل: faqItem.js

وظیفه: کامپوننت نمایش آیتم‌های سوالات متداول (FAQ) با قابلیت
باز و بسته شدن (Accordion)، نمایش سوال و پاسخ، ترجمه و مدیریت رویدادها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';

/*---------------------------------------------------------
کلاس FAQItem

وظیفه: ایجاد و مدیریت یک آیتم سوال متداول

---------------------------------------------------------*/
class FAQItem {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه با داده‌های سوال

    ورودی‌ها: faq (object), options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(faq, options = {}) {
        this.faq = faq;
        this.options = {
            openByDefault: false,
            className: '',
            onToggle: null,
            ...options,
        };
        this._element = null;
        this._isOpen = this.options.openByDefault || false;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
    }

    /*---------------------------------------------------------
    متد render

    وظیفه: ایجاد المان آیتم سوال

    ورودی‌ها: none

    خروجی: HTMLElement

    ---------------------------------------------------------*/
    render() {
        if (this._element) {
            return this._element;
        }

        const faq = this.faq;
        const opts = this.options;

        // ساختار آیتم
        const item = document.createElement('div');
        item.className = `faq-item ${opts.className} ${this._isOpen ? 'open' : ''}`;
        item.dataset.faqId = faq.id;

        // سوال
        const question = document.createElement('div');
        question.className = 'faq-item__question';
        question.textContent = faq.question || 'سوال بدون متن';
        question.setAttribute('role', 'button');
        question.setAttribute('aria-expanded', this._isOpen ? 'true' : 'false');
        question.setAttribute('tabindex', '0');

        // پاسخ
        const answer = document.createElement('div');
        answer.className = 'faq-item__answer';
        answer.textContent = faq.answer || 'پاسخی برای این سوال وجود ندارد.';

        item.appendChild(question);
        item.appendChild(answer);

        // رویداد کلیک
        question.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // رویداد کلید Enter/Space
        question.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });

        // رویداد کلیک روی کل آیتم (اختیاری)
        item.addEventListener('click', (e) => {
            if (e.target === item) {
                this.toggle();
            }
        });

        this._element = item;
        this._initialized = true;

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(item);
            }, 50);
        }

        return item;
    }

    /*---------------------------------------------------------
    متد toggle

    وظیفه: باز یا بسته کردن آیتم

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    toggle() {
        this._isOpen = !this._isOpen;
        this._updateState();

        // اجرای callback
        if (typeof this.options.onToggle === 'function') {
            this.options.onToggle(this.faq, this._isOpen);
        }
    }

    /*---------------------------------------------------------
    متد open

    وظیفه: باز کردن آیتم

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    open() {
        if (!this._isOpen) {
            this._isOpen = true;
            this._updateState();
        }
    }

    /*---------------------------------------------------------
    متد close

    وظیفه: بستن آیتم

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    close() {
        if (this._isOpen) {
            this._isOpen = false;
            this._updateState();
        }
    }

    /*---------------------------------------------------------
    متد _updateState

    وظیفه: به‌روزرسانی وضعیت ظاهری آیتم

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateState() {
        if (!this._element) return;

        const question = this._element.querySelector('.faq-item__question');
        if (question) {
            question.setAttribute('aria-expanded', this._isOpen ? 'true' : 'false');
        }

        this._element.classList.toggle('open', this._isOpen);
    }

    /*---------------------------------------------------------
    متد isOpen

    وظیفه: بررسی وضعیت باز بودن آیتم

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    isOpen() {
        return this._isOpen;
    }

    /*---------------------------------------------------------
    متد setLanguage

    وظیفه: تغییر زبان

    ورودی‌ها: lang (string)

    خروجی: void

    ---------------------------------------------------------*/
    setLanguage(lang) {
        this._language = lang;
        if (this._element && translator && translator.loaded) {
            translator.translateElement(this._element);
        }
    }

    /*---------------------------------------------------------
    متد getElement

    وظیفه: دریافت المان آیتم

    ورودی‌ها: none

    خروجی: HTMLElement|null

    ---------------------------------------------------------*/
    getElement() {
        return this._element;
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی آیتم

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        if (this._element) {
            const clone = this._element.cloneNode(true);
            this._element.parentNode?.replaceChild(clone, this._element);
            this._element = clone;
        }
        this._initialized = false;
    }
}

/*---------------------------------------------------------
کلاس FAQItemList

وظیفه: مدیریت لیست آیتم‌های سوالات متداول

---------------------------------------------------------*/
class FAQItemList {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه لیست

    ورودی‌ها: container (string|HTMLElement), options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(container, options = {}) {
        this._container = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        this._options = {
            openByDefault: false,
            allowMultipleOpen: false,
            className: '',
            onToggle: null,
            ...options,
        };
        this._items = [];
        this._faqData = [];
        this._initialized = false;
        this._language = State.get('language') || 'fa';
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه لیست

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    init() {
        if (this._initialized) return;
        if (!this._container) {
            console.warn('⚠️ کانتینر لیست سوالات متداول یافت نشد.');
            return;
        }

        document.addEventListener('langChanged', (e) => {
            this._language = e.detail.lang || 'fa';
            this._updateLanguage();
        });

        this._initialized = true;
        console.log('✅ FAQItemList مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد setFAQ

    وظیفه: تنظیم لیست سوالات و رندر

    ورودی‌ها: faqData (array)

    خروجی: void

    ---------------------------------------------------------*/
    setFAQ(faqData) {
        if (!Array.isArray(faqData)) {
            console.warn('⚠️ داده‌های سوالات باید به صورت آرایه باشند.');
            return;
        }
        this._faqData = faqData;
        this.render();
    }

    /*---------------------------------------------------------
    متد render

    وظیفه: رندر کردن لیست آیتم‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    render() {
        if (!this._container) return;

        this._container.innerHTML = '';
        this._items = [];

        if (this._faqData.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-center text-muted';
            emptyMsg.textContent = translator.translate('noFAQ') || 'سوالی یافت نشد.';
            emptyMsg.setAttribute('data-i18n', 'noFAQ');
            this._container.appendChild(emptyMsg);
            if (translator && translator.loaded) {
                translator.translateElement(emptyMsg);
            }
            return;
        }

        this._faqData.forEach((faq, index) => {
            const openByDefault = this._options.openByDefault && index === 0;

            const item = new FAQItem(faq, {
                openByDefault: openByDefault,
                className: this._options.className,
                onToggle: (faqData, isOpen) => {
                    // اگر چندین آیتم همزمان باز نشوند
                    if (!this._options.allowMultipleOpen && isOpen) {
                        this._items.forEach(otherItem => {
                            if (otherItem !== item && otherItem.isOpen()) {
                                otherItem.close();
                            }
                        });
                    }

                    if (typeof this._options.onToggle === 'function') {
                        this._options.onToggle(faqData, isOpen);
                    }
                },
            });

            const element = item.render();
            this._container.appendChild(element);
            this._items.push(item);

            if (element) {
                element.style.animationDelay = `${index * 0.05}s`;
                element.classList.add('fade-in-up');
            }
        });

        console.log(`✅ ${this._items.length} آیتم سوال رندر شد.`);
    }

    /*---------------------------------------------------------
    متد addItem

    وظیفه: افزودن یک سوال جدید به لیست

    ورودی‌ها: faq (object)

    خروجی: void

    ---------------------------------------------------------*/
    addItem(faq) {
        if (!faq) return;
        this._faqData.push(faq);

        const item = new FAQItem(faq, {
            openByDefault: false,
            className: this._options.className,
            onToggle: this._options.onToggle,
        });

        const element = item.render();
        this._container.appendChild(element);
        this._items.push(item);
        element.classList.add('fade-in-up');
    }

    /*---------------------------------------------------------
    متد removeItem

    وظیفه: حذف یک سوال از لیست

    ورودی‌ها: faqId (string|number)

    خروجی: boolean

    ---------------------------------------------------------*/
    removeItem(faqId) {
        const index = this._faqData.findIndex(f => f.id === faqId);
        if (index === -1) return false;

        this._faqData.splice(index, 1);
        const item = this._items[index];
        if (item) {
            item.destroy();
            const element = item.getElement();
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this._items.splice(index, 1);
        }
        return true;
    }

    /*---------------------------------------------------------
    متد clear

    وظیفه: پاکسازی لیست

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clear() {
        this._container.innerHTML = '';
        this._items = [];
        this._faqData = [];
    }

    /*---------------------------------------------------------
    متد openAll

    وظیفه: باز کردن تمام آیتم‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    openAll() {
        this._items.forEach(item => item.open());
    }

    /*---------------------------------------------------------
    متد closeAll

    وظیفه: بستن تمام آیتم‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    closeAll() {
        this._items.forEach(item => item.close());
    }

    /*---------------------------------------------------------
    متد _updateLanguage

    وظیفه: به‌روزرسانی زبان تمام آیتم‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateLanguage() {
        this._items.forEach(item => item.setLanguage(this._language));
    }

    /*---------------------------------------------------------
    متد getItems

    وظیفه: دریافت لیست آیتم‌ها

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getItems() {
        return [...this._items];
    }

    /*---------------------------------------------------------
    متد getFAQ

    وظیفه: دریافت لیست داده‌های سوالات

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getFAQ() {
        return [...this._faqData];
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        this.clear();
        this._initialized = false;
        console.log('🧹 FAQItemList پاکسازی شد.');
    }
}

// ===== صادرات =====
export { FAQItem, FAQItemList };
export default FAQItem;