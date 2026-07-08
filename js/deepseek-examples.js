/*=========================================================
نام فایل: deepseek-examples.js

وظیفه: مثال‌های عملی برای استفاده از DeepSeek

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { deepseekInit } from './deepseek-init.js';
import { deepseek } from './deepseek.js';

/*---------------------------------------------------------
مثال ۱: استفاده ساده
---------------------------------------------------------*/
export async function example1_SimpleMessage() {
    console.log('\n📝 مثال ۱: پیام ساده\n');

    try {
        // راه‌اندازی
        await deepseekInit.initialize({ promptIfMissing: true });

        // ارسال پیام
        const response = await deepseek.sendMessage('سلام! من کی هستم؟');
        console.log('پاسخ:', response);
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
مثال ۲: استفاده با تنظیمات سفارشی
---------------------------------------------------------*/
export async function example2_CustomSettings() {
    console.log('\n🎨 مثال ۲: تنظیمات سفارشی\n');

    try {
        await deepseekInit.initialize({ promptIfMissing: true });

        // ارسال پیام با تنظیمات خاص
        const response = await deepseek.sendMessage(
            'یک شاعری کوتاه درباره فصل بهار بنویس',
            {
                temperature: 0.9,        // خلاقیت بالا
                maxTokens: 200,
                systemMessage: 'تو یک شاعر فارسی حرفه‌ای هستی'
            }
        );

        console.log('شاعری:', response);
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
مثال ۳: گفتگوی چند‌پیام‌ی
---------------------------------------------------------*/
export async function example3_MultiTurnChat() {
    console.log('\n💬 مثال ۳: گفتگو چند‌پیام‌ی\n');

    try {
        await deepseekInit.initialize({ promptIfMissing: true });

        // ارسال یک سری پیام‌ها
        const messages = [
            { role: 'user', content: 'سلام! نام من احمد است' },
            { role: 'assistant', content: 'سلام احمد! خوشبختم که شناختی. من چطور می‌تونم کمکت کنم؟' },
            { role: 'user', content: 'تعریف کن که هوش مصنوعی چیه؟' }
        ];

        const response = await deepseek.chat(messages);
        console.log('پاسخ:', response);
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
مثال ۴: بررسی وضعیت
---------------------------------------------------------*/
export async function example4_CheckStatus() {
    console.log('\n📊 مثال ۴: بررسی وضعیت\n');

    try {
        // بررسی بدون راه‌اندازی
        const status = deepseek.getStatus();
        console.log('وضعیت کنونی:', status);

        // بررسی اتصال
        if (!deepseek.isApiKeySet()) {
            console.log('⚠️ کلید API تنظیم نشده');
            await deepseekInit.setApiKeyManually();
        }

        // تست اتصال
        console.log('🔄 در حال بررسی اتصال...');
        const isConnected = await deepseek.testConnection();

        if (isConnected) {
            console.log('✅ اتصال موفق');
        } else {
            console.log('❌ اتصال ناموفق');
        }
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
مثال ۵: مترجم
---------------------------------------------------------*/
export async function example5_Translator() {
    console.log('\n🌐 مثال ۵: مترجم\n');

    try {
        await deepseekInit.initialize({ promptIfMissing: true });

        const englishText = 'Hello, how are you?';

        const response = await deepseek.sendMessage(
            `لطفاً این جملهٔ انگلیسی را به فارسی ترجمه کن:\n\n"${englishText}"`,
            {
                temperature: 0.3,  // کمتر خلاق
                maxTokens: 100
            }
        );

        console.log('ترجمه:', response);
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
مثال ۶: کد تولید
---------------------------------------------------------*/
export async function example6_CodeGeneration() {
    console.log('\n💻 مثال ۶: تولید کد\n');

    try {
        await deepseekInit.initialize({ promptIfMissing: true });

        const response = await deepseek.sendMessage(
            'یک تابع JavaScript بنویس که یک آرایه را مرتب کند',
            {
                temperature: 0.5,
                maxTokens: 300,
                systemMessage: 'تو یک برنامه‌نویس JavaScript حرفه‌ای هستی'
            }
        );

        console.log('کد:', response);
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
مثال ۷: خلاصه‌سازی متن
---------------------------------------------------------*/
export async function example7_TextSummarization() {
    console.log('\n📄 مثال ۷: خلاصه‌سازی متن\n');

    try {
        await deepseekInit.initialize({ promptIfMissing: true });

        const longText = `
            هوش مصنوعی یک شاخه از علم کامپیوتر است که به ایجاد ماشین‌های هوشمند می‌پردازد.
            این ماشین‌ها می‌توانند کارهایی را انجام دهند که معمولاً نیاز به هوش انسانی دارند.
            هوش مصنوعی در بسیاری از زمینه‌ها مثل پزشکی، آموزش و حمل‌ونقل استفاده می‌شود.
        `;

        const response = await deepseek.sendMessage(
            `لطفاً این متن را به شکل خلاصه ارائه دهید:\n\n${longText}`,
            {
                temperature: 0.3,
                maxTokens: 150
            }
        );

        console.log('خلاصه:', response);
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
مثال ۸: تحلیل احساسات
---------------------------------------------------------*/
export async function example8_SentimentAnalysis() {
    console.log('\n😊 مثال ۸: تحلیل احساسات\n');

    try {
        await deepseekInit.initialize({ promptIfMissing: true });

        const texts = [
            'این محصول بسیار عالی است! راضی هستم.',
            'خیلی بد است و کیفیت پایینی دارد.',
            'متوسط است، نه خیلی خوب نه خیلی بد.'
        ];

        for (const text of texts) {
            const response = await deepseek.sendMessage(
                `احساسات این متن را تحلیل کن و بگو مثبت، منفی یا بی‌طرف است:\n\n"${text}"`
            );
            console.log(`متن: "${text}"\nتحلیل: ${response}\n`);
        }
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
مثال ۹: کلاس ChatBot
---------------------------------------------------------*/
export class ChatBot {
    constructor(systemMessage = '') {
        this.messages = [];
        this.systemMessage = systemMessage;
    }

    async initialize() {
        const result = await deepseekInit.initialize({
            promptIfMissing: true,
            verifyConnection: true
        });

        if (!result) {
            throw new Error('❌ خطا در راه‌اندازی');
        }

        if (this.systemMessage) {
            this.messages.push({
                role: 'system',
                content: this.systemMessage
            });
        }
    }

    async send(userMessage) {
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
    }

    getHistory() {
        return this.messages.filter(m => m.role !== 'system');
    }

    clearHistory() {
        this.messages = this.systemMessage
            ? [{ role: 'system', content: this.systemMessage }]
            : [];
    }
}

/*---------------------------------------------------------
مثال ۱۰: استفاده از ChatBot
---------------------------------------------------------*/
export async function example10_ChatBotUsage() {
    console.log('\n🤖 مثال ۱۰: ChatBot\n');

    try {
        // ایجاد یک چت‌بات برای پشتیبانی مشتری
        const supportBot = new ChatBot(
            'تو یک کارمند پشتیبانی مشتری برای فروشگاه آنلاین هستی'
        );

        // راه‌اندازی
        await supportBot.initialize();

        // گفتگو
        console.log('🤖 سلام! من چطور می‌تونم کمکت کنم؟');

        const reply1 = await supportBot.send('سلام! می‌خواستم درباره شحن‌رانی بپرسم');
        console.log('سشتری:', reply1);

        const reply2 = await supportBot.send('حداکثر مدت چند روزه؟');
        console.log('سشتری:', reply2);

        // تاریخچه
        console.log('\n📜 تاریخچه گفتگو:', supportBot.getHistory());
    } catch (error) {
        console.error('❌ خطا:', error.message);
    }
}

/*---------------------------------------------------------
راه‌اندازی تمام مثال‌ها
---------------------------------------------------------*/
export async function runAllExamples() {
    console.log('🚀 شروع اجرای مثال‌ها...\n');
    console.log('═'.repeat(50));

    const examples = [
        { name: 'مثال ۱', func: example1_SimpleMessage },
        { name: 'مثال ۲', func: example2_CustomSettings },
        { name: 'مثال ۳', func: example3_MultiTurnChat },
        { name: 'مثال ۴', func: example4_CheckStatus },
        { name: 'مثال ۵', func: example5_Translator },
        { name: 'مثال ۶', func: example6_CodeGeneration },
        { name: 'مثال ۷', func: example7_TextSummarization },
        { name: 'مثال ۸', func: example8_SentimentAnalysis },
        { name: 'مثال ۱۰', func: example10_ChatBotUsage },
    ];

    for (const example of examples) {
        try {
            await example.func();
        } catch (error) {
            console.error(`❌ خطا در ${example.name}:`, error);
        }
        console.log('═'.repeat(50));
    }

    console.log('✅ تمام مثال‌ها اجرا شدند');
}

// ============= Export تمام مثال‌ها =============
export default {
    example1_SimpleMessage,
    example2_CustomSettings,
    example3_MultiTurnChat,
    example4_CheckStatus,
    example5_Translator,
    example6_CodeGeneration,
    example7_TextSummarization,
    example8_SentimentAnalysis,
    example10_ChatBotUsage,
    ChatBot,
    runAllExamples,
};
