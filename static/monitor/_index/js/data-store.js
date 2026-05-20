import { formatDateTime } from './formatters.js';

export const timeRangeConfig = {
    '10s': { maxPoints: 10, interval: 10000, label: '10秒' },
    '1m': { maxPoints: 60, interval: 10000, label: '1分钟' },
    '1h': { maxPoints: 360, interval: 10000, label: '1小时' },
    '1d': { maxPoints: 864, interval: 60000, label: '1天' }
};

let currentTimeRange = '10s';

export function setCurrentTimeRange(range) {
    currentTimeRange = range;
}

export function getCurrentTimeRange() {
    return currentTimeRange;
}

function getDataKey(type) {
    return `monitor_${type}_${currentTimeRange}`;
}

export function loadChartData(type) {
    const key = getDataKey(type);
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : { labels: [], datasets: {} };
}

export function saveChartData(type, data) {
    const key = getDataKey(type);
    sessionStorage.setItem(key, JSON.stringify(data));
}

export function addChartPoint(type, timestamp, values) {
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

export function clearChartData(type) {
    const key = getDataKey(type);
    sessionStorage.removeItem(key);
}

export function getDiskChartData() {
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

export function saveDiskChartData(data) {
    const key = getDataKey('disk');
    sessionStorage.setItem(key, JSON.stringify(data));
}
