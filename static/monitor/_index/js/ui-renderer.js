import { escapeHtml } from '/static/_common/ui.js';
import { formatBytes, formatBytesPerSecond, formatTime } from './formatters.js';
import { diskColorPalette } from './chart-manager.js';

export function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    document.getElementById('updateInfo').textContent = `最后更新: ${timeStr}`;
}

export function renderCPUInfo(cpuInfo) {
    if (!cpuInfo) return;
    
    const cpuModelEl = document.getElementById('cpuModel');
    const physicalCoresEl = document.getElementById('physicalCores');
    const logicalCoresEl = document.getElementById('logicalCores');
    const cpuFreqEl = document.getElementById('cpuFreq');
    
    if (cpuModelEl) cpuModelEl.textContent = cpuInfo.model_name || '-';
    if (physicalCoresEl) physicalCoresEl.textContent = cpuInfo.physical_cores || '-';
    if (logicalCoresEl) logicalCoresEl.textContent = cpuInfo.logical_cores || '-';
    if (cpuFreqEl) cpuFreqEl.textContent = `${cpuInfo.frequency || 0} MHz`;
}

export function renderMemoryInfo(memoryInfo) {
    if (!memoryInfo) return;
    
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

export function renderSystemInfo(systemInfo) {
    if (!systemInfo) return;
    
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

export function renderUptime(uptime) {
    if (!uptime) return;
    
    const uptimeEl = document.getElementById('uptime');
    if (uptimeEl) {
        uptimeEl.textContent = uptime.uptime_str || formatTime(uptime.uptime || 0);
    }
}

export function renderStatValue(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
}

function getProgressBarClass(percent) {
    if (percent > 80) return 'high';
    if (percent > 50) return 'medium';
    return 'low';
}

export function renderProcessTable(tbodyId, data, columns, onKillClick) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    if (!data || !data.list || data.list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${columns.length}" class="empty-state">
                    <p>暂无数据</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.list.map(process => `
        <tr>
            ${columns.map(col => {
                let content = '';
                if (col.type === 'text') {
                    content = escapeHtml(process[col.key] || col.default || '-');
                } else if (col.type === 'progress') {
                    const value = process[col.key] || 0;
                    const progressClass = getProgressBarClass(value);
                    content = `
                        <div class="progress-bar">
                            <div class="progress-bar-fill ${progressClass}" 
                                 style="width: ${Math.min(value, 100)}%"></div>
                        </div>
                        ${value.toFixed(1)}%
                    `;
                } else if (col.type === 'memory') {
                    content = `${process[col.key].toFixed(1)} MB`;
                } else if (col.type === 'kill') {
                    content = process[col.pidKey] ? `
                        <button class="btn btn-danger btn-sm" onclick="${onKillClick}(${process[col.pidKey]}, '${escapeHtml(process.name)}')">
                            杀死
                        </button>
                    ` : '-';
                }
                return `<td>${content}</td>`;
            }).join('')}
        </tr>
    `).join('');
}

export function renderEmptyTable(tbodyId, colSpan, message = '暂无数据') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="${colSpan}" class="empty-state">
                <p>${message}</p>
            </td>
        </tr>
    `;
}

export function renderErrorTable(tbodyId, colSpan, error) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="${colSpan}" class="empty-state">
                <p>加载失败: ${error.message}</p>
            </td>
        </tr>
    `;
}

export function renderDiskTable(diskInfo) {
    const tbody = document.getElementById('diskTableBody');
    if (!tbody) return;
    
    if (!diskInfo || !diskInfo.list || diskInfo.list.length === 0) {
        renderEmptyTable('diskTableBody', 7, '暂无磁盘数据');
        return;
    }
    
    tbody.innerHTML = diskInfo.list.map((disk, index) => {
        const color = diskColorPalette[index % diskColorPalette.length];
        const usedPercent = disk.used_percent || 0;
        const progressClass = getProgressBarClass(usedPercent);
        
        return `<tr>
            <td>${escapeHtml(disk.device)}</td>
            <td>${escapeHtml(disk.mount_point)}</td>
            <td>${escapeHtml(disk.file_system)}</td>
            <td>${formatBytes(disk.total || 0)}</td>
            <td>${formatBytes(disk.used || 0)}</td>
            <td>${formatBytes(disk.free || 0)}</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-bar-fill ${progressClass}" 
                         style="width: ${Math.min(usedPercent, 100)}%"></div>
                </div>
                ${usedPercent.toFixed(1)}%
            </td>
        </tr>`;
    }).join('');
}

export function renderNetworkTable(bandwidth) {
    const tbody = document.getElementById('networkBandwidthTableBody');
    if (!tbody) return;
    
    if (!bandwidth || !bandwidth.list || bandwidth.list.length === 0) {
        renderEmptyTable('networkBandwidthTableBody', 7);
        return;
    }
    
    tbody.innerHTML = bandwidth.list.map(iface => {
        const usagePercent = iface.usage_percent || 0;
        const progressClass = getProgressBarClass(usagePercent);
        
        return `
            <tr>
                <td>${escapeHtml(iface.interface_name)}</td>
                <td>${formatBytesPerSecond(iface.send_rate || 0)}</td>
                <td>${formatBytesPerSecond(iface.recv_rate || 0)}</td>
                <td>${formatBytesPerSecond((iface.send_rate || 0) + (iface.recv_rate || 0))}</td>
                <td>${formatBytes(iface.bytes_sent || 0)}</td>
                <td>${formatBytes(iface.bytes_recv || 0)}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${progressClass}" 
                             style="width: ${Math.min(usagePercent, 100)}%"></div>
                    </div>
                    ${usagePercent.toFixed(1)}%
                </td>
            </tr>
        `;
    }).join('');
}

export function renderGPUInfo(gpuInfo) {
    const tbody = document.getElementById('gpuTableBody');
    if (!tbody) return;
    
    if (!gpuInfo || !gpuInfo.list || gpuInfo.list.length === 0) {
        renderEmptyTable('gpuTableBody', 9, '暂无GPU数据（需要NVIDIA或AMD显卡）');
        return;
    }
    
    tbody.innerHTML = gpuInfo.list.map(gpu => {
        const usagePercent = gpu.usage_percent || 0;
        const memoryPercent = gpu.memory_percent || 0;
        const usageProgressClass = getProgressBarClass(usagePercent);
        const memoryProgressClass = getProgressBarClass(memoryPercent);
        
        return `
            <tr>
                <td>${gpu.index}</td>
                <td>${escapeHtml(gpu.vendor)}</td>
                <td>${escapeHtml(gpu.model)}</td>
                <td>${gpu.memory_total || 0} MB</td>
                <td>${gpu.memory_used || 0} MB</td>
                <td>${gpu.memory_free || 0} MB</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${usageProgressClass}" 
                             style="width: ${Math.min(usagePercent, 100)}%"></div>
                    </div>
                    ${usagePercent.toFixed(1)}%
                </td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${memoryProgressClass}" 
                             style="width: ${Math.min(memoryPercent, 100)}%"></div>
                    </div>
                    ${memoryPercent.toFixed(1)}%
                </td>
                <td>${(gpu.temperature || 0).toFixed(1)}°C</td>
            </tr>
        `;
    }).join('');
}

export function renderPortTable(portInfo, onKillClick) {
    const tbody = document.getElementById('portTableBody');
    if (!tbody) return;
    
    if (!portInfo || !portInfo.list || portInfo.list.length === 0) {
        renderEmptyTable('portTableBody', 7, '暂无端口数据');
        return;
    }
    
    tbody.innerHTML = portInfo.list.map(port => `
        <tr>
            <td>${escapeHtml(port.protocol)}</td>
            <td>${port.port}</td>
            <td>${escapeHtml(port.local_addr)}</td>
            <td>${escapeHtml(port.state)}</td>
            <td>${port.pid || '-'}</td>
            <td>${escapeHtml(port.process) || '-'}</td>
            <td>
                ${port.pid ? `
                    <button class="btn btn-danger btn-sm" onclick="${onKillClick}(${port.port}, ${port.pid})">
                        杀死
                    </button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}
