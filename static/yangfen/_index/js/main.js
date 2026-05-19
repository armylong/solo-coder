import { Auth } from '/static/_common/auth.js';

const API_BASE = 'http://localhost/yangfen';

// 初始化页面
async function init() {
    if (!Auth.getToken()) {
        alert('请先登录');
        window.close();
        return;
    }

    const user = await Auth.getUserInfo();
    if (user && user.uid) {
        document.getElementById('uidDisplay').textContent = user.uid;
        refreshBalance();
        refreshTransactions();
    } else {
        alert('获取用户信息失败');
        window.close();
    }
}

// 显示操作结果
function showResult(data, isError = false) {
    const panel = document.getElementById('resultPanel');
    panel.style.display = 'block';
    panel.className = 'result-panel ' + (isError ? 'result-error' : 'result-success');
    panel.textContent = JSON.stringify(data, null, 2);
}

// 通用接口调用
async function apiCall(action, params = {}) {
    try {
        const data = await Auth.fetchApi(API_BASE, action, params);
        showResult(data, data.code !== 0 && data.code !== undefined);
        return data;
    } catch (error) {
        showResult({ error: error.message }, true);
        return null;
    }
}

// 刷新余额
async function refreshBalance() {
    try {
        const data = await Auth.fetchApi(API_BASE, 'getBalance', {});
        if (data.data) {
            document.getElementById('currentBalance').textContent = data.data.balance;
        }
    } catch (error) {
        console.error('获取余额失败:', error);
    }
}

// 刷新交易列表
async function refreshTransactions() {
    try {
        const data = await Auth.fetchApi(API_BASE, 'getTransactions', {});

        const list = document.getElementById('transactionList');
        if (data.data && data.data.list && data.data.list.length > 0) {
            list.innerHTML = data.data.list.map(t => {
                const isConsume = t.type === 'consume';
                const amountClass = (t.type === 'recharge' || t.type === 'refund' || t.type === 'transfer_in') ? 'amount-positive' : 'amount-negative';
                const typeMap = {
                    'recharge': '充值',
                    'consume': '消费',
                    'transfer_out': '转出',
                    'transfer_in': '转入',
                    'refund': '退款'
                };
                const time = new Date(t.createdAt * 1000).toLocaleString();
                const refundBtn = isConsume ?
                    `<button class="btn refund-btn btn-primary" onclick="quickRefund('${t.id}')">退款</button>` : '';

                return `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="transaction-type">${typeMap[t.type] || t.type}</div>
                            <div class="transaction-desc">${t.description}</div>
                        </div>
                        <div class="transaction-amount ${amountClass}">
                            ${t.type === 'transfer_out' || t.type === 'consume' ? '-' : '+'}${t.amount}
                        </div>
                        <div class="transaction-time">${time}</div>
                        ${refundBtn}
                    </div>
                `;
            }).join('');
        } else {
            list.innerHTML = '<div class="empty-state">暂无交易记录</div>';
        }
    } catch (error) {
        console.error('获取交易记录失败:', error);
    }
}

// 充值
async function recharge() {
    const amount = parseInt(document.getElementById('rechargeAmount').value);
    if (!amount || amount <= 0) {
        showResult({ error: '请输入有效的充值金额' }, true);
        return;
    }
    const expireSec = parseInt(document.getElementById('expireSec').value) || 86400;
    await apiCall('recharge', { amount, expire_sec: expireSec });
    document.getElementById('rechargeAmount').value = '';
    refreshBalance();
    refreshTransactions();
}

// 快捷充值
function quickRecharge(amount) {
    document.getElementById('rechargeAmount').value = amount;
    recharge();
}

// 消费
async function consume() {
    const amount = parseInt(document.getElementById('consumeAmount').value);
    if (!amount || amount <= 0) {
        showResult({ error: '请输入有效的消费金额' }, true);
        return;
    }
    await apiCall('consume', { amount });
    document.getElementById('consumeAmount').value = '';
    refreshBalance();
    refreshTransactions();
}

// 快捷消费
function quickConsume(amount) {
    document.getElementById('consumeAmount').value = amount;
    consume();
}

// 转账
async function transfer() {
    const toUid = document.getElementById('toUid').value.trim();
    const amount = parseInt(document.getElementById('transferAmount').value);

    if (!toUid) {
        showResult({ error: '请输入目标用户ID' }, true);
        return;
    }
    if (!amount || amount <= 0) {
        showResult({ error: '请输入有效的转账金额' }, true);
        return;
    }

    await apiCall('transfer', { toUid, amount });
    document.getElementById('toUid').value = '';
    document.getElementById('transferAmount').value = '';
    refreshBalance();
    refreshTransactions();
}

// 退款
async function refund() {
    const transactionId = document.getElementById('transactionId').value.trim();
    if (!transactionId) {
        showResult({ error: '请输入交易号' }, true);
        return;
    }
    await apiCall('refund', { transactionId });
    document.getElementById('transactionId').value = '';
    refreshBalance();
    refreshTransactions();
}

// 快捷退款
function quickRefund(transactionId) {
    document.getElementById('transactionId').value = transactionId;
    refund();
}

// 清除当前用户数据
async function clearData() {
    if (!confirm('确定要清除当前用户的所有数据吗？')) {
        return;
    }
    await apiCall('clearData', {});
    refreshBalance();
    refreshTransactions();
}

window.quickRecharge = quickRecharge;
window.quickConsume = quickConsume;
window.quickRefund = quickRefund;
window.recharge = recharge;
window.consume = consume;
window.transfer = transfer;
window.refund = refund;
window.clearData = clearData;

init();
