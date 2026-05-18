import { state, APP_ID_MAP } from './state.js';

let _renderDockCallback = null;
let currentFullscreenWindowId = null;
let lastTitlebarClickTime = 0;
let lastTitlebarClickWindowId = null;
let lastDragMoveTime = 0;

export function setRenderDockCallback(cb) {
    _renderDockCallback = cb;
}

function renderDock() {
    if (_renderDockCallback) _renderDockCallback();
}

// 获取窗口容器
export function getWindowsContainer() {
    let container = document.getElementById('windowsContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'windowsContainer';
        document.body.appendChild(container);
    }
    return container;
}

// 打开应用窗口
export function openAppWindow(appId, app) {
    const existingWindows = state.windows.filter(w => w.appId === appId);

    if (existingWindows.length > 0) {
        const visibleWindow = existingWindows.find(w => !w.isMinimized);
        const minimizedWindow = existingWindows.find(w => w.isMinimized);

        if (visibleWindow) {
            bringWindowToFront(visibleWindow.id);
            return;
        } else if (minimizedWindow) {
            restoreWindow(minimizedWindow.id);
            return;
        }
    }

    const windowId = Date.now();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const windowWidth = Math.min(900, screenWidth - 100);
    const windowHeight = Math.min(600, screenHeight - 150);
    const windowX = (screenWidth - windowWidth) / 2;
    const windowY = (screenHeight - windowHeight) / 2 - 25;

    const newWindow = {
        id: windowId,
        appId: appId,
        appName: app.app_name,
        appIcon: app.icon,
        url: app.url,
        x: windowX,
        y: windowY,
        width: windowWidth,
        height: windowHeight,
        isMinimized: false,
        isMaximized: false,
        prevX: windowX,
        prevY: windowY,
        prevWidth: windowWidth,
        prevHeight: windowHeight,
        zIndex: ++state.windowZIndex
    };

    state.windows.push(newWindow);
    state.activeWindowId = windowId;

    const isFixedApp = state.dockApps.some(dockApp => dockApp.app_id === appId);
    if (!isFixedApp) {
        const existingActiveApp = state.activeApps.find(a => a.appId === appId);
        if (!existingActiveApp) {
            state.activeApps.push({
                appId: appId,
                appName: app.app_name,
                appIcon: app.icon,
                windowId: windowId
            });
        }
    }

    createWindowElement(newWindow);
    renderDock();
    bringWindowToFront(windowId);
}

// 创建窗口DOM元素
function createWindowElement(win) {
    const container = getWindowsContainer();

    const windowEl = document.createElement('div');
    windowEl.className = 'app-window active';
    windowEl.dataset.windowId = win.id;
    windowEl.style.cssText = `
        position: fixed;
        left: ${win.x}px;
        top: ${win.y}px;
        width: ${win.width}px;
        height: ${win.height}px;
        z-index: ${win.zIndex};
    `;

    windowEl.innerHTML = `
        <div class="window-titlebar" data-window-id="${win.id}">
            <div class="window-controls">
                <button class="window-btn window-btn-close" data-action="close" data-window-id="${win.id}" title="关闭"></button>
                <button class="window-btn window-btn-minimize" data-action="minimize" data-window-id="${win.id}" title="最小化"></button>
                <button class="window-btn window-btn-fullscreen" data-action="fullscreen" data-window-id="${win.id}" title="全屏"></button>
            </div>
            <div class="window-title">${win.appIcon} ${win.appName}</div>
        </div>
        <div class="window-content">
            <iframe src="${win.url}" frameborder="0" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
        </div>
        <div class="window-click-capture" data-window-id="${win.id}"></div>
        <div class="window-resize-handle resize-nw" data-direction="nw" data-window-id="${win.id}"></div>
        <div class="window-resize-handle resize-n" data-direction="n" data-window-id="${win.id}"></div>
        <div class="window-resize-handle resize-ne" data-direction="ne" data-window-id="${win.id}"></div>
        <div class="window-resize-handle resize-e" data-direction="e" data-window-id="${win.id}"></div>
        <div class="window-resize-handle resize-se" data-direction="se" data-window-id="${win.id}"></div>
        <div class="window-resize-handle resize-s" data-direction="s" data-window-id="${win.id}"></div>
        <div class="window-resize-handle resize-sw" data-direction="sw" data-window-id="${win.id}"></div>
        <div class="window-resize-handle resize-w" data-direction="w" data-window-id="${win.id}"></div>
    `;

    bindSingleWindowEvents(windowEl, win.id);

    container.appendChild(windowEl);
}

// 绑定单个窗口事件
function bindSingleWindowEvents(windowEl, windowId) {
    const titlebar = windowEl.querySelector('.window-titlebar');
    if (titlebar) {
        titlebar.addEventListener('mousedown', handleWindowTitlebarMouseDown);
        titlebar.addEventListener('mouseup', handleWindowTitlebarMouseUp);
    }

    windowEl.querySelectorAll('.window-btn').forEach(btn => {
        btn.addEventListener('click', handleWindowButtonClick);
    });

    windowEl.querySelectorAll('.window-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', handleWindowResizeStart);
    });

    const clickCapture = windowEl.querySelector('.window-click-capture');
    if (clickCapture) {
        clickCapture.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            bringWindowToFront(windowId);
        });
    }

    windowEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-controls') || e.target.closest('.window-resize-handle')) return;
        if (e.target.classList.contains('window-click-capture')) return;
        bringWindowToFront(windowId);
    });
}

// 窗口标题栏鼠标按下（拖拽开始）
function handleWindowTitlebarMouseDown(e) {
    const windowId = parseInt(e.currentTarget.dataset.windowId, 10);
    const win = state.windows.find(w => w.id === windowId);

    if (!win) return;

    if (e.target.closest('.window-controls')) return;

    state.isDraggingWindow = false;
    state.dragWindowId = windowId;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragWindowStartX = win.x;
    state.dragWindowStartY = win.y;
    state.dragShouldCheckMaximized = win.isMaximized;

    const windowEl = document.querySelector(`.app-window[data-window-id="${windowId}"]`);
    if (windowEl) {
        const iframe = windowEl.querySelector('iframe');
        if (iframe) {
            iframe.style.pointerEvents = 'none';
        }
        const resizeHandles = windowEl.querySelectorAll('.window-resize-handle');
        resizeHandles.forEach(h => {
            h.style.display = 'none';
        });
    }

    bringWindowToFront(windowId);
    e.preventDefault();
}

// 窗口标题栏鼠标抬起（双击最大化检测）
function handleWindowTitlebarMouseUp(e) {
    if (e.target.closest('.window-controls')) return;

    const windowId = parseInt(e.currentTarget.dataset.windowId, 10);

    if (state.isDraggingWindow) {
        // 正常拖拽结束：mouseup紧跟mousemove，不记录
        // 三指滑动后孤立mouseup：距离最后mousemove超过300ms，记录为一次点击
        if (Date.now() - lastDragMoveTime > 300) {
            lastTitlebarClickTime = Date.now();
            lastTitlebarClickWindowId = windowId;
        }
        return;
    }

    const now = Date.now();
    if (lastTitlebarClickWindowId === windowId && now - lastTitlebarClickTime < 500) {
        lastTitlebarClickTime = 0;
        lastTitlebarClickWindowId = null;
        toggleMaximize(windowId);
        return;
    }
    lastTitlebarClickTime = now;
    lastTitlebarClickWindowId = windowId;
}

// 窗口按钮点击
function handleWindowButtonClick(e) {
    e.stopPropagation();
    const action = e.currentTarget.dataset.action;
    const windowId = parseInt(e.currentTarget.dataset.windowId, 10);

    switch (action) {
        case 'close':
            closeWindow(windowId);
            break;
        case 'minimize':
            minimizeWindow(windowId);
            break;
        case 'fullscreen':
            toggleFullscreen(windowId);
            break;
    }
}

// 窗口缩放开始
function handleWindowResizeStart(e) {
    const direction = e.currentTarget.dataset.direction;
    const windowId = parseInt(e.currentTarget.dataset.windowId, 10);
    const win = state.windows.find(w => w.id === windowId);

    if (!win || win.isMaximized) return;

    state.isResizingWindow = true;
    state.resizeWindowId = windowId;
    state.resizeDirection = direction;
    state.resizeStartX = e.clientX;
    state.resizeStartY = e.clientY;
    state.resizeWindowStartX = win.x;
    state.resizeWindowStartY = win.y;
    state.resizeWindowStartWidth = win.width;
    state.resizeWindowStartHeight = win.height;

    const windowEl = document.querySelector(`.app-window[data-window-id="${windowId}"]`);
    if (windowEl) {
        const iframe = windowEl.querySelector('iframe');
        if (iframe) {
            iframe.style.pointerEvents = 'none';
        }
    }

    e.preventDefault();
    e.stopPropagation();
}

// 将窗口置顶
export function bringWindowToFront(windowId) {
    const win = state.windows.find(w => w.id === windowId);
    if (!win) return;

    state.activeWindowId = windowId;
    win.zIndex = ++state.windowZIndex;

    const windowEl = document.querySelector(`.app-window[data-window-id="${windowId}"]`);
    if (windowEl) {
        document.querySelectorAll('.app-window').forEach(el => {
            el.classList.remove('active');
            const capture = el.querySelector('.window-click-capture');
            if (capture) {
                capture.style.display = 'block';
            }
        });
        windowEl.classList.add('active');
        windowEl.style.zIndex = win.zIndex;

        const activeCapture = windowEl.querySelector('.window-click-capture');
        if (activeCapture) {
            activeCapture.style.display = 'none';
        }
    }
}

// 关闭窗口
export function closeWindow(windowId) {
    const winIndex = state.windows.findIndex(w => w.id === windowId);
    if (winIndex === -1) return;

    const win = state.windows[winIndex];
    const appId = win.appId;

    const windowEl = document.querySelector(`.app-window[data-window-id="${windowId}"]`);
    if (windowEl) {
        windowEl.remove();
    }

    state.windows.splice(winIndex, 1);

    const otherWindowsWithSameApp = state.windows.filter(w => w.appId === appId);
    if (otherWindowsWithSameApp.length === 0) {
        const activeAppIndex = state.activeApps.findIndex(a => a.appId === appId);
        if (activeAppIndex !== -1) {
            state.activeApps.splice(activeAppIndex, 1);
        }
    }

    if (state.activeWindowId === windowId) {
        const remainingWindows = state.windows.filter(w => !w.isMinimized);
        if (remainingWindows.length > 0) {
            state.activeWindowId = remainingWindows[remainingWindows.length - 1].id;
            bringWindowToFront(state.activeWindowId);
        } else {
            state.activeWindowId = null;
        }
    }

    renderDock();
}

// 最小化窗口
export function minimizeWindow(windowId) {
    const win = state.windows.find(w => w.id === windowId);
    if (!win) return;

    win.isMinimized = true;

    const windowEl = document.querySelector(`.app-window[data-window-id="${windowId}"]`);
    if (windowEl) {
        windowEl.classList.add('minimized');
    }

    if (state.activeWindowId === windowId) {
        const remainingWindows = state.windows.filter(w => !w.isMinimized);
        if (remainingWindows.length > 0) {
            state.activeWindowId = remainingWindows[remainingWindows.length - 1].id;
            bringWindowToFront(state.activeWindowId);
        } else {
            state.activeWindowId = null;
        }
    }

    renderDock();
}

// 恢复窗口
export function restoreWindow(windowId) {
    const win = state.windows.find(w => w.id === windowId);
    if (!win) return;

    win.isMinimized = false;
    state.activeWindowId = windowId;
    win.zIndex = ++state.windowZIndex;

    const windowEl = document.querySelector(`.app-window[data-window-id="${windowId}"]`);
    if (windowEl) {
        windowEl.classList.remove('minimized');
    }

    renderDock();
    bringWindowToFront(windowId);
}

// 切换最大化
export function toggleMaximize(windowId) {
    const win = state.windows.find(w => w.id === windowId);
    if (!win) return;

    const windowEl = document.querySelector(`.app-window[data-window-id="${windowId}"]`);
    if (!windowEl) return;

    if (win.isMaximized) {
        win.isMaximized = false;
        win.x = win.prevX;
        win.y = win.prevY;
        win.width = win.prevWidth;
        win.height = win.prevHeight;

        windowEl.classList.remove('maximized');
        windowEl.style.left = `${win.x}px`;
        windowEl.style.top = `${win.y}px`;
        windowEl.style.width = `${win.width}px`;
        windowEl.style.height = `${win.height}px`;
        windowEl.style.right = '';
        windowEl.style.bottom = '';
    } else {
        win.prevX = win.x;
        win.prevY = win.y;
        win.prevWidth = win.width;
        win.prevHeight = win.height;
        win.isMaximized = true;

        windowEl.classList.add('maximized');
        windowEl.style.left = '0';
        windowEl.style.top = '25px';
        windowEl.style.right = '0';
        windowEl.style.bottom = '0';
        windowEl.style.width = 'auto';
        windowEl.style.height = 'auto';
    }

    bringWindowToFront(windowId);
}

// 切换全屏
export function toggleFullscreen(windowId) {
    const win = state.windows.find(w => w.id === windowId);
    if (!win) return;

    const windowEl = document.querySelector(`.app-window[data-window-id="${windowId}"]`);
    if (!windowEl) return;

    if (document.fullscreenElement) {
        document.exitFullscreen();
        currentFullscreenWindowId = null;
    } else {
        currentFullscreenWindowId = windowId;
        windowEl.requestFullscreen().catch(err => {
            console.error('Fullscreen error:', err);
        });
    }
}

// 重置窗口交互状态
function resetWindowInteraction() {
    const activeWindowId = state.dragWindowId || state.resizeWindowId;

    if (activeWindowId) {
        const windowEl = document.querySelector(`.app-window[data-window-id="${activeWindowId}"]`);
        if (windowEl) {
            const iframe = windowEl.querySelector('iframe');
            if (iframe) {
                iframe.style.pointerEvents = 'auto';
            }
            const resizeHandles = windowEl.querySelectorAll('.window-resize-handle');
            resizeHandles.forEach(h => {
                h.style.display = '';
            });
        }
    }

    state.isDraggingWindow = false;
    state.dragWindowId = null;
    state.dragWindowStartX = 0;
    state.dragWindowStartY = 0;
    state.dragShouldCheckMaximized = false;
    state.isResizingWindow = false;
    state.resizeWindowId = null;
    state.resizeDirection = null;
}

// 初始化窗口相关的全局事件监听
export function initWindowListeners() {
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && currentFullscreenWindowId) {
            currentFullscreenWindowId = null;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (state.dragWindowId && !state.isDraggingWindow) {
            const deltaX = e.clientX - state.dragStartX;
            const deltaY = e.clientY - state.dragStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 5) {
                const win = state.windows.find(w => w.id === state.dragWindowId);
                if (win) {
                    if (state.dragShouldCheckMaximized && win.isMaximized) {
                        const screenWidth = window.innerWidth;
                        const screenHeight = window.innerHeight;

                        win.isMaximized = false;
                        win.x = 0;
                        win.y = 25;
                        win.width = screenWidth;
                        win.height = screenHeight - 25;

                        const windowEl = document.querySelector(`.app-window[data-window-id="${win.id}"]`);
                        if (windowEl) {
                            windowEl.classList.remove('maximized');
                            windowEl.style.left = '0px';
                            windowEl.style.top = '25px';
                            windowEl.style.width = `${screenWidth}px`;
                            windowEl.style.height = `${screenHeight - 25}px`;
                            windowEl.style.right = '';
                            windowEl.style.bottom = '';
                        }

                        state.dragWindowStartX = win.x;
                        state.dragWindowStartY = win.y;
                    }

                    state.isDraggingWindow = true;
                    lastDragMoveTime = Date.now();
                }
            }
        }

        if (state.isDraggingWindow) {
            lastDragMoveTime = Date.now();
            const win = state.windows.find(w => w.id === state.dragWindowId);
            if (win) {
                const deltaX = e.clientX - state.dragStartX;
                const deltaY = e.clientY - state.dragStartY;
                win.x = state.dragWindowStartX + deltaX;
                win.y = state.dragWindowStartY + deltaY;

                const windowEl = document.querySelector(`.app-window[data-window-id="${win.id}"]`);
                if (windowEl) {
                    windowEl.style.left = `${win.x}px`;
                    windowEl.style.top = `${win.y}px`;
                }
            }
        }

        if (state.isResizingWindow) {
            const win = state.windows.find(w => w.id === state.resizeWindowId);
            if (win) {
                const deltaX = e.clientX - state.resizeStartX;
                const deltaY = e.clientY - state.resizeStartY;
                const minWidth = 300;
                const minHeight = 200;

                switch (state.resizeDirection) {
                    case 'e':
                        win.width = Math.max(minWidth, state.resizeWindowStartWidth + deltaX);
                        break;
                    case 'se':
                        win.width = Math.max(minWidth, state.resizeWindowStartWidth + deltaX);
                        win.height = Math.max(minHeight, state.resizeWindowStartHeight + deltaY);
                        break;
                    case 's':
                        win.height = Math.max(minHeight, state.resizeWindowStartHeight + deltaY);
                        break;
                    case 'sw':
                        win.width = Math.max(minWidth, state.resizeWindowStartWidth - deltaX);
                        win.height = Math.max(minHeight, state.resizeWindowStartHeight + deltaY);
                        if (win.width > minWidth) {
                            win.x = state.resizeWindowStartX + deltaX;
                        }
                        break;
                    case 'w':
                        win.width = Math.max(minWidth, state.resizeWindowStartWidth - deltaX);
                        if (win.width > minWidth) {
                            win.x = state.resizeWindowStartX + deltaX;
                        }
                        break;
                    case 'nw':
                        win.width = Math.max(minWidth, state.resizeWindowStartWidth - deltaX);
                        win.height = Math.max(minHeight, state.resizeWindowStartHeight - deltaY);
                        if (win.width > minWidth) {
                            win.x = state.resizeWindowStartX + deltaX;
                        }
                        if (win.height > minHeight) {
                            win.y = state.resizeWindowStartY + deltaY;
                        }
                        break;
                    case 'n':
                        win.height = Math.max(minHeight, state.resizeWindowStartHeight - deltaY);
                        if (win.height > minHeight) {
                            win.y = state.resizeWindowStartY + deltaY;
                        }
                        break;
                    case 'ne':
                        win.width = Math.max(minWidth, state.resizeWindowStartWidth + deltaX);
                        win.height = Math.max(minHeight, state.resizeWindowStartHeight - deltaY);
                        if (win.height > minHeight) {
                            win.y = state.resizeWindowStartY + deltaY;
                        }
                        break;
                }

                const windowEl = document.querySelector(`.app-window[data-window-id="${win.id}"]`);
                if (windowEl) {
                    windowEl.style.left = `${win.x}px`;
                    windowEl.style.top = `${win.y}px`;
                    windowEl.style.width = `${win.width}px`;
                    windowEl.style.height = `${win.height}px`;
                }
            }
        }
    });

    document.addEventListener('mouseup', resetWindowInteraction);
    document.addEventListener('mouseleave', resetWindowInteraction);
    window.addEventListener('blur', resetWindowInteraction);
}
