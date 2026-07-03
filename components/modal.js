/*=========================================================
نام فایل: modal.js

وظیفه: مدیریت پنجره‌های بازشو (Modal) در سراسر برنامه
با قابلیت نمایش محتوای پویا، انیمیشن، مدیریت رویدادها،
پشتیبانی از گالری، فرم‌ها و محتوای HTML

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { utils } from './utils.js';
import { translator } from './translator.js';

/*---------------------------------------------------------
کلاس ModalManager

وظیفه: مدیریت تمام مودال‌های برنامه

---------------------------------------------------------*/
class ModalManager {
    constructor() {
        this._container = null;
        this._activeModals = [];
        this._zIndex = 2000;
        this._defaultOptions = {
            closeOnOverlay: true,
            closeOnEscape: true,
            animation: 'scaleIn',
            duration: 300,
            width: 'auto',
            maxWidth: '800px',
            padding: '2rem',
            className: '',
            onOpen: null,
            onClose: null,
            onDestroy: null,
        };
        this._initialized = false;
        this._keydownHandler = null;
        this._overlayClickHandler = null;
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه سیستم مودال

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    init() {
        if (this._initialized) return;

        // ایجاد کانتینر مودال
        this._container = document.getElementById('modalContainer');
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.id = 'modalContainer';
            document.body.appendChild(this._container);
        }

        // اتصال رویدادهای جهانی
        this._bindGlobalEvents();

        // ذخیره مرجع برای استفاده در کلاس
        window.__MODAL__ = this;

        this._initialized = true;
        console.log('✅ ModalManager مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _bindGlobalEvents

    وظیفه: اتصال رویدادهای جهانی برای مدیریت مودال‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindGlobalEvents() {
        // رویداد کلیک روی overlay
        this._overlayClickHandler = (e) => {
            const overlay = e.target.closest('.modal-overlay');
            if (overlay) {
                const modalId = overlay.dataset.modalId;
                if (modalId) {
                    const modal = this._activeModals.find(m => m.id === modalId);
                    if (modal && modal.options.closeOnOverlay) {
                        this.close(modalId);
                    }
                }
            }
        };
        document.addEventListener('click', this._overlayClickHandler);

        // رویداد کلید Escape
        this._keydownHandler = (e) => {
            if (e.key === 'Escape' && this._activeModals.length > 0) {
                const lastModal = this._activeModals[this._activeModals.length - 1];
                if (lastModal && lastModal.options.closeOnEscape) {
                    this.close(lastModal.id);
                }
            }
        };
        document.addEventListener('keydown', this._keydownHandler);

        // رویداد تغییر مسیر برای بستن مودال‌ها
        document.addEventListener('routeChanged', () => {
            this.closeAll();
        });
    }

    /*---------------------------------------------------------
    متد _generateId

    وظیفه: تولید شناسه یکتا برای مودال

    ورودی‌ها: none

    خروجی: string

    ---------------------------------------------------------*/
    _generateId() {
        return `modal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    /*---------------------------------------------------------
    متد _createOverlay

    وظیفه: ایجاد المان overlay برای مودال

    ورودی‌ها: id (string), options (object)

    خروجی: HTMLElement

    ---------------------------------------------------------*/
    _createOverlay(id, options) {
        const overlay = document.createElement('div');
        overlay.className = `modal-overlay ${options.className || ''}`;
        overlay.dataset.modalId = id;
        overlay.style.zIndex = this._zIndex + this._activeModals.length;
        overlay.style.animation = 'fadeIn 0.25s ease';

        return overlay;
    }

    /*---------------------------------------------------------
    متد _createContent

    وظیفه: ایجاد المان محتوای مودال

    ورودی‌ها: content (string|HTMLElement), options (object)

    خروجی: HTMLElement

    ---------------------------------------------------------*/
    _createContent(content, options) {
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-content';
        wrapper.style.maxWidth = options.maxWidth || this._defaultOptions.maxWidth;
        wrapper.style.width = options.width || this._defaultOptions.width;
        wrapper.style.padding = options.padding || this._defaultOptions.padding;
        wrapper.style.animation = `${options.animation || this._defaultOptions.animation} 0.3s ease`;

        // دکمه بستن
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.setAttribute('aria-label', 'بستن');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modal = this._activeModals.find(m => m.id === wrapper.dataset.modalId);
            if (modal) {
                this.close(modal.id);
            }
        });
        wrapper.appendChild(closeBtn);

        // محتوا
        if (typeof content === 'string') {
            wrapper.innerHTML += content;
        } else if (content instanceof HTMLElement) {
            wrapper.appendChild(content);
        }

        return wrapper;
    }

    /*---------------------------------------------------------
    متد open

    وظیفه: باز کردن یک مودال جدید

    ورودی‌ها: content (string|HTMLElement), options (object)

    خروجی: string (شناسه مودال)

    ---------------------------------------------------------*/
    open(content, options = {}) {
        // مقداردهی در صورت نیاز
        if (!this._initialized) {
            this.init();
        }

        // ترکیب گزینه‌ها
        const opts = { ...this._defaultOptions, ...options };

        // تولید شناسه
        const id = this._generateId();

        // ایجاد overlay و محتوا
        const overlay = this._createOverlay(id, opts);
        const contentEl = this._createContent(content, opts);
        contentEl.dataset.modalId = id;

        // افزودن به overlay
        overlay.appendChild(contentEl);

        // افزودن به DOM
        this._container.appendChild(overlay);

        // ذخیره اطلاعات مودال
        const modalData = {
            id,
            overlay,
            content: contentEl,
            options: opts,
            element: contentEl,
            timestamp: Date.now(),
        };
        this._activeModals.push(modalData);

        // جلوگیری از اسکرول پس‌زمینه
        if (this._activeModals.length === 1) {
            document.body.style.overflow = 'hidden';
        }

        // اجرای callback باز شدن
        if (typeof opts.onOpen === 'function') {
            try {
                opts.onOpen(modalData);
            } catch (error) {
                console.error('❌ خطا در onOpen:', error);
            }
        }

        // انتشار رویداد
        document.dispatchEvent(new CustomEvent('modalOpened', {
            detail: { id, modal: modalData }
        }));

        // ترجمه محتوای مودال (اگر ترجمه فعال باشد)
        setTimeout(() => {
            if (translator && translator.loaded) {
                translator.translateElement(contentEl);
            }
        }, 50);

        console.log(`✅ مودال "${id}" باز شد.`);

        return id;
    }

    /*---------------------------------------------------------
    متد close

    وظیفه: بستن یک مودال با شناسه

    ورودی‌ها: id (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    close(id) {
        const index = this._activeModals.findIndex(m => m.id === id);
        if (index === -1) {
            console.warn(`⚠️ مودال "${id}" یافت نشد.`);
            return false;
        }

        const modal = this._activeModals[index];

        // اجرای callback بسته شدن
        if (typeof modal.options.onClose === 'function') {
            try {
                modal.options.onClose(modal);
            } catch (error) {
                console.error('❌ خطا در onClose:', error);
            }
        }

        // انیمیشن خروج
        const content = modal.content;
        if (content) {
            content.style.animation = `${modal.options.animation || 'scaleIn'} 0.2s ease reverse`;
        }

        // حذف از DOM با تاخیر
        setTimeout(() => {
            if (modal.overlay && modal.overlay.parentNode) {
                modal.overlay.parentNode.removeChild(modal.overlay);
            }

            // حذف از آرایه
            this._activeModals.splice(index, 1);

            // انتشار رویداد
            document.dispatchEvent(new CustomEvent('modalClosed', {
                detail: { id, modal }
            }));

            // اجرای callback تخریب
            if (typeof modal.options.onDestroy === 'function') {
                try {
                    modal.options.onDestroy(modal);
                } catch (error) {
                    console.error('❌ خطا در onDestroy:', error);
                }
            }

            // بازگرداندن اسکرول
            if (this._activeModals.length === 0) {
                document.body.style.overflow = '';
            }

            console.log(`✅ مودال "${id}" بسته شد.`);
        }, 200);

        return true;
    }

    /*---------------------------------------------------------
    متد closeAll

    وظیفه: بستن تمام مودال‌های باز

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    closeAll() {
        const ids = this._activeModals.map(m => m.id);
        ids.forEach(id => this.close(id));
    }

    /*---------------------------------------------------------
    متد closeLast

    وظیفه: بستن آخرین مودال باز

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    closeLast() {
        if (this._activeModals.length === 0) return false;
        const last = this._activeModals[this._activeModals.length - 1];
        return this.close(last.id);
    }

    /*---------------------------------------------------------
    متد getActive

    وظیفه: دریافت لیست مودال‌های فعال

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getActive() {
        return [...this._activeModals];
    }

    /*---------------------------------------------------------
    متد getLast

    وظیفه: دریافت آخرین مودال فعال

    ورودی‌ها: none

    خروجی: object|null

    ---------------------------------------------------------*/
    getLast() {
        if (this._activeModals.length === 0) return null;
        return this._activeModals[this._activeModals.length - 1];
    }

    /*---------------------------------------------------------
    متد find

    وظیفه: جستجوی مودال با شناسه

    ورودی‌ها: id (string)

    خروجی: object|null

    ---------------------------------------------------------*/
    find(id) {
        return this._activeModals.find(m => m.id === id) || null;
    }

    /*---------------------------------------------------------
    متد isOpen

    وظیفه: بررسی باز بودن مودال

    ورودی‌ها: id (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    isOpen(id) {
        return this._activeModals.some(m => m.id === id);
    }

    /*---------------------------------------------------------
    متد updateContent

    وظیفه: به‌روزرسانی محتوای مودال

    ورودی‌ها: id (string), content (string|HTMLElement)

    خروجی: boolean

    ---------------------------------------------------------*/
    updateContent(id, content) {
        const modal = this.find(id);
        if (!modal) {
            console.warn(`⚠️ مودال "${id}" یافت نشد.`);
            return false;
        }

        const contentEl = modal.content;
        if (!contentEl) return false;

        // پیدا کردن دکمه بستن
        const closeBtn = contentEl.querySelector('.modal-close');

        // پاک کردن محتوای قبلی (به جز دکمه بستن)
        while (contentEl.firstChild) {
            contentEl.removeChild(contentEl.firstChild);
        }

        // افزودن مجدد دکمه بستن
        if (closeBtn) {
            contentEl.appendChild(closeBtn);
        } else {
            const newCloseBtn = document.createElement('button');
            newCloseBtn.className = 'modal-close';
            newCloseBtn.setAttribute('aria-label', 'بستن');
            newCloseBtn.innerHTML = '<i class="fas fa-times"></i>';
            newCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close(id);
            });
            contentEl.appendChild(newCloseBtn);
        }

        // افزودن محتوای جدید
        if (typeof content === 'string') {
            contentEl.innerHTML += content;
        } else if (content instanceof HTMLElement) {
            contentEl.appendChild(content);
        }

        // ترجمه محتوای جدید
        if (translator && translator.loaded) {
            translator.translateElement(contentEl);
        }

        console.log(`✅ محتوای مودال "${id}" به‌روزرسانی شد.`);
        return true;
    }

    /*---------------------------------------------------------
    متد setOptions

    وظیفه: به‌روزرسانی گزینه‌های مودال

    ورودی‌ها: id (string), options (object)

    خروجی: boolean

    ---------------------------------------------------------*/
    setOptions(id, options) {
        const modal = this.find(id);
        if (!modal) {
            console.warn(`⚠️ مودال "${id}" یافت نشد.`);
            return false;
        }

        modal.options = { ...modal.options, ...options };
        return true;
    }

    /*---------------------------------------------------------
    متد showLoading

    وظیفه: نمایش وضعیت بارگذاری در مودال

    ورودی‌ها: id (string), message (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    showLoading(id, message = 'در حال بارگذاری...') {
        const modal = this.find(id);
        if (!modal) return false;

        const loadingHtml = `
            <div class="modal-loading" style="text-align:center;padding:2rem 0;">
                <div class="spinner" style="margin:0 auto 1rem;"></div>
                <p>${message}</p>
            </div>
        `;

        return this.updateContent(id, loadingHtml);
    }

    /*---------------------------------------------------------
    متد showError

    وظیفه: نمایش پیام خطا در مودال

    ورودی‌ها: id (string), message (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    showError(id, message) {
        const modal = this.find(id);
        if (!modal) return false;

        const errorHtml = `
            <div class="modal-error" style="text-align:center;padding:1rem 0;color:#ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
                <p style="font-size:1.1rem;">${message || 'خطایی رخ داده است.'}</p>
            </div>
        `;

        return this.updateContent(id, errorHtml);
    }

    /*---------------------------------------------------------
    متد showSuccess

    وظیفه: نمایش پیام موفقیت در مودال

    ورودی‌ها: id (string), message (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    showSuccess(id, message) {
        const modal = this.find(id);
        if (!modal) return false;

        const successHtml = `
            <div class="modal-success" style="text-align:center;padding:1rem 0;color:#22c55e;">
                <i class="fas fa-check-circle" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
                <p style="font-size:1.1rem;">${message || 'عملیات با موفقیت انجام شد.'}</p>
            </div>
        `;

        return this.updateContent(id, successHtml);
    }

    /*---------------------------------------------------------
    متد showConfirm

    وظیفه: نمایش مودال تایید با دکمه‌های بله/خیر

    ورودی‌ها: message (string), onConfirm (function), onCancel (function), options (object)

    خروجی: string (شناسه مودال)

    ---------------------------------------------------------*/
    showConfirm(message, onConfirm = null, onCancel = null, options = {}) {
        const id = this._generateId();

        const content = `
            <div style="text-align:center;padding:1rem 0;">
                <p style="font-size:1.1rem;margin-bottom:1.5rem;">${message}</p>
                <div style="display:flex;gap:1rem;justify-content:center;">
                    <button class="btn btn--primary" data-modal-confirm="yes">
                        ${translator.translate('confirmYes') || 'بله'}
                    </button>
                    <button class="btn btn--outline" data-modal-confirm="no">
                        ${translator.translate('confirmNo') || 'خیر'}
                    </button>
                </div>
            </div>
        `;

        const modalId = this.open(content, {
            ...options,
            closeOnOverlay: false,
            closeOnEscape: true,
            onOpen: (modal) => {
                const yesBtn = modal.element.querySelector('[data-modal-confirm="yes"]');
                const noBtn = modal.element.querySelector('[data-modal-confirm="no"]');

                if (yesBtn) {
                    yesBtn.addEventListener('click', () => {
                        this.close(modal.id);
                        if (typeof onConfirm === 'function') {
                            try {
                                onConfirm(modal);
                            } catch (error) {
                                console.error('❌ خطا در onConfirm:', error);
                            }
                        }
                    });
                }

                if (noBtn) {
                    noBtn.addEventListener('click', () => {
                        this.close(modal.id);
                        if (typeof onCancel === 'function') {
                            try {
                                onCancel(modal);
                            } catch (error) {
                                console.error('❌ خطا در onCancel:', error);
                            }
                        }
                    });
                }
            },
        });

        return modalId;
    }

    /*---------------------------------------------------------
    متد showAlert

    وظیفه: نمایش مودال هشدار با دکمه تایید

    ورودی‌ها: message (string), onConfirm (function), options (object)

    خروجی: string (شناسه مودال)

    ---------------------------------------------------------*/
    showAlert(message, onConfirm = null, options = {}) {
        const content = `
            <div style="text-align:center;padding:1rem 0;">
                <p style="font-size:1.1rem;margin-bottom:1.5rem;">${message}</p>
                <button class="btn btn--primary" data-modal-alert="ok">
                    ${translator.translate('confirmOk') || 'تایید'}
                </button>
            </div>
        `;

        const modalId = this.open(content, {
            ...options,
            closeOnOverlay: false,
            closeOnEscape: true,
            onOpen: (modal) => {
                const okBtn = modal.element.querySelector('[data-modal-alert="ok"]');
                if (okBtn) {
                    okBtn.addEventListener('click', () => {
                        this.close(modal.id);
                        if (typeof onConfirm === 'function') {
                            try {
                                onConfirm(modal);
                            } catch (error) {
                                console.error('❌ خطا در onConfirm:', error);
                            }
                        }
                    });
                }
            },
        });

        return modalId;
    }

    /*---------------------------------------------------------
    متد showProductDetail

    وظیفه: نمایش جزییات محصول در مودال

    ورودی‌ها: product (object)

    خروجی: string (شناسه مودال)

    ---------------------------------------------------------*/
    showProductDetail(product) {
        if (!product) {
            console.warn('⚠️ محصول برای نمایش وجود ندارد.');
            return null;
        }

        const title = product.title || 'محصول';
        const description = product.description || '';
        const price = product.price || '۰ تومان';
        const images = product.images || [];
        const features = product.features || [];

        const imagesHtml = images.length > 0 ? `
            <div class="gallery-grid">
                ${images.map(img => `
                    <img src="${img}" alt="${title}" onclick="window.open('${img}')" style="cursor:pointer;" />
                `).join('')}
            </div>
        ` : '';

        const featuresHtml = features.length > 0 ? `
            <ul class="features-list">
                ${features.map(f => `<li>${f}</li>`).join('')}
            </ul>
        ` : '';

        const content = `
            <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">${title}</h2>
            ${product.detailTitle ? `<p style="color:#64748b;margin-bottom:1rem;">${product.detailTitle}</p>` : ''}
            ${imagesHtml}
            <p style="margin:1rem 0;color:#334155;">${description}</p>
            ${featuresHtml}
            <div class="product-actions">
                <span style="font-weight:700;font-size:1.5rem;color:#2563eb;">${price}</span>
                <button class="btn btn--primary" data-action="download-catalog">
                    <i class="fas fa-download"></i> ${translator.translate('downloadCatalog') || 'دانلود کاتالوگ'}
                </button>
                <button class="btn btn--primary" data-action="order-product" data-product-id="${product.id || ''}">
                    <i class="fas fa-shopping-cart"></i> ${translator.translate('orderProduct') || 'سفارش محصول'}
                </button>
            </div>
        `;

        const modalId = this.open(content, {
            maxWidth: '800px',
            className: 'product-modal',
            onOpen: (modal) => {
                const orderBtn = modal.element.querySelector('[data-action="order-product"]');
                if (orderBtn) {
                    orderBtn.addEventListener('click', () => {
                        this.close(modal.id);
                        // نمایش فرم سفارش
                        this.showOrderForm(product);
                    });
                }

                const downloadBtn = modal.element.querySelector('[data-action="download-catalog"]');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', () => {
                        utils.toast(
                            translator.translate('catalogDownloaded') || 'کاتالوگ محصول دانلود شد.',
                            'success'
                        );
                    });
                }
            },
        });

        return modalId;
    }

    /*---------------------------------------------------------
    متد showOrderForm

    وظیفه: نمایش فرم سفارش محصول در مودال

    ورودی‌ها: product (object)

    خروجی: string (شناسه مودال)

    ---------------------------------------------------------*/
    showOrderForm(product) {
        const title = product?.title || 'محصول';

        const content = `
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">
                ${translator.translate('orderFormTitle') || 'فرم سفارش محصول:'} ${title}
            </h3>
            <form id="orderFormInner">
                <div style="margin-bottom:0.75rem;">
                    <input type="text" id="orderName" placeholder="${translator.translate('fullName') || 'نام کامل'}" 
                           class="auth__input" required data-placeholder="fullName" />
                </div>
                <div style="margin-bottom:0.75rem;">
                    <input type="tel" id="orderPhone" placeholder="${translator.translate('phoneNumber') || 'شماره تماس'}" 
                           class="auth__input" required data-placeholder="phoneNumber" />
                </div>
                <div style="margin-bottom:0.75rem;">
                    <input type="email" id="orderEmail" placeholder="Email" 
                           class="auth__input" required />
                </div>
                <div style="margin-bottom:0.75rem;">
                    <textarea id="orderMsg" rows="3" placeholder="${translator.translate('orderDetails') || 'توضیحات سفارش'}" 
                              class="auth__input" data-placeholder="orderDetails"></textarea>
                </div>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                    <button type="submit" class="btn btn--primary" style="flex:1;">
                        ${translator.translate('submitOrder') || 'ثبت سفارش'}
                    </button>
                    <button type="button" class="btn btn--outline" data-modal-close>
                        ${translator.translate('cancel') || 'انصراف'}
                    </button>
                </div>
            </form>
        `;

        const modalId = this.open(content, {
            maxWidth: '500px',
            className: 'order-modal',
            onOpen: (modal) => {
                const form = modal.element.querySelector('#orderFormInner');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const name = document.getElementById('orderName')?.value?.trim();
                        const phone = document.getElementById('orderPhone')?.value?.trim();
                        const email = document.getElementById('orderEmail')?.value?.trim();
                        const msg = document.getElementById('orderMsg')?.value?.trim();

                        if (!name || !phone || !email) {
                            utils.toast(
                                translator.translate('fillRequiredFields') || 'لطفاً تمام فیلدهای ضروری را پر کنید.',
                                'error'
                            );
                            return;
                        }

                        // بستن مودال
                        this.close(modal.id);

                        // نمایش پیام موفقیت
                        utils.toast(
                            translator.translate('orderSubmitted') || 'سفارش با موفقیت ثبت شد.',
                            'success'
                        );
                    });
                }

                const closeBtn = modal.element.querySelector('[data-modal-close]');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        this.close(modal.id);
                    });
                }

                // ترجمه placeholderها
                if (translator && translator.loaded) {
                    setTimeout(() => {
                        translator.translateElement(modal.element);
                    }, 50);
                }
            },
        });

        return modalId;
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        // بستن تمام مودال‌ها
        this.closeAll();

        // حذف رویدادها
        if (this._overlayClickHandler) {
            document.removeEventListener('click', this._overlayClickHandler);
            this._overlayClickHandler = null;
        }
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }

        // پاکسازی کانتینر
        if (this._container) {
            this._container.innerHTML = '';
        }

        // بازگرداندن اسکرول
        document.body.style.overflow = '';

        this._initialized = false;
        console.log('🧹 ModalManager پاکسازی شد.');
    }
}

// ===== ایجاد نمونه واحد =====
const Modal = new ModalManager();

// ===== صادرات =====
export { ModalManager, Modal };
export default Modal;