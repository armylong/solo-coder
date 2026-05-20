import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showToast } from '/static/_common/ui.js';
import { requireLogin } from '/static/_common/login-modal.js';
import { timeRangeConfig, setCurrentTimeRange, getCurrentTimeRange, addChartPoint, getDiskChartData, saveDiskChartData } from './data-store.js';
import { charts, updateChart, initCharts, initDiskChart } from './chart-manager.js';
import * as api from './api-service.js';
import { formatBytes, formatBytesPerSecond, formatDateTime } from './formatters.js';
import {
    updateLastUpdateTime,
    renderCPUInfo,
    renderMemoryInfo,
    renderSystemInfo,
    renderUptime,
    renderStatValue,
    renderProcessTable,
    renderErrorTable,
    renderDiskTable,
    renderNetworkTable,
    renderGPUInfo,
    renderPortTable
} from './ui-renderer.js';

const pageTitles = {
    'overview': '系统概览',
    'cpu': 'CPU监控',
    'memory': '内存监控',
    'disk': '硬盘监控',
    'network': '网络监控',
    'gpu': 'GPU监控',
    'process': '进程监控',
    'port': '端口监控'
};

let currentPage = 'overview';
let refreshTimer = null;
let confirmAction = null;

async function refreshMonitorPage(config) {
    const now = Date.now();
    
    try {
        const results = await Promise.allSettled(
            config.apiCalls.map(call => call())
        );
        
        const data = results.map(result => 
            result.status === 'fulfilled' ? result.value : null
        );
        
        if (config.onData) {
            config.onData(data, now);
        }
    } catch (error) {
        console.error(`刷新${config.name}失败:`, error);
        if (config.onError) {
            config.onError(error);
        }
    }
}

async function refreshOverview() {
    await refreshMonitorPage({
        name: '系统概览',
        apiCalls: [
            api.getCPUUsage,
            api.getMemoryInfo,
            api.getDiskInfo,
            api.getNetworkBandwidth,
            api.getGPUInfo,
            api.getSystemInfo,
            api.getUptime
        ],
        onData: (data, now) => {
            const [cpuUsage, memoryInfo, diskInfo, networkBandwidth, gpuInfo, systemInfo, uptime] = data;
            
            if (cpuUsage) {
                const cpuData = addChartPoint('cpu', now, { usage: cpuUsage.total_usage || 0 });
                updateChart(charts.cpu, cpuData, ['usage']);
                renderStatValue('cpuStat', `${(cpuUsage.total_usage || 0).toFixed(1)}%`);
            }
            
            if (memoryInfo) {
                const memoryData = addChartPoint('memory', now, { usage: memoryInfo.used_percent || 0 });
                updateChart(charts.memory, memoryData, ['usage']);
                renderStatValue('memoryStat', `${(memoryInfo.used_percent || 0).toFixed(1)}%`);
            }
            
            if (diskInfo && diskInfo.list && diskInfo.list.length > 0) {
                const mainDisk = diskInfo.list[0];
                renderStatValue('diskStat', `${(mainDisk.used_percent || 0).toFixed(1)}%`);
            }
            
            let totalSendRate = 0;
            let totalRecvRate = 0;
            if (networkBandwidth && networkBandwidth.list) {
                networkBandwidth.list.forEach(iface => {
                    totalSendRate += iface.send_rate || 0;
                    totalRecvRate += iface.recv_rate || 0;
                });
                
                const networkData = addChartPoint('network', now, { 
                    send: totalSendRate, 
                    recv: totalRecvRate 
                });
                updateChart(charts.network, networkData, ['send', 'recv']);
                
                const totalRate = totalSendRate + totalRecvRate;
                renderStatValue('networkStat', formatBytesPerSecond(totalRate));
            }
            
            let avgGpuUsage = 0;
            if (gpuInfo && gpuInfo.list && gpuInfo.list.length > 0) {
                const totalUsage = gpuInfo.list.reduce((sum, gpu) => sum + (gpu.usage_percent || 0), 0);
                avgGpuUsage = totalUsage / gpuInfo.list.length;
            }
            const gpuData = addChartPoint('gpu', now, { usage: avgGpuUsage });
            updateChart(charts.gpu, gpuData, ['usage']);
            
            renderSystemInfo(systemInfo);
            renderUptime(uptime);
        }
    });
}

async function refreshCPU() {
    await refreshMonitorPage({
        name: 'CPU监控',
        apiCalls: [
            api.getCPUInfo,
            api.getCPUUsage
        ],
        onData: async (data, now) => {
            const [cpuInfo, cpuUsage] = data;
            
            renderCPUInfo(cpuInfo);
            
            if (cpuUsage) {
                const cpuData = addChartPoint('cpu', now, { usage: cpuUsage.total_usage || 0 });
                updateChart(charts.cpuDetail, cpuData, ['usage']);
            }
            
            await refreshCPUProcesses();
        }
    });
}

async function refreshCPUProcesses() {
    try {
        const sortBy = document.getElementById('cpuSortBy')?.value || 'cpu';
        const sortDirection = document.getElementById('cpuSortDirection')?.value || 'desc';
        
        const data = await api.getCPUProcesses(sortBy, sortDirection, 50);
        
        const columns = [
            { key: 'pid', type: 'text' },
            { key: 'name', type: 'text' },
            { key: 'cpu', type: 'progress' },
            { key: 'memory', type: 'progress' },
            { key: 'memory_mb', type: 'memory' },
            { key: 'user', type: 'text' },
            { key: 'start_time', type: 'text' },
            { type: 'kill', pidKey: 'pid' }
        ];
        
        renderProcessTable('cpuProcessTableBody', data, columns, 'window.killProcessByPID');
    } catch (error) {
        console.error('刷新CPU进程列表失败:', error);
        renderErrorTable('cpuProcessTableBody', 8, error);
    }
}

async function refreshMemory() {
    await refreshMonitorPage({
        name: '内存监控',
        apiCalls: [api.getMemoryInfo],
        onData: (data, now) => {
            const [memoryInfo] = data;
            
            if (memoryInfo) {
                const memoryData = addChartPoint('memory', now, { usage: memoryInfo.used_percent || 0 });
                updateChart(charts.memoryDetail, memoryData, ['usage']);
                renderMemoryInfo(memoryInfo);
            }
        }
    });
}

async function refreshDisk() {
    const now = Date.now();
    const timeLabel = formatDateTime(now);
    const config = timeRangeConfig[getCurrentTimeRange()];
    
    try {
        const diskInfo = await api.getDiskInfo();
        
        renderDiskTable(diskInfo);
        
        if (diskInfo && diskInfo.list) {
            const chartData = getDiskChartData();
            
            chartData.labels.push(timeLabel);
            
            diskInfo.list.forEach(disk => {
                const diskKey = disk.mount_point;
                if (!chartData.disks[diskKey]) {
                    chartData.disks[diskKey] = {
                        label: `${disk.mount_point} (${disk.device})`,
                        data: []
                    };
                }
                chartData.disks[diskKey].data.push(disk.used_percent || 0);
            });
            
            if (chartData.labels.length > config.maxPoints) {
                chartData.labels.shift();
                for (const key of Object.keys(chartData.disks)) {
                    if (chartData.disks[key].data.length > 0) {
                        chartData.disks[key].data.shift();
                    }
                }
            }
            
            saveDiskChartData(chartData);
            
            if (!charts.disk) {
                charts.disk = initDiskChart(diskInfo.list);
            }
            
            if (charts.disk) {
                charts.disk.data.labels = chartData.labels;
                
                diskInfo.list.forEach((disk, index) => {
                    const diskKey = disk.mount_point;
                    if (charts.disk.data.datasets[index]) {
                        charts.disk.data.datasets[index].data = chartData.disks[diskKey]?.data || [];
                    }
                });
                
                charts.disk.update('none');
            }
        }
    } catch (error) {
        console.error('刷新磁盘监控失败:', error);
        renderErrorTable('diskTableBody', 7, error);
    }
}

async function refreshNetwork() {
    await refreshMonitorPage({
        name: '网络监控',
        apiCalls: [api.getNetworkBandwidth],
        onData: async (data, now) => {
            const [bandwidth] = data;
            
            let totalSendRate = 0;
            let totalRecvRate = 0;
            if (bandwidth && bandwidth.list) {
                bandwidth.list.forEach(iface => {
                    totalSendRate += iface.send_rate || 0;
                    totalRecvRate += iface.recv_rate || 0;
                });
                
                const networkData = addChartPoint('network', now, { 
                    send: totalSendRate, 
                    recv: totalRecvRate 
                });
                updateChart(charts.networkDetail, networkData, ['send', 'recv']);
                
                renderNetworkTable(bandwidth);
            }
            
            await refreshNetworkProcesses();
        }
    });
}

async function refreshNetworkProcesses() {
    try {
        const sortBy = document.getElementById('networkSortBy')?.value || 'usage';
        const sortDirection = document.getElementById('networkSortDirection')?.value || 'desc';
        
        const data = await api.getNetworkProcesses(sortBy, sortDirection, 50);
        
        const columns = [
            { key: 'pid', type: 'text', default: '-' },
            { key: 'name', type: 'text', default: '-' },
            { key: 'protocol', type: 'text', default: '-' },
            { key: 'local_port', type: 'text', default: '-' },
            { key: 'remote_port', type: 'text', default: '-' },
            { key: 'connections', type: 'text' },
            { key: 'state', type: 'text', default: '-' },
            { type: 'kill', pidKey: 'pid' }
        ];
        
        renderProcessTable('networkProcessTableBody', data, columns, 'window.killProcessByPID');
    } catch (error) {
        console.error('刷新网络进程列表失败:', error);
    }
}

async function refreshGPU() {
    await refreshMonitorPage({
        name: 'GPU监控',
        apiCalls: [api.getGPUInfo],
        onData: (data, now) => {
            const [gpuInfo] = data;
            
            let avgGpuUsage = 0;
            if (gpuInfo && gpuInfo.list && gpuInfo.list.length > 0) {
                const totalUsage = gpuInfo.list.reduce((sum, gpu) => sum + (gpu.usage_percent || 0), 0);
                avgGpuUsage = totalUsage / gpuInfo.list.length;
            }
            const gpuData = addChartPoint('gpu', now, { usage: avgGpuUsage });
            updateChart(charts.gpuDetail, gpuData, ['usage']);
            
            renderGPUInfo(gpuInfo);
        },
        onError: (error) => {
            renderErrorTable('gpuTableBody', 9, error);
        }
    });
}

async function refreshProcess() {
    await refreshMonitorPage({
        name: '进程监控',
        apiCalls: [
            () => api.getProcessList('cpu', 'desc', 100),
            api.getCPUUsage,
            api.getMemoryInfo
        ],
        onData: async (data, now) => {
            const [processList, cpuUsage, memoryInfo] = data;
            
            if (cpuUsage || memoryInfo) {
                const processChartData = addChartPoint('process', now, { 
                    cpu: cpuUsage?.total_usage || 0, 
                    memory: memoryInfo?.used_percent || 0 
                });
                updateChart(charts.process, processChartData, ['cpu', 'memory']);
            }
            
            await refreshProcessList();
        }
    });
}

async function refreshProcessList() {
    try {
        const sortBy = document.getElementById('processSortBy')?.value || 'cpu';
        const sortDirection = document.getElementById('processSortDirection')?.value || 'desc';
        
        const data = await api.getProcessList(sortBy, sortDirection, 100);
        
        const columns = [
            { key: 'pid', type: 'text' },
            { key: 'ppid', type: 'text', default: '-' },
            { key: 'name', type: 'text' },
            { key: 'cpu', type: 'progress' },
            { key: 'memory', type: 'progress' },
            { key: 'memory_mb', type: 'memory' },
            { key: 'num_threads', type: 'text', default: '-' },
            { key: 'status', type: 'text' },
            { key: 'user', type: 'text' },
            { key: 'start_time', type: 'text' },
            { type: 'kill', pidKey: 'pid' }
        ];
        
        renderProcessTable('processTableBody', data, columns, 'window.killProcessByPID');
    } catch (error) {
        console.error('刷新进程列表失败:', error);
        renderErrorTable('processTableBody', 11, error);
    }
}

async function refreshPort() {
    try {
        const portFilter = parseInt(document.getElementById('portFilter')?.value) || 0;
        const sortBy = document.getElementById('portSortBy')?.value || 'port';
        const sortDirection = document.getElementById('portSortDirection')?.value || 'desc';
        
        const data = await api.getPortInfo(portFilter, sortBy, sortDirection, 100);
        
        renderPortTable(data, 'window.killProcessByPort');
    } catch (error) {
        console.error('刷新端口监控失败:', error);
        renderErrorTable('portTableBody', 7, error);
    }
}

function clearPortFilter() {
    const filterInput = document.getElementById('portFilter');
    if (filterInput) {
        filterInput.value = '';
    }
    refreshPort();
}

function switchPage(page) {
    currentPage = page;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('.page-container').forEach(container => {
        container.classList.remove('active');
    });
    const pageContainer = document.getElementById(`page-${page}`);
    if (pageContainer) {
        pageContainer.classList.add('active');
    }
    
    document.getElementById('pageTitle').textContent = pageTitles[page] || '系统监控';
    
    refreshCurrentPage();
}

function switchTimeRange(range) {
    setCurrentTimeRange(range);
    
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.range === range) {
            btn.classList.add('active');
        }
    });
    
    initCharts();
    refreshCurrentPage();
}

function manualRefresh() {
    refreshCurrentPage();
}

function refreshCurrentPage() {
    switch (currentPage) {
        case 'overview':
            refreshOverview();
            break;
        case 'cpu':
            refreshCPU();
            break;
        case 'memory':
            refreshMemory();
            break;
        case 'disk':
            refreshDisk();
            break;
        case 'network':
            refreshNetwork();
            break;
        case 'gpu':
            refreshGPU();
            break;
        case 'process':
            refreshProcess();
            break;
        case 'port':
            refreshPort();
            break;
    }
    updateLastUpdateTime();
}

function showConfirmModal(title, message, action) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    confirmAction = action;
    modal.classList.add('show');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    confirmAction = null;
}

function executeConfirmAction() {
    if (confirmAction) {
        confirmAction();
    }
    closeConfirmModal();
}

function killProcessByPID(pid, name) {
    showConfirmModal(
        '确认杀死进程',
        `确定要杀死进程 "${name}" (PID: ${pid}) 吗？`,
        async () => {
            try {
                await api.killProcessByPID(pid);
                showToast('进程已终止', { type: 'success', closable: true });
                refreshCurrentPage();
            } catch (error) {
                showToast('杀死进程失败: ' + error.message, 'error');
            }
        }
    );
}

function killProcessByPort(port, pid) {
    showConfirmModal(
        '确认杀死端口占用进程',
        `确定要杀死占用端口 ${port} 的进程 (PID: ${pid}) 吗？`,
        async () => {
            try {
                await api.killProcessByPort(port);
                showToast('进程已终止', { type: 'success', closable: true });
                refreshCurrentPage();
            } catch (error) {
                showToast('杀死进程失败: ' + error.message, 'error');
            }
        }
    );
}

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    const config = timeRangeConfig[getCurrentTimeRange()];
    refreshTimer = setInterval(() => {
        refreshCurrentPage();
    }, config.interval);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.isAuthenticated()) {
        requireLogin(function() { location.reload(); }, { closable: true });
        return;
    }
    if (!Auth.requirePermission(PERMISSION.SUPER_ADMIN)) {
        return;
    }
    
    initCharts();
    refreshCurrentPage();
    startAutoRefresh();
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeConfirmModal();
        }
    });
});

window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});

window.switchPage = switchPage;
window.switchTimeRange = switchTimeRange;
window.manualRefresh = manualRefresh;
window.killProcessByPID = killProcessByPID;
window.killProcessByPort = killProcessByPort;
window.closeConfirmModal = closeConfirmModal;
window.executeConfirmAction = executeConfirmAction;
window.clearPortFilter = clearPortFilter;