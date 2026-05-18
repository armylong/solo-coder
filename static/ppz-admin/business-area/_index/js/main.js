import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';
import { renderSidebar } from '/static/_common/sidebar.js';
import { requireLogin } from '/static/_common/login-modal.js';

const API_BASE = '/business_area';
let currentPage = 1;
const pageSize = 20;
let totalCount = 0;
let currentStatusFilter = 0;
let currentKeyword = '';

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    if (!Auth.requirePermission(PERMISSION.ADMIN)) return;
    renderSidebar();
    loadAreaList(1);
});

// 加载区域列表
async function loadAreaList(page) {
    showLoading();
    try {
        currentPage = page;
        const result = await Auth.fetchApi(API_BASE, 'list', {
            page: page,
            page_size: pageSize,
            status: currentStatusFilter,
            keyword: currentKeyword
        });
        const data = result.data;

        totalCount = data.total || 0;
        const list = data.list || [];

        renderAreaTable(list);
        renderPagination(page, totalCount);

        document.getElementById('totalCount').textContent = totalCount;
    } catch (error) {
        console.error('加载运营区域列表失败:', error);
        showToast('加载运营区域列表失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

// 渲染区域表格
function renderAreaTable(list) {
    const tbody = document.getElementById('areaTableBody');

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <p>暂无运营区域数据</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(area => {
        const statusText = area.status === 1 ? '正常' : '停用';
        const statusClass = area.status === 1 ? 'status-normal' : 'status-disabled';
        const fencePreview = area.area_fence ? `查看围栏 (${Array.isArray(area.area_fence) ? area.area_fence.length : 0}块)` : '无数据';

        return `
            <tr>
                <td>${area.area_id}</td>
                <td>${escapeHtml(area.area_name)}</td>
                <td>
                    <span class="fence-data-link" onclick="showFenceData(${area.area_id})">
                        ${fencePreview}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>${area.updated_at || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="openFencePage(${area.area_id})">查看/编辑</button>
                        ${area.status === 1
                            ? `<button class="btn btn-secondary btn-sm" onclick="disableArea(${area.area_id})">停用</button>`
                            : `<button class="btn btn-success btn-sm" onclick="enableArea(${area.area_id})">启用</button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="deleteArea(${area.area_id}, '${escapeHtml(area.area_name)}')">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPagination(current, total) {
    const totalPages = Math.ceil(total / pageSize) || 1;

    document.getElementById('prevPage').disabled = current <= 1;
    document.getElementById('nextPage').disabled = current >= totalPages;

    const pageNumbers = document.getElementById('pageNumbers');
    let html = '';

    const maxVisible = 5;
    let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
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
        if (i === current) {
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
    loadAreaList(page);
}

function prevPage() {
    if (currentPage > 1) {
        loadAreaList(currentPage - 1);
    }
}

function nextPage() {
    const totalPages = Math.ceil(totalCount / pageSize);
    if (currentPage < totalPages) {
        loadAreaList(currentPage + 1);
    }
}

function filterByStatus() {
    currentStatusFilter = parseInt(document.getElementById('statusFilter').value);
    loadAreaList(1);
}

function searchArea() {
    currentKeyword = document.getElementById('searchInput').value.trim();
    loadAreaList(1);
}

function refreshList() {
    loadAreaList(currentPage);
}

// 查看围栏JSON数据
async function showFenceData(areaId) {
    showLoading();
    try {
        const result = await Auth.fetchApi(API_BASE, 'get', { area_id: areaId });
        const area = result.data.area;
        if (area && area.area_fence) {
            document.getElementById('fenceJsonContent').textContent = JSON.stringify(area.area_fence, null, 2);
            document.getElementById('fenceModal').classList.add('show');
        } else {
            showToast('该区域无围栏数据', { type: 'info', closable: true });
        }
    } catch (error) {
        showToast('获取围栏数据失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

function closeFenceModal() {
    document.getElementById('fenceModal').classList.remove('show');
}

// 打开围栏编辑页
function openFencePage(areaId) {
    const overlay = document.getElementById('fenceOverlay');
    const iframe = document.getElementById('fenceIframe');
    iframe.src = 'area-fence/?area_id=' + areaId;
    overlay.classList.add('show');
    requestAnimationFrame(() => {
        overlay.classList.add('show-active');
    });

    window.addEventListener('message', function handler(e) {
        if (e.data && e.data.type === 'fenceSaved') {
            closeFenceOverlay();
            window.removeEventListener('message', handler);
            refreshList();
        } else if (e.data && e.data.type === 'fenceCancel') {
            closeFenceOverlay();
            window.removeEventListener('message', handler);
        }
    });
}

function closeFenceOverlay() {
    const overlay = document.getElementById('fenceOverlay');
    const iframe = document.getElementById('fenceIframe');
    overlay.classList.remove('show-active');
    overlay.addEventListener('transitionend', function handler() {
        overlay.removeEventListener('transitionend', handler);
        overlay.classList.remove('show');
        iframe.src = '';
    }, { once: true });
}

// 停用区域
async function disableArea(areaId) {
    if (!confirm('确定要停用该运营区域吗？')) return;

    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'disable', { area_id: areaId });
        showToast('停用成功', { type: 'success', closable: true });
        refreshList();
    } catch (error) {
        showToast('停用失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

// 启用区域
async function enableArea(areaId) {
    if (!confirm('确定要启用该运营区域吗？')) return;

    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'enable', { area_id: areaId });
        showToast('启用成功', { type: 'success', closable: true });
        refreshList();
    } catch (error) {
        showToast('启用失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

// 删除区域
async function deleteArea(areaId, areaName) {
    if (!confirm(`确定要删除运营区域"${areaName}"吗？删除后不可恢复！`)) return;

    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'delete', { area_id: areaId });
        showToast('删除成功', { type: 'success', closable: true });
        refreshList();
    } catch (error) {
        showToast('删除失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchArea();
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeFenceModal();
    }
});

window.goToPage = goToPage;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.filterByStatus = filterByStatus;
window.searchArea = searchArea;
window.refreshList = refreshList;
window.showFenceData = showFenceData;
window.closeFenceModal = closeFenceModal;
window.openFencePage = openFencePage;
window.closeFenceOverlay = closeFenceOverlay;
window.disableArea = disableArea;
window.enableArea = enableArea;
window.deleteArea = deleteArea;
