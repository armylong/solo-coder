import { Auth } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast } from '/static/_common/ui.js';
import { parseGaodeData } from '/static/ppz-m/_index/js/gaode-map.js';
import { requireLogin } from '/static/_common/login-modal.js';

let addresses = [];
let draggedItem = null;
let editingAddressId = null;
let touchDragItem = null;
let touchStartY = 0;
let touchClone = null;
let touchDragging = false;

let pendingEditAddressId = null;

// 触摸拖拽开始
function onTouchStart(event) {
    const handleEl = event.target.closest('.drag-handle');
    if (!handleEl) return;
    const itemEl = handleEl.closest('.address-item');
    if (!itemEl) return;

    touchDragItem = itemEl;
    touchStartY = event.touches[0].clientY;
    touchDragging = false;
}

// 启动触摸拖拽
function startTouchDrag(touch) {
    touchDragging = true;
    touchDragItem.classList.add('dragging');

    touchClone = touchDragItem.cloneNode(true);
    touchClone.style.position = 'fixed';
    touchClone.style.zIndex = '10000';
    touchClone.style.width = touchDragItem.offsetWidth + 'px';
    touchClone.style.opacity = '0.85';
    touchClone.style.pointerEvents = 'none';
    touchClone.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
    touchClone.style.borderRadius = '8px';
    const rect = touchDragItem.getBoundingClientRect();
    touchClone.style.left = rect.left + 'px';
    touchClone.style.top = rect.top + 'px';
    document.body.appendChild(touchClone);
}

// 触摸移动
function onTouchMove(event) {
    if (!touchDragItem) return;

    if (!touchDragging) {
        var touch = event.touches[0];
        var deltaY = Math.abs(touch.clientY - touchStartY);
        if (deltaY < 5) return;
        event.preventDefault();
        startTouchDrag(touch);
    } else {
        event.preventDefault();
    }

    var touch = event.touches[0];
    if (touchClone) {
        touchClone.style.top = (touch.clientY - touchDragItem.offsetHeight / 2) + 'px';
    }

    document.querySelectorAll('.address-item').forEach(function(item) {
        item.classList.remove('drag-over');
    });

    var targetItem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (targetItem) {
        var targetAddrItem = targetItem.closest('.address-item');
        if (targetAddrItem && targetAddrItem !== touchDragItem) {
            targetAddrItem.classList.add('drag-over');
        }
    }
}

// 触摸结束
function onTouchEnd(event) {
    if (!touchDragItem) return;

    if (touchClone) {
        document.body.removeChild(touchClone);
        touchClone = null;
    }

    if (touchDragging) {
        var touch = event.changedTouches[0];
        var targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetEl) {
            var targetItem = targetEl.closest('.address-item');
            if (targetItem && targetItem !== touchDragItem) {
                var fromIndex = parseInt(touchDragItem.dataset.index);
                var toIndex = parseInt(targetItem.dataset.index);
                moveAddress(fromIndex, toIndex);
            }
        }
    }

    touchDragItem.classList.remove('dragging');
    document.querySelectorAll('.address-item').forEach(function(item) {
        item.classList.remove('drag-over');
    });
    touchDragItem = null;
    touchDragging = false;
}

// 初始化页面
function initPage() {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }

    loadAddressList();

    window.addEventListener('message', handleMapPickerMessage);
}

// 加载地址列表
async function loadAddressList() {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }

    showLoading();

    try {
        const result = await Auth.fetchApi('/ppz/ppz_map', 'addressList', {});
        const data = result.data;
        if (data) {
            addresses = data.list || [];
            renderAddressList();
        }
    } catch (error) {
        console.error('获取地址列表失败:', error);
        showToast(error.message || '获取地址列表失败', 'error');
    } finally {
        hideLoading();
    }
}

// 渲染地址列表
function renderAddressList() {
    const listElement = document.getElementById('addressList');

    if (addresses.length === 0) {
        listElement.innerHTML =
            '<div class="empty-address">' +
                '<div class="empty-icon">📍</div>' +
                '<p class="empty-text">暂无地址</p>' +
                '<p class="empty-text" style="font-size: 12px; margin-top: 8px;">点击右上角"添加"按钮开始添加</p>' +
            '</div>';
        return;
    }

    let dragTipShown = !localStorage.getItem('ppz_address_drag_tip_hidden');

    let html = '';
    if (dragTipShown) {
        html += '<div class="drag-tip" id="dragTip">上下拖动可调整顺序</div>';
    }
    addresses.forEach(function(addr, index) {
        const gaodeData = parseGaodeData(addr.gaode_data);
        const isEditing = editingAddressId === addr.address_id;

        html +=
            '<div class="address-item"' +
                 ' data-address-id="' + addr.address_id + '"' +
                 ' data-index="' + index + '">' +
                '<span class="drag-handle"' +
                      ' draggable="true"' +
                      ' ondragstart="onDragStart(event)"' +
                      ' ondragend="onDragEnd(event)"' +
                      ' ondragover="onDragOver(event)"' +
                      ' ondragleave="onDragLeave(event)"' +
                      ' ondrop="onDrop(event)"' +
                      ' ontouchstart="onTouchStart(event)"' +
                      ' ontouchmove="onTouchMove(event)"' +
                      ' ontouchend="onTouchEnd(event)">⋮⋮</span>' +
                '<div class="address-info" onclick="event.stopPropagation(); openMapPickerEdit(' + addr.address_id + ')">' +
                    (isEditing ? renderEditingName(addr) : renderDisplayName(addr, gaodeData)) +
                    '<div class="address-detail">' + (gaodeData.address || '') + '</div>' +
                '</div>' +
                '<div class="address-actions">' +
                    '<button class="btn-delete" onclick="event.stopPropagation(); deleteAddress(' + addr.address_id + ')">删除</button>' +
                '</div>' +
            '</div>';
    });

    listElement.innerHTML = html;
}

function renderDisplayName(addr, gaodeData) {
    const displayName = addr.remark || gaodeData.name || '未命名地址';
    return '<div class="address-name">' +
        '<span>' + displayName + '</span>' +
        '<span class="edit-btn" onclick="event.stopPropagation(); startEditAddress(' + addr.address_id + ')">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
                '<path d="M9.5 1.5L12.5 4.5L4 13H1V10L9.5 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
        '</span>' +
    '</div>';
}

function renderEditingName(addr) {
    return '<div class="address-name">' +
        '<input type="text" class="edit-input" id="editInput_' + addr.address_id + '"' +
               ' value="' + (addr.remark || '') + '"' +
               ' placeholder="输入地址名称"' +
               ' onclick="event.stopPropagation()"' +
               ' onkeydown="onEditKeydown(event, ' + addr.address_id + ')">' +
        '<div class="edit-actions">' +
            '<button class="btn-confirm" onclick="event.stopPropagation(); confirmEditAddress(' + addr.address_id + ')">确定</button>' +
            '<button class="btn-cancel" onclick="event.stopPropagation(); cancelEditAddress()">取消</button>' +
        '</div>' +
    '</div>';
}

function goBackToProfile() {
    window.history.back();
}

// 打开地图选点（新增）
function openMapPicker() {
    pendingEditAddressId = null;

    const overlay = document.getElementById('mapPickerOverlay');
    const iframe = document.getElementById('mapPickerFrame');

    iframe.src = '/static/ppz-m/address-map/index.html?mode=save';
    overlay.classList.add('show');

    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            overlay.classList.add('show-active');
        });
    });
}

// 打开地图选点（编辑已有地址）
function openMapPickerEdit(addressId) {
    const addr = addresses.find(function(a) { return a.address_id === addressId; });
    if (!addr) return;

    const gaodeData = parseGaodeData(addr.gaode_data);
    const lng = gaodeData.location ? gaodeData.location.lng : '';
    const lat = gaodeData.location ? gaodeData.location.lat : '';

    pendingEditAddressId = addressId;

    const overlay = document.getElementById('mapPickerOverlay');
    const iframe = document.getElementById('mapPickerFrame');

    let src = '/static/ppz-m/address-map/index.html?mode=save';
    if (lng && lat) {
        src += '&lng=' + lng + '&lat=' + lat;
    }

    iframe.src = src;
    overlay.classList.add('show');

    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            overlay.classList.add('show-active');
        });
    });
}

function closeMapPicker() {
    const overlay = document.getElementById('mapPickerOverlay');
    overlay.classList.remove('show-active');

    overlay.addEventListener('transitionend', function handler() {
        overlay.removeEventListener('transitionend', handler);
        overlay.classList.remove('show');
        document.getElementById('mapPickerFrame').src = '';
    });
}

// 处理地图选点消息
function handleMapPickerMessage(event) {
    if (event.data.type === 'addressSelected') {
        closeMapPicker();

        const result = event.data.data;

        if (pendingEditAddressId) {
            saveEditAddress(pendingEditAddressId, result.gaode_data);
        } else {
            saveNewAddress(result.remark, result.gaode_data);
        }
    } else if (event.data.type === 'addressCancel') {
        closeMapPicker();
    }
}

// 保存新地址
async function saveNewAddress(remark, gaodeData) {
    showLoading();

    try {
        await Auth.fetchApi('/ppz/ppz_map', 'uploadAddress', {
            remark: remark,
            gaode_data: gaodeData
        });

        hideLoading();
        showToast('地址保存成功', { type: 'success' });
        loadAddressList();
    } catch (error) {
        hideLoading();
        console.error('保存地址失败:', error);
        showToast(error.message || '保存地址失败', 'error');
    }
}

// 保存编辑后的地址
async function saveEditAddress(addressId, gaodeData) {
    const addr = addresses.find(function(a) { return a.address_id === addressId; });
    if (!addr) return;

    if (!confirm('确定要更改此地址的位置吗？')) {
        return;
    }

    showLoading();

    try {
        await Auth.fetchApi('/ppz/ppz_map', 'uploadAddress', {
            address_id: addressId,
            remark: addr.remark,
            gaode_data: gaodeData
        });

        hideLoading();
        showToast('地址更新成功', { type: 'success' });
        loadAddressList();
    } catch (error) {
        hideLoading();
        console.error('更新地址失败:', error);
        showToast(error.message || '更新地址失败', 'error');
    }
}

function startEditAddress(addressId) {
    editingAddressId = addressId;
    renderAddressList();

    setTimeout(function() {
        const input = document.getElementById('editInput_' + addressId);
        if (input) {
            input.focus();
            input.select();
        }
    }, 50);
}

function cancelEditAddress() {
    editingAddressId = null;
    renderAddressList();
}

function onEditKeydown(event, addressId) {
    if (event.key === 'Enter') {
        confirmEditAddress(addressId);
    } else if (event.key === 'Escape') {
        cancelEditAddress();
    }
}

// 确认编辑备注
async function confirmEditAddress(addressId) {
    const input = document.getElementById('editInput_' + addressId);
    if (!input) {
        return;
    }

    const newRemark = input.value.trim();
    if (!newRemark) {
        showToast('请输入地址名称', { type: 'error' });
        input.focus();
        return;
    }

    const addr = addresses.find(function(a) { return a.address_id === addressId; });
    if (!addr) {
        return;
    }

    showLoading();

    try {
        await Auth.fetchApi('/ppz/ppz_map', 'uploadAddress', {
            address_id: addressId,
            remark: newRemark,
            gaode_data: addr.gaode_data
        });

        editingAddressId = null;
        hideLoading();
        showToast('修改成功', { type: 'success' });
        loadAddressList();
    } catch (error) {
        hideLoading();
        console.error('修改备注失败:', error);
        showToast(error.message || '修改失败', 'error');
    }
}

// 删除地址
async function deleteAddress(addressId) {
    if (!confirm('确定要删除这个地址吗？')) {
        return;
    }

    showLoading();

    try {
        await Auth.fetchApi('/ppz/ppz_map', 'deleteAddress', {
            address_id: addressId
        });

        showToast('删除成功', { type: 'success' });
        loadAddressList();
    } catch (error) {
        console.error('删除地址失败:', error);
        showToast(error.message || '删除失败', 'error');
    } finally {
        hideLoading();
    }
}

// 交换地址排序
async function moveAddress(fromIndex, toIndex) {
    localStorage.setItem('ppz_address_drag_tip_hidden', '1');
    var tip = document.getElementById('dragTip');
    if (tip) tip.remove();

    if (fromIndex < 0 || fromIndex >= addresses.length ||
        toIndex < 0 || toIndex >= addresses.length) {
        return;
    }

    const fromAddr = addresses[fromIndex];
    const toAddr = addresses[toIndex];

    const fromSort = fromAddr.sort;
    const toSort = toAddr.sort;

    showLoading();

    try {
        await Auth.fetchApi('/ppz/ppz_map', 'updateAddressSort', {
            address_id: fromAddr.address_id,
            new_sort: toSort
        });

        await Auth.fetchApi('/ppz/ppz_map', 'updateAddressSort', {
            address_id: toAddr.address_id,
            new_sort: fromSort
        });

        showToast('排序已更新', { type: 'success' });
        loadAddressList();
    } catch (error) {
        console.error('更新排序失败:', error);
        showToast(error.message || '更新排序失败', 'error');
    } finally {
        hideLoading();
    }
}

function onDragStart(event) {
    const handleEl = event.target;
    const itemEl = handleEl.closest('.address-item');
    if (!itemEl) return;

    draggedItem = itemEl;
    itemEl.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemEl.dataset.addressId);
}

function onDragEnd(event) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    document.querySelectorAll('.address-item').forEach(function(item) {
        item.classList.remove('drag-over');
    });
    draggedItem = null;
}

function onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const targetItem = event.target.closest('.address-item');
    if (targetItem && targetItem !== draggedItem) {
        document.querySelectorAll('.address-item').forEach(function(item) {
            item.classList.remove('drag-over');
        });
        targetItem.classList.add('drag-over');
    }
}

function onDragLeave(event) {
    const targetItem = event.target.closest('.address-item');
    if (targetItem) {
        targetItem.classList.remove('drag-over');
    }
}

async function onDrop(event) {
    event.preventDefault();

    const targetItem = event.target.closest('.address-item');
    if (!targetItem || targetItem === draggedItem) {
        return;
    }

    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(targetItem.dataset.index);

    await moveAddress(fromIndex, toIndex);
}

document.addEventListener('DOMContentLoaded', initPage);

window.goBackToProfile = goBackToProfile;
window.openMapPicker = openMapPicker;
window.openMapPickerEdit = openMapPickerEdit;
window.startEditAddress = startEditAddress;
window.cancelEditAddress = cancelEditAddress;
window.onEditKeydown = onEditKeydown;
window.confirmEditAddress = confirmEditAddress;
window.deleteAddress = deleteAddress;
window.onDragStart = onDragStart;
window.onDragEnd = onDragEnd;
window.onDragOver = onDragOver;
window.onDragLeave = onDragLeave;
window.onDrop = onDrop;
window.onTouchStart = onTouchStart;
window.onTouchMove = onTouchMove;
window.onTouchEnd = onTouchEnd;
