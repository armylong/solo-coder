package ppz

import (
	"context"

	ppzBiz "github.com/armylong/armylong-go/internal/business/ppz"
	ppzCs "github.com/armylong/armylong-go/internal/cs/ppz"
)

// BusinessAreaController 运营区域管理
type BusinessAreaController struct{}

// 区域列表
func (c *BusinessAreaController) ActionList(ctx context.Context, req *ppzCs.BusinessAreaListRequest) (*ppzCs.BusinessAreaListResponse, error) {
	return ppzBiz.BusinessAreaBusiness.List(ctx, req)
}

// 创建区域
func (c *BusinessAreaController) ActionCreate(ctx context.Context, req *ppzCs.BusinessAreaCreateRequest) (*ppzCs.BusinessAreaCreateResponse, error) {
	return ppzBiz.BusinessAreaBusiness.Create(ctx, req)
}

// 更新区域
func (c *BusinessAreaController) ActionUpdate(ctx context.Context, req *ppzCs.BusinessAreaUpdateRequest) (*ppzCs.BusinessAreaUpdateResponse, error) {
	return ppzBiz.BusinessAreaBusiness.Update(ctx, req)
}

// 区域详情
func (c *BusinessAreaController) ActionGet(ctx context.Context, req *ppzCs.BusinessAreaGetRequest) (*ppzCs.BusinessAreaGetResponse, error) {
	return ppzBiz.BusinessAreaBusiness.Get(ctx, req)
}

// 停用区域
func (c *BusinessAreaController) ActionDisable(ctx context.Context, req *ppzCs.BusinessAreaDisableRequest) (*ppzCs.BusinessAreaDisableResponse, error) {
	return ppzBiz.BusinessAreaBusiness.Disable(ctx, req)
}

// 启用区域
func (c *BusinessAreaController) ActionEnable(ctx context.Context, req *ppzCs.BusinessAreaEnableRequest) (*ppzCs.BusinessAreaEnableResponse, error) {
	return ppzBiz.BusinessAreaBusiness.Enable(ctx, req)
}

// 删除区域
func (c *BusinessAreaController) ActionDelete(ctx context.Context, req *ppzCs.BusinessAreaDeleteRequest) (*ppzCs.BusinessAreaDeleteResponse, error) {
	return ppzBiz.BusinessAreaBusiness.Delete(ctx, req)
}
