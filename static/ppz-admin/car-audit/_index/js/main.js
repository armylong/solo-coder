import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';
import { renderSidebar } from '/static/_common/sidebar.js';
import { requireLogin } from '/static/_common/login-modal.js';

const API_BASE = '/ppz_admin';
let currentAuditPage = 1;
const auditPageSize = 20;
let totalAudits = 0;
let currentTab = 'pending';
let currentFilters = {
    uid: 0,
    account: '',
    name: '',
    phone: ''
};

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
    loadAuditList(1);
});

// 获取tab对应的审核状态值
function getTabAuditStatus(tab) {
    switch(tab) {
        case 'pending': return 1;
        case 'approved': return 2;
        case 'rejected': return 3;
        default: return 1;
    }
}

// 审核状态文案
function getAuditStatusText(status) {
    switch(status) {
        case 1: return '待审核';
        case 2: return '已通过';
        case 3: return '已驳回';
        default: return '未知';
    }
}

// 审核状态样式类名
function getAuditStatusClass(status) {
    switch(status) {
        case 1: return 'car-status-pending';
        case 2: return 'car-status-approved';
        case 3: return 'car-status-rejected';
        default: return '';
    }
}

// 加载审核概览统计
async function loadOverview() {
    try {
        const result = await Auth.fetchApi(API_BASE, 'carAuditOverviewStats');
        const data = result.data;
        
        const pendingCount = data.pending_count || 0;
        const approvedCount = data.approved_count || 0;
        const rejectedCount = data.rejected_count || 0;
        
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('approvedCount').textContent = approvedCount;
        document.getElementById('rejectedCount').textContent = rejectedCount;
        
        document.getElementById('tabPendingCount').textContent = pendingCount;
        document.getElementById('tabApprovedCount').textContent = approvedCount;
        document.getElementById('tabRejectedCount').textContent = rejectedCount;
    } catch (error) {
        console.error('加载概览数据失败:', error);
        showToast('加载概览数据失败: ' + error.message, 'error');
    }
}

// 切换审核tab
function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });
    
    loadAuditList(1);
}

// 应用筛选条件
function applyFilters() {
    currentFilters = {
        uid: parseInt(document.getElementById('filterUid').value) || 0,
        account: document.getElementById('filterAccount').value.trim(),
        name: document.getElementById('filterName').value.trim(),
        phone: document.getElementById('filterPhone').value.trim()
    };
    loadAuditList(1);
}

// 重置筛选条件
function resetFilters() {
    document.getElementById('filterUid').value = '';
    document.getElementById('filterAccount').value = '';
    document.getElementById('filterName').value = '';
    document.getElementById('filterPhone').value = '';
    
    currentFilters = {
        uid: 0,
        account: '',
        name: '',
        phone: ''
    };
    loadAuditList(1);
}

// 加载审核列表
async function loadAuditList(page) {
    showLoading();
    try {
        currentAuditPage = page;
        const result = await Auth.fetchApi(API_BASE, 'carAuditList', {
            page: page,
            page_size: auditPageSize,
            audit_status: getTabAuditStatus(currentTab),
            uid: currentFilters.uid,
            account: currentFilters.account,
            name: currentFilters.name,
            phone: currentFilters.phone
        });
        const data = result.data;
        
        totalAudits = data.total || 0;
        const drivers = data.drivers || [];
        
        renderAuditList(drivers);
        renderAuditPagination(page, totalAudits);
        
        document.getElementById('totalAuditCount').textContent = totalAudits;
    } catch (error) {
        console.error('加载审核列表失败:', error);
        showToast('加载审核列表失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 渲染审核列表（按司机聚合）
function renderAuditList(drivers) {
    const container = document.getElementById('auditListContainer');
    
    if (drivers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>暂无审核数据</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = drivers.map(driver => {
        const carsHtml = driver.cars && driver.cars.length > 0 
            ? driver.cars.map(car => `
                <div class="car-audit-item">
                    <div class="car-info-left">
                        <div class="car-icon">🚗</div>
                        <div class="car-details">
                            <div class="car-model">${escapeHtml(car.car_model)}</div>
                            <div class="car-meta">
                                <span>${car.seats}座</span>
                                <span>审核ID: ${car.audit_id}</span>
                            </div>
                        </div>
                    </div>
                    <div class="car-info-right">
                        <span class="car-status-badge ${getAuditStatusClass(car.audit_status)}">
                            ${getAuditStatusText(car.audit_status)}
                        </span>
                        ${currentTab === 'pending' ? `
                            <button class="btn btn-primary btn-sm" onclick="openAuditDetail(${car.audit_id})" style="margin-left: 12px;">
                                去审核
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-sm" onclick="openAuditDetail(${car.audit_id})" style="margin-left: 12px;">
                                查看详情
                            </button>
                        `}
                    </div>
                </div>
            `).join('')
            : '<span style="color: #999;">暂无车辆</span>';
        
        return `
            <div class="driver-audit-card">
                <div class="driver-header">
                    <div class="driver-info">
                        <div class="driver-avatar">
                            ${escapeHtml(driver.name).charAt(0) || '?'}
                        </div>
                        <div class="driver-basic">
                            <div class="driver-name-row">
                                <span class="driver-name">${escapeHtml(driver.name)}</span>
                                <span class="driver-uid">UID: ${driver.uid}</span>
                            </div>
                            <div class="driver-account">
                                <span>账号: ${escapeHtml(driver.account)}</span>
                                <span>手机: ${escapeHtml(driver.phone) || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cars-list">
                    ${carsHtml}
                </div>
            </div>
        `;
    }).join('');
}

function renderAuditPagination(currentPage, totalCount) {
    const totalPages = Math.ceil(totalCount / auditPageSize) || 1;
    
    document.getElementById('prevAuditPage').disabled = currentPage <= 1;
    document.getElementById('nextAuditPage').disabled = currentPage >= totalPages;
    
    const pageNumbers = document.getElementById('auditPageNumbers');
    let html = '';
    
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<div class="page-number" onclick="goToAuditPage(1)">1</div>`;
        if (startPage > 2) {
            html += `<div class="page-ellipsis">...</div>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<div class="page-number active">${i}</div>`;
        } else {
            html += `<div class="page-number" onclick="goToAuditPage(${i})">${i}</div>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<div class="page-ellipsis">...</div>`;
        }
        html += `<div class="page-number" onclick="goToAuditPage(${totalPages})">${totalPages}</div>`;
    }
    
    pageNumbers.innerHTML = html;
}

function goToAuditPage(page) {
    loadAuditList(page);
}

function prevAuditPage() {
    if (currentAuditPage > 1) {
        loadAuditList(currentAuditPage - 1);
    }
}

function nextAuditPage() {
    const totalPages = Math.ceil(totalAudits / auditPageSize);
    if (currentAuditPage < totalPages) {
        loadAuditList(currentAuditPage + 1);
    }
}

function refreshAll() {
    loadOverview();
    loadAuditList(currentAuditPage);
}

let currentAuditId = 0;

// 打开审核详情
async function openAuditDetail(auditId) {
    currentAuditId = auditId;
    showLoading();
    
    try {
        const result = await Auth.fetchApi(API_BASE, 'getCarDetail', {
            audit_id: auditId
        });
        const data = result.data;
        
        if (!data.car) {
            showToast('获取车辆详情失败', { type: 'error', closable: true });
            return;
        }
        
        const car = data.car;
        
        document.getElementById('auditDetailContent').innerHTML = `
            <div class="audit-detail-section">
                <h4>基本信息</h4>
                <div class="audit-info-grid">
                    <div class="audit-info-item">
                        <span class="audit-info-label">审核ID</span>
                        <span class="audit-info-value">${car.audit_id}</span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">车辆ID</span>
                        <span class="audit-info-value">${car.car_id || '-'}</span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">用户ID</span>
                        <span class="audit-info-value">${car.uid}</span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">车辆型号</span>
                        <span class="audit-info-value">${escapeHtml(car.car_model)}</span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">车牌号</span>
                        <span class="audit-info-value">${escapeHtml(car.license_plate) || '-'}</span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">车辆颜色</span>
                        <span class="audit-info-value">${escapeHtml(car.car_color) || '-'}</span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">座位数</span>
                        <span class="audit-info-value">${car.seats} 座</span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">审核状态</span>
                        <span class="audit-info-value">
                            <span class="car-status-badge ${getAuditStatusClass(car.audit_status)}">
                                ${getAuditStatusText(car.audit_status)}
                            </span>
                        </span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">创建时间</span>
                        <span class="audit-info-value">${car.created_at || '-'}</span>
                    </div>
                    <div class="audit-info-item">
                        <span class="audit-info-label">更新时间</span>
                        <span class="audit-info-value">${car.updated_at || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="audit-detail-section">
                <h4>车辆简介</h4>
                <p style="color: #555; line-height: 1.8; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    ${escapeHtml(car.description) || '暂无简介'}
                </p>
            </div>
            
            <div class="audit-detail-section">
                <h4>相关图片</h4>
                <div class="audit-images-grid">
                    <div class="audit-image-card">
                        <div class="audit-image-label">车辆照片</div>
                        <div class="audit-image-wrapper">
                            ${car.car_photo 
                                ? `<img src="${escapeHtml(car.car_photo)}" alt="车辆照片" onerror="this.parentElement.innerHTML='<span class=\\'no-image\\'>图片加载失败</span>'">`
                                : '<span class="no-image">暂无图片</span>'
                            }
                        </div>
                    </div>
                    <div class="audit-image-card">
                        <div class="audit-image-label">行驶证照片</div>
                        <div class="audit-image-wrapper">
                            ${car.car_license_photo 
                                ? `<img src="${escapeHtml(car.car_license_photo)}" alt="行驶证照片" onerror="this.parentElement.innerHTML='<span class=\\'no-image\\'>图片加载失败</span>'">`
                                : '<span class="no-image">暂无图片</span>'
                            }
                        </div>
                    </div>
                    <div class="audit-image-card">
                        <div class="audit-image-label">驾驶证照片</div>
                        <div class="audit-image-wrapper">
                            ${car.driver_license_photo 
                                ? `<img src="${escapeHtml(car.driver_license_photo)}" alt="驾驶证照片" onerror="this.parentElement.innerHTML='<span class=\\'no-image\\'>图片加载失败</span>'">`
                                : '<span class="no-image">暂无图片</span>'
                            }
                        </div>
                    </div>
                </div>
            </div>
            
            ${car.audit_reason && car.audit_reason !== '' ? `
            <div class="audit-detail-section">
                <h4>审核理由</h4>
                <p style="color: #555; line-height: 1.8; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    ${escapeHtml(car.audit_reason)}
                </p>
            </div>
            ` : ''}
            
            ${currentTab === 'pending' ? `
            <div class="audit-action-section">
                <div class="reject-reason-group">
                    <label for="auditReason">审核理由（可选）</label>
                    <textarea id="auditReason" name="audit_reason" rows="3" placeholder="请输入审核理由"></textarea>
                </div>
                <div class="audit-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeAuditDetailModal()">取消</button>
                    <button type="button" class="btn btn-reject" onclick="submitReject()">审核驳回</button>
                    <button type="button" class="btn btn-approve" onclick="submitApprove()">审核通过</button>
                </div>
            </div>
            ` : ''}
        `;
        
        document.getElementById('auditDetailModal').classList.add('show');
    } catch (error) {
        console.error('获取车辆详情失败:', error);
        showToast('获取车辆详情失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function closeAuditDetailModal() {
    document.getElementById('auditDetailModal').classList.remove('show');
    currentAuditId = 0;
}

// 审核通过
async function submitApprove() {
    const auditReason = document.getElementById('auditReason').value.trim();
    
    if (!confirm('确定要审核通过该车辆吗？')) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'approveCarAudit', {
            audit_id: currentAuditId,
            audit_reason: auditReason
        });
        
        showToast('审核通过成功', { type: 'success', closable: true });
        closeAuditDetailModal();
        refreshAll();
    } catch (error) {
        console.error('审核通过失败:', error);
        showToast('审核通过失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 审核驳回
async function submitReject() {
    const auditReason = document.getElementById('auditReason').value.trim();
    
    if (!confirm('确定要驳回该车辆审核吗？')) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'rejectCarAudit', {
            audit_id: currentAuditId,
            audit_reason: auditReason
        });
        
        showToast('审核驳回成功', { type: 'success', closable: true });
        closeAuditDetailModal();
        refreshAll();
    } catch (error) {
        console.error('审核驳回失败:', error);
        showToast('审核驳回失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeAuditDetailModal();
    }
});

window.switchTab = switchTab;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.goToAuditPage = goToAuditPage;
window.prevAuditPage = prevAuditPage;
window.nextAuditPage = nextAuditPage;
window.refreshAll = refreshAll;
window.openAuditDetail = openAuditDetail;
window.closeAuditDetailModal = closeAuditDetailModal;
window.submitApprove = submitApprove;
window.submitReject = submitReject;