import { Auth } from '/static/_common/auth.js';

// localStorage缓存key
const STORAGE_KEY = 'session_data';

// 会话数据管理，支持本地缓存和远程拉取
export const SessionData = {
    // 拉取指定key的数据，缺失的从服务端获取
    async fetch(keys) {
        if (!Auth.isAuthenticated()) {
            return {};
        }

        const cached = this._getCached();
        const missingKeys = keys.filter(key => !cached.hasOwnProperty(key));

        if (missingKeys.length === 0) {
            const result = {};
            keys.forEach(key => { result[key] = cached[key]; });
            return result;
        }

        try {
            const result = await Auth.fetchApi('/session_data', 'sessionData', { keys: missingKeys });
            const newData = result.data || {};

            const merged = { ...cached, ...newData };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

            const finalResult = {};
            keys.forEach(key => { finalResult[key] = merged[key] || null; });
            return finalResult;
        } catch (e) {
            const result = {};
            keys.forEach(key => { result[key] = cached[key] || null; });
            return result;
        }
    },

    // 从本地缓存读取
    get(keys) {
        const cached = this._getCached();
        const result = {};
        keys.forEach(key => { result[key] = cached[key] || null; });
        return result;
    },

    // 清除本地缓存
    clear() {
        localStorage.removeItem(STORAGE_KEY);
    },

    // 清除指定key的缓存并重新拉取
    refresh(keys) {
        const cached = this._getCached();
        keys.forEach(key => { delete cached[key]; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
        return this.fetch(keys);
    },

    // 读取本地缓存
    _getCached() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            localStorage.removeItem(STORAGE_KEY);
            return {};
        }
    }
};
