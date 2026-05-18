import { Auth } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';
import { getUrlParam, getReviewStatusConfig } from '/static/ppz-m/_index/js/utils.js';
import { requireLogin } from '/static/_common/login-modal.js';

let currentCar = null;

// 初始化页面
function initPage() {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    
    const auditId = getUrlParam('id');
    if (!auditId) {
        showToast('缺少车辆ID', { type: 'error' });
        setTimeout(() => {
            goBackToCarManagement();
        }, 1500);
        return;
    }
    
    loadCarDetail(parseInt(auditId));
}

// 加载车辆详情
async function loadCarDetail(auditId) {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    
    showLoading();
    
    try {
        const result = await Auth.fetchApi('/ppz', 'getMyCars', { review_status: 0 });
        const data = result.data;
        if (data) {
            const cars = data.list || [];
            currentCar = cars.find(car => car.audit_id === auditId);
            
            if (currentCar) {
                renderCarDetail();
            } else {
                showToast('车辆不存在', { type: 'error' });
                setTimeout(() => {
                    goBackToCarManagement();
                }, 1500);
            }
        }
    } catch (error) {
        console.error('获取车辆详情失败:', error);
        showToast(error.message || '获取车辆详情失败', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染车辆详情
function renderCarDetail() {
    if (!currentCar) {
        return;
    }
    
    const detailImage = document.getElementById('detailImage');
    const detailInfo = document.getElementById('detailInfo');
    const statusConfig = getReviewStatusConfig(currentCar.audit_status);
    
    if (detailImage && currentCar.audit_data?.car_photo) {
        detailImage.innerHTML = `
            <img src="${currentCar.audit_data.car_photo}" alt="${currentCar.audit_data?.car_model || ''}"
                 onerror="this.parentElement.innerHTML='<div class=\\'detail-image-placeholder\\'>🚗</div>'">
        `;
    }
    
    if (detailInfo) {
        detailInfo.innerHTML = `
            <div class="detail-header">
                <div class="detail-title">${currentCar.audit_data?.car_model || ''}</div>
                <span class="status-badge ${statusConfig.class}">${statusConfig.text}</span>
            </div>
            
            ${currentCar.car_id ? `<div class="detail-item">
                <span class="detail-label">车辆编号</span>
                <span class="detail-value">#${currentCar.car_id}</span>
            </div>` : ''}
            
            <div class="detail-item">
                <span class="detail-label">车牌号</span>
                <span class="detail-value">${currentCar.audit_data?.license_plate || '-'}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">车辆颜色</span>
                <span class="detail-value">${currentCar.audit_data?.car_color || '-'}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">乘客座位数</span>
                <span class="detail-value">${currentCar.audit_data?.seats || '-'} 座</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">行驶证照片</span>
                <span class="detail-value">
                    <div class="photo-grid">
                        ${currentCar.audit_data?.car_license_photo ? 
                            `<img class="photo-thumbnail" src="${currentCar.audit_data.car_license_photo}" alt="行驶证" onclick="openImageModal('${currentCar.audit_data.car_license_photo}', '行驶证')">` : 
                            '<div class="photo-placeholder">📄</div>'
                        }
                    </div>
                </span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">驾驶证照片</span>
                <span class="detail-value">
                    <div class="photo-grid">
                        ${currentCar.audit_data?.driver_license_photo ? 
                            `<img class="photo-thumbnail" src="${currentCar.audit_data.driver_license_photo}" alt="驾驶证" onclick="openImageModal('${currentCar.audit_data.driver_license_photo}', '驾驶证')">` : 
                            '<div class="photo-placeholder">📄</div>'
                        }
                    </div>
                </span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">提交时间</span>
                <span class="detail-value">${formatDate(currentCar.created_at)}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">车辆简介</span>
                <span class="detail-value multiline">${escapeHtml(currentCar.audit_data?.description)}</span>
            </div>
        `;
    }
}

// 打开图片预览
function openImageModal(imageUrl, title) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    
    modalImage.src = imageUrl;
    modalTitle.textContent = title;
    modal.classList.add('show');
    
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
});

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN');
    } catch (e) {
        return dateStr;
    }
}



function goBackToCarManagement() {
    window.history.back();
}

document.addEventListener('DOMContentLoaded', initPage);

window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
window.goBackToCarManagement = goBackToCarManagement;
