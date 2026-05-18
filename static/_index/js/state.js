let APPS = [];
export const APP_MAP = {};
export const APP_ID_MAP = {};

export const state = {
    uid: null,
    user: null,
    desktopApps: [],
    dockApps: [],
    selectedIcon: null,
    dragData: null,
    loginTab: 'login',
    loginError: '',
    dockPosition: 'bottom',
    isDraggingDock: false,
    dockDragStartX: 0,
    dockDragStartY: 0,
    windows: [],
    activeWindowId: null,
    windowZIndex: 100,
    activeApps: [],
    isDraggingWindow: false,
    dragWindowId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragWindowStartX: 0,
    dragWindowStartY: 0,
    isResizingWindow: false,
    resizeWindowId: null,
    resizeDirection: null,
    resizeStartX: 0,
    resizeStartY: 0,
    resizeWindowStartWidth: 0,
    resizeWindowStartHeight: 0,
    resizeWindowStartX: 0,
    resizeWindowStartY: 0
};

// 初始化应用映射
export function initAppMap(apps) {
    APPS = apps || [];
    Object.keys(APP_MAP).forEach(key => delete APP_MAP[key]);
    Object.keys(APP_ID_MAP).forEach(key => delete APP_ID_MAP[key]);
    APPS.forEach(app => {
        APP_MAP[app.app_name] = app;
        APP_ID_MAP[app.app_id] = app;
    });
}
