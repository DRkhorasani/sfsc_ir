/*=========================================================
نام فایل: pagination.js

وظیفه: کامپوننت صفحه‌بندی (Pagination) با قابلیت نمایش
دکمه‌های قبلی/بعدی، شماره صفحات، انتخاب تعداد آیتم در هر صفحه،
و مدیریت رویدادهای تغییر صفحه

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Config } from '../js/config.js';

/*---------------------------------------------------------
کلاس Pagination

وظیفه: ایجاد و مدیریت کامپوننت صفحه‌بندی

---------------------------------------------------------*/
class Pagination {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه با گزینه‌ها

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            totalItems: 0,
            itemsPerPage: Config.PAGINATION.DEFAULT_LIMIT || 12,
            currentPage: Config.PAGINATION.DEFAULT_PAGE || 1,
            visiblePages: Config.PAGINATION.VISIBLE_PAGES || 5,
            showFirstLast: true,
            showPrevNext: true,
            showPageSize: true,
            pageSizes: Config.PAGINATION.SIZES || [6, 12, 24, 48, 96],
            className: '',
            onPageChange: null,
            onPageSizeChange: null,
            ...options,
        };

        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._totalPages = Math.ceil(this.options.totalItems / this.options.itemsPerPage);
        this._currentPage = Math.min(this.options.currentPage, this._totalPages) || 1;
    }

    /*---------------------------------------------------------
    متد render

    وظیفه: ایجاد المان صفحه‌بندی

    ورودی‌ها: none

    خروجی: HTMLElement

    ---------------------------------------------------------*/
    render() {
        if (this._element) {
            return this._element;
        }

        const container = document.createElement('div');
        container.className = `pagination-container ${this.options.className}`;

        // اگر تعداد کل صفحات کمتر از ۲ باشد، صفحه‌بندی نمایش داده نمی‌شود
        if (this._totalPages <= 1 && !this.options.showPageSize) {
            container.style.display = 'none';
            this._element = container;
            return container;
        }

        // بخش انتخاب تعداد آیتم در هر صفحه
        if (this.options.showPageSize) {
            const sizeWrapper = document.createElement('div');
            sizeWrapper.className = 'pagination-size-wrapper';

            const label = document.createElement('label');
            label.textContent = translator.translate('itemsPerPage') || 'تعداد در صفحه:';
            label.setAttribute('data-i18n', 'itemsPerPage');
            sizeWrapper.appendChild(label);

            const select = document.createElement('select');
            select.className = 'pagination-size-select';
            this.options.pageSizes.forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                if (size === this.options.itemsPerPage) {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                const newSize = parseInt(e.target.value, 10);
                this.setItemsPerPage(newSize);
                if (typeof this.options.onPageSizeChange === 'function') {
                    this.options.onPageSizeChange(newSize);
                }
            });

            sizeWrapper.appendChild(select);
            container.appendChild(sizeWrapper);
        }

        // بخش دکمه‌های صفحه‌بندی
        const nav = document.createElement('nav');
        nav.className = 'pagination-nav';
        nav.setAttribute('aria-label', translator.translate('paginationLabel') || 'صفحه‌بندی');

        const list = document.createElement('ul');
        list.className = 'pagination-list';

        // دکمه اولین صفحه
        if (this.options.showFirstLast) {
            const firstItem = this._createPageItem('first', 1);
            list.appendChild(firstItem);
        }

        // دکمه قبلی
        if (this.options.showPrevNext) {
            const prevItem = this._createPageItem('prev', this._currentPage - 1);
            list.appendChild(prevItem);
        }

        // شماره صفحات
        const pageNumbers = this._getPageNumbers();
        pageNumbers.forEach(num => {
            const item = this._createPageItem('number', num);
            list.appendChild(item);
        });

        // دکمه بعدی
        if (this.options.showPrevNext) {
            const nextItem = this._createPageItem('next', this._currentPage + 1);
            list.appendChild(nextItem);
        }

        // دکمه آخرین صفحه
        if (this.options.showFirstLast) {
            const lastItem = this._createPageItem('last', this._totalPages);
            list.appendChild(lastItem);
        }

        nav.appendChild(list);
        container.appendChild(nav);

        // نمایش اطلاعات تعداد آیتم‌ها
        const info = document.createElement('div');
        info.className = 'pagination-info';
        const start = (this._currentPage - 1) * this.options.itemsPerPage + 1;
        const end = Math.min(this._currentPage * this.options.itemsPerPage, this.options.totalItems);
        info.textContent = `${translator.translate('showingItems') || 'نمایش'} ${start}-${end} ${translator.translate('of') || 'از'} ${this.options.totalItems}`;
        container.appendChild(info);

        this._element = container;
        this._initialized = true;

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(container);
            }, 50);
        }

        return container;
    }

    /*---------------------------------------------------------
    متد _createPageItem

    وظیفه: ایجاد یک دکمه صفحه

    ورودی‌ها: type (string), page (number)

    خروجی: HTMLElement (li)

    ---------------------------------------------------------*/
    _createPageItem(type, page) {
        const li = document.createElement('li');
        li.className = 'pagination-item';

        const btn = document.createElement('button');
        btn.className = 'pagination-btn';
        btn.setAttribute('aria-label', this._getAriaLabel(type, page));

        // تنظیم محتوا و وضعیت
        switch (type) {
            case 'first':
                btn.innerHTML = '<i class="fas fa-angle-double-right"></i>';
                btn.disabled = this._currentPage <= 1;
                break;
            case 'prev':
                btn.innerHTML = '<i class="fas fa-angle-right"></i>';
                btn.disabled = this._currentPage <= 1;
                break;
            case 'next':
                btn.innerHTML = '<i class="fas fa-angle-left"></i>';
                btn.disabled = this._currentPage >= this._totalPages;
                break;
            case 'last':
                btn.innerHTML = '<i class="fas fa-angle-double-left"></i>';
                btn.disabled = this._currentPage >= this._totalPages;
                break;
            case 'number':
                btn.textContent = page;
                if (page === this._currentPage) {
                    btn.classList.add('pagination-btn--active');
                    btn.setAttribute('aria-current', 'page');
                }
                break;
            default:
                btn.textContent = page;
        }

        // رویداد کلیک
        if (!btn.disabled) {
            btn.addEventListener('click', () => {
                if (type === 'first') this.goToPage(1);
                else if (type === 'prev') this.goToPage(this._currentPage - 1);
                else if (type === 'next') this.goToPage(this._currentPage + 1);
                else if (type === 'last') this.goToPage(this._totalPages);
                else if (type === 'number') this.goToPage(page);
            });
        }

        li.appendChild(btn);
        return li;
    }

    /*---------------------------------------------------------
    متد _getAriaLabel

    وظیفه: دریافت برچسب دسترسی‌پذیری برای دکمه

    ورودی‌ها: type (string), page (number)

    خروجی: string

    ---------------------------------------------------------*/
    _getAriaLabel(type, page) {
        const labels = {
            first: translator.translate('goToFirstPage') || 'رفتن به صفحه اول',
            prev: translator.translate('goToPrevPage') || 'رفتن به صفحه قبل',
            next: translator.translate('goToNextPage') || 'رفتن به صفحه بعد',
            last: translator.translate('goToLastPage') || 'رفتن به صفحه آخر',
            number: `${translator.translate('goToPage') || 'رفتن به صفحه'} ${page}`,
        };
        return labels[type] || '';
    }

    /*---------------------------------------------------------
    متد _getPageNumbers

    وظیفه: محاسبه شماره صفحات قابل نمایش

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    _getPageNumbers() {
        const total = this._totalPages;
        const current = this._currentPage;
        const visible = this.options.visiblePages;

        if (total <= visible) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        const pages = [];
        const half = Math.floor(visible / 2);
        let start = Math.max(1, current - half);
        let end = Math.min(total, start + visible - 1);

        if (end - start < visible - 1) {
            start = Math.max(1, end - visible + 1);
        }

        // افزودن صفحه اول با ...
        if (start > 1) {
            pages.push(1);
            if (start > 2) {
                pages.push('...');
            }
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // افزودن صفحه آخر با ...
        if (end < total) {
            if (end < total - 1) {
                pages.push('...');
            }
            pages.push(total);
        }

        return pages;
    }

    /*---------------------------------------------------------
    متد goToPage

    وظیفه: رفتن به صفحه مشخص

    ورودی‌ها: page (number)

    خروجی: void

    ---------------------------------------------------------*/
    goToPage(page) {
        page = Math.max(1, Math.min(page, this._totalPages));
        if (page === this._currentPage) return;

        this._currentPage = page;
        this._updateUI();

        if (typeof this.options.onPageChange === 'function') {
            this.options.onPageChange(this._currentPage);
        }

        // انتشار رویداد
        document.dispatchEvent(new CustomEvent('pageChanged', {
            detail: { page: this._currentPage, itemsPerPage: this.options.itemsPerPage }
        }));
    }

    /*---------------------------------------------------------
    متد setItemsPerPage

    وظیفه: تغییر تعداد آیتم در هر صفحه

    ورودی‌ها: size (number)

    خروجی: void

    ---------------------------------------------------------*/
    setItemsPerPage(size) {
        if (size === this.options.itemsPerPage) return;
        this.options.itemsPerPage = size;
        this._totalPages = Math.ceil(this.options.totalItems / size);
        this._currentPage = Math.min(this._currentPage, this._totalPages);
        this._updateUI();

        if (typeof this.options.onPageSizeChange === 'function') {
            this.options.onPageSizeChange(size);
        }

        // انتشار رویداد
        document.dispatchEvent(new CustomEvent('pageSizeChanged', {
            detail: { itemsPerPage: size }
        }));
    }

    /*---------------------------------------------------------
    متد setTotalItems

    وظیفه: تغییر تعداد کل آیتم‌ها

    ورودی‌ها: total (number)

    خروجی: void

    ---------------------------------------------------------*/
    setTotalItems(total) {
        this.options.totalItems = total;
        this._totalPages = Math.ceil(total / this.options.itemsPerPage);
        this._currentPage = Math.min(this._currentPage, this._totalPages);
        this._updateUI();
    }

    /*---------------------------------------------------------
    متد _updateUI

    وظیفه: بازسازی UI صفحه‌بندی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateUI() {
        if (!this._element) return;

        // بازسازی کامل
        const parent = this._element.parentNode;
        const newElement = this.render();
        if (parent) {
            parent.replaceChild(newElement, this._element);
        }
        this._element = newElement;
    }

    /*---------------------------------------------------------
    متد getCurrentPage

    وظیفه: دریافت صفحه فعلی

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getCurrentPage() {
        return this._currentPage;
    }

    /*---------------------------------------------------------
    متد getItemsPerPage

    وظیفه: دریافت تعداد آیتم در هر صفحه

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getItemsPerPage() {
        return this.options.itemsPerPage;
    }

    /*---------------------------------------------------------
    متد getTotalPages

    وظیفه: دریافت تعداد کل صفحات

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getTotalPages() {
        return this._totalPages;
    }

    /*---------------------------------------------------------
    متد getOffset

    وظیفه: دریافت مقدار offset برای کوئری

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getOffset() {
        return (this._currentPage - 1) * this.options.itemsPerPage;
    }

    /*---------------------------------------------------------
    متد getLimit

    وظیفه: دریافت مقدار limit برای کوئری

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getLimit() {
        return this.options.itemsPerPage;
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

    وظیفه: دریافت المان صفحه‌بندی

    ورودی‌ها: none

    خروجی: HTMLElement|null

    ---------------------------------------------------------*/
    getElement() {
        return this._element;
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی صفحه‌بندی

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

// ===== صادرات =====
export { Pagination };
export default Pagination;