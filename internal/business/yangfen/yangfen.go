package yangfen

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/armylong/armylong-go/internal/common/webcache"
	userModel "github.com/armylong/armylong-go/internal/model/user"
	yangfenModel "github.com/armylong/armylong-go/internal/model/yangfen"
)

const leaderboardCacheKey = "yangfen:leaderboard"
const leaderboardCacheExpire = 5 * time.Minute

type yangfenBusiness struct{}

var YangfenBusiness = &yangfenBusiness{}

// 查余额
func (b *yangfenBusiness) GetBalance(ctx context.Context, uid string) (int, error) {
	row, err := yangfenModel.TbYangfenBalanceModel.GetByUid(uid)
	if err != nil {
		return 0, nil
	}
	return row.Balance, nil
}

// 检查并清除过期余额
func (b *yangfenBusiness) checkAndClearExpired(ctx context.Context, uid string) error {
	row, err := yangfenModel.TbYangfenBalanceModel.GetByUid(uid)
	if err != nil {
		return nil
	}
	if row.ExpireTime > 0 && time.Now().Unix() > row.ExpireTime {
		yangfenModel.TbYangfenBalanceModel.UpdateBalance(uid, 0)
	}
	return nil
}

// 充值
func (b *yangfenBusiness) Recharge(ctx context.Context, uid string, amount int, expireSec int64) error {
	if amount <= 0 {
		return fmt.Errorf("充值金额必须大于0")
	}

	b.checkAndClearExpired(ctx, uid)

	balance, _ := b.GetBalance(ctx, uid)
	newBalance := balance + amount

	expireTime := time.Now().Add(time.Duration(expireSec) * time.Second).Unix()
	yangfenModel.TbYangfenBalanceModel.CreateOrUpdate(uid, newBalance, expireTime)

	b.addTransaction(ctx, uid, "recharge", amount, newBalance, "充值")
	return nil
}

// 消费
func (b *yangfenBusiness) Consume(ctx context.Context, uid string, amount int) error {
	if amount <= 0 {
		return fmt.Errorf("消费金额必须大于0")
	}

	b.checkAndClearExpired(ctx, uid)

	row, err := yangfenModel.TbYangfenBalanceModel.GetByUid(uid)
	if err != nil {
		return fmt.Errorf("用户不存在")
	}

	if row.Balance < amount {
		return fmt.Errorf("余额不足")
	}

	newBalance := row.Balance - amount
	yangfenModel.TbYangfenBalanceModel.UpdateBalance(uid, newBalance)

	b.addTransaction(ctx, uid, "consume", amount, newBalance, fmt.Sprintf("消费%d积分", amount))
	return nil
}

// 转账
func (b *yangfenBusiness) Transfer(ctx context.Context, fromUid, toUid string, amount int) error {
	if amount <= 0 {
		return fmt.Errorf("转账金额必须大于0")
	}
	if fromUid == toUid {
		return fmt.Errorf("不能转给自己")
	}

	b.checkAndClearExpired(ctx, fromUid)
	b.checkAndClearExpired(ctx, toUid)

	fromRow, err := yangfenModel.TbYangfenBalanceModel.GetByUid(fromUid)
	if err != nil {
		return fmt.Errorf("转出账户不存在")
	}

	if fromRow.Balance < amount {
		return fmt.Errorf("余额不足")
	}

	toRow, _ := yangfenModel.TbYangfenBalanceModel.GetByUid(toUid)
	toBalance := 0
	if toRow != nil {
		toBalance = toRow.Balance
	}

	newFromBalance := fromRow.Balance - amount
	newToBalance := toBalance + amount

	yangfenModel.TbYangfenBalanceModel.CreateOrUpdate(fromUid, newFromBalance, fromRow.ExpireTime)
	yangfenModel.TbYangfenBalanceModel.CreateOrUpdate(toUid, newToBalance, 0)

	b.addTransaction(ctx, fromUid, "transfer_out", amount, newFromBalance, fmt.Sprintf("转出给%s", toUid))
	b.addTransaction(ctx, toUid, "transfer_in", amount, newToBalance, fmt.Sprintf("从%s转入", fromUid))
	return nil
}

// 退款（仅支持消费记录）
func (b *yangfenBusiness) Refund(ctx context.Context, uid string, transactionId string) error {
	tx, err := yangfenModel.TbYangfenTransactionModel.GetByTransactionId(transactionId)
	if err != nil {
		return fmt.Errorf("交易记录不存在")
	}

	if tx.Type != "consume" {
		return fmt.Errorf("只能退款消费记录")
	}

	balance, _ := b.GetBalance(ctx, uid)
	newBalance := balance + tx.Amount
	yangfenModel.TbYangfenBalanceModel.UpdateBalance(uid, newBalance)

	b.addTransaction(ctx, uid, "refund", tx.Amount, newBalance, fmt.Sprintf("退款-交易号:%s", transactionId))
	return nil
}

// 查交易列表
func (b *yangfenBusiness) GetTransactions(ctx context.Context, uid string) ([]map[string]any, error) {
	transactions, err := yangfenModel.TbYangfenTransactionModel.ListByUid(uid, 100)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]any, 0, len(transactions))
	for _, tx := range transactions {
		result = append(result, map[string]any{
			"id":          tx.TransactionId,
			"uid":         tx.Uid,
			"type":        tx.Type,
			"amount":      tx.Amount,
			"balance":     tx.Balance,
			"description": tx.Description,
			"createdAt":   tx.CreatedAt.Unix(),
		})
	}
	return result, nil
}

// 记一笔交易
func (b *yangfenBusiness) addTransaction(ctx context.Context, uid string, txType string, amount int, balance int, desc string) {
	tx := &yangfenModel.TbYangfenTransaction{
		TransactionId: fmt.Sprintf("TX%d", time.Now().UnixNano()),
		Uid:           uid,
		Type:          txType,
		Amount:        amount,
		Balance:       balance,
		Description:   desc,
	}
	yangfenModel.TbYangfenTransactionModel.Create(tx)
}

// 清除用户所有数据
func (b *yangfenBusiness) ClearData(ctx context.Context, uid string) error {
	yangfenModel.TbYangfenBalanceModel.Delete(uid)
	yangfenModel.TbYangfenTransactionModel.DeleteByUid(uid)
	return nil
}

// 排行榜项
type LeaderboardItem struct {
	Rank    int    `json:"rank"`
	Uid     string `json:"uid"`
	Name    string `json:"name"`
	Balance int    `json:"balance"`
}

// 获取排行榜
func (b *yangfenBusiness) GetLeaderboard(ctx context.Context, topN int) ([]LeaderboardItem, error) {
	if topN <= 0 {
		topN = 10
	}
	if topN > 100 {
		topN = 100
	}

	cacheData, err := webcache.RedisClient.Get(ctx, leaderboardCacheKey).Result()
	if err == nil && cacheData != "" {
		var result []LeaderboardItem
		if jsonErr := json.Unmarshal([]byte(cacheData), &result); jsonErr == nil {
			if len(result) > topN {
				return result[:topN], nil
			}
			return result, nil
		}
	}

	balances, err := yangfenModel.TbYangfenBalanceModel.GetLeaderboard(topN)
	if err != nil {
		return nil, err
	}

	result := make([]LeaderboardItem, 0, len(balances))
	for i, balance := range balances {
		name := ""
		uidInt, parseErr := strconv.ParseInt(balance.Uid, 10, 64)
		if parseErr == nil {
			user, userErr := userModel.TbUserModel.GetByUid(uidInt)
			if userErr == nil && user != nil {
				name = user.Name
			}
		}

		result = append(result, LeaderboardItem{
			Rank:    i + 1,
			Uid:     balance.Uid,
			Name:    name,
			Balance: balance.Balance,
		})
	}

	jsonData, jsonErr := json.Marshal(result)
	if jsonErr == nil {
		webcache.RedisClient.Set(ctx, leaderboardCacheKey, string(jsonData), leaderboardCacheExpire)
	}

	return result, nil
}
