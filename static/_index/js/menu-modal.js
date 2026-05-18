import { state, APP_ID_MAP } from './state.js';
import { showLoginModal as showCommonLoginModal, logout as commonLogout } from '/static/_common/login-modal.js';

let _reloadCallback = null;

export function setReloadCallback(cb) {
    _reloadCallback = cb;
}

function reload() {
    if (_reloadCallback) _reloadCallback();
}

// 处理菜单动作
export async function handleMenuAction(action) {
    const contextMenu = document.getElementById('contextMenu');
    switch (action) {
        case 'about':
            showAboutModal({
                icon: '🍎',
                app_name: '阿米龙',
                desc: '阿米龙是一个综合应用平台，提供棋牌游戏、休闲游戏等多种娱乐应用。'
            });
            break;
        case 'settings':
            alert('系统设置功能开发中...');
            break;
        case 'about-app':
            const appId = parseInt(contextMenu.dataset.targetAppId, 10);
            const app = APP_ID_MAP[appId];
            if (app) showAboutModal(app);
            break;
        case 'open-new-tab':
            const appUrl = contextMenu.dataset.targetAppUrl;
            if (appUrl) {
                window.open(appUrl, '_blank');
            }
            break;
        case 'uninstall':
            await handleUninstall(contextMenu);
            break;
        case 'login':
            showLoginModal();
            break;
        case 'logout':
            await handleLogout();
            break;
    }
    document.getElementById('appleMenu').classList.remove('show');
    contextMenu.classList.remove('show');
}

// 卸载应用
async function handleUninstall(contextMenu) {
    const appId = parseInt(contextMenu.dataset.targetAppId, 10);
    const appName = contextMenu.dataset.targetAppName;

    if (!confirm(`确定要卸载应用"${appName}"吗？`)) {
        return;
    }

    try {
        const result = await Auth.fetchApi('/long_store', 'uninstall', {
            app_id: appId
        });

        if (result.data && result.data.success) {
            reload();
        } else {
            alert(result.message || '卸载失败');
        }
    } catch (e) {
        console.error('Uninstall failed:', e);
        alert('卸载失败: ' + e.message);
    }
}

// 显示关于弹窗
export function showAboutModal(app) {
    document.getElementById('aboutModalIcon').textContent = app.icon || '📱';
    document.getElementById('aboutModalTitle').textContent = app.app_name || '应用';
    document.getElementById('aboutModalVersion').textContent = '版本 1.0.0';
    document.getElementById('aboutModalDescription').textContent = app.desc || '';
    document.getElementById('aboutModal').classList.add('show');
}

// 关闭关于弹窗
export function closeAboutModal() {
    document.getElementById('aboutModal').classList.remove('show');
}

// 切换苹果菜单
export function toggleAppleMenu() {
    document.getElementById('appleMenu').classList.toggle('show');
}

// 显示登录弹窗
export function showLoginModal() {
    document.getElementById('appleMenu').classList.remove('show');
    showCommonLoginModal(function() {
        reload();
    });
}

// 退出登录
export async function handleLogout() {
    await commonLogout(function() {
        state.user = null;
        state.uid = null;
        state.desktopApps = [];
        state.dockApps = [];
        reload();
    });
}
