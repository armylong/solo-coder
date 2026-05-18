package ppz

import (
	"context"

	ppzBs "github.com/armylong/armylong-go/internal/business/ppz"
	ppzCs "github.com/armylong/armylong-go/internal/cs/ppz"
	"github.com/armylong/armylong-go/internal/middlewares"
)

// PpzMapController 地址管理
type PpzMapController struct{}

// 上传/更新地址
func (c *PpzMapController) ActionUploadAddress(ctx context.Context, req *ppzCs.UploadAddressRequest) (*ppzCs.UploadAddressResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBs.PpzMapBusiness.UploadAddress(ctx, uid, req)
}

// 获取地址列表
func (c *PpzMapController) ActionAddressList(ctx context.Context, req *ppzCs.AddressListRequest) (*ppzCs.AddressListResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBs.PpzMapBusiness.GetAddressList(ctx, uid, req)
}

// 更新地址排序
func (c *PpzMapController) ActionUpdateAddressSort(ctx context.Context, req *ppzCs.UpdateAddressSortRequest) (*ppzCs.UpdateAddressSortResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBs.PpzMapBusiness.UpdateAddressSort(ctx, uid, req)
}

// 删除地址
func (c *PpzMapController) ActionDeleteAddress(ctx context.Context, req *ppzCs.DeleteAddressRequest) (*ppzCs.DeleteAddressResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBs.PpzMapBusiness.DeleteAddress(ctx, uid, req)
}

// 获取地址详情
func (c *PpzMapController) ActionGetAddressDetail(ctx context.Context, req *ppzCs.GetAddressDetailRequest) (*ppzCs.GetAddressDetailResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	return ppzBs.PpzMapBusiness.GetAddressDetail(ctx, uid, req)
}
