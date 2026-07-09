/*=========================================================
نام فایل: cart.js (صفحه)

وظیفه: کنترلر صفحه سبد خرید – رندر UI، مدیریت رویدادها،
استفاده از سرویس Cart و تعامل با کاربر

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from "../js/state.js";
import { translator } from "../js/translator.js";
import { Cart } from "../js/cart.js";
import { Auth } from "../js/auth.js";
import { router } from "../js/router.js";
import { utils } from "../js/utils.js";
import { Modal } from "../js/modal.js";

/*---------------------------------------------------------
کلاس CartPage

وظیفه: مدیریت صفحه سبد خرید

---------------------------------------------------------*/
class CartPage {
  constructor(options = {}) {
    this.options = {
      container: "#cart",
      ...options,
    };
    this._element = null;
    this._initialized = false;
    this._language = State.get("language") || "fa";
    this._isLoading = false;
  }

  /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
  async init() {
    if (this._initialized) return;

    this._element = document.querySelector(this.options.container);
    if (!this._element) {
      console.warn("⚠️ المان صفحه سبد خرید یافت نشد.");
      return;
    }

    const currentRoute = router.getCurrentRoute();
    if (currentRoute?.id !== "cart") {
      return;
    }

    // بارگذاری سبد خرید
    await Cart.loadCart();

    // ایجاد ساختار صفحه
    this._buildPageStructure();

    // رندر سبد خرید
    this._renderCart();

    // اتصال رویدادها
    this._bindEvents();

    // اشتراک در تغییرات وضعیت
    this._subscribeToState();

    this._initialized = true;
    console.log("✅ CartPage مقداردهی شد.");
  }

  /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
  _buildPageStructure() {
    if (this._element.querySelector(".cart-page__wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "cart-page__wrapper";

    // هدر
    const header = document.createElement("div");
    header.className = "cart-page__header";
    header.innerHTML = `
            <h2 class="section__title" data-i18n="cartTitle">سبد خرید</h2>
            <p class="section__subtitle" data-i18n="cartSub">محصولات انتخاب شده برای خرید</p>
        `;
    wrapper.appendChild(header);

    // محتوای اصلی
    const content = document.createElement("div");
    content.className = "cart-page__content";

    // لیست محصولات
    const itemsSection = document.createElement("div");
    itemsSection.className = "cart-page__items-section";
    itemsSection.innerHTML = `<div id="cartItemsList" class="cart-page__items-list"></div>`;
    content.appendChild(itemsSection);

    // خلاصه سبد خرید
    const summarySection = document.createElement("div");
    summarySection.className = "cart-page__summary-section";
    summarySection.innerHTML = `
            <div class="cart-page__summary-card">
                <h3 data-i18n="cartSummary">خلاصه سبد خرید</h3>
                <div class="cart-page__summary-row"><span data-i18n="totalItems">تعداد کل:</span><span id="cartSummaryItems">0</span></div>
                <div class="cart-page__summary-row"><span data-i18n="subtotal">جمع کل:</span><span id="cartSummarySubtotal">0 تومان</span></div>
                <div class="cart-page__summary-row cart-page__summary-row--discount"><span data-i18n="discount">تخفیف:</span><span id="cartSummaryDiscount">0 تومان</span></div>
                <div class="cart-page__summary-row cart-page__summary-row--shipping"><span data-i18n="shipping">هزینه ارسال:</span><span id="cartSummaryShipping">0 تومان</span></div>
                <div class="cart-page__summary-row cart-page__summary-row--total"><span data-i18n="total">قابل پرداخت:</span><span id="cartSummaryTotal">0 تومان</span></div>
                <div class="cart-page__coupon">
                    <input type="text" id="cartCouponInput" class="auth__input" placeholder="${translator.translate("enterCoupon") || "کد تخفیف را وارد کنید"}" />
                    <button class="btn btn--primary" id="cartCouponBtn">${translator.translate("applyCoupon") || "اعمال"}</button>
                </div>
                <button class="btn btn--primary btn--block" id="cartCheckoutBtn"><i class="fas fa-shopping-bag"></i> ${translator.translate("checkout") || "ثبت سفارش"}</button>
                <button class="btn btn--outline btn--block" id="cartClearBtn"><i class="fas fa-trash"></i> ${translator.translate("clearCart") || "خالی کردن سبد خرید"}</button>
            </div>
        `;
    content.appendChild(summarySection);

    wrapper.appendChild(content);

    // پیام خالی بودن
    const emptyMsg = document.createElement("div");
    emptyMsg.id = "cartEmptyMessage";
    emptyMsg.className = "cart-page__empty hidden";
    emptyMsg.innerHTML = `
            <i class="fas fa-shopping-cart" style="font-size:3rem;color:#94a3b8;display:block;margin-bottom:1rem;"></i>
            <p data-i18n="cartEmpty">سبد خرید شما خالی است.</p>
            <a href="#products" class="btn btn--primary" style="margin-top:1rem;">${translator.translate("continueShopping") || "مشاهده محصولات"}</a>
        `;
    wrapper.appendChild(emptyMsg);

    this._element.appendChild(wrapper);

    // ترجمه
    if (translator && translator.loaded) {
      setTimeout(() => translator.translateElement(this._element), 50);
    }
  }

  /*---------------------------------------------------------
    متد _renderCart

    وظیفه: رندر کردن آیتم‌ها و خلاصه سبد خرید

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
  _renderCart() {
    const listContainer = document.getElementById("cartItemsList");
    const emptyMessage = document.getElementById("cartEmptyMessage");
    const summaryItems = document.getElementById("cartSummaryItems");
    const summarySubtotal = document.getElementById("cartSummarySubtotal");
    const summaryDiscount = document.getElementById("cartSummaryDiscount");
    const summaryShipping = document.getElementById("cartSummaryShipping");
    const summaryTotal = document.getElementById("cartSummaryTotal");

    if (!listContainer) return;

    const items = Cart.getItems();
    const totalItems = Cart.getTotalItems();
    const totalPrice = Cart.getTotalPrice();
    const discount = Cart.getDiscount();
    const shipping = Cart.getShipping();
    const finalPrice = Cart.getFinalPrice();

    if (items.length === 0) {
      listContainer.innerHTML = "";
      if (emptyMessage) emptyMessage.classList.remove("hidden");
      if (summaryItems) summaryItems.textContent = "0";
      if (summarySubtotal) summarySubtotal.textContent = "0 تومان";
      if (summaryDiscount) summaryDiscount.textContent = "0 تومان";
      if (summaryShipping) summaryShipping.textContent = "0 تومان";
      if (summaryTotal) summaryTotal.textContent = "0 تومان";
      return;
    }

    if (emptyMessage) emptyMessage.classList.add("hidden");

    // رندر آیتم‌ها
    listContainer.innerHTML = items
      .map((item, index) => {
        const price = this._parsePrice(item.price);
        const total = price * (item.quantity || 1);
        const image =
          item.images && item.images.length > 0
            ? item.images[0]
            : "https://via.placeholder.com/80x80?text=No+Image";

        return `
                <div class="cart-page__item" data-index="${index}">
                    <div class="cart-page__item-image"><img src="${image}" alt="${item.title || "محصول"}" /></div>
                    <div class="cart-page__item-info">
                        <h4 class="cart-page__item-title">${item.title || "محصول بدون نام"}</h4>
                        <span class="cart-page__item-price">${utils.formatPrice(price)}</span>
                    </div>
                    <div class="cart-page__item-actions">
                        <div class="cart-page__item-quantity">
                            <button class="cart-page__qty-btn" data-action="decrease" data-index="${index}">-</button>
                            <span class="cart-page__qty-value">${item.quantity || 1}</span>
                            <button class="cart-page__qty-btn" data-action="increase" data-index="${index}">+</button>
                        </div>
                        <span class="cart-page__item-total">${utils.formatPrice(total)}</span>
                        <button class="cart-page__item-remove" data-action="remove" data-index="${index}" aria-label="${translator.translate("remove") || "حذف"}"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
      })
      .join("");

    // به‌روزرسانی خلاصه
    if (summaryItems) summaryItems.textContent = totalItems;
    if (summarySubtotal)
      summarySubtotal.textContent = utils.formatPrice(totalPrice);
    if (summaryDiscount)
      summaryDiscount.textContent = utils.formatPrice(discount);
    if (summaryShipping)
      summaryShipping.textContent = utils.formatPrice(shipping);
    if (summaryTotal) summaryTotal.textContent = utils.formatPrice(finalPrice);
  }

  /*---------------------------------------------------------
    متد _parsePrice

    وظیفه: تبدیل قیمت به عدد

    ورودی‌ها: price (string|number)

    خروجی: number

    ---------------------------------------------------------*/
  _parsePrice(price) {
    if (typeof price === "number") return price;
    if (typeof price === "string") {
      const num = parseInt(price.replace(/[^0-9]/g, ""), 10);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  /*---------------------------------------------------------
    متد _updateItemQuantity

    وظیفه: تغییر تعداد یک آیتم از طریق سرویس

    ورودی‌ها: index (number), change (number)

    خروجی: void

    ---------------------------------------------------------*/
  _updateItemQuantity(index, change) {
    const items = Cart.getItems();
    if (index < 0 || index >= items.length) return;

    const item = items[index];
    const newQuantity = (item.quantity || 1) + change;

    if (newQuantity <= 0) {
      // حذف آیتم
      Cart.removeItem(item.id);
    } else {
      Cart.updateQuantity(item.id, newQuantity);
    }

    this._renderCart();
  }

  /*---------------------------------------------------------
    متد _removeItem

    وظیفه: حذف آیتم با تایید کاربر

    ورودی‌ها: index (number)

    خروجی: void

    ---------------------------------------------------------*/
  _removeItem(index) {
    const items = Cart.getItems();
    if (index < 0 || index >= items.length) return;

    Modal.showConfirm(
      translator.translate("removeFromCartConfirm") ||
        "آیا از حذف این محصول از سبد خرید اطمینان دارید؟",
      () => {
        const item = items[index];
        Cart.removeItem(item.id);
        this._renderCart();
        utils.toast(
          translator.translate("itemRemoved") || "محصول از سبد خرید حذف شد.",
          "success",
        );
      },
      null,
      { className: "remove-item-confirm-modal", maxWidth: "400px" },
    );
  }

  /*---------------------------------------------------------
    متد _clearCart

    وظیفه: خالی کردن سبد خرید با تایید

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
  _clearCart() {
    if (Cart.getItems().length === 0) return;

    Modal.showConfirm(
      translator.translate("clearCartConfirm") ||
        "آیا از خالی کردن سبد خرید اطمینان دارید؟",
      () => {
        Cart.clearCart();
        this._renderCart();
        utils.toast(
          translator.translate("cartCleared") || "سبد خرید خالی شد.",
          "success",
        );
      },
      null,
      { className: "clear-cart-confirm-modal", maxWidth: "400px" },
    );
  }

  /*---------------------------------------------------------
    متد _applyCoupon

    وظیفه: اعمال کد تخفیف

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
  async _applyCoupon() {
    const input = document.getElementById("cartCouponInput");
    const code = input?.value?.trim() || "";
    if (!code) {
      utils.toast(
        translator.translate("enterCoupon") || "لطفاً کد تخفیف را وارد کنید.",
        "warning",
      );
      return;
    }

    this._isLoading = true;
    const btn = document.getElementById("cartCouponBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = translator.translate("applying") || "در حال اعمال...";
    }

    try {
      const result = await Cart.applyCoupon(code);
      this._renderCart();
      utils.toast(
        result.message ||
          translator.translate("couponApplied") ||
          "کد تخفیف با موفقیت اعمال شد.",
        "success",
      );
      if (input) input.value = "";
    } catch (error) {
      utils.toast(
        error.message ||
          translator.translate("invalidCoupon") ||
          "کد تخفیف نامعتبر است.",
        "error",
      );
    } finally {
      this._isLoading = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = translator.translate("applyCoupon") || "اعمال";
      }
    }
  }

  /*---------------------------------------------------------
    متد _handleCheckout

    وظیفه: ثبت سفارش

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
  async _handleCheckout() {
    if (Cart.getItems().length === 0) {
      utils.toast(
        translator.translate("cartEmpty") || "سبد خرید شما خالی است.",
        "warning",
      );
      return;
    }

    if (!Auth.isAuthenticated()) {
      Modal.showConfirm(
        translator.translate("loginRequiredForCheckout") ||
          "برای ثبت سفارش باید وارد حساب کاربری خود شوید. آیا می‌خواهید وارد شوید؟",
        () => router.navigate("login"),
        null,
        { className: "login-required-modal", maxWidth: "450px" },
      );
      return;
    }

    this._isLoading = true;
    const btn = document.getElementById("cartCheckoutBtn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translator.translate("processing") || "در حال پردازش..."}`;
    }

    try {
      const result = await Cart.checkout();
      this._renderCart();
      utils.toast(
        result.message ||
          translator.translate("orderPlaced") ||
          "سفارش شما با موفقیت ثبت شد.",
        "success",
      );
      // هدایت به صفحه سفارشات
      setTimeout(() => router.navigate("orders"), 1000);
    } catch (error) {
      utils.toast(
        error.message ||
          translator.translate("checkoutError") ||
          "خطا در ثبت سفارش.",
        "error",
      );
    } finally {
      this._isLoading = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-shopping-bag"></i> ${translator.translate("checkout") || "ثبت سفارش"}`;
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
    // Event Delegation برای دکمه‌های داخل لیست
    document.addEventListener("click", (e) => {
      const qtyBtn = e.target.closest(".cart-page__qty-btn");
      if (qtyBtn) {
        const action = qtyBtn.dataset.action;
        const index = parseInt(qtyBtn.dataset.index, 10);
        if (!isNaN(index) && action) {
          if (action === "increase") this._updateItemQuantity(index, 1);
          else if (action === "decrease") this._updateItemQuantity(index, -1);
        }
        return;
      }

      const removeBtn = e.target.closest(".cart-page__item-remove");
      if (removeBtn) {
        const index = parseInt(removeBtn.dataset.index, 10);
        if (!isNaN(index)) this._removeItem(index);
        return;
      }
    });

    document
      .getElementById("cartCouponBtn")
      ?.addEventListener("click", () => this._applyCoupon());
    document
      .getElementById("cartCouponInput")
      ?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this._applyCoupon();
        }
      });
    document
      .getElementById("cartCheckoutBtn")
      ?.addEventListener("click", () => this._handleCheckout());
    document
      .getElementById("cartClearBtn")
      ?.addEventListener("click", () => this._clearCart());

    document
      .querySelector("#cartEmptyMessage .btn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        router.navigate("products");
      });
  }

  /*---------------------------------------------------------
    متد _subscribeToState

    وظیفه: اشتراک در تغییرات وضعیت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
  _subscribeToState() {
    State.subscribe("language", (lang) => {
      this._language = lang || "fa";
      this._updateLanguage();
    });
    document.addEventListener("langChanged", (e) => {
      this._language = e.detail.lang || "fa";
      this._updateLanguage();
    });
    document.addEventListener("cartUpdated", () => {
      this._renderCart();
    });
  }

  _updateLanguage() {
    if (this._element && translator && translator.loaded) {
      translator.translateElement(this._element);
      this._renderCart();
    }
  }

  /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
  destroy() {
    this._initialized = false;
    console.log("🧹 CartPage پاکسازی شد.");
  }
}

// ===== صادرات =====
export { CartPage };
export default CartPage;
