/*=========================================================
نام فایل: translator.js

وظیفه: مدیریت ترجمه و چندزبانی برنامه
بارگذاری فایل‌های ترجمه، اعمال ترجمه به المان‌ها،
تغییر زبان و کش کردن ترجمه‌ها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from './state.js';
import { Config } from './config.js';
import { Storage } from './storage.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس Translator

وظیفه: مدیریت ترجمه و چندزبانی برنامه

---------------------------------------------------------*/
class Translator {
    constructor() {
        this.currentLang = Config.APP.DEFAULT_LANGUAGE;
        this.translations = {};
        this.loaded = false;
        this._cache = new Map();
        this._pendingRequests = new Map();
        this._observer = null;
        this._initialized = false;
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه سیستم ترجمه

    ورودی‌ها: lang (string)

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init(lang = null) {
        if (this._initialized) return;

        // تنظیم زبان
        this.currentLang = lang || Storage.get('language', Config.APP.DEFAULT_LANGUAGE);

        // اطمینان از پشتیبانی از زبان
        if (!Config.APP.SUPPORTED_LANGUAGES.includes(this.currentLang)) {
            this.currentLang = Config.APP.DEFAULT_LANGUAGE;
        }

        // بارگذاری ترجمه‌ها
        await this.loadTranslations(this.currentLang);

        // راه‌اندازی MutationObserver برای ترجمه المان‌های دینامیک
        this._setupObserver();

        this._initialized = true;
        console.log(`✅ Translator مقداردهی شد. زبان: ${this.currentLang}`);
    }

    /*---------------------------------------------------------
    متد loadTranslations

    وظیفه: بارگذاری فایل ترجمه برای زبان مشخص

    ورودی‌ها: lang (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async loadTranslations(lang) {
        // بررسی کش
        const cacheKey = `translations_${lang}`;
        if (this._cache.has(cacheKey)) {
            this.translations = this._cache.get(cacheKey);
            this.loaded = true;
            return this.translations;
        }

        // بررسی درخواست در حال انجام
        if (this._pendingRequests.has(lang)) {
            return this._pendingRequests.get(lang);
        }

        // ایجاد درخواست جدید
        const promise = this._fetchTranslations(lang);
        this._pendingRequests.set(lang, promise);

        try {
            const data = await promise;
            this.translations = data;
            this.loaded = true;
            this._cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`❌ خطا در بارگذاری ترجمه برای زبان "${lang}":`, error);
            // تلاش برای بارگذاری زبان پیش‌فرض
            if (lang !== Config.APP.DEFAULT_LANGUAGE) {
                console.warn(`⚠️ بارگذاری زبان پیش‌فرض "${Config.APP.DEFAULT_LANGUAGE}" به جای "${lang}"`);
                return this.loadTranslations(Config.APP.DEFAULT_LANGUAGE);
            }
            // در صورت شکست، از ترجمه‌های خالی استفاده می‌شود
            this.translations = {};
            this.loaded = true;
            return {};
        } finally {
            this._pendingRequests.delete(lang);
        }
    }

    /*---------------------------------------------------------
    متد _fetchTranslations

    وظیفه: دریافت فایل ترجمه از سرور

    ورودی‌ها: lang (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async _fetchTranslations(lang) {
        const url = new URL(`../lang/${lang}.json`, import.meta.url).href;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (typeof data !== 'object' || data === null) {
                throw new Error('فرمت فایل ترجمه نامعتبر است.');
            }

            return data;
        } catch (error) {
            console.warn(`⚠️ فایل ترجمه "${url}" یافت نشد یا بارگذاری نشد.`, error);
            return this._getFallbackTranslations(lang);
        }
    }

    /*---------------------------------------------------------
    متد _getFallbackTranslations

    وظیفه: دریافت ترجمه‌های پیش‌فرض (در صورت عدم وجود فایل)

    ورودی‌ها: lang (string)

    خروجی: object

    ---------------------------------------------------------*/
    _getFallbackTranslations(lang) {
        // ترجمه‌های حداقلی برای جلوگیری از خطا
        const fallback = {
            fa: {
                pageTitle: 'سورنا فناور سینا | سامانه پایش آلرژن و اسپور قارچ',
                subtitleText: 'Aerobiology & Air Monitoring',
                navHome: 'خانه',
                navProducts: 'محصولات',
                navBrand: 'درباره ما',
                navServices: 'خدمات',
                navDashboard: 'پایش آنلاین',
                navNews: 'اخبار',
                navGallery: 'گالری',
                navFaq: 'سوالات متداول',
                navAuth: 'ورود / ثبت نام',
                navContact: 'تماس',
                consultBtn: 'درخواست مشاوره',
                authBtn: 'ورود / ثبت نام',
                heroBadge: 'نوآوری در پایش زیست‌محیطی',
                heroTitle: 'سامانه هوشمند پایش <span class="text-gradient">اسپور قارچ و آلرژن هوا</span>',
                heroDesc: 'طراحی و ساخت تجهیزات پیشرفته نمونه‌گیری گرده، اسپور قارچ، آلرژن‌های معلق و پایش کیفیت هوا برای بیمارستان‌ها، آزمایشگاه‌ها، مراکز تحقیقاتی و کشاورزی دقیق.',
                heroBtn1: 'مشاهده محصولات',
                heroBtn2: 'خدمات تخصصی',
                heroImageTitle: 'دستگاه پیشرفته پایش آلرژن',
                heroImageDesc: 'راهکار جامع اندازه‌گیری اسپور قارچ، گرده و آلرژن‌های هوایی با دقت بالا و اتصال ابری.',
                heroStat1Title: 'پایش ۲۴/۷',
                heroStat1Desc: 'کنترل هوشمند جریان هوا و ارسال داده به صورت لحظه‌ای.',
                heroStat2Title: 'پلتفرم ابری',
                heroStat2Desc: 'دسترسی امن به گزارش‌ها و نمودارهای تحلیلی در هر زمان.',
                heroStat3Title: 'گارانتی فناوری',
                heroStat3Desc: 'توسعه داخلی با ثبت اختراع و پشتیبانی فنی شرکتی.',
                heroLogoNote: 'لوگوی برند',
                heroLogoHeading: 'سورنا فناور سینا',
                heroLogoDesc: 'هویت بصری شرکت در مقیاس بین‌المللی.',
                brandNote: 'برند شرکت ما',
                brandTitle: 'سورنا فناور سینا؛ همگام با فناوری پایش آلرژن',
                brandDesc: 'ما ترکیبی از تجربه علمی و طراحی بومی را برای توسعه دستگاه‌های پایش محیطی ارائه می‌دهیم که نیازهای بیمارستان‌ها، آزمایشگاه‌ها و مراکز تحقیقاتی را پوشش می‌دهد.',
                brandCard1Title: 'ثبت اختراع ملی',
                brandCard1Desc: 'دستگاه ما دارای گواهی ثبت اختراع اختصاصی در حوزه نمونه‌گیری آلرژی و قارچ است.',
                brandCard2Title: 'سازگاری با استانداردها',
                brandCard2Desc: 'طراحی بر اساس معیارهای جهانی کیفیت و قابلیت استفاده در محیط‌های حساس.',
                brandBtnMore: 'بیشتر بدانید',
                brandBtnConsult: 'درخواست مشاوره',
                statsTitle: 'داده‌های پایش هوا',
                statsSub: 'نمونه‌ای از داده‌های واقعی ثبت شده توسط سامانه',
                stat1Label: 'اسپور قارچ / متر مکعب',
                stat2Label: 'گرده گیاهان',
                stat3Label: 'دقت نمونه‌گیری %',
                stat4Label: 'ساعت پایش پیوسته',
                productsTitle: 'محصولات تخصصی',
                productsSub: 'طراحی شده بر اساس فناوری مشابه Burkard و Zefon با قابلیت بومی‌سازی',
                servicesTitle: 'خدمات تخصصی',
                servicesSub: 'ارائه خدمات نمونه‌گیری، تحلیل و تفسیر داده‌های آلرژن و اسپور قارچ',
                dashboardTitle: 'داشبورد آنلاین پایش',
                dashboardDesc: 'داده‌های ثبت شده توسط دستگاه‌ها به صورت آنلاین روی پلتفرم ابری ذخیره شده و امکان تحلیل، رسم نمودار، هشدار آلودگی و گزارش‌گیری فراهم است.',
                dashboardFeature1: 'ذخیره‌سازی ابری',
                dashboardFeature2: 'تحلیل روند آلودگی',
                dashboardFeature3: 'هشدار افزایش آلرژن',
                newsTitle: 'اخبار و رسانه',
                newsSub: 'رویدادها و موفقیت‌های شرکت سورنا فناور سینا',
                newsReadMore: 'بیشتر بخوانید',
                compareTitle: 'مقایسه فنی',
                compareFeature: 'ویژگی',
                compareOur: 'سورنا فناور',
                compareRow1: 'نمونه‌گیری',
                compareOur1: '۷ روزه + آنلاین',
                compareRow2: 'تحلیل دیجیتال',
                compareOur2: 'دارد',
                compareRow3: 'Cloud Platform',
                compareOur3: 'دارد',
                compareRow4: 'خدمات تحلیل',
                compareOur4: 'کامل',
                authSectionTitle: 'ورود و ثبت نام',
                authSectionSubtitle: 'ثبت نام، ورود به حساب کاربری و مشاهده پروفایل',
                authTabRegister: 'ثبت نام',
                authTabLogin: 'ورود',
                authTabProfile: 'پروفایل',
                authRegisterUsernameLabel: 'نام کاربری',
                authRegisterMobileLabel: 'شماره موبایل',
                authRegisterEmailLabel: 'ایمیل',
                authRegisterPasswordLabel: 'رمز عبور',
                authRegisterConfirmPasswordLabel: 'تکرار رمز عبور',
                authRegisterOtpNote: 'برای تایید حساب، کد ارسال شده به موبایل را وارد کنید.',
                authRegisterOtpLabel: 'کد تایید',
                authRegisterOtpButton: 'تایید کد و ثبت نام',
                authRegisterPrimary: 'ثبت نام',
                authRegisterAlt: 'قبلاً حساب دارم',
                authLoginMethodLabel: 'روش ورود',
                authLoginPasswordOption: 'رمز عبور',
                authLoginOtpOption: 'کد یک بار مصرف',
                authLoginMobileLabel: 'شماره موبایل',
                authLoginPasswordLabel: 'رمز عبور',
                authLoginOtpNote: 'کد یک بار مصرف به موبایل شما ارسال خواهد شد.',
                authLoginOtpLabel: 'کد OTP',
                authLoginVerifyButton: 'تایید کد و ورود',
                authLoginPrimary: 'ورود',
                authLoginAlt: 'ثبت نام جدید',
                authProfileInfoTitle: 'اطلاعات کاربری',
                profileUsernameLabel: 'نام کاربری:',
                profileMobileLabel: 'موبایل:',
                profileEmailLabel: 'ایمیل:',
                authProfileChangeTitle: 'تغییر رمز عبور',
                authCurrentPasswordLabel: 'رمز فعلی',
                authNewPasswordLabel: 'رمز جدید',
                authSavePasswordButton: 'ذخیره رمز جدید',
                authLogoutButton: 'خروج از حساب',
                patentNote: 'ثبت اختراع و نوآوری',
                patentTitle: 'محصول ثبت‌شده در سیستم پایش آلرژن',
                patentDesc: 'دستگاه نمونه‌گیری ما یک راهکار بومی با ثبت اختراع در حوزه پایش نمونه‌های هوا می‌باشد که به صورت پایدار و خودکار، داده‌های محیطی را ثبت می‌کند.',
                patentFeature1: 'ثبت اختراع ملی در فناوری نمونه‌گیری و تحلیل آلرژن',
                patentFeature2: 'کنترل کیفیت با استانداردهای آزمایشگاهی و محیطی',
                patentFeature3: 'قابلیت اتصال به داشبورد ابری و اعلان‌های هوشمند',
                faqTitle: 'سوالات متداول',
                contactTitle: 'تماس با ما',
                contactDesc: 'برای مشاوره، ثبت سفارش یا همکاری با ما تماس بگیرید.',
                contactAddress: 'اهواز، دانشگاه شهید چمران اهواز، مرکز رشد واحدهای فناور',
                contactNameLabel: 'نام کامل',
                contactEmailLabel: 'ایمیل',
                contactTypeLabel: 'نوع درخواست',
                contactMsgLabel: 'پیام',
                contactSubmitBtn: 'ارسال درخواست',
                optPurchase: 'خرید دستگاه',
                optSampling: 'نمونه‌گیری هوا',
                optAnalysis: 'تحلیل داده',
                optResearch: 'همکاری پژوهشی',
                galleryTitle: 'گالری تصاویر',
                gallerySub: 'نمونه‌هایی از محصولات، تیم توسعه و محیط آزمایشگاهی ما',
                footerDesc: 'توسعه فناوری‌های نوین پایش آلرژن، اسپور قارچ و آئروبیولوژی',
                copyright: '© 2026 سورنا فناور سینا - تمام حقوق محفوظ است',
            },
            en: {
                pageTitle: 'Sorena Fanavar Sina | Allergen and Fungal Spore Monitoring System',
                subtitleText: 'Aerobiology & Air Monitoring',
                navHome: 'Home',
                navProducts: 'Products',
                navBrand: 'About',
                navServices: 'Services',
                navDashboard: 'Live Monitoring',
                navNews: 'News',
                navGallery: 'Gallery',
                navFaq: 'FAQ',
                navAuth: 'Login / Register',
                navContact: 'Contact',
                consultBtn: 'Request Consultation',
                authBtn: 'Login / Register',
                heroBadge: 'Innovation in environmental monitoring',
                heroTitle: 'Smart Airborne <span class="text-gradient">Spore & Allergen Monitoring System</span>',
                heroDesc: 'Design and manufacturing of advanced pollen, fungal spore, airborne allergen samplers and air quality monitoring for hospitals, labs, research centers, and precision agriculture.',
                heroBtn1: 'View Products',
                heroBtn2: 'Expert Services',
                heroImageTitle: 'Advanced Allergen Monitoring Device',
                heroImageDesc: 'Comprehensive solution for measuring fungal spores, pollen and airborne allergens with high accuracy and cloud connectivity.',
                heroStat1Title: '24/7 Monitoring',
                heroStat1Desc: 'Smart airflow control and real-time data transmission.',
                heroStat2Title: 'Cloud Platform',
                heroStat2Desc: 'Secure access to reports and analysis charts anytime.',
                heroStat3Title: 'Technology Warranty',
                heroStat3Desc: 'Locally developed with patent support and corporate service.',
                heroLogoNote: 'Brand logo',
                heroLogoHeading: 'Sorena Fanavar Sina',
                heroLogoDesc: 'Global visual identity and branding.',
                brandNote: 'Our company brand',
                brandTitle: 'Sorena Fanavar Sina; Advanced Allergen Monitoring Technology',
                brandDesc: 'We combine scientific experience and local design to develop environmental monitoring devices that meet the needs of hospitals, laboratories and research centers.',
                brandCard1Title: 'National Patent',
                brandCard1Desc: 'Our device has an exclusive patent in the field of allergy and fungal sampling.',
                brandCard2Title: 'Standard Compliance',
                brandCard2Desc: 'Designed based on global quality standards and usable in sensitive environments.',
                brandBtnMore: 'Learn More',
                brandBtnConsult: 'Request Consultation',
                statsTitle: 'Air Monitoring Data',
                statsSub: 'Example of real data recorded by our system',
                stat1Label: 'Fungal Spores / m³',
                stat2Label: 'Pollen Grains',
                stat3Label: 'Sampling Accuracy %',
                stat4Label: 'Continuous Hours',
                productsTitle: 'Specialized Products',
                productsSub: 'Designed with technology similar to Burkard and Zefon, fully localized',
                servicesTitle: 'Expert Services',
                servicesSub: 'Sampling, analysis and interpretation of allergen and fungal spore data',
                dashboardTitle: 'Live Monitoring Dashboard',
                dashboardDesc: 'Data from devices is stored on cloud platform enabling analysis, trend charts, contamination alerts and reporting.',
                dashboardFeature1: 'Cloud Storage',
                dashboardFeature2: 'Pollution Trend Analysis',
                dashboardFeature3: 'Allergen Spike Alerts',
                newsTitle: 'News & Media',
                newsSub: 'Events and achievements of Sorena Fanavar Sina',
                newsReadMore: 'Read More',
                compareTitle: 'Technical Comparison',
                compareFeature: 'Feature',
                compareOur: 'Sorena Fanavar',
                compareRow1: 'Sampling',
                compareOur1: '7-day + Online',
                compareRow2: 'Digital Analysis',
                compareOur2: 'Yes',
                compareRow3: 'Cloud Platform',
                compareOur3: 'Yes',
                compareRow4: 'Analysis Services',
                compareOur4: 'Complete',
                authSectionTitle: 'Login & Register',
                authSectionSubtitle: 'Register, sign in, and view your profile',
                authTabRegister: 'Register',
                authTabLogin: 'Login',
                authTabProfile: 'Profile',
                authRegisterUsernameLabel: 'Username',
                authRegisterMobileLabel: 'Mobile Number',
                authRegisterEmailLabel: 'Email',
                authRegisterPasswordLabel: 'Password',
                authRegisterConfirmPasswordLabel: 'Confirm Password',
                authRegisterOtpNote: 'Enter the code sent to your mobile to confirm your account.',
                authRegisterOtpLabel: 'Confirmation Code',
                authRegisterOtpButton: 'Verify & Register',
                authRegisterPrimary: 'Register',
                authRegisterAlt: 'Already have an account',
                authLoginMethodLabel: 'Login Method',
                authLoginPasswordOption: 'Password',
                authLoginOtpOption: 'One-time code',
                authLoginMobileLabel: 'Mobile Number',
                authLoginPasswordLabel: 'Password',
                authLoginOtpNote: 'A one-time code will be sent to your mobile.',
                authLoginOtpLabel: 'OTP Code',
                authLoginVerifyButton: 'Verify & Login',
                authLoginPrimary: 'Login',
                authLoginAlt: 'New registration',
                authProfileInfoTitle: 'Profile Information',
                profileUsernameLabel: 'Username:',
                profileMobileLabel: 'Mobile:',
                profileEmailLabel: 'Email:',
                authProfileChangeTitle: 'Change Password',
                authCurrentPasswordLabel: 'Current Password',
                authNewPasswordLabel: 'New Password',
                authSavePasswordButton: 'Save New Password',
                authLogoutButton: 'Logout',
                patentNote: 'Patent & Innovation',
                patentTitle: 'Registered Product in Allergen Monitoring System',
                patentDesc: 'Our sampling device is a local solution with a patent in the field of air sampling that records environmental data stably and automatically.',
                patentFeature1: 'National patent in allergen sampling and analysis technology',
                patentFeature2: 'Quality control with laboratory and environmental standards',
                patentFeature3: 'Connection to cloud dashboard and smart alerts',
                faqTitle: 'Frequently Asked Questions',
                contactTitle: 'Contact Us',
                contactDesc: 'Contact us for consultation, orders or collaboration.',
                contactAddress: 'Ahvaz, Shahid Chamran University, Growth Center of Technology Units',
                contactNameLabel: 'Full Name',
                contactEmailLabel: 'Email',
                contactTypeLabel: 'Request Type',
                contactMsgLabel: 'Message',
                contactSubmitBtn: 'Submit Request',
                optPurchase: 'Purchase Device',
                optSampling: 'Air Sampling',
                optAnalysis: 'Data Analysis',
                optResearch: 'Research Collaboration',
                galleryTitle: 'Image Gallery',
                gallerySub: 'Samples of products, development team and lab environment',
                footerDesc: 'Developing advanced allergen, fungal spore monitoring and aerobiology technologies',
                copyright: '© 2026 Sorena Fanavar Sina - All rights reserved',
            }
        };

        return fallback[lang] || fallback[Config.APP.DEFAULT_LANGUAGE] || {};
    }

    /*---------------------------------------------------------
    متد translate

    وظیفه: دریافت ترجمه یک کلید

    ورودی‌ها: key (string), params (object)

    خروجی: string

    ---------------------------------------------------------*/
    translate(key, params = null) {
        if (!key) return '';

        // جستجوی ترجمه
        let value = this._getNestedValue(this.translations, key);

        // اگر ترجمه یافت نشد، گزارش و بازگشت خالی
        if (value === undefined || value === null) {
            console.warn(`⚠️ کلید ترجمه "${key}" یافت نشد.`);
            return '';
        }

        // اگر value رشته نباشد، به رشته تبدیل می‌شود
        if (typeof value !== 'string') {
            value = String(value);
        }

        // جایگزینی پارامترها
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(paramKey => {
                const placeholder = `{${paramKey}}`;
                value = value.replace(new RegExp(placeholder, 'g'), String(params[paramKey]));
            });
        }

        return value;
    }

    /*---------------------------------------------------------
    متد _getNestedValue

    وظیفه: دریافت مقدار تو در تو از شیء با استفاده از کلید نقطه‌دار

    ورودی‌ها: obj (object), key (string)

    خروجی: any

    ---------------------------------------------------------*/
    _getNestedValue(obj, key) {
        if (!obj || typeof obj !== 'object') return undefined;

        const keys = key.split('.');
        let current = obj;

        for (const k of keys) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }
            if (!(k in current)) {
                return undefined;
            }
            current = current[k];
        }

        return current;
    }

    /*---------------------------------------------------------
    متد setLanguage

    وظیفه: تغییر زبان فعلی

    ورودی‌ها: lang (string)

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async setLanguage(lang) {
        if (!Config.APP.SUPPORTED_LANGUAGES.includes(lang)) {
            console.warn(`⚠️ زبان "${lang}" پشتیبانی نمی‌شود.`);
            return;
        }

        if (lang === this.currentLang && this.loaded) {
            return;
        }

        this.currentLang = lang;
        await this.loadTranslations(lang);

        // ذخیره در LocalStorage
        Storage.set('language', lang);
        State.set('language', lang);

        // انتشار رویداد تغییر زبان
        document.dispatchEvent(new CustomEvent('langChanged', {
            detail: { lang }
        }));

        console.log(`🌐 زبان به "${lang}" تغییر یافت.`);
    }

    /*---------------------------------------------------------
    متد getCurrentLanguage

    وظیفه: دریافت زبان فعلی

    ورودی‌ها: none

    خروجی: string

    ---------------------------------------------------------*/
    getCurrentLanguage() {
        return this.currentLang;
    }

    /*---------------------------------------------------------
    متد translatePage

    وظیفه: ترجمه تمام المان‌های صفحه بر اساس data-i18n

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    translatePage() {
        if (!this.loaded) {
            console.warn('⚠️ ترجمه‌ها هنوز بارگذاری نشده‌اند.');
            return;
        }

        // 1. ترجمه data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                const translation = this.translate(key);
                if (translation) {
                    // اگر المان دارای innerHTML (مانند span با html) باشد، از innerHTML استفاده می‌شود
                    // در غیر این صورت از innerText
                    const isHtml = el.querySelector('span, div, strong, em, i') || 
                                   el.innerHTML.includes('<span') || 
                                   el.innerHTML.includes('</span>');
                    if (isHtml || translation.includes('<')) {
                        el.innerHTML = translation;
                    } else {
                        el.textContent = translation;
                    }
                }
            }
        });

        // 2. ترجمه data-placeholder
        const placeholders = document.querySelectorAll('[data-placeholder]');
        placeholders.forEach(el => {
            const key = el.getAttribute('data-placeholder');
            if (key) {
                const translation = this.translate(key);
                if (translation) {
                    el.placeholder = translation;
                }
            }
        });

        // 3. ترجمه data-title
        const titles = document.querySelectorAll('[data-title]');
        titles.forEach(el => {
            const key = el.getAttribute('data-title');
            if (key) {
                const translation = this.translate(key);
                if (translation) {
                    el.title = translation;
                }
            }
        });

        // 4. ترجمه data-tooltip
        const tooltips = document.querySelectorAll('[data-tooltip]');
        tooltips.forEach(el => {
            const key = el.getAttribute('data-tooltip');
            if (key) {
                const translation = this.translate(key);
                if (translation) {
                    el.setAttribute('aria-label', translation);
                    // در صورت نیاز می‌توان tooltip سفارشی نیز پیاده‌سازی کرد
                }
            }
        });

        // 5. ترجمه data-aria-label
        const ariaLabels = document.querySelectorAll('[data-aria-label]');
        ariaLabels.forEach(el => {
            const key = el.getAttribute('data-aria-label');
            if (key) {
                const translation = this.translate(key);
                if (translation) {
                    el.setAttribute('aria-label', translation);
                }
            }
        });

        // 6. ترجمه title صفحه
        const pageTitle = document.querySelector('title');
        if (pageTitle) {
            const key = 'pageTitle';
            const translation = this.translate(key);
            if (translation) {
                pageTitle.textContent = translation;
            }
        }

        // 7. ترجمه تمام select options
        document.querySelectorAll('select [data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                const translation = this.translate(key);
                if (translation) {
                    el.textContent = translation;
                }
            }
        });
    }

    /*---------------------------------------------------------
    متد translateElement

    وظیفه: ترجمه یک المان خاص

    ورودی‌ها: element (HTMLElement)

    خروجی: void

    ---------------------------------------------------------*/
    translateElement(element) {
        if (!element || !this.loaded) return;

        // ترجمه data-i18n
        if (element.hasAttribute('data-i18n')) {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            if (translation) {
                const isHtml = element.querySelector('span, div, strong, em, i') ||
                               element.innerHTML.includes('<span') ||
                               element.innerHTML.includes('</span>');
                if (isHtml || translation.includes('<')) {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
            }
        }

        // data-placeholder
        if (element.hasAttribute('data-placeholder')) {
            const key = element.getAttribute('data-placeholder');
            const translation = this.translate(key);
            if (translation) {
                element.placeholder = translation;
            }
        }

        // data-title
        if (element.hasAttribute('data-title')) {
            const key = element.getAttribute('data-title');
            const translation = this.translate(key);
            if (translation) {
                element.title = translation;
            }
        }

        // data-tooltip
        if (element.hasAttribute('data-tooltip')) {
            const key = element.getAttribute('data-tooltip');
            const translation = this.translate(key);
            if (translation) {
                element.setAttribute('aria-label', translation);
            }
        }
    }

    /*---------------------------------------------------------
    متد _setupObserver

    وظیفه: راه‌اندازی MutationObserver برای ترجمه المان‌های جدید

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _setupObserver() {
        if (this._observer) {
            this._observer.disconnect();
        }

        this._observer = new MutationObserver((mutations) => {
            let needsTranslation = false;

            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // بررسی المان‌های جدید با data-i18n
                            if (node.hasAttribute && node.hasAttribute('data-i18n')) {
                                needsTranslation = true;
                            }
                            // بررسی فرزندان
                            if (node.querySelectorAll) {
                                const children = node.querySelectorAll('[data-i18n], [data-placeholder], [data-title], [data-tooltip]');
                                if (children.length > 0) {
                                    needsTranslation = true;
                                }
                            }
                        }
                    });
                } else if (mutation.type === 'attributes') {
                    if (mutation.attributeName === 'data-i18n' ||
                        mutation.attributeName === 'data-placeholder' ||
                        mutation.attributeName === 'data-title' ||
                        mutation.attributeName === 'data-tooltip') {
                        needsTranslation = true;
                    }
                }
            });

            if (needsTranslation) {
                // با تاخیر کوتاه برای اطمینان از رندر شدن المان‌ها
                clearTimeout(this._translateTimeout);
                this._translateTimeout = setTimeout(() => {
                    this.translatePage();
                }, 50);
            }
        });

        this._observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-i18n', 'data-placeholder', 'data-title', 'data-tooltip'],
        });
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        clearTimeout(this._translateTimeout);
        this._initialized = false;
        console.log('🧹 Translator پاکسازی شد.');
    }

    /*---------------------------------------------------------
    متد reload

    وظیفه: بارگذاری مجدد ترجمه‌ها

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async reload() {
        const lang = this.currentLang;
        this._cache.delete(`translations_${lang}`);
        this.loaded = false;
        await this.loadTranslations(lang);
        this.translatePage();
    }
}

// ===== ایجاد نمونه واحد =====
const translator = new Translator();

// ===== صادرات =====
export { Translator, translator };
export default translator;