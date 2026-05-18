import { Auth } from '/static/_common/auth.js';
import { SessionData } from '/static/_common/session-data.js';
import { showLoading, hideLoading, showToast } from '/static/_common/ui.js';
import { renderTabNav, checkIsDriver } from '/static/ppz-m/_common/tab-nav.js';
import { logout as commonLogout, requireLogin } from '/static/_common/login-modal.js';

let currentUser = null;
let isCertifiedDriver = false;

// 初始化页面
async function initPage() {
    setupEventListeners();

    if (!Auth.isAuthenticated()) {
        renderTabNav('profile', false);
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }

    await loadUserInfo();
}

function setupEventListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeEditFieldModal();
            closeChangePasswordModal();
        }
    });
}

// 加载用户信息
async function loadUserInfo() {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }

    try {
        const data = await SessionData.fetch(['user', 'ppz_user']);
        currentUser = data.user;
        const ppzUser = data.ppz_user;
        isCertifiedDriver = checkIsDriver(ppzUser);
        renderTabNav('profile', isCertifiedDriver);
        updateUserInfoDisplay();
    } catch (error) {
        console.error('获取用户数据失败:', error);
        if (error.message && (error.message.includes('登录') || error.message.includes('401'))) {
            Auth.clearToken();
            SessionData.clear();
            window.location.href = '/static/ppz-m/';
        }
    }
}

// 更新用户信息显示
function updateUserInfoDisplay() {
    if (!currentUser) {
        return;
    }

    const firstChar = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

    const avatarText = document.getElementById('avatarText');
    const editAvatarText = document.getElementById('editAvatarText');
    const userName = document.getElementById('userName');
    const userPhone = document.getElementById('userPhone');

    if (avatarText) avatarText.textContent = firstChar;
    if (editAvatarText) editAvatarText.textContent = firstChar;

    if (userName) {
        userName.innerHTML = (currentUser.name || currentUser.account);

        if (isCertifiedDriver) {
            userName.innerHTML += ' <span class="driver-tag">认证司机</span>';
        }
    }

    if (userPhone) {
        userPhone.textContent = currentUser.phone || '未绑定手机号';
    }

    const infoAccount = document.getElementById('infoAccount');
    const infoName = document.getElementById('infoName');
    const infoPhone = document.getElementById('infoPhone');
    const infoEmail = document.getElementById('infoEmail');

    if (infoAccount) infoAccount.textContent = currentUser.account || '-';
    if (infoName) infoName.textContent = currentUser.name || '点击编辑';
    if (infoPhone) infoPhone.textContent = currentUser.phone || '未绑定';
    if (infoEmail) infoEmail.textContent = currentUser.email || '未绑定';
}

function showUserInfoPage() {
    const profilePage = document.getElementById('profilePage');
    const userInfoPage = document.getElementById('userInfoPage');

    if (profilePage) profilePage.classList.add('hidden');
    if (userInfoPage) userInfoPage.classList.remove('hidden');
}

function goBackToProfile() {
    const profilePage = document.getElementById('profilePage');
    const userInfoPage = document.getElementById('userInfoPage');

    if (profilePage) profilePage.classList.remove('hidden');
    if (userInfoPage) userInfoPage.classList.add('hidden');
}

function goToCarManagement() {
    window.location.href = '/static/ppz-m/my-cars/index.html';
}

function goToAddressManagement() {
    window.location.href = '/static/ppz-m/address/index.html';
}

// 退出登录
async function logout() {
    if (!confirm('确定要退出登录吗？')) {
        return;
    }
    showLoading();
    await commonLogout(function() {
        hideLoading();
        location.reload();
    });
}

// 编辑用户字段
function editField(fieldName) {
    const editFieldName = document.getElementById('editFieldName');
    const editFieldTitle = document.getElementById('editFieldTitle');
    const editFieldValue = document.getElementById('editFieldValue');

    if (!editFieldName || !editFieldTitle || !editFieldValue) return;

    const fieldLabels = {
        name: '昵称',
        phone: '手机号',
        email: '邮箱'
    };

    const currentValue = currentUser ? currentUser[fieldName] || '' : '';

    editFieldName.value = fieldName;
    editFieldTitle.textContent = '修改' + (fieldLabels[fieldName] || fieldName);
    editFieldValue.value = currentValue;
    editFieldValue.placeholder = '请输入' + (fieldLabels[fieldName] || fieldName);

    openEditFieldModal();
}

function openEditFieldModal() {
    const modal = document.getElementById('editFieldModal');
    if (modal) modal.classList.add('show');
}

function closeEditFieldModal() {
    const modal = document.getElementById('editFieldModal');
    if (modal) modal.classList.remove('show');
}

// 提交编辑字段
async function submitEditField(e) {
    e.preventDefault();

    const fieldName = document.getElementById('editFieldName').value;
    const value = document.getElementById('editFieldValue').value.trim();

    if (!value) {
        showToast('请输入内容', { type: 'error' });
        return false;
    }

    showLoading();

    try {
        await Auth.fetchApi('/user', 'updateUserInfo', {
            [fieldName]: value
        });

        showToast('修改成功', { type: 'success' });
        closeEditFieldModal();
        SessionData.refresh(['user']).then(function() {
            loadUserInfo();
        });
    } catch (error) {
        console.error('修改失败:', error);
        showToast(error.message || '修改失败', 'error');
    } finally {
        hideLoading();
    }

    return false;
}

function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const form = document.getElementById('changePasswordForm');
    if (form) form.reset();
    if (modal) modal.classList.add('show');
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.classList.remove('show');
}

// 提交修改密码
async function submitChangePassword(e) {
    e.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
        showToast('请填写所有密码字段', { type: 'error' });
        return false;
    }

    if (newPassword !== confirmNewPassword) {
        showToast('两次输入的新密码不一致', { type: 'error' });
        return false;
    }

    showLoading();

    try {
        await Auth.fetchApi('/user', 'changePassword', {
            oldPassword: oldPassword,
            newPassword: newPassword,
            confirmNewPassword: confirmNewPassword
        });

        showToast('密码修改成功，请重新登录', { type: 'success' });
        closeChangePasswordModal();
        Auth.clearToken();
        SessionData.clear();
        window.location.href = '/static/ppz-m/';
    } catch (error) {
        console.error('修改密码失败:', error);
        showToast(error.message || '修改失败', 'error');
    } finally {
        hideLoading();
    }

    return false;
}

document.addEventListener('DOMContentLoaded', initPage);

window.goToCarManagement = goToCarManagement;
window.goToAddressManagement = goToAddressManagement;
window.goToUserInfo = showUserInfoPage;
window.goBackToProfile = goBackToProfile;
window.logout = logout;
window.editField = editField;
window.openEditFieldModal = openEditFieldModal;
window.closeEditFieldModal = closeEditFieldModal;
window.submitEditField = submitEditField;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.submitChangePassword = submitChangePassword;
