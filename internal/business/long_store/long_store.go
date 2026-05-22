package long_store

import (
	"os"

	"github.com/armylong/armylong-go/internal/common/errcode"
	longStoreCs "github.com/armylong/armylong-go/internal/cs/long_store"
	desktopModel "github.com/armylong/armylong-go/internal/model/desktop"
	userModel "github.com/armylong/armylong-go/internal/model/user"
	"gopkg.in/yaml.v3"
)

type longStoreBusiness struct{}

var LongStoreBusiness = &longStoreBusiness{}

// 检查用户权限是否满足应用权限要求
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

// 是否超管
func isSuperAdmin(uid int64) bool {
	return userModel.TbAdminUserModel.GetUserPermission(uid) >= userModel.UserPermissionSuperAdmin
}

// 获取应用商店列表
func (b *longStoreBusiness) GetAppList(uid int64) (*longStoreCs.AppListResponse, error) {
	if uid <= 0 {
		return nil, errcode.Unauthorized("用户ID不能为空")
	}

	userPermission := userModel.TbAdminUserModel.GetUserPermission(uid)

	apps, err := desktopModel.TbAppModel.ListForLongStore(userPermission)
	if err != nil {
		return nil, errcode.Internal("获取应用列表失败", err)
	}

	userApps, err := desktopModel.TbUserAppModel.ListByUid(uid)
	if err != nil {
		userApps = []*desktopModel.TbUserApp{}
	}

	userAppMap := make(map[int64]*desktopModel.TbUserApp)
	for _, ua := range userApps {
		if ua.Status == desktopModel.UserAppStatusInstalled {
			userAppMap[ua.AppId] = ua
		}
	}

	var applications, games []*longStoreCs.AppListItem
	for _, app := range apps {
		_, isInstalled := userAppMap[app.AppId]
		item := &longStoreCs.AppListItem{
			AppId:       app.AppId,
			AppName:     app.AppName,
			Desc:        app.Desc,
			Icon:        app.Icon,
			Url:         app.Url,
			Type:        app.Type,
			Permission:  app.Permission,
			IsInstalled: isInstalled,
		}

		if app.Type == desktopModel.AppTypeApplication {
			applications = append(applications, item)
		} else if app.Type == desktopModel.AppTypeGame {
			games = append(games, item)
		}
	}

	return &longStoreCs.AppListResponse{
		Applications: applications,
		Games:        games,
	}, nil
}

// 安装应用到桌面
func (b *longStoreBusiness) InstallApp(req *longStoreCs.InstallAppRequest) error {
	if req.Uid <= 0 {
		return errcode.Unauthorized("用户ID不能为空")
	}
	if req.AppId <= 0 {
		return errcode.InvalidParam("应用ID不能为空")
	}

	app, err := desktopModel.TbAppModel.GetByAppId(req.AppId)
	if err != nil || app == nil {
		return errcode.NotFound("应用不存在")
	}

	userPermission := userModel.TbAdminUserModel.GetUserPermission(req.Uid)
	if !hasPermission(userPermission, app.Permission) {
		return errcode.PermissionDenied("没有权限安装该应用")
	}

	if desktopModel.TbAppModel.IsLongStoreApp(app.AppName, app.Url) {
		return errcode.PermissionDenied("不能安装应用商店本身")
	}

	existing, err := desktopModel.TbUserAppModel.GetByUidAndAppId(req.Uid, req.AppId)
	if err == nil && existing != nil && existing.Status == desktopModel.UserAppStatusInstalled {
		return nil
	}

	x, y := desktopModel.TbUserAppModel.FindNextAvailablePosition(req.Uid)

	ext := &desktopModel.UserAppExt{
		Position: desktopModel.UserAppPositionDesktop,
		X:        x,
		Y:        y,
	}

	err = desktopModel.TbUserAppModel.CreateOrUpdate(
		req.Uid,
		req.AppId,
		ext,
		desktopModel.UserAppStatusInstalled,
	)
	if err != nil {
		return errcode.Internal("安装应用失败", err)
	}

	return nil
}

// 从桌面卸载应用
func (b *longStoreBusiness) UninstallApp(req *longStoreCs.UninstallAppRequest) error {
	if req.Uid <= 0 {
		return errcode.Unauthorized("用户ID不能为空")
	}
	if req.AppId <= 0 {
		return errcode.InvalidParam("应用ID不能为空")
	}

	app, err := desktopModel.TbAppModel.GetByAppId(req.AppId)
	if err != nil || app == nil {
		return errcode.NotFound("应用不存在")
	}

	if desktopModel.TbAppModel.IsLongStoreApp(app.AppName, app.Url) {
		return errcode.PermissionDenied("不能卸载应用商店")
	}

	userApp, err := desktopModel.TbUserAppModel.GetByUidAndAppId(req.Uid, req.AppId)
	if err != nil || userApp == nil {
		return nil
	}

	// 从Dock移除时，后面的应用前移补位
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
		return errcode.Internal("卸载应用失败", err)
	}

	return nil
}

// 添加新应用（超管）
func (b *longStoreBusiness) AddApp(req *longStoreCs.AddAppRequest) error {
	if req.Uid <= 0 {
		return errcode.Unauthorized("用户ID不能为空")
	}
	if req.AppName == "" {
		return errcode.InvalidParam("应用名称不能为空")
	}
	if req.Url == "" {
		return errcode.InvalidParam("应用URL不能为空")
	}

	if !isSuperAdmin(req.Uid) {
		return errcode.PermissionDenied("只有超级管理员可以添加应用")
	}

	if desktopModel.TbAppModel.IsLongStoreApp(req.AppName, req.Url) {
		return errcode.PermissionDenied("不能添加应用商店本身")
	}

	existing, _ := desktopModel.TbAppModel.GetByAppName(req.AppName)
	if existing != nil {
		return errcode.AlreadyExists("应用名称已存在")
	}

	icon := req.Icon
	if icon == "" {
		icon = "📱"
	}

	app := &desktopModel.TbApp{
		AppName:    req.AppName,
		Desc:       req.Desc,
		Icon:       icon,
		Url:        req.Url,
		Type:       req.Type,
		Permission: req.Permission,
		Status:     1,
	}

	if app.Type == 0 {
		app.Type = desktopModel.AppTypeApplication
	}

	_, err := desktopModel.TbAppModel.Create(app)
	if err != nil {
		return errcode.Internal("添加应用失败", err)
	}

	return nil
}

// 更新应用（超管）
func (b *longStoreBusiness) UpdateApp(req *longStoreCs.UpdateAppRequest) error {
	if req.Uid <= 0 {
		return errcode.Unauthorized("用户ID不能为空")
	}
	if req.AppId <= 0 {
		return errcode.InvalidParam("应用ID不能为空")
	}

	if !isSuperAdmin(req.Uid) {
		return errcode.PermissionDenied("只有超级管理员可以更新应用")
	}

	existing, err := desktopModel.TbAppModel.GetByAppId(req.AppId)
	if err != nil || existing == nil {
		return errcode.NotFound("应用不存在")
	}

	if desktopModel.TbAppModel.IsLongStoreApp(existing.AppName, existing.Url) {
		return errcode.PermissionDenied("不能修改应用商店")
	}

	if req.AppName != "" && req.AppName != existing.AppName {
		nameExists, _ := desktopModel.TbAppModel.GetByAppName(req.AppName)
		if nameExists != nil {
			return errcode.AlreadyExists("应用名称已存在")
		}
		existing.AppName = req.AppName
	}

	if req.Desc != "" {
		existing.Desc = req.Desc
	}
	if req.Icon != "" {
		existing.Icon = req.Icon
	}
	if req.Url != "" {
		existing.Url = req.Url
	}
	if req.Type != 0 {
		existing.Type = req.Type
	}
	if req.Permission != existing.Permission {
		existing.Permission = req.Permission
	}

	err = desktopModel.TbAppModel.Update(existing)
	if err != nil {
		return errcode.Internal("更新应用失败", err)
	}

	return nil
}

// 删除应用（超管）
func (b *longStoreBusiness) DeleteApp(req *longStoreCs.DeleteAppRequest) error {
	if req.Uid <= 0 {
		return errcode.Unauthorized("用户ID不能为空")
	}
	if req.AppId <= 0 {
		return errcode.InvalidParam("应用ID不能为空")
	}

	if !isSuperAdmin(req.Uid) {
		return errcode.PermissionDenied("只有超级管理员可以删除应用")
	}

	app, err := desktopModel.TbAppModel.GetByAppId(req.AppId)
	if err != nil || app == nil {
		return errcode.NotFound("应用不存在")
	}

	if desktopModel.TbAppModel.IsLongStoreApp(app.AppName, app.Url) {
		return errcode.PermissionDenied("不能删除应用商店")
	}

	err = desktopModel.TbAppModel.Delete(req.AppId)
	if err != nil {
		return errcode.Internal("删除应用失败", err)
	}

	return nil
}

// 初始化新用户桌面（只装应用商店）
func (b *longStoreBusiness) InitUserDesktopApps(uid int64) error {
	if uid <= 0 {
		return errcode.Unauthorized("用户ID不能为空")
	}

	longStoreApp, err := desktopModel.TbAppModel.GetByAppName(desktopModel.LongStoreAppName)
	if err != nil || longStoreApp == nil {
		return errcode.NotFound("应用商店应用不存在")
	}

	ext := &desktopModel.UserAppExt{
		Position: desktopModel.UserAppPositionDesktop,
		X:        2,
		Y:        2,
	}

	err = desktopModel.TbUserAppModel.CreateOrUpdate(
		uid,
		longStoreApp.AppId,
		ext,
		desktopModel.UserAppStatusInstalled,
	)
	if err != nil {
		return errcode.Internal("初始化用户桌面失败", err)
	}

	return nil
}

// 获取用户已安装的桌面和Dock应用
func (b *longStoreBusiness) GetUserInstalledApps(uid int64) (*longStoreCs.DesktopAppsResponse, error) {
	if uid <= 0 {
		return nil, errcode.Unauthorized("用户ID不能为空")
	}

	userApps, err := desktopModel.TbUserAppModel.ListByUid(uid)
	if err != nil {
		userApps = []*desktopModel.TbUserApp{}
	}

	userAppMap := make(map[int64]*desktopModel.TbUserApp)
	for _, ua := range userApps {
		userAppMap[ua.AppId] = ua
	}

	userPermission := userModel.TbAdminUserModel.GetUserPermission(uid)
	allApps, err := desktopModel.TbAppModel.ListByPermission(userPermission)
	if err != nil {
		allApps = []*desktopModel.TbApp{}
	}

	var desktopApps, dockApps []*longStoreCs.DesktopApp
	for _, app := range allApps {
		userApp, exists := userAppMap[app.AppId]
		if !exists || userApp.Status != desktopModel.UserAppStatusInstalled {
			continue
		}

		if userApp.Ext == nil {
			continue
		}

		desktopApp := &longStoreCs.DesktopApp{
			TbApp: app,
			Ext:   userApp.Ext,
		}

		if userApp.Ext.Position == desktopModel.UserAppPositionDesktop {
			desktopApps = append(desktopApps, desktopApp)
		} else if userApp.Ext.Position == desktopModel.UserAppPositionDock {
			dockApps = append(dockApps, desktopApp)
		}
	}

	// Dock按index排序
	for i := 0; i < len(dockApps); i++ {
		for j := i + 1; j < len(dockApps); j++ {
			if dockApps[i].Ext.DockIndex > dockApps[j].Ext.DockIndex {
				dockApps[i], dockApps[j] = dockApps[j], dockApps[i]
			}
		}
	}

	return &longStoreCs.DesktopAppsResponse{
		DesktopApps: desktopApps,
		DockApps:    dockApps,
	}, nil
}

// 从projects.yaml读取静态项目路径
func (b *longStoreBusiness) GetStaticPaths() (*longStoreCs.StaticPathsResponse, error) {
	yamlPath := "./static/projects.yaml"
	data, err := os.ReadFile(yamlPath)
	if err != nil {
		return nil, errcode.Internal("读取 projects.yaml 失败", err)
	}

	var projects map[string]struct {
		NameCn     string `yaml:"name_cn"`
		Type       string `yaml:"type"`
		Permission string `yaml:"permission"`
		Desc       string `yaml:"desc"`
	}
	if err := yaml.Unmarshal(data, &projects); err != nil {
		return nil, errcode.Internal("解析 projects.yaml 失败", err)
	}

	var paths []*longStoreCs.StaticPathItem
	for dirName, proj := range projects {
		appType := desktopModel.AppTypeApplication
		if proj.Type == "game" {
			appType = desktopModel.AppTypeGame
		}

		permission := userModel.UserPermissionNormal
		switch proj.Permission {
		case "admin":
			permission = userModel.UserPermissionAdmin
		case "super":
			permission = userModel.UserPermissionSuperAdmin
		}

		paths = append(paths, &longStoreCs.StaticPathItem{
			Name:       proj.NameCn,
			Path:       dirName,
			Desc:       proj.Desc,
			Type:       appType,
			Permission: permission,
		})
	}

	return &longStoreCs.StaticPathsResponse{Paths: paths}, nil
}
