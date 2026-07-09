/*=========================================================
نام فایل: productCard.js

وظیفه: کامپوننت نمایش کارت محصولات با قابلیت نمایش تصویر،
عنوان، توضیحات، قیمت، دکمه مشاهده جزییات و افزودن به سبد خرید

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Modal } from '../js/modal.js';
import { Cart } from '../js/cart.js';
import { utils } from '../js/utils.js';

/*---------------------------------------------------------
کلاس ProductCard

وظیفه: ایجاد و مدیریت کارت محصولات

---------------------------------------------------------*/
class ProductCard {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه با داده‌های محصول

    ورودی‌ها: product (object), options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(product, options = {}) {
        this.product = product;
        this.options = {
            showPrice: true,
            showDescription: true,
            showFeatures: false,
            showAddToCart: true,
            showDetails: true,
            showImage: true,
            className: '',
            onAddToCart: null,
            onViewDetails: null,
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
    }

    /*---------------------------------------------------------
    متد render

    وظیفه: ایجاد المان کارت محصول

    ورودی‌ها: none

    خروجی: HTMLElement

    ---------------------------------------------------------*/
    render() {
        if (this._element) {
            return this._element;
        }

        const product = this.product;
        const opts = this.options;

        // ساختار کارت
        const card = document.createElement('div');
        card.className = `product-card card-hover ${opts.className}`;
        card.dataset.productId = product.id;

        // تصویر
        if (opts.showImage && product.images && product.images.length > 0) {
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'product-card__image-wrapper';

            const img = document.createElement('img');
            img.className = 'product-card__image';
            img.src = product.images[0] || 'https://via.placeholder.com/400x300?text=No+Image';
            img.alt = product.title || 'محصول';
            img.loading = 'lazy';
            imgWrapper.appendChild(img);

            // نشان ویژه (در صورت وجود)
            if (product.badge) {
                const badge = document.createElement('span');
                badge.className = 'product-card__badge';
                badge.textContent = product.badge;
                imgWrapper.appendChild(badge);
            }

            card.appendChild(imgWrapper);
        }

        // محتوای کارت
        const body = document.createElement('div');
        body.className = 'product-card__body';

        // عنوان
        const title = document.createElement('h3');
        title.className = 'product-card__title';
        title.textContent = product.title || 'محصول بدون نام';
        body.appendChild(title);

        // توضیحات
        if (opts.showDescription && product.description) {
            const desc = document.createElement('p');
            desc.className = 'product-card__desc';
            desc.textContent = utils.truncate(product.description, 100);
            body.appendChild(desc);
        }

        // ویژگی‌ها (اختیاری)
        if (opts.showFeatures && product.features && product.features.length > 0) {
            const featuresList = document.createElement('ul');
            featuresList.className = 'product-card__features';
            product.features.slice(0, 3).forEach(feature => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-check text-green-600"></i> ${feature}`;
                featuresList.appendChild(li);
            });
            if (product.features.length > 3) {
                const more = document.createElement('li');
                more.className = 'product-card__features-more';
                more.textContent = `+ ${product.features.length - 3} ${translator.translate('moreFeatures') || 'ویژگی بیشتر'}`;
                featuresList.appendChild(more);
            }
            body.appendChild(featuresList);
        }

        // دکمه‌ها و قیمت
        const footer = document.createElement('div');
        footer.className = 'product-card__footer';

        // قیمت
        if (opts.showPrice && product.price) {
            const price = document.createElement('span');
            price.className = 'product-card__price';
            price.textContent = product.price;
            footer.appendChild(price);
        }

        // دکمه‌های اقدام
        const actions = document.createElement('div');
        actions.className = 'product-card__actions';

        // دکمه جزییات
        if (opts.showDetails) {
            const detailsBtn = document.createElement('button');
            detailsBtn.className = 'btn btn--primary btn--sm';
            detailsBtn.innerHTML = `<i class="fas fa-eye"></i> ${translator.translate('details') || 'جزییات'}`;
            detailsBtn.setAttribute('data-i18n', 'details');
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleViewDetails();
            });
            actions.appendChild(detailsBtn);
        }

        // دکمه افزودن به سبد خرید
        if (opts.showAddToCart) {
            const addBtn = document.createElement('button');
            addBtn.className = 'btn btn--primary btn--sm';
            addBtn.innerHTML = `<i class="fas fa-cart-plus"></i> ${translator.translate('addToCart') || 'افزودن به سبد'}`;
            addBtn.setAttribute('data-i18n', 'addToCart');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleAddToCart();
            });
            actions.appendChild(addBtn);
        }

        footer.appendChild(actions);
        body.appendChild(footer);

        card.appendChild(body);

        // رویداد کلیک روی کارت (مشاهده جزییات)
        card.addEventListener('click', (e) => {
            // اگر روی دکمه‌ها کلیک شده باشد، رویداد قبلاً مدیریت شده است
            if (e.target.closest('.btn')) return;
            this._handleViewDetails();
        });

        this._element = card;
        this._initialized = true;

        // ترجمه دکمه‌ها
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(card);
            }, 50);
        }

        return card;
    }

    /*---------------------------------------------------------
    متد _handleViewDetails

    وظیفه: مدیریت نمایش جزییات محصول

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _handleViewDetails() {
        if (typeof this.options.onViewDetails === 'function') {
            this.options.onViewDetails(this.product);
            return;
        }

        // نمایش مودال جزییات
        Modal.showProductDetail(this.product);
    }

    /*---------------------------------------------------------
    متد _handleAddToCart

    وظیفه: مدیریت افزودن محصول به سبد خرید

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _handleAddToCart() {
        if (typeof this.options.onAddToCart === 'function') {
            this.options.onAddToCart(this.product);
            return;
        }

        // افزودن به سبد خرید از طریق Cart module
        try {
            const cart = new Cart();
            const result = cart.addItem(this.product);

            if (result) {
                utils.toast(
                    translator.translate('addedToCart') || 'محصول به سبد خرید اضافه شد.',
                    'success'
                );
            }
        } catch (error) {
            console.error('❌ خطا در افزودن به سبد خرید:', error);
            utils.toast(
                translator.translate('addToCartError') || 'خطا در افزودن به سبد خرید.',
                'error'
            );
        }
    }

    /*---------------------------------------------------------
    متد update

    وظیفه: به‌روزرسانی کارت با داده‌های جدید

    ورودی‌ها: product (object)

    خروجی: void

    ---------------------------------------------------------*/
    update(product) {
        if (!product) return;
        this.product = { ...this.product, ...product };
        // بازسازی کارت
        const newElement = this.render();
        if (this._element && this._element.parentNode) {
            this._element.parentNode.replaceChild(newElement, this._element);
        }
        this._element = newElement;
    }

    /*---------------------------------------------------------
    متد setLanguage

    وظیفه: تغییر زبان و ترجمه مجدد کارت

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
            // حذف رویدادها
            const clone = this._element.cloneNode(true);
            this._element.parentNode?.replaceChild(clone, this._element);
            this._element = clone;
        }
        this._initialized = false;
    }
}

/*---------------------------------------------------------
کلاس ProductCardList

وظیفه: مدیریت لیست کارت‌های محصولات

---------------------------------------------------------*/
class ProductCardList {
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
            showPrice: true,
            showDescription: true,
            showFeatures: false,
            showAddToCart: true,
            showDetails: true,
            showImage: true,
            className: '',
            onAddToCart: null,
            onViewDetails: null,
            ...options,
        };
        this._cards = [];
        this._products = [];
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
            console.warn('⚠️ کانتینر لیست محصولات یافت نشد.');
            return;
        }

        // اشتراک در تغییر زبان
        document.addEventListener('langChanged', (e) => {
            this._language = e.detail.lang || 'fa';
            this._updateLanguage();
        });

        this._initialized = true;
        console.log('✅ ProductCardList مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد setProducts

    وظیفه: تنظیم لیست محصولات و رندر

    ورودی‌ها: products (array)

    خروجی: void

    ---------------------------------------------------------*/
    setProducts(products) {
        if (!Array.isArray(products)) {
            console.warn('⚠️ محصولات باید به صورت آرایه باشند.');
            return;
        }

        this._products = products;
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

        // پاکسازی کانتینر
        this._container.innerHTML = '';
        this._cards = [];

        // اگر محصولی وجود نداشت، پیام نمایش داده می‌شود
        if (this._products.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-center text-muted';
            emptyMsg.textContent = translator.translate('noProducts') || 'محصولی یافت نشد.';
            emptyMsg.setAttribute('data-i18n', 'noProducts');
            this._container.appendChild(emptyMsg);

            if (translator && translator.loaded) {
                translator.translateElement(emptyMsg);
            }
            return;
        }

        // ایجاد کارت‌ها
        this._products.forEach((product, index) => {
            const card = new ProductCard(product, {
                ...this._options,
                onAddToCart: this._options.onAddToCart,
                onViewDetails: this._options.onViewDetails,
            });

            const element = card.render();
            this._container.appendChild(element);
            this._cards.push(card);

            // افزودن تاخیر برای انیمیشن
            if (element) {
                element.style.animationDelay = `${index * 0.05}s`;
                element.classList.add('fade-in-up');
            }
        });

        console.log(`✅ ${this._cards.length} کارت محصول رندر شد.`);
    }

    /*---------------------------------------------------------
    متد addProduct

    وظیفه: افزودن یک محصول به لیست

    ورودی‌ها: product (object)

    خروجی: void

    ---------------------------------------------------------*/
    addProduct(product) {
        if (!product) return;
        this._products.push(product);

        // ایجاد کارت جدید
        const card = new ProductCard(product, {
            ...this._options,
            onAddToCart: this._options.onAddToCart,
            onViewDetails: this._options.onViewDetails,
        });
        const element = card.render();
        this._container.appendChild(element);
        this._cards.push(card);

        // انیمیشن
        element.classList.add('fade-in-up');
    }

    /*---------------------------------------------------------
    متد removeProduct

    وظیفه: حذف یک محصول از لیست

    ورودی‌ها: productId (string|number)

    خروجی: boolean

    ---------------------------------------------------------*/
    removeProduct(productId) {
        const index = this._products.findIndex(p => p.id === productId);
        if (index === -1) return false;

        // حذف از آرایه
        this._products.splice(index, 1);

        // حذف کارت مربوطه
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
        this._products = [];
    }

    /*---------------------------------------------------------
    متد _updateLanguage

    وظیفه: به‌روزرسانی زبان تمام کارت‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateLanguage() {
        this._cards.forEach(card => {
            card.setLanguage(this._language);
        });
    }

    /*---------------------------------------------------------
    متد getProducts

    وظیفه: دریافت لیست محصولات

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getProducts() {
        return [...this._products];
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
        console.log('🧹 ProductCardList پاکسازی شد.');
    }
}

// ===== صادرات =====
export { ProductCard, ProductCardList };
export default ProductCard;