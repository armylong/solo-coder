package announcement

import (
	"context"
	"fmt"

	announcementModel "github.com/armylong/armylong-go/internal/model/announcement"
)

type announcementBusiness struct{}

var AnnouncementBusiness = &announcementBusiness{}

func (b *announcementBusiness) Create(ctx context.Context, title, content string, typ, priority int, publisherUid string) (int64, error) {
	if title == "" {
		return 0, fmt.Errorf("标题不能为空")
	}
	if content == "" {
		return 0, fmt.Errorf("内容不能为空")
	}
	if typ < 1 || typ > 3 {
		return 0, fmt.Errorf("类型参数错误")
	}
	if priority < 1 || priority > 3 {
		return 0, fmt.Errorf("优先级参数错误")
	}

	announcement := &announcementModel.TbAnnouncement{
		Title:        title,
		Content:      content,
		Type:         typ,
		Priority:     priority,
		Status:       0,
		PublisherUid: publisherUid,
	}

	return announcementModel.TbAnnouncementModel.Create(announcement)
}

func (b *announcementBusiness) Publish(ctx context.Context, id int64) error {
	announcement, err := announcementModel.TbAnnouncementModel.GetByID(id)
	if err != nil {
		return fmt.Errorf("公告不存在")
	}

	if announcement.Status == 1 {
		return fmt.Errorf("公告已发布")
	}
	if announcement.Status == 2 {
		return fmt.Errorf("已下架的公告不能重新发布")
	}

	return announcementModel.TbAnnouncementModel.UpdateStatus(id, 1)
}

func (b *announcementBusiness) Unpublish(ctx context.Context, id int64) error {
	announcement, err := announcementModel.TbAnnouncementModel.GetByID(id)
	if err != nil {
		return fmt.Errorf("公告不存在")
	}

	if announcement.Status != 1 {
		return fmt.Errorf("只有已发布的公告才能下架")
	}

	return announcementModel.TbAnnouncementModel.UpdateStatus(id, 2)
}

func (b *announcementBusiness) List(ctx context.Context, typ, status, page, pageSize int, uid string, isAdmin bool) ([]*announcementModel.TbAnnouncement, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	list, err := announcementModel.TbAnnouncementModel.ListByFilter(typ, status, page, pageSize, isAdmin)
	if err != nil {
		return nil, 0, err
	}

	total, err := announcementModel.TbAnnouncementModel.CountByFilter(typ, status, isAdmin)
	if err != nil {
		return nil, 0, err
	}

	return list, total, nil
}

func (b *announcementBusiness) Detail(ctx context.Context, id int64, uid string) (*announcementModel.TbAnnouncement, bool, error) {
	announcement, err := announcementModel.TbAnnouncementModel.GetByID(id)
	if err != nil {
		return nil, false, fmt.Errorf("公告不存在")
	}

	hasRead, _ := announcementModel.TbAnnouncementReadModel.HasRead(id, uid)

	if !hasRead {
		readRecord := &announcementModel.TbAnnouncementRead{
			AnnouncementId: id,
			Uid:            uid,
		}
		_ = announcementModel.TbAnnouncementReadModel.Create(readRecord)
		hasRead = true
	}

	return announcement, hasRead, nil
}

func (b *announcementBusiness) GetUnreadCount(ctx context.Context, uid string) (int, error) {
	return announcementModel.TbAnnouncementReadModel.CountUnread(uid)
}

func (b *announcementBusiness) MarkRead(ctx context.Context, id int64, uid string) error {
	readRecord := &announcementModel.TbAnnouncementRead{
		AnnouncementId: id,
		Uid:            uid,
	}
	return announcementModel.TbAnnouncementReadModel.Create(readRecord)
}

func (b *announcementBusiness) HasRead(ctx context.Context, id int64, uid string) (bool, error) {
	return announcementModel.TbAnnouncementReadModel.HasRead(id, uid)
}
