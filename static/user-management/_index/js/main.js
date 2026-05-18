import { Auth, PERMISSION, PERMISSION_NAMES } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';
import { requireLogin } from '/static/_common/login-modal.js';

const API_BASE = '/user_management';
let currentPage = 1;
const pageSize = 20;
let totalUsers = 0;
const myPermission = Auth.getUserPermission();

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    if (!Auth.requirePermission(PERMISSION.ADMIN)) {
        return;
    }
    loadStats();
    loadUserList(1);
});

async function loadStats() {
    try {
        const result = await Auth.fetchApi(API_BASE, 'stats');
        const data = result.data;
        document.getElementById('totalUsers').textContent = data.total_users;
        document.getElementById('adminUsers').textContent = data.admin_users;
    } catch (error) {
        console.error('加载统计数据失败:', error);
        showToast('加载统计数据失败: ' + error.message, 'error');
    }
}

async function loadUserList(page) {
    showLoading();
    try {
        currentPage = page;
        const result = await Auth.fetchApi(API_BASE, 'userList', {
            page: page,
            page_size: pageSize
        });
        const data = result.data;
        
        totalUsers = data.total || 0;
        const users = data.users || [];
        
        renderUserTable(users);
        renderPagination(page, totalUsers);
        
        document.getElementById('totalCount').textContent = totalUsers;
    } catch (error) {
        console.error('加载用户列表失败:', error);
        showToast('加载用户列表失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function getPermissionBadgeClass(permission) {
    switch (permission) {
        case PERMISSION.SUPER_ADMIN:
            return 'permission-super';
        case PERMISSION.ADMIN:
            return 'permission-admin';
        default:
            return 'permission-normal';
    }
}

function canOperate(targetPermission) {
    return myPermission > targetPermission;
}

function renderUserTable(users) {
    const tbody = document.getElementById('userTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <p>暂无用户数据</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const permBadge = `<span class="permission-badge ${getPermissionBadgeClass(user.permission)}">${PERMISSION_NAMES[user.permission] || PERMISSION_NAMES[PERMISSION.NORMAL]}</span>`;
        const canOp = canOperate(user.permission);
        const actions = canOp ? `
                    ${user.status === 1 
                        ? `<button class="btn btn-danger btn-sm" onclick="banUser(${user.uid})">封禁</button>`
                        : `<button class="btn btn-success btn-sm" onclick="unbanUser(${user.uid})">解封</button>`
                    }
                    <button class="btn btn-warning btn-sm" onclick="kickoffUser(${user.uid})">踢下线</button>
                    <button class="btn btn-info btn-sm" onclick="openPasswordModal(${user.uid})">修改密码</button>
                    ${user.permission >= PERMISSION.ADMIN
                        ? `<button class="btn btn-secondary btn-sm" onclick="removeAdmin(${user.uid})">取消管理员</button>`
                        : `<button class="btn btn-primary btn-sm" onclick="setAdmin(${user.uid})">设置管理员</button>`
                    }
                ` : '';

        return `
        <tr>
            <td>${user.uid}</td>
            <td>${escapeHtml(user.account)}</td>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email || '-')}</td>
            <td>${escapeHtml(user.phone || '-')}</td>
            <td>
                <span class="status-badge ${user.status === 1 ? 'status-active' : 'status-disabled'}">
                    ${user.status === 1 ? '正常' : '禁用'}
                </span>
            </td>
            <td>${permBadge}</td>
            <td>
                <div class="action-buttons">
                    ${actions}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function renderPagination(currentPage, totalCount) {
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
    
    const pageNumbers = document.getElementById('pageNumbers');
    let html = '';
    
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<div class="page-number" onclick="goToPage(1)">1</div>`;
        if (startPage > 2) {
            html += `<div class="page-ellipsis">...</div>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<div class="page-number active">${i}</div>`;
        } else {
            html += `<div class="page-number" onclick="goToPage(${i})">${i}</div>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<div class="page-ellipsis">...</div>`;
        }
        html += `<div class="page-number" onclick="goToPage(${totalPages})">${totalPages}</div>`;
    }
    
    pageNumbers.innerHTML = html;
}

function goToPage(page) {
    loadUserList(page);
}

function prevPage() {
    if (currentPage > 1) {
        loadUserList(currentPage - 1);
    }
}

function nextPage() {
    const totalPages = Math.ceil(totalUsers / pageSize);
    if (currentPage < totalPages) {
        loadUserList(currentPage + 1);
    }
}

function refreshUserList() {
    loadStats();
    loadUserList(currentPage);
}

async function banUser(uid) {
    if (!confirm('确定要封禁该用户吗？')) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'updateStatus', { uid: uid, status: 0 });
        showToast('封禁成功', { type: 'success', closable: true });
        refreshUserList();
    } catch (error) {
        console.error('封禁用户失败:', error);
        showToast('封禁用户失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function unbanUser(uid) {
    if (!confirm('确定要解封该用户吗？')) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'updateStatus', { uid: uid, status: 1 });
        showToast('解封成功', { type: 'success', closable: true });
        refreshUserList();
    } catch (error) {
        console.error('解封用户失败:', error);
        showToast('解封用户失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function kickoffUser(uid) {
    if (!confirm('确定要踢该用户下线吗？')) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'kickoff', { uid: uid, device_type: '' });
        showToast('踢下线成功', { type: 'success', closable: true });
    } catch (error) {
        console.error('踢下线失败:', error);
        showToast('踢下线失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function openPasswordModal(uid) {
    document.getElementById('passwordUid').value = uid;
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('passwordModal').classList.add('show');
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('show');
}

async function submitPassword(event) {
    event.preventDefault();
    
    const uid = parseInt(document.getElementById('passwordUid').value);
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('两次输入的密码不一致', { type: 'error', closable: true });
        return false;
    }
    
    if (newPassword.length < 6) {
        showToast('密码长度至少为6位', { type: 'error', closable: true });
        return false;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'updatePassword', { uid: uid, new_password: newPassword });
        showToast('密码修改成功', { type: 'success', closable: true });
        closePasswordModal();
    } catch (error) {
        console.error('修改密码失败:', error);
        showToast('修改密码失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
    
    return false;
}

async function setAdmin(uid) {
    if (!confirm('确定要设置该用户为管理员吗？')) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'updateAdmin', { uid: uid, is_admin: true });
        showToast('设置管理员成功', { type: 'success', closable: true });
        refreshUserList();
    } catch (error) {
        console.error('设置管理员失败:', error);
        showToast('设置管理员失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function removeAdmin(uid) {
    if (!confirm('确定要取消该用户的管理员权限吗？')) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'updateAdmin', { uid: uid, is_admin: false });
        showToast('取消管理员成功', { type: 'success', closable: true });
        refreshUserList();
    } catch (error) {
        console.error('取消管理员失败:', error);
        showToast('取消管理员失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closePasswordModal();
    }
});

window.banUser = banUser;
window.unbanUser = unbanUser;
window.kickoffUser = kickoffUser;
window.openPasswordModal = openPasswordModal;
window.closePasswordModal = closePasswordModal;
window.submitPassword = submitPassword;
window.setAdmin = setAdmin;
window.removeAdmin = removeAdmin;
window.goToPage = goToPage;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.refreshUserList = refreshUserList;
