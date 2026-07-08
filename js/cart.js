/*=========================================================
نام فایل: cart.js (سرویس)

وظیفه: مدیریت داده‌های سبد خرید شامل افزودن، حذف، تغییر تعداد،
محاسبه قیمت، ذخیره در LocalStorage و ارتباط با API

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { api } from './api.js';
import { State } from './state.js';
import { Storage } from './storage.js';
import { utils } from './utils.js';
import { Auth } from './auth.js';

/*---------------------------------------------------------
کلاس CartService

وظیفه: مدیریت داده‌های سبد خرید

---------------------------------------------------------*/
class CartService {
    constructor() {
        this._items = [];
        this._totalPrice = 0;
        this._totalItems = 0;
        this._discount = 0;
        this._shipping = 0;
        this._couponCode = '';
        this._loaded = false;
    }

    /*---------------------------------------------------------
    متد loadCart

    وظیفه: بارگذاری سبد خرید از State یا LocalStorage یا API

    ورودی‌ها: forceRefresh (boolean)

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async loadCart(forceRefresh = false) {
        if (this._loaded && !forceRefresh) return;

        // ابتدا از State
        const stateCart = State.get('cart');
        if (stateCart && Array.isArray(stateCart) && stateCart.length > 0) {
            this._items = stateCart;
            this._calculateTotals();
            this._loaded = true;
            return;
        }

        // اگر کاربر وارد شده باشد، از API
        if (Auth.isAuthenticated()) {
            try {
                const response = await api.get('/cart');
                if (response?.success && response?.data) {
                    this._items = response.data.items || [];
                    this._discount = response.data.discount || 0;
                    this._shipping = response.data.shipping || 0;
                    this._couponCode = response.data.coupon || '';
                    this._calculateTotals();
                    this._loaded = true;
                    this._saveToStorage();
                    return;
                }
            } catch (error) {
                console.warn('⚠️ خطا در دریافت سبد خرید از API:', error);
            }
        }

        // در غیر این صورت از LocalStorage
        const saved = Storage.get('cart');
        if (saved && Array.isArray(saved)) {
            this._items = saved;
            this._calculateTotals();
            this._loaded = true;
            return;
        }

        // خالی
        this._items = [];
        this._calculateTotals();
        this._loaded = true;
    }

    /*---------------------------------------------------------
    متد getItems

    وظیفه: دریافت لیست آیتم‌های سبد خرید

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getItems() {
        return [...this._items];
    }

    /*---------------------------------------------------------
    متد getTotalItems

    وظیفه: دریافت تعداد کل آیتم‌ها

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getTotalItems() {
        return this._totalItems;
    }

    /*---------------------------------------------------------
    متد getTotalPrice

    وظیفه: دریافت قیمت کل (بدون تخفیف)

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getTotalPrice() {
        return this._totalPrice;
    }

    /*---------------------------------------------------------
    متد getFinalPrice

    وظیفه: دریافت قیمت نهایی (با تخفیف و هزینه ارسال)

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getFinalPrice() {
        return Math.max(0, this._totalPrice - this._discount + this._shipping);
    }

    /*---------------------------------------------------------
    متد getDiscount

    وظیفه: دریافت مبلغ تخفیف

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getDiscount() {
        return this._discount;
    }

    /*---------------------------------------------------------
    متد getShipping

    وظیفه: دریافت هزینه ارسال

    ورودی‌ها: none

    خروجی: number

    ---------------------------------------------------------*/
    getShipping() {
        return this._shipping;
    }

    /*---------------------------------------------------------
    متد getCouponCode

    وظیفه: دریافت کد تخفیف اعمال شده

    ورودی‌ها: none

    خروجی: string

    ---------------------------------------------------------*/
    getCouponCode() {
        return this._couponCode;
    }

    /*---------------------------------------------------------
    متد addItem

    وظیفه: افزودن محصول به سبد خرید

    ورودی‌ها: product (object), quantity (number)

    خروجی: boolean

    ---------------------------------------------------------*/
    addItem(product, quantity = 1) {
        if (!product || !product.id) return false;

        const existing = this._items.find(item => item.id === product.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + quantity;
        } else {
            this._items.push({
                ...product,
                quantity: quantity,
            });
        }

        this._calculateTotals();
        this._saveToStorage();
        this._syncWithAPI();
        return true;
    }

    /*---------------------------------------------------------
    متد removeItem

    وظیفه: حذف یک محصول از سبد خرید

    ورودی‌ها: productId (string|number)

    خروجی: boolean

    ---------------------------------------------------------*/
    removeItem(productId) {
        const index = this._items.findIndex(item => item.id === productId);
        if (index === -1) return false;

        this._items.splice(index, 1);
        this._calculateTotals();
        this._saveToStorage();
        this._syncWithAPI();
        return true;
    }

    /*---------------------------------------------------------
    متد updateQuantity

    وظیفه: تغییر تعداد یک محصول

    ورودی‌ها: productId (string|number), quantity (number)

    خروجی: boolean

    ---------------------------------------------------------*/
    updateQuantity(productId, quantity) {
        const item = this._items.find(item => item.id === productId);
        if (!item) return false;

        if (quantity <= 0) {
            return this.removeItem(productId);
        }

        item.quantity = quantity;
        this._calculateTotals();
        this._saveToStorage();
        this._syncWithAPI();
        return true;
    }

    /*---------------------------------------------------------
    متد clearCart

    وظیفه: خالی کردن سبد خرید

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clearCart() {
        this._items = [];
        this._discount = 0;
        this._shipping = 0;
        this._couponCode = '';
        this._calculateTotals();
        this._saveToStorage();
        this._syncWithAPI();
    }

    /*---------------------------------------------------------
    متد applyCoupon

    وظیفه: اعمال کد تخفیف

    ورودی‌ها: code (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async applyCoupon(code) {
        if (!code || typeof code !== 'string') {
            throw new Error('کد تخفیف نامعتبر است.');
        }

        try {
            const response = await api.post('/cart/apply-coupon', { code });
            if (response?.success) {
                this._discount = response.data?.discount || 0;
                this._couponCode = code;
                this._saveToStorage();
                return {
                    success: true,
                    discount: this._discount,
                    message: response.message || 'کد تخفیف اعمال شد.',
                };
            } else {
                throw new Error(response?.message || 'کد تخفیف نامعتبر است.');
            }
        } catch (error) {
            console.error('❌ خطا در اعمال کد تخفیف:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد checkout

    وظیفه: ثبت سفارش

    ورودی‌ها: orderData (object)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async checkout(orderData = {}) {
        if (this._items.length === 0) {
            throw new Error('سبد خرید خالی است.');
        }

        const data = {
            items: this._items.map(item => ({
                id: item.id,
                title: item.title,
                price: this._parsePrice(item.price),
                quantity: item.quantity || 1,
            })),
            total: this._totalPrice,
            discount: this._discount,
            shipping: this._shipping,
            coupon: this._couponCode || null,
            ...orderData,
        };

        try {
            const response = await api.post('/cart/checkout', data);
            if (response?.success) {
                // پس از ثبت موفق، سبد خرید را خالی می‌کنیم
                this.clearCart();
                return {
                    success: true,
                    orderId: response.data?.orderId,
                    message: response.message || 'سفارش با موفقیت ثبت شد.',
                };
            } else {
                throw new Error(response?.message || 'ثبت سفارش با شکست مواجه شد.');
            }
        } catch (error) {
            console.error('❌ خطا در ثبت سفارش:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد _calculateTotals

    وظیفه: محاسبه مجموع قیمت و تعداد

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _calculateTotals() {
        this._totalItems = this._items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        this._totalPrice = this._items.reduce((sum, item) => {
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
    متد _saveToStorage

    وظیفه: ذخیره در State و LocalStorage

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _saveToStorage() {
        State.set('cart', this._items);
        Storage.set('cart', this._items);
        // انتشار رویداد
        document.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { cart: this._items }
        }));
    }

    /*---------------------------------------------------------
    متد _syncWithAPI

    وظیفه: همگام‌سازی با سرور (در صورت ورود)

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _syncWithAPI() {
        if (!Auth.isAuthenticated()) return;
        try {
            await api.post('/cart/sync', { items: this._items });
        } catch (error) {
            console.warn('⚠️ خطا در همگام‌سازی سبد خرید:', error);
        }
    }

    /*---------------------------------------------------------
    متد clearCache

    وظیفه: پاکسازی کش

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clearCache() {
        Storage.remove('cart');
        this._loaded = false;
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی اجباری سبد خرید

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async refresh() {
        this._loaded = false;
        await this.loadCart(true);
    }
}

// ===== ایجاد نمونه واحد =====
const Cart = new CartService();

// ===== صادرات =====
export { CartService, Cart };
export default Cart;