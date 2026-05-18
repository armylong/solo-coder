package gaode

import (
	"context"

	gaodeBs "github.com/armylong/armylong-go/internal/business/gaode"
	gaodeCs "github.com/armylong/armylong-go/internal/cs/gaode"
	confLibrary "github.com/armylong/go-library/service/conf"
)

// GaodeController 高德地图
type GaodeController struct{}

// 获取高德地图JS Key
func (c *GaodeController) ActionGetGaodeMapKey(ctx context.Context, req *gaodeCs.GetGaodeMapKeyRequest) (*gaodeCs.GetGaodeMapKeyResponse, error) {
	return &gaodeCs.GetGaodeMapKeyResponse{
		Key: confLibrary.GetString("gaode-map-ppz-web.key"),
	}, nil
}

// 代理转发高德API
func (c *GaodeController) ActionGaodeProxy(ctx context.Context, req *gaodeCs.GaodeProxyRequest) (*gaodeCs.GaodeProxyResponse, error) {
	return gaodeBs.Business.ProxyGaode(ctx, req)
}
