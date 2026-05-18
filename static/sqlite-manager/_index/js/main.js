import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';
import { requireLogin } from '/static/_common/login-modal.js';

const API_BASE = '/sqlite_long';
let currentTable = '';
let currentPage = 1;
const pageSize = 10;
let totalRows = 0;
let primaryKeyColumn = 'id';
let currentOrderBy = '';
let currentOrderDir = '';
let currentFilters = {};
let currentColumns = [];
let selectedRowIds = new Set();
let editingRowId = null;
let editingRowData = null;
let inlineEditingCell = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    if (!Auth.requirePermission(PERMISSION.SUPER_ADMIN)) {
        return;
    }
    initEventListeners();
    loadOverview();
    loadTableList();

    const urlParams = new URLSearchParams(window.location.search);
    const tableName = urlParams.get('table');
    if (tableName) {
        showTable(tableName);
    }
});

function initEventListeners() {
    document.querySelector('.overview-item').addEventListener('click', () => {
        showOverview();
    });

    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadTableData(currentTable, currentPage);
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(totalRows / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            loadTableData(currentTable, currentPage);
        }
    });

    document.getElementById('sqlInput').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            executeSql();
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('cell-modal')) {
            closeCellModal();
        }
        if (e.target.classList.contains('edit-modal')) {
            closeEditModal();
        }
    });
}

async function loadOverview() {
    showLoading();
    try {
        const result = await Auth.fetchApi(API_BASE, 'overview');
        const data = result.data;
        
        document.getElementById('dbPath').textContent = data.database_path;
        document.getElementById('dbSize').textContent = formatSize(data.database_size);
        document.getElementById('tableCount').textContent = data.table_count;
        
        const grid = document.getElementById('tablesGrid');
        grid.innerHTML = data.tables.map(table => `
            <div class="table-card" onclick="showTable('${table.name}')">
                <div class="name">${table.name}</div>
                <div class="info">${table.row_count} 条记录 · ${table.column_count} 个字段</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载概览失败:', error);
    } finally {
        hideLoading();
    }
}

async function loadTableList() {
    try {
        const result = await Auth.fetchApi(API_BASE, 'tableList', { page: 1, page_size: 100 });
        const data = result.data;
        
        const list = document.getElementById('tablesList');
        list.innerHTML = data.tables.map(table => `
            <div class="table-item" data-table="${table.name}" onclick="showTable('${table.name}')">
                <span class="table-name">${table.name}</span>
                <span class="row-count">${table.row_count}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载表列表失败:', error);
    }
}

function showOverview() {
    document.querySelectorAll('.sidebar-item, .table-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector('.overview-item').classList.add('active');
    
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById('overviewPanel').classList.add('active');
    
    const url = new URL(window.location);
    url.searchParams.delete('table');
    window.history.replaceState({}, '', url);
    
    loadOverview();
}

async function showTable(tableName) {
    currentTable = tableName;
    currentPage = 1;
    currentOrderBy = '';
    currentOrderDir = '';
    currentFilters = {};
    selectedRowIds.clear();
    
    const url = new URL(window.location);
    url.searchParams.set('table', tableName);
    window.history.replaceState({}, '', url);
    
    document.querySelectorAll('.sidebar-item, .table-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const tableItem = document.querySelector(`.table-item[data-table="${tableName}"]`);
    if (tableItem) {
        tableItem.classList.add('active');
    }
    
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById('tablePanel').classList.add('active');
    
    const select = document.getElementById('pendingFilterColumn');
    const input = document.getElementById('pendingFilterValue');
    if (select) select.value = '';
    if (input) input.value = '';
    
    const sqlInput = document.getElementById('sqlInput');
    if (sqlInput.value.trim() === '' || sqlInput.value.startsWith('SELECT * FROM ')) {
        sqlInput.value = `SELECT * FROM ${tableName} WHERE `;
    }
    
    await loadTableSchema(tableName);
    loadTableData(tableName, currentPage);
}

async function loadTableSchema(tableName) {
    try {
        const result = await Auth.fetchApi(API_BASE, 'tableSchema', { table_name: tableName });
        const data = result.data;
        primaryKeyColumn = 'id';
        
        if (data.columns) {
            for (const col of data.columns) {
                if (col.primary_key === 1) {
                    primaryKeyColumn = col.name;
                    break;
                }
            }
        }
    } catch (error) {
        console.error('加载表结构失败:', error);
    }
}

async function loadTableData(tableName, page) {
    showLoading();
    try {
        const params = {
            table_name: tableName,
            page: page,
            page_size: pageSize
        };
        
        if (currentOrderBy) {
            params.order_by = currentOrderBy;
            params.order_dir = currentOrderDir;
        }
        if (Object.keys(currentFilters).length > 0) {
            params.filters = currentFilters;
        }
        
        const result = await Auth.fetchApi(API_BASE, 'tableData', params);
        const data = result.data;
        
        totalRows = data.total || 0;
        const columns = data.columns || [];
        currentColumns = columns;
        const rows = data.rows || [];
        
        populatePendingFilterSelect();
        renderFilterTags();
        
        document.getElementById('currentTableName').textContent = tableName;
        document.getElementById('tableRowCount').textContent = `总条数: ${totalRows}`;
        document.getElementById('totalRows').textContent = totalRows;
        
        const thead = document.getElementById('tableHead');
        if (columns.length === 0) {
            thead.innerHTML = '<tr><th>无字段</th></tr>';
        } else {
            let headerHtml = '<tr>';
            headerHtml += '<th class="checkbox-col"><input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)"></th>';
            columns.forEach(col => {
                const isAsc = currentOrderBy === col && currentOrderDir === 'ASC';
                const isDesc = currentOrderBy === col && currentOrderDir === 'DESC';
                headerHtml += `<th class="sortable-header" data-column="${col}">
                    <span class="column-name">${col}</span>
                    <span class="sort-buttons">
                        <span class="sort-btn ${isAsc ? 'active' : ''}" onclick="sortBy('${col}', 'ASC')">▲</span>
                        <span class="sort-btn ${isDesc ? 'active' : ''}" onclick="sortBy('${col}', 'DESC')">▼</span>
                    </span>
                </th>`;
            });
            headerHtml += '<th class="action-col">操作</th>';
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;
        }
        
        const tbody = document.getElementById('tableBody');
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length + 2 || 1}" style="text-align: center; color: #999;">暂无数据</td></tr>`;
        } else {
            tbody.innerHTML = rows.map(row => {
                let rowId = row[primaryKeyColumn];
                if (rowId === undefined || rowId === null) {
                    rowId = row['id'];
                }
                const isChecked = selectedRowIds.has(String(rowId));
                
                let trHtml = `<tr data-row-id="${rowId}">`;
                trHtml += `<td class="checkbox-col"><input type="checkbox" class="row-checkbox" data-row-id="${rowId}" ${isChecked ? 'checked' : ''} onchange="toggleRowSelection(this, ${rowId})"></td>`;
                trHtml += columns.map(col => {
                    let value = row[col];
                    let displayValue = value;
                    let rawValue = '';
                    if (value === null || value === undefined) {
                        displayValue = '<span style="color: #999;">NULL</span>';
                        rawValue = '';
                    } else if (typeof value === 'object') {
                        displayValue = JSON.stringify(value);
                        rawValue = JSON.stringify(value);
                    } else {
                        rawValue = String(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    }
                    return `<td data-col="${col}" data-value="${rawValue}" data-row-id="${rowId}" ondblclick="startInlineEdit(this, ${rowId}, '${col}')">${displayValue}</td>`;
                }).join('');
                trHtml += `<td class="action-col">
                    <button class="btn-edit-row" onclick="editRow(${rowId})" title="编辑">✏️</button>
                    <button class="btn-delete-row" onclick="deleteRow(${rowId})" title="删除">🗑</button>
                </td>`;
                trHtml += '</tr>';
                return trHtml;
            }).join('');
            
            tbody.querySelectorAll('td[data-col]').forEach(td => {
                td.addEventListener('click', function(e) {
                    if (e.detail === 1) {
                        setTimeout(() => {
                            if (inlineEditingCell === null) {
                                const col = this.getAttribute('data-col');
                                const value = this.getAttribute('data-value');
                                showCellModal(col, value || null);
                            }
                        }, 200);
                    }
                });
            });
        }
        
        const totalPages = Math.ceil(totalRows / pageSize) || 1;
        renderPagination(page, totalPages);
        
    } catch (error) {
        console.error('加载表数据失败:', error);
        alert('加载表数据失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderPagination(currentPage, totalPages) {
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
    
    const pageNumbers = document.getElementById('pageNumbers');
    let html = '';
    
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
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
        if (i === currentPage) {
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
    currentPage = page;
    loadTableData(currentTable, currentPage);
}

async function executeSql() {
    const sqlInput = document.getElementById('sqlInput');
    const sql = sqlInput.value.trim();
    
    if (!sql) {
        showToast('请输入 SQL 语句', { type: 'warning', closable: true });
        return;
    }
    
    showLoading();
    try {
        const result = await Auth.fetchApi(API_BASE, 'executeSql', {
            sql: sql,
            table_name: currentTable
        });
        const data = result.data;
        
        if (data.is_query) {
            renderTableFromSqlResult(data);
            showToast(`查询成功，共 ${data.total} 条记录`, 'success');
        } else {
            showToast(`执行成功，影响 ${data.affected} 行`, 'success');
            if (currentTable) {
                currentPage = 1;
                currentOrderBy = '';
                currentOrderDir = '';
                currentFilters = {};
                selectedRowIds.clear();
                loadTableData(currentTable, currentPage);
                loadTableList();
            }
        }
        
    } catch (error) {
        console.error('执行SQL失败:', error);
        showToast('执行SQL失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderTableFromSqlResult(data) {
    const columns = data.columns || [];
    const rows = data.rows || [];
    totalRows = data.total || 0;
    currentColumns = columns;
    
    document.getElementById('totalRows').textContent = totalRows;
    
    const thead = document.getElementById('tableHead');
    if (columns.length === 0) {
        thead.innerHTML = '<tr><th>无字段</th></tr>';
    } else {
        let headerHtml = '<tr>';
        headerHtml += '<th class="checkbox-col"><input type="checkbox" disabled title="SQL查询结果模式下不可选"></th>';
        columns.forEach(col => {
            headerHtml += `<th>${col}</th>`;
        });
        headerHtml += '<th class="action-col">操作</th>';
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;
    }
    
    const tbody = document.getElementById('tableBody');
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columns.length + 2 || 1}" style="text-align: center; color: #999;">查询结果为空</td></tr>`;
    } else {
        tbody.innerHTML = rows.map(row => {
            let trHtml = '<tr>';
            trHtml += `<td class="checkbox-col"><input type="checkbox" disabled></td>`;
            trHtml += columns.map(col => {
                let value = row[col];
                let displayValue = value;
                if (value === null || value === undefined) {
                    displayValue = '<span style="color: #999;">NULL</span>';
                } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value);
                }
                return `<td>${displayValue}</td>`;
            }).join('');
            trHtml += `<td class="action-col">-</td>`;
            trHtml += '</tr>';
            return trHtml;
        }).join('');
    }
    
    renderPagination(1, 1);
}

function refreshCurrentTable() {
    if (currentTable) {
        currentPage = 1;
        currentOrderBy = '';
        currentOrderDir = '';
        currentFilters = {};
        selectedRowIds.clear();
        document.getElementById('filterRows').innerHTML = '';
        loadTableList();
        loadTableData(currentTable, currentPage);
    }
}

function sortBy(column, direction) {
    currentOrderBy = column;
    currentOrderDir = direction;
    currentPage = 1;
    loadTableData(currentTable, currentPage);
}

function populatePendingFilterSelect() {
    const select = document.getElementById('pendingFilterColumn');
    if (!select) return;
    
    select.innerHTML = '<option value="">选择字段</option>' + 
        currentColumns.map(col => `<option value="${col}">${col}</option>`).join('');
}

function addPendingFilter() {
    const select = document.getElementById('pendingFilterColumn');
    const input = document.getElementById('pendingFilterValue');
    
    const column = select.value;
    const value = input.value.trim();
    
    if (!column) {
        alert('请选择字段');
        return;
    }
    if (!value) {
        alert('请输入值');
        return;
    }
    
    if (currentFilters[column]) {
        if (!confirm(`字段 "${column}" 已存在筛选条件，是否覆盖？`)) {
            return;
        }
    }
    
    currentFilters[column] = value;
    select.value = '';
    input.value = '';
    
    renderFilterTags();
    currentPage = 1;
    loadTableData(currentTable, currentPage);
}

function renderFilterTags() {
    const container = document.getElementById('filterTags');
    if (!container) return;
    
    if (Object.keys(currentFilters).length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = Object.entries(currentFilters).map(([col, val]) => `
        <div class="filter-tag">
            <span class="filter-tag-col">${col}:</span>
            <span class="filter-tag-val" title="${escapeHtml(val)}">${escapeHtml(val)}</span>
            <button class="filter-tag-remove" onclick="removeFilter('${col}')">×</button>
        </div>
    `).join('');
}

function removeFilter(column) {
    delete currentFilters[column];
    renderFilterTags();
    currentPage = 1;
    loadTableData(currentTable, currentPage);
}

function clearFilters() {
    currentFilters = {};
    const select = document.getElementById('pendingFilterColumn');
    const input = document.getElementById('pendingFilterValue');
    if (select) select.value = '';
    if (input) input.value = '';
    renderFilterTags();
    currentPage = 1;
    loadTableData(currentTable, currentPage);
}

function toggleSelectAll(checkbox) {
    const isChecked = checkbox.checked;
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    
    rowCheckboxes.forEach(cb => {
        cb.checked = isChecked;
        const rowId = cb.getAttribute('data-row-id');
        if (isChecked) {
            selectedRowIds.add(rowId);
        } else {
            selectedRowIds.delete(rowId);
        }
    });
}

function toggleRowSelection(checkbox, rowId) {
    const rowIdStr = String(rowId);
    if (checkbox.checked) {
        selectedRowIds.add(rowIdStr);
    } else {
        selectedRowIds.delete(rowIdStr);
    }
    
    updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (rowCheckboxes.length === 0) {
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        return;
    }
    
    let allChecked = true;
    rowCheckboxes.forEach(cb => {
        if (!cb.checked) {
            allChecked = false;
        }
    });
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked;
    }
}

async function deleteSelectedRows() {
    if (selectedRowIds.size === 0) {
        alert('请先选择要删除的记录');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedRowIds.size} 条记录吗？此操作不可恢复！`)) {
        return;
    }
    
    const rowIds = Array.from(selectedRowIds).map(id => parseInt(id, 10));
    
    showLoading();
    try {
        const result = await Auth.fetchApi(API_BASE, 'deleteRows', {
            table_name: currentTable,
            row_ids: rowIds,
            primary_key: primaryKeyColumn
        });
        const data = result.data;
        alert(`已删除 ${data.deleted} 条记录`);
        selectedRowIds.clear();
        loadTableList();
        loadTableData(currentTable, currentPage);
    } catch (error) {
        console.error('批量删除失败:', error);
        alert('批量删除失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function clearTable() {
    if (!currentTable) {
        alert('请先选择一个表');
        return;
    }
    
    if (!confirm(`确定要清空表 "${currentTable}" 的所有数据吗？此操作不可恢复！`)) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'clearTable', { table_name: currentTable });
        alert('清空表成功');
        selectedRowIds.clear();
        loadTableData(currentTable, 1);
        loadTableList();
    } catch (error) {
        console.error('清空表失败:', error);
        alert('清空表失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function deleteRow(rowId) {
    if (!currentTable) {
        alert('请先选择一个表');
        return;
    }
    
    if (!confirm(`确定要删除这条记录吗？(ID: ${rowId})`)) {
        return;
    }
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'deleteRow', {
            table_name: currentTable,
            row_id: rowId,
            primary_key: primaryKeyColumn
        });
        alert('删除成功');
        selectedRowIds.delete(String(rowId));
        loadTableData(currentTable, currentPage);
        loadTableList();
    } catch (error) {
        console.error('删除行失败:', error);
        alert('删除行失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function editRow(rowId) {
    editingRowId = rowId;
    
    const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!row) {
        alert('找不到该行数据');
        return;
    }
    
    const rowData = {};
    currentColumns.forEach(col => {
        const td = row.querySelector(`td[data-col="${col}"]`);
        if (td) {
            const value = td.getAttribute('data-value');
            rowData[col] = value === '' ? null : value;
        }
    });
    
    editingRowData = rowData;
    
    const modalTitle = document.getElementById('editModalTitle');
    const modalBody = document.getElementById('editModalBody');
    
    modalTitle.textContent = `编辑记录 (${primaryKeyColumn}: ${rowId})`;
    
    let formHtml = '';
    currentColumns.forEach(col => {
        const value = rowData[col];
        const isPk = col === primaryKeyColumn;
        const displayValue = value === null ? '' : value;
        
        formHtml += `
            <div class="form-group">
                <label class="form-label">${col}${isPk ? ' (主键)' : ''}</label>
                ${isPk ? 
                    `<input type="text" class="form-input" value="${escapeHtml(displayValue)}" disabled>` :
                    `<textarea class="form-input form-textarea" id="edit_${col}" data-column="${col}">${escapeHtml(displayValue)}</textarea>`
                }
            </div>
        `;
    });
    
    modalBody.innerHTML = formHtml;
    document.getElementById('editModal').classList.add('show');
}

async function saveEdit() {
    if (!editingRowId) {
        return;
    }
    
    const updates = {};
    currentColumns.forEach(col => {
        if (col === primaryKeyColumn) {
            return;
        }
        const input = document.getElementById(`edit_${col}`);
        if (input) {
            updates[col] = input.value;
        }
    });
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'updateRow', {
            table_name: currentTable,
            row_id: editingRowId,
            primary_key: primaryKeyColumn,
            updates: updates
        });
        alert('保存成功');
        closeEditModal();
        loadTableData(currentTable, currentPage);
        loadTableList();
    } catch (error) {
        console.error('保存编辑失败:', error);
        alert('保存编辑失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    editingRowId = null;
    editingRowData = null;
}

function startInlineEdit(cell, rowId, column) {
    if (column === primaryKeyColumn) {
        return;
    }
    
    if (inlineEditingCell) {
        cancelInlineEdit();
    }
    
    inlineEditingCell = cell;
    
    const currentValue = cell.getAttribute('data-value') || '';
    const originalContent = cell.innerHTML;
    cell.setAttribute('data-original-content', originalContent);
    
    cell.innerHTML = `
        <input type="text" class="inline-edit-input" value="${escapeHtml(currentValue)}" 
               onblur="saveInlineEdit(event, ${rowId}, '${column}')"
               onkeydown="handleInlineEditKeydown(event, ${rowId}, '${column}')">
    `;
    
    const input = cell.querySelector('input');
    input.focus();
    input.select();
}

function handleInlineEditKeydown(event, rowId, column) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveInlineEdit(event, rowId, column);
    } else if (event.key === 'Escape') {
        cancelInlineEdit();
    }
}

async function saveInlineEdit(event, rowId, column) {
    if (!inlineEditingCell) {
        return;
    }
    
    const input = inlineEditingCell.querySelector('input');
    const newValue = input ? input.value : '';
    
    const updates = {};
    updates[column] = newValue;
    
    const cell = inlineEditingCell;
    inlineEditingCell = null;
    
    showLoading();
    try {
        await Auth.fetchApi(API_BASE, 'updateRow', {
            table_name: currentTable,
            row_id: rowId,
            primary_key: primaryKeyColumn,
            updates: updates
        });
        cell.setAttribute('data-value', newValue);
        cell.innerHTML = newValue === '' ? '<span style="color: #999;">NULL</span>' : escapeHtml(newValue);
        loadTableList();
    } catch (error) {
        console.error('保存编辑失败:', error);
        alert('保存编辑失败: ' + error.message);
        cancelInlineEdit();
    } finally {
        hideLoading();
    }
}

function cancelInlineEdit() {
    if (inlineEditingCell) {
        const originalContent = inlineEditingCell.getAttribute('data-original-content');
        if (originalContent) {
            inlineEditingCell.innerHTML = originalContent;
        }
        inlineEditingCell = null;
    }
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showCellModal(columnName, value) {
    const modal = document.getElementById('cellModal');
    const title = document.getElementById('cellModalTitle');
    const body = document.getElementById('cellModalBody');
    
    title.textContent = `字段: ${columnName}`;
    
    if (value === null || value === undefined || value === '') {
        body.innerHTML = '<div class="raw-text" style="color: #999;">NULL</div>';
    } else {
        const strValue = String(value);
        try {
            const jsonObj = JSON.parse(strValue);
            body.innerHTML = `<pre>${JSON.stringify(jsonObj, null, 2)}</pre>`;
        } catch (e) {
            body.innerHTML = `<div class="raw-text">${escapeHtml(strValue)}</div>`;
        }
    }
    
    modal.classList.add('show');
}

function closeCellModal() {
    document.getElementById('cellModal').classList.remove('show');
}

window.showTable = showTable;
window.showOverview = showOverview;
window.goToPage = goToPage;
window.executeSql = executeSql;
window.sortBy = sortBy;
window.addPendingFilter = addPendingFilter;
window.removeFilter = removeFilter;
window.clearFilters = clearFilters;
window.toggleSelectAll = toggleSelectAll;
window.toggleRowSelection = toggleRowSelection;
window.deleteSelectedRows = deleteSelectedRows;
window.clearTable = clearTable;
window.deleteRow = deleteRow;
window.editRow = editRow;
window.closeEditModal = closeEditModal;
window.saveEdit = saveEdit;
window.startInlineEdit = startInlineEdit;
window.showCellModal = showCellModal;
window.closeCellModal = closeCellModal;
window.closeSqlResult = closeSqlResult;
window.refreshCurrentTable = refreshCurrentTable;


