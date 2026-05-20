package announcement

type CreateAnnouncementRequest struct {
	Title    string `json:"title" form:"title"`
	Content  string `json:"content" form:"content"`
	Type     int    `json:"type" form:"type"`
	Priority int    `json:"priority" form:"priority"`
}

type PublishAnnouncementRequest struct {
	Id int64 `json:"id" form:"id"`
}

type UnpublishAnnouncementRequest struct {
	Id int64 `json:"id" form:"id"`
}

type ListAnnouncementRequest struct {
	Type     int  `json:"type" form:"type"`
	Status   *int `json:"status" form:"status"`
	Page     int  `json:"page" form:"page"`
	PageSize int  `json:"pageSize" form:"pageSize"`
}

type DetailAnnouncementRequest struct {
	Id int64 `json:"id" form:"id"`
}

type MarkReadRequest struct {
	Id int64 `json:"id" form:"id"`
}

type AnnouncementResponse struct {
	Id           int64  `json:"id"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	Type         int    `json:"type"`
	Priority     int    `json:"priority"`
	Status       int    `json:"status"`
	PublisherUid string `json:"publisher_uid"`
	HasRead      bool   `json:"has_read"`
	CreatedAt    int64  `json:"created_at"`
	UpdatedAt    int64  `json:"updated_at"`
}

type ListAnnouncementResponse struct {
	List  []AnnouncementResponse `json:"list"`
	Total int                    `json:"total"`
}

type UnreadCountResponse struct {
	Count int `json:"count"`
}
