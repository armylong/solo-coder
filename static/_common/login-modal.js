import { Auth } from '/static/_common/auth.js';
import { SessionData } from '/static/_common/session-data.js';
import { showLoading, hideLoading, showToast } from '/static/_common/ui.js';

let pendingCallback = null;
let currentView = 'login';
let modalOptions = {};
let overlayEl = null;
let _authResolve = null;
let _authReject = null;

// 注册401自动登录回调
Auth.setOnUnauthorized(function(resolve, reject) {
    _authResolve = resolve;
    _authReject = reject;
    showLoginModal(function() {
        _authResolve = null;
        _authReject = null;
        resolve();
    }, { closable: true });
});

// 弹出登录注册弹窗
export function showLoginModal(callback, options) {
    pendingCallback = callback || null;
    modalOptions = Object.assign({ closable: true }, options || {});
    currentView = 'login';
    render();
    requestAnimationFrame(function() {
        if (overlayEl) overlayEl.classList.add('show');
    });
}

// 关闭弹窗
export function closeLoginModal() {
    if (!overlayEl) return;
    overlayEl.classList.remove('show');
    setTimeout(function() {
        if (overlayEl) {
            overlayEl.remove();
            overlayEl = null;
        }
    }, 300);
    if (_authReject) {
        _authReject(new Error('用户取消登录'));
        _authResolve = null;
        _authReject = null;
    }
}

// 需要登录才能执行的操作，未登录则弹出登录框
export function requireLogin(callback, options) {
    if (Auth.isAuthenticated()) {
        if (callback) callback();
        return;
    }
    showLoginModal(callback, options);
}

function render() {
    if (overlayEl) overlayEl.remove();

    overlayEl = document.createElement('div');
    overlayEl.className = 'lm-overlay';

    if (!modalOptions.closable) {
        overlayEl.classList.add('lm-overlay-unclosable');
    } else {
        overlayEl.addEventListener('click', function(e) {
            if (e.target === overlayEl) closeLoginModal();
        });
    }

    var card = document.createElement('div');
    card.className = 'lm-card';
    card.innerHTML = buildCardHTML();
    overlayEl.appendChild(card);
    document.body.appendChild(overlayEl);
    bindCardEvents(card);
}

function buildCardHTML() {
    var closeBtn = modalOptions.closable
        ? '<button class="lm-close">&times;</button>'
        : '';
    var headerTitle = currentView === 'login' ? '欢迎回来' : '创建账号';
    var headerDesc = currentView === 'login' ? '登录你的账号' : '注册一个新账号';

    var formFields = '';
    if (currentView === 'login') {
        formFields =
            '<div class="lm-field">' +
                '<input type="text" id="lmAccount" placeholder="请输入账号" autocomplete="username">' +
            '</div>' +
            '<div class="lm-field">' +
                '<input type="password" id="lmPassword" placeholder="请输入密码" autocomplete="current-password">' +
            '</div>';
    } else {
        formFields =
            '<div class="lm-field">' +
                '<input type="text" id="lmAccount" placeholder="请输入账号" autocomplete="username">' +
            '</div>' +
            '<div class="lm-field">' +
                '<input type="text" id="lmName" placeholder="请输入用户名">' +
            '</div>' +
            '<div class="lm-field">' +
                '<input type="password" id="lmPassword" placeholder="请输入密码" autocomplete="new-password">' +
            '</div>' +
            '<div class="lm-field">' +
                '<input type="email" id="lmEmail" placeholder="请输入邮箱（选填）" autocomplete="email">' +
            '</div>' +
            '<div class="lm-field">' +
                '<input type="tel" id="lmPhone" placeholder="请输入手机号（选填）" autocomplete="tel">' +
            '</div>';
    }

    var submitText = currentView === 'login' ? '登 录' : '注 册';
    var switchText = currentView === 'login' ? '还没有账号？' : '已有账号？';
    var switchLink = currentView === 'login' ? '立即注册' : '去登录';
    var switchTo = currentView === 'login' ? 'register' : 'login';

    return closeBtn +
        '<div class="lm-header">' +
            '<div class="lm-title">' + headerTitle + '</div>' +
            '<div class="lm-desc">' + headerDesc + '</div>' +
        '</div>' +
        '<form class="lm-form" id="lmForm">' +
            formFields +
            '<button type="submit" class="lm-submit">' + submitText + '</button>' +
        '</form>' +
        '<div class="lm-footer">' +
            '<span>' + switchText + '</span>' +
            '<a class="lm-switch" data-view="' + switchTo + '">' + switchLink + '</a>' +
        '</div>';
}

function bindCardEvents(card) {
    var closeBtn = card.querySelector('.lm-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLoginModal);
    }

    var switchLink = card.querySelector('.lm-switch');
    if (switchLink) {
        switchLink.addEventListener('click', function(e) {
            e.preventDefault();
            currentView = this.getAttribute('data-view');
            card.innerHTML = buildCardHTML();
            bindCardEvents(card);
        });
    }

    var form = card.querySelector('#lmForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    var account = (document.getElementById('lmAccount') || {}).value;
    account = (account || '').trim();
    var password = (document.getElementById('lmPassword') || {}).value;
    password = password || '';

    if (!account || !password) {
        showToast('请输入账号和密码', { type: 'error' });
        return;
    }

    showLoading();

    try {
        var result;
        if (currentView === 'login') {
            result = await Auth.fetchApi('/auth', 'login', {
                account: account,
                password: password,
                device_type: 'web'
            }, { _noAuthRetry: true });
        } else {
            var name = (document.getElementById('lmName') || {}).value;
            name = (name || '').trim();
            var email = (document.getElementById('lmEmail') || {}).value;
            email = (email || '').trim();
            var phone = (document.getElementById('lmPhone') || {}).value;
            phone = (phone || '').trim();

            if (!name) {
                hideLoading();
                showToast('请输入用户名', { type: 'error' });
                return;
            }

            result = await Auth.fetchApi('/auth', 'register', {
                account: account,
                password: password,
                name: name,
                email: email,
                phone: phone
            }, { _noAuthRetry: true });
        }

        var data = result.data;
        if (data && data.token) {
            Auth.setToken(data.token);
            await SessionData.refresh(['user']);
            hideLoading();
            if (pendingCallback) {
                var cb = pendingCallback;
                pendingCallback = null;
                _authResolve = null;
                _authReject = null;
                cb();
            }
            closeLoginModal();
        } else {
            hideLoading();
            showToast(result.message || '操作失败', { type: 'error' });
        }
    } catch (error) {
        hideLoading();
        showToast(error.message || '操作失败', { type: 'error' });
    }
}

// 退出登录
export async function logout(callback) {
    try {
        await Auth.fetchApi('/auth', 'logout');
    } catch (error) {
        console.error('登出接口调用失败:', error);
    }
    Auth.clearToken();
    SessionData.clear();
    if (callback) callback();
}
