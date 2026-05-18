export let currentUser = null;
export let isCertifiedDriver = false;

// 设置当前用户
export function setCurrentUser(user) {
    currentUser = user;
}

// 设置是否认证司机
export function setIsCertifiedDriver(val) {
    isCertifiedDriver = val;
}

// 审核状态配置
export function getReviewStatusConfig(status) {
    const configs = {
        1: { text: '审核中', class: 'status-pending' },
        2: { text: '审核通过', class: 'status-approved' },
        3: { text: '审核拒绝', class: 'status-rejected' }
    };
    return configs[status] || { text: '未知', class: '' };
}

// 获取URL参数
export function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}
