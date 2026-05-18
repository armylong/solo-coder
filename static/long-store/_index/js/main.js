import { Auth, PERMISSION, PERMISSION_NAMES } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';

const API_BASE = '/long_store';

let currentTab = 'applications';
let applications = [];
let games = [];
let confirmCallback = null;
let staticPathsLoaded = false;
let staticPathsData = [];

document.addEventListener('DOMContentLoaded', () => {
    if (Auth.isSuperAdmin()) {
        document.getElementById('addAppBtn').style.display = 'flex';
        document.getElementById('batchAddBtn').style.display = 'flex';
    }

    const permissionSelect = document.getElementById('appPermission');
    if (permissionSelect) {
        Object.entries(PERMISSION_NAMES).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            permissionSelect.appendChild(option);
        });
    }

    loadAppList();

    const quickInput = document.getElementById('quickSelectInput');
    if (quickInput) {
        quickInput.addEventListener('focus', function() {
            showPathDropdown(this.value);
        });
        quickInput.addEventListener('input', function() {
            showPathDropdown(this.value);
        });
    }

    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('pathDropdown');
        if (dropdown && !e.target.closest('.quick-select')) {
            dropdown.classList.remove('show');
        }
    });
});

function showConfirm(icon, title, message, callback) {
    document.getElementById('confirmIcon').textContent = icon;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
    confirmCallback = null;
}

async function loadAppList() {
    showLoading();
    try {
        const result = await Auth.fetchApi(API_BASE, 'list');
        const data = result.data;
        applications = data.applications || [];
        games = data.games || [];
        
        renderApplications();
        renderGames();
    } catch (error) {
        console.error('加载应用列表失败:', error);
        showToast('加载应用列表失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function refreshAppList() {
    loadAppList();
}

function renderAppCard(app) {
    const permissionLabel = app.permission > PERMISSION.NORMAL ? PERMISSION_NAMES[app.permission] : '';
    const permissionBadgeClass = app.permission === PERMISSION.SUPER_ADMIN ? 'badge-super-admin' : app.permission === PERMISSION.ADMIN ? 'badge-admin' : '';
    const showPermissionBadge = app.permission !== PERMISSION.NORMAL;
    
    const installBtnClass = app.is_installed ? 'btn-uninstall' : 'btn-install';
    const installBtnText = app.is_installed ? '卸载' : '安装';
    
    let adminButtons = '';
    if (Auth.isSuperAdmin()) {
        adminButtons = `
            <button class="btn btn-sm btn-edit" onclick="editApp(${app.app_id})" title="编辑">
                ✏️
            </button>
            <button class="btn btn-sm btn-delete" onclick="confirmDeleteApp(${app.app_id}, '${escapeHtml(app.app_name)}')" title="删除">
                🗑️
            </button>
        `;
    }
    
    return `
        <div class="app-card" data-app-id="${app.app_id}">
            <div class="app-icon">${app.icon || '📱'}</div>
            <div class="app-info">
                <div class="app-name-row">
                    <span class="app-name">${escapeHtml(app.app_name)}</span>
                    ${showPermissionBadge ? `<span class="permission-badge ${permissionBadgeClass}">${permissionLabel}</span>` : ''}
                </div>
                <p class="app-desc">${escapeHtml(app.desc) || '暂无描述'}</p>
            </div>
            <div class="app-actions">
                <div class="action-top">
                    ${adminButtons}
                </div>
                <button class="btn ${installBtnClass}" onclick="toggleInstall(${app.app_id}, ${app.is_installed})">
                    ${installBtnText}
                </button>
            </div>
        </div>
    `;
}

function renderApplications() {
    const grid = document.getElementById('applicationsGrid');
    const countEl = document.getElementById('applicationsCount');
    
    countEl.textContent = `${applications.length} 个应用`;
    
    if (applications.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📱</div>
                <p>暂无可用应用</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = applications.map(app => renderAppCard(app)).join('');
}

function renderGames() {
    const grid = document.getElementById('gamesGrid');
    const countEl = document.getElementById('gamesCount');
    
    countEl.textContent = `${games.length} 个游戏`;
    
    if (games.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎮</div>
                <p>暂无可用游戏</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = games.map(app => renderAppCard(app)).join('');
}

function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });
    
    document.getElementById('applicationsSection').style.display = tab === 'applications' ? 'block' : 'none';
    document.getElementById('gamesSection').style.display = tab === 'games' ? 'block' : 'none';
}

async function toggleInstall(appId, isInstalled) {
    showLoading();
    try {
        const action = isInstalled ? 'uninstall' : 'install';
        await Auth.fetchApi(API_BASE, action, { app_id: appId });
        
        showToast(isInstalled ? '卸载成功' : '安装成功', 'success');
        
        const updateApp = (apps) => {
            return apps.map(app => {
                if (app.app_id === appId) {
                    return { ...app, is_installed: !isInstalled };
                }
                return app;
            });
        };
        
        applications = updateApp(applications);
        games = updateApp(games);
        
        renderApplications();
        renderGames();
    } catch (error) {
        console.error('操作失败:', error);
        showToast('操作失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function showAddAppModal() {
    document.getElementById('modalTitle').textContent = '添加应用';
    document.getElementById('editAppId').value = '';
    document.getElementById('appName').value = '';
    document.getElementById('appIcon').value = '';
    document.getElementById('appUrl').value = '';
    document.getElementById('appDesc').value = '';
    document.getElementById('appType').value = '1';
    document.getElementById('appPermission').value = '0';
    document.getElementById('addAppModal').classList.add('show');
    loadStaticPaths();
}

function editApp(appId) {
    const allApps = [...applications, ...games];
    const app = allApps.find(a => a.app_id === appId);
    
    if (!app) {
        showToast('应用不存在', { type: 'error', closable: true });
        return;
    }
    
    document.getElementById('modalTitle').textContent = '编辑应用';
    document.getElementById('editAppId').value = appId;
    document.getElementById('appName').value = app.app_name;
    document.getElementById('appIcon').value = app.icon || '';
    document.getElementById('appUrl').value = app.url;
    document.getElementById('appDesc').value = app.desc || '';
    document.getElementById('appType').value = app.type.toString();
    document.getElementById('appPermission').value = app.permission.toString();
    document.getElementById('addAppModal').classList.add('show');
    loadStaticPaths();
}

function closeAddAppModal() {
    document.getElementById('addAppModal').classList.remove('show');
}

async function loadStaticPaths() {
    if (staticPathsLoaded) return;
    try {
        const result = await Auth.fetchApi(API_BASE, 'staticPaths');
        const data = result.data;
        if (data.paths) {
            staticPathsData = data.paths;
            const datalist = document.getElementById('staticPathsList');
            if (datalist) {
                datalist.innerHTML = data.paths.map(p => `<option value="${p.path}">`).join('');
            }
            staticPathsLoaded = true;
        }
    } catch (e) {
        console.error('加载静态路径失败:', e);
    }
}

function showPathDropdown(filter) {
    const dropdown = document.getElementById('pathDropdown');
    if (!staticPathsData.length) return;

    const keyword = (filter || '').toLowerCase();
    const filtered = keyword
        ? staticPathsData.filter(p => p.name.toLowerCase().includes(keyword) || p.path.toLowerCase().includes(keyword))
        : staticPathsData;

    if (!filtered.length) {
        dropdown.classList.remove('show');
        return;
    }

    dropdown.innerHTML = filtered.map((p, i) => `
        <div class="path-dropdown-item" data-index="${i}">
            <div class="item-name">${p.name} <span class="item-type-badge">${p.type === 2 ? '游戏' : '应用'}</span></div>
            <div class="item-path">${p.path}</div>
            ${p.desc ? `<div class="item-desc">${p.desc}</div>` : ''}
        </div>
    `).join('');
    dropdown.classList.add('show');

    dropdown.querySelectorAll('.path-dropdown-item').forEach(el => {
        el.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            const item = filtered[idx];
            document.getElementById('appUrl').value = item.path;
            document.getElementById('appName').value = item.name;
            document.getElementById('appIcon').value = item.name.charAt(0);
            document.getElementById('appType').value = item.type.toString();
            document.getElementById('appPermission').value = item.permission.toString();
            if (item.desc) {
                document.getElementById('appDesc').value = item.desc;
            }
            dropdown.classList.remove('show');
        });
    });
}

async function batchAddApps() {
    const btn = document.getElementById('batchAddBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> 添加中...';

    try {
        await loadStaticPaths();
        if (!staticPathsData.length) {
            showToast('未获取到应用列表', { type: 'error', closable: true });
            return;
        }

        let added = 0;
        let skipped = 0;
        for (const item of staticPathsData) {
            try {
                await Auth.fetchApi(API_BASE, 'add', {
                    app_name: item.name,
                    url: item.path,
                    desc: item.desc || '',
                    icon: item.name.charAt(0),
                    type: item.type || 1,
                    permission: item.permission || 0
                });
                added++;
            } catch (e) {
                skipped++;
            }
        }
        showToast(`添加完成：新增 ${added} 个，跳过 ${skipped} 个`, 'success');
        loadAppList();
    } catch (e) {
        showToast('一键添加失败: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡</span> 一键添加';
    }
}

async function submitAppForm(event) {
    event.preventDefault();
    
    const editAppId = document.getElementById('editAppId').value;
    const isEdit = editAppId !== '';
    
    const data = {
        app_name: document.getElementById('appName').value.trim(),
        icon: document.getElementById('appIcon').value.trim() || '📱',
        url: document.getElementById('appUrl').value.trim(),
        desc: document.getElementById('appDesc').value.trim(),
        type: parseInt(document.getElementById('appType').value),
        permission: parseInt(document.getElementById('appPermission').value)
    };
    
    if (!data.app_name) {
        showToast('请输入应用名称', { type: 'error', closable: true });
        return;
    }
    if (!data.url) {
        showToast('请输入应用URL', { type: 'error', closable: true });
        return;
    }
    
    showLoading();
    try {
        if (isEdit) {
            data.app_id = parseInt(editAppId);
            await Auth.fetchApi(API_BASE, 'update', data);
        } else {
            await Auth.fetchApi(API_BASE, 'add', data);
        }
        
        showToast(isEdit ? '更新成功' : '添加成功', 'success');
        closeAddAppModal();
        loadAppList();
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
    
    return false;
}

function confirmDeleteApp(appId, appName) {
    showConfirm('🗑️', '删除应用', `确定要删除应用"${appName}"吗？`, async () => {
        showLoading();
        try {
            await Auth.fetchApi(API_BASE, 'delete', { app_id: appId });
            showToast('删除成功', { type: 'success', closable: true });
            loadAppList();
        } catch (error) {
            console.error('删除失败:', error);
            showToast('删除失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
}

document.getElementById('confirmBtn').addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback();
    }
    closeConfirmModal();
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeAddAppModal();
        closeConfirmModal();
    }
});

window.switchTab = switchTab;
window.toggleInstall = toggleInstall;
window.editApp = editApp;
window.confirmDeleteApp = confirmDeleteApp;
window.showAddAppModal = showAddAppModal;
window.closeAddAppModal = closeAddAppModal;
window.submitAppForm = submitAppForm;
window.closeConfirmModal = closeConfirmModal;
window.refreshAppList = refreshAppList;
window.batchAddApps = batchAddApps;
