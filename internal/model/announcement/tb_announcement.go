package announcement

import (
	"time"

	"github.com/armylong/go-library/service/sqlite"
)

type TbAnnouncement struct {
	ID           int64     `json:"id" db:"pk"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	Type         int       `json:"type"`
	Priority     int       `json:"priority"`
	Status       int       `json:"status"`
	PublisherUid string    `json:"publisher_uid"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type tbAnnouncementModel struct{}

var TbAnnouncementModel = &tbAnnouncementModel{}

func init() {
	_ = TbAnnouncementModel.CreateTable()
}

func (m *tbAnnouncementModel) TableName() string {
	return "tb_announcement"
}

func (m *tbAnnouncementModel) CreateTable() error {
	sql := `
	CREATE TABLE IF NOT EXISTS tb_announcement (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		type INTEGER NOT NULL DEFAULT 1,
		priority INTEGER NOT NULL DEFAULT 1,
		status INTEGER NOT NULL DEFAULT 0,
		publisher_uid TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)
	`
	_, err := sqlite.DB.DB().Exec(sql)
	if err != nil {
		return err
	}
	return sqlite.DB.AutoMigrate(m.TableName(), &TbAnnouncement{})
}

func (m *tbAnnouncementModel) Create(announcement *TbAnnouncement) (int64, error) {
	return sqlite.DB.Insert(m.TableName(), announcement)
}

func (m *tbAnnouncementModel) GetByID(id int64) (*TbAnnouncement, error) {
	var row TbAnnouncement
	err := sqlite.DB.FindOne(m.TableName(), &row, "id = ?", id)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (m *tbAnnouncementModel) UpdateStatus(id int64, status int) error {
	sql := `UPDATE tb_announcement SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := sqlite.DB.DB().Exec(sql, status, id)
	return err
}

func (m *tbAnnouncementModel) ListByFilter(typ int, status *int, page, pageSize int, isAdmin bool) ([]*TbAnnouncement, error) {
	offset := (page - 1) * pageSize
	whereClauses := make([]string, 0)
	args := make([]interface{}, 0)

	if typ > 0 {
		whereClauses = append(whereClauses, "type = ?")
		args = append(args, typ)
	}

	if isAdmin {
		if status != nil {
			whereClauses = append(whereClauses, "status = ?")
			args = append(args, *status)
		}
	} else {
		whereClauses = append(whereClauses, "status = 1")
	}

	where := ""
	if len(whereClauses) > 0 {
		where = "WHERE " + whereClauses[0]
		for i := 1; i < len(whereClauses); i++ {
			where += " AND " + whereClauses[i]
		}
	}

	orderBy := "ORDER BY priority DESC, created_at DESC"
	limit := "LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)

	sql := `SELECT * FROM tb_announcement ` + where + ` ` + orderBy + ` ` + limit

	rows, err := sqlite.DB.DB().Query(sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*TbAnnouncement
	for rows.Next() {
		row := &TbAnnouncement{}
		err := rows.Scan(&row.ID, &row.Title, &row.Content, &row.Type, &row.Priority, &row.Status, &row.PublisherUid, &row.CreatedAt, &row.UpdatedAt)
		if err != nil {
			return nil, err
		}
		result = append(result, row)
	}

	return result, nil
}

func (m *tbAnnouncementModel) CountByFilter(typ int, status *int, isAdmin bool) (int, error) {
	whereClauses := make([]string, 0)
	args := make([]interface{}, 0)

	if typ > 0 {
		whereClauses = append(whereClauses, "type = ?")
		args = append(args, typ)
	}

	if isAdmin {
		if status != nil {
			whereClauses = append(whereClauses, "status = ?")
			args = append(args, *status)
		}
	} else {
		whereClauses = append(whereClauses, "status = 1")
	}

	where := ""
	if len(whereClauses) > 0 {
		where = "WHERE " + whereClauses[0]
		for i := 1; i < len(whereClauses); i++ {
			where += " AND " + whereClauses[i]
		}
	}

	sql := `SELECT COUNT(*) FROM tb_announcement ` + where

	var count int
	err := sqlite.DB.DB().QueryRow(sql, args...).Scan(&count)
	return count, err
}
