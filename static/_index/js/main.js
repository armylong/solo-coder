import { Auth, PERMISSION, PERMISSION_NAMES } from '/static/_common/auth.js';
import { state, APP_MAP, APP_ID_MAP, initAppMap } from './state.js';
import { setRenderDockCallback, openAppWindow, bringWindowToFront } from './window-manager.js';
import { initWindowListeners } from './window-manager.js';
import { renderDock, bindDockEvents, loadDockPosition, saveDockPosition } from './dock.js';
import { handleMenuAction, showAboutModal, closeAboutModal, toggleAppleMenu, setReloadCallback, showLoginModal } from './menu-modal.js';

// 加载桌面系统数据
async function loadDesktopOs() {
    if (!Auth.isAuthenticated()) {
        initAppMap([]);
        state.desktopApps = [];
        state.dockApps = [];
        return;
    }

    try {
        const result = await Auth.fetchApi('/index', 'desktopOs');

        if (result.data) {
            const data = result.data;
            state.user = data.user;
            state.uid = data.user?.uid;
            initAppMap(data.apps || []);

            if (data.layout) {
                state.desktopApps = (data.layout.desktop_apps || []).map(app => ({
                    app_id: app.app_id,
                    app_name: app.app_name,
                    x: app.x,
                    y: app.y
                }));
                state.dockApps = (data.layout.dock_apps || []).map(app => ({
                    app_id: app.app_id,
                    app_name: app.app_name,
                    dock_index: app.dock_index
                }));
            }
        }
    } catch (e) {
        console.error('Failed to load desktop os:', e);
        initAppMap([]);
        state.desktopApps = [];
        state.dockApps = [];
    }
}

// 保存桌面应用位置
async function saveDesktopApp(appId, x, y) {
    if (!state.uid || !appId) return;
    try {
        await Auth.fetchApi('/settings', 'setDesktopApp', {
            uid: state.uid,
            app_id: appId,
            x: x,
            y: y
        });
    } catch (e) {
        console.error('Failed to save desktop app:', e);
    }
}

// 保存Dock应用
async function saveDockApp(appId, dockIndex) {
    if (!state.uid || !appId) return;
    try {
        await Auth.fetchApi('/settings', 'setDockApp', {
            uid: state.uid,
            app_id: appId,
            dock_index: dockIndex
        });
    } catch (e) {
        console.error('Failed to save dock app:', e);
    }
}

// 主渲染函数
function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="statusbar">
            <div class="statusbar-left">
                <div class="apple-logo">🍎</div>
                <div class="site-name">阿米龙</div>
            </div>
            <div class="statusbar-right">
                <div class="datetime" id="datetime"></div>
            </div>
        </div>

        <div class="apple-menu" id="appleMenu">
            <div class="menu-item" data-action="about">
                <span class="menu-item-icon"></span>
                <span class="menu-item-text">关于阿米龙</span>
            </div>
            <div class="menu-divider"></div>
            <div class="user-section" id="userSection">
                ${renderUserSection()}
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="settings">
                <span class="menu-item-icon">⚙️</span>
                <span class="menu-item-text">系统设置</span>
            </div>
            ${state.user ? `
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="logout">
                <span class="menu-item-icon">🚪</span>
                <span class="menu-item-text">退出登录</span>
            </div>
            ` : ''}
        </div>

        <div class="desktop" id="desktop"></div>
        <div class="dock dock-position-${state.dockPosition}" id="dock">
            <div class="dock-handle" id="dockHandle"></div>
            <div class="dock-icons-container" id="dockIconsContainer"></div>
        </div>
        <div class="dock-drop-zone" id="dockDropZone"></div>

        <div class="context-menu" id="contextMenu">
            <div class="menu-item" data-action="about-app">
                <span class="menu-item-text">关于</span>
            </div>
            <div class="menu-item" data-action="open-new-tab">
                <span class="menu-item-text">在新标签打开</span>
            </div>
            <div class="menu-divider" id="uninstallDivider" style="display: none;"></div>
            <div class="menu-item" data-action="uninstall" id="uninstallMenuItem" style="display: none;">
                <span class="menu-item-text" style="color: #ff3b30;">卸载</span>
            </div>
        </div>

        <div class="about-modal" id="aboutModal">
            <div class="about-modal-content">
                <div class="about-modal-icon" id="aboutModalIcon"></div>
                <div class="about-modal-title" id="aboutModalTitle"></div>
                <div class="about-modal-version" id="aboutModalVersion"></div>
                <div class="about-modal-description" id="aboutModalDescription"></div>
                <button class="about-modal-btn" onclick="closeAboutModal()">确定</button>
            </div>
        </div>
    `;
    renderDesktop();
    renderDock();
}

// 渲染用户区域
function renderUserSection() {
    if (state.user) {
        let adminBadge = '';
        if (Auth.isSuperAdmin()) {
            adminBadge = `<span style="color: #ff6b6b; font-size: 12px;">${PERMISSION_NAMES[PERMISSION.SUPER_ADMIN]}</span>`;
        } else if (Auth.isAdmin()) {
            adminBadge = `<span style="color: #4ecdc4; font-size: 12px;">${PERMISSION_NAMES[PERMISSION.ADMIN]}</span>`;
        }
        return `
            <div class="user-avatar">👤</div>
            <div class="user-info">
                <div class="user-name">${state.user.name || '用户'} ${adminBadge}</div>
                <div class="user-account">${state.user.account || ''}</div>
            </div>
        `;
    } else {
        return `
            <div class="user-avatar">👤</div>
            <div class="user-info">
                <div class="user-name">未登录</div>
                <div class="user-account">点击登录使用更多功能</div>
            </div>
            <button class="user-login-btn" data-action="login">登录</button>
        `;
    }
}

// 渲染桌面图标
function renderDesktop() {
    const desktop = document.getElementById('desktop');
    const desktopRect = desktop.getBoundingClientRect();
    desktop.innerHTML = state.desktopApps.map((appData, index) => {
        const app = APP_ID_MAP[appData.app_id];
        if (!app) return '';
        const x = (appData.x / 100) * desktopRect.width;
        const y = (appData.y / 100) * (desktopRect.height - 80);
        return `
            <div class="desktop-icon"
                 data-app-id="${appData.app_id}"
                 data-app-name="${app.app_name}"
                 data-index="${index}"
                 style="left: ${x}px; top: ${y}px;"
                 draggable="true">
                <div class="desktop-icon-image">${app.icon}</div>
                <div class="desktop-icon-label">${app.app_name}</div>
            </div>
        `;
    }).join('');
}

// 绑定全局事件
function bindEvents() {
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);
    bindAppleLogoEvent();
    bindDockEvents();
}

// 绑定苹果Logo点击
function bindAppleLogoEvent() {
    const appleLogo = document.querySelector('.apple-logo');
    if (appleLogo) {
        appleLogo.onclick = (e) => {
            e.stopPropagation();
            toggleAppleMenu();
        };
    }
}

// 全局点击处理
function handleGlobalClick(e) {
    const appleMenu = document.getElementById('appleMenu');
    const contextMenu = document.getElementById('contextMenu');

    if (!e.target.closest('.apple-logo') && !e.target.closest('.apple-menu')) {
        appleMenu.classList.remove('show');
    }
    contextMenu.classList.remove('show');

    if (e.target.closest('.desktop-icon')) {
        document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
        e.target.closest('.desktop-icon').classList.add('selected');
        state.selectedIcon = e.target.closest('.desktop-icon');
    } else if (!e.target.closest('.context-menu')) {
        document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('selected'));
        state.selectedIcon = null;
    }

    if (e.target.closest('.menu-item')) {
        handleMenuAction(e.target.closest('.menu-item').dataset.action);
    }
    if (e.target.closest('.user-login-btn')) {
        showLoginModal();
    }
    if (e.target.closest('.login-tab')) {
    }
}

// 右键菜单处理
function handleContextMenu(e) {
    e.preventDefault();
    const desktopIcon = e.target.closest('.desktop-icon');
    const dockIcon = e.target.closest('.dock-icon');
    if (desktopIcon || dockIcon) {
        const appId = parseInt((desktopIcon || dockIcon).dataset.appId, 10);
        const appName = (desktopIcon || dockIcon).dataset.appName;
        const app = APP_ID_MAP[appId];
        const contextMenu = document.getElementById('contextMenu');
        const uninstallDivider = document.getElementById('uninstallDivider');
        const uninstallMenuItem = document.getElementById('uninstallMenuItem');

        const isLongStore = appName === 'Long Store';

        if (isLongStore) {
            uninstallDivider.style.display = 'none';
            uninstallMenuItem.style.display = 'none';
        } else {
            uninstallDivider.style.display = 'block';
            uninstallMenuItem.style.display = 'block';
        }

        contextMenu.classList.add('show');

        const menuRect = contextMenu.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let left = e.clientX;
        let top = e.clientY;

        if (dockIcon) {
            if (top + menuRect.height > screenHeight) {
                top = e.clientY - menuRect.height;
            }
        } else {
            if (top + menuRect.height > screenHeight) {
                top = e.clientY - menuRect.height;
            }
            if (top < 25) {
                top = e.clientY;
            }
        }

        if (left + menuRect.width > screenWidth) {
            left = screenWidth - menuRect.width - 10;
        }
        if (left < 0) {
            left = 10;
        }

        contextMenu.style.left = `${left}px`;
        contextMenu.style.top = `${top}px`;
        contextMenu.dataset.targetAppId = appId;
        contextMenu.dataset.targetAppName = appName;
        contextMenu.dataset.targetAppUrl = app ? app.url : '';
    }
}

// 双击处理
function handleDoubleClick(e) {
    const desktopIcon = e.target.closest('.desktop-icon');
    const dockIcon = e.target.closest('.dock-icon');
    if (desktopIcon || dockIcon) {
        const appId = parseInt((desktopIcon || dockIcon).dataset.appId, 10);
        const app = APP_ID_MAP[appId];
        if (app && app.url) {
            openAppWindow(appId, app);
        }
    }
}

// 拖拽开始
function handleDragStart(e) {
    const desktopIcon = e.target.closest('.desktop-icon');
    const dockIcon = e.target.closest('.dock-icon');
    if (desktopIcon) {
        desktopIcon.classList.add('dragging');
        state.dragData = {
            type: 'desktop',
            app_id: parseInt(desktopIcon.dataset.appId, 10),
            app_name: desktopIcon.dataset.appName,
            index: parseInt(desktopIcon.dataset.index, 10)
        };
        e.dataTransfer.effectAllowed = 'move';
    } else if (dockIcon) {
        dockIcon.classList.add('dragging');
        state.dragData = {
            type: 'dock',
            app_id: parseInt(dockIcon.dataset.appId, 10),
            app_name: dockIcon.dataset.appName,
            index: parseInt(dockIcon.dataset.index, 10)
        };
        e.dataTransfer.effectAllowed = 'move';
    }
}

// 判断鼠标是否在Dock上
function isMouseOverDock(clientX, clientY) {
    const dock = document.getElementById('dock');
    if (!dock) return false;

    const dockRect = dock.getBoundingClientRect();
    return clientX >= dockRect.left && clientX <= dockRect.right &&
           clientY >= dockRect.top && clientY <= dockRect.bottom;
}

// 拖拽经过
function handleDragOver(e) {
    e.preventDefault();
    const dockDropZone = document.getElementById('dockDropZone');

    if (isMouseOverDock(e.clientX, e.clientY)) {
        dockDropZone.classList.add('active');

        if (state.dragData && state.dragData.type === 'dock') {
            updateDragIndicator(e.clientX, e.clientY);
        }
    } else {
        dockDropZone.classList.remove('active');
        clearDragIndicator();
    }
}

// 更新拖拽指示器
function updateDragIndicator(clientX, clientY) {
    clearDragIndicator();

    const dockIconsContainer = document.getElementById('dockIconsContainer');
    if (!dockIconsContainer) return;

    const icons = dockIconsContainer.querySelectorAll('.dock-icon[data-is-fixed="true"]');
    if (icons.length === 0) return;

    let insertIndex = icons.length;

    for (let i = 0; i < icons.length; i++) {
        const iconRect = icons[i].getBoundingClientRect();
        const isHorizontal = state.dockPosition === 'bottom' || state.dockPosition === 'top';

        if (isHorizontal) {
            const iconCenterX = iconRect.left + iconRect.width / 2;
            if (clientX < iconCenterX) {
                insertIndex = i;
                break;
            }
        } else {
            const iconCenterY = iconRect.top + iconRect.height / 2;
            if (clientY < iconCenterY) {
                insertIndex = i;
                break;
            }
        }
    }

    state.dragData.targetIndex = insertIndex;

    const indicator = document.createElement('div');
    indicator.className = 'dock-drag-indicator';
    indicator.id = 'dockDragIndicator';

    if (insertIndex < icons.length) {
        const targetIcon = icons[insertIndex];
        const targetRect = targetIcon.getBoundingClientRect();
        const isHorizontal = state.dockPosition === 'bottom' || state.dockPosition === 'top';

        if (isHorizontal) {
            indicator.style.left = `${targetRect.left}px`;
            indicator.style.top = `${targetRect.top}px`;
            indicator.style.height = `${targetRect.height}px`;
        } else {
            indicator.style.left = `${targetRect.left}px`;
            indicator.style.top = `${targetRect.top}px`;
            indicator.style.width = `${targetRect.width}px`;
        }
    } else if (icons.length > 0) {
        const lastIcon = icons[icons.length - 1];
        const lastRect = lastIcon.getBoundingClientRect();
        const isHorizontal = state.dockPosition === 'bottom' || state.dockPosition === 'top';

        if (isHorizontal) {
            indicator.style.left = `${lastRect.right}px`;
            indicator.style.top = `${lastRect.top}px`;
            indicator.style.height = `${lastRect.height}px`;
        } else {
            indicator.style.left = `${lastRect.left}px`;
            indicator.style.top = `${lastRect.bottom}px`;
            indicator.style.width = `${lastRect.width}px`;
        }
    }

    document.body.appendChild(indicator);
}

// 清除拖拽指示器
function clearDragIndicator() {
    const indicator = document.getElementById('dockDragIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// 拖拽放下
async function handleDrop(e) {
    e.preventDefault();
    if (!state.dragData) return;

    const dockDropZone = document.getElementById('dockDropZone');
    dockDropZone.classList.remove('active');
    clearDragIndicator();

    const isDroppingToDock = isMouseOverDock(e.clientX, e.clientY);
    const desktop = document.getElementById('desktop');
    const desktopRect = desktop.getBoundingClientRect();

    if (state.dragData.type === 'desktop' && isDroppingToDock) {
        const appData = state.desktopApps[state.dragData.index];
        state.desktopApps.splice(state.dragData.index, 1);
        const newDockIndex = state.dockApps.length;
        state.dockApps.push({
            app_id: appData.app_id,
            app_name: appData.app_name,
            dock_index: newDockIndex
        });
        await saveDockApp(appData.app_id, newDockIndex);
        renderDesktop();
        renderDock();
    } else if (state.dragData.type === 'dock' && !isDroppingToDock) {
        const appData = state.dockApps[state.dragData.index];
        state.dockApps.splice(state.dragData.index, 1);
        const newX = Math.round(((e.clientX - desktopRect.left) / desktopRect.width) * 100);
        const newY = Math.round(((e.clientY - desktopRect.top - 25) / (desktopRect.height - 80)) * 100);
        state.desktopApps.push({
            app_id: appData.app_id,
            app_name: appData.app_name,
            x: newX,
            y: newY
        });
        await saveDesktopApp(appData.app_id, newX, newY);

        await reorderDockApps();

        renderDesktop();
        renderDock();
    } else if (state.dragData.type === 'desktop' && !isDroppingToDock) {
        const appData = state.desktopApps[state.dragData.index];
        const newX = Math.round(((e.clientX - desktopRect.left) / desktopRect.width) * 100);
        const newY = Math.round(((e.clientY - desktopRect.top - 25) / (desktopRect.height - 80)) * 100);
        appData.x = newX;
        appData.y = newY;
        await saveDesktopApp(appData.app_id, newX, newY);
        renderDesktop();
    } else if (state.dragData.type === 'dock' && isDroppingToDock) {
        const fromIndex = state.dragData.index;
        const toIndex = state.dragData.targetIndex !== undefined ? state.dragData.targetIndex : fromIndex;

        if (fromIndex !== toIndex) {
            const appData = state.dockApps[fromIndex];

            state.dockApps.splice(fromIndex, 1);

            const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
            state.dockApps.splice(adjustedToIndex, 0, appData);

            await reorderDockApps();

            renderDock();
        }
    }
}

// 重新排序Dock应用
async function reorderDockApps() {
    for (let i = 0; i < state.dockApps.length; i++) {
        state.dockApps[i].dock_index = i;
        await saveDockApp(state.dockApps[i].app_id, i);
    }
}

// 拖拽结束
function handleDragEnd(e) {
    document.querySelectorAll('.desktop-icon.dragging, .dock-icon.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
    document.getElementById('dockDropZone').classList.remove('active');
    state.dragData = null;
}

// 启动时钟
function startClock() {
    function updateClock() {
        const now = new Date();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const datetimeEl = document.getElementById('datetime');
        if (datetimeEl) {
            datetimeEl.textContent = `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// 初始化
async function init() {
    setRenderDockCallback(renderDock);
    setReloadCallback(async () => {
        await loadDesktopOs();
        render();
        bindAppleLogoEvent();
        renderDesktop();
        renderDock();
    });

    loadDockPosition();
    await loadDesktopOs();
    render();
    bindEvents();
    initWindowListeners();
    startClock();
}

window.closeAboutModal = closeAboutModal;

init();
