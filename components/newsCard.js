/*=========================================================
نام فایل: newsCard.js

وظیفه: کامپوننت نمایش کارت اخبار با قابلیت نمایش تصویر،
عنوان، توضیحات، برچسب، تاریخ، لینک مطالعه بیشتر و وضعیت‌های مختلف

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { utils } from '../js/utils.js';

/*---------------------------------------------------------
کلاس NewsCard

وظیفه: ایجاد و مدیریت کارت اخبار

---------------------------------------------------------*/
class NewsCard {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه با داده‌های خبر

    ورودی‌ها: news (object), options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(news, options = {}) {
        this.news = news;
        this.options = {
            showImage: true,
            showBadge: true,
            showDate: true,
            showDescription: true,
            showReadMore: true,
            className: '',
            onReadMore: null,
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
    }

    /*---------------------------------------------------------
    متد render

    وظیفه: ایجاد المان کارت خبر

    ورودی‌ها: none

    خروجی: HTMLElement

    ---------------------------------------------------------*/
    render() {
        if (this._element) {
            return this._element;
        }

        const news = this.news;
        const opts = this.options;

        // ساختار کارت
        const card = document.createElement('div');
        card.className = `news-card card-hover ${opts.className}`;
        card.dataset.newsId = news.id;

        // تصویر
        if (opts.showImage && news.image) {
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'news-card__image-wrapper';

            const img = document.createElement('img');
            img.className = 'news-card__image';
            img.src = news.image || 'https://via.placeholder.com/400x300?text=No+Image';
            img.alt = news.title || 'خبر';
            img.loading = 'lazy';
            imgWrapper.appendChild(img);

            // برچسب روی تصویر (در صورت وجود)
            if (opts.showBadge && news.badge) {
                const badge = document.createElement('span');
                badge.className = 'news-card__image-badge';
                badge.textContent = news.badge;
                imgWrapper.appendChild(badge);
            }

            card.appendChild(imgWrapper);
        }

        // محتوای کارت
        const body = document.createElement('div');
        body.className = 'news-card__body';

        // برچسب (در صورت عدم نمایش روی تصویر)
        if (opts.showBadge && news.badge && !opts.showImage) {
            const badge = document.createElement('div');
            badge.className = 'news-card__badge';
            badge.textContent = news.badge;
            body.appendChild(badge);
        }

        // عنوان
        const title = document.createElement('h3');
        title.className = 'news-card__title';
        title.textContent = news.title || 'خبر بدون عنوان';
        body.appendChild(title);

        // تاریخ
        if (opts.showDate && news.date) {
            const date = document.createElement('div');
            date.className = 'news-card__date';
            const formattedDate = utils.formatDate(news.date, this._language === 'fa' ? 'fa-IR' : 'en-US');
            date.innerHTML = `<i class="fas fa-calendar-alt"></i> ${formattedDate || news.date}`;
            body.appendChild(date);
        }

        // توضیحات
        if (opts.showDescription && news.description) {
            const desc = document.createElement('p');
            desc.className = 'news-card__desc';
            desc.textContent = utils.truncate(news.description, 120);
            body.appendChild(desc);
        }

        card.appendChild(body);

        // دکمه مطالعه بیشتر
        if (opts.showReadMore) {
            const footer = document.createElement('div');
            footer.className = 'news-card__footer';

            const readMoreBtn = document.createElement('a');
            readMoreBtn.className = 'news-card__link link-hover';
            readMoreBtn.innerHTML = `${translator.translate('newsReadMore') || 'بیشتر بخوانید'} <i class="fas fa-arrow-left"></i>`;
            readMoreBtn.setAttribute('data-i18n', 'newsReadMore');

            if (news.link) {
                readMoreBtn.href = news.link;
                readMoreBtn.target = '_blank';
                readMoreBtn.rel = 'noopener noreferrer';
            } else {
                readMoreBtn.href = '#';
                readMoreBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._handleReadMore();
                });
            }

            footer.appendChild(readMoreBtn);
            card.appendChild(footer);
        }

        // رویداد کلیک روی کارت
        card.addEventListener('click', (e) => {
            // اگر روی لینک کلیک شده باشد، رویداد قبلاً مدیریت شده است
            if (e.target.closest('.news-card__link')) return;
            this._handleReadMore();
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
    متد _handleReadMore

    وظیفه: مدیریت کلیک روی دکمه مطالعه بیشتر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _handleReadMore() {
        const news = this.news;

        // اگر لینک وجود دارد، باز شود
        if (news.link) {
            window.open(news.link, '_blank', 'noopener,noreferrer');
            return;
        }

        // اجرای callback
        if (typeof this.options.onReadMore === 'function') {
            this.options.onReadMore(news);
            return;
        }

        // نمایش جزییات خبر در مودال
        this._showNewsDetail();
    }

    /*---------------------------------------------------------
    متد _showNewsDetail

    وظیفه: نمایش جزییات کامل خبر در مودال

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _showNewsDetail() {
        const news = this.news;

        const content = `
            <div class="news-detail">
                ${news.image ? `<img src="${news.image}" alt="${news.title}" style="width:100%;border-radius:1rem;margin-bottom:1rem;max-height:400px;object-fit:cover;" />` : ''}
                ${news.badge ? `<span style="display:inline-block;background:#2563eb;color:white;padding:0.25rem 1rem;border-radius:9999px;font-size:0.85rem;margin-bottom:0.75rem;">${news.badge}</span>` : ''}
                <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">${news.title}</h2>
                ${news.date ? `<p style="color:#64748b;font-size:0.9rem;margin-bottom:1rem;"><i class="fas fa-calendar-alt"></i> ${utils.formatDate(news.date, this._language === 'fa' ? 'fa-IR' : 'en-US')}</p>` : ''}
                <div style="color:#334155;line-height:1.8;white-space:pre-wrap;">${news.description || news.content || ''}</div>
                ${news.link ? `<a href="${news.link}" target="_blank" rel="noopener noreferrer" class="btn btn--primary" style="margin-top:1.5rem;display:inline-flex;">
                    ${translator.translate('readFullNews') || 'مطالعه کامل خبر'} <i class="fas fa-external-link-alt"></i>
                </a>` : ''}
            </div>
        `;

        const modalId = Modal.open(content, {
            maxWidth: '700px',
            className: 'news-detail-modal',
        });

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                const modal = Modal.find(modalId);
                if (modal) {
                    translator.translateElement(modal.element);
                }
            }, 50);
        }
    }

    /*---------------------------------------------------------
    متد update

    وظیفه: به‌روزرسانی کارت با داده‌های جدید

    ورودی‌ها: news (object)

    خروجی: void

    ---------------------------------------------------------*/
    update(news) {
        if (!news) return;
        this.news = { ...this.news, ...news };
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
کلاس NewsCardList

وظیفه: مدیریت لیست کارت‌های اخبار

---------------------------------------------------------*/
class NewsCardList {
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
            showImage: true,
            showBadge: true,
            showDate: true,
            showDescription: true,
            showReadMore: true,
            className: '',
            onReadMore: null,
            ...options,
        };
        this._cards = [];
        this._newsItems = [];
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
            console.warn('⚠️ کانتینر لیست اخبار یافت نشد.');
            return;
        }

        document.addEventListener('langChanged', (e) => {
            this._language = e.detail.lang || 'fa';
            this._updateLanguage();
        });

        this._initialized = true;
        console.log('✅ NewsCardList مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد setNews

    وظیفه: تنظیم لیست اخبار و رندر

    ورودی‌ها: newsItems (array)

    خروجی: void

    ---------------------------------------------------------*/
    setNews(newsItems) {
        if (!Array.isArray(newsItems)) {
            console.warn('⚠️ اخبار باید به صورت آرایه باشند.');
            return;
        }
        this._newsItems = newsItems;
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

        if (this._newsItems.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-center text-muted';
            emptyMsg.textContent = translator.translate('noNews') || 'خبری یافت نشد.';
            emptyMsg.setAttribute('data-i18n', 'noNews');
            this._container.appendChild(emptyMsg);
            if (translator && translator.loaded) {
                translator.translateElement(emptyMsg);
            }
            return;
        }

        this._newsItems.forEach((news, index) => {
            const card = new NewsCard(news, {
                ...this._options,
                onReadMore: this._options.onReadMore,
            });

            const element = card.render();
            this._container.appendChild(element);
            this._cards.push(card);

            if (element) {
                element.style.animationDelay = `${index * 0.05}s`;
                element.classList.add('fade-in-up');
            }
        });

        console.log(`✅ ${this._cards.length} کارت خبر رندر شد.`);
    }

    /*---------------------------------------------------------
    متد addNews

    وظیفه: افزودن یک خبر به لیست

    ورودی‌ها: news (object)

    خروجی: void

    ---------------------------------------------------------*/
    addNews(news) {
        if (!news) return;
        this._newsItems.push(news);

        const card = new NewsCard(news, {
            ...this._options,
            onReadMore: this._options.onReadMore,
        });
        const element = card.render();
        this._container.appendChild(element);
        this._cards.push(card);
        element.classList.add('fade-in-up');
    }

    /*---------------------------------------------------------
    متد removeNews

    وظیفه: حذف یک خبر از لیست

    ورودی‌ها: newsId (string|number)

    خروجی: boolean

    ---------------------------------------------------------*/
    removeNews(newsId) {
        const index = this._newsItems.findIndex(n => n.id === newsId);
        if (index === -1) return false;

        this._newsItems.splice(index, 1);
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
        this._newsItems = [];
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
    متد getNews

    وظیفه: دریافت لیست اخبار

    ورودی‌ها: none

    خروجی: array

    ---------------------------------------------------------*/
    getNews() {
        return [...this._newsItems];
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
        console.log('🧹 NewsCardList پاکسازی شد.');
    }
}

// ===== صادرات =====
export { NewsCard, NewsCardList };
export default NewsCard;