package ppz

import (
	"context"

	ppzBiz "github.com/armylong/armylong-go/internal/business/ppz"
	ppzCs "github.com/armylong/armylong-go/internal/cs/ppz"
)

// BusinessRouteController 运营路线管理
type BusinessRouteController struct{}

// 路线列表
func (c *BusinessRouteController) ActionList(ctx context.Context, req *ppzCs.BusinessRouteListRequest) (*ppzCs.BusinessRouteListResponse, error) {
	return ppzBiz.BusinessRouteBusiness.List(ctx, req)
}

// 创建路线
func (c *BusinessRouteController) ActionCreate(ctx context.Context, req *ppzCs.BusinessRouteCreateRequest) (*ppzCs.BusinessRouteCreateResponse, error) {
	return ppzBiz.BusinessRouteBusiness.Create(ctx, req)
}

// 更新路线
func (c *BusinessRouteController) ActionUpdate(ctx context.Context, req *ppzCs.BusinessRouteUpdateRequest) (*ppzCs.BusinessRouteUpdateResponse, error) {
	return ppzBiz.BusinessRouteBusiness.Update(ctx, req)
}

// 路线详情
func (c *BusinessRouteController) ActionGet(ctx context.Context, req *ppzCs.BusinessRouteGetRequest) (*ppzCs.BusinessRouteGetResponse, error) {
	return ppzBiz.BusinessRouteBusiness.Get(ctx, req)
}

// 停用路线
func (c *BusinessRouteController) ActionDisable(ctx context.Context, req *ppzCs.BusinessRouteDisableRequest) (*ppzCs.BusinessRouteDisableResponse, error) {
	return ppzBiz.BusinessRouteBusiness.Disable(ctx, req)
}

// 启用路线
func (c *BusinessRouteController) ActionEnable(ctx context.Context, req *ppzCs.BusinessRouteEnableRequest) (*ppzCs.BusinessRouteEnableResponse, error) {
	return ppzBiz.BusinessRouteBusiness.Enable(ctx, req)
}

// 删除路线
func (c *BusinessRouteController) ActionDelete(ctx context.Context, req *ppzCs.BusinessRouteDeleteRequest) (*ppzCs.BusinessRouteDeleteResponse, error) {
	return ppzBiz.BusinessRouteBusiness.Delete(ctx, req)
}

// BusinessAreaControllerExt 运营区域扩展接口
type BusinessAreaControllerExt struct{}

// 获取启用的区域列表
func (c *BusinessAreaControllerExt) ActionListActive(ctx context.Context, req *ppzCs.BusinessAreaListActiveRequest) (*ppzCs.BusinessAreaListActiveResponse, error) {
	return ppzBiz.BusinessAreaBusiness.ListActive(ctx)
}
