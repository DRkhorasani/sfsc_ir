/*=========================================================
نام فایل: news.js (صفحه)

وظیفه: کنترلر صفحه اخبار – رندر UI، جستجو، فیلتر برچسب،
صفحه‌بندی، نمایش جزییات و مدیریت رویدادها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { News } from '../js/news.js';
import { utils } from '../js/utils.js';
import { Modal } from '../js/modal.js';
import { NewsCardList } from '../components/newsCard.js';
import { Pagination } from '../components/pagination.js';

/*---------------------------------------------------------
کلاس NewsPage

وظیفه: مدیریت صفحه اخبار

---------------------------------------------------------*/
class NewsPage {
    constructor(options = {}) {
        this.options = {
            container: '#news',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._newsList = null;
        this._pagination = null;
        this._newsItems = [];
        this._filteredItems = [];
        this._badges = [];
        this._currentPage = 1;
        this._itemsPerPage = 6;
        this._searchQuery = '';
        this._selectedBadge = '';
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
            console.warn('⚠️ المان صفحه اخبار یافت نشد.');
            return;
        }

        // بارگذاری داده‌ها
        await this._loadData();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // مقداردهی کامپوننت‌ها
        this._initComponents();

        // رندر اخبار
        this._renderNews();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ NewsPage مقداردهی شد.');
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
            this._newsItems = await News.getNews();
            this._badges = await News.getBadges();
            this._filteredItems = [...this._newsItems];
        } catch (error) {
            console.warn('⚠️ خطا در بارگذاری اخبار:', error);
            this._newsItems = await News.getNews(); // داده‌های نمونه
            this._badges = await News.getBadges();
            this._filteredItems = [...this._newsItems];
            utils.toast(
                translator.translate('loadNewsError') || 'خطا در بارگذاری اخبار.',
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
        if (this._element.querySelector('.news-page__wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'news-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'news-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="newsTitle">اخبار و رسانه</h2>
            <p class="section__subtitle" data-i18n="newsSub">رویدادها و موفقیت‌های شرکت سورنا فناور سینا</p>
        `;
        wrapper.appendChild(header);

        // نوار ابزار (جستجو و فیلتر)
        const toolbar = document.createElement('div');
        toolbar.className = 'news-page__toolbar';
        toolbar.innerHTML = `
            <div class="news-page__search">
                <input type="text" id="newsSearchInput" class="auth__input" 
                       placeholder="${translator.translate('searchNews') || 'جستجوی اخبار...'}" 
                       data-placeholder="searchNews" />
                <button class="btn btn--primary" id="newsSearchBtn">
                    <i class="fas fa-search"></i>
                </button>
            </div>
            <div class="news-page__filters">
                <select id="newsBadgeFilter" class="auth__input">
                    <option value="">${translator.translate('allBadges') || 'همه برچسب‌ها'}</option>
                </select>
            </div>
            <div class="news-page__results">
                <span id="newsResultsCount">0 ${translator.translate('items') || 'خبر'}</span>
            </div>
        `;
        wrapper.appendChild(toolbar);

        // کانتینر اخبار
        const newsContainer = document.createElement('div');
        newsContainer.id = 'newsContainer';
        newsContainer.className = 'news__grid';
        wrapper.appendChild(newsContainer);

        // کانتینر صفحه‌بندی
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'newsPagination';
        paginationContainer.className = 'news-page__pagination';
        wrapper.appendChild(paginationContainer);

        // پیام خالی بودن
        const emptyMsg = document.createElement('div');
        emptyMsg.id = 'newsEmptyMessage';
        emptyMsg.className = 'news-page__empty hidden';
        emptyMsg.innerHTML = `
            <i class="fas fa-newspaper" style="font-size:3rem;color:#94a3b8;display:block;margin-bottom:1rem;"></i>
            <p data-i18n="noNewsFound">خبری یافت نشد.</p>
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
        // لیست اخبار
        const newsContainer = document.getElementById('newsContainer');
        if (newsContainer) {
            this._newsList = new NewsCardList(newsContainer, {
                showImage: true,
                showBadge: true,
                showDate: true,
                showDescription: true,
                showReadMore: true,
                onReadMore: (news) => {
                    this._showNewsDetail(news);
                },
            });
            this._newsList.init();
        }

        // صفحه‌بندی
        const paginationContainer = document.getElementById('newsPagination');
        if (paginationContainer) {
            this._pagination = new Pagination({
                totalItems: this._filteredItems.length,
                itemsPerPage: this._itemsPerPage,
                currentPage: this._currentPage,
                visiblePages: 5,
                showFirstLast: true,
                showPrevNext: true,
                showPageSize: true,
                pageSizes: [3, 6, 12, 24],
                onPageChange: (page) => {
                    this._currentPage = page;
                    this._renderNews();
                },
                onPageSizeChange: (size) => {
                    this._itemsPerPage = size;
                    this._currentPage = 1;
                    this._renderNews();
                },
            });
            paginationContainer.appendChild(this._pagination.render());
        }

        // پر کردن برچسب‌ها
        this._populateBadges();
    }

    /*---------------------------------------------------------
    متد _populateBadges

    وظیفه: پر کردن لیست برچسب‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _populateBadges() {
        const select = document.getElementById('newsBadgeFilter');
        if (!select) return;

        while (select.options.length > 1) {
            select.remove(1);
        }

        this._badges.forEach(badge => {
            const option = document.createElement('option');
            option.value = badge;
            option.textContent = badge;
            select.appendChild(option);
        });
    }

    /*---------------------------------------------------------
    متد _renderNews

    وظیفه: رندر اخبار با اعمال فیلترها و صفحه‌بندی

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderNews() {
        if (!this._newsList) return;

        const emptyMessage = document.getElementById('newsEmptyMessage');
        const countEl = document.getElementById('newsResultsCount');

        // اعمال فیلترها
        this._applyFilters();

        const totalItems = this._filteredItems.length;
        const currentPage = Math.min(this._currentPage, Math.ceil(totalItems / this._itemsPerPage) || 1);
        const start = (currentPage - 1) * this._itemsPerPage;
        const end = Math.min(start + this._itemsPerPage, totalItems);
        const pageItems = this._filteredItems.slice(start, end);

        // به‌روزرسانی تعداد
        if (countEl) {
            const text = translator.translate('items') || 'خبر';
            countEl.textContent = `${totalItems} ${text}`;
        }

        // اگر نتیجه‌ای وجود نداشت
        if (totalItems === 0) {
            this._newsList.setNews([]);
            if (emptyMessage) emptyMessage.classList.remove('hidden');
            if (this._pagination) {
                this._pagination.setTotalItems(0);
                this._pagination.render();
            }
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('hidden');

        // به‌روزرسانی لیست
        this._newsList.setNews(pageItems);

        // به‌روزرسانی صفحه‌بندی
        if (this._pagination) {
            this._pagination.setTotalItems(totalItems);
            this._pagination.goToPage(currentPage);
        }
    }

    /*---------------------------------------------------------
    متد _applyFilters

    وظیفه: اعمال فیلترهای جستجو و برچسب

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _applyFilters() {
        let filtered = [...this._newsItems];

        // فیلتر جستجو
        if (this._searchQuery && this._searchQuery.trim() !== '') {
            const query = this._searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item =>
                item.title?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.content?.toLowerCase().includes(query) ||
                item.badge?.toLowerCase().includes(query)
            );
        }

        // فیلتر برچسب
        if (this._selectedBadge && this._selectedBadge.trim() !== '') {
            filtered = filtered.filter(item => item.badge === this._selectedBadge);
        }

        // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
        filtered.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });

        this._filteredItems = filtered;
    }

    /*---------------------------------------------------------
    متد _showNewsDetail

    وظیفه: نمایش جزییات کامل خبر در مودال

    ورودی‌ها: news (object)

    خروجی: void

    ---------------------------------------------------------*/
    _showNewsDetail(news) {
        if (!news) return;

        const content = `
            <div class="news-detail">
                ${news.image ? `<img src="${news.image}" alt="${news.title}" style="width:100%;border-radius:1rem;margin-bottom:1rem;max-height:400px;object-fit:cover;" />` : ''}
                ${news.badge ? `<span style="display:inline-block;background:#2563eb;color:white;padding:0.25rem 1rem;border-radius:9999px;font-size:0.85rem;margin-bottom:0.75rem;">${news.badge}</span>` : ''}
                <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">${news.title}</h2>
                ${news.date ? `<p style="color:#64748b;font-size:0.9rem;margin-bottom:1rem;"><i class="fas fa-calendar-alt"></i> ${utils.formatDate(news.date, this._language === 'fa' ? 'fa-IR' : 'en-US')}</p>` : ''}
                <div style="color:#334155;line-height:1.8;white-space:pre-wrap;">${news.content || news.description || ''}</div>
                <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem;border-top:1px solid #e2e8f0;padding-top:1.5rem;">
                    ${news.link ? `<a href="${news.link}" target="_blank" rel="noopener noreferrer" class="btn btn--primary">
                        ${translator.translate('readFullNews') || 'مطالعه کامل خبر'} <i class="fas fa-external-link-alt"></i>
                    </a>` : ''}
                    <button class="btn btn--outline" onclick="window.__MODAL__?.closeLast()">
                        ${translator.translate('close') || 'بستن'}
                    </button>
                    <button class="btn btn--outline" onclick="window.__SHARE_NEWS__('${news.id}')">
                        <i class="fas fa-share-alt"></i> ${translator.translate('share') || 'اشتراک‌گذاری'}
                    </button>
                </div>
            </div>
        `;

        // افزودن تابع اشتراک‌گذاری به window
        window.__SHARE_NEWS__ = (id) => {
            const url = news.link || window.location.href;
            if (navigator.share) {
                navigator.share({
                    title: news.title,
                    text: news.description,
                    url: url,
                }).catch(() => {});
            } else {
                utils.copyToClipboard(url);
                utils.toast(
                    translator.translate('linkCopied') || 'لینک کپی شد.',
                    'success'
                );
            }
        };

        Modal.open(content, {
            maxWidth: '700px',
            className: 'news-detail-modal',
            onOpen: (modal) => {
                if (translator && translator.loaded) {
                    setTimeout(() => translator.translateElement(modal.element), 50);
                }
            },
        });
    }

    /*---------------------------------------------------------
    متد _showLoading

    وظیفه: نمایش وضعیت بارگذاری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _showLoading() {
        const container = document.getElementById('newsContainer');
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
        // توسط _renderNews مدیریت می‌شود
    }

    /*---------------------------------------------------------
    متد _handleSearch

    وظیفه: مدیریت جستجوی اخبار

    ورودی‌ها: query (string)

    خروجی: void

    ---------------------------------------------------------*/
    _handleSearch(query) {
        this._searchQuery = query || '';
        this._currentPage = 1;
        this._renderNews();
    }

    /*---------------------------------------------------------
    متد _handleBadgeFilter

    وظیفه: مدیریت فیلتر برچسب

    ورودی‌ها: badge (string)

    خروجی: void

    ---------------------------------------------------------*/
    _handleBadgeFilter(badge) {
        this._selectedBadge = badge || '';
        this._currentPage = 1;
        this._renderNews();
    }

    /*---------------------------------------------------------
    متد _refreshNews

    وظیفه: بازخوانی اخبار از سرور

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _refreshNews() {
        try {
            this._newsItems = await News.refresh();
            this._badges = await News.getBadges();
            this._filteredItems = [...this._newsItems];
            this._currentPage = 1;
            this._populateBadges();
            this._renderNews();
            utils.toast(
                translator.translate('newsRefreshed') || 'اخبار به‌روزرسانی شدند.',
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
        const searchInput = document.getElementById('newsSearchInput');
        const searchBtn = document.getElementById('newsSearchBtn');

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

        // فیلتر برچسب
        const badgeFilter = document.getElementById('newsBadgeFilter');
        if (badgeFilter) {
            badgeFilter.addEventListener('change', (e) => {
                this._handleBadgeFilter(e.target.value);
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
            // بازرندر اخبار
            this._renderNews();
        }
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        if (this._newsList) {
            this._newsList.destroy();
            this._newsList = null;
        }
        if (this._pagination) {
            this._pagination.destroy();
            this._pagination = null;
        }
        clearTimeout(this._searchDebounceTimer);
        window.__SHARE_NEWS__ = undefined;
        this._initialized = false;
        console.log('🧹 NewsPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { NewsPage };
export default NewsPage;