/*=========================================================
نام فایل: register.js

وظیفه: صفحه ثبت نام کاربر جدید با پشتیبانی از فرم چند مرحله‌ای،
اعتبارسنجی، تایید کد OTP، و هدایت به صفحه ورود پس از ثبت‌نام موفق

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Auth } from '../js/auth.js';
import { utils } from '../js/utils.js';
import { validators } from '../js/validators.js';
import { router } from '../js/router.js';

/*---------------------------------------------------------
کلاس RegisterPage

وظیفه: مدیریت و رندر صفحه ثبت نام

---------------------------------------------------------*/
class RegisterPage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه ثبت نام

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#auth',
            redirectAfterRegister: '/login',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._isLoading = false;
        this._otpSent = false;
        this._otpTimer = null;
        this._otpRemaining = 0;
        this._formData = {};
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه ثبت نام

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه ثبت نام یافت نشد.');
            return;
        }

        // اگر کاربر قبلاً وارد شده است، به صفحه پیش‌فرض هدایت شود
        if (Auth.isAuthenticated()) {
            router.navigate('/dashboard');
            return;
        }

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ RegisterPage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _buildPageStructure() {
        if (this._element.querySelector('.register-page__wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'register-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'register-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="authSectionTitle">ثبت نام</h2>
            <p class="section__subtitle" data-i18n="authSectionSubtitle">ایجاد حساب کاربری جدید و دسترسی به خدمات</p>
        `;
        wrapper.appendChild(header);

        // فرم ثبت نام
        const form = document.createElement('div');
        form.className = 'register-page__form';
        form.innerHTML = `
            <!-- مرحله ۱: اطلاعات پایه -->
            <div id="registerStep1" class="register-page__step">
                <div class="register-page__field">
                    <label data-i18n="authRegisterUsernameLabel">نام کاربری</label>
                    <input type="text" id="regUsername" class="auth__input" 
                           placeholder="${translator.translate('enterUsername') || 'نام کاربری'}" 
                           data-placeholder="enterUsername" />
                    <span class="register-page__hint" data-i18n="usernameHint">۳ تا ۳۰ کاراکتر، حروف، اعداد و خط زیر مجاز است</span>
                </div>
                <div class="register-page__field">
                    <label data-i18n="authRegisterMobileLabel">شماره موبایل</label>
                    <input type="tel" id="regMobile" class="auth__input" 
                           placeholder="${translator.translate('enterMobile') || '0912xxxxxxx'}" 
                           data-placeholder="enterMobile" />
                    <span class="register-page__hint" data-i18n="mobileHint">شماره موبایل باید با ۰۹ شروع شود</span>
                </div>
                <div class="register-page__field">
                    <label data-i18n="authRegisterEmailLabel">ایمیل</label>
                    <input type="email" id="regEmail" class="auth__input" 
                           placeholder="${translator.translate('enterEmail') || 'example@mail.com'}" 
                           data-placeholder="enterEmail" />
                </div>
                <div class="register-page__field">
                    <label data-i18n="authRegisterPasswordLabel">رمز عبور</label>
                    <input type="password" id="regPassword" class="auth__input" 
                           placeholder="${translator.translate('enterPassword') || 'رمز عبور'}" 
                           data-placeholder="enterPassword" />
                    <span class="register-page__hint" data-i18n="passwordHint">حداقل ۸ کاراکتر، شامل حرف و عدد</span>
                </div>
                <div class="register-page__field">
                    <label data-i18n="authRegisterConfirmPasswordLabel">تکرار رمز عبور</label>
                    <input type="password" id="regConfirmPassword" class="auth__input" 
                           placeholder="${translator.translate('confirmPassword') || 'تکرار رمز عبور'}" 
                           data-placeholder="confirmPassword" />
                </div>
                <button type="button" id="registerNextBtn" class="btn btn--primary btn--block">
                    ${translator.translate('nextStep') || 'مرحله بعد'}
                </button>
            </div>

            <!-- مرحله ۲: تایید OTP -->
            <div id="registerStep2" class="register-page__step hidden">
                <div class="register-page__otp-info">
                    <i class="fas fa-shield-alt" style="font-size:2rem;color:#2563eb;display:block;margin-bottom:0.5rem;"></i>
                    <p data-i18n="authRegisterOtpNote">برای تایید حساب، کد ارسال شده به موبایل را وارد کنید.</p>
                    <p class="register-page__otp-mobile" id="otpMobileDisplay"></p>
                </div>
                <div class="register-page__field">
                    <label data-i18n="authRegisterOtpLabel">کد تایید</label>
                    <input type="text" id="regOtp" class="auth__input" 
                           placeholder="${translator.translate('enterOTP') || '۶ رقمی'}" 
                           data-placeholder="enterOTP" maxlength="6" />
                </div>
                <div class="register-page__otp-timer" id="registerOtpTimer">
                    ${translator.translate('otpExpiresIn') || 'زمان باقیمانده:'} <span id="registerOtpCount">0</span> ${translator.translate('seconds') || 'ثانیه'}
                </div>
                <button type="button" id="registerVerifyBtn" class="btn btn--primary btn--block">
                    ${translator.translate('authRegisterOtpButton') || 'تایید کد و ثبت نام'}
                </button>
                <button type="button" id="registerResendBtn" class="btn btn--outline btn--block hidden">
                    ${translator.translate('resendOTP') || 'ارسال مجدد کد'}
                </button>
                <button type="button" id="registerBackBtn" class="btn btn--outline btn--block">
                    ${translator.translate('back') || 'بازگشت'}
                </button>
            </div>

            <div id="registerMessage" class="register-page__message"></div>

            <div class="register-page__footer">
                <p>
                    ${translator.translate('alreadyHaveAccount') || 'قبلاً حساب کاربری دارید؟'}
                    <a href="#" id="goToLoginLink" class="register-page__link">
                        ${translator.translate('authLoginPrimary') || 'ورود'}
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
        this._resetForm();
    }

    /*---------------------------------------------------------
    متد _resetForm

    وظیفه: بازنشانی فرم به مرحله اول

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _resetForm() {
        // پاک کردن فیلدها
        document.getElementById('regUsername').value = '';
        document.getElementById('regMobile').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regConfirmPassword').value = '';
        document.getElementById('regOtp').value = '';

        // نمایش مرحله ۱
        document.getElementById('registerStep1').classList.remove('hidden');
        document.getElementById('registerStep2').classList.add('hidden');

        // بازنشانی OTP
        this._otpSent = false;
        this._otpRemaining = 0;
        this._clearOTPTimer();
        this._formData = {};

        const timerDisplay = document.getElementById('registerOtpTimer');
        const resendBtn = document.getElementById('registerResendBtn');
        const verifyBtn = document.getElementById('registerVerifyBtn');

        if (timerDisplay) timerDisplay.classList.add('hidden');
        if (resendBtn) resendBtn.classList.add('hidden');
        if (verifyBtn) verifyBtn.classList.remove('hidden');

        this._clearMessages();
    }

    /*---------------------------------------------------------
    متد _validateStep1

    وظیفه: اعتبارسنجی مرحله اول فرم

    ورودی‌ها: none

    خروجی: boolean

    ---------------------------------------------------------*/
    _validateStep1() {
        const username = document.getElementById('regUsername')?.value?.trim() || '';
        const mobile = document.getElementById('regMobile')?.value?.trim() || '';
        const email = document.getElementById('regEmail')?.value?.trim() || '';
        const password = document.getElementById('regPassword')?.value || '';
        const confirmPassword = document.getElementById('regConfirmPassword')?.value || '';

        // اعتبارسنجی نام کاربری
        if (!username) {
            this._showMessage(translator.translate('enterUsername') || 'لطفاً نام کاربری را وارد کنید.', 'error');
            document.getElementById('regUsername')?.focus();
            return false;
        }
        if (!validators.isUsername(username)) {
            this._showMessage(translator.translate('invalidUsername') || 'نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد.', 'error');
            document.getElementById('regUsername')?.focus();
            return false;
        }

        // اعتبارسنجی موبایل
        if (!mobile) {
            this._showMessage(translator.translate('enterMobile') || 'لطفاً شماره موبایل را وارد کنید.', 'error');
            document.getElementById('regMobile')?.focus();
            return false;
        }
        if (!validators.isMobile(mobile)) {
            this._showMessage(translator.translate('invalidMobile') || 'شماره موبایل وارد شده معتبر نیست.', 'error');
            document.getElementById('regMobile')?.focus();
            return false;
        }

        // اعتبارسنجی ایمیل
        if (!email) {
            this._showMessage(translator.translate('enterEmail') || 'لطفاً ایمیل را وارد کنید.', 'error');
            document.getElementById('regEmail')?.focus();
            return false;
        }
        if (!validators.isEmail(email)) {
            this._showMessage(translator.translate('invalidEmail') || 'ایمیل وارد شده معتبر نیست.', 'error');
            document.getElementById('regEmail')?.focus();
            return false;
        }

        // اعتبارسنجی رمز عبور
        if (!password) {
            this._showMessage(translator.translate('enterPassword') || 'لطفاً رمز عبور را وارد کنید.', 'error');
            document.getElementById('regPassword')?.focus();
            return false;
        }
        if (!validators.isPassword(password)) {
            this._showMessage(translator.translate('invalidPassword') || 'رمز عبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.', 'error');
            document.getElementById('regPassword')?.focus();
            return false;
        }

        // تطابق رمز عبور
        if (password !== confirmPassword) {
            this._showMessage(translator.translate('passwordsDoNotMatch') || 'رمز عبور و تکرار آن یکسان نیست.', 'error');
            document.getElementById('regConfirmPassword')?.focus();
            return false;
        }

        // ذخیره داده‌ها
        this._formData = {
            username,
            mobile,
            email,
            password,
            confirmPassword,
        };

        return true;
    }

    /*---------------------------------------------------------
    متد _handleStep1Submit

    وظیفه: مدیریت ارسال مرحله اول و درخواست OTP

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handleStep1Submit() {
        if (this._isLoading) return;

        if (!this._validateStep1()) return;

        this._isLoading = true;
        this._clearMessages();

        const btn = document.getElementById('registerNextBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = translator.translate('sending') || 'در حال ارسال...';
        }

        try {
            // ارسال درخواست ثبت نام (مرحله اول)
            const result = await Auth.register(this._formData);

            if (result.success) {
                this._otpSent = true;
                this._showMessage(
                    result.message || translator.translate('registrationOTPSent') || 'کد تایید ارسال شد.',
                    'success'
                );

                // رفتن به مرحله ۲
                document.getElementById('registerStep1').classList.add('hidden');
                document.getElementById('registerStep2').classList.remove('hidden');

                // نمایش شماره موبایل
                const mobileDisplay = document.getElementById('otpMobileDisplay');
                if (mobileDisplay) {
                    mobileDisplay.textContent = this._formData.mobile;
                }

                // شروع تایمر OTP
                const expiresIn = result.data?.expiresIn || 120;
                this._startOTPTimer(expiresIn);

                // فوکوس روی فیلد OTP
                document.getElementById('regOtp')?.focus();

                // نمایش دکمه ارسال مجدد
                const resendBtn = document.getElementById('registerResendBtn');
                if (resendBtn) resendBtn.classList.add('hidden');

                const verifyBtn = document.getElementById('registerVerifyBtn');
                if (verifyBtn) verifyBtn.classList.remove('hidden');

            } else {
                this._showMessage(
                    result.message || translator.translate('registrationFailed') || 'ثبت نام با شکست مواجه شد.',
                    'error'
                );
            }
        } catch (error) {
            this._showMessage(
                error.message || translator.translate('registrationError') || 'خطا در ثبت نام.',
                'error'
            );
        } finally {
            this._isLoading = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = translator.translate('nextStep') || 'مرحله بعد';
            }
        }
    }

    /*---------------------------------------------------------
    متد _handleOTPVerify

    وظیفه: مدیریت تایید کد OTP و تکمیل ثبت نام

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handleOTPVerify() {
        if (this._isLoading) return;

        const otpInput = document.getElementById('regOtp');
        const otp = otpInput?.value?.trim() || '';

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

        const btn = document.getElementById('registerVerifyBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = translator.translate('verifying') || 'در حال تایید...';
        }

        try {
            const result = await Auth.verifyOTP(this._formData.mobile, otp, 'register');

            if (result.success) {
                this._showMessage(
                    result.message || translator.translate('registrationComplete') || 'ثبت نام با موفقیت انجام شد.',
                    'success'
                );
                this._clearOTPTimer();

                // هدایت به صفحه ورود
                setTimeout(() => {
                    router.navigate(this.options.redirectAfterRegister);
                }, 1500);
            } else {
                this._showMessage(
                    result.message || translator.translate('invalidOTPCode') || 'کد تایید نامعتبر است.',
                    'error'
                );
                otpInput?.focus();
                otpInput?.select();
            }
        } catch (error) {
            this._showMessage(
                error.message || translator.translate('verifyOTPError') || 'خطا در تایید کد.',
                'error'
            );
        } finally {
            this._isLoading = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = translator.translate('authRegisterOtpButton') || 'تایید کد و ثبت نام';
            }
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
                const verifyBtn = document.getElementById('registerVerifyBtn');
                const resendBtn = document.getElementById('registerResendBtn');
                const otpInput = document.getElementById('regOtp');

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
        const timerDisplay = document.getElementById('registerOtpTimer');
        const timerCount = document.getElementById('registerOtpCount');
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
        const resendBtn = document.getElementById('registerResendBtn');
        const verifyBtn = document.getElementById('registerVerifyBtn');
        const timerDisplay = document.getElementById('registerOtpTimer');

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
        const msgEl = document.getElementById('registerMessage');
        if (!msgEl) return;

        msgEl.textContent = message;
        msgEl.className = `register-page__message register-page__message--${type}`;
        msgEl.style.display = 'block';
    }

    /*---------------------------------------------------------
    متد _clearMessages

    وظیفه: پاکسازی پیام‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _clearMessages() {
        const msgEl = document.getElementById('registerMessage');
        if (msgEl) {
            msgEl.textContent = '';
            msgEl.className = 'register-page__message';
            msgEl.style.display = 'none';
        }
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // دکمه مرحله بعد
        const nextBtn = document.getElementById('registerNextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this._handleStep1Submit();
            });
        }

        // Enter key در فیلدهای مرحله ۱
        const fields = ['regUsername', 'regMobile', 'regEmail', 'regPassword', 'regConfirmPassword'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        // اگر آخرین فیلد است، دکمه را کلیک کن
                        if (id === 'regConfirmPassword') {
                            nextBtn?.click();
                        } else {
                            // به فیلد بعدی برو
                            const nextId = fields[fields.indexOf(id) + 1];
                            if (nextId) {
                                document.getElementById(nextId)?.focus();
                            }
                        }
                    }
                });
            }
        });

        // دکمه تایید OTP
        const verifyBtn = document.getElementById('registerVerifyBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                this._handleOTPVerify();
            });
        }

        // Enter key در فیلد OTP
        const otpInput = document.getElementById('regOtp');
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

        // دکمه ارسال مجدد OTP
        const resendBtn = document.getElementById('registerResendBtn');
        if (resendBtn) {
            resendBtn.addEventListener('click', () => {
                this._handleOTPResend();
            });
        }

        // دکمه بازگشت
        const backBtn = document.getElementById('registerBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this._resetForm();
                this._clearMessages();
                // اسکرول به بالای فرم
                this._element?.scrollIntoView({ behavior: 'smooth' });
            });
        }

        // لینک رفتن به ورود
        const loginLink = document.getElementById('goToLoginLink');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                router.navigate('login');
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
                router.navigate('/dashboard');
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
        console.log('🧹 RegisterPage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { RegisterPage };
export default RegisterPage;