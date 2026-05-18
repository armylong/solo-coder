import { Auth } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast } from '/static/_common/ui.js';
import { getReviewStatusConfig } from '/static/ppz-m/_index/js/utils.js';
import { requireLogin } from '/static/_common/login-modal.js';

let myCars = [];
let currentCarouselIndex = 0;
let carouselInterval = null;

// 初始化页面
function initPage() {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    loadMyCars();
}

// 加载我的车辆列表
async function loadMyCars() {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    
    showLoading();
    
    try {
        const result = await Auth.fetchApi('/ppz', 'getMyCars', { review_status: 0 });
        const data = result.data;
        if (data) {
            myCars = data.list || [];
            renderCarList();
            renderCarousel();
        }
    } catch (error) {
        console.error('获取车辆列表失败:', error);
        showToast(error.message || '获取车辆列表失败', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染车辆列表
function renderCarList() {
    const carListElement = document.getElementById('carList');
    
    if (myCars.length === 0) {
        carListElement.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🚗</div>
                <p>暂无车辆</p>
                <p class="empty-hint">点击右上角"添加车辆"按钮开始注册</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    myCars.forEach(car => {
        const statusConfig = getReviewStatusConfig(car.audit_status);
        html += `
            <div class="car-item">
                <div class="car-info" onclick="goToCarDetail(${car.audit_id})">
                    ${car.car_id ? `<div class="car-id">#${car.car_id}</div>` : ''}
                    <div class="car-model clickable">${car.audit_data?.car_model || ''}</div>
                </div>
                <div class="car-status">
                    <span class="status-badge ${statusConfig.class}">${statusConfig.text}</span>
                </div>
                <div class="car-actions">
                    ${renderEditButton(car.audit_status, car.audit_id)}
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteCar(${car.audit_id})">删除</button>
                </div>
            </div>
        `;
    });
    
    carListElement.innerHTML = html;
}

// 渲染已通过车辆的轮播图
function renderCarousel() {
    const carouselContainer = document.getElementById('carouselContainer');
    const carouselIndicators = document.getElementById('carouselIndicators');
    const carouselWrapper = document.getElementById('carPhotoCarousel');
    
    stopCarousel();
    
    const approvedCars = myCars.filter(car => car.audit_status === 2);
    
    if (approvedCars.length === 0) {
        carouselWrapper.style.display = 'none';
        return;
    }
    
    carouselWrapper.style.display = 'block';
    
    let containerHtml = '';
    let indicatorsHtml = '';
    
    approvedCars.forEach((car, index) => {
        containerHtml += `
            <div class="carousel-slide">
                <img src="${car.audit_data?.car_photo || ''}" alt="${car.audit_data?.car_model || ''}" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22><rect fill=%22%23ddd%22 width=%22400%22 height=%22200%22/><text fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2214%22 x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22>${car.audit_data?.car_model || ''}</text></svg>'">
            </div>
        `;
        
        indicatorsHtml += `
            <span class="indicator ${index === 0 ? 'active' : ''}" 
                  onclick="goToSlide(${index})"></span>
        `;
    });
    
    carouselContainer.innerHTML = containerHtml;
    carouselIndicators.innerHTML = indicatorsHtml;
    
    currentCarouselIndex = 0;
    startCarousel();
}

function startCarousel() {
    const approvedCars = myCars.filter(car => car.audit_status === 2);
    if (approvedCars.length <= 1) {
        return;
    }
    
    carouselInterval = setInterval(() => {
        currentCarouselIndex++;
        if (currentCarouselIndex >= approvedCars.length) {
            currentCarouselIndex = 0;
        }
        updateCarousel();
    }, 3000);
}

function stopCarousel() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
        carouselInterval = null;
    }
}

function goToSlide(index) {
    currentCarouselIndex = index;
    updateCarousel();
}

function updateCarousel() {
    const container = document.getElementById('carouselContainer');
    const indicators = document.querySelectorAll('.indicator');
    
    container.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
    
    indicators.forEach((indicator, index) => {
        if (index === currentCarouselIndex) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

function goBackToProfile() {
    window.history.back();
}

function goToAddCar() {
    window.location.href = 'add/';
}

function goToEditCar(auditId) {
    window.location.href = 'add/?audit_id=' + auditId;
}

function renderEditButton(auditStatus, auditId) {
    if (auditStatus === 1 || auditStatus === 3) {
        return `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); goToEditCar(${auditId})">编辑</button>`;
    }
    return '';
}

function goToCarDetail(carId) {
    window.location.href = 'detail/?id=' + carId;
}

// 删除车辆
async function deleteCar(carId) {
    if (!confirm('确定要删除这辆车吗？')) {
        return;
    }
    
    showLoading();
    
    try {
        await Auth.fetchApi('/ppz', 'deleteMyCar', {
            audit_id: carId
        });
        
        showToast('删除成功', { type: 'success' });
        loadMyCars();
    } catch (error) {
        console.error('删除车辆失败:', error);
        showToast(error.message || '删除失败', 'error');
    } finally {
        hideLoading();
    }
}

document.addEventListener('DOMContentLoaded', initPage);

window.goToSlide = goToSlide;
window.goBackToProfile = goBackToProfile;
window.goToAddCar = goToAddCar;
window.goToEditCar = goToEditCar;
window.goToCarDetail = goToCarDetail;
window.deleteCar = deleteCar;
