package ppz

import (
	"context"

	ppzBiz "github.com/armylong/armylong-go/internal/business/ppz"
	"github.com/armylong/armylong-go/internal/middlewares"
	ppzCs "github.com/armylong/armylong-go/internal/cs/ppz"
)

// PpzController 拼拼坐用户端
type PpzController struct{}

// 获取用户信息
func (c *PpzController) ActionGetPpzUserInfo(ctx context.Context, req *ppzCs.GetPpzUserInfoRequest) (*ppzCs.GetPpzUserInfoResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.GetPpzUserInfo(ctx, uid)
}

// 添加车辆
func (c *PpzController) ActionAddMyCar(ctx context.Context, req *ppzCs.AddMyCarRequest) (*ppzCs.AddMyCarResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.AddMyCar(ctx, uid, req)
}

// 获取我的车辆列表
func (c *PpzController) ActionGetMyCars(ctx context.Context, req *ppzCs.GetMyCarsRequest) (*ppzCs.GetMyCarsResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.GetMyCars(ctx, uid, req)
}

// 删除车辆
func (c *PpzController) ActionDeleteMyCar(ctx context.Context, req *ppzCs.DeleteMyCarRequest) (*ppzCs.DeleteMyCarResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.DeleteMyCar(ctx, uid, req)
}

// 编辑车辆
func (c *PpzController) ActionEditMyCar(ctx context.Context, req *ppzCs.EditMyCarRequest) (*ppzCs.EditMyCarResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.EditMyCar(ctx, uid, req)
}

// 获取车辆详情
func (c *PpzController) ActionGetMyCarDetail(ctx context.Context, req *ppzCs.GetCarDetailRequest) (*ppzCs.GetCarDetailResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.GetMyCarDetail(ctx, uid, req)
}

// 检查是否认证司机
func (c *PpzController) ActionCheckDriver(ctx context.Context, req *struct{}) (*ppzCs.CheckDriverResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.CheckDriver(ctx, uid)
}

// 获取地址选择器数据
func (c *PpzController) ActionGetAddressPickerData(ctx context.Context, req *ppzCs.AddressPickerDataRequest) (*ppzCs.AddressPickerDataResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.GetAddressPickerData(ctx, uid)
}

// 创建订单
func (c *PpzController) ActionCreateOrder(ctx context.Context, req *ppzCs.CreateOrderRequest) (*ppzCs.CreateOrderResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.CreateOrder(ctx, uid, req)
}

// 取消订单
func (c *PpzController) ActionCancelOrder(ctx context.Context, req *ppzCs.CancelOrderRequest) (*ppzCs.CancelOrderResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.CancelOrder(ctx, uid, req)
}

// 获取匹配中的订单列表
func (c *PpzController) ActionGetMatchingOrders(ctx context.Context, req *ppzCs.GetMatchingOrdersRequest) (*ppzCs.GetMatchingOrdersResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.GetMatchingOrders(ctx, uid)
}

// 获取我的行程列表
func (c *PpzController) ActionGetMyTrips(ctx context.Context, req *ppzCs.GetMyTripsRequest) (*ppzCs.GetMyTripsResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBiz.PpzBusiness.GetMyTrips(ctx, uid)
}
