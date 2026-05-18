package long_store

import (
	"context"

	longStoreBiz "github.com/armylong/armylong-go/internal/business/long_store"
	"github.com/armylong/armylong-go/internal/middlewares"
	longStoreCs "github.com/armylong/armylong-go/internal/cs/long_store"
)

// LongStoreController 应用商店
type LongStoreController struct{}

// 获取应用列表
func (c *LongStoreController) ActionList(ctx context.Context, req *longStoreCs.AppListRequest) (*longStoreCs.AppListResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	if uid == 0 {
		return nil, nil
	}
	return longStoreBiz.LongStoreBusiness.GetAppList(uid)
}

// 安装应用
func (c *LongStoreController) ActionInstall(ctx context.Context, req *longStoreCs.InstallAppRequest) error {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	if uid == 0 {
		return nil
	}
	req.Uid = uid
	return longStoreBiz.LongStoreBusiness.InstallApp(req)
}

// 卸载应用
func (c *LongStoreController) ActionUninstall(ctx context.Context, req *longStoreCs.UninstallAppRequest) error {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	if uid == 0 {
		return nil
	}
	req.Uid = uid
	return longStoreBiz.LongStoreBusiness.UninstallApp(req)
}

// 添加应用（超管）
func (c *LongStoreController) ActionAdd(ctx context.Context, req *longStoreCs.AddAppRequest) error {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	if uid == 0 {
		return nil
	}
	req.Uid = uid
	return longStoreBiz.LongStoreBusiness.AddApp(req)
}

// 更新应用（超管）
func (c *LongStoreController) ActionUpdate(ctx context.Context, req *longStoreCs.UpdateAppRequest) error {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	if uid == 0 {
		return nil
	}
	req.Uid = uid
	return longStoreBiz.LongStoreBusiness.UpdateApp(req)
}

// 删除应用（超管）
func (c *LongStoreController) ActionDelete(ctx context.Context, req *longStoreCs.DeleteAppRequest) error {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	if uid == 0 {
		return nil
	}
	req.Uid = uid
	return longStoreBiz.LongStoreBusiness.DeleteApp(req)
}

// 获取已安装应用（桌面+Dock）
func (c *LongStoreController) ActionInstalled(ctx context.Context, req *longStoreCs.AppListRequest) (*longStoreCs.DesktopAppsResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	if uid == 0 {
		return nil, nil
	}
	return longStoreBiz.LongStoreBusiness.GetUserInstalledApps(uid)
}

// 获取静态项目路径列表
func (c *LongStoreController) ActionStaticPaths(ctx context.Context, req *longStoreCs.StaticPathsRequest) (*longStoreCs.StaticPathsResponse, error) {
	uid := middlewares.GetLoginUIDFromContext(ctx)
	if uid == 0 {
		return nil, nil
	}
	return longStoreBiz.LongStoreBusiness.GetStaticPaths()
}
