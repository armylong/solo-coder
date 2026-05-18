// 车牌号键盘组件
export class LicensePlateKeyboard {
    constructor(options) {
        this.onConfirm = options.onConfirm || (() => {});
        this.onClose = options.onClose || (() => {});
        this.value = options.value || '';
        this.mode = 'province';
        this.element = null;
        this.init();
    }

    init() {
        this.element = document.createElement('div');
        this.element.className = 'lp-keyboard-overlay';
        this.element.innerHTML = this.render();
        this.bindEvents();

        if (this.value.length > 0) {
            this.mode = 'alnum';
            this.updateDisplay();
            this.renderKeyboard();
        }
    }

    show() {
        document.body.appendChild(this.element);
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            this.element.classList.add('show');
        });
    }

    hide() {
        this.element.classList.remove('show');
        setTimeout(() => {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            document.body.style.overflow = '';
        }, 300);
    }

    render() {
        return `
            <div class="lp-keyboard-container">
                <div class="lp-keyboard-header">
                    <span class="lp-keyboard-title">输入车牌号</span>
                    <button class="lp-keyboard-close">&times;</button>
                </div>
                <div class="lp-plate-display">
                    <div class="lp-plate-cells">
                        ${this.renderPlateCells()}
                    </div>
                    <span class="lp-plate-dot">·</span>
                </div>
                <div class="lp-keyboard-body">
                    ${this.renderProvinceKeys()}
                </div>
            </div>
        `;
    }

    renderPlateCells() {
        let html = '';
        for (let i = 0; i < 8; i++) {
            const char = this.value[i] || '';
            const isActive = this.value.length === i;
            const isLast = i === 7;
            html += `<div class="lp-plate-cell ${isActive ? 'active' : ''} ${char ? 'filled' : ''} ${isLast ? 'new-energy' : ''}">${char}</div>`;
        }
        return html;
    }

    renderProvinceKeys() {
        const provinces = [
            '京','沪','粤','津','冀','豫','云','辽','黑','湘',
            '皖','鲁','苏','浙','赣','鄂','桂','甘','晋','蒙',
            '陕','吉','闽','贵','渝','川','青','藏','琼','新',
            '宁','港','澳','学','警','挂'
        ];

        let html = '<div class="lp-keyboard-grid lp-province-grid">';
        provinces.forEach(p => {
            html += `<button class="lp-key" data-key="${p}">${p}</button>`;
        });
        html += '</div>';
        return html;
    }

    renderAlnumKeys() {
        const row1 = ['1','2','3','4','5','6','7','8','9','0'];
        const row2 = ['Q','W','E','R','T','Y','U','I','O','P'];
        const row3 = ['A','S','D','F','G','H','J','K','L'];
        const row4 = ['Z','X','C','V','B','N','M'];

        let html = '';
        html += '<div class="lp-keyboard-grid lp-alnum-grid">';
        html += '<div class="lp-keyboard-row">';
        row1.forEach(k => html += `<button class="lp-key" data-key="${k}">${k}</button>`);
        html += '</div>';
        html += '<div class="lp-keyboard-row">';
        row2.forEach(k => html += `<button class="lp-key" data-key="${k}">${k}</button>`);
        html += '</div>';
        html += '<div class="lp-keyboard-row">';
        row3.forEach(k => html += `<button class="lp-key" data-key="${k}">${k}</button>`);
        html += '</div>';
        html += '<div class="lp-keyboard-row">';
        row4.forEach(k => html += `<button class="lp-key" data-key="${k}">${k}</button>`);
        html += `<button class="lp-key lp-key-wide" data-action="delete">⌫</button>`;
        html += '</div>';
        html += '<div class="lp-keyboard-row lp-bottom-row">';
        html += `<button class="lp-key lp-key-province" data-action="province">省份</button>`;
        html += `<button class="lp-key lp-key-wide lp-key-confirm" data-action="confirm">确定</button>`;
        html += '</div>';
        html += '</div>';
        return html;
    }

    renderKeyboard() {
        const body = this.element.querySelector('.lp-keyboard-body');
        if (this.mode === 'province') {
            body.innerHTML = this.renderProvinceKeys();
        } else {
            body.innerHTML = this.renderAlnumKeys();
        }
    }

    updateDisplay() {
        const cells = this.element.querySelector('.lp-plate-cells');
        if (cells) {
            cells.innerHTML = this.renderPlateCells();
        }
    }

    bindEvents() {
        this.element.addEventListener('click', (e) => {
            const keyBtn = e.target.closest('.lp-key');
            if (keyBtn) {
                const key = keyBtn.dataset.key;
                const action = keyBtn.dataset.action;
                this.handleKey(key, action);
                return;
            }

            const closeBtn = e.target.closest('.lp-keyboard-close');
            if (closeBtn) {
                this.onClose(this.value);
                this.hide();
                return;
            }

            if (e.target === this.element) {
                this.onClose(this.value);
                this.hide();
            }
        });
    }

    // 处理按键
    handleKey(key, action) {
        if (action === 'delete') {
            if (this.value.length > 0) {
                this.value = this.value.slice(0, -1);
                if (this.value.length === 0) {
                    this.mode = 'province';
                    this.renderKeyboard();
                }
            }
        } else if (action === 'province') {
            this.mode = 'province';
            this.renderKeyboard();
        } else if (action === 'confirm') {
            this.onConfirm(this.value);
            this.hide();
        } else if (key) {
            const maxLen = 8;
            if (this.mode === 'province') {
                this.value = key + this.value.slice(1);
                this.mode = 'alnum';
                this.renderKeyboard();
            } else if (this.value.length < maxLen) {
                this.value += key;
            }
        }

        this.updateDisplay();
    }

    setValue(val) {
        this.value = val || '';
        if (this.value.length > 0) {
            this.mode = 'alnum';
        } else {
            this.mode = 'province';
        }
        this.updateDisplay();
        this.renderKeyboard();
    }
}
