import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';
import { renderSidebar } from '/static/_common/sidebar.js';
import { requireLogin } from '/static/_common/login-modal.js';

const API_BASE = '/ppz_admin';
let currentDriverPage = 1;
const driverPageSize = 20;
let totalDrivers = 0;
let currentStatusFilter = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    if (!Auth.requirePermission(PERMISSION.ADMIN)) {
        return;
    }
    renderSidebar();
    loadOverview();
    loadDriverList(1);
});

// 切换管理页面
function switchPage(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`page-${pageName}`).classList.add('active');
}

// 加载概览统计
async function loadOverview() {
    try {
        const result = await Auth.fetchApi(API_BASE, 'overviewStats');
        const data = result.data;
        
        document.getElementById('totalDrivers').textContent = data.total_drivers || 0;
        document.getElementById('bannedDrivers').textContent = data.banned_drivers || 0;
        document.getElementById('totalCars').textContent = data.total_cars || 0;
    } catch (error) {
        console.error('加载概览数据失败:', error);
        showToast('加载概览数据失败: ' + error.message, 'error');
    }
}

function refreshOverview() {
    loadOverview();
}

// 按状态筛选司机
function filterByStatus() {
    currentStatusFilter = parseInt(document.getElementById('statusFilter').value);
    loadDriverList(1);
}

// 加载司机列表
async function loadDriverList(page) {
    showLoading();
    try {
        currentDriverPage = page;
        const result = await Auth.fetchApi(API_BASE, 'driverList', {
            page: page,
            page_size: driverPageSize,
            status: currentStatusFilter
        });
        const data = result.data;
        
        totalDrivers = data.total || 0;
        const drivers = data.drivers || [];
        
        renderDriverTable(drivers);
        renderDriverPagination(page, totalDrivers);
        
        document.getElementById('totalDriverCount').textContent = totalDrivers;
        document.getElementById('driverCount').textContent = totalDrivers;
    } catch (error) {
        console.error('加载司机列表失败:', error);
        showToast('加载司机列表失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 审核状态文案
function getReviewStatusText(status) {
    switch(status) {
        case 1: return '审核中';
        case 2: return '已通过';
        case 3: return '已驳回';
        default: return '未知';
    }
}

// 审核状态样式类名
function getReviewStatusClass(status) {
    switch(status) {
        case 1: return 'pending';
        case 2: return 'approved';
        case 3: return 'rejected';
        default: return '';
    }
}

// 渲染司机表格
function renderDriverTable(drivers) {
    const tbody = document.getElementById('driverTableBody');
    
    if (drivers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <p>暂无司机数据</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = drivers.map(driver => {
        const isBanned = driver.status === 2;
        const carsHtml = driver.cars && driver.cars.length > 0 
            ? driver.cars.map(car => `
                <div class="car-item">
                    <span class="car-model-link" onclick="showCarDetail(${car.id})">
                        ${escapeHtml(car.car_model)}
                    </span>
                    <span class="car-status-badge car-status-${getReviewStatusClass(car.review_status)}">
                        ${getReviewStatusText(car.review_status)}
                    </span>
                </div>
            `).join('')
            : '<span style="color: #999;">暂无车辆</span>';
        
        return `
            <tr>
                <td>${driver.uid}</td>
                <td>${escapeHtml(driver.account)}</td>
                <td>${escapeHtml(driver.name)}</td>
                <td>
                    <span class="status-badge ${isBanned ? 'status-banned' : 'status-active'}">
                        ${isBanned ? '已封禁' : '正常'}
                    </span>
                </td>
                <td class="car-list-cell">
                    ${carsHtml}
                </td>
                <td>${driver.approved_car_count || 0}</td>
                <td>
                    <div class="action-buttons">
                        ${isBanned 
                            ? `<button class="btn btn-success btn-sm" onclick="unbanDriver(${driver.uid})">解封</button>`
                            : `<button class="btn btn-danger btn-sm" onclick="openBanModal(${driver.uid}, '${escapeHtml(driver.account)}', '${escapeHtml(driver.name)}')">封禁</button>`
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 渲染司机分页
function renderDriverPagination(currentPage, totalCount) {
    const totalPages = Math.ceil(totalCount / driverPageSize) || 1;
    
    document.getElementById('prevDriverPage').disabled = currentPage <= 1;
    document.getElementById('nextDriverPage').disabled = currentPage >= totalPages;
    
    const pageNumbers = document.getElementById('driverPageNumbers');
    let html = '';
    
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<div class="page-number" onclick="goToDriverPage(1)">1</div>`;
        if (startPage > 2) {
            html += `<div class="page-ellipsis">...</div>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<div class="page-number active">${i}</div>`;
        } else {
            html += `<div class="page-number" onclick="goToDriverPage(${i})">${i}</div>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<div class="page-ellipsis">...</div>`;
        }
        html += `<div class="page-number" onclick="goToDriverPage(${totalPages})">${totalPages}</div>`;
    }
    
    pageNumbers.innerHTML = html;
}

function goToDriverPage(page) {
    loadDriverList(page);
}

function prevDriverPage() {
    if (currentDriverPage > 1) {
        loadDriverList(currentDriverPage - 1);
    }
}

function nextDriverPage() {
    const totalPages = Math.ceil(totalDrivers / driverPageSize);
    if (currentDriverPage < totalPages) {
        loadDriverList(currentDriverPage + 1);
    }
}

function refreshDriverList() {
    loadOverview();
    loadDriverList(currentDriverPage);
}

// 打开封禁弹窗
function openBanModal(uid, account, name) {
    document.getElementById('banUid').value = uid;
    document.getElementById('banReason').value = '';
    document.getElementById('banDriverInfo').innerHTML = `
        <div class="driver-row">
            <span class="driver-label">UID:</span>
            <span class="driver-value">${uid}</span>
        </div>
        <div class="driver-row">
            <span class="driver-label">账号:</span>
            <span class="driver-value">${escapeHtml(account)}</span>
        </div>
        <div class="driver-row">
            <span class="driver-label">姓名:</span>
            <span class="driver-value">${escapeHtml(name)}</span>
        </div>
    `;
    document.getElementById('banModal').classList.add('show');
}

function closeBanModal() {
    document.getElementById('banModal').classList.remove('show');
}

// 提交封禁
async function submitBan(event) {
    event.preventDefault();
    
    const uid = parseInt(document.getElementById('banUid').value);
    const banReason = document.getElementById('banReason').value.trim();
    
    if (!confirm('确定要封禁该司机吗？封禁后该司机所有车辆将被置为驳回状态，且无法添加新车辆。')) {
        return false;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'banDriver', {
            uid: uid,
            ban_reason: banReason
        });
        
        showToast('封禁成功', { type: 'success', closable: true });
        closeBanModal();
        refreshDriverList();
    } catch (error) {
        console.error('封禁司机失败:', error);
        showToast('封禁司机失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
    
    return false;
}

// 解封司机
async function unbanDriver(uid) {
    if (!confirm('确定要解封该司机吗？')) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'unbanDriver', {
            uid: uid
        });
        
        showToast('解封成功', { type: 'success', closable: true });
        refreshDriverList();
    } catch (error) {
        console.error('解封司机失败:', error);
        showToast('解封司机失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 查看车辆详情
async function showCarDetail(carId) {
    showLoading();
    try {
        const result = await Auth.fetchApi(API_BASE, 'getCarDetail', {
            car_id: carId
        });
        const data = result.data;
        
        if (!data.car) {
            showToast('获取车辆详情失败', { type: 'error', closable: true });
            return;
        }
        
        const car = data.car;
        
        document.getElementById('carDetailContent').innerHTML = `
            <div class="car-detail-container">
                <div class="car-info-section">
                    <h4>基本信息</h4>
                    <div class="car-info-list">
                        <div class="car-info-item">
                            <span class="car-info-label">车辆ID:</span>
                            <span class="car-info-value">${car.id}</span>
                        </div>
                        <div class="car-info-item">
                            <span class="car-info-label">用户ID:</span>
                            <span class="car-info-value">${car.uid}</span>
                        </div>
                        <div class="car-info-item">
                            <span class="car-info-label">车辆型号:</span>
                            <span class="car-info-value">${escapeHtml(car.car_model)}</span>
                        </div>
                        <div class="car-info-item">
                            <span class="car-info-label">座位数:</span>
                            <span class="car-info-value">${car.seats} 座</span>
                        </div>
                        <div class="car-info-item">
                            <span class="car-info-label">审核状态:</span>
                            <span class="car-info-value">
                                <span class="status-badge car-status-${getReviewStatusClass(car.review_status)}">
                                    ${getReviewStatusText(car.review_status)}
                                </span>
                            </span>
                        </div>
                        <div class="car-info-item">
                            <span class="car-info-label">创建时间:</span>
                            <span class="car-info-value">${car.created_at || '-'}</span>
                        </div>
                    </div>
                </div>
                <div class="car-info-section">
                    <h4>车辆简介</h4>
                    <p style="color: #555; line-height: 1.8; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                        ${escapeHtml(car.description) || '暂无简介'}
                    </p>
                </div>
            </div>
            <div class="car-images-section" style="margin-top: 24px;">
                <h4>相关图片</h4>
                <div class="car-images-grid">
                    <div class="car-image-card">
                        <div class="car-image-label">车辆生活照</div>
                        <div class="car-image-wrapper">
                            ${car.car_photo 
                                ? `<img src="${escapeHtml(car.car_photo)}" alt="车辆生活照" onerror="this.parentElement.innerHTML='<span class=\\'no-image\\'>图片加载失败</span>'">`
                                : '<span class="no-image">暂无图片</span>'
                            }
                        </div>
                    </div>
                    <div class="car-image-card">
                        <div class="car-image-label">行驶证照片</div>
                        <div class="car-image-wrapper">
                            ${car.license_photo 
                                ? `<img src="${escapeHtml(car.license_photo)}" alt="行驶证照片" onerror="this.parentElement.innerHTML='<span class=\\'no-image\\'>图片加载失败</span>'">`
                                : '<span class="no-image">暂无图片</span>'
                            }
                        </div>
                    </div>
                    <div class="car-image-card">
                        <div class="car-image-label">驾驶证照片</div>
                        <div class="car-image-wrapper">
                            ${car.driver_photo 
                                ? `<img src="${escapeHtml(car.driver_photo)}" alt="驾驶证照片" onerror="this.parentElement.innerHTML='<span class=\\'no-image\\'>图片加载失败</span>'">`
                                : '<span class="no-image">暂无图片</span>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('carDetailModal').classList.add('show');
    } catch (error) {
        console.error('获取车辆详情失败:', error);
        showToast('获取车辆详情失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function closeCarDetailModal() {
    document.getElementById('carDetailModal').classList.remove('show');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeBanModal();
        closeCarDetailModal();
    }
});

window.switchPage = switchPage;
window.refreshOverview = refreshOverview;
window.filterByStatus = filterByStatus;
window.goToDriverPage = goToDriverPage;
window.prevDriverPage = prevDriverPage;
window.nextDriverPage = nextDriverPage;
window.refreshDriverList = refreshDriverList;
window.openBanModal = openBanModal;
window.closeBanModal = closeBanModal;
window.submitBan = submitBan;
window.unbanDriver = unbanDriver;
window.showCarDetail = showCarDetail;
window.closeCarDetailModal = closeCarDetailModal;
