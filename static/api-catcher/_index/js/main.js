import { Auth } from '/static/_common/auth.js';
import { showLoading, hideLoading } from '/static/_common/ui.js';

const API_BASE = '/api_catcher';
let currentPanel = 'overview';
let currentPage = 1;
const pageSize = 20;
let totalRows = 0;
let lastId = 0;
let selectedRecordId = null;
let pollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    initEventListeners();
    loadInitialData();
    startPolling();
});

function initDatePicker() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('datePicker').value = today;
}

function initEventListeners() {
    document.querySelector('.overview-item').addEventListener('click', () => showPanel('overview'));
    document.querySelector('[data-type="history"]').addEventListener('click', () => showPanel('history'));
    
    document.getElementById('refreshHistory').addEventListener('click', loadHistory);
    document.getElementById('backToList').addEventListener('click', () => showPanel('history'));
    document.getElementById('deleteRecord').addEventListener('click', deleteCurrentRecord);
    
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadHistory();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(totalRows / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            loadHistory();
        }
    });

    document.getElementById('datePicker').addEventListener('change', () => {
        if (currentPanel === 'history') {
            currentPage = 1;
            loadHistory();
        }
    });
}

function showPanel(panelName) {
    currentPanel = panelName;
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (panelName === 'overview') {
        document.querySelector('.overview-item').classList.add('active');
    } else if (panelName === 'history') {
        document.querySelector('[data-type="history"]').classList.add('active');
    }
    
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(panelName + 'Panel').classList.add('active');
    
    if (panelName === 'overview') {
        startPolling();
    } else {
        stopPolling();
    }
    
    if (panelName === 'history') {
        loadHistory();
    }
}

function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(pollData, 1000);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

async function pollData() {
    try {
        const date = document.getElementById('datePicker').value;
        const result = await Auth.fetchApi(API_BASE, 'download', { id: lastId, limit: 50, date: date });
        const data = result.data;
        
        if (data.list && data.list.length > 0) {
            renderApiList(data.list);
            
            const maxId = Math.max(...data.list.map(item => item.id));
            if (maxId > lastId) {
                lastId = maxId;
                document.getElementById('lastId').textContent = lastId;
            }
            
            document.getElementById('updateTime').textContent = new Date().toLocaleTimeString();
            document.getElementById('todayCount').textContent = data.total || 0;
        }
    } catch (error) {
        console.error('轮询失败:', error);
    }
}

async function loadInitialData() {
    const date = document.getElementById('datePicker').value;
    try {
        const result = await Auth.fetchApi(API_BASE, 'list', { limit: 1, offset: 0 });
        const data = result.data;
        
        if (data.list && data.list.length > 0) {
            const firstItem = data.list[0];
            lastId = firstItem.id;
            document.getElementById('lastId').textContent = lastId;
        }
        
        document.getElementById('todayCount').textContent = data.total || 0;
        
        const downloadResult = await Auth.fetchApi(API_BASE, 'download', { id: 0, limit: 20, date: date });
        const downloadData = downloadResult.data;
        renderApiList(downloadData.list || []);
    } catch (error) {
        console.error('加载初始数据失败:', error);
    }
}

async function loadHistory() {
    showLoading();
    try {
        const offset = (currentPage - 1) * pageSize;
        
        const result = await Auth.fetchApi(API_BASE, 'list', { limit: pageSize, offset: offset });
        const data = result.data;
        
        totalRows = data.total || 0;
        renderHistoryTable(data.list || [], totalRows, currentPage, pageSize);
    } catch (error) {
        console.error('加载历史记录失败:', error);
    } finally {
        hideLoading();
    }
}

function parseData(dataStr) {
    try {
        return JSON.parse(dataStr);
    } catch {
        return null;
    }
}

function renderApiList(list) {
    const container = document.getElementById('apiList');
    
    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📡</div>
                <div class="empty-state-text">暂无抓取数据</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = list.map(item => {
        const data = parseData(item.data);
        const filterList = data?.filter_list || [];
        const apiData = data?.api_data || {};
        const method = (apiData.method || 'GET').toLowerCase();
        return `
            <div class="api-item" onclick="showDetail(${item.id})">
                <div class="api-item-header">
                    <span class="api-item-id">#${item.id}</span>
                    <span class="api-item-time">${formatTime(item.created_at)}</span>
                </div>
                <div class="api-item-filters">
                    ${filterList.map(f => `<span class="filter-tag">${f}</span>`).join('')}
                </div>
                <div class="api-item-url">
                    <span class="api-method method-${method}">${apiData.method || 'GET'}</span>
                    <span class="api-url">${apiData.url || '-'}</span>
                </div>
                <div class="api-item-meta">
                    <span>状态: <strong class="status-${apiData.status >= 200 && apiData.status < 300 ? 'success' : 'error'}">${apiData.status || '-'}</strong></span>
                    <span>耗时: <strong>${apiData.duration || '-'}ms</strong></span>
                </div>
            </div>
        `;
    }).join('');
}

function renderHistoryTable(list, total, page, size) {
    const tbody = document.getElementById('historyBody');
    document.getElementById('totalRows').textContent = total;
    
    const totalPages = Math.ceil(total / size) || 1;
    document.getElementById('pageInfo').textContent = `${page} / ${totalPages}`;
    
    document.getElementById('prevPage').disabled = page <= 1;
    document.getElementById('nextPage').disabled = page >= totalPages;
    
    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #999; padding: 40px;">
                    暂无记录
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = list.map(item => {
        const data = parseData(item.data);
        const filterList = data?.filter_list || [];
        const apiData = data?.api_data || {};
        return `
            <tr>
                <td>#${item.id}</td>
                <td>
                    <span class="api-method method-${(apiData.method || 'get').toLowerCase()}">${apiData.method || 'GET'}</span>
                    ${apiData.url || '-'}
                </td>
                <td>${filterList.join(', ') || '-'}</td>
                <td>${formatTime(item.created_at)}</td>
                <td>
                    <button class="btn btn-secondary" onclick="showDetail(${item.id})">查看</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function showDetail(id) {
    showLoading();
    try {
        const result = await Auth.fetchApi(API_BASE, 'get', { id: id });
        
        if (!result.data) {
            alert('记录不存在');
            return;
        }
        
        selectedRecordId = id;
        
        const data = parseData(result.data.data);
        const filterList = data?.filter_list || [];
        const apiData = data?.api_data || {};
        
        document.getElementById('detailId').textContent = '#' + id;
        
        const filterContainer = document.getElementById('filterTags');
        if (filterList.length > 0) {
            filterContainer.innerHTML = filterList.map(f => 
                `<span class="filter-tag">${f}</span>`
            ).join('');
        } else {
            filterContainer.innerHTML = '<span style="color: #999;">无筛选条件</span>';
        }
        
        const apiListContainer = document.getElementById('apiDetailList');
        apiListContainer.innerHTML = `
            <div class="api-detail-item" onclick="showApiDetail()">
                <div class="api-detail-item-header">
                    <span class="api-detail-method method-${(apiData.method || 'get').toLowerCase()}">${apiData.method || 'GET'}</span>
                    <span class="api-detail-url">${apiData.url || '-'}</span>
                </div>
                <div class="api-detail-meta">
                    <span>状态码: ${apiData.status || '-'}</span>
                    <span>耗时: ${apiData.duration || '-'}ms</span>
                    <span>抓取时间: ${apiData.capture_time ? formatTime(apiData.capture_time / 1000) : '-'}</span>
                </div>
            </div>
        `;
        
        window.currentApiData = apiData;
        
        document.getElementById('historyPanel').classList.remove('active');
        document.getElementById('detailPanel').classList.add('active');
    } catch (error) {
        console.error('加载详情失败:', error);
        alert('加载详情失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

function showApiDetail() {
    const api = window.currentApiData;
    if (!api) return;
    
    const modal = document.getElementById('apiDetailModal');
    const body = document.getElementById('apiDetailModalBody');
    
    body.innerHTML = `
        <div class="modal-section">
            <div class="modal-section-title">请求ID</div>
            <div class="modal-section-content">${api.id || '-'}</div>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">请求URL</div>
            <div class="modal-section-content">${api.url || '-'}</div>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">请求方法</div>
            <div class="modal-section-content">${api.method || 'GET'}</div>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">状态码</div>
            <div class="modal-section-content">${api.status || '-'}</div>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">耗时</div>
            <div class="modal-section-content">${api.duration || '-'} ms</div>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">请求头 (Headers)</div>
            <div class="modal-section-content">${formatJson(api.headers)}</div>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">URL参数 (Params)</div>
            <div class="modal-section-content">${formatJson(api.params)}</div>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">请求体 (Request Body)</div>
            <div class="modal-section-content">${formatJson(api.request_body)}</div>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">响应体 (Response Body)</div>
            <div class="modal-section-content">${formatJson(api.response_body)}</div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeApiDetailModal() {
    document.getElementById('apiDetailModal').classList.remove('show');
}

async function deleteCurrentRecord() {
    if (!selectedRecordId) return;
    
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
        await Auth.fetchApi(API_BASE, 'delete', { id: selectedRecordId });
        alert('删除成功');
        selectedRecordId = null;
        showPanel('history');
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败: ' + error.message);
    }
}

function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN');
}

function formatJson(obj) {
    if (!obj) return '(空)';
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

window.showDetail = showDetail;
window.showApiDetail = showApiDetail;
window.closeApiDetailModal = closeApiDetailModal;
