import { state, APP_ID_MAP } from './state.js';
import { openAppWindow, bringWindowToFront, minimizeWindow, restoreWindow } from './window-manager.js';

// 渲染Dock栏
export function renderDock() {
    const dockIconsContainer = document.getElementById('dockIconsContainer');
    if (!dockIconsContainer) return;

    const hasActiveApps = state.activeApps.length > 0;

    let html = '';

    state.dockApps.forEach((appData, index) => {
        const app = APP_ID_MAP[appData.app_id];
        if (!app) return;

        const isActive = state.windows.some(w => w.appId === appData.app_id);

        html += `
            <div class="dock-icon ${isActive ? 'active' : ''}"
                 data-app-id="${appData.app_id}"
                 data-app-name="${app.app_name}"
                 data-index="${index}"
                 data-is-fixed="true"
                 draggable="true">
                <div class="dock-tooltip">${app.app_name}</div>
                <div class="dock-icon-image">${app.icon}</div>
                ${isActive ? '<div class="dock-indicator"></div>' : ''}
            </div>
        `;
    });

    if (hasActiveApps) {
        html += '<div class="dock-divider"></div>';

        state.activeApps.forEach((appData, index) => {
            const isInDock = state.dockApps.some(dockApp => dockApp.app_id === appData.appId);
            if (isInDock) return;

            const isMinimized = state.windows.some(w => w.appId === appData.appId && w.isMinimized);
            const isActive = state.windows.some(w => w.appId === appData.appId && !w.isMinimized);

            html += `
                <div class="dock-icon ${isActive ? 'active' : ''} ${isMinimized ? 'minimized' : ''}"
                     data-app-id="${appData.appId}"
                     data-app-name="${appData.appName}"
                     data-is-fixed="false"
                     draggable="true">
                    <div class="dock-tooltip">${appData.appName}</div>
                    <div class="dock-icon-image">${appData.appIcon}</div>
                    ${isActive ? '<div class="dock-indicator"></div>' : ''}
                </div>
            `;
        });
    }

    dockIconsContainer.innerHTML = html;

    bindDockIconEvents();
}

// 绑定Dock图标点击事件
function bindDockIconEvents() {
    document.querySelectorAll('.dock-icon').forEach(icon => {
        icon.addEventListener('click', handleDockIconClick);
    });
}

// Dock图标点击处理
function handleDockIconClick(e) {
    const dockIcon = e.currentTarget;
    const appId = parseInt(dockIcon.dataset.appId, 10);
    const app = APP_ID_MAP[appId];

    if (!app) return;

    const openWindows = state.windows.filter(w => w.appId === appId);

    if (openWindows.length === 0) {
        openAppWindow(appId, app);
    } else {
        const visibleWindow = openWindows.find(w => !w.isMinimized);
        const minimizedWindow = openWindows.find(w => w.isMinimized);

        if (visibleWindow) {
            if (state.activeWindowId === visibleWindow.id) {
                minimizeWindow(visibleWindow.id);
            } else {
                bringWindowToFront(visibleWindow.id);
            }
        } else if (minimizedWindow) {
            restoreWindow(minimizedWindow.id);
        }
    }
}

// 绑定Dock相关事件
export function bindDockEvents() {
    const dockHandle = document.getElementById('dockHandle');
    const dock = document.getElementById('dock');

    if (dockHandle && dock) {
        dockHandle.addEventListener('mousedown', handleDockDragStart);
        document.addEventListener('mousemove', handleDockDrag);
        document.addEventListener('mouseup', handleDockDragEnd);
    }
}

// Dock拖拽开始
function handleDockDragStart(e) {
    state.isDraggingDock = true;
    state.dockDragStartX = e.clientX;
    state.dockDragStartY = e.clientY;
    e.preventDefault();
    e.stopPropagation();
}

// Dock拖拽中
function handleDockDrag(e) {
    if (!state.isDraggingDock) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const edgeThreshold = 60;
    let newPosition = state.dockPosition;

    if (mouseY < edgeThreshold) {
        newPosition = 'top';
    } else if (mouseY > screenHeight - edgeThreshold) {
        newPosition = 'bottom';
    } else if (mouseX < edgeThreshold) {
        newPosition = 'left';
    } else if (mouseX > screenWidth - edgeThreshold) {
        newPosition = 'right';
    }

    if (newPosition !== state.dockPosition) {
        state.dockPosition = newPosition;
        updateDockPosition();
    }
}

// Dock拖拽结束
function handleDockDragEnd(e) {
    if (state.isDraggingDock) {
        state.isDraggingDock = false;
        saveDockPosition();
    }
}

// 更新Dock位置样式
function updateDockPosition() {
    const dock = document.getElementById('dock');
    if (dock) {
        dock.classList.remove('dock-position-bottom', 'dock-position-top', 'dock-position-left', 'dock-position-right');
        dock.classList.add(`dock-position-${state.dockPosition}`);
    }
}

// 保存Dock位置到本地存储
export function saveDockPosition() {
    try {
        localStorage.setItem('soloCoder_dockPosition', state.dockPosition);
    } catch (e) {
        console.error('Failed to save dock position:', e);
    }
}

// 从本地存储加载Dock位置
export function loadDockPosition() {
    try {
        const savedPosition = localStorage.getItem('soloCoder_dockPosition');
        if (savedPosition && ['bottom', 'top', 'left', 'right'].includes(savedPosition)) {
            state.dockPosition = savedPosition;
        }
    } catch (e) {
        console.error('Failed to load dock position:', e);
    }
}
