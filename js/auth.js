/*=========================================================
نام فایل: auth.js

وظیفه: مدیریت احراز هویت شامل ورود، ثبت نام، تایید OTP،
خروج، تغییر رمز عبور، بازیابی رمز عبور و مدیریت پروفایل کاربر

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from './state.js';
import { Storage } from './storage.js';
import { api } from './api.js';
import { utils } from './utils.js';
import { validators } from './validators.js';
import { translator } from './translator.js';
import { Modal } from './modal.js';

/*---------------------------------------------------------
کلاس AuthManager

وظیفه: مدیریت تمام عملیات‌های احراز هویت

---------------------------------------------------------*/
class AuthManager {
    constructor() {
        this._initialized = false;
        this._user = null;
        this._token = null;
        this._refreshToken = null;
        this._otpCode = null;
        this._otpMobile = null;
        this._otpAction = null;
        this._otpTimer = null;
        this._otpExpireTime = 120; // ثانیه
        this._otpRemaining = 0;
        this._listeners = [];
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و بارگذاری وضعیت کاربر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    init() {
        if (this._initialized) return;

        // بارگذاری از LocalStorage
        this._loadFromStorage();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ AuthManager مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _loadFromStorage

    وظیفه: بارگذاری وضعیت کاربر از LocalStorage

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _loadFromStorage() {
        const user = Storage.get('user', null);
        const token = Storage.get('access_token', null);
        const refreshToken = Storage.get('refresh_token', null);

        if (user && token) {
            this._user = user;
            this._token = token;
            this._refreshToken = refreshToken;
            State.set('currentUser', user, true);
        }
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای مربوط به احراز هویت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // رویدادهای فرم‌ها توسط صفحات مدیریت می‌شوند
        // اما برخی رویدادهای عمومی در اینجا مدیریت می‌شوند
    }

    /*---------------------------------------------------------
    متد _subscribeToState

    وظیفه: اشتراک در تغییرات وضعیت

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _subscribeToState() {
        State.subscribe('currentUser', (user) => {
            this._user = user;
            if (!user) {
                this._token = null;
                this._refreshToken = null;
            }
        });
    }

    /*---------------------------------------------------------
    متد getCurrentUser

    وظیفه: دریافت اطلاعات کاربر فعلی

    ورودی‌ها: none

    خروجی: object|null

    ---------------------------------------------------------*/
    getCurrentUser() {
        return this._user ? { ...this._user } : null;
    }

    /*---------------------------------------------------------
    متد isAuthenticated

    وظیفه: بررسی احراز هویت کاربر

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    isAuthenticated() {
        return !!(this._user && this._token);
    }

    /*---------------------------------------------------------
    متد getToken

    وظیفه: دریافت توکن دسترسی

    ورودی‌ها: none

    خروجی: string|null

    ---------------------------------------------------------*/
    getToken() {
        return this._token;
    }

    /*---------------------------------------------------------
    متد register

    وظیفه: ثبت نام کاربر جدید

    ورودی‌ها: data (object) شامل username, mobile, email, password

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async register(data) {
        // اعتبارسنجی
        if (!data.username || !data.mobile || !data.email || !data.password) {
            throw new Error(translator.translate('fillRequiredFields') || 'لطفاً تمام فیلدهای ضروری را پر کنید.');
        }

        if (!validators.isUsername(data.username)) {
            throw new Error(translator.translate('invalidUsername') || 'نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد.');
        }

        if (!validators.isMobile(data.mobile)) {
            throw new Error(translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.');
        }

        if (!validators.isEmail(data.email)) {
            throw new Error(translator.translate('invalidEmail') || 'ایمیل وارد شده معتبر نیست.');
        }

        if (!validators.isPassword(data.password)) {
            throw new Error(translator.translate('invalidPassword') || 'رمز عبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.');
        }

        if (data.password !== data.confirmPassword) {
            throw new Error(translator.translate('passwordsDoNotMatch') || 'رمز عبور و تکرار آن یکسان نیست.');
        }

        // ارسال درخواست ثبت نام
        try {
            const response = await api.post('/auth/register', {
                username: data.username,
                mobile: data.mobile,
                email: data.email,
                password: data.password,
            });

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('registrationFailed') || 'ثبت نام با شکست مواجه شد.');
            }

            // ارسال کد OTP برای تایید
            await this.sendOTP(data.mobile, 'register');

            // ذخیره موقت داده‌های ثبت نام برای تایید بعدی
            this._tempRegistrationData = {
                ...data,
                userId: response.data?.id || response.data?.userId,
            };

            return {
                success: true,
                message: translator.translate('registrationOTPSent') || 'کد تایید به شماره موبایل شما ارسال شد.',
                data: response.data,
            };

        } catch (error) {
            console.error('❌ خطا در ثبت نام:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد verifyOTP

    وظیفه: تایید کد OTP

    ورودی‌ها: mobile (string), otp (string), action (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async verifyOTP(mobile, otp, action = 'register') {
        if (!mobile || !otp) {
            throw new Error(translator.translate('fillRequiredFields') || 'لطفاً تمام فیلدها را پر کنید.');
        }

        if (!/^\d{6}$/.test(otp)) {
            throw new Error(translator.translate('invalidOTP') || 'کد تایید باید ۶ رقم باشد.');
        }

        // بررسی کد OTP (در نسخه واقعی به سرور ارسال می‌شود)
        // در نسخه Mock، کد ارسال شده را بررسی می‌کنیم
        if (this._otpCode && this._otpMobile === mobile && this._otpAction === action) {
            if (this._otpCode !== otp) {
                throw new Error(translator.translate('invalidOTPCode') || 'کد تایید نامعتبر است.');
            }

            // بررسی انقضای OTP
            if (this._otpRemaining <= 0) {
                throw new Error(translator.translate('otpExpired') || 'کد تایید منقضی شده است. دوباره تلاش کنید.');
            }
        } else {
            // اگر کد در حافظه نبود، به سرور ارسال می‌شود
            try {
                const response = await api.post('/auth/verify-otp', { mobile, otp, action });
                if (!response?.success) {
                    throw new Error(response?.message || translator.translate('invalidOTPCode') || 'کد تایید نامعتبر است.');
                }
                // ادامه عملیات با پاسخ سرور
                return this._handleVerificationSuccess(response.data, action);
            } catch (error) {
                throw error;
            }
        }

        // تایید موفق
        return this._handleVerificationSuccess(null, action);
    }

    /*---------------------------------------------------------
    متد _handleVerificationSuccess

    وظیفه: پردازش پس از تایید موفق OTP

    ورودی‌ها: data (object), action (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async _handleVerificationSuccess(data, action) {
        // پاک کردن OTP از حافظه
        this._clearOTP();

        if (action === 'register') {
            // تکمیل ثبت نام
            if (this._tempRegistrationData) {
                // در نسخه واقعی، ثبت نام قبلاً انجام شده و فقط نیاز به تایید دارد
                // کاربر را وارد می‌کنیم
                const loginData = {
                    mobile: this._tempRegistrationData.mobile,
                    password: this._tempRegistrationData.password,
                };
                return this.login(loginData);
            }
            return {
                success: true,
                message: translator.translate('registrationComplete') || 'ثبت نام با موفقیت انجام شد.',
            };
        } else if (action === 'login') {
            // ورود با OTP
            return this.loginWithOTP(this._otpMobile);
        } else if (action === 'reset_password') {
            // بازنشانی رمز عبور
            return {
                success: true,
                message: translator.translate('passwordResetComplete') || 'رمز عبور با موفقیت بازنشانی شد.',
                data: { verified: true },
            };
        }

        return {
            success: true,
            message: translator.translate('verificationComplete') || 'تایید با موفقیت انجام شد.',
        };
    }

    /*---------------------------------------------------------
    متد login

    وظیفه: ورود کاربر با نام کاربری/موبایل و رمز عبور

    ورودی‌ها: data (object) شامل mobile/username, password

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async login(data) {
        if (!data.mobile || !data.password) {
            throw new Error(translator.translate('fillRequiredFields') || 'لطفاً تمام فیلدها را پر کنید.');
        }

        // اعتبارسنجی موبایل
        if (!validators.isMobile(data.mobile)) {
            throw new Error(translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.');
        }

        try {
            const response = await api.post('/auth/login', {
                mobile: data.mobile,
                password: data.password,
            });

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('loginFailed') || 'ورود با شکست مواجه شد.');
            }

            // ذخیره اطلاعات کاربر
            const userData = response.data?.user || response.data;
            const token = response.data?.token || response.data?.accessToken;
            const refreshToken = response.data?.refreshToken;

            if (userData && token) {
                this._setUserData(userData, token, refreshToken);
                return {
                    success: true,
                    message: translator.translate('loginSuccess') || 'ورود با موفقیت انجام شد.',
                    data: { user: userData },
                };
            } else {
                throw new Error(translator.translate('invalidResponse') || 'پاسخ سرور نامعتبر است.');
            }

        } catch (error) {
            console.error('❌ خطا در ورود:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد loginWithOTP

    وظیفه: ورود با کد یکبار مصرف

    ورودی‌ها: mobile (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async loginWithOTP(mobile) {
        if (!mobile) {
            throw new Error(translator.translate('enterMobile') || 'شماره موبایل را وارد کنید.');
        }

        if (!validators.isMobile(mobile)) {
            throw new Error(translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.');
        }

        try {
            // ارسال درخواست ورود با OTP
            const response = await api.post('/auth/login-otp', { mobile });

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('loginOTPFailed') || 'ورود با کد یکبار مصرف با شکست مواجه شد.');
            }

            const userData = response.data?.user || response.data;
            const token = response.data?.token || response.data?.accessToken;
            const refreshToken = response.data?.refreshToken;

            if (userData && token) {
                this._setUserData(userData, token, refreshToken);
                return {
                    success: true,
                    message: translator.translate('loginSuccess') || 'ورود با موفقیت انجام شد.',
                    data: { user: userData },
                };
            } else {
                throw new Error(translator.translate('invalidResponse') || 'پاسخ سرور نامعتبر است.');
            }

        } catch (error) {
            console.error('❌ خطا در ورود با OTP:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد sendOTP

    وظیفه: ارسال کد OTP به شماره موبایل

    ورودی‌ها: mobile (string), action (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async sendOTP(mobile, action = 'login') {
        if (!mobile) {
            throw new Error(translator.translate('enterMobile') || 'شماره موبایل را وارد کنید.');
        }

        if (!validators.isMobile(mobile)) {
            throw new Error(translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.');
        }

        try {
            // در نسخه واقعی به سرور ارسال می‌شود
            // در نسخه Mock، کد شبیه‌سازی می‌شود
            const response = await api.post('/auth/send-otp', { mobile, action });

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('sendOTPFailed') || 'ارسال کد تایید با شکست مواجه شد.');
            }

            // ذخیره کد OTP در حافظه (برای Mock)
            this._otpCode = response.data?.otp || utils.generateShortId(6);
            this._otpMobile = mobile;
            this._otpAction = action;
            this._otpRemaining = this._otpExpireTime;

            // شروع تایمر انقضا
            this._startOTPTimer();

            return {
                success: true,
                message: translator.translate('otpSent') || 'کد تایید به شماره موبایل شما ارسال شد.',
                data: { otp: this._otpCode, expiresIn: this._otpExpireTime },
            };

        } catch (error) {
            console.error('❌ خطا در ارسال OTP:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد _startOTPTimer

    وظیفه: شروع تایمر انقضای OTP

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _startOTPTimer() {
        this._clearOTPTimer();

        this._otpTimer = setInterval(() => {
            this._otpRemaining--;
            if (this._otpRemaining <= 0) {
                this._clearOTPTimer();
                this._clearOTP();
            }
        }, 1000);
    }

    /*---------------------------------------------------------
    متد _clearOTPTimer

    وظیفه: پاکسازی تایمر OTP

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _clearOTPTimer() {
        if (this._otpTimer) {
            clearInterval(this._otpTimer);
            this._otpTimer = null;
        }
    }

    /*---------------------------------------------------------
    متد _clearOTP

    وظیفه: پاکسازی داده‌های OTP

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _clearOTP() {
        this._otpCode = null;
        this._otpMobile = null;
        this._otpAction = null;
        this._otpRemaining = 0;
        this._clearOTPTimer();
    }

    /*---------------------------------------------------------
    متد _setUserData

    وظیفه: ذخیره اطلاعات کاربر و توکن‌ها

    ورودی‌ها: user (object), token (string), refreshToken (string)

    خروجی: void

    ---------------------------------------------------------*/
    _setUserData(user, token, refreshToken = null) {
        this._user = user;
        this._token = token;
        this._refreshToken = refreshToken;

        // ذخیره در LocalStorage
        Storage.set('user', user);
        Storage.set('access_token', token);
        if (refreshToken) {
            Storage.set('refresh_token', refreshToken);
        }

        // به‌روزرسانی State
        State.set('currentUser', user);
        State.set('isAuthenticated', true);

        // تنظیم توکن در API
        api.setToken(token);
        if (refreshToken) {
            api.setRefreshToken(refreshToken);
        }

        // انتشار رویداد
        document.dispatchEvent(new CustomEvent('authChanged', {
            detail: { user, isAuthenticated: true }
        }));

        // اجرای لیسنرها
        this._listeners.forEach(listener => {
            try {
                listener(user, true);
            } catch (error) {
                console.error('❌ خطا در اجرای لیسنر:', error);
            }
        });
    }

    /*---------------------------------------------------------
    متد logout

    وظیفه: خروج از حساب کاربری

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async logout() {
        try {
            // اطلاع به سرور (در صورت امکان)
            await api.post('/auth/logout').catch(() => {});
        } catch (error) {
            // نادیده گرفته شود
        }

        // پاکسازی داده‌های کاربر
        this._user = null;
        this._token = null;
        this._refreshToken = null;
        this._clearOTP();

        // حذف از LocalStorage
        Storage.remove('user');
        Storage.remove('access_token');
        Storage.remove('refresh_token');

        // پاکسازی API
        api.clearTokens();

        // به‌روزرسانی State
        State.set('currentUser', null);
        State.set('isAuthenticated', false);

        // انتشار رویداد
        document.dispatchEvent(new CustomEvent('authChanged', {
            detail: { user: null, isAuthenticated: false }
        }));

        // اجرای لیسنرها
        this._listeners.forEach(listener => {
            try {
                listener(null, false);
            } catch (error) {
                console.error('❌ خطا در اجرای لیسنر:', error);
            }
        });

        console.log('✅ کاربر خارج شد.');
    }

    /*---------------------------------------------------------
    متد changePassword

    وظیفه: تغییر رمز عبور

    ورودی‌ها: currentPassword (string), newPassword (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated()) {
            throw new Error(translator.translate('notAuthenticated') || 'لطفاً ابتدا وارد حساب خود شوید.');
        }

        if (!currentPassword || !newPassword) {
            throw new Error(translator.translate('fillRequiredFields') || 'لطفاً تمام فیلدها را پر کنید.');
        }

        if (!validators.isPassword(newPassword)) {
            throw new Error(translator.translate('invalidPassword') || 'رمز عبور جدید باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.');
        }

        try {
            const response = await api.post('/auth/change-password', {
                currentPassword,
                newPassword,
            });

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('passwordChangeFailed') || 'تغییر رمز عبور با شکست مواجه شد.');
            }

            return {
                success: true,
                message: translator.translate('passwordChanged') || 'رمز عبور با موفقیت تغییر کرد.',
            };

        } catch (error) {
            console.error('❌ خطا در تغییر رمز عبور:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد forgotPassword

    وظیفه: ارسال لینک بازنشانی رمز عبور

    ورودی‌ها: mobile (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async forgotPassword(mobile) {
        if (!mobile) {
            throw new Error(translator.translate('enterMobile') || 'شماره موبایل را وارد کنید.');
        }

        if (!validators.isMobile(mobile)) {
            throw new Error(translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.');
        }

        try {
            const response = await api.post('/auth/forgot-password', { mobile });

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('forgotPasswordFailed') || 'ارسال لینک بازنشانی با شکست مواجه شد.');
            }

            // ارسال OTP برای تایید
            await this.sendOTP(mobile, 'reset_password');

            return {
                success: true,
                message: translator.translate('resetLinkSent') || 'لینک بازنشانی رمز عبور به ایمیل/موبایل شما ارسال شد.',
                data: response.data,
            };

        } catch (error) {
            console.error('❌ خطا در فراموشی رمز عبور:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد resetPassword

    وظیفه: بازنشانی رمز عبور با کد تایید

    ورودی‌ها: mobile (string), otp (string), newPassword (string)

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async resetPassword(mobile, otp, newPassword) {
        if (!mobile || !otp || !newPassword) {
            throw new Error(translator.translate('fillRequiredFields') || 'لطفاً تمام فیلدها را پر کنید.');
        }

        if (!validators.isPassword(newPassword)) {
            throw new Error(translator.translate('invalidPassword') || 'رمز عبور جدید باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.');
        }

        // تایید OTP
        await this.verifyOTP(mobile, otp, 'reset_password');

        try {
            const response = await api.post('/auth/reset-password', {
                mobile,
                otp,
                newPassword,
            });

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('resetPasswordFailed') || 'بازنشانی رمز عبور با شکست مواجه شد.');
            }

            return {
                success: true,
                message: translator.translate('passwordResetComplete') || 'رمز عبور با موفقیت بازنشانی شد.',
            };

        } catch (error) {
            console.error('❌ خطا در بازنشانی رمز عبور:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد updateProfile

    وظیفه: به‌روزرسانی اطلاعات پروفایل

    ورودی‌ها: data (object) شامل username, email, ... 

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async updateProfile(data) {
        if (!this.isAuthenticated()) {
            throw new Error(translator.translate('notAuthenticated') || 'لطفاً ابتدا وارد حساب خود شوید.');
        }

        try {
            const response = await api.put('/auth/profile', data);

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('profileUpdateFailed') || 'به‌روزرسانی پروفایل با شکست مواجه شد.');
            }

            const updatedUser = response.data?.user || response.data;
            if (updatedUser) {
                this._user = { ...this._user, ...updatedUser };
                Storage.set('user', this._user);
                State.set('currentUser', this._user);
            }

            return {
                success: true,
                message: translator.translate('profileUpdated') || 'پروفایل با موفقیت به‌روزرسانی شد.',
                data: { user: this._user },
            };

        } catch (error) {
            console.error('❌ خطا در به‌روزرسانی پروفایل:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد getProfile

    وظیفه: دریافت اطلاعات پروفایل از سرور

    ورودی‌ها: none

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async getProfile() {
        if (!this.isAuthenticated()) {
            throw new Error(translator.translate('notAuthenticated') || 'لطفاً ابتدا وارد حساب خود شوید.');
        }

        try {
            const response = await api.get('/auth/profile');

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('profileLoadFailed') || 'بارگذاری پروفایل با شکست مواجه شد.');
            }

            const userData = response.data?.user || response.data;
            if (userData) {
                this._user = userData;
                Storage.set('user', this._user);
                State.set('currentUser', this._user);
            }

            return {
                success: true,
                data: { user: this._user },
            };

        } catch (error) {
            console.error('❌ خطا در بارگذاری پروفایل:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد refreshToken

    وظیفه: تمدید توکن دسترسی

    ورودی‌ها: none

    خروجی: Promise<string>

    ---------------------------------------------------------*/
    async refreshToken() {
        if (!this._refreshToken) {
            throw new Error(translator.translate('noRefreshToken') || 'توکن بازنشانی وجود ندارد.');
        }

        try {
            const response = await api.post('/auth/refresh', {
                refreshToken: this._refreshToken,
            });

            if (!response?.success) {
                throw new Error(response?.message || translator.translate('refreshTokenFailed') || 'تمدید توکن با شکست مواجه شد.');
            }

            const newToken = response.data?.token || response.data?.accessToken;
            const newRefreshToken = response.data?.refreshToken;

            if (newToken) {
                this._token = newToken;
                Storage.set('access_token', newToken);
                api.setToken(newToken);

                if (newRefreshToken) {
                    this._refreshToken = newRefreshToken;
                    Storage.set('refresh_token', newRefreshToken);
                    api.setRefreshToken(newRefreshToken);
                }

                return newToken;
            } else {
                throw new Error(translator.translate('invalidResponse') || 'پاسخ سرور نامعتبر است.');
            }

        } catch (error) {
            console.error('❌ خطا در تمدید توکن:', error);
            // در صورت شکست، کاربر را خارج می‌کنیم
            await this.logout();
            throw error;
        }
    }

    /*---------------------------------------------------------
    متد addListener

    وظیفه: افزودن شنونده برای تغییرات وضعیت احراز هویت

    ورودی‌ها: callback (function)

    خروجی: function (لغو اشتراک)

    ---------------------------------------------------------*/
    addListener(callback) {
        if (typeof callback !== 'function') {
            throw new Error('callback باید یک تابع باشد.');
        }
        this._listeners.push(callback);

        // بازگشت تابع لغو اشتراک
        return () => {
            const index = this._listeners.indexOf(callback);
            if (index !== -1) {
                this._listeners.splice(index, 1);
            }
        };
    }

    /*---------------------------------------------------------
    متد getOTPStatus

    وظیفه: دریافت وضعیت OTP

    ورودی‌ها: none

    خروجی: object

    ---------------------------------------------------------*/
    getOTPStatus() {
        return {
            isActive: !!this._otpCode && this._otpRemaining > 0,
            remaining: this._otpRemaining,
            mobile: this._otpMobile,
            action: this._otpAction,
        };
    }

    /*---------------------------------------------------------
    متد resendOTP

    وظیفه: ارسال مجدد کد OTP

    ورودی‌ها: none

    خروجی: Promise<object>

    ---------------------------------------------------------*/
    async resendOTP() {
        if (!this._otpMobile) {
            throw new Error(translator.translate('noOTPRequest') || 'هیچ درخواست OTP فعالی وجود ندارد.');
        }

        return this.sendOTP(this._otpMobile, this._otpAction || 'login');
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        this._clearOTP();
        this._listeners = [];
        this._initialized = false;
        console.log('🧹 AuthManager پاکسازی شد.');
    }
}

// ===== ایجاد نمونه واحد =====
const Auth = new AuthManager();

// ===== صادرات =====
export { AuthManager, Auth };
export default Auth;