import { SessionData } from '/static/_common/session-data.js';
import { renderTabNav, checkIsDriver } from '/static/ppz-m/_common/tab-nav.js';

// 初始化页面
async function initPage() {
    const data = await SessionData.fetch(['ppz_user']);
    renderTabNav('drive', checkIsDriver(data.ppz_user));
}

document.addEventListener('DOMContentLoaded', initPage);
