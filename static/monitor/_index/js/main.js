import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showToast, escapeHtml } from '/static/_common/ui.js';
import { requireLogin } from '/static/_common/login-modal.js';

const API_BASE = '/monitor';
const REFRESH_INTERVAL = 10000;

let currentPage = 'overview';
let currentTimeRange = '10s';
let refreshTimer = null;
let confirmAction = null;

const timeRangeConfig = {
    '10s': { maxPoints: 10, interval: 10000, label: '10秒' },
    '1m': { maxPoints: 60, interval: 10000, label: '1分钟' },
    '1h': { maxPoints: 360, interval: 10000, label: '1小时' },
    '1d': { maxPoints: 864, interval: 60000, label: '1天' }
};

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

const charts = {
    cpu: null,
    memory: null,
    network: null,
    gpu: null,
    cpuDetail: null,
    memoryDetail: null,
    networkDetail: null,
    gpuDetail: null,
    process: null,
    disk: null
};

const chartColors = {
    cpu: { border: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' },
    memory: { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' },
    network: { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
    gpu: { border: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' },
    disk: { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
    networkSend: { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },
    networkRecv: { border: '#06b6d4', background: 'rgba(6, 182, 212, 0.1)' }
};

const diskColorPalette = [
    { border: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' },
    { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' },
    { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
    { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },
    { border: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' },
    { border: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' },
    { border: '#06b6d4', background: 'rgba(6, 182, 212, 0.1)' },
    { border: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }
];

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatBytesPerSecond(bytesPerSec) {
    if (bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = '';
    if (days > 0) result += `${days}天 `;
    if (hours > 0) result += `${hours}小时 `;
    if (minutes > 0) result += `${minutes}分钟 `;
    if (seconds < 3600) result += `${secs}秒`;
    return result.trim() || '0秒';
}

function formatDateTime(date) {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    document.getElementById('updateInfo').textContent = `最后更新: ${timeStr}`;
}

function getDataKey(type) {
    return `monitor_${type}_${currentTimeRange}`;
}

function loadChartData(type) {
    const key = getDataKey(type);
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : { labels: [], datasets: {} };
}

function saveChartData(type, data) {
    const key = getDataKey(type);
    sessionStorage.setItem(key, JSON.stringify(data));
}

function addChartPoint(type, timestamp, values) {
    const data = loadChartData(type);
    const config = timeRangeConfig[currentTimeRange];
    const timeLabel = formatDateTime(timestamp);
    
    data.labels.push(timeLabel);
    
    for (const [key, value] of Object.entries(values)) {
        if (!data.datasets[key]) {
            data.datasets[key] = [];
        }
        data.datasets[key].push(value);
    }
    
    if (data.labels.length > config.maxPoints) {
        data.labels.shift();
        for (const key of Object.keys(data.datasets)) {
            data.datasets[key].shift();
        }
    }
    
    saveChartData(type, data);
    return data;
}

function clearChartData(type) {
    const key = getDataKey(type);
    sessionStorage.removeItem(key);
}

function createChart(canvasId, type, label, datasets = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    
    const chartDatasets = datasets.map(ds => ({
        label: ds.label,
        data: [],
        borderColor: ds.color.border,
        backgroundColor: ds.color.background,
        fill: ds.fill !== false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2
    }));
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: chartDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'top'
                },
                tooltip: {
                    enabled: true
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '时间'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    max: type === 'network' ? undefined : 100,
                    title: {
                        display: true,
                        text: type === 'network' ? '速率' : '使用率 (%)'
                    }
                }
            },
            animation: {
                duration: 300
            }
        }
    });
}

function updateChart(chart, data, datasetKeys) {
    if (!chart) return;
    
    chart.data.labels = data.labels;
    
    datasetKeys.forEach((key, index) => {
        if (chart.data.datasets[index]) {
            chart.data.datasets[index].data = data.datasets[key] || [];
        }
    });
    
    chart.update('none');
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
    currentTimeRange = range;
    
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

function initCharts() {
    if (charts.cpu) charts.cpu.destroy();
    if (charts.memory) charts.memory.destroy();
    if (charts.network) charts.network.destroy();
    if (charts.gpu) charts.gpu.destroy();
    if (charts.cpuDetail) charts.cpuDetail.destroy();
    if (charts.memoryDetail) charts.memoryDetail.destroy();
    if (charts.networkDetail) charts.networkDetail.destroy();
    if (charts.gpuDetail) charts.gpuDetail.destroy();
    if (charts.process) charts.process.destroy();
    if (charts.disk) charts.disk.destroy();
    
    charts.cpu = createChart('cpuChart', 'cpu', 'CPU使用率', [
        { label: 'CPU使用率', color: chartColors.cpu, key: 'usage' }
    ]);
    
    charts.memory = createChart('memoryChart', 'memory', '内存使用率', [
        { label: '内存使用率', color: chartColors.memory, key: 'usage' }
    ]);
    
    charts.network = createChart('networkChart', 'network', '网络流量', [
        { label: '发送速率', color: chartColors.networkSend, key: 'send' },
        { label: '接收速率', color: chartColors.networkRecv, key: 'recv' }
    ]);
    
    charts.gpu = createChart('gpuChart', 'gpu', 'GPU使用率', [
        { label: 'GPU使用率', color: chartColors.gpu, key: 'usage' }
    ]);
    
    charts.cpuDetail = createChart('cpuDetailChart', 'cpu', 'CPU使用率', [
        { label: 'CPU使用率', color: chartColors.cpu, key: 'usage' }
    ]);
    
    charts.memoryDetail = createChart('memoryDetailChart', 'memory', '内存使用率', [
        { label: '内存使用率', color: chartColors.memory, key: 'usage' }
    ]);
    
    charts.networkDetail = createChart('networkDetailChart', 'network', '网络流量', [
        { label: '发送速率', color: chartColors.networkSend, key: 'send' },
        { label: '接收速率', color: chartColors.networkRecv, key: 'recv' }
    ]);
    
    charts.gpuDetail = createChart('gpuDetailChart', 'gpu', 'GPU使用率', [
        { label: 'GPU使用率', color: chartColors.gpu, key: 'usage' }
    ]);
    
    charts.process = createChart('processChart', 'cpu', '进程资源', [
        { label: 'CPU使用率', color: chartColors.cpu, key: 'cpu' },
        { label: '内存使用率', color: chartColors.memory, key: 'memory' }
    ]);
    
    if (charts.disk) {
        charts.disk.destroy();
        charts.disk = null;
    }
}

async function refreshOverview() {
    const now = Date.now();
    
    try {
        const [cpuUsage, memoryInfo, diskInfo, networkBandwidth, gpuInfo, systemInfo, uptime] = await Promise.all([
            Auth.fetchApi(API_BASE, 'getCPUUsage').catch(() => null),
            Auth.fetchApi(API_BASE, 'getMemoryInfo').catch(() => null),
            Auth.fetchApi(API_BASE, 'getDiskInfo').catch(() => null),
            Auth.fetchApi(API_BASE, 'getNetworkBandwidth').catch(() => null),
            Auth.fetchApi(API_BASE, 'getGPUInfo').catch(() => null),
            Auth.fetchApi(API_BASE, 'getSystemInfo').catch(() => null),
            Auth.fetchApi(API_BASE, 'getUptime').catch(() => null)
        ]);
        
        if (cpuUsage) {
            const cpuData = addChartPoint('cpu', now, { usage: cpuUsage.total_usage || 0 });
            updateChart(charts.cpu, cpuData, ['usage']);
            
            const cpuStat = document.getElementById('cpuStat');
            if (cpuStat) {
                cpuStat.textContent = `${(cpuUsage.total_usage || 0).toFixed(1)}%`;
            }
        }
        
        if (memoryInfo) {
            const memoryData = addChartPoint('memory', now, { usage: memoryInfo.used_percent || 0 });
            updateChart(charts.memory, memoryData, ['usage']);
            
            const memoryStat = document.getElementById('memoryStat');
            if (memoryStat) {
                memoryStat.textContent = `${(memoryInfo.used_percent || 0).toFixed(1)}%`;
            }
        }
        
        if (diskInfo && diskInfo.list && diskInfo.list.length > 0) {
            const mainDisk = diskInfo.list[0];
            const diskStat = document.getElementById('diskStat');
            if (diskStat) {
                diskStat.textContent = `${(mainDisk.used_percent || 0).toFixed(1)}%`;
            }
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
            
            const networkStat = document.getElementById('networkStat');
            if (networkStat) {
                const totalRate = totalSendRate + totalRecvRate;
                networkStat.textContent = formatBytesPerSecond(totalRate);
            }
        }
        
        let avgGpuUsage = 0;
        if (gpuInfo && gpuInfo.list && gpuInfo.list.length > 0) {
            const totalUsage = gpuInfo.list.reduce((sum, gpu) => sum + (gpu.usage_percent || 0), 0);
            avgGpuUsage = totalUsage / gpuInfo.list.length;
        }
        const gpuData = addChartPoint('gpu', now, { usage: avgGpuUsage });
        updateChart(charts.gpu, gpuData, ['usage']);
        
        if (systemInfo) {
            const hostnameEl = document.getElementById('hostname');
            const osInfoEl = document.getElementById('osInfo');
            const platformVersionEl = document.getElementById('platformVersion');
            const archEl = document.getElementById('arch');
            const cpuCoresEl = document.getElementById('cpuCores');
            
            if (hostnameEl) hostnameEl.textContent = systemInfo.hostname || '-';
            if (osInfoEl) osInfoEl.textContent = `${systemInfo.os || '-'} / ${systemInfo.platform || '-'}`;
            if (platformVersionEl) platformVersionEl.textContent = systemInfo.platform_version || '-';
            if (archEl) archEl.textContent = systemInfo.architecture || '-';
            if (cpuCoresEl) cpuCoresEl.textContent = systemInfo.cpu_count || '-';
        }
        
        if (uptime) {
            const uptimeEl = document.getElementById('uptime');
            if (uptimeEl) {
                uptimeEl.textContent = uptime.uptime_str || formatTime(uptime.uptime || 0);
            }
        }
        
    } catch (error) {
        console.error('刷新系统概览失败:', error);
    }
}

async function refreshCPU() {
    const now = Date.now();
    
    try {
        const [cpuInfo, cpuUsage] = await Promise.all([
            Auth.fetchApi(API_BASE, 'getCPUInfo').catch(() => null),
            Auth.fetchApi(API_BASE, 'getCPUUsage').catch(() => null)
        ]);
        
        if (cpuInfo) {
            const cpuModelEl = document.getElementById('cpuModel');
            const physicalCoresEl = document.getElementById('physicalCores');
            const logicalCoresEl = document.getElementById('logicalCores');
            const cpuFreqEl = document.getElementById('cpuFreq');
            
            if (cpuModelEl) cpuModelEl.textContent = cpuInfo.model_name || '-';
            if (physicalCoresEl) physicalCoresEl.textContent = cpuInfo.physical_cores || '-';
            if (logicalCoresEl) logicalCoresEl.textContent = cpuInfo.logical_cores || '-';
            if (cpuFreqEl) cpuFreqEl.textContent = `${cpuInfo.frequency || 0} MHz`;
        }
        
        if (cpuUsage) {
            const cpuData = addChartPoint('cpu', now, { usage: cpuUsage.total_usage || 0 });
            updateChart(charts.cpuDetail, cpuData, ['usage']);
        }
        
        await refreshCPUProcesses();
        
    } catch (error) {
        console.error('刷新CPU监控失败:', error);
    }
}

async function refreshCPUProcesses() {
    try {
        const sortBy = document.getElementById('cpuSortBy')?.value || 'cpu';
        const sortDirection = document.getElementById('cpuSortDirection')?.value || 'desc';
        
        const result = await Auth.fetchApi(API_BASE, 'getCPUProcesses', {
            sort_by: sortBy,
            sort_direction: sortDirection,
            limit: 50
        });
        const data = result.data;
        
        const tbody = document.getElementById('cpuProcessTableBody');
        if (!tbody) return;
        
        if (!data || !data.list || data.list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <p>暂无进程数据</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.list.map(process => `
            <tr>
                <td>${process.pid}</td>
                <td>${escapeHtml(process.name)}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${process.cpu > 80 ? 'high' : process.cpu > 50 ? 'medium' : 'low'}" 
                             style="width: ${Math.min(process.cpu, 100)}%"></div>
                    </div>
                    ${process.cpu.toFixed(1)}%
                </td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${process.memory > 80 ? 'high' : process.memory > 50 ? 'medium' : 'low'}" 
                             style="width: ${Math.min(process.memory, 100)}%"></div>
                    </div>
                    ${process.memory.toFixed(1)}%
                </td>
                <td>${process.memory_mb.toFixed(1)} MB</td>
                <td>${escapeHtml(process.user)}</td>
                <td>${escapeHtml(process.start_time)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="killProcessByPID(${process.pid}, '${escapeHtml(process.name)}')">
                        杀死
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('刷新CPU进程列表失败:', error);
        const tbody = document.getElementById('cpuProcessTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <p>加载失败: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

async function refreshMemory() {
    const now = Date.now();
    
    try {
        const memoryInfo = await Auth.fetchApi(API_BASE, 'getMemoryInfo');
        
        if (memoryInfo) {
            const memoryData = addChartPoint('memory', now, { usage: memoryInfo.used_percent || 0 });
            updateChart(charts.memoryDetail, memoryData, ['usage']);
            
            const memoryBarFill = document.getElementById('memoryBarFill');
            const memoryUsedEl = document.getElementById('memoryUsed');
            const memoryTotalEl = document.getElementById('memoryTotal');
            const memoryPercentEl = document.getElementById('memoryPercent');
            const memoryAvailableEl = document.getElementById('memoryAvailable');
            const memoryBuffersEl = document.getElementById('memoryBuffers');
            const memoryCachedEl = document.getElementById('memoryCached');
            const swapInfoEl = document.getElementById('swapInfo');
            
            if (memoryBarFill) {
                memoryBarFill.style.width = `${memoryInfo.used_percent || 0}%`;
            }
            if (memoryUsedEl) memoryUsedEl.textContent = formatBytes(memoryInfo.used || 0);
            if (memoryTotalEl) memoryTotalEl.textContent = formatBytes(memoryInfo.total || 0);
            if (memoryPercentEl) memoryPercentEl.textContent = `${(memoryInfo.used_percent || 0).toFixed(1)}%`;
            if (memoryAvailableEl) memoryAvailableEl.textContent = formatBytes(memoryInfo.available || 0);
            if (memoryBuffersEl) memoryBuffersEl.textContent = formatBytes(memoryInfo.buffers || 0);
            if (memoryCachedEl) memoryCachedEl.textContent = formatBytes(memoryInfo.cached || 0);
            
            const swapUsed = memoryInfo.swap_used || 0;
            const swapTotal = memoryInfo.swap_total || 0;
            if (swapInfoEl) {
                swapInfoEl.textContent = swapTotal > 0 
                    ? `${formatBytes(swapUsed)} / ${formatBytes(swapTotal)}`
                    : '无交换空间';
            }
        }
        
    } catch (error) {
        console.error('刷新内存监控失败:', error);
    }
}

function getDiskChartData() {
    const key = getDataKey('disk');
    const data = sessionStorage.getItem(key);
    if (data) {
        const parsed = JSON.parse(data);
        if (parsed.disks === undefined) {
            return { labels: [], disks: {} };
        }
        return parsed;
    }
    return { labels: [], disks: {} };
}

function saveDiskChartData(data) {
    const key = getDataKey('disk');
    sessionStorage.setItem(key, JSON.stringify(data));
}

function initDiskChart(diskList) {
    const canvas = document.getElementById('diskChart');
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    
    const chartDatasets = diskList.map((disk, index) => {
        const color = diskColorPalette[index % diskColorPalette.length];
        return {
            label: `${disk.mount_point} (${disk.device})`,
            data: [],
            borderColor: color.border,
            backgroundColor: color.background,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 4,
            borderWidth: 2
        };
    });
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: chartDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        const meta = ci.getDatasetMeta(index);
                        meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                        ci.update();
                    }
                },
                tooltip: {
                    enabled: true
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '时间'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '使用率 (%)'
                    }
                }
            },
            animation: {
                duration: 300
            }
        }
    });
}

async function refreshDisk() {
    const now = Date.now();
    const timeLabel = formatDateTime(now);
    const config = timeRangeConfig[currentTimeRange];
    
    try {
        const diskInfo = await Auth.fetchApi(API_BASE, 'getDiskInfo');
        
        const tbody = document.getElementById('diskTableBody');
        if (!tbody) return;
        
        if (!diskInfo || !diskInfo.list || diskInfo.list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <p>暂无磁盘数据</p>
                    </td>
                </tr>
            `;
            return;
        }
        
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
        
        tbody.innerHTML = diskInfo.list.map((disk, index) => {
            const color = diskColorPalette[index % diskColorPalette.length];
            return `<tr>
                <td>${escapeHtml(disk.device)}</td>
                <td>${escapeHtml(disk.mount_point)}</td>
                <td>${escapeHtml(disk.file_system)}</td>
                <td>${formatBytes(disk.total || 0)}</td>
                <td>${formatBytes(disk.used || 0)}</td>
                <td>${formatBytes(disk.free || 0)}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${disk.used_percent > 80 ? 'high' : disk.used_percent > 50 ? 'medium' : 'low'}" 
                             style="width: ${Math.min(disk.used_percent, 100)}%"></div>
                    </div>
                    ${(disk.used_percent || 0).toFixed(1)}%
                </td>
            </tr>`;
        }).join('');
        
    } catch (error) {
        console.error('刷新磁盘监控失败:', error);
        const tbody = document.getElementById('diskTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <p>加载失败: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

async function refreshNetwork() {
    const now = Date.now();
    
    try {
        const [bandwidth] = await Promise.all([
            Auth.fetchApi(API_BASE, 'getNetworkBandwidth').catch(() => null)
        ]);
        
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
            
            const tbody = document.getElementById('networkBandwidthTableBody');
            if (tbody) {
                tbody.innerHTML = bandwidth.list.map(iface => `
                    <tr>
                        <td>${escapeHtml(iface.interface_name)}</td>
                        <td>${formatBytesPerSecond(iface.send_rate || 0)}</td>
                        <td>${formatBytesPerSecond(iface.recv_rate || 0)}</td>
                        <td>${formatBytesPerSecond((iface.send_rate || 0) + (iface.recv_rate || 0))}</td>
                        <td>${formatBytes(iface.bytes_sent || 0)}</td>
                        <td>${formatBytes(iface.bytes_recv || 0)}</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress-bar-fill ${iface.usage_percent > 80 ? 'high' : iface.usage_percent > 50 ? 'medium' : 'low'}" 
                                     style="width: ${Math.min(iface.usage_percent, 100)}%"></div>
                            </div>
                            ${(iface.usage_percent || 0).toFixed(1)}%
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        await refreshNetworkProcesses();
        
    } catch (error) {
        console.error('刷新网络监控失败:', error);
    }
}

async function refreshNetworkProcesses() {
    try {
        const sortBy = document.getElementById('networkSortBy')?.value || 'usage';
        const sortDirection = document.getElementById('networkSortDirection')?.value || 'desc';
        
        const result = await Auth.fetchApi(API_BASE, 'getNetworkProcesses', {
            sort_by: sortBy,
            sort_direction: sortDirection,
            limit: 50
        });
        const data = result.data;
        
        const tbody = document.getElementById('networkProcessTableBody');
        if (!tbody) return;
        
        if (!data || !data.list || data.list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <p>暂无网络进程数据</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.list.map(process => `
            <tr>
                <td>${process.pid || '-'}</td>
                <td>${escapeHtml(process.name) || '-'}</td>
                <td>${escapeHtml(process.protocol) || '-'}</td>
                <td>${process.local_port || '-'}</td>
                <td>${process.remote_port || '-'}</td>
                <td>${process.connections || 0}</td>
                <td>${escapeHtml(process.state) || '-'}</td>
                <td>
                    ${process.pid ? `
                        <button class="btn btn-danger btn-sm" onclick="killProcessByPID(${process.pid}, '${escapeHtml(process.name)}')">
                            杀死
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('刷新网络进程列表失败:', error);
    }
}

async function refreshGPU() {
    const now = Date.now();
    
    try {
        const gpuInfo = await Auth.fetchApi(API_BASE, 'getGPUInfo');
        
        let avgGpuUsage = 0;
        if (gpuInfo && gpuInfo.list && gpuInfo.list.length > 0) {
            const totalUsage = gpuInfo.list.reduce((sum, gpu) => sum + (gpu.usage_percent || 0), 0);
            avgGpuUsage = totalUsage / gpuInfo.list.length;
        }
        const gpuData = addChartPoint('gpu', now, { usage: avgGpuUsage });
        updateChart(charts.gpuDetail, gpuData, ['usage']);
        
        const tbody = document.getElementById('gpuTableBody');
        if (!tbody) return;
        
        if (!gpuInfo || !gpuInfo.list || gpuInfo.list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <p>暂无GPU数据（需要NVIDIA或AMD显卡）</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = gpuInfo.list.map(gpu => `
            <tr>
                <td>${gpu.index}</td>
                <td>${escapeHtml(gpu.vendor)}</td>
                <td>${escapeHtml(gpu.model)}</td>
                <td>${gpu.memory_total || 0} MB</td>
                <td>${gpu.memory_used || 0} MB</td>
                <td>${gpu.memory_free || 0} MB</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${gpu.usage_percent > 80 ? 'high' : gpu.usage_percent > 50 ? 'medium' : 'low'}" 
                             style="width: ${Math.min(gpu.usage_percent, 100)}%"></div>
                    </div>
                    ${(gpu.usage_percent || 0).toFixed(1)}%
                </td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${gpu.memory_percent > 80 ? 'high' : gpu.memory_percent > 50 ? 'medium' : 'low'}" 
                             style="width: ${Math.min(gpu.memory_percent, 100)}%"></div>
                    </div>
                    ${(gpu.memory_percent || 0).toFixed(1)}%
                </td>
                <td>${(gpu.temperature || 0).toFixed(1)}°C</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('刷新GPU监控失败:', error);
        const tbody = document.getElementById('gpuTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <p>加载失败: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

async function refreshProcess() {
    const now = Date.now();
    
    try {
        const [processList, cpuUsage, memoryInfo] = await Promise.all([
            Auth.fetchApi(API_BASE, 'getProcessList', { sort_by: 'cpu', sort_direction: 'desc', limit: 100 }).catch(() => null),
            Auth.fetchApi(API_BASE, 'getCPUUsage').catch(() => null),
            Auth.fetchApi(API_BASE, 'getMemoryInfo').catch(() => null)
        ]);
        
        if (cpuUsage || memoryInfo) {
            const processData = addChartPoint('process', now, { 
                cpu: cpuUsage?.total_usage || 0, 
                memory: memoryInfo?.used_percent || 0 
            });
            updateChart(charts.process, processData, ['cpu', 'memory']);
        }
        
        await refreshProcessList();
        
    } catch (error) {
        console.error('刷新进程监控失败:', error);
    }
}

async function refreshProcessList() {
    try {
        const sortBy = document.getElementById('processSortBy')?.value || 'cpu';
        const sortDirection = document.getElementById('processSortDirection')?.value || 'desc';
        
        const result = await Auth.fetchApi(API_BASE, 'getProcessList', {
            sort_by: sortBy,
            sort_direction: sortDirection,
            limit: 100
        });
        const data = result.data;
        
        const tbody = document.getElementById('processTableBody');
        if (!tbody) return;
        
        if (!data || !data.list || data.list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state">
                        <p>暂无进程数据</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.list.map(process => `
            <tr>
                <td>${process.pid}</td>
                <td>${process.ppid || '-'}</td>
                <td>${escapeHtml(process.name)}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${process.cpu > 80 ? 'high' : process.cpu > 50 ? 'medium' : 'low'}" 
                             style="width: ${Math.min(process.cpu, 100)}%"></div>
                    </div>
                    ${process.cpu.toFixed(1)}%
                </td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${process.memory > 80 ? 'high' : process.memory > 50 ? 'medium' : 'low'}" 
                             style="width: ${Math.min(process.memory, 100)}%"></div>
                    </div>
                    ${process.memory.toFixed(1)}%
                </td>
                <td>${process.memory_mb.toFixed(1)} MB</td>
                <td>${process.num_threads || '-'}</td>
                <td>${escapeHtml(process.status)}</td>
                <td>${escapeHtml(process.user)}</td>
                <td>${escapeHtml(process.start_time)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="killProcessByPID(${process.pid}, '${escapeHtml(process.name)}')">
                        杀死
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('刷新进程列表失败:', error);
        const tbody = document.getElementById('processTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state">
                        <p>加载失败: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

async function refreshPort() {
    try {
        const portFilter = parseInt(document.getElementById('portFilter')?.value) || 0;
        const sortBy = document.getElementById('portSortBy')?.value || 'port';
        const sortDirection = document.getElementById('portSortDirection')?.value || 'desc';
        
        const result = await Auth.fetchApi(API_BASE, 'getPortInfo', {
            port: portFilter,
            sort_by: sortBy,
            sort_direction: sortDirection,
            limit: 100
        });
        const data = result.data;
        
        const tbody = document.getElementById('portTableBody');
        if (!tbody) return;
        
        if (!data || !data.list || data.list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <p>暂无端口数据</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.list.map(port => `
            <tr>
                <td>${escapeHtml(port.protocol)}</td>
                <td>${port.port}</td>
                <td>${escapeHtml(port.local_addr)}</td>
                <td>${escapeHtml(port.state)}</td>
                <td>${port.pid || '-'}</td>
                <td>${escapeHtml(port.process) || '-'}</td>
                <td>
                    ${port.pid ? `
                        <button class="btn btn-danger btn-sm" onclick="killProcessByPort(${port.port}, ${port.pid})">
                            杀死
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('刷新端口监控失败:', error);
        const tbody = document.getElementById('portTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <p>加载失败: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

function clearPortFilter() {
    const filterInput = document.getElementById('portFilter');
    if (filterInput) {
        filterInput.value = '';
    }
    refreshPort();
}

function killProcessByPID(pid, name) {
    showConfirmModal(
        '确认杀死进程',
        `确定要杀死进程 "${name}" (PID: ${pid}) 吗？`,
        async () => {
            try {
                await Auth.fetchApi(API_BASE, 'killProcessByPID', { pid: pid });
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
                await Auth.fetchApi(API_BASE, 'killProcessByPort', { port: port });
                showToast('进程已终止', { type: 'success', closable: true });
                refreshCurrentPage();
            } catch (error) {
                showToast('杀死进程失败: ' + error.message, 'error');
            }
        }
    );
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

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    const config = timeRangeConfig[currentTimeRange];
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
window.refreshPortList = refreshPortList;
