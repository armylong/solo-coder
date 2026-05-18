package ppz

import (
	"context"

	ppzBiz "github.com/armylong/armylong-go/internal/business/ppz"
	ppzCs "github.com/armylong/armylong-go/internal/cs/ppz"
)

// PpzAdminController 后台管理
type PpzAdminController struct{}

// 概览统计
func (c *PpzAdminController) ActionOverviewStats(ctx context.Context, req *ppzCs.OverviewStatsRequest) (*ppzCs.OverviewStatsResponse, error) {
	return ppzBiz.PpzAdminBusiness.OverviewStats(ctx, req)
}

// 司机列表
func (c *PpzAdminController) ActionDriverList(ctx context.Context, req *ppzCs.DriverListRequest) (*ppzCs.DriverListResponse, error) {
	return ppzBiz.PpzAdminBusiness.DriverList(ctx, req)
}

// 封禁司机
func (c *PpzAdminController) ActionBanDriver(ctx context.Context, req *ppzCs.BanDriverRequest) (*ppzCs.BanDriverResponse, error) {
	return ppzBiz.PpzAdminBusiness.BanDriver(ctx, req)
}

// 解封司机
func (c *PpzAdminController) ActionUnbanDriver(ctx context.Context, req *ppzCs.UnbanDriverRequest) (*ppzCs.UnbanDriverResponse, error) {
	return ppzBiz.PpzAdminBusiness.UnbanDriver(ctx, req)
}

// 车辆详情
func (c *PpzAdminController) ActionGetCarDetail(ctx context.Context, req *ppzCs.GetCarDetailRequest) (*ppzCs.GetCarDetailResponse, error) {
	return ppzBiz.PpzAdminBusiness.GetCarDetail(ctx, req)
}

// 车辆审核统计
func (c *PpzAdminController) ActionCarAuditOverviewStats(ctx context.Context, req *ppzCs.CarAuditOverviewStatsRequest) (*ppzCs.CarAuditOverviewStatsResponse, error) {
	return ppzBiz.PpzAdminBusiness.CarAuditOverviewStats(ctx, req)
}

// 车辆审核列表（按司机聚合）
func (c *PpzAdminController) ActionCarAuditList(ctx context.Context, req *ppzCs.CarAuditListRequest) (*ppzCs.CarAuditListResponse, error) {
	return ppzBiz.PpzAdminBusiness.CarAuditList(ctx, req)
}

// 审核通过
func (c *PpzAdminController) ActionApproveCarAudit(ctx context.Context, req *ppzCs.ApproveCarAuditRequest) (*ppzCs.ApproveCarAuditResponse, error) {
	return ppzBiz.PpzAdminBusiness.ApproveCarAuditWithReason(ctx, req)
}

// 审核驳回
func (c *PpzAdminController) ActionRejectCarAudit(ctx context.Context, req *ppzCs.RejectCarAuditRequest) (*ppzCs.RejectCarAuditResponse, error) {
	return ppzBiz.PpzAdminBusiness.RejectCarAuditWithReason(ctx, req)
}
