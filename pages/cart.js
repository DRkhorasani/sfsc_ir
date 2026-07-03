/*=========================================================
نام فایل: cart.js

وظیفه: صفحه سبد خرید با نمایش لیست محصولات، ویرایش تعداد،
حذف محصول، محاسبه قیمت کل، اعمال کد تخفیف و ثبت سفارش

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { api } from '../js/api.js';
import { Auth } from '../js/auth.js';
import { utils } from '../js/utils.js';
import { router } from '../js/router.js';
import { Modal } from '../js/modal.js';

/*---------------------------------------------------------
کلاس CartPage

وظیفه: مدیریت و رندر صفحه سبد خرید

---------------------------------------------------------*/
class CartPage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه سبد خرید

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#cart',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._cartItems = [];
        this._totalPrice = 0;
        this._totalItems = 0;
        this._discount = 0;
        this._shipping = 0;
        this._isLoading = false;
        this._couponCode = '';
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه سبد خرید

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه سبد خرید یافت نشد.');
            return;
        }

        // بارگذاری داده‌های سبد خرید
        await this._loadCart();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // رندر سبد خرید
        this._renderCart();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ CartPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadCart

    وظیفه: بارگذاری سبد خرید از API یا LocalStorage

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadCart() {
        try {
            this._isLoading = true;

            // ابتدا از State دریافت می‌کنیم
            const stateCart = State.get('cart');
            if (stateCart && Array.isArray(stateCart) && stateCart.length > 0) {
                this._cartItems = stateCart;
                this._calculateTotals();
                return;
            }

            // اگر کاربر وارد شده باشد، از API دریافت می‌شود
            if (Auth.isAuthenticated()) {
                const response = await api.get('/cart');
                if (response?.success && response?.data) {
                    this._cartItems = response.data.items || [];
                    this._calculateTotals();
                    State.set('cart', this._cartItems);
                    return;
                }
            }

            // در غیر این صورت از LocalStorage
            const savedCart = localStorage.getItem('sorena_cart');
            if (savedCart) {
                try {
                    this._cartItems = JSON.parse(savedCart);
                    this._calculateTotals();
                    State.set('cart', this._cartItems);
                } catch {
                    this._cartItems = [];
                }
            } else {
                this._cartItems = [];
            }

        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری سبد خرید:', error);
            this._cartItems = [];
        } finally {
            this._isLoading = false;
        }
    }

    /*---------------------------------------------------------
    متد _calculateTotals

    وظیفه: محاسبه مجموع قیمت و تعداد آیتم‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _calculateTotals() {
        this._totalItems = this._cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        this._totalPrice = this._cartItems.reduce((sum, item) => {
            const price = this._parsePrice(item.price);
            return sum + (price * (item.quantity || 1));
        }, 0);
    }

    /*---------------------------------------------------------
    متد _parsePrice

    وظیفه: تبدیل قیمت به عدد

    ورودی‌ها: price (string|number)

    خروجی: number

    ---------------------------------------------------------*/
    _parsePrice(price) {
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            const num = parseInt(price.replace(/[^0-9]/g, ''), 10);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    }

    /*---------------------------------------------------------
    متد _saveCart

    وظیفه: ذخیره سبد خرید در State و LocalStorage

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _saveCart() {
        State.set('cart', this._cartItems);
        localStorage.setItem('sorena_cart', JSON.stringify(this._cartItems));

        // انتشار رویداد
        document.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { cart: this._cartItems }
        }));
    }

    /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _buildPageStructure() {
        if (this._element.querySelector('.cart-page__wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'cart-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'cart-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="cartTitle">سبد خرید</h2>
            <p class="section__subtitle" data-i18n="cartSub">محصولات انتخاب شده برای خرید</p>
        `;
        wrapper.appendChild(header);

        // محتوای اصلی
        const content = document.createElement('div');
        content.className = 'cart-page__content';

        // لیست محصولات
        const itemsSection = document.createElement('div');
        itemsSection.className = 'cart-page__items-section';
        itemsSection.innerHTML = `
            <div id="cartItemsList" class="cart-page__items-list"></div>
        `;
        content.appendChild(itemsSection);

        // خلاصه سبد خرید
        const summarySection = document.createElement('div');
        summarySection.className = 'cart-page__summary-section';
        summarySection.innerHTML = `
            <div class="cart-page__summary-card">
                <h3 data-i18n="cartSummary">خلاصه سبد خرید</h3>
                <div class="cart-page__summary-row">
                    <span data-i18n="totalItems">تعداد کل:</span>
                    <span id="cartSummaryItems">0</span>
                </div>
                <div class="cart-page__summary-row">
                    <span data-i18n="subtotal">جمع کل:</span>
                    <span id="cartSummarySubtotal">0 تومان</span>
                </div>
                <div class="cart-page__summary-row cart-page__summary-row--discount">
                    <span data-i18n="discount">تخفیف:</span>
                    <span id="cartSummaryDiscount">0 تومان</span>
                </div>
                <div class="cart-page__summary-row cart-page__summary-row--shipping">
                    <span data-i18n="shipping">هزینه ارسال:</span>
                    <span id="cartSummaryShipping">0 تومان</span>
                </div>
                <div class="cart-page__summary-row cart-page__summary-row--total">
                    <span data-i18n="total">قابل پرداخت:</span>
                    <span id="cartSummaryTotal">0 تومان</span>
                </div>
                <div class="cart-page__coupon">
                    <input type="text" id="cartCouponInput" class="auth__input" 
                           placeholder="${translator.translate('enterCoupon') || 'کد تخفیف را وارد کنید'}" />
                    <button class="btn btn--primary" id="cartCouponBtn">
                        ${translator.translate('applyCoupon') || 'اعمال'}
                    </button>
                </div>
                <button class="btn btn--primary btn--block" id="cartCheckoutBtn">
                    <i class="fas fa-shopping-bag"></i> ${translator.translate('checkout') || 'ثبت سفارش'}
                </button>
                <button class="btn btn--outline btn--block" id="cartClearBtn">
                    <i class="fas fa-trash"></i> ${translator.translate('clearCart') || 'خالی کردن سبد خرید'}
                </button>
            </div>
        `;
        content.appendChild(summarySection);

        wrapper.appendChild(content);

        // پیام خالی بودن سبد خرید
        const emptyMsg = document.createElement('div');
        emptyMsg.id = 'cartEmptyMessage';
        emptyMsg.className = 'cart-page__empty hidden';
        emptyMsg.innerHTML = `
            <i class="fas fa-shopping-cart" style="font-size:3rem;color:#94a3b8;display:block;margin-bottom:1rem;"></i>
            <p data-i18n="cartEmpty">سبد خرید شما خالی است.</p>
            <a href="#products" class="btn btn--primary" style="margin-top:1rem;">
                ${translator.translate('continueShopping') || 'مشاهده محصولات'}
            </a>
        `;
        wrapper.appendChild(emptyMsg);

        this._element.appendChild(wrapper);

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(this._element);
            }, 50);
        }
    }

    /*---------------------------------------------------------
    متد _renderCart

    وظیفه: رندر کردن آیتم‌های سبد خرید

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderCart() {
        const listContainer = document.getElementById('cartItemsList');
        const emptyMessage = document.getElementById('cartEmptyMessage');
        const summaryItems = document.getElementById('cartSummaryItems');
        const summarySubtotal = document.getElementById('cartSummarySubtotal');
        const summaryDiscount = document.getElementById('cartSummaryDiscount');
        const summaryShipping = document.getElementById('cartSummaryShipping');
        const summaryTotal = document.getElementById('cartSummaryTotal');

        if (!listContainer) return;

        // محاسبه مجدد
        this._calculateTotals();

        // اگر سبد خرید خالی است
        if (this._cartItems.length === 0) {
            listContainer.innerHTML = '';
            if (emptyMessage) emptyMessage.classList.remove('hidden');
            if (summaryItems) summaryItems.textContent = '0';
            if (summarySubtotal) summarySubtotal.textContent = '0 تومان';
            if (summaryDiscount) summaryDiscount.textContent = '0 تومان';
            if (summaryShipping) summaryShipping.textContent = '0 تومان';
            if (summaryTotal) summaryTotal.textContent = '0 تومان';
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('hidden');

        // رندر آیتم‌ها
        listContainer.innerHTML = this._cartItems.map((item, index) => {
            const price = this._parsePrice(item.price);
            const total = price * (item.quantity || 1);
            const image = item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/80x80?text=No+Image';

            return `
                <div class="cart-page__item" data-index="${index}">
                    <div class="cart-page__item-image">
                        <img src="${image}" alt="${item.title || 'محصول'}" />
                    </div>
                    <div class="cart-page__item-info">
                        <h4 class="cart-page__item-title">${item.title || 'محصول بدون نام'}</h4>
                        <span class="cart-page__item-price">${utils.formatPrice(price)}</span>
                    </div>
                    <div class="cart-page__item-actions">
                        <div class="cart-page__item-quantity">
                            <button class="cart-page__qty-btn" data-action="decrease" data-index="${index}">-</button>
                            <span class="cart-page__qty-value">${item.quantity || 1}</span>
                            <button class="cart-page__qty-btn" data-action="increase" data-index="${index}">+</button>
                        </div>
                        <span class="cart-page__item-total">${utils.formatPrice(total)}</span>
                        <button class="cart-page__item-remove" data-action="remove" data-index="${index}" 
                                aria-label="${translator.translate('remove') || 'حذف'}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // به‌روزرسانی خلاصه
        if (summaryItems) summaryItems.textContent = this._totalItems;
        if (summarySubtotal) summarySubtotal.textContent = utils.formatPrice(this._totalPrice);

        // محاسبه تخفیف (در صورت وجود)
        const discountAmount = this._discount || 0;
        const shippingAmount = this._shipping || 0;
        const finalTotal = this._totalPrice - discountAmount + shippingAmount;

        if (summaryDiscount) summaryDiscount.textContent = utils.formatPrice(discountAmount);
        if (summaryShipping) summaryShipping.textContent = utils.formatPrice(shippingAmount);
        if (summaryTotal) summaryTotal.textContent = utils.formatPrice(Math.max(0, finalTotal));

        // ذخیره
        this._saveCart();
    }

    /*---------------------------------------------------------
    متد _updateItemQuantity

    وظیفه: تغییر تعداد یک آیتم

    ورودی‌ها: index (number), change (number)

    خروجی: void

    ---------------------------------------------------------*/
    _updateItemQuantity(index, change) {
        if (index < 0 || index >= this._cartItems.length) return;

        const item = this._cartItems[index];
        const newQuantity = (item.quantity || 1) + change;

        if (newQuantity <= 0) {
            // حذف آیتم
            this._cartItems.splice(index, 1);
        } else {
            item.quantity = newQuantity;
        }

        this._renderCart();
        this._saveCart();

        // انتشار رویداد
        document.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { cart: this._cartItems }
        }));
    }

    /*---------------------------------------------------------
    متد _removeItem

    وظیفه: حذف یک آیتم از سبد خرید

    ورودی‌ها: index (number)

    خروجی: void

    ---------------------------------------------------------*/
    _removeItem(index) {
        if (index < 0 || index >= this._cartItems.length) return;

        Modal.showConfirm(
            translator.translate('removeFromCartConfirm') || 'آیا از حذف این محصول از سبد خرید اطمینان دارید؟',
            () => {
                this._cartItems.splice(index, 1);
                this._renderCart();
                this._saveCart();

                utils.toast(
                    translator.translate('itemRemoved') || 'محصول از سبد خرید حذف شد.',
                    'success'
                );

                document.dispatchEvent(new CustomEvent('cartUpdated', {
                    detail: { cart: this._cartItems }
                }));
            },
            null,
            {
                className: 'remove-item-confirm-modal',
                maxWidth: '400px',
            }
        );
    }

    /*---------------------------------------------------------
    متد _clearCart

    وظیفه: خالی کردن سبد خرید

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _clearCart() {
        if (this._cartItems.length === 0) return;

        Modal.showConfirm(
            translator.translate('clearCartConfirm') || 'آیا از خالی کردن سبد خرید اطمینان دارید؟',
            () => {
                this._cartItems = [];
                this._discount = 0;
                this._shipping = 0;
                this._renderCart();
                this._saveCart();

                utils.toast(
                    translator.translate('cartCleared') || 'سبد خرید خالی شد.',
                    'success'
                );

                document.dispatchEvent(new CustomEvent('cartUpdated', {
                    detail: { cart: this._cartItems }
                }));
            },
            null,
            {
                className: 'clear-cart-confirm-modal',
                maxWidth: '400px',
            }
        );
    }

    /*---------------------------------------------------------
    متد _applyCoupon

    وظیفه: اعمال کد تخفیف

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _applyCoupon() {
        const input = document.getElementById('cartCouponInput');
        const code = input?.value?.trim() || '';

        if (!code) {
            utils.toast(
                translator.translate('enterCoupon') || 'لطفاً کد تخفیف را وارد کنید.',
                'warning'
            );
            return;
        }

        this._isLoading = true;
        const btn = document.getElementById('cartCouponBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = translator.translate('applying') || 'در حال اعمال...';
        }

        try {
            // درخواست اعمال کد تخفیف
            const response = await api.post('/cart/apply-coupon', { code });

            if (response?.success) {
                this._discount = response.data?.discount || 0;
                this._couponCode = code;
                this._renderCart();

                utils.toast(
                    response.message || translator.translate('couponApplied') || 'کد تخفیف با موفقیت اعمال شد.',
                    'success'
                );

                if (input) input.value = '';
                input.disabled = true;
            } else {
                utils.toast(
                    response.message || translator.translate('invalidCoupon') || 'کد تخفیف نامعتبر است.',
                    'error'
                );
            }
        } catch (error) {
            utils.toast(
                error.message || translator.translate('couponApplyError') || 'خطا در اعمال کد تخفیف.',
                'error'
            );
        } finally {
            this._isLoading = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = translator.translate('applyCoupon') || 'اعمال';
            }
        }
    }

    /*---------------------------------------------------------
    متد _handleCheckout

    وظیفه: مدیریت ثبت سفارش

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handleCheckout() {
        if (this._cartItems.length === 0) {
            utils.toast(
                translator.translate('cartEmpty') || 'سبد خرید شما خالی است.',
                'warning'
            );
            return;
        }

        // بررسی احراز هویت
        if (!Auth.isAuthenticated()) {
            Modal.showConfirm(
                translator.translate('loginRequiredForCheckout') || 'برای ثبت سفارش باید وارد حساب کاربری خود شوید. آیا می‌خواهید وارد شوید؟',
                () => {
                    router.navigate('login');
                },
                null,
                {
                    className: 'login-required-modal',
                    maxWidth: '450px',
                }
            );
            return;
        }

        this._isLoading = true;
        const btn = document.getElementById('cartCheckoutBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translator.translate('processing') || 'در حال پردازش...'}`;
        }

        try {
            // ارسال درخواست ثبت سفارش
            const orderData = {
                items: this._cartItems.map(item => ({
                    id: item.id,
                    title: item.title,
                    price: this._parsePrice(item.price),
                    quantity: item.quantity || 1,
                })),
                total: this._totalPrice - this._discount + this._shipping,
                discount: this._discount,
                shipping: this._shipping,
                coupon: this._couponCode || null,
            };

            const response = await api.post('/cart/checkout', orderData);

            if (response?.success) {
                // پاک کردن سبد خرید
                this._cartItems = [];
                this._discount = 0;
                this._shipping = 0;
                this._couponCode = '';
                this._renderCart();
                this._saveCart();

                // نمایش پیام موفقیت
                utils.toast(
                    response.message || translator.translate('orderPlaced') || 'سفارش شما با موفقیت ثبت شد.',
                    'success'
                );

                // هدایت به صفحه سفارشات
                setTimeout(() => {
                    router.navigate('orders');
                }, 1000);

                document.dispatchEvent(new CustomEvent('cartUpdated', {
                    detail: { cart: this._cartItems }
                }));
            } else {
                utils.toast(
                    response.message || translator.translate('checkoutFailed') || 'ثبت سفارش با شکست مواجه شد.',
                    'error'
                );
            }
        } catch (error) {
            utils.toast(
                error.message || translator.translate('checkoutError') || 'خطا در ثبت سفارش.',
                'error'
            );
        } finally {
            this._isLoading = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fas fa-shopping-bag"></i> ${translator.translate('checkout') || 'ثبت سفارش'}`;
            }
        }
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // Event Delegation برای دکمه‌های سبد خرید
        document.addEventListener('click', (e) => {
            // تغییر تعداد
            const qtyBtn = e.target.closest('.cart-page__qty-btn');
            if (qtyBtn) {
                const action = qtyBtn.dataset.action;
                const index = parseInt(qtyBtn.dataset.index, 10);
                if (!isNaN(index) && action) {
                    if (action === 'increase') {
                        this._updateItemQuantity(index, 1);
                    } else if (action === 'decrease') {
                        this._updateItemQuantity(index, -1);
                    }
                }
                return;
            }

            // حذف آیتم
            const removeBtn = e.target.closest('.cart-page__item-remove');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index, 10);
                if (!isNaN(index)) {
                    this._removeItem(index);
                }
                return;
            }
        });

        // دکمه اعمال کد تخفیف
        const couponBtn = document.getElementById('cartCouponBtn');
        if (couponBtn) {
            couponBtn.addEventListener('click', () => {
                this._applyCoupon();
            });
        }

        // Enter key در فیلد کد تخفیف
        const couponInput = document.getElementById('cartCouponInput');
        if (couponInput) {
            couponInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._applyCoupon();
                }
            });
        }

        // دکمه ثبت سفارش
        const checkoutBtn = document.getElementById('cartCheckoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                this._handleCheckout();
            });
        }

        // دکمه خالی کردن سبد خرید
        const clearBtn = document.getElementById('cartClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this._clearCart();
            });
        }

        // لینک ادامه خرید
        const continueBtn = document.querySelector('#cartEmptyMessage .btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', (e) => {
                e.preventDefault();
                router.navigate('products');
            });
        }
    }

    /*---------------------------------------------------------
    متد _subscribeToState

    وظیفه: اشتراک در تغییرات وضعیت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _subscribeToState() {
        State.subscribe('language', (lang) => {
            this._language = lang || 'fa';
            this._updateLanguage();
        });

        document.addEventListener('langChanged', (e) => {
            this._language = e.detail.lang || 'fa';
            this._updateLanguage();
        });

        // رویداد به‌روزرسانی سبد خرید از خارج
        document.addEventListener('cartUpdated', (e) => {
            if (e.detail.cart) {
                this._cartItems = e.detail.cart;
                this._calculateTotals();
                this._renderCart();
            }
        });

        // رویداد تغییر احراز هویت
        document.addEventListener('authChanged', (e) => {
            if (e.detail.isAuthenticated) {
                // بارگذاری مجدد سبد خرید از سرور
                this._loadCart().then(() => {
                    this._renderCart();
                });
            }
        });
    }

    /*---------------------------------------------------------
    متد _updateLanguage

    وظیفه: به‌روزرسانی زبان

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateLanguage() {
        if (this._element && translator && translator.loaded) {
            translator.translateElement(this._element);
            // بازرندر سبد خرید (برای اعداد و قیمت‌ها)
            this._renderCart();
        }
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی سبد خرید

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async refresh() {
        await this._loadCart();
        this._renderCart();
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        this._initialized = false;
        console.log('🧹 CartPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { CartPage };
export default CartPage;