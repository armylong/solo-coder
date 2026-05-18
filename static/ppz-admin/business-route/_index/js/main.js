import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';
import { renderSidebar } from '/static/_common/sidebar.js';
import { requireLogin } from '/static/_common/login-modal.js';

const ROUTE_API_BASE = '/business_route';
const AREA_API_BASE = '/business_area_ext';
let currentPage = 1;
const pageSize = 20;
let totalCount = 0;
let currentStatusFilter = 0;
let currentKeyword = '';
let editingRouteId = 0;
let activeAreas = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    if (!Auth.requirePermission(PERMISSION.ADMIN)) return;
    renderSidebar();
    loadRouteList(1);
});

// 加载路线列表
async function loadRouteList(page) {
    showLoading();
    try {
        currentPage = page;
        const result = await Auth.fetchApi(ROUTE_API_BASE, 'list', {
            page: page,
            page_size: pageSize,
            status: currentStatusFilter,
            keyword: currentKeyword
        });
        const data = result.data;

        totalCount = data.total || 0;
        const list = data.list || [];

        renderRouteTable(list);
        renderPagination(page, totalCount);

        document.getElementById('totalCount').textContent = totalCount;
    } catch (error) {
        console.error('加载运营路线列表失败:', error);
        showToast('加载运营路线列表失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

// 渲染路线表格
function renderRouteTable(list) {
    const tbody = document.getElementById('routeTableBody');

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <p>暂无运营路线数据</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(route => {
        const statusText = route.status === 1 ? '正常' : '停用';
        const statusClass = route.status === 1 ? 'status-normal' : 'status-disabled';

        const aAreaName = escapeHtml(route.a_area_name || '未知区域');
        const bAreaName = escapeHtml(route.b_area_name || '未知区域');
        const aAreaClass = route.a_area_name === '未知区域' ? 'area-link area-deleted' : 'area-link';
        const bAreaClass = route.b_area_name === '未知区域' ? 'area-link area-deleted' : 'area-link';

        return `
            <tr>
                <td>${route.route_id}</td>
                <td>${escapeHtml(route.route_name)}</td>
                <td>
                    <span class="${aAreaClass}" onclick="viewArea(${route.a_area_id})">
                        ${aAreaName}
                    </span>
                </td>
                <td>
                    <span class="${bAreaClass}" onclick="viewArea(${route.b_area_id})">
                        ${bAreaName}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>${route.updated_at || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="openEditModal(${route.route_id})">编辑</button>
                        ${route.status === 1
                            ? `<button class="btn btn-secondary btn-sm" onclick="disableRoute(${route.route_id})">停用</button>`
                            : `<button class="btn btn-success btn-sm" onclick="enableRoute(${route.route_id})">启用</button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="deleteRoute(${route.route_id}, '${escapeHtml(route.route_name).replace(/'/g, "\\'")}')">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 渲染分页
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
    loadRouteList(page);
}

function prevPage() {
    if (currentPage > 1) {
        loadRouteList(currentPage - 1);
    }
}

function nextPage() {
    const totalPages = Math.ceil(totalCount / pageSize);
    if (currentPage < totalPages) {
        loadRouteList(currentPage + 1);
    }
}

function filterByStatus() {
    currentStatusFilter = parseInt(document.getElementById('statusFilter').value);
    loadRouteList(1);
}

function searchRoute() {
    currentKeyword = document.getElementById('searchInput').value.trim();
    loadRouteList(1);
}

function refreshList() {
    loadRouteList(currentPage);
}

// 加载启用的区域列表
async function loadActiveAreas() {
    try {
        const result = await Auth.fetchApi(AREA_API_BASE, 'listActive', {});
        activeAreas = result.data.list || [];
    } catch (error) {
        showToast('获取区域列表失败: ' + error.message, { type: 'error', closable: true });
        activeAreas = [];
    }
}

// 填充区域下拉选项
function populateAreaSelects() {
    const aSelect = document.getElementById('aAreaSelect');
    const bSelect = document.getElementById('bAreaSelect');

    const options = activeAreas.map(area =>
        `<option value="${area.area_id}">${escapeHtml(area.area_name)}</option>`
    ).join('');

    aSelect.innerHTML = '<option value="">请选择A点区域</option>' + options;
    bSelect.innerHTML = '<option value="">请选择B点区域</option>' + options;
}

// 打开添加路线弹窗
async function openAddModal() {
    editingRouteId = 0;
    document.getElementById('modalTitle').textContent = '添加路线';
    document.getElementById('routeNameInput').value = '';
    document.querySelector('input[name="routeStatus"][value="1"]').checked = true;

    await loadActiveAreas();
    populateAreaSelects();
    document.getElementById('aAreaSelect').value = '';
    document.getElementById('bAreaSelect').value = '';

    document.getElementById('routeModal').classList.add('show');
    document.getElementById('routeNameInput').focus();
}

// 打开编辑路线弹窗
async function openEditModal(routeId) {
    editingRouteId = routeId;

    showLoading();
    try {
        const result = await Auth.fetchApi(ROUTE_API_BASE, 'get', { route_id: routeId });
        const route = result.data.route;

        document.getElementById('modalTitle').textContent = '编辑路线';
        document.getElementById('routeNameInput').value = route.route_name;

        await loadActiveAreas();
        populateAreaSelects();

        document.getElementById('aAreaSelect').value = route.a_area_id;
        document.getElementById('bAreaSelect').value = route.b_area_id;

        const statusRadio = document.querySelector(`input[name="routeStatus"][value="${route.status}"]`);
        if (statusRadio) statusRadio.checked = true;

        document.getElementById('routeModal').classList.add('show');
        document.getElementById('routeNameInput').focus();
    } catch (error) {
        showToast('获取路线信息失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

function closeRouteModal() {
    document.getElementById('routeModal').classList.remove('show');
    editingRouteId = 0;
}

// 保存路线（新增或编辑）
async function saveRoute() {
    const routeName = document.getElementById('routeNameInput').value.trim();
    const aAreaId = parseInt(document.getElementById('aAreaSelect').value) || 0;
    const bAreaId = parseInt(document.getElementById('bAreaSelect').value) || 0;
    const status = parseInt(document.querySelector('input[name="routeStatus"]:checked').value);

    if (!routeName) {
        showToast('请输入路线名称', { type: 'error', closable: true });
        document.getElementById('routeNameInput').focus();
        return;
    }
    if (!aAreaId) {
        showToast('请选择A点区域', { type: 'error', closable: true });
        return;
    }
    if (!bAreaId) {
        showToast('请选择B点区域', { type: 'error', closable: true });
        return;
    }
    if (aAreaId === bAreaId) {
        showToast('A点和B点不能相同', { type: 'error', closable: true });
        return;
    }

    showLoading();
    try {
        if (editingRouteId > 0) {
            await Auth.fetchApi(ROUTE_API_BASE, 'update', {
                route_id: editingRouteId,
                route_name: routeName,
                a_area_id: aAreaId,
                b_area_id: bAreaId,
                status: status
            });
            showToast('修改成功', { type: 'success', closable: true });
        } else {
            await Auth.fetchApi(ROUTE_API_BASE, 'create', {
                route_name: routeName,
                a_area_id: aAreaId,
                b_area_id: bAreaId,
                status: status
            });
            showToast('添加成功', { type: 'success', closable: true });
        }
        closeRouteModal();
        refreshList();
    } catch (error) {
        showToast('保存失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

// 查看区域围栏
function viewArea(areaId) {
    if (!areaId) return;
    const overlay = document.getElementById('fenceOverlay');
    const iframe = document.getElementById('fenceIframe');
    iframe.src = '../business-area/area-fence/?area_id=' + areaId + '&only_view=1';
    overlay.classList.add('show');
    requestAnimationFrame(() => {
        overlay.classList.add('show-active');
    });

    window.addEventListener('message', function handler(e) {
        if (e.data && e.data.type === 'fenceCancel') {
            closeFenceOverlay();
            window.removeEventListener('message', handler);
        }
    });
}

function closeFenceOverlay() {
    const overlay = document.getElementById('fenceOverlay');
    const iframe = document.getElementById('fenceIframe');
    overlay.classList.remove('show-active');
    let closed = false;
    const cleanup = () => {
        if (closed) return;
        closed = true;
        overlay.classList.remove('show');
        iframe.src = '';
    };
    overlay.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 300);
}

// 停用路线
async function disableRoute(routeId) {
    if (!confirm('确定要停用该运营路线吗？')) return;

    showLoading();
    try {
        await Auth.fetchApi(ROUTE_API_BASE, 'disable', { route_id: routeId });
        showToast('停用成功', { type: 'success', closable: true });
        refreshList();
    } catch (error) {
        showToast('停用失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

// 启用路线
async function enableRoute(routeId) {
    if (!confirm('确定要启用该运营路线吗？')) return;

    showLoading();
    try {
        await Auth.fetchApi(ROUTE_API_BASE, 'enable', { route_id: routeId });
        showToast('启用成功', { type: 'success', closable: true });
        refreshList();
    } catch (error) {
        showToast('启用失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

// 删除路线
async function deleteRoute(routeId, routeName) {
    if (!confirm(`确定要删除运营路线"${routeName}"吗？删除后不可恢复！`)) return;

    showLoading();
    try {
        await Auth.fetchApi(ROUTE_API_BASE, 'delete', { route_id: routeId });
        showToast('删除成功', { type: 'success', closable: true });
        refreshList();
    } catch (error) {
        showToast('删除失败: ' + error.message, { type: 'error', closable: true });
    } finally {
        hideLoading();
    }
}

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchRoute();
});

document.getElementById('routeModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeRouteModal();
    }
});

window.goToPage = goToPage;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.filterByStatus = filterByStatus;
window.searchRoute = searchRoute;
window.refreshList = refreshList;
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.closeRouteModal = closeRouteModal;
window.saveRoute = saveRoute;
window.viewArea = viewArea;
window.closeFenceOverlay = closeFenceOverlay;
window.disableRoute = disableRoute;
window.enableRoute = enableRoute;
window.deleteRoute = deleteRoute;
