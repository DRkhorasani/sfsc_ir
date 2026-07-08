# DeepSeek API Integration Guide

## نشانی‌ها (Overview)

این فایل راهنمای استفاده از سرویس DeepSeek AI در پروژه است.

## مراحل راه‌اندازی (Setup Steps)

### ۱. دریافت API Key

1. به سایت [DeepSeek API](https://platform.deepseek.com) بروید
2. ثبت‌نام کنید یا وارد شوید
3. برای دریافت کلید API درخواست ارسال کنید
4. کلید API خود را کپی کنید

### ۲. تنظیم کلید API

#### روش ۱: استفاده از Environment Variables

```javascript
// در فایل app.js یا initialization code
import { deepseek } from './js/deepseek.js';

// دریافت کلید از environment variables یا local storage
const apiKey = process.env.DEEPSEEK_API_KEY || 
               localStorage.getItem('deepseek_api_key');

// تنظیم کلید
deepseek.setApiKey(apiKey);
```

#### روش ۲: تنظیم مستقیم در Config

```javascript
// در فایل js/config.js
EXTERNAL_APIS: {
    DEEPSEEK: {
        ENABLED: true,
        API_KEY: 'your_api_key_here', // توجه: این روش برای development فقط است
        // ...
    }
}
```

#### روش ۳: استفاده از Form یا Dashboard

```javascript
// در صفحه تنظیمات یا admin panel
document.getElementById('deepseek-api-key-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const apiKey = document.getElementById('api-key-input').value;
    deepseek.setApiKey(apiKey);
    
    // ذخیره در local storage (برای استفاده دوباره)
    localStorage.setItem('deepseek_api_key', apiKey);
});
```

## استفاده (Usage)

### مثال ۱: ارسال پیام ساده

```javascript
import { deepseek } from './js/deepseek.js';

// تنظیم کلید API
deepseek.setApiKey('your_api_key_here');

// ارسال پیام
const response = await deepseek.sendMessage('سلام، آیا می‌تونی کمکم کنی؟');
console.log('پاسخ:', response);
```

### مثال ۲: استفاده از تنظیمات سفارشی

```javascript
const response = await deepseek.sendMessage(
    'یک شاعری درباره شب بنویس',
    {
        temperature: 0.9,  // خلاقیت بیشتر
        maxTokens: 500,
        systemMessage: 'تو یک شاعر فارسی حرفه‌ای هستی'
    }
);
console.log(response);
```

### مثال ۳: گفتگوی چندپیام‌ی

```javascript
const messages = [
    { role: 'user', content: 'سلام' },
    { role: 'assistant', content: 'سلام! من برای کمک اینجا هستم' },
    { role: 'user', content: 'نام تو چیه؟' }
];

const response = await deepseek.chat(messages);
console.log('پاسخ:', response);
```

### مثال ۴: بررسی اتصال

```javascript
// قبل از استفاده، اتصال را بررسی کنید
const isConnected = await deepseek.testConnection();
if (isConnected) {
    console.log('✅ اتصال موفق');
} else {
    console.error('❌ مشکل در اتصال');
}
```

### مثال ۵: وضعیت سرویس

```javascript
// دریافت وضعیت فعلی
const status = deepseek.getStatus();
console.log('وضعیت:', status);
/*
خروجی:
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

## متدهای موجود (Available Methods)

### `setApiKey(apiKey: string): boolean`
تنظیم کلید API برای DeepSeek

```javascript
deepseek.setApiKey('sk-xxx...');
```

### `getApiKey(): string | null`
دریافت کلید API

```javascript
const key = deepseek.getApiKey();
```

### `isApiKeySet(): boolean`
بررسی اینکه آیا کلید تنظیم شده است

```javascript
if (deepseek.isApiKeySet()) {
    // استفاده از DeepSeek
}
```

### `setEnabled(enabled: boolean): void`
فعال یا غیرفعال کردن سرویس

```javascript
deepseek.setEnabled(true);
```

### `isAvailable(): boolean`
بررسی آنکه سرویس کامل آماده است

```javascript
if (deepseek.isAvailable()) {
    // استفاده از سرویس
}
```

### `sendMessage(message: string, options?: object): Promise<string>`
ارسال پیام و دریافت پاسخ

```javascript
const response = await deepseek.sendMessage('سؤال شما');
```

### `chat(messages: array, options?: object): Promise<string>`
ایجاد گفتگو با چند پیام

```javascript
const response = await deepseek.chat([
    { role: 'user', content: 'سلام' }
]);
```

### `testConnection(): Promise<boolean>`
بررسی اتصال

```javascript
const isConnected = await deepseek.testConnection();
```

### `updateConfig(config: object): void`
بروزرسانی تنظیمات

```javascript
deepseek.updateConfig({
    apiKey: 'new_key',
    temperature: 0.8,
    maxTokens: 3000
});
```

### `getStatus(): object`
دریافت وضعیت سرویس

```javascript
const status = deepseek.getStatus();
```

## بهترین روش‌ها (Best Practices)

### ۱. ایمنی کلید API
- ❌ کلید API را در کد front-end نمی‌نویسیم
- ✅ از environment variables استفاده می‌کنیم
- ✅ کلید را در backend نگهداری می‌کنیم
- ✅ از rate limiting استفاده می‌کنیم

### ۲. مدیریت خطاها

```javascript
try {
    const response = await deepseek.sendMessage('پیام');
    console.log(response);
} catch (error) {
    console.error('خطا:', error.message);
    // نمایش پیام خطا به کاربر
    showErrorNotification('خطا در برقرار کردن ارتباط');
}
```

### ۳. Loading State

```javascript
try {
    showLoadingSpinner(true);
    const response = await deepseek.sendMessage('پیام');
    // استفاده از پاسخ
} finally {
    showLoadingSpinner(false);
}
```

### ۴. Timeout Processing

```javascript
// تنظیم timeout مناسب
deepseek.updateConfig({
    timeout: 90000 // ۹۰ ثانیه برای پاسخ‌های طولانی
});
```

## تنظیمات پیشرفته (Advanced Configuration)

```javascript
deepseek.updateConfig({
    model: 'deepseek-chat',        // مدل مورد استفاده
    maxTokens: 2000,                // حداکثر توکن در پاسخ
    temperature: 0.7,               // خلاقیت (0-2)
    topP: 0.9,                      // Diversity (0-1)
    timeout: 60000,                 // زمان انتظار (میلی‌ثانیه)
    retryCount: 3,                  // تعداد تلاش دوباره
    retryDelay: 1000                // تأخیر بین تلاش‌ها
});
```

## مثال کامل (Complete Example)

```javascript
import { deepseek } from './js/deepseek.js';

class ChatBot {
    constructor() {
        this.messages = [];
        this.apiKey = localStorage.getItem('deepseek_api_key');
        
        if (this.apiKey) {
            deepseek.setApiKey(this.apiKey);
        }
    }

    async initialize() {
        if (!deepseek.isApiKeySet()) {
            console.error('❌ کلید API تنظیم نشده است');
            return false;
        }

        const isConnected = await deepseek.testConnection();
        if (!isConnected) {
            console.error('❌ اتصال ناموفق');
            return false;
        }

        console.log('✅ چت‌بات آماده است');
        return true;
    }

    async sendMessage(userMessage) {
        try {
            this.messages.push({
                role: 'user',
                content: userMessage
            });

            const response = await deepseek.chat(this.messages);
            
            this.messages.push({
                role: 'assistant',
                content: response
            });

            return response;
        } catch (error) {
            console.error('❌ خطا:', error);
            throw error;
        }
    }

    clearHistory() {
        this.messages = [];
    }
}

// استفاده
const chatBot = new ChatBot();
await chatBot.initialize();
const response = await chatBot.sendMessage('سلام');
console.log(response);
```

## استفاده در HTML

```html
<!DOCTYPE html>
<html>
<head>
    <title>DeepSeek Chat</title>
</head>
<body>
    <div id="chat-container">
        <div id="messages" class="messages"></div>
        <input id="user-input" type="text" placeholder="پیام خود را بنویسید...">
        <button id="send-btn">ارسال</button>
    </div>

    <script type="module">
        import { deepseek } from './js/deepseek.js';

        // تنظیم کلید API
        const apiKey = prompt('کلید API DeepSeek را وارد کنید:');
        deepseek.setApiKey(apiKey);

        document.getElementById('send-btn').addEventListener('click', async () => {
            const input = document.getElementById('user-input');
            const message = input.value.trim();

            if (!message) return;

            // نمایش پیام کاربر
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML += `<p><strong>شما:</strong> ${message}</p>`;
            input.value = '';

            try {
                // ارسال به DeepSeek
                const response = await deepseek.sendMessage(message);
                messagesDiv.innerHTML += `<p><strong>DeepSeek:</strong> ${response}</p>`;
            } catch (error) {
                messagesDiv.innerHTML += `<p style="color:red;">خطا: ${error.message}</p>`;
            }
        });
    </script>
</body>
</html>
```

## Troubleshooting

### مشکل: "کلید API معتبر نیست"
```javascript
// بررسی فرمت کلید
if (!apiKey || apiKey.length < 10) {
    console.error('کلید API کوتاه است');
}
```

### مشکل: Timeout
```javascript
// timeout را بیشتر کنید
deepseek.updateConfig({ timeout: 120000 });
```

### مشکل: Rate Limiting
```javascript
// استفاده از retry delay
deepseek.updateConfig({ 
    retryDelay: 5000,  // ۵ ثانیه
    retryCount: 5      // ۵ تلاش
});
```

## منابع مفید (Resources)

- [DeepSeek API Documentation](https://platform.deepseek.com/docs)
- [DeepSeek Pricing](https://platform.deepseek.com/pricing)
- [API Status](https://status.deepseek.com)

## پشتیبانی (Support)

برای مشکلات یا پرسش‌ها:
- Issues: [GitHub Issues](https://github.com/yourusername/yourproject/issues)
- Email: support@example.com
