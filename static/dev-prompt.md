# 前端开发规范

## 目录结构

```
<page-name>/
├── index.html
└── _index/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── main.js
    └── assets/
```

子页面与 index.html 同级，各自拥有独立的 `_index/`：

```
ppz-m/
├── index.html
├── _index/...
├── address/
│   ├── index.html
│   └── _index/...
└── my-cars/
    ├── index.html
    ├── _index/...
    ├── add/
    │   ├── index.html
    │   └── _index/...
    └── detail/
        ├── index.html
        └── _index/...
```

## HTML 模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面标题</title>
    <link rel="stylesheet" href="/static/_common/style.css">
    <link rel="stylesheet" href="_index/css/style.css">
</head>
<body>
    <!-- 页面内容 -->

    <div class="loading" id="loading"><div class="loading-spinner"></div></div>
    <div class="toast" id="toast"></div>

    <!-- CDN 外部库（如有）必须在 module script 之前 -->
    <script type="module" src="_index/js/main.js"></script>
</body>
</html>
```

## JS 模板

```javascript
import { Auth, PERMISSION } from '/static/_common/auth.js';
import { showLoading, hideLoading, showToast, escapeHtml } from '/static/_common/ui.js';

const API_BASE = '/your_module';

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requirePermission(PERMISSION.ADMIN)) {
        return;
    }
    loadData();
});

async function fetchApi(action, params = {}) {
    return Auth.fetchApi(API_BASE, action, params);
}

async function loadData() {
    showLoading();
    try {
        const result = await fetchApi('list', { page: 1 });
        renderList(result.data);
    } catch (error) {
        showToast(error.message || '加载失败', 'error');
    } finally {
        hideLoading();
    }
}
```

## CSS 模板

```css
/* 只写页面特有样式，通用样式已在 /static/_common/style.css */

.page-container {
    color: var(--text-primary);
    background: var(--bg-primary);
}
```

可用 CSS 变量：`--primary-color` `--success-color` `--warning-color` `--danger-color` `--text-primary/secondary/muted` `--bg-primary/secondary/tertiary` `--border-color` `--radius-sm/md/lg` `--shadow-sm/md/lg`

## 规则

1. **所有 JS 都是 ES Module**，HTML 用 `<script type="module">`
2. **HTML 只引入一个 `_index/js/main.js`**，其他 js 由 main.js 通过 import 导入，HTML 不再引入其他自写 js
3. **必须引入 auth.js**，所有页面请求都带 Token
4. **禁止重复定义公共方法**，开发前先查看 `common/` 下所有 js 模块已有的方法，按需 import 使用，不得重复自定义相同功能的方法
5. **样式分层**：`/static/_common/style.css`（通用）+ `_index/css/style.css`（页面特有），两个都要引入
6. **资源放 `_index/`**：css/js/assets 放 `_index/` 下，根目录只留 index.html 和子页面目录
7. **main.js 写主要逻辑**，如果逻辑可拆分，放到同级其他 js 文件用 ES Module import
8. **API 调用**统一用 `Auth.fetchApi(baseUrl, action, params)`，POST JSON，自动带 Token 和错误处理
9. **注册项目**：在 `static/projects.yaml` 添加一级目录配置

## projects.yaml 格式

```yaml
<目录名>:
  name_cn: 中文名
  type: game | app
  permission: user | admin | super
  desc: 简介
```
