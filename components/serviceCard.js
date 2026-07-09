/*=========================================================
نام فایل: serviceCard.js

وظیفه: کامپوننت نمایش کارت خدمات با قابلیت نمایش عنوان،
توضیحات، آیکون، دکمه درخواست خدمت و وضعیت‌های مختلف

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Modal } from '../js/modal.js';
import { utils } from '../js/utils.js';

/*---------------------------------------------------------
کلاس ServiceCard

وظیفه: ایجاد و مدیریت کارت خدمات

---------------------------------------------------------*/
class ServiceCard {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه با داده‌های خدمت

    ورودی‌ها: service (object), options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(service, options = {}) {
        this.service = service;
        this.options = {
            showIcon: true,
            showDescription: true,
            showRequestButton: true,
            className: '',
            onRequest: null,
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
    }

    /*---------------------------------------------------------
    متد render

    وظیفه: ایجاد المان کارت خدمت

    ورودی‌ها: none

    خروجی: HTMLElement

    ---------------------------------------------------------*/
    render() {
        if (this._element) {
            return this._element;
        }

        const service = this.service;
        const opts = this.options;

        // ساختار کارت
        const card = document.createElement('div');
        card.className = `service-card card-hover ${opts.className}`;
        card.dataset.serviceId = service.id;

        // آیکون
        if (opts.showIcon && service.icon) {
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'service-card__icon-wrapper';

            const icon = document.createElement('i');
            icon.className = service.icon;
            iconWrapper.appendChild(icon);

            card.appendChild(iconWrapper);
        }

        // محتوای کارت
        const body = document.createElement('div');
        body.className = 'service-card__body';

        // عنوان
        const title = document.createElement('h3');
        title.className = 'service-card__title';
        title.textContent = service.title || 'خدمت بدون نام';
        body.appendChild(title);

        // توضیحات
        if (opts.showDescription && service.description) {
            const desc = document.createElement('p');
            desc.className = 'service-card__desc';
            desc.textContent = utils.truncate(service.description, 80);
            body.appendChild(desc);
        }

        // برچسب نوع خدمت (در صورت وجود)
        if (service.type) {
            const typeBadge = document.createElement('span');
            typeBadge.className = 'service-card__type';
            const typeLabels = {
                'sampling': 'نمونه‌گیری',
                'analysis': 'تحلیل',
                'consulting': 'مشاوره',
                'training': 'آموزش',
            };
            typeBadge.textContent = typeLabels[service.type] || service.type;
            body.appendChild(typeBadge);
        }

        card.appendChild(body);

        // دکمه درخواست خدمت
        if (opts.showRequestButton) {
            const footer = document.createElement('div');
            footer.className = 'service-card__footer';

            const requestBtn = document.createElement('button');
            requestBtn.className = 'btn btn--primary btn--block';
            requestBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${translator.translate('requestService') || 'درخواست خدمت'}`;
            requestBtn.setAttribute('data-i18n', 'requestService');
            requestBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleRequest();
            });

            footer.appendChild(requestBtn);
            card.appendChild(footer);
        }

        // رویداد کلیک روی کارت
        card.addEventListener('click', () => {
            // در صورت نیاز می‌توان جزییات بیشتر نمایش داد
        });

        this._element = card;
        this._initialized = true;

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(card);
            }, 50);
        }

        return card;
    }

    /*---------------------------------------------------------
    متد _handleRequest

    وظیفه: مدیریت درخواست خدمت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _handleRequest() {
        if (typeof this.options.onRequest === 'function') {
            this.options.onRequest(this.service);
            return;
        }

        // نمایش فرم درخواست خدمت در مودال
        this._showServiceForm();
    }

    /*---------------------------------------------------------
    متد _showServiceForm

    وظیفه: نمایش فرم درخواست خدمت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _showServiceForm() {
        const service = this.service;

        const content = `
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">
                ${translator.translate('requestServiceTitle') || 'درخواست خدمت:'} ${service.title || ''}
            </h3>
            <form id="serviceRequestForm">
                <div style="margin-bottom:0.75rem;">
                    <input type="text" id="servName" placeholder="${translator.translate('fullName') || 'نام کامل'}" 
                           class="auth__input" required data-placeholder="fullName" />
                </div>
                <div style="margin-bottom:0.75rem;">
                    <input type="tel" id="servPhone" placeholder="${translator.translate('phoneNumber') || 'شماره تماس'}" 
                           class="auth__input" required data-placeholder="phoneNumber" />
                </div>
                <div style="margin-bottom:0.75rem;">
                    <input type="email" id="servEmail" placeholder="Email" 
                           class="auth__input" required />
                </div>
                <div style="margin-bottom:0.75rem;">
                    <textarea id="servDesc" rows="4" placeholder="${translator.translate('requestDescription') || 'توضیحات درخواست'}" 
                              class="auth__input" data-placeholder="requestDescription" required></textarea>
                </div>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                    <button type="submit" class="btn btn--primary" style="flex:1;">
                        ${translator.translate('submitRequest') || 'ارسال درخواست'}
                    </button>
                    <button type="button" class="btn btn--outline" data-modal-close>
                        ${translator.translate('cancel') || 'انصراف'}
                    </button>
                </div>
            </form>
        `;

        Modal.open(content, {
            maxWidth: '500px',
            className: 'service-request-modal',
            onOpen: (modal) => {
                const form = modal.element.querySelector('#serviceRequestForm');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const name = document.getElementById('servName')?.value?.trim();
                        const phone = document.getElementById('servPhone')?.value?.trim();
                        const email = document.getElementById('servEmail')?.value?.trim();
                        const desc = document.getElementById('servDesc')?.value?.trim();

                        if (!name || !phone || !email || !desc) {
                            utils.toast(
                                translator.translate('fillRequiredFields') || 'لطفاً تمام فیلدهای ضروری را پر کنید.',
                                'error'
                            );
                            return;
                        }

                        Modal.close(modal.id);
                        utils.toast(
                            translator.translate('serviceRequestSubmitted') || 'درخواست خدمت با موفقیت ثبت شد.',
                            'success'
                        );

                        // اجرای callback در صورت وجود
                        if (typeof this.options.onRequest === 'function') {
                            this.options.onRequest(this.service, { name, phone, email, desc });
                        }
                    });
                }

                const closeBtn = modal.element.querySelector('[data-modal-close]');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        Modal.close(modal.id);
                    });
                }

                // ترجمه
                if (translator && translator.loaded) {
                    setTimeout(() => {
                        translator.translateElement(modal.element);
                    }, 50);
                }
            },
        });
    }

    /*---------------------------------------------------------
    متد update

    وظیفه: به‌روزرسانی کارت با داده‌های جدید

    ورودی‌ها: service (object)

    خروجی: void

    ---------------------------------------------------------*/
    update(service) {
        if (!service) return;
        this.service = { ...this.service, ...service };
        const newElement = this.render();
        if (this._element && this._element.parentNode) {
            this._element.parentNode.replaceChild(newElement, this._element);
        }
        this._element = newElement;
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

    وظیفه: دریافت المان کارت

    ورودی‌ها: none

    خروجی: HTMLElement|null

    ---------------------------------------------------------*/
    getElement() {
        return this._element;
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی کارت

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
کلاس ServiceCardList

وظیفه: مدیریت لیست کارت‌های خدمات

---------------------------------------------------------*/
class ServiceCardList {
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
            showIcon: true,
            showDescription: true,
            showRequestButton: true,
            className: '',
            onRequest: null,
            ...options,
        };
        this._cards = [];
        this._services = [];
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
            console.warn('⚠️ کانتینر لیست خدمات یافت نشد.');
            return;
        }

        document.addEventListener('langChanged', (e) => {
            this._language = e.detail.lang || 'fa';
            this._updateLanguage();
        });

        this._initialized = true;
        console.log('✅ ServiceCardList مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد setServices

    وظیفه: تنظیم لیست خدمات و رندر

    ورودی‌ها: services (array)

    خروجی: void

    ---------------------------------------------------------*/
    setServices(services) {
        if (!Array.isArray(services)) {
            console.warn('⚠️ خدمات باید به صورت آرایه باشند.');
            return;
        }
        this._services = services;
        this.render();
    }

    /*---------------------------------------------------------
    متد render

    وظیفه: رندر کردن لیست کارت‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    render() {
        if (!this._container) return;

        this._container.innerHTML = '';
        this._cards = [];

        if (this._services.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-center text-muted';
            emptyMsg.textContent = translator.translate('noServices') || 'خدمتی یافت نشد.';
            emptyMsg.setAttribute('data-i18n', 'noServices');
            this._container.appendChild(emptyMsg);
            if (translator && translator.loaded) {
                translator.translateElement(emptyMsg);
            }
            return;
        }

        this._services.forEach((service, index) => {
            const card = new ServiceCard(service, {
                ...this._options,
                onRequest: this._options.onRequest,
            });

            const element = card.render();
            this._container.appendChild(element);
            this._cards.push(card);

            if (element) {
                element.style.animationDelay = `${index * 0.05}s`;
                element.classList.add('fade-in-up');
            }
        });

        console.log(`✅ ${this._cards.length} کارت خدمت رندر شد.`);
    }

    /*---------------------------------------------------------
    متد addService

    وظیفه: افزودن یک خدمت به لیست

    ورودی‌ها: service (object)

    خروجی: void

    ---------------------------------------------------------*/
    addService(service) {
        if (!service) return;
        this._services.push(service);

        const card = new ServiceCard(service, {
            ...this._options,
            onRequest: this._options.onRequest,
        });
        const element = card.render();
        this._container.appendChild(element);
        this._cards.push(card);
        element.classList.add('fade-in-up');
    }

    /*---------------------------------------------------------
    متد removeService

    وظیفه: حذف یک خدمت از لیست

    ورودی‌ها: serviceId (string|number)

    خروجی: boolean

    ---------------------------------------------------------*/
    removeService(serviceId) {
        const index = this._services.findIndex(s => s.id === serviceId);
        if (index === -1) return false;

        this._services.splice(index, 1);
        const card = this._cards[index];
        if (card) {
            card.destroy();
            const element = card.getElement();
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this._cards.splice(index, 1);
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
        this._cards = [];
        this._services = [];
    }

    /*---------------------------------------------------------
    متد _updateLanguage

    وظیفه: به‌روزرسانی زبان تمام کارت‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateLanguage() {
        this._cards.forEach(card => card.setLanguage(this._language));
    }

    /*---------------------------------------------------------
    متد getServices

    وظیفه: دریافت لیست خدمات

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getServices() {
        return [...this._services];
    }

    /*---------------------------------------------------------
    متد getCards

    وظیفه: دریافت لیست کارت‌ها

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getCards() {
        return [...this._cards];
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
        console.log('🧹 ServiceCardList پاکسازی شد.');
    }
}

// ===== صادرات =====
export { ServiceCard, ServiceCardList };
export default ServiceCard;