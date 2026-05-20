package announcement

import (
	"time"

	"github.com/armylong/go-library/service/sqlite"
)

type TbAnnouncementRead struct {
	ID             int64     `json:"id" db:"pk"`
	AnnouncementId int64     `json:"announcement_id"`
	Uid            string    `json:"uid"`
	ReadAt         time.Time `json:"read_at"`
}

type tbAnnouncementReadModel struct{}

var TbAnnouncementReadModel = &tbAnnouncementReadModel{}

func init() {
	_ = TbAnnouncementReadModel.CreateTable()
}

func (m *tbAnnouncementReadModel) TableName() string {
	return "tb_announcement_read"
}

func (m *tbAnnouncementReadModel) CreateTable() error {
	sql := `
	CREATE TABLE IF NOT EXISTS tb_announcement_read (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		announcement_id INTEGER NOT NULL,
		uid TEXT NOT NULL,
		read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(announcement_id, uid)
	)
	`
	_, err := sqlite.DB.DB().Exec(sql)
	if err != nil {
		return err
	}
	return sqlite.DB.AutoMigrate(m.TableName(), &TbAnnouncementRead{})
}

func (m *tbAnnouncementReadModel) Create(read *TbAnnouncementRead) error {
	sql := `INSERT OR IGNORE INTO tb_announcement_read (announcement_id, uid, read_at) VALUES (?, ?, ?)`
	_, err := sqlite.DB.DB().Exec(sql, read.AnnouncementId, read.Uid, time.Now())
	return err
}

func (m *tbAnnouncementReadModel) HasRead(announcementId int64, uid string) (bool, error) {
	sql := `SELECT COUNT(*) FROM tb_announcement_read WHERE announcement_id = ? AND uid = ?`
	var count int
	err := sqlite.DB.DB().QueryRow(sql, announcementId, uid).Scan(&count)
	return count > 0, err
}

func (m *tbAnnouncementReadModel) CountUnread(uid string) (int, error) {
	sql := `
	SELECT COUNT(*) FROM tb_announcement a
	WHERE a.status = 1
	AND NOT EXISTS (
		SELECT 1 FROM tb_announcement_read r
		WHERE r.announcement_id = a.id AND r.uid = ?
	)
	`
	var count int
	err := sqlite.DB.DB().QueryRow(sql, uid).Scan(&count)
	return count, err
}
