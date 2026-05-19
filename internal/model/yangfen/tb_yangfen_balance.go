package yangfen

import (
	"time"

	"github.com/armylong/go-library/service/sqlite"
)

// 氧分余额
type TbYangfenBalance struct {
	ID         int64     `json:"id" db:"pk"`  // 主键ID
	Uid        string    `json:"uid"`         // 用户ID
	Balance    int       `json:"balance"`     // 余额
	ExpireTime int64     `json:"expire_time"` // 过期时间(Unix时间戳)
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type tbYangfenBalanceModel struct{}

var TbYangfenBalanceModel = &tbYangfenBalanceModel{}

func init() {
	_ = TbYangfenBalanceModel.CreateTable()
}

func (m *tbYangfenBalanceModel) TableName() string {
	return "tb_yangfen_balance"
}

// 建表
func (m *tbYangfenBalanceModel) CreateTable() error {
	sql := `
	CREATE TABLE IF NOT EXISTS tb_yangfen_balance (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uid TEXT NOT NULL UNIQUE,
		balance INTEGER DEFAULT 0,
		expire_time INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)
	`
	_, err := sqlite.DB.DB().Exec(sql)
	if err != nil {
		return err
	}
	return sqlite.DB.AutoMigrate(m.TableName(), &TbYangfenBalance{})
}

// 按用户查余额
func (m *tbYangfenBalanceModel) GetByUid(uid string) (*TbYangfenBalance, error) {
	row := &TbYangfenBalance{}
	err := sqlite.DB.DB().QueryRow("SELECT id, uid, balance, expire_time, created_at, updated_at FROM tb_yangfen_balance WHERE uid = ?", uid).Scan(
		&row.ID, &row.Uid, &row.Balance, &row.ExpireTime, &row.CreatedAt, &row.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return row, nil
}

// 创建或更新余额（按uid upsert）
func (m *tbYangfenBalanceModel) CreateOrUpdate(uid string, balance int, expireTime int64) error {
	// 先尝试更新
	sql := `UPDATE tb_yangfen_balance SET balance = ?, expire_time = ?, updated_at = CURRENT_TIMESTAMP WHERE uid = ?`
	result, err := sqlite.DB.DB().Exec(sql, balance, expireTime, uid)
	if err != nil {
		return err
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		return nil
	}
	
	// 更新失败则插入
	sql = `INSERT INTO tb_yangfen_balance (uid, balance, expire_time, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	_, err = sqlite.DB.DB().Exec(sql, uid, balance, expireTime)
	return err
}

// 更新余额
func (m *tbYangfenBalanceModel) UpdateBalance(uid string, balance int) error {
	sql := `UPDATE tb_yangfen_balance SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE uid = ?`
	_, err := sqlite.DB.DB().Exec(sql, balance, uid)
	return err
}

// 删除
func (m *tbYangfenBalanceModel) Delete(uid string) error {
	return sqlite.DB.DeleteByWhere(m.TableName(), "uid = ?", uid)
}
