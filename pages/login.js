/*=========================================================
نام فایل: login.js

وظیفه: صفحه ورود کاربر با پشتیبانی از ورود با رمز عبور و
ورود با کد یکبار مصرف (OTP)، مدیریت فرم‌ها، اعتبارسنجی،
ارسال درخواست و نمایش پیام‌های خطا/موفقیت

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Auth } from '../js/auth.js';
import { utils } from '../js/utils.js';
import { validators } from '../js/validators.js';
import { router } from '../js/router.js';
import { Modal } from '../js/modal.js';

/*---------------------------------------------------------
کلاس LoginPage

وظیفه: مدیریت و رندر صفحه ورود

---------------------------------------------------------*/
class LoginPage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه ورود

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#auth',
            redirectAfterLogin: '/dashboard',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._isLoading = false;
        this._loginMethod = 'password'; // 'password' | 'otp'
        this._otpSent = false;
        this._otpTimer = null;
        this._otpRemaining = 0;
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه ورود

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه ورود یافت نشد.');
            return;
        }

        // اگر کاربر قبلاً وارد شده است، به صفحه پیش‌فرض هدایت شود
        if (Auth.isAuthenticated()) {
            router.navigate(this.options.redirectAfterLogin);
            return;
        }

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ LoginPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _buildPageStructure() {
        // اگر ساختار از قبل وجود دارد، نیازی به ایجاد مجدد نیست
        if (this._element.querySelector('.login-page__wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'login-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'login-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="authSectionTitle">ورود به حساب کاربری</h2>
            <p class="section__subtitle" data-i18n="authSectionSubtitle">ورود به حساب کاربری و دسترسی به خدمات</p>
        `;
        wrapper.appendChild(header);

        // فرم ورود
        const form = document.createElement('div');
        form.className = 'login-page__form';
        form.innerHTML = `
            <div class="login-page__method-tabs">
                <button class="login-page__method-tab login-page__method-tab--active" data-method="password">
                    ${translator.translate('loginPasswordTab') || 'ورود با رمز عبور'}
                </button>
                <button class="login-page__method-tab" data-method="otp">
                    ${translator.translate('loginOTPTab') || 'ورود با کد یکبار مصرف'}
                </button>
            </div>

            <!-- ورود با رمز عبور -->
            <div id="loginPasswordForm" class="login-page__form-panel">
                <div class="login-page__field">
                    <label data-i18n="authLoginMobileLabel">شماره موبایل</label>
                    <input type="tel" id="loginMobilePassword" class="auth__input" 
                           placeholder="${translator.translate('enterMobile') || '0912xxxxxxx'}" 
                           data-placeholder="enterMobile" />
                </div>
                <div class="login-page__field">
                    <label data-i18n="authLoginPasswordLabel">رمز عبور</label>
                    <input type="password" id="loginPasswordInput" class="auth__input" 
                           placeholder="${translator.translate('enterPassword') || 'رمز عبور'}" 
                           data-placeholder="enterPassword" />
                </div>
                <div class="login-page__options">
                    <label class="login-page__remember">
                        <input type="checkbox" id="loginRemember" checked />
                        ${translator.translate('rememberMe') || 'مرا به خاطر بسپار'}
                    </label>
                    <a href="#" class="login-page__forgot" id="forgotPasswordLink">
                        ${translator.translate('forgotPassword') || 'رمز عبور را فراموش کرده‌اید؟'}
                    </a>
                </div>
                <button type="submit" id="loginPasswordBtn" class="btn btn--primary btn--block">
                    ${translator.translate('authLoginPrimary') || 'ورود'}
                </button>
            </div>

            <!-- ورود با کد یکبار مصرف -->
            <div id="loginOTPForm" class="login-page__form-panel hidden">
                <div class="login-page__field">
                    <label data-i18n="authLoginMobileLabel">شماره موبایل</label>
                    <input type="tel" id="loginMobileOTP" class="auth__input" 
                           placeholder="${translator.translate('enterMobile') || '0912xxxxxxx'}" 
                           data-placeholder="enterMobile" />
                </div>
                <div id="otpCodeWrapper" class="login-page__otp-wrapper hidden">
                    <div class="login-page__field">
                        <label data-i18n="authLoginOtpLabel">کد تایید</label>
                        <input type="text" id="loginOTPInput" class="auth__input" 
                               placeholder="${translator.translate('enterOTP') || '۶ رقمی'}" 
                               data-placeholder="enterOTP" maxlength="6" />
                    </div>
                    <div class="login-page__otp-timer" id="otpTimerDisplay">
                        ${translator.translate('otpExpiresIn') || 'زمان باقیمانده:'} <span id="otpTimerCount">0</span> ${translator.translate('seconds') || 'ثانیه'}
                    </div>
                    <button type="button" id="loginOTPVerifyBtn" class="btn btn--primary btn--block">
                        ${translator.translate('authLoginVerifyButton') || 'تایید کد و ورود'}
                    </button>
                    <button type="button" id="loginOTPResendBtn" class="btn btn--outline btn--block hidden">
                        ${translator.translate('resendOTP') || 'ارسال مجدد کد'}
                    </button>
                </div>
                <button type="button" id="loginOTPSendBtn" class="btn btn--primary btn--block">
                    ${translator.translate('sendOTP') || 'ارسال کد یکبار مصرف'}
                </button>
            </div>

            <div id="loginMessage" class="login-page__message"></div>

            <div class="login-page__footer">
                <p>
                    ${translator.translate('noAccount') || 'حساب کاربری ندارید؟'}
                    <a href="#" id="goToRegisterLink" class="login-page__link">
                        ${translator.translate('authRegisterPrimary') || 'ثبت نام'}
                    </a>
                </p>
            </div>
        `;

        wrapper.appendChild(form);
        this._element.appendChild(wrapper);

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(this._element);
            }, 50);
        }

        // تنظیم اولیه
        this._setLoginMethod('password');
    }

    /*---------------------------------------------------------
    متد _setLoginMethod

    وظیفه: تغییر روش ورود

    ورودی‌ها: method (string)

    خروجی: void

    ---------------------------------------------------------*/
    _setLoginMethod(method) {
        this._loginMethod = method;

        const passwordForm = document.getElementById('loginPasswordForm');
        const otpForm = document.getElementById('loginOTPForm');
        const tabs = document.querySelectorAll('.login-page__method-tab');

        tabs.forEach(tab => {
            tab.classList.toggle('login-page__method-tab--active', tab.dataset.method === method);
        });

        if (method === 'password') {
            passwordForm?.classList.remove('hidden');
            otpForm?.classList.add('hidden');
        } else {
            passwordForm?.classList.add('hidden');
            otpForm?.classList.remove('hidden');
        }

        // بازنشانی وضعیت OTP
        if (method === 'otp') {
            this._resetOTPState();
        }
    }

    /*---------------------------------------------------------
    متد _resetOTPState

    وظیفه: بازنشانی وضعیت OTP

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _resetOTPState() {
        this._otpSent = false;
        this._otpRemaining = 0;
        this._clearOTPTimer();

        const otpWrapper = document.getElementById('otpCodeWrapper');
        const sendBtn = document.getElementById('loginOTPSendBtn');
        const verifyBtn = document.getElementById('loginOTPVerifyBtn');
        const resendBtn = document.getElementById('loginOTPResendBtn');
        const timerDisplay = document.getElementById('otpTimerDisplay');
        const otpInput = document.getElementById('loginOTPInput');

        if (otpWrapper) otpWrapper.classList.add('hidden');
        if (sendBtn) sendBtn.classList.remove('hidden');
        if (verifyBtn) verifyBtn.classList.add('hidden');
        if (resendBtn) resendBtn.classList.add('hidden');
        if (timerDisplay) timerDisplay.classList.add('hidden');
        if (otpInput) otpInput.value = '';

        this._clearMessages();
    }

    /*---------------------------------------------------------
    متد _startOTPTimer

    وظیفه: شروع تایمر انقضای OTP

    ورودی‌ها: duration (number)

    خروجی: void

    ---------------------------------------------------------*/
    _startOTPTimer(duration = 120) {
        this._otpRemaining = duration;
        this._updateOTPTimer();

        this._clearOTPTimer();
        this._otpTimer = setInterval(() => {
            this._otpRemaining--;
            this._updateOTPTimer();

            if (this._otpRemaining <= 0) {
                this._clearOTPTimer();
                this._otpExpired();
            }
        }, 1000);
    }

    /*---------------------------------------------------------
    متد _updateOTPTimer

    وظیفه: به‌روزرسانی نمایش تایمر

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _updateOTPTimer() {
        const timerDisplay = document.getElementById('otpTimerDisplay');
        const timerCount = document.getElementById('otpTimerCount');
        if (timerDisplay && timerCount) {
            timerDisplay.classList.remove('hidden');
            timerCount.textContent = Math.max(0, this._otpRemaining);
        }
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
    متد _otpExpired

    وظیفه: مدیریت انقضای OTP

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _otpExpired() {
        const resendBtn = document.getElementById('loginOTPResendBtn');
        const verifyBtn = document.getElementById('loginOTPVerifyBtn');
        const timerDisplay = document.getElementById('otpTimerDisplay');

        if (resendBtn) resendBtn.classList.remove('hidden');
        if (verifyBtn) verifyBtn.classList.add('hidden');
        if (timerDisplay) timerDisplay.classList.add('hidden');

        this._showMessage(
            translator.translate('otpExpired') || 'کد تایید منقضی شد. دوباره درخواست کنید.',
            'warning'
        );
    }

    /*---------------------------------------------------------
    متد _showMessage

    وظیفه: نمایش پیام در صفحه

    ورودی‌ها: message (string), type (string)

    خروجی: void

    ---------------------------------------------------------*/
    _showMessage(message, type = 'error') {
        const msgEl = document.getElementById('loginMessage');
        if (!msgEl) return;

        msgEl.textContent = message;
        msgEl.className = `login-page__message login-page__message--${type}`;
        msgEl.style.display = 'block';
    }

    /*---------------------------------------------------------
    متد _clearMessages

    وظیفه: پاکسازی پیام‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _clearMessages() {
        const msgEl = document.getElementById('loginMessage');
        if (msgEl) {
            msgEl.textContent = '';
            msgEl.className = 'login-page__message';
            msgEl.style.display = 'none';
        }
    }

    /*---------------------------------------------------------
    متد _handlePasswordLogin

    وظیفه: مدیریت ورود با رمز عبور

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handlePasswordLogin() {
        if (this._isLoading) return;

        const mobileInput = document.getElementById('loginMobilePassword');
        const passwordInput = document.getElementById('loginPasswordInput');
        const rememberCheck = document.getElementById('loginRemember');

        const mobile = mobileInput?.value?.trim() || '';
        const password = passwordInput?.value || '';

        // اعتبارسنجی
        if (!mobile) {
            this._showMessage(
                translator.translate('enterMobile') || 'لطفاً شماره موبایل را وارد کنید.',
                'error'
            );
            mobileInput?.focus();
            return;
        }

        if (!validators.isMobile(mobile)) {
            this._showMessage(
                translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.',
                'error'
            );
            mobileInput?.focus();
            return;
        }

        if (!password) {
            this._showMessage(
                translator.translate('enterPassword') || 'لطفاً رمز عبور را وارد کنید.',
                'error'
            );
            passwordInput?.focus();
            return;
        }

        this._isLoading = true;
        this._showMessage(translator.translate('loggingIn') || 'در حال ورود...', 'info');

        try {
            const result = await Auth.login({
                mobile: mobile,
                password: password,
            });

            if (result.success) {
                this._showMessage(
                    result.message || translator.translate('loginSuccess') || 'ورود با موفقیت انجام شد.',
                    'success'
                );
                // هدایت به صفحه پیش‌فرض
                setTimeout(() => {
                    router.navigate(this.options.redirectAfterLogin);
                }, 500);
            } else {
                this._showMessage(
                    result.message || translator.translate('loginFailed') || 'ورود با شکست مواجه شد.',
                    'error'
                );
            }
        } catch (error) {
            this._showMessage(
                error.message || translator.translate('loginError') || 'خطا در ورود به حساب کاربری.',
                'error'
            );
        } finally {
            this._isLoading = false;
        }
    }

    /*---------------------------------------------------------
    متد _handleOTPSend

    وظیفه: مدیریت ارسال کد OTP

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handleOTPSend() {
        if (this._isLoading) return;

        const mobileInput = document.getElementById('loginMobileOTP');
        const mobile = mobileInput?.value?.trim() || '';

        if (!mobile) {
            this._showMessage(
                translator.translate('enterMobile') || 'لطفاً شماره موبایل را وارد کنید.',
                'error'
            );
            mobileInput?.focus();
            return;
        }

        if (!validators.isMobile(mobile)) {
            this._showMessage(
                translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.',
                'error'
            );
            mobileInput?.focus();
            return;
        }

        this._isLoading = true;
        this._clearMessages();

        try {
            const result = await Auth.sendOTP(mobile, 'login');

            if (result.success) {
                this._otpSent = true;
                this._showMessage(
                    result.message || translator.translate('otpSent') || 'کد تایید ارسال شد.',
                    'success'
                );

                // نمایش بخش ورود کد
                const otpWrapper = document.getElementById('otpCodeWrapper');
                const sendBtn = document.getElementById('loginOTPSendBtn');
                const verifyBtn = document.getElementById('loginOTPVerifyBtn');
                const resendBtn = document.getElementById('loginOTPResendBtn');

                if (otpWrapper) otpWrapper.classList.remove('hidden');
                if (sendBtn) sendBtn.classList.add('hidden');
                if (verifyBtn) verifyBtn.classList.remove('hidden');
                if (resendBtn) resendBtn.classList.add('hidden');

                // شروع تایمر
                const expiresIn = result.data?.expiresIn || 120;
                this._startOTPTimer(expiresIn);

                // فوکوس روی فیلد OTP
                const otpInput = document.getElementById('loginOTPInput');
                if (otpInput) otpInput.focus();
            } else {
                this._showMessage(
                    result.message || translator.translate('sendOTPFailed') || 'ارسال کد با شکست مواجه شد.',
                    'error'
                );
            }
        } catch (error) {
            this._showMessage(
                error.message || translator.translate('sendOTPError') || 'خطا در ارسال کد تایید.',
                'error'
            );
        } finally {
            this._isLoading = false;
        }
    }

    /*---------------------------------------------------------
    متد _handleOTPVerify

    وظیفه: مدیریت تایید کد OTP

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handleOTPVerify() {
        if (this._isLoading) return;

        const mobileInput = document.getElementById('loginMobileOTP');
        const otpInput = document.getElementById('loginOTPInput');

        const mobile = mobileInput?.value?.trim() || '';
        const otp = otpInput?.value?.trim() || '';

        if (!mobile) {
            this._showMessage(
                translator.translate('enterMobile') || 'لطفاً شماره موبایل را وارد کنید.',
                'error'
            );
            return;
        }

        if (!otp) {
            this._showMessage(
                translator.translate('enterOTP') || 'لطفاً کد تایید را وارد کنید.',
                'error'
            );
            otpInput?.focus();
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            this._showMessage(
                translator.translate('invalidOTP') || 'کد تایید باید ۶ رقم باشد.',
                'error'
            );
            otpInput?.focus();
            return;
        }

        this._isLoading = true;
        this._clearMessages();

        try {
            const result = await Auth.verifyOTP(mobile, otp, 'login');

            if (result.success) {
                this._showMessage(
                    result.message || translator.translate('loginSuccess') || 'ورود با موفقیت انجام شد.',
                    'success'
                );
                this._clearOTPTimer();

                // هدایت به صفحه پیش‌فرض
                setTimeout(() => {
                    router.navigate(this.options.redirectAfterLogin);
                }, 500);
            } else {
                this._showMessage(
                    result.message || translator.translate('invalidOTPCode') || 'کد تایید نامعتبر است.',
                    'error'
                );
            }
        } catch (error) {
            this._showMessage(
                error.message || translator.translate('verifyOTPError') || 'خطا در تایید کد.',
                'error'
            );
        } finally {
            this._isLoading = false;
        }
    }

    /*---------------------------------------------------------
    متد _handleOTPResend

    وظیفه: مدیریت ارسال مجدد کد OTP

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handleOTPResend() {
        if (this._isLoading) return;

        this._clearMessages();

        try {
            const result = await Auth.resendOTP();

            if (result.success) {
                this._showMessage(
                    result.message || translator.translate('otpResent') || 'کد تایید مجدداً ارسال شد.',
                    'success'
                );

                // بازنشانی وضعیت
                const verifyBtn = document.getElementById('loginOTPVerifyBtn');
                const resendBtn = document.getElementById('loginOTPResendBtn');
                const otpInput = document.getElementById('loginOTPInput');

                if (verifyBtn) verifyBtn.classList.remove('hidden');
                if (resendBtn) resendBtn.classList.add('hidden');
                if (otpInput) otpInput.value = '';

                // شروع مجدد تایمر
                const expiresIn = result.data?.expiresIn || 120;
                this._startOTPTimer(expiresIn);

                if (otpInput) otpInput.focus();
            } else {
                this._showMessage(
                    result.message || translator.translate('resendOTPFailed') || 'ارسال مجدد کد با شکست مواجه شد.',
                    'error'
                );
            }
        } catch (error) {
            this._showMessage(
                error.message || translator.translate('resendOTPError') || 'خطا در ارسال مجدد کد.',
                'error'
            );
        }
    }

    /*---------------------------------------------------------
    متد _handleForgotPassword

    وظیفه: مدیریت کلیک روی لینک فراموشی رمز عبور

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _handleForgotPassword() {
        // نمایش مودال بازیابی رمز عبور
        const content = `
            <div class="forgot-password-modal">
                <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">
                    ${translator.translate('forgotPasswordTitle') || 'بازیابی رمز عبور'}
                </h3>
                <p style="color:#64748b;margin-bottom:1.5rem;">
                    ${translator.translate('forgotPasswordDesc') || 'شماره موبایل خود را وارد کنید تا لینک بازیابی برای شما ارسال شود.'}
                </p>
                <div class="login-page__field">
                    <label data-i18n="authLoginMobileLabel">شماره موبایل</label>
                    <input type="tel" id="forgotMobileInput" class="auth__input" 
                           placeholder="${translator.translate('enterMobile') || '0912xxxxxxx'}" 
                           data-placeholder="enterMobile" />
                </div>
                <button type="button" id="forgotSubmitBtn" class="btn btn--primary btn--block">
                    ${translator.translate('sendResetLink') || 'ارسال لینک بازیابی'}
                </button>
                <div id="forgotMessage" class="login-page__message" style="margin-top:1rem;"></div>
            </div>
        `;

        const modalId = Modal.open(content, {
            maxWidth: '450px',
            className: 'forgot-password-modal',
            onOpen: (modal) => {
                const submitBtn = modal.element.querySelector('#forgotSubmitBtn');
                const mobileInput = modal.element.querySelector('#forgotMobileInput');
                const msgEl = modal.element.querySelector('#forgotMessage');

                if (submitBtn) {
                    submitBtn.addEventListener('click', async () => {
                        const mobile = mobileInput?.value?.trim() || '';

                        if (!mobile) {
                            if (msgEl) {
                                msgEl.textContent = translator.translate('enterMobile') || 'لطفاً شماره موبایل را وارد کنید.';
                                msgEl.className = 'login-page__message login-page__message--error';
                            }
                            return;
                        }

                        if (!validators.isMobile(mobile)) {
                            if (msgEl) {
                                msgEl.textContent = translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.';
                                msgEl.className = 'login-page__message login-page__message--error';
                            }
                            return;
                        }

                        try {
                            submitBtn.disabled = true;
                            submitBtn.textContent = translator.translate('sending') || 'در حال ارسال...';

                            const result = await Auth.forgotPassword(mobile);

                            if (result.success) {
                                if (msgEl) {
                                    msgEl.textContent = result.message || translator.translate('resetLinkSent') || 'لینک بازیابی ارسال شد.';
                                    msgEl.className = 'login-page__message login-page__message--success';
                                }
                                setTimeout(() => {
                                    Modal.close(modalId);
                                }, 2000);
                            } else {
                                if (msgEl) {
                                    msgEl.textContent = result.message || translator.translate('forgotPasswordFailed') || 'ارسال لینک با شکست مواجه شد.';
                                    msgEl.className = 'login-page__message login-page__message--error';
                                }
                            }
                        } catch (error) {
                            if (msgEl) {
                                msgEl.textContent = error.message || translator.translate('forgotPasswordError') || 'خطا در ارسال لینک بازیابی.';
                                msgEl.className = 'login-page__message login-page__message--error';
                            }
                        } finally {
                            submitBtn.disabled = false;
                            submitBtn.textContent = translator.translate('sendResetLink') || 'ارسال لینک بازیابی';
                        }
                    });
                }

                // Enter key
                if (mobileInput) {
                    mobileInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            submitBtn?.click();
                        }
                    });
                    setTimeout(() => mobileInput.focus(), 100);
                }

                // ترجمه
                if (translator && translator.loaded) {
                    setTimeout(() => {
                        translator.translateElement(modal.element);
                    }, 50);
                }
            },
        });
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // دکمه‌های تغییر روش ورود
        document.querySelectorAll('.login-page__method-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const method = tab.dataset.method;
                if (method) {
                    this._setLoginMethod(method);
                    this._clearMessages();
                }
            });
        });

        // ورود با رمز عبور
        const passwordBtn = document.getElementById('loginPasswordBtn');
        if (passwordBtn) {
            passwordBtn.addEventListener('click', () => {
                this._handlePasswordLogin();
            });
        }

        // Enter key در فرم رمز عبور
        const passwordInput = document.getElementById('loginPasswordInput');
        if (passwordInput) {
            passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._handlePasswordLogin();
                }
            });
        }

        // ارسال OTP
        const otpSendBtn = document.getElementById('loginOTPSendBtn');
        if (otpSendBtn) {
            otpSendBtn.addEventListener('click', () => {
                this._handleOTPSend();
            });
        }

        // تایید OTP
        const otpVerifyBtn = document.getElementById('loginOTPVerifyBtn');
        if (otpVerifyBtn) {
            otpVerifyBtn.addEventListener('click', () => {
                this._handleOTPVerify();
            });
        }

        // ارسال مجدد OTP
        const otpResendBtn = document.getElementById('loginOTPResendBtn');
        if (otpResendBtn) {
            otpResendBtn.addEventListener('click', () => {
                this._handleOTPResend();
            });
        }

        // Enter key در فیلد OTP
        const otpInput = document.getElementById('loginOTPInput');
        if (otpInput) {
            otpInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._handleOTPVerify();
                }
            });
            // محدود کردن به عدد
            otpInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            });
        }

        // لینک فراموشی رمز عبور
        const forgotLink = document.getElementById('forgotPasswordLink');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                this._handleForgotPassword();
            });
        }

        // لینک رفتن به ثبت نام
        const registerLink = document.getElementById('goToRegisterLink');
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                router.navigate('register');
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

        // رویداد تغییر وضعیت احراز هویت
        document.addEventListener('authChanged', (e) => {
            if (e.detail.isAuthenticated) {
                router.navigate(this.options.redirectAfterLogin);
            }
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
        }
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        this._clearOTPTimer();
        this._initialized = false;
        console.log('🧹 LoginPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { LoginPage };
export default LoginPage;