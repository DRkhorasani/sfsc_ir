# DeepSeek Integration - Quick Start

## ✅ فایل‌های اضافه‌شده

### 1. **Configuration** (`js/config.js`)
- اضافه کردن بخش `EXTERNAL_APIS` با تنظیمات DeepSeek
- شامل: API URL، model، timeout، و تنظیمات دیگر

### 2. **DeepSeek Client** (`js/deepseek.js`)
- کلاس `DeepSeekClient` برای مدیریت API
- متدهای: `setApiKey()`, `sendMessage()`, `chat()`, `testConnection()`
- مدیریت Retry، Timeout، و Error handling

### 3. **DeepSeek Initializer** (`js/deepseek-init.js`)
- کلاس `DeepSeekInitializer` برای راه‌اندازی
- خواندن کلید از environment
- نمایش UI Panel
- بررسی اتصال

### 4. **Environment File** (`.env.example`)
- نمونه‌ای از متغیرهای محیط
- راهنمایی برای تنظیم کلید API

### 5. **Comprehensive Guide** (`DEEPSEEK_GUIDE.md`)
- راهنمای کامل درباره راه‌اندازی و استفاده
- مثال‌های متعدد
- Best Practices

---

## 🚀 شروع سریع (Quick Start)

### گام ۱: تنظیم کلید API

#### روش A: استفاده از Prompt
```javascript
// در app.js یا initialization code
import { deepseekInit } from './js/deepseek-init.js';

// راه‌اندازی با درخواست کلید
await deepseekInit.initialize({
    promptIfMissing: true,
    verifyConnection: true
});
```

#### روش B: تنظیم مستقیم
```javascript
import { deepseek } from './js/deepseek.js';

deepseek.setApiKey('sk-b1bc4dddc141421eb859600721c8ab07');
```

#### روش C: استفاده از localStorage
```javascript
// صفحه تنظیمات
localStorage.setItem('deepseek_api_key', 'sk-b1bc4dddc141421eb859600721c8ab07');

// بعد از بارگیری صفحه
import { deepseekInit } from './js/deepseek-init.js';
deepseekInit.loadApiKeyFromEnvironment();
```

---

### گام ۲: ارسال پیام

```javascript
import { deepseek } from './js/deepseek.js';

// ارسال پیام ساده
const response = await deepseek.sendMessage('سلام!');
console.log(response);
```

---

### گام ۳: بررسی اتصال

```javascript
import { deepseek } from './js/deepseek.js';

// قبل از استفاده
const isConnected = await deepseek.testConnection();
if (isConnected) {
    // استفاده از سرویس
} else {
    // نمایش خطا
}
```

---

## 📋 استفاده در HTML

```html
<!DOCTYPE html>
<html dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>DeepSeek Chat</title>
</head>
<body>
    <!-- Panel تنظیمات (اختیاری) -->
    <div id="deepseek-panel"></div>

    <!-- Chat Interface -->
    <div id="chat">
        <div id="messages"></div>
        <input id="user-input" type="text" placeholder="پیام...">
        <button id="send">ارسال</button>
    </div>

    <script type="module">
        import { deepseekInit } from './js/deepseek-init.js';
        import { deepseek } from './js/deepseek.js';

        // راه‌اندازی
        await deepseekInit.initialize({
            promptIfMissing: true,
            verifyConnection: true
        });

        // نمایش Panel (اختیاری)
        deepseekInit.createUIPanel('deepseek-panel');

        // Chat Handler
        document.getElementById('send').addEventListener('click', async () => {
            const input = document.getElementById('user-input');
            const msg = input.value.trim();
            if (!msg) return;

            try {
                document.getElementById('messages').innerHTML += 
                    `<p><b>شما:</b> ${msg}</p>`;
                
                const response = await deepseek.sendMessage(msg);
                document.getElementById('messages').innerHTML += 
                    `<p><b>DeepSeek:</b> ${response}</p>`;
                
                input.value = '';
            } catch (error) {
                alert('خطا: ' + error.message);
            }
        });
    </script>
</body>
</html>
```

---

## 🔧 تنظیمات پیشرفته

```javascript
import { deepseek } from './js/deepseek.js';

deepseek.updateConfig({
    model: 'deepseek-chat',      // مدل
    maxTokens: 2000,              // حد توکن
    temperature: 0.7,             // خلاقیت (0-2)
    topP: 0.9,                    // Diversity (0-1)
    timeout: 60000                // Timeout (ms)
});
```

---

## 📊 بررسی وضعیت

```javascript
import { deepseek } from './js/deepseek.js';

// وضعیت DeepSeek
const status = deepseek.getStatus();
console.log(status);

/*
{
    enabled: true,
    apiKeySet: true,
    available: true,
    model: 'deepseek-chat',
    apiUrl: 'https://api.deepseek.com/v1',
    timeout: 60000,
    maxTokens: 2000,
    temperature: 0.7
}
*/
```

---

## 🛡️ مدیریت خطاها

```javascript
import { deepseek } from './js/deepseek.js';

try {
    const response = await deepseek.sendMessage('پیام');
    console.log(response);
} catch (error) {
    console.error('خطا:', error.message);
    
    // Error Types:
    // - "کلید API معتبر نیست"
    // - "DeepSeek API غیرفعال است"
    // - "خطای DeepSeek API: 401"
    // - "Timeout"
}
```

---

## 💾 ذخیره کلید API

### محلی (Local Storage)
```javascript
// ذخیره
localStorage.setItem('deepseek_api_key', 'sk-...');

// بارگیری
const apiKey = localStorage.getItem('deepseek_api_key');
deepseek.setApiKey(apiKey);
```

### در Backend
```javascript
// نرم‌افزار توصیه‌شده
// کلید API را در backend نگهداری کنید
// و فقط یک proxy endpoint استفاده کنید

// Frontend
const response = await fetch('/api/deepseek/message', {
    method: 'POST',
    body: JSON.stringify({ message: 'سلام' })
});
```

---

## 🔗 منابع مهم

| نام | لینک |
|-----|------|
| API Docs | https://platform.deepseek.com/docs |
| Get API Key | https://platform.deepseek.com |
| Pricing | https://platform.deepseek.com/pricing |
| Status | https://status.deepseek.com |

---

## 📞 پشتیبانی

### اگر مشکلی دارید:

1. **خطا "کلید API معتبر نیست"**
   - بررسی کنید که کلید کامل و صحیح باشد
   - کلید را دوباره کپی کنید

2. **Timeout Error**
   - timeout را بیشتر کنید
   - اتصال اینترنت را بررسی کنید

3. **Rate Limiting**
   - درخواست‌ها را کاهش دهید
   - صبر کنید و دوباره تلاش کنید

4. **Connection Error**
   - وضعیت DeepSeek را بررسی کنید
   - VPN استفاده کنید

---

## 📝 نکات اضافی

- ✅ کل سرویس توسط کلاس‌های OOP مدیریت می‌شود
- ✅ Error handling و Retry logic داخل‌سازی شده است
- ✅ تمام متن‌ها فارسی هستند
- ✅ قابل استفاده در هر صفحه
- ✅ Lightweight و بدون dependency خارجی

---

## 🎯 مثال کامل

```javascript
// ۱. راه‌اندازی
import { deepseekInit } from './js/deepseek-init.js';
await deepseekInit.initialize({ promptIfMissing: true });

// ۲. ارسال پیام
import { deepseek } from './js/deepseek.js';
const response = await deepseek.sendMessage('سلام!');

// ۳. نمایش نتیجه
console.log('پاسخ:', response);
```

---

**حالا شما آماده هستید تا DeepSeek را استفاده کنید! 🚀**
