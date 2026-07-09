# سورنا فناور سینا - سامانه پایش آلرژن و اسپور قارچ

## معرفی پروژه

سامانه هوشمند پایش اسپور قارچ و آلرژن‌های هوا، یک وب‌اپلیکیشن پیشرفته و ماژولار است که برای مدیریت و نمایش داده‌های پایش آلرژن، اسپور قارچ و گرده گیاهان طراحی شده است. این پروژه با معماری مدرن Vanilla JavaScript ES6 Modules پیاده‌سازی شده و قابلیت اتصال به Backend را دارد.

## ویژگی‌های اصلی

- ✅ **معماری ماژولار** - کد به صورت کاملاً ماژولار و قابل توسعه
- ✅ **سیستم ترجمه دو زبانه** - پشتیبانی از زبان‌های فارسی و انگلیسی
- ✅ **مدیریت وضعیت مرکزی** - با قابلیت ذخیره‌سازی در LocalStorage
- ✅ **سیستم مسیریابی** - با پشتیبانی از History API
- ✅ **سیستم احراز هویت** - شامل ورود، ثبت نام، تایید OTP
- ✅ **کامپوننت‌های قابل استفاده مجدد** - کارت‌های محصول، خدمات، اخبار و ...
- ✅ **سیستم سبد خرید** - با قابلیت افزودن، حذف و تغییر تعداد
- ✅ **صفحه‌بندی** - برای نمایش لیست‌های طولانی
- ✅ **سیستم مودال** - برای نمایش جزییات و فرم‌ها
- ✅ **سیستم API** - با قابلیت Mock برای توسعه بدون Backend
- ✅ **سیستم اعتبارسنجی** - برای ورودی‌های کاربر
- ✅ **سیستم کش** - برای بهبود عملکرد
- ✅ **سیستم لاگینگ** - برای ردیابی خطاها
- ✅ **پاسخ‌گویی کامل** - سازگار با تمام دستگاه‌ها
- ✅ **دسترسی‌پذیری** - رعایت استانداردهای ARIA
- ✅ **بهینه‌سازی عملکرد** - Lazy Loading، Debounce، Throttle

## ساختار پروژه
SurenaFanavar/
│
├── index.html
│
├── css/
│ ├── style.css # استایل‌های پایه و عمومی
│ ├── responsive.css # استایل‌های واکنش‌گرا
│ ├── animation.css # انیمیشن‌ها و افکت‌ها
│ └── theme.css # متغیرهای تم و کلاس‌های کمکی
│
├── js/
│ ├── app.js # نقطه ورود اصلی برنامه
│ ├── config.js # تنظیمات برنامه
│ ├── state.js # مدیریت وضعیت مرکزی
│ ├── router.js # مدیریت مسیریابی
│ ├── translator.js # سیستم ترجمه
│ ├── storage.js # مدیریت LocalStorage
│ ├── utils.js # توابع کمکی
│ ├── validators.js # توابع اعتبارسنجی
│ ├── api.js # مدیریت ارتباط با سرور
│ ├── modal.js # مدیریت مودال‌ها
│ ├── auth.js # مدیریت احراز هویت
│ ├── dashboard.js # مدیریت داشبورد
│ ├── cart.js # مدیریت سبد خرید
│ ├── products.js # مدیریت محصولات
│ ├── services.js # مدیریت خدمات
│ ├── news.js # مدیریت اخبار
│ └── faq.js # مدیریت سوالات متداول
│
├── pages/
│ ├── home.js # صفحه اصلی
│ ├── products.js # صفحه محصولات
│ ├── services.js # صفحه خدمات
│ ├── news.js # صفحه اخبار
│ ├── faq.js # صفحه سوالات متداول
│ ├── login.js # صفحه ورود
│ ├── register.js # صفحه ثبت نام
│ ├── dashboard.js # صفحه داشبورد
│ ├── profile.js # صفحه پروفایل
│ ├── cart.js # صفحه سبد خرید
│ └── orders.js # صفحه سفارشات
│
├── components/
│ ├── navbar.js # نوار ناوبری
│ ├── footer.js # فوتر
│ ├── modal.js # کامپوننت مودال
│ ├── productCard.js # کارت محصول
│ ├── serviceCard.js # کارت خدمت
│ ├── newsCard.js # کارت خبر
│ ├── faqItem.js # آیتم سوال
│ └── pagination.js # صفحه‌بندی
│
├── lang/
│ ├── fa.json # ترجمه فارسی
│ └── en.json # ترجمه انگلیسی
│
├── data/
│ ├── products.json # داده‌های محصولات
│ ├── services.json # داده‌های خدمات
│ ├── news.json # داده‌های اخبار
│ └── faq.json # داده‌های سوالات
│
├── images/ # تصاویر پروژه
│
└── README.md # این فایل

text

## نصب و راه‌اندازی

### پیش‌نیازها

- یک مرورگر مدرن (Chrome، Firefox، Safari، Edge)
- سرور وب (برای اجرای محلی، می‌توان از Live Server استفاده کرد)

### نصب

1. کلون کردن مخزن:

```bash
git clone https://github.com/your-username/SurenaFanavar.git
cd SurenaFanavar
اجرای پروژه با استفاده از Live Server یا هر سرور وب دیگر:

bash
# با استفاده از VS Code Live Server
# روی index.html کلیک راست کرده و Open with Live Server را انتخاب کنید

# یا با استفاده از Python
python -m http.server 8000

# یا با استفاده از Node.js (http-server)
npx http-server
باز کردن مرورگر و رفتن به آدرس:

text
http://localhost:8000
استفاده
صفحات اصلی
صفحه اصلی (/): نمایش هدر، محصولات، خدمات، اخبار، سوالات متداول و تماس

محصولات (/products): لیست محصولات با قابلیت جستجو، فیلتر و صفحه‌بندی

خدمات (/services): لیست خدمات با قابلیت درخواست خدمت

اخبار (/news): لیست اخبار با قابلیت جستجو و مشاهده جزییات

سوالات متداول (/faq): لیست سوالات با قابلیت جستجو و باز/بسته شدن

گالری (/gallery): نمایش تصاویر محصولات و تیم

داشبورد (/dashboard): نمایش آمار، نمودارها و فعالیت‌های اخیر (نیاز به ورود)

پروفایل (/profile): مدیریت اطلاعات کاربری و تغییر رمز (نیاز به ورود)

سبد خرید (/cart): مدیریت محصولات انتخاب شده

سفارشات (/orders): مشاهده لیست سفارشات (نیاز به ورود)

ورود (/login): ورود با رمز عبور یا کد یکبار مصرف

ثبت نام (/register): ثبت نام کاربر جدید با تایید OTP

تغییر زبان
برای تغییر زبان، روی دکمه‌های فا یا EN در نوار ناوبری کلیک کنید. تمام محتوای صفحه به‌طور خودکار ترجمه می‌شود.

سیستم احراز هویت
ثبت نام
به صفحه ثبت نام بروید

اطلاعات مورد نیاز (نام کاربری، موبایل، ایمیل، رمز عبور) را وارد کنید

روی دکمه "مرحله بعد" کلیک کنید

کد OTP ارسال شده به موبایل را وارد کنید

ثبت نام تکمیل می‌شود

ورود
به صفحه ورود بروید

روش ورود (رمز عبور یا کد یکبار مصرف) را انتخاب کنید

اطلاعات مورد نیاز را وارد کنید

روی دکمه "ورود" کلیک کنید

سبد خرید
برای افزودن محصول به سبد خرید، روی دکمه "افزودن به سبد" در کارت محصول کلیک کنید

برای مشاهده سبد خرید، روی آیکون سبد خرید در نوار ناوبری کلیک کنید

در صفحه سبد خرید می‌توانید تعداد را تغییر دهید، محصول را حذف کنید، کد تخفیف اعمال کنید و سفارش را ثبت کنید

مستندات توسعه
معماری کلی
پروژه از معماری Model-View-Controller پیروی می‌کند:

Model: داده‌ها از فایل‌های JSON و API

View: رندر توسط کامپوننت‌ها و صفحات

Controller: مدیریت توسط کلاس‌های موجود در js/ و pages/

مدیریت وضعیت (State)
وضعیت برنامه به‌صورت مرکزی در state.js مدیریت می‌شود:

javascript
import { State } from './js/state.js';

// دریافت مقدار
const user = State.get('currentUser');

// تنظیم مقدار
State.set('language', 'en');

// اشتراک در تغییرات
State.subscribe('language', (newLang, oldLang) => {
    console.log(`زبان از ${oldLang} به ${newLang} تغییر کرد`);
});

// اشتراک در تمام تغییرات
State.subscribeAll((key, newValue, oldValue) => {
    console.log(`${key} تغییر کرد: ${oldValue} -> ${newValue}`);
});
مسیریابی (Router)
مسیریابی توسط router.js مدیریت می‌شود:

javascript
import { router } from './js/router.js';

// رفتن به صفحه مشخص
router.navigate('products');

// دریافت مسیر فعلی
const route = router.getCurrentRoute();
سیستم ترجمه (Translator)
سیستم ترجمه توسط translator.js مدیریت می‌شود:

html
<!-- استفاده در HTML -->
<h1 data-i18n="pageTitle">عنوان صفحه</h1>
<input type="text" data-placeholder="enterName" />
<button data-tooltip="clickToSave">ذخیره</button>
javascript
import { translator } from './js/translator.js';

// ترجمه کل صفحه
translator.translatePage();

// ترجمه یک المان خاص
translator.translateElement(element);

// دریافت ترجمه یک کلید
const text = translator.translate('pageTitle');

// تغییر زبان
await translator.setLanguage('en');
کامپوننت‌ها
کامپوننت‌ها در پوشه components/ قرار دارند و هر کدام یک کلاس با متد render() دارند:

javascript
import { ProductCard } from './components/productCard.js';

const card = new ProductCard(product, {
    showPrice: true,
    showDescription: true,
    onAddToCart: (product) => {
        console.log('افزودن به سبد:', product);
    }
});

const element = card.render();
document.getElementById('container').appendChild(element);
API و ارتباط با Backend
ارتباط با سرور توسط api.js مدیریت می‌شود:

javascript
import { api } from './js/api.js';

// دریافت داده‌ها
const products = await api.get('/products');

// ارسال داده‌ها
const result = await api.post('/auth/login', {
    mobile: '09123456789',
    password: 'password123'
});

// آپلود فایل
const uploadResult = await api.uploadImage(file);
اعتبارسنجی
اعتبارسنجی توسط validators.js انجام می‌شود:

javascript
import { validators } from './js/validators.js';

// اعتبارسنجی ایمیل
if (validators.isEmail(email)) {
    // ایمیل معتبر است
}

// اعتبارسنجی موبایل
if (validators.isMobile(mobile)) {
    // موبایل معتبر است
}

// اعتبارسنجی چندین فیلد
const result = validators.validateAll({
    username: {
        value: 'admin',
        validators: [validators.isUsername]
    },
    email: {
        value: 'admin@example.com',
        validators: [validators.isEmail]
    }
});
امنیت
XSS Prevention: استفاده از sanitizeHTML و escapeHTML

CSRF Protection: از طریق توکن‌ها (قابل پیاده‌سازی)

Authentication: استفاده از JWT

Input Validation: اعتبارسنجی تمام ورودی‌های کاربر

Secure Storage: ذخیره‌سازی رمزنگاری شده (قابل پیاده‌سازی)

عملکرد و بهینه‌سازی
Lazy Loading: تصاویر با loading="lazy"

Debounce: برای جستجو و رویدادهای پرتکرار

Throttle: برای رویدادهای اسکرول و resize

Caching: کش درخواست‌های API

DocumentFragment: برای رندر لیست‌های بزرگ

Memory Leak Prevention: حذف event listenerها در destroy()

مرورگرهای پشتیبانی شده
Chrome 90+

Firefox 88+

Safari 14+

Edge 90+

Opera 76+

توسعه‌دهندگان
برای افزودن قابلیت جدید:

کامپوننت یا صفحه جدید را در پوشه مناسب ایجاد کنید

از State برای مدیریت وضعیت استفاده کنید

از translator برای ترجمه استفاده کنید

از api برای ارتباط با سرور استفاده کنید

از Modal برای نمایش مودال‌ها استفاده کنید

مستندات را به‌روز کنید

مجوز
این پروژه تحت مجوز MIT منتشر شده است.

تماس
وب‌سایت: www.sorenashop.ir

ایمیل: sornafanavarsina@gmail.com

تلفن: 09132299368

توسعه داده شده توسط تیم سورنا فناور سینا © 2026

text