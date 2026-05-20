package announcement

import (
	"errors"
	"fmt"

	announcementBusiness "github.com/armylong/armylong-go/internal/business/announcement"
	"github.com/armylong/armylong-go/internal/cs/announcement"
	"github.com/armylong/armylong-go/internal/middlewares"
	announcementModel "github.com/armylong/armylong-go/internal/model/announcement"
	"github.com/armylong/armylong-go/internal/model/user"
	"github.com/gin-gonic/gin"
)

type AnnouncementController struct{}

func getUid(ctx *gin.Context) (string, error) {
	uid := middlewares.GetLoginUID(ctx)
	if uid == 0 {
		return "", errors.New("请先登录")
	}
	return fmt.Sprintf("%d", uid), nil
}

func (c *AnnouncementController) ActionList(ctx *gin.Context, req *announcement.ListAnnouncementRequest) (*announcement.ListAnnouncementResponse, error) {
	uid, err := getUid(ctx)
	if err != nil {
		return nil, err
	}

	userInfo := middlewares.GetLoginUser(ctx)
	isAdmin := userInfo != nil && userInfo.UserPermission >= user.UserPermissionAdmin

	list, total, err := announcementBusiness.AnnouncementBusiness.List(ctx, req.Type, req.Status, req.Page, req.PageSize, uid, isAdmin)
	if err != nil {
		return nil, err
	}

	result := make([]announcement.AnnouncementResponse, 0, len(list))
	for _, item := range list {
		hasRead, _ := announcementBusiness.AnnouncementBusiness.HasRead(ctx, item.ID, uid)
		result = append(result, convertToResponse(item, hasRead))
	}

	return &announcement.ListAnnouncementResponse{
		List:  result,
		Total: total,
	}, nil
}

type AnnouncementAdminController struct{}

func (c *AnnouncementAdminController) getUid(ctx *gin.Context) (string, error) {
	return getUid(ctx)
}

func (c *AnnouncementAdminController) ActionCreate(ctx *gin.Context, req *announcement.CreateAnnouncementRequest) (map[string]int64, error) {
	uid, err := c.getUid(ctx)
	if err != nil {
		return nil, err
	}

	id, err := announcementBusiness.AnnouncementBusiness.Create(ctx, req.Title, req.Content, req.Type, req.Priority, uid)
	if err != nil {
		return nil, err
	}

	return map[string]int64{"id": id}, nil
}

func (c *AnnouncementAdminController) ActionPublish(ctx *gin.Context, req *announcement.PublishAnnouncementRequest) (map[string]string, error) {
	err := announcementBusiness.AnnouncementBusiness.Publish(ctx, req.Id)
	if err != nil {
		return nil, err
	}

	return map[string]string{"message": "发布成功"}, nil
}

func (c *AnnouncementAdminController) ActionUnpublish(ctx *gin.Context, req *announcement.UnpublishAnnouncementRequest) (map[string]string, error) {
	err := announcementBusiness.AnnouncementBusiness.Unpublish(ctx, req.Id)
	if err != nil {
		return nil, err
	}

	return map[string]string{"message": "下架成功"}, nil
}

func (c *AnnouncementController) ActionDetail(ctx *gin.Context, req *announcement.DetailAnnouncementRequest) (*announcement.AnnouncementResponse, error) {
	uid, err := getUid(ctx)
	if err != nil {
		return nil, err
	}

	announcement, hasRead, err := announcementBusiness.AnnouncementBusiness.Detail(ctx, req.Id, uid)
	if err != nil {
		return nil, err
	}

	response := convertToResponse(announcement, hasRead)
	return &response, nil
}

func (c *AnnouncementController) ActionUnreadCount(ctx *gin.Context, req *struct{}) (*announcement.UnreadCountResponse, error) {
	uid, err := getUid(ctx)
	if err != nil {
		return nil, err
	}

	count, err := announcementBusiness.AnnouncementBusiness.GetUnreadCount(ctx, uid)
	if err != nil {
		return nil, err
	}

	return &announcement.UnreadCountResponse{Count: count}, nil
}

func (c *AnnouncementController) ActionMarkRead(ctx *gin.Context, req *announcement.MarkReadRequest) (map[string]string, error) {
	uid, err := getUid(ctx)
	if err != nil {
		return nil, err
	}

	err = announcementBusiness.AnnouncementBusiness.MarkRead(ctx, req.Id, uid)
	if err != nil {
		return nil, err
	}

	return map[string]string{"message": "标记成功"}, nil
}

func convertToResponse(a *announcementModel.TbAnnouncement, hasRead bool) announcement.AnnouncementResponse {
	return announcement.AnnouncementResponse{
		Id:           a.ID,
		Title:        a.Title,
		Content:      a.Content,
		Type:         a.Type,
		Priority:     a.Priority,
		Status:       a.Status,
		PublisherUid: a.PublisherUid,
		HasRead:      hasRead,
		CreatedAt:    a.CreatedAt.Unix(),
		UpdatedAt:    a.UpdatedAt.Unix(),
	}
}
