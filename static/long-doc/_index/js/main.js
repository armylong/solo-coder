import { Auth } from '/static/_common/auth.js';
import { showToast, escapeHtml } from '/static/_common/ui.js';

// ============================================================
// Long Doc - Markdown知识库系统
// 功能: 文档管理、富文本编辑、目录索引、快捷操作、拖拽排序
// ============================================================


// ========================================================
// 状态管理
// ========================================================
const state = {
    docList: [],
    currentDocId: null,
    currentDocName: '',
    expandedNodes: new Set(),
    selectedMenuIndex: 0,
    saveTimer: null,
    saveDelay: 1000,
    tocVisible: true,
    draggedDocId: null,
    dragOverDocId: null,
    dragPosition: null
};

// ========================================================
// 斜杠快捷菜单配置
// ========================================================
const slashMenuItems = [
    { 
        id: 'h1', 
        icon: 'H1', 
        title: '一级标题', 
        desc: '插入一级大标题',
        type: 'block',
        tag: 'h1',
        markdown: '# '
    },
    { 
        id: 'h2', 
        icon: 'H2', 
        title: '二级标题', 
        desc: '插入二级标题',
        type: 'block',
        tag: 'h2',
        markdown: '## '
    },
    { 
        id: 'h3', 
        icon: 'H3', 
        title: '三级标题', 
        desc: '插入三级标题',
        type: 'block',
        tag: 'h3',
        markdown: '### '
    },
    { 
        id: 'h4', 
        icon: 'H4', 
        title: '四级标题', 
        desc: '插入四级标题',
        type: 'block',
        tag: 'h4',
        markdown: '#### '
    },
    { 
        id: 'h5', 
        icon: 'H5', 
        title: '五级标题', 
        desc: '插入五级标题',
        type: 'block',
        tag: 'h5',
        markdown: '#####'
    },
    { 
        id: 'h6', 
        icon: 'H6', 
        title: '六级标题', 
        desc: '插入六级标题',
        type: 'block',
        tag: 'h6',
        markdown: '######'
    },
    { 
        id: 'bold', 
        icon: 'B', 
        title: '加粗', 
        desc: '将选中文字加粗显示',
        type: 'inline',
        command: 'bold',
        markdown: '****'
    },
    { 
        id: 'italic', 
        icon: 'I', 
        title: '斜体', 
        desc: '将选中文字变为斜体',
        type: 'inline',
        command: 'italic',
        markdown: '**'
    },
    { 
        id: 'code', 
        icon: '</>', 
        title: '行内代码', 
        desc: '插入行内代码样式',
        type: 'inline',
        tag: 'code',
        markdown: '``'
    },
    { 
        id: 'codeblock', 
        icon: '📝', 
        title: '代码块', 
        desc: '插入多行代码块',
        type: 'block',
        tag: 'pre',
        markdown: '\n```\n\n```\n'
    },
    { 
        id: 'ul', 
        icon: '•', 
        title: '无序列表', 
        desc: '插入无序列表项',
        type: 'list',
        listType: 'ul',
        markdown: '- '
    },
    { 
        id: 'ol', 
        icon: '1.', 
        title: '有序列表', 
        desc: '插入有序列表项',
        type: 'list',
        listType: 'ol',
        markdown: '1. '
    },
    { 
        id: 'task', 
        icon: '☑', 
        title: '任务列表', 
        desc: '插入待办任务项',
        type: 'task',
        markdown: '- [ ] '
    },
    { 
        id: 'quote', 
        icon: '"', 
        title: '引用', 
        desc: '插入引用块',
        type: 'block',
        tag: 'blockquote',
        markdown: '> '
    },
    { 
        id: 'link', 
        icon: '🔗', 
        title: '链接', 
        desc: '插入超链接',
        type: 'inline',
        tag: 'a',
        markdown: '[](url)'
    },
    { 
        id: 'image', 
        icon: '🖼', 
        title: '图片', 
        desc: '插入图片',
        type: 'block',
        tag: 'img',
        markdown: '![](url)'
    },
    { 
        id: 'table', 
        icon: '📊', 
        title: '表格', 
        desc: '插入表格',
        type: 'block',
        markdown: '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
    },
    { 
        id: 'hr', 
        icon: '—', 
        title: '分割线', 
        desc: '插入水平分割线',
        type: 'hr',
        markdown: '\n---\n'
    },
    { 
        id: 'strikethrough', 
        icon: 'S', 
        title: '删除线', 
        desc: '添加删除线效果',
        type: 'inline',
        command: 'strikeThrough',
        markdown: '~~~~'
    },
    { 
        id: 'highlight', 
        icon: '🎨', 
        title: '高亮', 
        desc: '高亮显示文字',
        type: 'inline',
        tag: 'mark',
        markdown: '========'
    }
];

// ========================================================
// DOM 元素引用
// ========================================================
const elements = {
    docList: document.getElementById('docList'),
    emptyState: document.getElementById('emptyState'),
    richEditor: document.getElementById('richEditor'),
    editor: document.getElementById('editor'),
    docTitle: document.getElementById('docTitle'),
    welcomeMessage: document.getElementById('welcomeMessage'),
    toggleTocBtn: document.getElementById('toggleTocBtn'),
    copyBtn: document.getElementById('copyBtn'),
    tocContainer: document.getElementById('tocContainer'),
    tocList: document.getElementById('tocList'),
    collapseTocBtn: document.getElementById('collapseTocBtn'),
    expandTocBtn: document.getElementById('expandTocBtn'),
    createRootBtn: document.getElementById('createRootBtn'),
    createDocModal: document.getElementById('createDocModal'),
    createDocForm: document.getElementById('createDocForm'),
    newDocName: document.getElementById('newDocName'),
    createModalTitle: document.getElementById('createModalTitle'),
    confirmDeleteModal: document.getElementById('confirmDeleteModal'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    slashMenu: document.getElementById('slashMenu'),
    slashSearchInput: document.getElementById('slashSearchInput'),
    slashMenuList: document.getElementById('slashMenuList'),
    codeLangMenu: document.getElementById('codeLangMenu'),
    codeLangList: document.getElementById('codeLangList'),
    toast: document.getElementById('toast')
};

// ========================================================
// 代码块语言配置
// ========================================================
const codeLanguages = [
    { id: 'text', name: 'Plain Text', alias: ['text', 'plain'] },
    { id: 'go', name: 'Go', alias: ['go', 'golang'] },
    { id: 'javascript', name: 'JavaScript', alias: ['js', 'javascript'] },
    { id: 'typescript', name: 'TypeScript', alias: ['ts', 'typescript'] },
    { id: 'python', name: 'Python', alias: ['py', 'python'] },
    { id: 'java', name: 'Java', alias: ['java'] },
    { id: 'c', name: 'C', alias: ['c'] },
    { id: 'cpp', name: 'C++', alias: ['cpp', 'c++'] },
    { id: 'rust', name: 'Rust', alias: ['rs', 'rust'] },
    { id: 'html', name: 'HTML', alias: ['html'] },
    { id: 'css', name: 'CSS', alias: ['css'] },
    { id: 'sql', name: 'SQL', alias: ['sql'] },
    { id: 'bash', name: 'Bash', alias: ['sh', 'bash', 'shell'] },
    { id: 'json', name: 'JSON', alias: ['json'] },
    { id: 'yaml', name: 'YAML', alias: ['yml', 'yaml'] },
    { id: 'markdown', name: 'Markdown', alias: ['md', 'markdown'] },
    { id: 'xml', name: 'XML', alias: ['xml'] },
    { id: 'php', name: 'PHP', alias: ['php'] },
    { id: 'ruby', name: 'Ruby', alias: ['rb', 'ruby'] },
    { id: 'swift', name: 'Swift', alias: ['swift'] },
    { id: 'kotlin', name: 'Kotlin', alias: ['kt', 'kotlin'] }
];

let currentCodeBlockForLang = null;

// ========================================================
// Markdown 解析器
// ========================================================
const MarkdownParser = {
    parse(html) {
        if (!html) return '';
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        return this.nodeToMarkdown(tempDiv);
    },

    nodeToMarkdown(node) {
        let result = '';
        
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }
        
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const tagName = node.tagName.toLowerCase();
        
        switch (tagName) {
            case 'h1':
                return `# ${node.textContent.trim()}\n\n`;
            case 'h2':
                return `## ${node.textContent.trim()}\n\n`;
            case 'h3':
                return `### ${node.textContent.trim()}\n\n`;
            case 'h4':
                return `#### ${node.textContent.trim()}\n\n`;
            case 'h5':
                return `##### ${node.textContent.trim()}\n\n`;
            case 'h6':
                return `###### ${node.textContent.trim()}\n\n`;
            case 'p':
                return this.getChildMarkdown(node) + '\n\n';
            case 'strong':
            case 'b':
                return `**${this.getChildMarkdown(node)}**`;
            case 'em':
            case 'i':
                return `*${this.getChildMarkdown(node)}*`;
            case 'del':
            case 's':
                return `~~${this.getChildMarkdown(node)}~~`;
            case 'mark':
                return `==${this.getChildMarkdown(node)}==`;
            case 'code':
                return `\`${node.textContent}\``;
            case 'pre':
                const lang = node.getAttribute('data-language') || 'text';
                let codeContent = '';
                const codeElement = node.querySelector('code');
                if (codeElement) {
                    codeContent = getCodePlainText(codeElement);
                } else {
                    codeContent = node.textContent;
                }
                return `\n\`\`\`${lang}\n${codeContent}\n\`\`\`\n\n`;
            case 'blockquote':
                const quoteContent = this.getChildMarkdown(node).trim();
                return quoteContent.split('\n').map(l => l ? '> ' + l : '>').join('\n') + '\n\n';
            case 'a':
                const href = node.getAttribute('href') || '';
                return `[${this.getChildMarkdown(node)}](${href})`;
            case 'img':
                const src = node.getAttribute('src') || '';
                const alt = node.getAttribute('alt') || '';
                return `![${alt}](${src})`;
            case 'hr':
                return '\n---\n\n';
            case 'ul':
                let ulResult = '';
                node.childNodes.forEach(child => {
                    if (child.tagName === 'LI') {
                        const checkbox = child.querySelector('input[type="checkbox"]');
                        if (checkbox) {
                            const checked = checkbox.checked ? 'x' : ' ';
                            ulResult += `- [${checked}] ${this.getChildMarkdown(child).replace(/^\[.*?\]\s*/, '')}\n`;
                        } else {
                            ulResult += `- ${this.getChildMarkdown(child)}\n`;
                        }
                    }
                });
                return ulResult + '\n';
            case 'ol':
                let olResult = '';
                let index = 1;
                node.childNodes.forEach(child => {
                    if (child.tagName === 'LI') {
                        olResult += `${index}. ${this.getChildMarkdown(child)}\n`;
                        index++;
                    }
                });
                return olResult + '\n';
            case 'li':
                return this.getChildMarkdown(node);
            case 'table':
                return this.tableToMarkdown(node);
            case 'br':
                return '\n';
            case 'div':
            case 'span':
                return this.getChildMarkdown(node);
            default:
                return this.getChildMarkdown(node);
        }
    },

    getChildMarkdown(node) {
        let result = '';
        node.childNodes.forEach(child => {
            result += this.nodeToMarkdown(child);
        });
        return result;
    },

    tableToMarkdown(table) {
        let result = '\n';
        const rows = table.querySelectorAll('tr');
        const headers = table.querySelectorAll('th');
        
        if (headers.length > 0) {
            const headerRow = table.querySelector('tr');
            let headerCells = [];
            headerRow.querySelectorAll('th, td').forEach(cell => {
                headerCells.push(cell.textContent.trim());
            });
            result += '| ' + headerCells.join(' | ') + ' |\n';
            result += '| ' + headerCells.map(() => '---').join(' | ') + ' |\n';
        }

        const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        bodyRows.forEach(row => {
            let cells = [];
            row.querySelectorAll('td, th').forEach(cell => {
                cells.push(cell.textContent.trim());
            });
            if (cells.length > 0) {
                result += '| ' + cells.join(' | ') + ' |\n';
            }
        });

        return result + '\n';
    },

    render(markdown) {
        if (!markdown) return '';
        
        let html = markdown;
        
        html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
        html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
        html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
        
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            return `<pre data-language="${language}"><code>${code.trim()}</code></pre>`;
        });
        
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        html = html.replace(/^\> (.*)$/gm, '<blockquote>$1</blockquote>');
        
        html = html.replace(/^\- \[ \] (.*)$/gm, '<li><input type="checkbox"> $1</li>');
        html = html.replace(/^\- \[x\] (.*)$/gmi, '<li><input type="checkbox" checked> $1</li>');
        
        html = html.replace(/^(\d+)\. (.*)$/gm, '<li>$2</li>');
        html = html.replace(/<li>([\s\S]*?)<\/li>/g, (match) => {
            if (!match.includes('checkbox')) {
                return match;
            }
            return match;
        });
        
        html = html.replace(/^\- (.*)$/gm, '<li>$1</li>');
        html = html.replace(/^(?!<[hluopb])/gm, '<p>');
        html = html.replace(/(?<![>])$/gm, '</p>');
        
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');
        
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
        
        html = html.replace(/^---$/gm, '<hr>');
        
        return html;
    }
};

// ========================================================
// 编辑器工具
// ========================================================
const EditorUtils = {
    getSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            return selection.getRangeAt(0);
        }
        return null;
    },

    insertElement(tag, attributes = {}) {
        const range = this.getSelection();
        if (!range) return;

        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, value);
        }

        if (range.collapsed) {
            element.textContent = '文本';
            range.insertNode(element);
        } else {
            const selectedText = range.toString();
            element.textContent = selectedText || '文本';
            range.deleteContents();
            range.insertNode(element);
        }

        this.setCaretAfter(element);
    },

    insertBlockElement(tag) {
        const range = this.getSelection();
        if (!range) return;

        const currentBlock = this.getCurrentBlockElement();
        const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag.toUpperCase());

        if (currentBlock && currentBlock.tagName !== 'LI' && currentBlock.tagName !== 'PRE') {
            if (isHeading) {
                const newElement = document.createElement(tag);
                newElement.innerHTML = currentBlock.innerHTML;
                currentBlock.parentNode.replaceChild(newElement, currentBlock);
                this.setCaretAtEnd(newElement);
                return;
            } else if (tag === 'blockquote') {
                const blockquote = document.createElement('blockquote');
                blockquote.innerHTML = currentBlock.innerHTML;
                currentBlock.parentNode.replaceChild(blockquote, currentBlock);
                this.setCaretAtEnd(blockquote);
                return;
            }
        }

        const element = document.createElement(tag);
        element.innerHTML = '<br>';

        if (currentBlock) {
            currentBlock.after(element);
        } else {
            elements.richEditor.appendChild(element);
        }

        this.setCaretAtStart(element);
    },

    insertList(listType) {
        const range = this.getSelection();
        if (!range) return;

        const currentBlock = this.getCurrentBlockElement();
        
        if (currentBlock && currentBlock.tagName !== 'LI' && currentBlock.tagName !== 'PRE') {
            const list = document.createElement(listType);
            const li = document.createElement('li');
            li.innerHTML = currentBlock.innerHTML || '<br>';
            list.appendChild(li);
            currentBlock.parentNode.replaceChild(list, currentBlock);
            this.setCaretAtEnd(li);
            return;
        }

        const list = document.createElement(listType);
        const li = document.createElement('li');
        li.innerHTML = '<br>';
        list.appendChild(li);

        if (currentBlock) {
            currentBlock.after(list);
        } else {
            elements.richEditor.appendChild(list);
        }

        this.setCaretAtStart(li);
    },

    insertTaskList() {
        const range = this.getSelection();
        if (!range) return;

        const currentBlock = this.getCurrentBlockElement();
        
        if (currentBlock && currentBlock.tagName !== 'LI' && currentBlock.tagName !== 'PRE') {
            const ul = document.createElement('ul');
            const li = document.createElement('li');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            li.appendChild(checkbox);
            const content = currentBlock.textContent.trim() || ' 任务';
            li.appendChild(document.createTextNode(' ' + content));
            ul.appendChild(li);
            currentBlock.parentNode.replaceChild(ul, currentBlock);
            this.setCaretAfter(checkbox);
            return;
        }

        const ul = document.createElement('ul');
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        li.appendChild(checkbox);
        li.appendChild(document.createTextNode(' 任务'));
        ul.appendChild(li);

        if (currentBlock) {
            currentBlock.after(ul);
        } else {
            elements.richEditor.appendChild(ul);
        }

        this.setCaretAfter(checkbox);
    },

    setCaretAtEnd(element) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    },

    insertCodeBlock() {
        const range = this.getSelection();
        if (!range) return;

        const pre = document.createElement('pre');
        pre.setAttribute('data-language', 'text');
        
        const langLabel = document.createElement('span');
        langLabel.className = 'code-lang-label';
        langLabel.textContent = 'text';
        pre.appendChild(langLabel);

        const code = document.createElement('code');
        code.contentEditable = 'true';
        code.spellcheck = false;
        code.innerHTML = '<br>';
        pre.appendChild(code);

        const currentBlock = this.getCurrentBlockElement();
        if (currentBlock) {
            currentBlock.after(pre);
        } else {
            elements.richEditor.appendChild(pre);
        }

        setupCodeBlockEvents(pre);

        this.setCaretAtStart(code);
        scheduleSave();
    },

    insertHr() {
        const range = this.getSelection();
        if (!range) return;

        const hr = document.createElement('hr');
        
        const currentBlock = this.getCurrentBlockElement();
        if (currentBlock) {
            currentBlock.after(hr);
        } else {
            elements.richEditor.appendChild(hr);
        }

        const p = document.createElement('p');
        p.textContent = ' ';
        hr.after(p);
        this.setCaretAtStart(p);
    },

    insertTable() {
        const range = this.getSelection();
        if (!range) return;

        const table = document.createElement('table');
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['列1', '列2', '列3'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
        const tbody = document.createElement('tbody');
        const bodyRow = document.createElement('tr');
        ['内容', '内容', '内容'].forEach(text => {
            const td = document.createElement('td');
            td.textContent = text;
            bodyRow.appendChild(td);
        });
        tbody.appendChild(bodyRow);

        table.appendChild(thead);
        table.appendChild(tbody);

        const currentBlock = this.getCurrentBlockElement();
        if (currentBlock) {
            currentBlock.after(table);
        } else {
            elements.richEditor.appendChild(table);
        }

        const p = document.createElement('p');
        p.textContent = ' ';
        table.after(p);
        this.setCaretAtStart(p);
    },

    executeCommand(command) {
        document.execCommand(command, false, null);
    },

    getCurrentBlockElement() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return null;

        let node = selection.anchorNode;
        while (node && node !== elements.richEditor) {
            if (node.nodeType === Node.ELEMENT_NODE && 
                ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'].includes(node.tagName)) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    },

    setCaretAfter(element) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStartAfter(element);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    },

    setCaretAtStart(element) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(element, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    },

    ensureParagraph() {
        if (elements.richEditor.children.length === 0) {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            elements.richEditor.appendChild(p);
        }
    },

    getCurrentListItem() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return null;

        let node = selection.anchorNode;
        while (node && node !== elements.richEditor) {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'LI') {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    },

    indentListItem() {
        const li = this.getCurrentListItem();
        if (!li) return false;

        const prevLi = li.previousElementSibling;
        if (!prevLi || prevLi.tagName !== 'LI') return false;

        let subList = prevLi.querySelector('ul, ol');
        if (!subList) {
            const parentList = li.parentElement;
            const listType = parentList.tagName.toLowerCase();
            subList = document.createElement(listType);
            prevLi.appendChild(subList);
        }

        subList.appendChild(li);
        this.setCaretAtStart(li);
        
        return true;
    },

    outdentListItem() {
        const li = this.getCurrentListItem();
        if (!li) return false;

        const parentList = li.parentElement;
        if (!parentList || !['UL', 'OL'].includes(parentList.tagName)) return false;

        const grandparent = parentList.parentElement;
        if (!grandparent) return false;

        if (grandparent.tagName === 'LI') {
            const greatGrandparent = grandparent.parentElement;
            if (greatGrandparent && ['UL', 'OL'].includes(greatGrandparent.tagName)) {
                grandparent.after(li);
                this.setCaretAtStart(li);
                
                if (parentList.children.length === 0) {
                    parentList.remove();
                }
                return true;
            }
        }

        if (['UL', 'OL'].includes(grandparent.tagName)) {
            return false;
        }

        return false;
    }
};

// ========================================================
// API 调用封装
// ========================================================
const api = {
    async call(action, params = {}) {
        return Auth.fetchApi('/long_doc', action, params);
    },

    async list() {
        return this.call('list', {});
    },

    async create(docName, parentDocId = 0) {
        return this.call('create', { doc_name: docName, parent_doc_id: parentDocId });
    },

    async delete(docId) {
        return this.call('delete', { doc_id: docId });
    },

    async get(docId) {
        return this.call('get', { doc_id: docId });
    },

    async save(docId, docValue) {
        return this.call('save', { doc_id: docId, doc_value: docValue });
    },

    async rename(docId, docName) {
        return this.call('rename', { doc_id: docId, doc_name: docName });
    },

    async move(docId, parentDocId, position) {
        return this.call('move', { 
            doc_id: docId, 
            parent_doc_id: parentDocId,
            position: position 
        });
    }
};



// ========================================================
// 文档列表渲染
// ========================================================
function renderDocList() {
    if (state.docList.length === 0) {
        elements.emptyState.style.display = 'flex';
        elements.docList.innerHTML = '';
        elements.docList.appendChild(elements.emptyState);
        return;
    }

    elements.emptyState.style.display = 'none';
    
    const treeHtml = renderTreeNode(state.docList, 0);
    elements.docList.innerHTML = `<ul class="doc-tree">${treeHtml}</ul>`;
    
    bindDocListEvents();
}

function renderTreeNode(nodes, level) {
    if (!nodes || nodes.length === 0) return '';

    let html = '';
    nodes.forEach((node, index) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = state.expandedNodes.has(node.doc_id.toString());
        const isActive = state.currentDocId === node.doc_id;

        html += `
            <li class="doc-item" data-doc-id="${node.doc_id}" data-level="${level}">
                <div class="doc-item-wrapper ${isActive ? 'active' : ''}" draggable="true">
                    <button class="doc-expand-btn ${hasChildren ? '' : 'hidden'} ${isExpanded ? 'expanded' : ''}" 
                            data-doc-id="${node.doc_id}">▶</button>
                    <span class="doc-icon">${hasChildren ? '📁' : '📄'}</span>
                    <span class="doc-name" title="${escapeHtml(node.doc_name)}">${escapeHtml(node.doc_name)}</span>
                    <div class="doc-actions">
                        <button class="doc-action-btn add" data-doc-id="${node.doc_id}" title="添加子文档">+</button>
                        <button class="doc-action-btn delete" data-doc-id="${node.doc_id}" title="删除文档">×</button>
                    </div>
                </div>
                ${hasChildren ? `<ul class="doc-tree-level ${isExpanded ? 'expanded' : ''}">${renderTreeNode(node.children, level + 1)}</ul>` : ''}
            </li>
        `;
    });

    return html;
}

// ========================================================
// 文档列表事件绑定
// ========================================================
function bindDocListEvents() {
    const wrappers = elements.docList.querySelectorAll('.doc-item-wrapper');
    wrappers.forEach(wrapper => {
        wrapper.addEventListener('click', handleDocClick);
        wrapper.addEventListener('dragstart', handleDragStart);
        wrapper.addEventListener('dragend', handleDragEnd);
        wrapper.addEventListener('dragover', handleDragOver);
        wrapper.addEventListener('dragleave', handleDragLeave);
        wrapper.addEventListener('drop', handleDrop);
    });

    const expandBtns = elements.docList.querySelectorAll('.doc-expand-btn');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', handleExpandClick);
    });

    const addBtns = elements.docList.querySelectorAll('.doc-action-btn.add');
    addBtns.forEach(btn => {
        btn.addEventListener('click', handleAddChildDoc);
    });

    const deleteBtns = elements.docList.querySelectorAll('.doc-action-btn.delete');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', handleDeleteDoc);
    });
}

function handleDocClick(e) {
    if (e.target.closest('.doc-expand-btn') || 
        e.target.closest('.doc-action-btn')) {
        return;
    }

    const docItem = e.currentTarget.closest('.doc-item');
    const docId = parseInt(docItem.dataset.docId);
    
    selectDoc(docId);
}

function handleExpandClick(e) {
    e.stopPropagation();
    const docId = e.target.dataset.docId;
    const docItem = e.target.closest('.doc-item');
    const childrenList = docItem.querySelector('.doc-tree-level');

    if (state.expandedNodes.has(docId)) {
        state.expandedNodes.delete(docId);
        e.target.classList.remove('expanded');
        if (childrenList) childrenList.classList.remove('expanded');
    } else {
        state.expandedNodes.add(docId);
        e.target.classList.add('expanded');
        if (childrenList) childrenList.classList.add('expanded');
    }
}

function handleAddChildDoc(e) {
    e.stopPropagation();
    const parentDocId = parseInt(e.target.dataset.docId);
    openCreateModal(parentDocId);
}

let pendingDeleteDocId = null;
function handleDeleteDoc(e) {
    e.stopPropagation();
    pendingDeleteDocId = parseInt(e.target.dataset.docId);
    openDeleteModal();
}

// ========================================================
// 拖拽功能
// ========================================================
function handleDragStart(e) {
    const docItem = e.currentTarget.closest('.doc-item');
    state.draggedDocId = parseInt(docItem.dataset.docId);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    clearDragIndicators();
    state.draggedDocId = null;
    state.dragOverDocId = null;
    state.dragPosition = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const wrapper = e.currentTarget;
    const docItem = wrapper.closest('.doc-item');
    const targetDocId = parseInt(docItem.dataset.docId);

    if (targetDocId === state.draggedDocId) return;

    clearDragIndicators();

    const rect = wrapper.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    wrapper.classList.add('drag-over');

    if (y < height * 0.25) {
        state.dragPosition = 'top';
        wrapper.classList.add('drag-over-top');
    } else if (y > height * 0.75) {
        state.dragPosition = 'bottom';
        wrapper.classList.add('drag-over-bottom');
    } else {
        state.dragPosition = 'inside';
        wrapper.classList.add('drag-over-inside');
    }

    state.dragOverDocId = targetDocId;
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom', 'drag-over-inside');
}

function clearDragIndicators() {
    const wrappers = elements.docList.querySelectorAll('.doc-item-wrapper');
    wrappers.forEach(wrapper => {
        wrapper.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom', 'drag-over-inside');
    });
}

async function handleDrop(e) {
    e.preventDefault();
    clearDragIndicators();

    if (!state.draggedDocId || !state.dragOverDocId || !state.dragPosition) return;
    if (state.draggedDocId === state.dragOverDocId) return;

    try {
        let parentDocId = 0;
        let position = 0;

        const flatList = flattenDocList(state.docList);
        const targetIndex = flatList.findIndex(d => d.doc_id === state.dragOverDocId);
        const draggedIndex = flatList.findIndex(d => d.doc_id === state.draggedDocId);

        const targetDoc = flatList[targetIndex];

        if (state.dragPosition === 'inside') {
            parentDocId = state.dragOverDocId;
            position = 0;
        } else if (state.dragPosition === 'top') {
            parentDocId = targetDoc.parent_doc_id;
            position = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
        } else if (state.dragPosition === 'bottom') {
            parentDocId = targetDoc.parent_doc_id;
            position = targetIndex > draggedIndex ? targetIndex : targetIndex + 1;
        }

        await api.move(state.draggedDocId, parentDocId, position);
        await loadDocList();
        
        showToast('移动成功', { closable: true });
    } catch (error) {
        showToast(error.message || '移动失败', 'error');
    }
}

function flattenDocList(docs, result = []) {
    docs.forEach(doc => {
        result.push(doc);
        if (doc.children) {
            flattenDocList(doc.children, result);
        }
    });
    return result;
}

// ========================================================
// 文档操作
// ========================================================
async function loadDocList() {
    try {
        const result = await api.list();
        state.docList = (result.data && result.data.documents) || [];
        renderDocList();
    } catch (error) {
        showToast(error.message || '加载文档列表失败', 'error');
    }
}

async function selectDoc(docId) {
    if (state.currentDocId === docId) return;

    state.currentDocId = docId;
    
    const previousActive = elements.docList.querySelector('.doc-item-wrapper.active');
    if (previousActive) {
        previousActive.classList.remove('active');
    }

    const currentDocItem = elements.docList.querySelector(`.doc-item[data-doc-id="${docId}"]`);
    if (currentDocItem) {
        currentDocItem.querySelector('.doc-item-wrapper').classList.add('active');
    }

    try {
        const result = await api.get(docId);
        const doc = result.data || {};
        state.currentDocName = doc.doc_name || '';
        
        elements.docTitle.innerHTML = `<span>${escapeHtml(doc.doc_name || '')}</span>`;
        elements.welcomeMessage.classList.add('hidden');
        
        elements.richEditor.style.display = 'block';
        
        if (doc.doc_value) {
            elements.editor.value = doc.doc_value;
            const html = MarkdownParser.render(doc.doc_value);
            elements.richEditor.innerHTML = html;
            
            initCodeBlockLangLabels();
        } else {
            elements.richEditor.innerHTML = '';
        }
        
        elements.toggleTocBtn.style.display = 'inline-flex';
        elements.copyBtn.style.display = 'inline-flex';
        
        if (state.tocVisible) {
            elements.tocContainer.classList.remove('collapsed');
            elements.expandTocBtn.style.display = 'none';
        } else {
            elements.tocContainer.classList.add('collapsed');
            elements.expandTocBtn.style.display = 'flex';
        }
        
        updateTOC();
        
        elements.richEditor.focus();
    } catch (error) {
        showToast(error.message || '加载文档失败', 'error');
    }
}

// ========================================================
// 创建文档模态框
// ========================================================
let createModeParentId = 0;

function openCreateModal(parentDocId = 0) {
    createModeParentId = parentDocId;
    elements.createModalTitle.textContent = parentDocId > 0 ? '新建子文档' : '新建文档';
    elements.newDocName.value = '';
    elements.createDocModal.classList.add('show');
    elements.newDocName.focus();
}

function closeCreateModal() {
    elements.createDocModal.classList.remove('show');
}

async function submitCreateDoc(e) {
    e.preventDefault();
    
    const docName = elements.newDocName.value.trim();
    if (!docName) {
        showToast('请输入文档名称', { type: 'error', closable: true });
        return;
    }

    try {
        const result = await api.create(docName, createModeParentId);
        closeCreateModal();
        await loadDocList();
        
        const parentDocItem = elements.docList.querySelector(`.doc-item[data-doc-id="${createModeParentId}"]`);
        if (parentDocItem && createModeParentId > 0) {
            state.expandedNodes.add(createModeParentId.toString());
            const expandBtn = parentDocItem.querySelector('.doc-expand-btn');
            const childrenList = parentDocItem.querySelector('.doc-tree-level');
            if (expandBtn) expandBtn.classList.add('expanded');
            if (childrenList) childrenList.classList.add('expanded');
        }
        
        const docId = (result.data && result.data.doc_id) || 0;
        if (docId > 0) {
            await selectDoc(docId);
        }
        
        showToast('创建成功', { closable: true });
    } catch (error) {
        showToast(error.message || '创建失败', 'error');
    }
}

// ========================================================
// 删除文档模态框
// ========================================================
function openDeleteModal() {
    elements.confirmDeleteModal.classList.add('show');
}

function closeDeleteModal() {
    elements.confirmDeleteModal.classList.remove('show');
    pendingDeleteDocId = null;
}

async function confirmDelete() {
    if (!pendingDeleteDocId) return;

    try {
        await api.delete(pendingDeleteDocId);
        closeDeleteModal();
        
        if (state.currentDocId === pendingDeleteDocId) {
            state.currentDocId = null;
            state.currentDocName = '';
            elements.docTitle.innerHTML = '<span class="title-placeholder">请选择或创建一个文档</span>';
            elements.welcomeMessage.classList.remove('hidden');
            elements.richEditor.style.display = 'none';
            elements.toggleTocBtn.style.display = 'none';
            elements.copyBtn.style.display = 'none';
            elements.tocContainer.classList.add('collapsed');
            elements.expandTocBtn.style.display = 'none';
        }
        
        await loadDocList();
        showToast('删除成功', { closable: true });
    } catch (error) {
        showToast(error.message || '删除失败', 'error');
    }
}

// ========================================================
// 自动保存
// ========================================================
function scheduleSave() {
    if (state.saveTimer) {
        clearTimeout(state.saveTimer);
    }
    
    state.saveTimer = setTimeout(async () => {
        if (!state.currentDocId) return;
        
        try {
            const markdown = MarkdownParser.parse(elements.richEditor.innerHTML);
            elements.editor.value = markdown;
            await api.save(state.currentDocId, markdown);
        } catch (error) {
            console.error('自动保存失败:', error);
        }
    }, state.saveDelay);
}

// ========================================================
// 目录索引
// ========================================================
function updateTOC() {
    const html = elements.richEditor.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length === 0) {
        elements.tocList.innerHTML = '<div style="padding: 16px; color: var(--text-muted); text-align: center;">暂无目录</div>';
        return;
    }

    let htmlToc = '';
    headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent.trim();
        htmlToc += `
            <div class="toc-item level-${level}" data-index="${index}">
                ${escapeHtml(text)}
            </div>
        `;
    });

    elements.tocList.innerHTML = htmlToc;
}

// ========================================================
// 目录收缩/展开
// ========================================================
function collapseTOC() {
    state.tocVisible = false;
    elements.tocContainer.classList.add('collapsed');
    
    setTimeout(() => {
        elements.expandTocBtn.style.display = 'flex';
    }, 200);
}

function expandTOC() {
    state.tocVisible = true;
    elements.expandTocBtn.style.display = 'none';
    
    setTimeout(() => {
        elements.tocContainer.classList.remove('collapsed');
    }, 10);
}

// ========================================================
// 代码块语言选择
// ========================================================
function initCodeBlockLangLabels() {
    const pres = elements.richEditor.querySelectorAll('pre');
    pres.forEach(pre => {
        if (!pre.querySelector('.code-lang-label')) {
            const lang = pre.getAttribute('data-language') || 'text';
            const langLabel = document.createElement('span');
            langLabel.className = 'code-lang-label';
            langLabel.textContent = lang;
            pre.insertBefore(langLabel, pre.firstChild);
        }
        
        setupCodeBlockEvents(pre);
    });
}

function showCodeLangMenu(pre, target) {
    const rect = target.getBoundingClientRect();
    const currentLang = pre.getAttribute('data-language') || 'text';
    
    currentCodeBlockForLang = pre;

    let html = '';
    codeLanguages.forEach(lang => {
        const isActive = lang.id === currentLang || lang.alias.includes(currentLang);
        html += `
            <div class="code-lang-item ${isActive ? 'active' : ''}" data-lang="${lang.id}">
                <span>${lang.name}</span>
                <span class="check-icon">✓</span>
            </div>
        `;
    });
    elements.codeLangList.innerHTML = html;

    elements.codeLangMenu.style.left = rect.left + 'px';
    elements.codeLangMenu.style.top = (rect.bottom + 4) + 'px';
    elements.codeLangMenu.classList.add('show');

    const langItems = elements.codeLangList.querySelectorAll('.code-lang-item');
    langItems.forEach(item => {
        item.addEventListener('click', () => {
            const lang = item.dataset.lang;
            selectCodeLanguage(lang);
        });
    });
}

function hideCodeLangMenu() {
    elements.codeLangMenu.classList.remove('show');
    currentCodeBlockForLang = null;
}

function selectCodeLanguage(langId) {
    if (!currentCodeBlockForLang) return;

    const langInfo = codeLanguages.find(l => l.id === langId);
    const displayLang = langInfo ? langInfo.id : langId;

    currentCodeBlockForLang.setAttribute('data-language', displayLang);
    
    const langLabel = currentCodeBlockForLang.querySelector('.code-lang-label');
    if (langLabel) {
        langLabel.textContent = displayLang;
    }

    hideCodeLangMenu();
    scheduleSave();
}

function getCodePlainText(codeElement) {
    if (!codeElement) return '';
    
    if (codeElement.innerText !== undefined) {
        const innerText = codeElement.innerText;
        if (innerText !== null && innerText.trim() !== '') {
            return innerText;
        }
    }
    
    if (codeElement.textContent && codeElement.textContent.trim() !== '') {
        return codeElement.textContent;
    }
    
    return '';
}

function setupCodeBlockEvents(pre) {
    const codeElement = pre.querySelector('code');
    if (!codeElement) return;

    codeElement.contentEditable = 'true';
    codeElement.spellcheck = false;

    codeElement.addEventListener('input', () => {
        scheduleSave();
    });

    codeElement.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                
                if (e.shiftKey) {
                    const textNode = range.startContainer;
                    if (textNode.nodeType === Node.TEXT_NODE) {
                        const text = textNode.textContent;
                        const cursorPos = range.startOffset;
                        
                        let startPos = cursorPos;
                        let spaceCount = 0;
                        while (startPos > 0 && text[startPos - 1] === ' ') {
                            startPos--;
                            spaceCount++;
                        }
                        
                        if (spaceCount > 0) {
                            const removeCount = Math.min(4, spaceCount);
                            const newText = text.substring(0, startPos) + text.substring(startPos + removeCount);
                            textNode.textContent = newText;
                            
                            const newRange = document.createRange();
                            newRange.setStart(textNode, cursorPos - removeCount);
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                    }
                } else {
                    const textNode = document.createTextNode('    ');
                    range.insertNode(textNode);
                    
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
            
            return false;
        }
    });
}

function initCodeBlockEvents() {
    const pres = elements.richEditor.querySelectorAll('pre');
    pres.forEach(pre => {
        setupCodeBlockEvents(pre);
    });
}

// ========================================================
// 斜杠快捷菜单
// ========================================================
let slashMenuVisible = false;
let slashMenuCursorPos = null;
let filteredMenuItems = [...slashMenuItems];
let savedEditorRange = null;

function showSlashMenu() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    savedEditorRange = range.cloneRange();
    const rect = range.getBoundingClientRect();

    filteredMenuItems = [...slashMenuItems];
    state.selectedMenuIndex = 0;

    elements.slashMenu.style.left = rect.left + 'px';
    elements.slashMenu.style.top = (rect.bottom + 5) + 'px';

    renderSlashMenu();
    elements.slashMenu.classList.add('show');
    slashMenuVisible = true;
    elements.slashSearchInput.focus();
    elements.slashSearchInput.value = '';
}

function hideSlashMenu() {
    elements.slashMenu.classList.remove('show');
    slashMenuVisible = false;
    elements.slashSearchInput.value = '';
}

function renderSlashMenu() {
    let html = '';
    filteredMenuItems.forEach((item, index) => {
        html += `
            <div class="slash-menu-item ${index === state.selectedMenuIndex ? 'active' : ''}" data-index="${index}">
                <div class="slash-menu-icon">${item.icon}</div>
                <div class="slash-menu-info">
                    <div class="slash-menu-title">${item.title}</div>
                    <div class="slash-menu-desc">${item.desc}</div>
                </div>
            </div>
        `;
    });
    elements.slashMenuList.innerHTML = html;

    const menuItems = elements.slashMenuList.querySelectorAll('.slash-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            insertSlashMenuItem(index);
        });
    });

    const activeItem = elements.slashMenuList.querySelector('.slash-menu-item.active');
    if (activeItem) {
        const menuList = elements.slashMenuList;
        const menuRect = menuList.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        
        if (itemRect.top < menuRect.top) {
            menuList.scrollTop -= menuRect.top - itemRect.top;
        } else if (itemRect.bottom > menuRect.bottom) {
            menuList.scrollTop += itemRect.bottom - menuRect.bottom;
        }
    }
}

function filterSlashMenu(query) {
    const q = query.toLowerCase();
    filteredMenuItems = slashMenuItems.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.desc.toLowerCase().includes(q)
    );
    state.selectedMenuIndex = 0;
    renderSlashMenu();
}

function insertSlashMenuItem(index) {
    if (index < 0 || index >= filteredMenuItems.length) return;

    const item = filteredMenuItems[index];
    
    if (savedEditorRange) {
        const range = savedEditorRange;
        let node = range.startContainer;
        while (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const cursorPos = range.startOffset;
                
                if (cursorPos > 0 && text[cursorPos - 1] === '/') {
                    const newText = text.substring(0, cursorPos - 1) + text.substring(cursorPos);
                    node.textContent = newText;
                    
                    const selection = window.getSelection();
                    const newRange = document.createRange();
                    newRange.setStart(node, cursorPos - 1);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    break;
                }
            }
            node = node.parentNode;
        }
    }

    switch (item.type) {
        case 'block':
            if (item.tag === 'pre') {
                EditorUtils.insertCodeBlock();
            } else if (item.tag === 'hr') {
                EditorUtils.insertHr();
            } else if (item.tag === 'table') {
                EditorUtils.insertTable();
            } else if (item.tag === 'img') {
                EditorUtils.insertElement('img', { src: '', alt: '图片' });
            } else if (item.tag === 'blockquote') {
                EditorUtils.insertBlockElement('blockquote');
            } else {
                EditorUtils.insertBlockElement(item.tag);
            }
            break;
        case 'inline':
            if (item.command) {
                EditorUtils.executeCommand(item.command);
            } else if (item.tag === 'a') {
                EditorUtils.insertElement('a', { href: '#', target: '_blank' });
            } else {
                EditorUtils.insertElement(item.tag);
            }
            break;
        case 'list':
            EditorUtils.insertList(item.listType);
            break;
        case 'task':
            EditorUtils.insertTaskList();
            break;
        case 'hr':
            EditorUtils.insertHr();
            break;
    }

    hideSlashMenu();
    scheduleSave();
    updateTOC();
    
    elements.richEditor.focus();
}

// ========================================================
// 复制功能
// ========================================================
async function copyContent() {
    if (!state.currentDocId) return;
    
    try {
        const markdown = MarkdownParser.parse(elements.richEditor.innerHTML);
        await navigator.clipboard.writeText(markdown);
        showToast('已复制到剪贴板', { closable: true });
    } catch (error) {
        const markdown = MarkdownParser.parse(elements.richEditor.innerHTML);
        const textarea = document.createElement('textarea');
        textarea.value = markdown;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('已复制到剪贴板', { closable: true });
    }
}

// ========================================================
// 事件绑定
// ========================================================
function bindEvents() {
    elements.createRootBtn.addEventListener('click', () => openCreateModal(0));
    
    elements.createDocForm.addEventListener('submit', submitCreateDoc);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (slashMenuVisible) {
                hideSlashMenu();
                elements.richEditor.focus();
            }
            closeCreateModal();
            closeDeleteModal();
        }
    });

    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);
    elements.collapseTocBtn.addEventListener('click', collapseTOC);
    elements.expandTocBtn.addEventListener('click', expandTOC);
    elements.copyBtn.addEventListener('click', copyContent);

    elements.richEditor.addEventListener('input', (e) => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
                const text = range.startContainer.textContent;
                const cursorPos = range.startOffset;
                
                if (cursorPos > 0 && text[cursorPos - 1] === '/') {
                    const prevChar = cursorPos > 1 ? text[cursorPos - 2] : ' ';
                    if (prevChar === ' ' || prevChar === '\n' || cursorPos === 1) {
                        showSlashMenu();
                    }
                }
            }
        }

        scheduleSave();
        updateTOC();
    });

    elements.richEditor.addEventListener('keydown', (e) => {
        if (slashMenuVisible) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                state.selectedMenuIndex = Math.min(state.selectedMenuIndex + 1, filteredMenuItems.length - 1);
                renderSlashMenu();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                state.selectedMenuIndex = Math.max(state.selectedMenuIndex - 1, 0);
                renderSlashMenu();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                insertSlashMenuItem(state.selectedMenuIndex);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                insertSlashMenuItem(state.selectedMenuIndex);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                hideSlashMenu();
            }
        } else {
            const currentBlock = EditorUtils.getCurrentBlockElement();
            const currentLi = EditorUtils.getCurrentListItem();

            if (e.key === 'Enter' && !e.shiftKey) {
                if (currentLi) {
                    e.preventDefault();
                    handleListEnter(currentLi);
                } else if (currentBlock && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(currentBlock.tagName)) {
                    e.preventDefault();
                    handleBlockEnter(currentBlock);
                }
            } else if (currentLi) {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        EditorUtils.outdentListItem();
                    } else {
                        EditorUtils.indentListItem();
                    }
                    scheduleSave();
                } else if (e.key === 'Backspace') {
                    const liText = currentLi.textContent.trim();
                    const list = currentLi.parentElement;
                    if (liText === '' && list.children.length > 1) {
                        e.preventDefault();
                        exitList(currentLi);
                    }
                }
            }
        }
    });

    function handleListEnter(li) {
        const list = li.parentElement;
        const listType = list.tagName.toLowerCase();
        const liText = li.textContent.trim();

        if (liText === '') {
            exitList(li);
            return;
        }

        const newLi = document.createElement('li');
        newLi.innerHTML = '<br>';
        li.after(newLi);

        EditorUtils.setCaretAtStart(newLi);
        scheduleSave();
    }

    function exitList(li) {
        const list = li.parentElement;
        const grandparent = list.parentElement;

        if (grandparent && grandparent.tagName === 'LI') {
            const greatGrandparent = grandparent.parentElement;
            if (greatGrandparent && ['UL', 'OL'].includes(greatGrandparent.tagName)) {
                li.remove();
                if (list.children.length === 0) {
                    list.remove();
                }
                const newLi = document.createElement('li');
                newLi.innerHTML = '<br>';
                grandparent.after(newLi);
                EditorUtils.setCaretAtStart(newLi);
                scheduleSave();
                return;
            }
        }

        li.remove();
        if (list.children.length === 0) {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            list.parentNode.replaceChild(p, list);
            EditorUtils.setCaretAtStart(p);
        } else {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            list.after(p);
            EditorUtils.setCaretAtStart(p);
        }
        scheduleSave();
    }

    function handleBlockEnter(block) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        block.after(p);
        EditorUtils.setCaretAtStart(p);
        scheduleSave();
        updateTOC();
    }

    elements.slashSearchInput.addEventListener('input', (e) => {
        filterSlashMenu(e.target.value);
    });

    elements.slashSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.selectedMenuIndex = Math.min(state.selectedMenuIndex + 1, filteredMenuItems.length - 1);
            renderSlashMenu();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.selectedMenuIndex = Math.max(state.selectedMenuIndex - 1, 0);
            renderSlashMenu();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            insertSlashMenuItem(state.selectedMenuIndex);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            insertSlashMenuItem(state.selectedMenuIndex);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideSlashMenu();
            elements.richEditor.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (slashMenuVisible && 
            !elements.slashMenu.contains(e.target) && 
            e.target !== elements.richEditor &&
            !elements.richEditor.contains(e.target)) {
            hideSlashMenu();
        }

        if (!elements.codeLangMenu.classList.contains('show')) return;
        if (!elements.codeLangMenu.contains(e.target) && 
            !e.target.classList.contains('code-lang-label')) {
            hideCodeLangMenu();
        }
    });

    elements.richEditor.addEventListener('click', (e) => {
        if (e.target.classList.contains('code-lang-label')) {
            e.stopPropagation();
            const pre = e.target.closest('pre');
            if (pre) {
                showCodeLangMenu(pre, e.target);
            }
            return;
        }

        const clickedPre = e.target.closest('pre');
        if (clickedPre) {
            if (e.target.closest('code')) {
                return;
            }

            const rect = clickedPre.getBoundingClientRect();
            const clickY = e.clientY;
            
            const prevSibling = clickedPre.previousElementSibling;
            const nextSibling = clickedPre.nextElementSibling;
            
            let topGapStart = rect.top;
            let topGapEnd = rect.top;
            let bottomGapStart = rect.bottom;
            let bottomGapEnd = rect.bottom;
            
            if (prevSibling) {
                const prevRect = prevSibling.getBoundingClientRect();
                topGapStart = prevRect.bottom;
                topGapEnd = rect.top;
            }
            
            if (nextSibling) {
                const nextRect = nextSibling.getBoundingClientRect();
                bottomGapStart = rect.bottom;
                bottomGapEnd = nextRect.top;
            }
            
            const topGapHeight = topGapEnd - topGapStart;
            const bottomGapHeight = bottomGapEnd - bottomGapStart;

            if (topGapHeight > 5 && clickY >= topGapStart && clickY <= topGapEnd) {
                let needInsert = true;
                
                if (prevSibling && prevSibling.tagName === 'P') {
                    const text = prevSibling.textContent.trim();
                    if (text === '' || prevSibling.innerHTML === '<br>') {
                        needInsert = false;
                        EditorUtils.setCaretAtStart(prevSibling);
                    }
                }
                
                if (needInsert) {
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    clickedPre.before(p);
                    EditorUtils.setCaretAtStart(p);
                    scheduleSave();
                }
                
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (bottomGapHeight > 5 && clickY >= bottomGapStart && clickY <= bottomGapEnd) {
                let needInsert = true;
                
                if (nextSibling && nextSibling.tagName === 'P') {
                    const text = nextSibling.textContent.trim();
                    if (text === '' || nextSibling.innerHTML === '<br>') {
                        needInsert = false;
                        EditorUtils.setCaretAtStart(nextSibling);
                    }
                }
                
                if (needInsert) {
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    clickedPre.after(p);
                    EditorUtils.setCaretAtStart(p);
                    scheduleSave();
                }
                
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }
    });
}

// ========================================================
// 初始化
// ========================================================
async function init() {
    bindEvents();
    await loadDocList();
}

window.closeCreateModal = closeCreateModal;
window.closeDeleteModal = closeDeleteModal;

init();

