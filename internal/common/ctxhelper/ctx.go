package ctxhelper

import (
	"context"

	"github.com/armylong/armylong-go/internal/middlewares"
)

func GetUID(ctx context.Context) int64 {
	return middlewares.GetLoginUIDFromContext(ctx)
}

func GetUser(ctx context.Context) *middlewares.LoginUserInfo {
	return middlewares.GetLoginUserFromContext(ctx)
}
