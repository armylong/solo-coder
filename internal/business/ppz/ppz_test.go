package ppz

import (
	"context"
	"testing"

	ppzCs "github.com/armylong/armylong-go/internal/cs/ppz"
)

func TestGetPpzUserInfo(t *testing.T) {
	ctx := context.Background()

	t.Run("正常获取用户信息", func(t *testing.T) {
		uid := int64(1001)
		resp, err := PpzBusiness.GetPpzUserInfo(ctx, uid)
		if err != nil {
			t.Logf("获取用户信息: %v", err)
		} else {
			t.Logf("用户信息获取成功: CarCount=%d, Status=%d, DriverStatus=%d",
				resp.CarCount, resp.Status, resp.DriverStatus)
		}
	})

	t.Run("uid为0，未登录", func(t *testing.T) {
		uid := int64(0)
		resp, err := PpzBusiness.GetPpzUserInfo(ctx, uid)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("uid为负数", func(t *testing.T) {
		uid := int64(-1)
		resp, err := PpzBusiness.GetPpzUserInfo(ctx, uid)
		if err != nil {
			t.Logf("uid为负数时返回: %v", err)
		} else {
			t.Logf("uid为负数时成功: %+v", resp)
		}
	})
}

func TestCreateOrder(t *testing.T) {
	ctx := context.Background()
	uid := int64(1001)

	validGaodeData := `{"lng":116.397428,"lat":39.90923,"name":"北京市"}`

	t.Run("正常创建订单", func(t *testing.T) {
		req := &ppzCs.CreateOrderRequest{
			StartGaodeData: validGaodeData,
			DestGaodeData:  validGaodeData,
			DepartTime:     "2024-01-01 10:00",
			TimeType:       1,
			TimeFlex:       30,
			PassengerCount: 2,
			IsCharter:      0,
		}
		resp, err := PpzBusiness.CreateOrder(ctx, uid, req)
		if err != nil {
			t.Logf("创建订单结果: %v", err)
		} else {
			t.Logf("订单创建成功, OrderId=%d", resp.OrderId)
		}
	})

	t.Run("缺少出发地", func(t *testing.T) {
		req := &ppzCs.CreateOrderRequest{
			StartGaodeData: "",
			DestGaodeData:  validGaodeData,
			DepartTime:     "2024-01-01 10:00",
			PassengerCount: 2,
		}
		resp, err := PpzBusiness.CreateOrder(ctx, uid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("缺少目的地", func(t *testing.T) {
		req := &ppzCs.CreateOrderRequest{
			StartGaodeData: validGaodeData,
			DestGaodeData:  "",
			DepartTime:     "2024-01-01 10:00",
			PassengerCount: 2,
		}
		resp, err := PpzBusiness.CreateOrder(ctx, uid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("缺少出发时间", func(t *testing.T) {
		req := &ppzCs.CreateOrderRequest{
			StartGaodeData: validGaodeData,
			DestGaodeData:  validGaodeData,
			DepartTime:     "",
			PassengerCount: 2,
		}
		resp, err := PpzBusiness.CreateOrder(ctx, uid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("乘客数为0", func(t *testing.T) {
		req := &ppzCs.CreateOrderRequest{
			StartGaodeData: validGaodeData,
			DestGaodeData:  validGaodeData,
			DepartTime:     "2024-01-01 10:00",
			PassengerCount: 0,
		}
		resp, err := PpzBusiness.CreateOrder(ctx, uid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("乘客数为负数", func(t *testing.T) {
		req := &ppzCs.CreateOrderRequest{
			StartGaodeData: validGaodeData,
			DestGaodeData:  validGaodeData,
			DepartTime:     "2024-01-01 10:00",
			PassengerCount: -1,
		}
		resp, err := PpzBusiness.CreateOrder(ctx, uid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("无效的高德数据格式", func(t *testing.T) {
		req := &ppzCs.CreateOrderRequest{
			StartGaodeData: "invalid json",
			DestGaodeData:  validGaodeData,
			DepartTime:     "2024-01-01 10:00",
			PassengerCount: 2,
		}
		resp, err := PpzBusiness.CreateOrder(ctx, uid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})
}

func TestCancelOrder(t *testing.T) {
	ctx := context.Background()
	uid := int64(1001)

	t.Run("正常取消订单", func(t *testing.T) {
		req := &ppzCs.CancelOrderRequest{OrderId: 1}
		resp, err := PpzBusiness.CancelOrder(ctx, uid, req)
		if err != nil {
			t.Logf("取消订单结果: %v", err)
		} else {
			t.Logf("订单取消成功: %+v", resp)
		}
	})

	t.Run("订单ID为0", func(t *testing.T) {
		req := &ppzCs.CancelOrderRequest{OrderId: 0}
		resp, err := PpzBusiness.CancelOrder(ctx, uid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("订单不存在", func(t *testing.T) {
		req := &ppzCs.CancelOrderRequest{OrderId: 999999}
		resp, err := PpzBusiness.CancelOrder(ctx, uid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("非本人订单取消", func(t *testing.T) {
		otherUid := int64(9999)
		req := &ppzCs.CancelOrderRequest{OrderId: 1}
		resp, err := PpzBusiness.CancelOrder(ctx, otherUid, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})
}

func TestGetAddressPickerData(t *testing.T) {
	ctx := context.Background()

	t.Run("正常获取地址选择器数据", func(t *testing.T) {
		uid := int64(1001)
		resp, err := PpzBusiness.GetAddressPickerData(ctx, uid)
		if err != nil {
			t.Logf("获取地址选择器数据结果: %v", err)
		} else {
			t.Logf("地址选择器数据获取成功: RecentStart=%d, RecentDest=%d, SavedList=%d",
				len(resp.RecentStart), len(resp.RecentDest), len(resp.SavedList))
		}
	})

	t.Run("uid为0获取地址数据", func(t *testing.T) {
		uid := int64(0)
		resp, err := PpzBusiness.GetAddressPickerData(ctx, uid)
		if err != nil {
			t.Logf("uid=0时结果: %v", err)
		} else {
			t.Logf("uid=0时获取成功: RecentStart=%d, RecentDest=%d, SavedList=%d",
				len(resp.RecentStart), len(resp.RecentDest), len(resp.SavedList))
		}
	})

	t.Run("新用户获取地址数据", func(t *testing.T) {
		uid := int64(999999999)
		resp, err := PpzBusiness.GetAddressPickerData(ctx, uid)
		if err != nil {
			t.Logf("新用户获取结果: %v", err)
		} else {
			t.Logf("新用户获取成功: RecentStart=%d, RecentDest=%d, SavedList=%d",
				len(resp.RecentStart), len(resp.RecentDest), len(resp.SavedList))
		}
	})
}

func TestBanDriver(t *testing.T) {
	ctx := context.Background()

	t.Run("正常封禁司机", func(t *testing.T) {
		req := &ppzCs.BanDriverRequest{
			Uid:       1001,
			BanReason: "测试封禁",
		}
		resp, err := PpzAdminBusiness.BanDriver(ctx, req)
		if err != nil {
			t.Logf("封禁司机结果: %v", err)
		} else {
			t.Logf("司机封禁成功: %+v", resp)
		}
	})

	t.Run("uid为0", func(t *testing.T) {
		req := &ppzCs.BanDriverRequest{
			Uid:       0,
			BanReason: "测试封禁",
		}
		resp, err := PpzAdminBusiness.BanDriver(ctx, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("封禁原因空字符串", func(t *testing.T) {
		req := &ppzCs.BanDriverRequest{
			Uid:       1002,
			BanReason: "",
		}
		resp, err := PpzAdminBusiness.BanDriver(ctx, req)
		if err != nil {
			t.Logf("封禁原因空时结果: %v", err)
		} else {
			t.Logf("封禁原因空时成功: %+v", resp)
		}
	})
}

func TestUnbanDriver(t *testing.T) {
	ctx := context.Background()

	t.Run("正常解封司机", func(t *testing.T) {
		req := &ppzCs.UnbanDriverRequest{Uid: 1001}
		resp, err := PpzAdminBusiness.UnbanDriver(ctx, req)
		if err != nil {
			t.Logf("解封司机结果: %v", err)
		} else {
			t.Logf("司机解封成功: %+v", resp)
		}
	})

	t.Run("uid为0", func(t *testing.T) {
		req := &ppzCs.UnbanDriverRequest{Uid: 0}
		resp, err := PpzAdminBusiness.UnbanDriver(ctx, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("解封未被封禁的司机", func(t *testing.T) {
		req := &ppzCs.UnbanDriverRequest{Uid: 999999}
		resp, err := PpzAdminBusiness.UnbanDriver(ctx, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})
}

func TestOverviewStats(t *testing.T) {
	ctx := context.Background()

	t.Run("正常获取概览统计", func(t *testing.T) {
		req := &ppzCs.OverviewStatsRequest{}
		resp, err := PpzAdminBusiness.OverviewStats(ctx, req)
		if err != nil {
			t.Logf("获取概览统计结果: %v", err)
		} else {
			t.Logf("概览统计获取成功: TotalDrivers=%d, BannedDrivers=%d, TotalCars=%d",
				resp.TotalDrivers, resp.BannedDrivers, resp.TotalCars)
		}
	})

	t.Run("多次调用获取概览统计", func(t *testing.T) {
		req := &ppzCs.OverviewStatsRequest{}
		for i := 0; i < 3; i++ {
			resp, err := PpzAdminBusiness.OverviewStats(ctx, req)
			if err != nil {
				t.Logf("第%d次调用结果: %v", i+1, err)
			} else {
				t.Logf("第%d次调用成功: TotalDrivers=%d", i+1, resp.TotalDrivers)
			}
		}
	})
}

func TestDriverList(t *testing.T) {
	ctx := context.Background()

	t.Run("正常获取司机列表", func(t *testing.T) {
		req := &ppzCs.DriverListRequest{
			Page:     1,
			PageSize: 20,
			Status:   0,
		}
		resp, err := PpzAdminBusiness.DriverList(ctx, req)
		if err != nil {
			t.Logf("获取司机列表结果: %v", err)
		} else {
			t.Logf("司机列表获取成功: Total=%d, Page=%d, PageSize=%d, Drivers=%d",
				resp.Total, resp.Page, resp.PageSize, len(resp.Drivers))
		}
	})

	t.Run("page为0，应使用默认值1", func(t *testing.T) {
		req := &ppzCs.DriverListRequest{
			Page:     0,
			PageSize: 20,
			Status:   0,
		}
		resp, err := PpzAdminBusiness.DriverList(ctx, req)
		if err != nil {
			t.Logf("page=0时结果: %v", err)
		} else {
			if resp.Page != 1 {
				t.Errorf("期望Page=1，但得到Page=%d", resp.Page)
			} else {
				t.Logf("正确处理page=0，Page=%d", resp.Page)
			}
		}
	})

	t.Run("pageSize为0，应使用默认值20", func(t *testing.T) {
		req := &ppzCs.DriverListRequest{
			Page:     1,
			PageSize: 0,
			Status:   0,
		}
		resp, err := PpzAdminBusiness.DriverList(ctx, req)
		if err != nil {
			t.Logf("pageSize=0时结果: %v", err)
		} else {
			if resp.PageSize != 20 {
				t.Errorf("期望PageSize=20，但得到PageSize=%d", resp.PageSize)
			} else {
				t.Logf("正确处理pageSize=0，PageSize=%d", resp.PageSize)
			}
		}
	})

	t.Run("page和pageSize都为0", func(t *testing.T) {
		req := &ppzCs.DriverListRequest{
			Page:     0,
			PageSize: 0,
			Status:   0,
		}
		resp, err := PpzAdminBusiness.DriverList(ctx, req)
		if err != nil {
			t.Logf("page和pageSize都为0时结果: %v", err)
		} else {
			t.Logf("处理成功: Page=%d, PageSize=%d", resp.Page, resp.PageSize)
		}
	})

	t.Run("按状态筛选正常司机", func(t *testing.T) {
		req := &ppzCs.DriverListRequest{
			Page:     1,
			PageSize: 10,
			Status:   1,
		}
		resp, err := PpzAdminBusiness.DriverList(ctx, req)
		if err != nil {
			t.Logf("筛选正常司机结果: %v", err)
		} else {
			t.Logf("筛选正常司机成功: Total=%d", resp.Total)
		}
	})

	t.Run("按状态筛选已封禁司机", func(t *testing.T) {
		req := &ppzCs.DriverListRequest{
			Page:     1,
			PageSize: 10,
			Status:   2,
		}
		resp, err := PpzAdminBusiness.DriverList(ctx, req)
		if err != nil {
			t.Logf("筛选已封禁司机结果: %v", err)
		} else {
			t.Logf("筛选已封禁司机成功: Total=%d", resp.Total)
		}
	})
}

func TestGetCarDetail(t *testing.T) {
	ctx := context.Background()

	t.Run("通过auditId查询", func(t *testing.T) {
		req := &ppzCs.GetCarDetailRequest{
			AuditId: 1,
			CarId:   0,
		}
		resp, err := PpzAdminBusiness.GetCarDetail(ctx, req)
		if err != nil {
			t.Logf("通过auditId查询结果: %v", err)
		} else {
			t.Logf("通过auditId查询成功: AuditId=%d, CarId=%d",
				resp.Car.AuditId, resp.Car.CarId)
		}
	})

	t.Run("通过carId查询", func(t *testing.T) {
		req := &ppzCs.GetCarDetailRequest{
			AuditId: 0,
			CarId:   1,
		}
		resp, err := PpzAdminBusiness.GetCarDetail(ctx, req)
		if err != nil {
			t.Logf("通过carId查询结果: %v", err)
		} else {
			t.Logf("通过carId查询成功: AuditId=%d, CarId=%d",
				resp.Car.AuditId, resp.Car.CarId)
		}
	})

	t.Run("auditId和carId都为0", func(t *testing.T) {
		req := &ppzCs.GetCarDetailRequest{
			AuditId: 0,
			CarId:   0,
		}
		resp, err := PpzAdminBusiness.GetCarDetail(ctx, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("auditId不存在", func(t *testing.T) {
		req := &ppzCs.GetCarDetailRequest{
			AuditId: 999999,
			CarId:   0,
		}
		resp, err := PpzAdminBusiness.GetCarDetail(ctx, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})

	t.Run("carId不存在", func(t *testing.T) {
		req := &ppzCs.GetCarDetailRequest{
			AuditId: 0,
			CarId:   999999,
		}
		resp, err := PpzAdminBusiness.GetCarDetail(ctx, req)
		if err == nil {
			t.Errorf("期望返回错误，但得到成功: %+v", resp)
		} else {
			t.Logf("正确返回错误: %v", err)
		}
	})
}
