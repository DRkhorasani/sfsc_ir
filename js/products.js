/*=========================================================
نام فایل: products.js

وظیفه: صفحه محصولات با قابلیت نمایش لیست محصولات، جستجو،
فیلتر بر اساس دسته‌بندی، صفحه‌بندی، مشاهده جزییات و افزودن به سبد خرید

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { api } from '../js/api.js';
import { Modal } from '../js/modal.js';
import { utils } from '../js/utils.js';
import { ProductCardList } from '../components/productCard.js';
import { Pagination } from '../components/pagination.js';

/*---------------------------------------------------------
کلاس ProductsPage

وظیفه: مدیریت و رندر صفحه محصولات

---------------------------------------------------------*/
class ProductsPage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه محصولات

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#products',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._productList = null;
        this._pagination = null;
        this._products = [];
        this._filteredProducts = [];
        this._categories = [];
        this._currentPage = 1;
        this._itemsPerPage = 12;
        this._searchQuery = '';
        this._selectedCategory = '';
        this._isLoading = false;
        this._searchDebounceTimer = null;
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه محصولات

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه محصولات یافت نشد.');
            return;
        }

        // بارگذاری داده‌ها
        await this._loadData();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // مقداردهی کامپوننت‌ها
        this._initComponents();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ ProductsPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadData

    وظیفه: بارگذاری داده‌های محصولات از API

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadData() {
        try {
            this._isLoading = true;
            this._showLoading();

            // بارگذاری محصولات
            const productsResponse = await api.get('/products');
            if (productsResponse?.success && productsResponse?.data) {
                this._products = productsResponse.data;
                this._filteredProducts = [...this._products];
            }

            // بارگذاری دسته‌بندی‌ها
            const categoriesResponse = await api.get('/products/categories');
            if (categoriesResponse?.success && categoriesResponse?.data) {
                this._categories = categoriesResponse.data;
            }

        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری محصولات:', error);
            utils.toast(
                translator.translate('loadProductsError') || 'خطا در بارگذاری محصولات.',
                'error'
            );
        } finally {
            this._isLoading = false;
            this._hideLoading();
        }
    }

    /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _buildPageStructure() {
        // اگر ساختار از قبل وجود دارد، نیازی به ایجاد مجدد نیست
        if (this._element.querySelector('.products-page__wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'products-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'products-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="productsTitle">محصولات تخصصی</h2>
            <p class="section__subtitle" data-i18n="productsSub">طراحی شده بر اساس فناوری مشابه Burkard و Zefon با قابلیت بومی‌سازی</p>
        `;
        wrapper.appendChild(header);

        // نوار ابزار (جستجو و فیلتر)
        const toolbar = document.createElement('div');
        toolbar.className = 'products-page__toolbar';
        toolbar.innerHTML = `
            <div class="products-page__search">
                <input type="text" id="productSearchInput" class="auth__input" 
                       placeholder="${translator.translate('searchProducts') || 'جستجوی محصولات...'}" 
                       data-placeholder="searchProducts" />
                <button class="btn btn--primary" id="productSearchBtn">
                    <i class="fas fa-search"></i>
                </button>
            </div>
            <div class="products-page__filters">
                <select id="productCategoryFilter" class="auth__input">
                    <option value="">${translator.translate('allCategories') || 'همه دسته‌بندی‌ها'}</option>
                </select>
                <select id="productSortFilter" class="auth__input">
                    <option value="default">${translator.translate('sortDefault') || 'پیش‌فرض'}</option>
                    <option value="price_asc">${translator.translate('priceLowToHigh') || 'قیمت: کم به زیاد'}</option>
                    <option value="price_desc">${translator.translate('priceHighToLow') || 'قیمت: زیاد به کم'}</option>
                    <option value="name_asc">${translator.translate('nameAToZ') || 'نام: الف تا ی'}</option>
                    <option value="name_desc">${translator.translate('nameZToA') || 'نام: ی تا الف'}</option>
                </select>
            </div>
            <div class="products-page__results">
                <span id="productResultsCount">0 ${translator.translate('items') || 'محصول'}</span>
            </div>
        `;
        wrapper.appendChild(toolbar);

        // کانتینر محصولات
        const productsContainer = document.createElement('div');
        productsContainer.id = 'productsContainer';
        productsContainer.className = 'products__grid';
        wrapper.appendChild(productsContainer);

        // کانتینر صفحه‌بندی
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'productsPagination';
        paginationContainer.className = 'products-page__pagination';
        wrapper.appendChild(paginationContainer);

        // افزودن به صفحه
        this._element.appendChild(wrapper);

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(this._element);
            }, 50);
        }
    }

    /*---------------------------------------------------------
    متد _initComponents

    وظیفه: مقداردهی کامپوننت‌های صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _initComponents() {
        // ---- لیست محصولات ----
        const productsContainer = document.getElementById('productsContainer');
        if (productsContainer) {
            this._productList = new ProductCardList(productsContainer, {
                showPrice: true,
                showDescription: true,
                showFeatures: false,
                showAddToCart: true,
                showDetails: true,
                showImage: true,
                onAddToCart: (product) => {
                    utils.toast(
                        translator.translate('addedToCart') || 'محصول به سبد خرید اضافه شد.',
                        'success'
                    );
                },
                onViewDetails: (product) => {
                    Modal.showProductDetail(product);
                },
            });
            this._productList.init();
        }

        // ---- صفحه‌بندی ----
        const paginationContainer = document.getElementById('productsPagination');
        if (paginationContainer) {
            this._pagination = new Pagination({
                totalItems: this._filteredProducts.length,
                itemsPerPage: this._itemsPerPage,
                currentPage: this._currentPage,
                visiblePages: 5,
                showFirstLast: true,
                showPrevNext: true,
                showPageSize: true,
                pageSizes: [6, 12, 24, 48],
                onPageChange: (page) => {
                    this._currentPage = page;
                    this._renderProducts();
                },
                onPageSizeChange: (size) => {
                    this._itemsPerPage = size;
                    this._currentPage = 1;
                    this._renderProducts();
                },
            });
            paginationContainer.appendChild(this._pagination.render());
        }

        // پر کردن دسته‌بندی‌ها
        this._populateCategories();

        // رندر اولیه محصولات
        this._renderProducts();
    }

    /*---------------------------------------------------------
    متد _populateCategories

    وظیفه: پر کردن لیست دسته‌بندی‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _populateCategories() {
        const select = document.getElementById('productCategoryFilter');
        if (!select) return;

        // حذف گزینه‌های قبلی به جز گزینه اول
        while (select.options.length > 1) {
            select.remove(1);
        }

        this._categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    }

    /*---------------------------------------------------------
    متد _renderProducts

    وظیفه: رندر محصولات بر اساس فیلترها و صفحه‌بندی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderProducts() {
        if (!this._productList) return;

        // اعمال فیلترها
        this._applyFilters();

        // محاسبه offset و limit
        const start = (this._currentPage - 1) * this._itemsPerPage;
        const end = Math.min(start + this._itemsPerPage, this._filteredProducts.length);
        const pageItems = this._filteredProducts.slice(start, end);

        // به‌روزرسانی لیست محصولات
        this._productList.setProducts(pageItems);

        // به‌روزرسانی تعداد نتایج
        const countEl = document.getElementById('productResultsCount');
        if (countEl) {
            const total = this._filteredProducts.length;
            const text = translator.translate('items') || 'محصول';
            countEl.textContent = `${total} ${text}`;
        }

        // به‌روزرسانی صفحه‌بندی
        if (this._pagination) {
            this._pagination.setTotalItems(this._filteredProducts.length);
            this._pagination.goToPage(this._currentPage);
        }

        // اگر نتیجه‌ای وجود نداشت، پیام نمایش داده شود
        if (this._filteredProducts.length === 0) {
            const container = document.getElementById('productsContainer');
            if (container) {
                const emptyMsg = document.createElement('p');
                emptyMsg.className = 'text-center text-muted';
                emptyMsg.textContent = translator.translate('noProductsFound') || 'محصولی یافت نشد.';
                emptyMsg.setAttribute('data-i18n', 'noProductsFound');
                container.appendChild(emptyMsg);
                if (translator && translator.loaded) {
                    translator.translateElement(emptyMsg);
                }
            }
        }
    }

    /*---------------------------------------------------------
    متد _applyFilters

    وظیفه: اعمال فیلترهای جستجو، دسته‌بندی و مرتب‌سازی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _applyFilters() {
        let filtered = [...this._products];

        // فیلتر جستجو
        if (this._searchQuery) {
            const query = this._searchQuery.toLowerCase().trim();
            filtered = filtered.filter(product =>
                product.title?.toLowerCase().includes(query) ||
                product.description?.toLowerCase().includes(query) ||
                product.category?.toLowerCase().includes(query)
            );
        }

        // فیلتر دسته‌بندی
        if (this._selectedCategory) {
            filtered = filtered.filter(product =>
                product.category === this._selectedCategory
            );
        }

        // مرتب‌سازی
        const sort = document.getElementById('productSortFilter')?.value || 'default';
        switch (sort) {
            case 'price_asc':
                filtered.sort((a, b) => {
                    const priceA = parseInt(String(a.price).replace(/[^0-9]/g, '')) || 0;
                    const priceB = parseInt(String(b.price).replace(/[^0-9]/g, '')) || 0;
                    return priceA - priceB;
                });
                break;
            case 'price_desc':
                filtered.sort((a, b) => {
                    const priceA = parseInt(String(a.price).replace(/[^0-9]/g, '')) || 0;
                    const priceB = parseInt(String(b.price).replace(/[^0-9]/g, '')) || 0;
                    return priceB - priceA;
                });
                break;
            case 'name_asc':
                filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'name_desc':
                filtered.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                break;
            default:
                break;
        }

        this._filteredProducts = filtered;
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // جستجو
        const searchInput = document.getElementById('productSearchInput');
        const searchBtn = document.getElementById('productSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this._searchDebounceTimer);
                this._searchDebounceTimer = setTimeout(() => {
                    this._searchQuery = e.target.value;
                    this._currentPage = 1;
                    this._renderProducts();
                }, 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._searchQuery = searchInput.value;
                    this._currentPage = 1;
                    this._renderProducts();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) {
                    this._searchQuery = searchInput.value;
                    this._currentPage = 1;
                    this._renderProducts();
                }
            });
        }

        // فیلتر دسته‌بندی
        const categoryFilter = document.getElementById('productCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this._selectedCategory = e.target.value;
                this._currentPage = 1;
                this._renderProducts();
            });
        }

        // مرتب‌سازی
        const sortFilter = document.getElementById('productSortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', () => {
                this._currentPage = 1;
                this._renderProducts();
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
    }

    /*---------------------------------------------------------
    متد _updateLanguage

    وظیفه: به‌روزرسانی زبان

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateLanguage() {
        if (this._productList) {
            this._productList._updateLanguage();
        }
        if (this._pagination) {
            this._pagination.setLanguage(this._language);
        }
        // به‌روزرسانی placeholder جستجو
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) {
            const placeholder = translator.translate('searchProducts') || 'جستجوی محصولات...';
            searchInput.placeholder = placeholder;
        }
        // به‌روزرسانی گزینه‌های فیلتر
        const categoryFilter = document.getElementById('productCategoryFilter');
        if (categoryFilter && categoryFilter.options[0]) {
            categoryFilter.options[0].textContent = translator.translate('allCategories') || 'همه دسته‌بندی‌ها';
        }
        // به‌روزرسانی تعداد نتایج
        this._renderProducts();
    }

    /*---------------------------------------------------------
    متد _showLoading

    وظیفه: نمایش وضعیت بارگذاری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _showLoading() {
        const container = document.getElementById('productsContainer');
        if (container) {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:3rem 0;">
                    <div class="spinner" style="margin:0 auto 1rem;"></div>
                    <p>${translator.translate('loading') || 'در حال بارگذاری...'}</p>
                </div>
            `;
        }
    }

    /*---------------------------------------------------------
    متد _hideLoading

    وظیفه: مخفی کردن وضعیت بارگذاری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _hideLoading() {
        // توسط _renderProducts مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی کامل صفحه

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async refresh() {
        this._searchQuery = '';
        this._selectedCategory = '';
        this._currentPage = 1;
        await this._loadData();
        this._populateCategories();
        this._renderProducts();
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        if (this._productList) {
            this._productList.destroy();
            this._productList = null;
        }
        if (this._pagination) {
            this._pagination.destroy();
            this._pagination = null;
        }
        clearTimeout(this._searchDebounceTimer);
        this._initialized = false;
        console.log('🧹 ProductsPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { ProductsPage };
export default ProductsPage;