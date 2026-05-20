export const chartColors = {
    cpu: { border: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' },
    memory: { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' },
    network: { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
    gpu: { border: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' },
    disk: { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
    networkSend: { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },
    networkRecv: { border: '#06b6d4', background: 'rgba(6, 182, 212, 0.1)' }
};

export const diskColorPalette = [
    { border: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' },
    { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' },
    { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
    { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },
    { border: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' },
    { border: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' },
    { border: '#06b6d4', background: 'rgba(6, 182, 212, 0.1)' },
    { border: '#f97316', background: 'rgba(249, 115, 22, 0.1)' }
];

export const charts = {
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

export function createChart(canvasId, type, label, datasets = []) {
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

export function updateChart(chart, data, datasetKeys) {
    if (!chart) return;
    
    chart.data.labels = data.labels;
    
    datasetKeys.forEach((key, index) => {
        if (chart.data.datasets[index]) {
            chart.data.datasets[index].data = data.datasets[key] || [];
        }
    });
    
    chart.update('none');
}

export function initDiskChart(diskList) {
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

export function initCharts() {
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
