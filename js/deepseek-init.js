/*=========================================================
نام فایل: deepseek-init.js

وظیفه: راه‌اندازی و مقداردهی اولیه سرویس DeepSeek

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { deepseek } from './deepseek.js';
import { Config } from './config.js';

/*---------------------------------------------------------
کلاس DeepSeekInitializer

وظیفه: مدیریت راه‌اندازی اولیه DeepSeek
شامل بارگیری تنظیمات، بررسی اتصال و نمایش رابط کاربری

---------------------------------------------------------*/
class DeepSeekInitializer {
    constructor() {
        this.apiKeySourced = false;
        this.initialized = false;
    }

    /*---------------------------------------------------------
    متد loadApiKeyFromEnvironment

    وظیفه: بارگیری کلید API از environment

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    loadApiKeyFromEnvironment() {
        // بارگیری از Config اگر تنظیم شده باشد
        if (Config.EXTERNAL_APIS.DEEPSEEK.API_KEY) {
            deepseek.setApiKey(Config.EXTERNAL_APIS.DEEPSEEK.API_KEY);
            deepseek.setEnabled(Config.EXTERNAL_APIS.DEEPSEEK.ENABLED);
            this.apiKeySourced = true;
            console.log('✅ کلید API از Config بارگیری شد');
            return true;
        }

        // بارگیری از localStorage
        const savedApiKey = localStorage.getItem('deepseek_api_key');
        if (savedApiKey) {
            deepseek.setApiKey(savedApiKey);
            this.apiKeySourced = true;
            console.log('✅ کلید API از localStorage بارگیری شد');
            return true;
        }

        console.warn('⚠️ کلید API یافت نشد');
        return false;
    }

    /*---------------------------------------------------------
    متد setApiKeyManually

    وظیفه: دریافت کلید API از کاربر

    ورودی‌ها: none

    خروجی: Promise<boolean>

    ---------------------------------------------------------*/
    async setApiKeyManually() {
        return new Promise((resolve) => {
            const apiKey = prompt(
                '🔑 لطفاً کلید API DeepSeek خود را وارد کنید:\n\n' +
                '(برای دریافت کلید به https://platform.deepseek.com بروید)'
            );

            if (apiKey && apiKey.trim()) {
                const success = deepseek.setApiKey(apiKey.trim());
                if (success) {
                    localStorage.setItem('deepseek_api_key', apiKey.trim());
                    this.apiKeySourced = true;
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    }

    /*---------------------------------------------------------
    متد verifyConnection

    وظیفه: بررسی اتصال به سرویس

    ورودی‌ها: showMessages (boolean)

    خروجی: Promise<boolean>

    ---------------------------------------------------------*/
    async verifyConnection(showMessages = true) {
        if (!deepseek.isApiKeySet()) {
            if (showMessages) {
                console.error('❌ کلید API تنظیم نشده است');
            }
            return false;
        }

        if (showMessages) {
            console.log('🔄 در حال بررسی اتصال...');
        }

        const isConnected = await deepseek.testConnection();

        if (isConnected) {
            deepseek.setEnabled(true);
            if (showMessages) {
                console.log('✅ اتصال به DeepSeek برقرار شد');
            }
            return true;
        } else {
            deepseek.setEnabled(false);
            if (showMessages) {
                console.error('❌ اتصال به DeepSeek ناموفق');
            }
            return false;
        }
    }

    /*---------------------------------------------------------
    متد initialize

    وظیفه: راه‌اندازی کامل سرویس

    ورودی‌ها: options (object)

    خروجی: Promise<boolean>

    ---------------------------------------------------------*/
    async initialize(options = {}) {
        const {
            loadFromEnv = true,
            promptIfMissing = false,
            verifyConnection = true,
            showMessages = true,
        } = options;

        if (showMessages) {
            console.log('🚀 در حال راه‌اندازی DeepSeek...');
        }

        // ۱. بارگیری تلقائی
        if (loadFromEnv) {
            this.loadApiKeyFromEnvironment();
        }

        // ۲. درخواست کلید اگر موجود نباشد
        if (!this.apiKeySourced && promptIfMissing) {
            await this.setApiKeyManually();
        }

        // ۳. بررسی اتصال
        if (verifyConnection) {
            await this.verifyConnection(showMessages);
        }

        this.initialized = true;

        if (showMessages) {
            const status = deepseek.getStatus();
            console.log('📊 وضعیت DeepSeek:', status);
        }

        return deepseek.isAvailable();
    }

    /*---------------------------------------------------------
    متد getStatus

    وظیفه: دریافت وضعیت راه‌اندازی

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    getStatus() {
        return {
            initialized: this.initialized,
            apiKeySourced: this.apiKeySourced,
            deepseekStatus: deepseek.getStatus(),
        };
    }

    /*---------------------------------------------------------
    متد createUIPanel

    وظیفه: ایجاد پانل UI برای مدیریت DeepSeek

    ورودی‌ها: containerId (string)

    خروجی: HTMLElement

    ---------------------------------------------------------*/
    createUIPanel(containerId = 'deepseek-panel') {
        const container = document.getElementById(containerId) ||
                         document.createElement('div');

        if (!document.getElementById(containerId)) {
            container.id = containerId;
            container.style.cssText = `
                padding: 20px;
                background: #f5f5f5;
                border-radius: 8px;
                margin: 20px 0;
                font-family: 'Vazirmatn', sans-serif;
                direction: rtl;
            `;
            document.body.appendChild(container);
        }

        const status = deepseek.getStatus();
        const statusHTML = `
            <div style="background: white; padding: 15px; border-radius: 6px; border-right: 4px solid #2563eb;">
                <h3 style="margin: 0 0 15px 0; color: #333;">⚙️ تنظیمات DeepSeek</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #666;">
                        <strong>کلید API:</strong>
                    </label>
                    <div style="padding: 8px; background: #f9f9f9; border-radius: 4px; font-family: monospace;">
                        ${status.apiKeySet ? '✅ تنظیم شده' : '❌ تنظیم نشده'}
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #666;">
                        <strong>وضعیت:</strong>
                    </label>
                    <div style="padding: 8px; background: #f9f9f9; border-radius: 4px;">
                        ${status.available ? '🟢 فعال' : '🔴 غیرفعال'}
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #666;">
                        <strong>مدل:</strong>
                    </label>
                    <div style="padding: 8px; background: #f9f9f9; border-radius: 4px; font-family: monospace;">
                        ${status.model}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                    <button id="deepseek-set-api" style="
                        padding: 10px;
                        background: #2563eb;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-family: 'Vazirmatn', sans-serif;
                    ">🔑 تنظیم کلید API</button>

                    <button id="deepseek-test-connection" style="
                        padding: 10px;
                        background: #0ea5e9;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-family: 'Vazirmatn', sans-serif;
                    ">🔄 بررسی اتصال</button>
                </div>
            </div>
        `;

        container.innerHTML = statusHTML;

        // Event listeners
        const setApiBtn = container.querySelector('#deepseek-set-api');
        const testBtn = container.querySelector('#deepseek-test-connection');

        if (setApiBtn) {
            setApiBtn.addEventListener('click', async () => {
                const apiKey = prompt('کلید API DeepSeek را وارد کنید:');
                if (apiKey) {
                    deepseek.setApiKey(apiKey);
                    localStorage.setItem('deepseek_api_key', apiKey);
                    this.createUIPanel(containerId);
                    console.log('✅ کلید API تنظیم شد');
                }
            });
        }

        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                testBtn.disabled = true;
                testBtn.textContent = '⏳ در حال بررسی...';
                const result = await deepseek.testConnection();
                testBtn.disabled = false;
                testBtn.textContent = '🔄 بررسی اتصال';
                alert(result ? '✅ اتصال موفق' : '❌ اتصال ناموفق');
            });
        }

        return container;
    }

    /*---------------------------------------------------------
    متد clearApiKey

    وظیفه: حذف کلید API ذخیره‌شده

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    clearApiKey() {
        localStorage.removeItem('deepseek_api_key');
        deepseek.setApiKey('');
        deepseek.setEnabled(false);
        this.apiKeySourced = false;
        console.log('✅ کلید API حذف شد');
    }
}

// ایجاد و صادر کردن instance
export const deepseekInit = new DeepSeekInitializer();
export default deepseekInit;
