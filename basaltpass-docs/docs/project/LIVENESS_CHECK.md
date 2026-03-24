# BasaltPass 存活检查（Tenant/Admin）

## 功能说明

BasaltPass 已支持在租户控制台（tenant）和管理员控制台（admin）中手动触发“存活检查”。

- Tenant 控制台：仪表盘点击“存活检查”按钮，调用租户侧检查接口。
- Admin 控制台：仪表盘点击“存活检查”按钮，调用管理员侧检查接口。
- 前端会显示最近一次检查结果（成功/失败 + 时间）。

## API 端点

### Tenant（需要租户控制台权限）

- Method: `POST`
- Path: `/api/v1/tenant/liveness-check`

### Admin（需要系统管理员权限）

- Method: `POST`
- Path: `/api/v1/admin/liveness-check`

## 响应示例

```json
{
  "ok": true,
  "scope": "tenant",
  "message": "tenant liveness check ok",
  "checked_at": "2026-03-24T10:10:10Z"
}
```

## 构建与集成建议（预留 BasaltPass 检查 API 口）

为了让业务系统在接入 BasaltPass 时更稳定，建议在构建阶段预留一组“可直连”的检查 API 口策略：

1. **保留 BasaltPass 健康探测入口**
   - 公共健康检查：`GET /api/v1/health`
   - 控制台手动检查：`POST /api/v1/tenant/liveness-check`、`POST /api/v1/admin/liveness-check`

2. **网关/反向代理不要屏蔽上述接口**
   - 确保 Nginx / API Gateway / Ingress 对这些路径可达。
   - 若有路径前缀重写，保证最终仍能命中以上路由。

3. **在部署脚本中加入存活探测步骤**
   - 应用启动后，先探测 `GET /api/v1/health`。
   - 控制台联调时，再验证 tenant/admin 的手动存活检查接口。

4. **为检查接口预留超时与重试策略**
   - 建议客户端设置合理超时（例如 3~10 秒）。
   - 对网络抖动场景可采用有限重试，避免误报。

5. **将检查结果纳入发布门禁（可选）**
   - CI/CD 发布后自动执行健康检查。
   - 若检查失败，阻断后续流量切换或发布完成标记。

---

如果你需要把该能力扩展为“应用级别”或“第三方服务回调级别”存活检查，可在现有模式上继续增加受控路由（建议保持同样的响应结构：`ok/scope/message/checked_at`）。
