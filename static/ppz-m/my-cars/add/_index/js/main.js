import { Auth } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast } from '/static/_common/ui.js';
import { getUrlParam } from '/static/ppz-m/_index/js/utils.js';
import { LicensePlateKeyboard } from '/static/ppz-m/_common/license-plate-keyboard.js';
import { requireLogin } from '/static/_common/login-modal.js';

let isEditMode = false;
let currentAuditId = null;
let currentCarId = null;
let licensePlateKeyboard = null;

// 初始化页面
function initPage() {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }

    currentAuditId = getUrlParam('audit_id');
    currentCarId = getUrlParam('car_id');

    if (currentAuditId || currentCarId) {
        isEditMode = true;
        document.getElementById('pageTitle').textContent = '编辑车辆';
        loadCarDetail();
    }

    setupEventListeners();
}

// 加载车辆详情（编辑模式）
async function loadCarDetail() {
    showLoading();

    try {
        const params = {};
        if (currentAuditId) {
            params.audit_id = parseInt(currentAuditId);
        }
        if (currentCarId) {
            params.car_id = parseInt(currentCarId);
        }

        const result = await Auth.fetchApi('/ppz', 'getMyCarDetail', params);
        const data = result.data;
        if (data && data.car) {
            fillFormWithCarData(data.car);
        }
    } catch (error) {
        console.error('加载车辆详情失败:', error);
        showToast(error.message || '加载车辆详情失败', 'error');
    } finally {
        hideLoading();
    }
}

// 用车辆数据填充表单
function fillFormWithCarData(car) {
    const auditData = car.audit_data || car;

    document.getElementById('carModel').value = auditData.car_model || car.car_model || '';
    const plateValue = auditData.license_plate || car.license_plate || '';
    document.getElementById('licensePlate').value = plateValue;
    updateLicensePlateDisplay(plateValue);
    document.getElementById('carColor').value = auditData.car_color || car.car_color || '';
    document.getElementById('licensePhoto').value = auditData.car_license_photo || car.car_license_photo || '';
    document.getElementById('driverPhoto').value = auditData.driver_license_photo || car.driver_license_photo || '';
    document.getElementById('seats').value = auditData.seats || car.seats || '';
    document.getElementById('carPhoto').value = auditData.car_photo || car.car_photo || '';
    document.getElementById('description').value = auditData.description || car.description || '';
}

function setupEventListeners() {
    const addCarForm = document.getElementById('addCarForm');
    if (addCarForm) {
        addCarForm.addEventListener('submit', handleSubmit);
    }
}

// 提交车辆信息
async function handleSubmit(e) {
    e.preventDefault();

    const carModel = document.getElementById('carModel').value.trim();
    const licensePlate = document.getElementById('licensePlate').value.trim();
    const carColor = document.getElementById('carColor').value.trim();
    const licensePhoto = document.getElementById('licensePhoto').value.trim();
    const driverPhoto = document.getElementById('driverPhoto').value.trim();
    const seats = parseInt(document.getElementById('seats').value);
    const carPhoto = document.getElementById('carPhoto').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!carModel) {
        showToast('请输入车辆型号', { type: 'error' });
        return;
    }
    if (!licensePlate) {
        showToast('请输入车牌号', { type: 'error' });
        return;
    }
    if (!carColor) {
        showToast('请输入车辆颜色', { type: 'error' });
        return;
    }
    if (!licensePhoto) {
        showToast('请输入行驶证照片URL', { type: 'error' });
        return;
    }
    if (!driverPhoto) {
        showToast('请输入驾驶证照片URL', { type: 'error' });
        return;
    }
    if (!seats || seats <= 0) {
        showToast('请输入有效的座位数', { type: 'error' });
        return;
    }
    if (!carPhoto) {
        showToast('请输入车辆照片URL', { type: 'error' });
        return;
    }
    if (!description) {
        showToast('请输入车辆简介', { type: 'error' });
        return;
    }

    showLoading();

    try {
        if (isEditMode) {
            const editParams = {
                car_model: carModel,
                license_plate: licensePlate,
                car_color: carColor,
                car_license_photo: licensePhoto,
                driver_license_photo: driverPhoto,
                seats: seats,
                car_photo: carPhoto,
                description: description
            };

            if (currentAuditId) {
                editParams.audit_id = parseInt(currentAuditId);
            }
            if (currentCarId) {
                editParams.car_id = parseInt(currentCarId);
            }

            await Auth.fetchApi('/ppz', 'editMyCar', editParams);
            showToast('提交成功，等待审核', { type: 'success' });
        } else {
            await Auth.fetchApi('/ppz', 'addMyCar', {
                car_model: carModel,
                license_plate: licensePlate,
                car_color: carColor,
                car_license_photo: licensePhoto,
                driver_license_photo: driverPhoto,
                seats: seats,
                car_photo: carPhoto,
                description: description
            });
            showToast('提交成功，等待审核', { type: 'success' });
        }

        goBackToCarManagement();
    } catch (error) {
        console.error('提交车辆信息失败:', error);
        showToast(error.message || '提交失败', 'error');
    } finally {
        hideLoading();
    }

    return false;
}

function goBackToCarManagement() {
    window.history.back();
}

// 打开车牌号键盘
function openLicensePlateKeyboard() {
    const currentValue = document.getElementById('licensePlate').value;
    licensePlateKeyboard = new LicensePlateKeyboard({
        value: currentValue,
        onConfirm: (value) => {
            document.getElementById('licensePlate').value = value;
            updateLicensePlateDisplay(value);
        },
        onClose: (value) => {
            document.getElementById('licensePlate').value = value;
            updateLicensePlateDisplay(value);
        }
    });
    licensePlateKeyboard.show();
}

function updateLicensePlateDisplay(value) {
    const placeholder = document.getElementById('lpPlaceholder');
    const valueSpan = document.getElementById('lpValue');
    if (value) {
        placeholder.style.display = 'none';
        valueSpan.style.display = '';
        valueSpan.textContent = value;
    } else {
        placeholder.style.display = '';
        valueSpan.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', initPage);

window.goBackToCarManagement = goBackToCarManagement;
window.handleSubmit = handleSubmit;
window.openLicensePlateKeyboard = openLicensePlateKeyboard;
