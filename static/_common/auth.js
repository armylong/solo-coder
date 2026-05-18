import { SessionData } from '/static/_common/session-data.js';

var _onUnauthorized = null;
var _loginPromise = null;

// 权限等级
export const PERMISSION = {
    NORMAL: 0,
    ADMIN: 1,
    SUPER_ADMIN: 2
};

// 权限可见范围描述
export const PERMISSION_LABELS = {
    [PERMISSION.NORMAL]: '所有人可见',
    [PERMISSION.ADMIN]: '仅管理员可见',
    [PERMISSION.SUPER_ADMIN]: '仅超级管理员可见'
};

// 权限名称
export const PERMISSION_NAMES = {
    [PERMISSION.NORMAL]: '普通用户',
    [PERMISSION.ADMIN]: '管理员',
    [PERMISSION.SUPER_ADMIN]: '超级管理员'
};

// 权限不足时的提示语
export const PERMISSION_ACCESS_MSG = {
    [PERMISSION.ADMIN]: '仅管理员可访问',
    [PERMISSION.SUPER_ADMIN]: '仅超级管理员可访问'
};

// 响应错误码
export const RESPONSE_CODE = {
    UNAUTHORIZED: -401,
    FORBIDDEN: -403
};

// 认证与鉴权工具
export const Auth = {
    // 注册401未授权回调，由登录组件调用
    setOnUnauthorized(handler) {
        _onUnauthorized = handler;
    },

    // 获取token
    getToken() {
        return localStorage.getItem('auth_token');
    },

    // 设置或清除token
    setToken(token) {
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    },

    // 清除token
    clearToken() {
        localStorage.removeItem('auth_token');
    },

    // 是否已登录
    isAuthenticated() {
        return !!this.getToken();
    },

    // 解析JWT token的payload
    decodeToken() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const payload = parts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const jsonStr = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonStr);
        } catch (e) {
            return null;
        }
    },

    // 获取当前用户权限等级
    getUserPermission() {
        const decoded = this.decodeToken();
        if (!decoded) return PERMISSION.NORMAL;
        return decoded.user_permission !== undefined ? decoded.user_permission : PERMISSION.NORMAL;
    },

    // 是否超级管理员
    isSuperAdmin() {
        return this.getUserPermission() >= PERMISSION.SUPER_ADMIN;
    },

    // 是否管理员及以上
    isAdmin() {
        return this.getUserPermission() >= PERMISSION.ADMIN;
    },

    // 校验权限，不足则提示并回退
    requirePermission(requiredPermission) {
        const userPermission = this.getUserPermission();
        if (userPermission < requiredPermission) {
            const msg = PERMISSION_ACCESS_MSG[requiredPermission] || '权限不足';
            if (typeof alert !== 'undefined') {
                alert(msg);
            }
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
            return false;
        }
        return true;
    },

    // 带认证的fetch请求
    fetchWithAuth(url, options = {}) {
        const headers = options.headers || {};
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = token;
        }
        return fetch(url, { ...options, headers, credentials: 'include' });
    },

    // 发起原始请求并解析JSON
    async _doRequest(baseUrl, action, params, options) {
        const url = `${baseUrl}/${action}`;
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(params),
            ...options
        };
        const response = await this.fetchWithAuth(url, fetchOptions);
        return await response.json();
    },

    // 调用后端API，自动处理401重试和错误码
    async fetchApi(baseUrl, action, params = {}, options = {}) {
        let result = await this._doRequest(baseUrl, action, params, options);

        if (result.code === RESPONSE_CODE.UNAUTHORIZED && !options._noAuthRetry) {
            this.clearToken();
            SessionData.clear();
            if (_onUnauthorized) {
                if (!_loginPromise) {
                    _loginPromise = new Promise(function(resolve, reject) {
                        _onUnauthorized(resolve, reject);
                    }).finally(function() {
                        _loginPromise = null;
                    });
                }
                await _loginPromise;
                result = await this._doRequest(baseUrl, action, params, options);
                if (result.code === RESPONSE_CODE.UNAUTHORIZED) {
                    this.clearToken();
                    SessionData.clear();
                    throw new Error(result.message || '登录已过期');
                }
            } else {
                throw new Error(result.message || '请先登录');
            }
        }

        if (result.code === RESPONSE_CODE.FORBIDDEN) {
            alert(result.message || '无访问权限');
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
            throw new Error(result.message || '无访问权限');
        }

        if (result.code < 0) {
            throw new Error(result.message || '请求失败');
        }

        return result;
    },

    // 从session获取用户信息
    async getUser() {
        const data = await SessionData.fetch(['user']);
        return data.user || null;
    },

    // 通过API获取当前用户信息
    async getUserInfo() {
        if (!this.getToken()) {
            return null;
        }
        try {
            const result = await this.fetchApi('/index', 'desktopOs', {});
            return result.data.user;
        } catch (e) {
            return null;
        }
    }
};
