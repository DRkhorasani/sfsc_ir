/*=========================================================
نام فایل: deepseek.js

وظیفه: مدیریت تمام ارتباطات با سرویس DeepSeek AI
شامل ارسال درخواست‌ها، مدیریت خطاها و پاسخ‌ها

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { Config } from './config.js';
import { utils } from './utils.js';

/*---------------------------------------------------------
کلاس DeepSeekClient

وظیفه: ارائه متدهای ارتباط با API DeepSeek
شامل تنظیم کلید API، ارسال پیام‌های متنی و مدیریت خطاها

---------------------------------------------------------*/
class DeepSeekClient {
    constructor() {
        this.apiKey = Config.EXTERNAL_APIS.DEEPSEEK.API_KEY;
        this.apiUrl = Config.EXTERNAL_APIS.DEEPSEEK.API_URL;
        this.model = Config.EXTERNAL_APIS.DEEPSEEK.MODEL;
        this.timeout = Config.EXTERNAL_APIS.DEEPSEEK.TIMEOUT;
        this.maxTokens = Config.EXTERNAL_APIS.DEEPSEEK.MAX_TOKENS;
        this.temperature = Config.EXTERNAL_APIS.DEEPSEEK.TEMPERATURE;
        this.topP = Config.EXTERNAL_APIS.DEEPSEEK.TOP_P;
        this.retryCount = Config.EXTERNAL_APIS.DEEPSEEK.RETRY_COUNT;
        this.retryDelay = Config.EXTERNAL_APIS.DEEPSEEK.RETRY_DELAY;
        this.isEnabled = Config.EXTERNAL_APIS.DEEPSEEK.ENABLED;
    }

    /*---------------------------------------------------------
    متد setApiKey

    وظیفه: تنظیم کلید API برای DeepSeek

    ورودی‌ها: apiKey (string)

    خروجی: boolean

    ---------------------------------------------------------*/
    setApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            console.error('❌ کلید API معتبر نیست');
            return false;
        }
        this.apiKey = apiKey.trim();
        console.log('✅ کلید API DeepSeek با موفقیت تنظیم شد');
        return true;
    }

    /*---------------------------------------------------------
    متد getApiKey

    وظیفه: دریافت کلید API

    ورودی‌ها: none

    خروجی: string | null

    ---------------------------------------------------------*/
    getApiKey() {
        return this.apiKey || null;
    }

    /*---------------------------------------------------------
    متد isApiKeySet

    وظیفه: بررسی اینکه آیا کلید API تنظیم شده است یا خیر

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    isApiKeySet() {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    /*---------------------------------------------------------
    متد setEnabled

    وظیفه: فعال یا غیرفعال کردن سرویس DeepSeek

    ورودی‌ها: enabled (boolean)

    خروجی: none

    ---------------------------------------------------------*/
    setEnabled(enabled) {
        this.isEnabled = !!enabled;
    }

    /*---------------------------------------------------------
    متد isAvailable

    وظیفه: بررسی دسترسی کامل (فعال + کلید API موجود)

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    isAvailable() {
        return this.isEnabled && this.isApiKeySet();
    }

    /*---------------------------------------------------------
    متد _makeRequest

    وظیفه: ارسال درخواست به API با مدیریت retry و error

    ورودی‌ها: endpoint (string), method (string), body (object), retry (number)

    خروجی: Promise<any>

    ---------------------------------------------------------*/
    async _makeRequest(endpoint, method = 'POST', body = null, retry = 0) {
        if (!this.isAvailable()) {
            throw new Error('❌ DeepSeek API غیرفعال است یا کلید API تنظیم نشده است');
        }

        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };

        const options = {
            method,
            headers,
            timeout: this.timeout,
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `❌ خطای DeepSeek API: ${response.status} - ${errorData.message || response.statusText}`
                );
            }

            return await response.json();
        } catch (error) {
            if (retry < this.retryCount) {
                console.warn(`⚠️ تلاش مجدد... (${retry + 1}/${this.retryCount})`);
                await utils.delay(this.retryDelay);
                return this._makeRequest(endpoint, method, body, retry + 1);
            }
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد sendMessage

    وظیفه: ارسال پیام متنی به DeepSeek و دریافت پاسخ

    ورودی‌ها: message (string), options (object)

    خروجی: Promise<string>

    ---------------------------------------------------------*/
    async sendMessage(message, options = {}) {
        const {
            model = this.model,
            maxTokens = this.maxTokens,
            temperature = this.temperature,
            topP = this.topP,
            systemMessage = '',
        } = options;

        if (!message || typeof message !== 'string') {
            throw new Error('❌ پیام معتبر نیست');
        }

        const messages = [];

        if (systemMessage) {
            messages.push({
                role: 'system',
                content: systemMessage,
            });
        }

        messages.push({
            role: 'user',
            content: message.trim(),
        });

        try {
            const response = await this._makeRequest('/chat/completions', 'POST', {
                model,
                messages,
                max_tokens: maxTokens,
                temperature,
                top_p: topP,
            });

            if (response.choices && response.choices.length > 0) {
                return response.choices[0].message.content;
            }

            throw new Error('❌ پاسخ معتبری از DeepSeek دریافت نشد');
        } catch (error) {
            console.error('❌ خطا در ارسال پیام به DeepSeek:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد chat

    وظیفه: ایجاد گفتگوی چند‌پیام‌ی با DeepSeek

    ورودی‌ها: messages (array), options (object)

    خروجی: Promise<string>

    ---------------------------------------------------------*/
    async chat(messages, options = {}) {
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('❌ آرایه پیام‌ها معتبر نیست');
        }

        const {
            model = this.model,
            maxTokens = this.maxTokens,
            temperature = this.temperature,
            topP = this.topP,
        } = options;

        // تصحیح فرمت پیام‌ها
        const formattedMessages = messages.map(msg => ({
            role: msg.role || 'user',
            content: msg.content || msg.text || msg.message || String(msg),
        }));

        try {
            const response = await this._makeRequest('/chat/completions', 'POST', {
                model,
                messages: formattedMessages,
                max_tokens: maxTokens,
                temperature,
                top_p: topP,
            });

            if (response.choices && response.choices.length > 0) {
                return response.choices[0].message.content;
            }

            throw new Error('❌ پاسخ معتبری از DeepSeek دریافت نشد');
        } catch (error) {
            console.error('❌ خطا در گفتگو با DeepSeek:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد testConnection

    وظیفه: بررسی اتصال به API DeepSeek

    ورودی‌ها: none

    خروجی: Promise<boolean>

    ---------------------------------------------------------*/
    async testConnection() {
        if (!this.isAvailable()) {
            console.error('❌ DeepSeek API غیرفعال است یا کلید API تنظیم نشده است');
            return false;
        }

        try {
            await this.sendMessage('سلام', {
                maxTokens: 10,
            });
            console.log('✅ اتصال به DeepSeek موفق بود');
            return true;
        } catch (error) {
            console.error('❌ خطا در اتصال به DeepSeek:', error);
            return false;
        }
    }

    /*---------------------------------------------------------
    متد updateConfig

    وظیفه: بروزرسانی تنظیمات

    ورودی‌ها: config (object)

    خروجی: none

    ---------------------------------------------------------*/
    updateConfig(config = {}) {
        if (config.apiKey !== undefined) {
            this.setApiKey(config.apiKey);
        }
        if (config.model !== undefined) {
            this.model = config.model;
        }
        if (config.maxTokens !== undefined) {
            this.maxTokens = config.maxTokens;
        }
        if (config.temperature !== undefined) {
            this.temperature = config.temperature;
        }
        if (config.topP !== undefined) {
            this.topP = config.topP;
        }
        if (config.timeout !== undefined) {
            this.timeout = config.timeout;
        }
    }

    /*---------------------------------------------------------
    متد getStatus

    وظیفه: دریافت وضعیت فعلی سرویس

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    getStatus() {
        return {
            enabled: this.isEnabled,
            apiKeySet: this.isApiKeySet(),
            available: this.isAvailable(),
            model: this.model,
            apiUrl: this.apiUrl,
            timeout: this.timeout,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
        };
    }
}

// ایجاد و صادر کردن نمونه‌ای از کلاس
export const deepseek = new DeepSeekClient();
export default deepseek;
