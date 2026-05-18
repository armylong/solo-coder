# WebSocket 接入调研

## 背景

当前匹配中订单、行程状态等场景使用前端轮询（5s 间隔请求接口），体验差且浪费资源。需要引入 WebSocket 实现服务端主动推送。

## 适用场景

| 场景 | 推送内容 | 优先级 |
|---|---|---|
| 订单匹配成功 | 订单状态变更 + 行程信息 | P0 |
| 司机接单/派单 | 行程状态 + 司机信息 | P0 |
| 行程状态变更 | 出发/到达/完成等状态 | P1 |
| 司机端新订单推送 | 匹配中的订单列表 | P1 |

## 技术选型

### 依赖

- `github.com/gorilla/websocket` — Go 生态最成熟的 WS 库

### 架构

```
客户端 ←── WebSocket ──→ Gin (/ws)
                              │
                              ▼
                        ConnManager (内存 map)
                        uid → *websocket.Conn
                              │
                              ▼
                        业务层状态变更时调用 Push
```

### 核心模块

1. **ConnManager** — 连接管理器
   - 维护 `map[int64]*websocket.Conn`
   - 支持同一用户多端连接（map[int64][]*websocket.Conn）
   - 连接断开自动清理
   - 并发安全（读写锁）

2. **鉴权** — 连接时验证身份
   - WS 连接时通过 query param 传 token
   - 复用现有 JWT 逻辑验证
   - 验证失败拒绝升级

3. **消息格式** — 统一推送协议
   ```json
   {
     "type": "order_status_changed",
     "data": { ... }
   }
   ```

4. **路由注册**
   - Gin 路由挂载 `/ws`
   - 不走现有 JsonController 体系，独立处理升级

### 消息类型定义

| type | 触发时机 | data |
|---|---|---|
| `order_matched` | 订单匹配成功，司机接单 | 订单信息 + 行程信息 |
| `order_cancelled` | 订单被取消 | 订单ID |
| `trip_status_changed` | 行程状态变更 | 行程ID + 新状态 |
| `new_order` | 司机端收到新匹配订单 | 订单信息 |

## 实施步骤

1. 引入 `gorilla/websocket` 依赖
2. 实现 ConnManager 连接管理器
3. 实现 WS 升级 + JWT 鉴权
4. 定义消息类型和推送接口
5. 在业务层（接单/取消/状态变更）接入推送
6. 前端建立 WS 连接 + 消息分发
7. 替换现有轮询逻辑

## 注意事项

- 单机 SQLite 架构，不需要 Redis Pub/Sub，内存 map 足够
- 需要处理断线重连（前端指数退避）
- WS 连接不保证消息必达，关键操作仍需接口确认
- 考虑心跳保活（ping/pong）
