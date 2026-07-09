/*=========================================================
نام فایل: profile.js

وظیفه: صفحه پروفایل کاربر با نمایش اطلاعات کاربری،
ویرایش پروفایل، تغییر رمز عبور و مدیریت حساب کاربری

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

import { State } from '../js/state.js';
import { translator } from '../js/translator.js';
import { Auth } from '../js/auth.js';
import { api } from '../js/api.js';
import { utils } from '../js/utils.js';
import { validators } from '../js/validators.js';
import { router } from '../js/router.js';
import { Modal } from '../js/modal.js';

/*---------------------------------------------------------
کلاس ProfilePage

وظیفه: مدیریت و رندر صفحه پروفایل کاربر

---------------------------------------------------------*/
class ProfilePage {
    /*---------------------------------------------------------
    متد constructor

    وظیفه: مقداردهی اولیه صفحه پروفایل

    ورودی‌ها: options (object)

    خروجی: instance

    ---------------------------------------------------------*/
    constructor(options = {}) {
        this.options = {
            container: '#auth',
            ...options,
        };
        this._element = null;
        this._initialized = false;
        this._language = State.get('language') || 'fa';
        this._isLoading = false;
        this._user = null;
        this._editMode = false;
    }

    /*---------------------------------------------------------
    متد init

    وظیفه: مقداردهی اولیه و رندر صفحه پروفایل

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async init() {
        if (this._initialized) return;

        // دریافت المان اصلی
        this._element = document.querySelector(this.options.container);
        if (!this._element) {
            console.warn('⚠️ المان صفحه پروفایل یافت نشد.');
            return;
        }

        // بررسی احراز هویت
        if (!Auth.isAuthenticated()) {
            router.navigate('login');
            return;
        }

        // دریافت اطلاعات کاربر
        this._user = Auth.getCurrentUser();

        // ایجاد ساختار صفحه
        this._buildPageStructure();

        // رندر اطلاعات پروفایل
        this._renderProfile();

        // اتصال رویدادها
        this._bindEvents();

        // اشتراک در تغییرات وضعیت
        this._subscribeToState();

        this._initialized = true;
        console.log('✅ ProfilePage مقداردهی شد.');
    }

    /*---------------------------------------------------------
    متد _buildPageStructure

    وظیفه: ایجاد ساختار HTML صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _buildPageStructure() {
        // اگر ساختار از قبل وجود دارد، آن را پاک می‌کنیم
        const existingWrapper = this._element.querySelector('.profile-page__wrapper');
        if (existingWrapper) {
            existingWrapper.remove();
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'profile-page__wrapper';

        // هدر صفحه
        const header = document.createElement('div');
        header.className = 'profile-page__header';
        header.innerHTML = `
            <h2 class="section__title" data-i18n="authProfileInfoTitle">پروفایل کاربری</h2>
            <p class="section__subtitle" data-i18n="profileSub">مدیریت اطلاعات حساب کاربری و تنظیمات</p>
        `;
        wrapper.appendChild(header);

        // محتوای اصلی
        const content = document.createElement('div');
        content.className = 'profile-page__content';
        content.innerHTML = `
            <!-- اطلاعات کاربری -->
            <div class="profile-page__card">
                <div class="profile-page__card-header">
                    <h3 data-i18n="authProfileInfoTitle">اطلاعات کاربری</h3>
                    <button class="btn btn--sm btn--outline" id="profileEditBtn">
                        <i class="fas fa-edit"></i> ${translator.translate('editProfile') || 'ویرایش'}
                    </button>
                </div>
                <div id="profileInfoDisplay" class="profile-page__info-display">
                    <div class="profile-page__info-row">
                        <span class="profile-page__info-label" data-i18n="profileUsernameLabel">نام کاربری:</span>
                        <span id="profileDisplayUsername" class="profile-page__info-value">-</span>
                    </div>
                    <div class="profile-page__info-row">
                        <span class="profile-page__info-label" data-i18n="profileMobileLabel">موبایل:</span>
                        <span id="profileDisplayMobile" class="profile-page__info-value">-</span>
                    </div>
                    <div class="profile-page__info-row">
                        <span class="profile-page__info-label" data-i18n="profileEmailLabel">ایمیل:</span>
                        <span id="profileDisplayEmail" class="profile-page__info-value">-</span>
                    </div>
                    <div class="profile-page__info-row">
                        <span class="profile-page__info-label">${translator.translate('memberSince') || 'عضو از:'}</span>
                        <span id="profileDisplayJoined" class="profile-page__info-value">-</span>
                    </div>
                </div>
                <div id="profileEditForm" class="profile-page__edit-form hidden">
                    <div class="profile-page__field">
                        <label data-i18n="authRegisterUsernameLabel">نام کاربری</label>
                        <input type="text" id="profileEditUsername" class="auth__input" 
                               placeholder="${translator.translate('enterUsername') || 'نام کاربری'}" />
                    </div>
                    <div class="profile-page__field">
                        <label data-i18n="authRegisterEmailLabel">ایمیل</label>
                        <input type="email" id="profileEditEmail" class="auth__input" 
                               placeholder="${translator.translate('enterEmail') || 'example@mail.com'}" />
                    </div>
                    <div class="profile-page__field">
                        <label data-i18n="authRegisterMobileLabel">شماره موبایل</label>
                        <input type="tel" id="profileEditMobile" class="auth__input" 
                               placeholder="${translator.translate('enterMobile') || '0912xxxxxxx'}" disabled />
                        <span class="profile-page__hint">${translator.translate('mobileNotEditable') || 'شماره موبایل قابل ویرایش نیست'}</span>
                    </div>
                    <div class="profile-page__form-actions">
                        <button class="btn btn--primary" id="profileSaveBtn">
                            <i class="fas fa-save"></i> ${translator.translate('saveChanges') || 'ذخیره تغییرات'}
                        </button>
                        <button class="btn btn--outline" id="profileCancelBtn">
                            ${translator.translate('cancel') || 'انصراف'}
                        </button>
                    </div>
                </div>
            </div>

            <!-- تغییر رمز عبور -->
            <div class="profile-page__card">
                <h3 data-i18n="authProfileChangeTitle">تغییر رمز عبور</h3>
                <div class="profile-page__change-password">
                    <div class="profile-page__field">
                        <label data-i18n="authCurrentPasswordLabel">رمز فعلی</label>
                        <input type="password" id="profileCurrentPassword" class="auth__input" 
                               placeholder="${translator.translate('enterCurrentPassword') || 'رمز فعلی'}" />
                    </div>
                    <div class="profile-page__field">
                        <label data-i18n="authNewPasswordLabel">رمز جدید</label>
                        <input type="password" id="profileNewPassword" class="auth__input" 
                               placeholder="${translator.translate('enterNewPassword') || 'رمز جدید'}" />
                        <span class="profile-page__hint" data-i18n="passwordHint">حداقل ۸ کاراکتر، شامل حرف و عدد</span>
                    </div>
                    <div class="profile-page__field">
                        <label data-i18n="authRegisterConfirmPasswordLabel">تکرار رمز جدید</label>
                        <input type="password" id="profileConfirmNewPassword" class="auth__input" 
                               placeholder="${translator.translate('confirmNewPassword') || 'تکرار رمز جدید'}" />
                    </div>
                    <button class="btn btn--primary" id="profileChangePasswordBtn">
                        <i class="fas fa-key"></i> ${translator.translate('authSavePasswordButton') || 'ذخیره رمز جدید'}
                    </button>
                </div>
            </div>

            <!-- اقدامات حساب -->
            <div class="profile-page__card profile-page__actions-card">
                <h3 data-i18n="accountActions">اقدامات حساب</h3>
                <div class="profile-page__account-actions">
                    <button class="btn btn--outline" id="profileLogoutBtn">
                        <i class="fas fa-sign-out-alt"></i> ${translator.translate('authLogoutButton') || 'خروج از حساب'}
                    </button>
                    <button class="btn btn--danger" id="profileDeleteBtn">
                        <i class="fas fa-trash"></i> ${translator.translate('deleteAccount') || 'حذف حساب کاربری'}
                    </button>
                </div>
            </div>

            <!-- پیام‌ها -->
            <div id="profileMessage" class="profile-page__message"></div>
        `;

        wrapper.appendChild(content);
        this._element.appendChild(wrapper);

        // ترجمه
        if (translator && translator.loaded) {
            setTimeout(() => {
                translator.translateElement(this._element);
            }, 50);
        }
    }

    /*---------------------------------------------------------
    متد _renderProfile

    وظیفه: رندر اطلاعات کاربر در پروفایل

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _renderProfile() {
        if (!this._user) {
            this._user = Auth.getCurrentUser();
        }

        const username = document.getElementById('profileDisplayUsername');
        const mobile = document.getElementById('profileDisplayMobile');
        const email = document.getElementById('profileDisplayEmail');
        const joined = document.getElementById('profileDisplayJoined');

        if (username) username.textContent = this._user?.username || '-';
        if (mobile) mobile.textContent = this._user?.mobile || '-';
        if (email) email.textContent = this._user?.email || '-';
        if (joined) {
            const date = this._user?.createdAt || this._user?.joinedAt;
            if (date) {
                joined.textContent = utils.formatDate(date, this._language === 'fa' ? 'fa-IR' : 'en-US');
            } else {
                joined.textContent = '-';
            }
        }

        // پر کردن فیلدهای ویرایش
        const editUsername = document.getElementById('profileEditUsername');
        const editEmail = document.getElementById('profileEditEmail');
        const editMobile = document.getElementById('profileEditMobile');

        if (editUsername) editUsername.value = this._user?.username || '';
        if (editEmail) editEmail.value = this._user?.email || '';
        if (editMobile) editMobile.value = this._user?.mobile || '';

        // بازنشانی وضعیت ویرایش
        this._editMode = false;
        document.getElementById('profileInfoDisplay')?.classList.remove('hidden');
        document.getElementById('profileEditForm')?.classList.add('hidden');
        const editBtn = document.getElementById('profileEditBtn');
        if (editBtn) {
            editBtn.innerHTML = `<i class="fas fa-edit"></i> ${translator.translate('editProfile') || 'ویرایش'}`;
        }
    }

    /*---------------------------------------------------------
    متد _showMessage

    وظیفه: نمایش پیام در صفحه

    ورودی‌ها: message (string), type (string)

    خروجی: void

    ---------------------------------------------------------*/
    _showMessage(message, type = 'error') {
        const msgEl = document.getElementById('profileMessage');
        if (!msgEl) return;

        msgEl.textContent = message;
        msgEl.className = `profile-page__message profile-page__message--${type}`;
        msgEl.style.display = 'block';
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /*---------------------------------------------------------
    متد _clearMessages

    وظیفه: پاکسازی پیام‌ها

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _clearMessages() {
        const msgEl = document.getElementById('profileMessage');
        if (msgEl) {
            msgEl.textContent = '';
            msgEl.className = 'profile-page__message';
            msgEl.style.display = 'none';
        }
    }

    /*---------------------------------------------------------
    متد _toggleEditMode

    وظیفه: تغییر حالت ویرایش پروفایل

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _toggleEditMode() {
        this._editMode = !this._editMode;

        const display = document.getElementById('profileInfoDisplay');
        const form = document.getElementById('profileEditForm');
        const editBtn = document.getElementById('profileEditBtn');

        if (this._editMode) {
            display?.classList.add('hidden');
            form?.classList.remove('hidden');
            if (editBtn) {
                editBtn.innerHTML = `<i class="fas fa-times"></i> ${translator.translate('cancelEdit') || 'لغو ویرایش'}`;
                editBtn.classList.remove('btn--outline');
                editBtn.classList.add('btn--danger');
            }
            // پر کردن فیلدها با مقادیر فعلی
            const editUsername = document.getElementById('profileEditUsername');
            const editEmail = document.getElementById('profileEditEmail');
            if (editUsername) editUsername.value = this._user?.username || '';
            if (editEmail) editEmail.value = this._user?.email || '';
        } else {
            display?.classList.remove('hidden');
            form?.classList.add('hidden');
            if (editBtn) {
                editBtn.innerHTML = `<i class="fas fa-edit"></i> ${translator.translate('editProfile') || 'ویرایش'}`;
                editBtn.classList.remove('btn--danger');
                editBtn.classList.add('btn--outline');
            }
            this._clearMessages();
        }
    }

    /*---------------------------------------------------------
    متد _handleProfileUpdate

    وظیفه: مدیریت به‌روزرسانی اطلاعات پروفایل

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handleProfileUpdate() {
        if (this._isLoading) return;

        const usernameInput = document.getElementById('profileEditUsername');
        const emailInput = document.getElementById('profileEditEmail');

        const username = usernameInput?.value?.trim() || '';
        const email = emailInput?.value?.trim() || '';

        // اعتبارسنجی
        if (!username) {
            this._showMessage(
                translator.translate('enterUsername') || 'لطفاً نام کاربری را وارد کنید.',
                'error'
            );
            usernameInput?.focus();
            return;
        }
        if (!validators.isUsername(username)) {
            this._showMessage(
                translator.translate('invalidUsername') || 'نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد.',
                'error'
            );
            usernameInput?.focus();
            return;
        }

        if (!email) {
            this._showMessage(
                translator.translate('enterEmail') || 'لطفاً ایمیل را وارد کنید.',
                'error'
            );
            emailInput?.focus();
            return;
        }
        if (!validators.isEmail(email)) {
            this._showMessage(
                translator.translate('invalidEmail') || 'ایمیل وارد شده معتبر نیست.',
                'error'
            );
            emailInput?.focus();
            return;
        }

        this._isLoading = true;
        this._clearMessages();

        const saveBtn = document.getElementById('profileSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translator.translate('saving') || 'در حال ذخیره...'}`;
        }

        try {
            const result = await Auth.updateProfile({
                username: username,
                email: email,
            });

            if (result.success) {
                this._showMessage(
                    result.message || translator.translate('profileUpdated') || 'پروفایل با موفقیت به‌روزرسانی شد.',
                    'success'
                );
                // به‌روزرسانی کاربر محلی
                this._user = Auth.getCurrentUser();
                this._renderProfile();
                this._editMode = false;
                this._toggleEditMode();

                // انتشار رویداد
                document.dispatchEvent(new CustomEvent('profileUpdated', {
                    detail: { user: this._user }
                }));
            } else {
                this._showMessage(
                    result.message || translator.translate('profileUpdateFailed') || 'به‌روزرسانی پروفایل با شکست مواجه شد.',
                    'error'
                );
            }
        } catch (error) {
            this._showMessage(
                error.message || translator.translate('profileUpdateError') || 'خطا در به‌روزرسانی پروفایل.',
                'error'
            );
        } finally {
            this._isLoading = false;
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fas fa-save"></i> ${translator.translate('saveChanges') || 'ذخیره تغییرات'}`;
            }
        }
    }

    /*---------------------------------------------------------
    متد _handlePasswordChange

    وظیفه: مدیریت تغییر رمز عبور

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handlePasswordChange() {
        if (this._isLoading) return;

        const currentPassword = document.getElementById('profileCurrentPassword')?.value || '';
        const newPassword = document.getElementById('profileNewPassword')?.value || '';
        const confirmPassword = document.getElementById('profileConfirmNewPassword')?.value || '';

        // اعتبارسنجی
        if (!currentPassword) {
            this._showMessage(
                translator.translate('enterCurrentPassword') || 'لطفاً رمز فعلی را وارد کنید.',
                'error'
            );
            document.getElementById('profileCurrentPassword')?.focus();
            return;
        }

        if (!newPassword) {
            this._showMessage(
                translator.translate('enterNewPassword') || 'لطفاً رمز جدید را وارد کنید.',
                'error'
            );
            document.getElementById('profileNewPassword')?.focus();
            return;
        }

        if (!validators.isPassword(newPassword)) {
            this._showMessage(
                translator.translate('invalidPassword') || 'رمز عبور جدید باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.',
                'error'
            );
            document.getElementById('profileNewPassword')?.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            this._showMessage(
                translator.translate('passwordsDoNotMatch') || 'رمز عبور جدید و تکرار آن یکسان نیست.',
                'error'
            );
            document.getElementById('profileConfirmNewPassword')?.focus();
            return;
        }

        this._isLoading = true;
        this._clearMessages();

        const btn = document.getElementById('profileChangePasswordBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${translator.translate('changing') || 'در حال تغییر...'}`;
        }

        try {
            const result = await Auth.changePassword(currentPassword, newPassword);

            if (result.success) {
                this._showMessage(
                    result.message || translator.translate('passwordChanged') || 'رمز عبور با موفقیت تغییر کرد.',
                    'success'
                );
                // پاک کردن فیلدها
                document.getElementById('profileCurrentPassword').value = '';
                document.getElementById('profileNewPassword').value = '';
                document.getElementById('profileConfirmNewPassword').value = '';
            } else {
                this._showMessage(
                    result.message || translator.translate('passwordChangeFailed') || 'تغییر رمز عبور با شکست مواجه شد.',
                    'error'
                );
            }
        } catch (error) {
            this._showMessage(
                error.message || translator.translate('passwordChangeError') || 'خطا در تغییر رمز عبور.',
                'error'
            );
        } finally {
            this._isLoading = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fas fa-key"></i> ${translator.translate('authSavePasswordButton') || 'ذخیره رمز جدید'}`;
            }
        }
    }

    /*---------------------------------------------------------
    متد _handleLogout

    وظیفه: مدیریت خروج از حساب کاربری

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async _handleLogout() {
        // نمایش مودال تایید
        Modal.showConfirm(
            translator.translate('logoutConfirm') || 'آیا از خروج از حساب کاربری خود اطمینان دارید؟',
            async () => {
                try {
                    await Auth.logout();
                    router.navigate('login');
                    utils.toast(
                        translator.translate('logoutSuccess') || 'با موفقیت خارج شدید.',
                        'success'
                    );
                } catch (error) {
                    utils.toast(
                        translator.translate('logoutError') || 'خطا در خروج از حساب.',
                        'error'
                    );
                }
            },
            null,
            {
                className: 'logout-confirm-modal',
                maxWidth: '450px',
            }
        );
    }

    /*---------------------------------------------------------
    متد _handleDeleteAccount

    وظیفه: مدیریت حذف حساب کاربری

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _handleDeleteAccount() {
        Modal.showConfirm(
            translator.translate('deleteAccountConfirm') || 
            'آیا از حذف حساب کاربری خود اطمینان دارید؟ این عملیات غیرقابل بازگشت است و تمام داده‌های شما حذف خواهد شد.',
            async () => {
                try {
                    // درخواست حذف حساب
                    const response = await api.delete('/auth/account');
                    if (response?.success) {
                        await Auth.logout();
                        router.navigate('login');
                        utils.toast(
                            translator.translate('accountDeleted') || 'حساب کاربری با موفقیت حذف شد.',
                            'success'
                        );
                    } else {
                        throw new Error(response?.message || 'خطا در حذف حساب کاربری');
                    }
                } catch (error) {
                    utils.toast(
                        error.message || translator.translate('deleteAccountError') || 'خطا در حذف حساب کاربری.',
                        'error'
                    );
                }
            },
            null,
            {
                className: 'delete-account-confirm-modal',
                maxWidth: '500px',
            }
        );
    }

    /*---------------------------------------------------------
    متد _bindEvents

    وظیفه: اتصال رویدادهای صفحه

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    _bindEvents() {
        // دکمه ویرایش پروفایل
        const editBtn = document.getElementById('profileEditBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this._toggleEditMode();
            });
        }

        // دکمه ذخیره پروفایل
        const saveBtn = document.getElementById('profileSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this._handleProfileUpdate();
            });
        }

        // دکمه انصراف از ویرایش
        const cancelBtn = document.getElementById('profileCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this._editMode) {
                    this._toggleEditMode();
                }
            });
        }

        // دکمه تغییر رمز عبور
        const changePasswordBtn = document.getElementById('profileChangePasswordBtn');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                this._handlePasswordChange();
            });
        }

        // Enter key در فیلدهای تغییر رمز
        const passwordFields = ['profileCurrentPassword', 'profileNewPassword', 'profileConfirmNewPassword'];
        passwordFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        // اگر آخرین فیلد است، دکمه را کلیک کن
                        if (id === 'profileConfirmNewPassword') {
                            changePasswordBtn?.click();
                        } else {
                            const nextId = passwordFields[passwordFields.indexOf(id) + 1];
                            if (nextId) {
                                document.getElementById(nextId)?.focus();
                            }
                        }
                    }
                });
            }
        });

        // دکمه خروج
        const logoutBtn = document.getElementById('profileLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this._handleLogout();
            });
        }

        // دکمه حذف حساب
        const deleteBtn = document.getElementById('profileDeleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this._handleDeleteAccount();
            });
        }

        // Enter key در فیلدهای ویرایش
        const editFields = ['profileEditUsername', 'profileEditEmail'];
        editFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (id === 'profileEditEmail') {
                            saveBtn?.click();
                        } else {
                            const nextId = editFields[editFields.indexOf(id) + 1];
                            if (nextId) {
                                document.getElementById(nextId)?.focus();
                            }
                        }
                    }
                });
            }
        });
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
            if (!e.detail.isAuthenticated) {
                router.navigate('login');
            } else {
                this._user = e.detail.user;
                this._renderProfile();
            }
        });

        // رویداد به‌روزرسانی پروفایل
        document.addEventListener('profileUpdated', (e) => {
            this._user = e.detail.user;
            this._renderProfile();
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
            // بازرندر اطلاعات (برای تاریخ و ...)
            this._renderProfile();
        }
    }

    /*---------------------------------------------------------
    متد refresh

    وظیفه: بازخوانی اطلاعات پروفایل از سرور

    ورودی‌ها: none

    خروجی: Promise<void>

    ---------------------------------------------------------*/
    async refresh() {
        try {
            const result = await Auth.getProfile();
            if (result.success) {
                this._user = result.data.user;
                this._renderProfile();
                utils.toast(
                    translator.translate('profileRefreshed') || 'پروفایل به‌روزرسانی شد.',
                    'success'
                );
            }
        } catch (error) {
            utils.toast(
                translator.translate('refreshFailed') || 'به‌روزرسانی با شکست مواجه شد.',
                'error'
            );
        }
    }

    /*---------------------------------------------------------
    متد destroy

    وظیفه: پاکسازی منابع

    ورودی‌ها: none

    خروجی: void

    ---------------------------------------------------------*/
    destroy() {
        this._initialized = false;
        console.log('🧹 ProfilePage پاکسازی شد.');
    }
}

// ===== صادرات =====
export { ProfilePage };
export default ProfilePage;