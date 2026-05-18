// 显示全局loading
export function showLoading() {
    const el = document.getElementById('loading');
    if (el) el.classList.add('show');
}

// 隐藏全局loading
export function hideLoading() {
    const el = document.getElementById('loading');
    if (el) el.classList.remove('show');
}

let toastTimer = null;
let toastRemaining = 0;
let toastStartTime = 0;
let toastPauseOnHover = true;

function startToastTimer() {
    toastStartTime = Date.now();
    toastTimer = setTimeout(() => {
        const toast = document.getElementById('toast');
        if (toast) toast.classList.remove('show');
        toastTimer = null;
    }, toastRemaining);
}

/**
 * 显示 Toast 提示
 * @param {string} message - 提示消息内容
 * @param {Object} [options={}] - 配置项
 * @param {'success'|'error'|'info'|'warning'} [options.type='info'] - 提示类型，决定背景颜色
 * @param {number} [options.duration=3000] - 持续时间（毫秒），设为 0 则不自动消失
 * @param {boolean} [options.closable=false] - 是否显示关闭按钮
 * @param {boolean} [options.pauseOnHover=true] - 鼠标悬停时是否暂停倒计时
 * @param {number|string} [options.width] - 宽度，数字自动加 px，字符串原样使用，不设则自适应内容（最大 420px）
 * @param {number|string} [options.height] - 最大高度，超出部分隐藏，数字自动加 px，字符串原样使用，不设则高度随内容自适应
 * @param {number} [options.opacity=1] - 透明度 0~1，默认不透明
 *
 * @example
 * showToast('操作成功', { type: 'success' })
 * showToast('保存中...', { duration: 0, closable: true })
 * showToast('提示', { duration: 5000 })
 * showToast('简短提示', { closable: false, duration: 1500 })
 * showToast('重要操作', { pauseOnHover: false })
 * showToast('长消息...', { width: 500 })
 * showToast('内容...', { width: 300, height: 60 })
 * showToast('半透明', { opacity: 0.6 })
 */
export function showToast(message, options = {}) {
    const {
        type = 'info',
        duration = 3000,
        closable = false,
        pauseOnHover = true,
        width,
        height,
        opacity
    } = options;

    const toast = document.getElementById('toast');
    if (!toast) {
        alert(message);
        return;
    }

    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }

    toast.innerHTML = '';
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    if (closable) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            if (toastTimer) {
                clearTimeout(toastTimer);
                toastTimer = null;
            }
        });
        toast.appendChild(closeBtn);
    }

    toastPauseOnHover = pauseOnHover;

    toast.onmouseenter = () => {
        if (!toastPauseOnHover) return;
        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
            toastRemaining -= (Date.now() - toastStartTime);
        }
    };

    toast.onmouseleave = () => {
        if (!toastPauseOnHover) return;
        if (toast.classList.contains('show') && toastRemaining > 0) {
            startToastTimer();
        }
    };

    toast.className = `toast ${type} show`;
    if (!closable) toast.classList.add('toast-no-close');

    toast.style.width = width ? (typeof width === 'number' ? width + 'px' : width) : '';
    toast.style.maxHeight = height ? (typeof height === 'number' ? height + 'px' : height) : '';
    toast.style.overflow = height ? 'hidden' : '';
    toast.style.opacity = opacity !== undefined ? String(opacity) : '';
    toastRemaining = duration;
    if (duration > 0) {
        startToastTimer();
    }
}

// HTML特殊字符转义
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
