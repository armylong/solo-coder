import { Auth } from '/static/_common/auth.js';
import { SessionData } from '/static/_common/session-data.js';
import { requireLogin } from '/static/_common/login-modal.js';

// 底部Tab导航配置
const ALL_TABS = [
    { id: 'ride', icon: '🚗', label: '拼车', href: '/static/ppz-m/' },
    { id: 'drive', icon: '📋', label: '抢单', href: '/static/ppz-m/drive/', needAuth: true, needDriver: true },
    { id: 'profile', icon: '👤', label: '我的', href: '/static/ppz-m/profile/', needAuth: true }
];

// 渲染底部Tab导航
export function renderTabNav(activeTab, isDriver) {
    const nav = document.getElementById('tabNav');
    if (!nav) return;

    const tabs = ALL_TABS.filter(tab => !tab.needDriver || isDriver);

    nav.innerHTML = tabs.map(function(tab) {
        const cls = tab.id === activeTab ? 'tab-item active' : 'tab-item';
        return '<a class="' + cls + '" data-tab="' + tab.id + '" href="' + tab.href + '">' +
            '<span class="tab-icon">' + tab.icon + '</span>' +
            '<span class="tab-label">' + tab.label + '</span>' +
        '</a>';
    }).join('');

    nav.querySelectorAll('.tab-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            var tabId = item.getAttribute('data-tab');
            var tab = ALL_TABS.find(function(t) { return t.id === tabId; });
            if (tab && tab.needAuth) {
                e.preventDefault();
                requireLogin(function() {
                    window.location.href = tab.href;
                });
            }
        });
    });
}

// 判断是否为认证司机
export function checkIsDriver(ppzUser) {
    if (!Auth.isAuthenticated()) {
        return false;
    }
    return ppzUser ? (ppzUser.car_count || 0) > 0 : false;
}
