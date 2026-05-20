import { Auth } from '/static/_common/auth.js';

const API_BASE = '/monitor';

export async function getCPUUsage() {
    return await Auth.fetchApi(API_BASE, 'getCPUUsage');
}

export async function getCPUInfo() {
    return await Auth.fetchApi(API_BASE, 'getCPUInfo');
}

export async function getMemoryInfo() {
    return await Auth.fetchApi(API_BASE, 'getMemoryInfo');
}

export async function getDiskInfo() {
    return await Auth.fetchApi(API_BASE, 'getDiskInfo');
}

export async function getNetworkBandwidth() {
    return await Auth.fetchApi(API_BASE, 'getNetworkBandwidth');
}

export async function getGPUInfo() {
    return await Auth.fetchApi(API_BASE, 'getGPUInfo');
}

export async function getSystemInfo() {
    return await Auth.fetchApi(API_BASE, 'getSystemInfo');
}

export async function getUptime() {
    return await Auth.fetchApi(API_BASE, 'getUptime');
}

export async function getCPUProcesses(sortBy = 'cpu', sortDirection = 'desc', limit = 50) {
    const result = await Auth.fetchApi(API_BASE, 'getCPUProcesses', {
        sort_by: sortBy,
        sort_direction: sortDirection,
        limit: limit
    });
    return result.data;
}

export async function getNetworkProcesses(sortBy = 'usage', sortDirection = 'desc', limit = 50) {
    const result = await Auth.fetchApi(API_BASE, 'getNetworkProcesses', {
        sort_by: sortBy,
        sort_direction: sortDirection,
        limit: limit
    });
    return result.data;
}

export async function getProcessList(sortBy = 'cpu', sortDirection = 'desc', limit = 100) {
    const result = await Auth.fetchApi(API_BASE, 'getProcessList', {
        sort_by: sortBy,
        sort_direction: sortDirection,
        limit: limit
    });
    return result.data;
}

export async function getPortInfo(port = 0, sortBy = 'port', sortDirection = 'desc', limit = 100) {
    const result = await Auth.fetchApi(API_BASE, 'getPortInfo', {
        port: port,
        sort_by: sortBy,
        sort_direction: sortDirection,
        limit: limit
    });
    return result.data;
}

export async function killProcessByPID(pid) {
    return await Auth.fetchApi(API_BASE, 'killProcessByPID', { pid: pid });
}

export async function killProcessByPort(port) {
    return await Auth.fetchApi(API_BASE, 'killProcessByPort', { port: port });
}
