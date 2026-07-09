/*=========================================================
نام فایل: toast.js

وظیفه: مدیریت نمایش اعلان‌های Toast

نویسنده: تیم توسعه سورنا فناور سینا

تاریخ: ۱۴۰۵/۰۴/۱۲
=========================================================*/

class ToastManager {
    constructor() {
        this._container = null;
        this._toasts = [];
        this._init();
    }

    _init() {
        // گوش دادن به رویدادهای toast
        document.addEventListener('showToast', (e) => {
            const { message, type, duration } = e.detail;
            this.show(message, type, duration);
        });
    }

    show(message, type = 'info', duration = 4000) {
        const toast = this._createToast(message, type);
        document.body.appendChild(toast);

        // انیمیشن ورود
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // حذف خودکار
        const removeToast = () => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
                this._toasts = this._toasts.filter(t => t !== toast);
            }, 300);
        };

        const timeoutId = setTimeout(removeToast, duration);

        // هاور برای توقف تایمر
        toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
        toast.addEventListener('mouseleave', () => {
            const newTimeout = setTimeout(removeToast, duration);
            toast._timeoutId = newTimeout;
        });

        // دکمه بستن
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', removeToast);

        this._toasts.push(toast);
        return toast;
    }

    _createToast(message, type) {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#eab308',
            info: '#2563eb',
        };

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-width: 420px;
            background: ${colors[type] || '#2563eb'};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-family: 'Vazirmatn', sans-serif;
            direction: rtl;
            transform: translateX(120%);
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
            opacity: 0;
            min-width: 280px;
            font-size: 0.95rem;
            border-right: 4px solid rgba(255,255,255,0.3);
        `;

        toast.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;flex:1;">
                <span style="font-size:1.4rem;">${icons[type] || 'ℹ️'}</span>
                <span style="flex:1;line-height:1.5;">${message}</span>
            </div>
            <button class="toast-close" style="
                background:none;
                border:none;
                color:rgba(255,255,255,0.7);
                font-size:1.5rem;
                cursor:pointer;
                padding:0 4px;
                transition:color 0.2s;
                line-height:1;
            ">&times;</button>
        `;

        // تغییر حالت نمایش
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);

        return toast;
    }

    // متد برای پاک کردن همه toastها
    clearAll() {
        this._toasts.forEach(toast => toast.remove());
        this._toasts = [];
    }
}

// ایجاد نمونه واحد
const Toast = new ToastManager();

export { ToastManager, Toast };
export default Toast;