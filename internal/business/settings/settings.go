package settings

import (
	"github.com/armylong/armylong-go/internal/common/errcode"
	settingsCs "github.com/armylong/armylong-go/internal/cs/settings"
	desktopModel "github.com/armylong/armylong-go/internal/model/desktop"
	userModel "github.com/armylong/armylong-go/internal/model/user"
)

type settingsBusiness struct{}

var SettingsBusiness = &settingsBusiness{}

// 判断用户是否有权限访问指定权限等级的应用
func hasPermission(userPermission, appPermission int) bool {
	switch {
	case userPermission >= userModel.UserPermissionSuperAdmin:
		return true
	case userPermission >= userModel.UserPermissionAdmin:
		return appPermission == userModel.UserPermissionNormal || appPermission == userModel.UserPermissionAdmin
	default:
		return appPermission == userModel.UserPermissionNormal
	}
}

// 设置桌面应用位置
func (b *settingsBusiness) SetDesktopApp(req *settingsCs.SetDesktopAppRequest) error {
	if req.Uid <= 0 {
		return errcode.InvalidParam("用户ID不能为空")
	}
	if req.AppId <= 0 {
		return errcode.InvalidParam("应用ID不能为空")
	}
	if req.X < 0 || req.X > 100 || req.Y < 0 || req.Y > 100 {
		return errcode.InvalidParam("坐标必须在0-100之间")
	}

	app, err := desktopModel.TbAppModel.GetByAppId(req.AppId)
	if err != nil || app == nil {
		return errcode.NotFound("应用不存在")
	}

	userPermission := userModel.TbAdminUserModel.GetUserPermission(req.Uid)
	if !hasPermission(userPermission, app.Permission) {
		return errcode.PermissionDenied("没有权限访问该应用")
	}

	ext := &desktopModel.UserAppExt{
		Position: desktopModel.UserAppPositionDesktop,
		X:        req.X,
		Y:        req.Y,
	}

	err = desktopModel.TbUserAppModel.CreateOrUpdate(
		req.Uid,
		req.AppId,
		ext,
		desktopModel.UserAppStatusInstalled,
	)
	if err != nil {
		return errcode.Internal("保存应用位置失败", err)
	}

	return nil
}

// 设置Dock栏应用位置，自动处理索引偏移
func (b *settingsBusiness) SetDockApp(req *settingsCs.SetDockAppRequest) error {
	if req.Uid <= 0 {
		return errcode.InvalidParam("用户ID不能为空")
	}
	if req.AppId <= 0 {
		return errcode.InvalidParam("应用ID不能为空")
	}
	if req.DockIndex < 0 {
		return errcode.InvalidParam("Dock位置索引不能为负数")
	}

	app, err := desktopModel.TbAppModel.GetByAppId(req.AppId)
	if err != nil || app == nil {
		return errcode.NotFound("应用不存在")
	}

	userPermission := userModel.TbAdminUserModel.GetUserPermission(req.Uid)
	if !hasPermission(userPermission, app.Permission) {
		return errcode.PermissionDenied("没有权限访问该应用")
	}

	currentDockApps, err := desktopModel.TbUserAppModel.ListDockAppsByUid(req.Uid)
	if err != nil {
		return errcode.Internal("获取当前Dock栏应用失败", err)
	}

	var existingApp *desktopModel.TbUserApp
	for _, ua := range currentDockApps {
		if ua.AppId == req.AppId {
			existingApp = ua
			break
		}
	}

	if existingApp != nil {
		// 已在Dock栏，调整其他应用索引
		oldIndex := existingApp.Ext.DockIndex
		newIndex := req.DockIndex

		if oldIndex != newIndex {
			for _, ua := range currentDockApps {
				if ua.AppId == req.AppId {
					continue
				}

				if oldIndex < newIndex {
					if ua.Ext.DockIndex > oldIndex && ua.Ext.DockIndex <= newIndex {
						ua.Ext.DockIndex--
						_ = desktopModel.TbUserAppModel.Update(ua)
					}
				} else {
					if ua.Ext.DockIndex >= newIndex && ua.Ext.DockIndex < oldIndex {
						ua.Ext.DockIndex++
						_ = desktopModel.TbUserAppModel.Update(ua)
					}
				}
			}
		}
	} else {
		// 新加入Dock栏，后移已有应用
		for _, ua := range currentDockApps {
			if ua.Ext.DockIndex >= req.DockIndex {
				ua.Ext.DockIndex++
				_ = desktopModel.TbUserAppModel.Update(ua)
			}
		}
	}

	ext := &desktopModel.UserAppExt{
		Position:  desktopModel.UserAppPositionDock,
		DockIndex: req.DockIndex,
	}

	err = desktopModel.TbUserAppModel.CreateOrUpdate(
		req.Uid,
		req.AppId,
		ext,
		desktopModel.UserAppStatusInstalled,
	)
	if err != nil {
		return errcode.Internal("保存应用位置失败", err)
	}

	return nil
}

// 移除应用，Dock栏应用移除后自动补位
func (b *settingsBusiness) RemoveApp(req *settingsCs.RemoveAppRequest) error {
	if req.Uid <= 0 {
		return errcode.InvalidParam("用户ID不能为空")
	}
	if req.AppId <= 0 {
		return errcode.InvalidParam("应用ID不能为空")
	}

	userApp, err := desktopModel.TbUserAppModel.GetByUidAndAppId(req.Uid, req.AppId)
	if err != nil || userApp == nil {
		return nil
	}

	// Dock栏应用移除后，后面的应用前移补位
	if userApp.Ext != nil && userApp.Ext.Position == desktopModel.UserAppPositionDock {
		removedIndex := userApp.Ext.DockIndex
		dockApps, _ := desktopModel.TbUserAppModel.ListDockAppsByUid(req.Uid)
		for _, ua := range dockApps {
			if ua.AppId == req.AppId {
				continue
			}
			if ua.Ext.DockIndex > removedIndex {
				ua.Ext.DockIndex--
				_ = desktopModel.TbUserAppModel.Update(ua)
			}
		}
	}

	err = desktopModel.TbUserAppModel.Delete(req.Uid, req.AppId)
	if err != nil {
		return errcode.Internal("移除应用失败", err)
	}

	return nil
}
