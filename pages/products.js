/*=========================================================
نام فایل: products.js (صفحه)

وظیفه: کنترلر صفحه محصولات – رندر UI، جستجو، فیلتر دسته‌بندی،
مرتب‌سازی، صفحه‌بندی، نمایش جزییات و مدیریت رویدادها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Products } from '../js/products.js';
import { utils } from '../js/utils.js';
import { Modal } from '../js/modal.js';
import { ProductCardList } from '../components/productCard.js';
import { Pagination } from '../components/pagination.js';

/*---------------------------------------------------------
کلاس ProductsPage

وظیفه: مدیریت صفحه محصولات

---------------------------------------------------------*/
class ProductsPage {
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
        this._sortType = 'default';
        this._isLoading = false;
        this._searchDebounceTimer = null;
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
            console.warn('⚠️ المان صفحه محصولات یافت نشد.');
            return;
        }

        // بارگذاری داده‌ها
        await this._loadData();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // مقداردهی کامپوننت‌ها
        this._initComponents();

        // رندر محصولات
        this._renderProducts();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ ProductsPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadData

    وظیفه: بارگذاری داده‌ها از سرویس

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _loadData() {
        try {
            this._isLoading = true;
            this._showLoading();
            this._products = await Products.getProducts();
            this._categories = await Products.getCategories();
            this._filteredProducts = [...this._products];
        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری محصولات:', error);
            this._products = await Products.getProducts(); // داده‌های نمونه
            this._categories = await Products.getCategories();
            this._filteredProducts = [...this._products];
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
        if (this._element.querySelector('.products-page__wrapper')) return;

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

        // نوار ابزار (جستجو، فیلتر، مرتب‌سازی)
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

        // پیام خالی بودن
        const emptyMsg = document.createElement('div');
        emptyMsg.id = 'productsEmptyMessage';
        emptyMsg.className = 'products-page__empty hidden';
        emptyMsg.innerHTML = `
            <i class="fas fa-box-open" style="font-size:3rem;color:#94a3b8;display:block;margin-bottom:1rem;"></i>
            <p data-i18n="noProductsFound">محصولی یافت نشد.</p>
        `;
        wrapper.appendChild(emptyMsg);

        this._element.appendChild(wrapper);

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => translator.translateElement(this._element), 50);
        }
    }

    /*---------------------------------------------------------
    متد _initComponents

    وظیفه: مقداردهی کامپوننت‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _initComponents() {
        // لیست محصولات
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

        // صفحه‌بندی
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

    وظیفه: رندر محصولات با اعمال فیلترها و صفحه‌بندی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderProducts() {
        if (!this._productList) return;

        const emptyMessage = document.getElementById('productsEmptyMessage');
        const countEl = document.getElementById('productResultsCount');

        // اعمال فیلترها
        this._applyFilters();

        const totalItems = this._filteredProducts.length;
        const currentPage = Math.min(this._currentPage, Math.ceil(totalItems / this._itemsPerPage) || 1);
        const start = (currentPage - 1) * this._itemsPerPage;
        const end = Math.min(start + this._itemsPerPage, totalItems);
        const pageItems = this._filteredProducts.slice(start, end);

        // به‌روزرسانی تعداد
        if (countEl) {
            const text = translator.translate('items') || 'محصول';
            countEl.textContent = `${totalItems} ${text}`;
        }

        // اگر نتیجه‌ای وجود نداشت
        if (totalItems === 0) {
            this._productList.setProducts([]);
            if (emptyMessage) emptyMessage.classList.remove('hidden');
            if (this._pagination) {
                this._pagination.setTotalItems(0);
                this._pagination.render();
            }
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('hidden');

        // به‌روزرسانی لیست
        this._productList.setProducts(pageItems);

        // به‌روزرسانی صفحه‌بندی
        if (this._pagination) {
            this._pagination.setTotalItems(totalItems);
            this._pagination.goToPage(currentPage);
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
        if (this._searchQuery && this._searchQuery.trim() !== '') {
            const query = this._searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item =>
                item.title?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.category?.toLowerCase().includes(query)
            );
        }

        // فیلتر دسته‌بندی
        if (this._selectedCategory && this._selectedCategory.trim() !== '') {
            filtered = filtered.filter(item => item.category === this._selectedCategory);
        }

        // مرتب‌سازی
        if (this._sortType && this._sortType !== 'default') {
            switch (this._sortType) {
                case 'price_asc':
                    filtered.sort((a, b) => this._parsePrice(a.price) - this._parsePrice(b.price));
                    break;
                case 'price_desc':
                    filtered.sort((a, b) => this._parsePrice(b.price) - this._parsePrice(a.price));
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
        }

        this._filteredProducts = filtered;
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

    _hideLoading() {
        // توسط _renderProducts مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد _handleSearch

    وظیفه: مدیریت جستجوی محصولات

    ورودی‌ها: query (string)

    خروجی: void

    ---------------------------------------------------------*/
    _handleSearch(query) {
        this._searchQuery = query || '';
        this._currentPage = 1;
        this._renderProducts();
    }

    /*---------------------------------------------------------
    متد _handleCategoryFilter

    وظیفه: مدیریت فیلتر دسته‌بندی

    ورودی‌ها: category (string)

    خروجی: void

    ---------------------------------------------------------*/
    _handleCategoryFilter(category) {
        this._selectedCategory = category || '';
        this._currentPage = 1;
        this._renderProducts();
    }

    /*---------------------------------------------------------
    متد _handleSort

    وظیفه: مدیریت مرتب‌سازی

    ورودی‌ها: sortType (string)

    خروجی: void

    ---------------------------------------------------------*/
    _handleSort(sortType) {
        this._sortType = sortType || 'default';
        this._currentPage = 1;
        this._renderProducts();
    }

    /*---------------------------------------------------------
    متد _refreshProducts

    وظیفه: بازخوانی محصولات از سرور

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _refreshProducts() {
        try {
            this._products = await Products.refresh();
            this._categories = await Products.getCategories();
            this._filteredProducts = [...this._products];
            this._currentPage = 1;
            this._populateCategories();
            this._renderProducts();
            utils.toast(
                translator.translate('productsRefreshed') || 'محصولات به‌روزرسانی شدند.',
                'success'
            );
        } catch (error) {
            utils.toast(
                translator.translate('refreshFailed') || 'به‌روزرسانی با شکست مواجه شد.',
                'error'
            );
        }
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
                    this._handleSearch(e.target.value);
                }, 300);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._handleSearch(searchInput.value);
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) {
                    this._handleSearch(searchInput.value);
                }
            });
        }

        // فیلتر دسته‌بندی
        const categoryFilter = document.getElementById('productCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this._handleCategoryFilter(e.target.value);
            });
        }

        // مرتب‌سازی
        const sortFilter = document.getElementById('productSortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this._handleSort(e.target.value);
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
        if (this._element && translator && translator.loaded) {
            translator.translateElement(this._element);
            // بازرندر محصولات
            this._renderProducts();
        }
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