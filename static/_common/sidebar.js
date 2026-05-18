// 后台管理侧边栏菜单项
const MENU_ITEMS = [
    { icon: '📊', text: '拼拼坐概览', path: '' },
    { icon: '🚗', text: '司机管理', path: 'drivers/' },
    { icon: '✅', text: '车辆审核', path: 'car-audit/' },
    { icon: '🗺️', text: '运营区域', path: 'business-area/' },
    { icon: '🛤️', text: '运营路线', path: 'business-route/' }
];

// 计算相对基础路径
function getBasePath() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
        const adminIndex = parts.indexOf('ppz-admin');
        if (adminIndex >= 0 && adminIndex < parts.length - 1) {
            return '../'.repeat(parts.length - adminIndex - 1);
        }
    }
    return './';
}

// 获取当前激活的菜单key
function getCurrentMenuKey() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const adminIndex = parts.indexOf('ppz-admin');
    if (adminIndex >= 0 && adminIndex < parts.length - 1) {
        return parts[adminIndex + 1];
    }
    return '';
}

// 渲染侧边栏
export function renderSidebar() {
    const container = document.getElementById('sidebar');
    if (!container) return;

    const basePath = getBasePath();
    const currentKey = getCurrentMenuKey();

    const navItems = MENU_ITEMS.map(item => {
        const itemKey = item.path ? item.path.replace('/', '') : '';
        const isActive = itemKey === currentKey || (!itemKey && !currentKey);
        const href = basePath + item.path;
        return `<div class="nav-item${isActive ? ' active' : ''}" onclick="window.location.href='${href}'">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-text">${item.text}</span>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="sidebar-header">
            <h1>拼拼坐</h1>
            <span class="sidebar-subtitle">后台管理</span>
        </div>
        <nav class="sidebar-nav">
            ${navItems}
        </nav>
    `;
}
