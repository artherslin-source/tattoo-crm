# ✅ Railway Staging 环境变量设置完成报告

## 📋 设置摘要

所有 Railway staging 环境变量已成功设置！

---

## 🎨 前端专案：tattoo-crm-frontend-staging

### 已设置的环境变量

| 变量名称 | 设置值 | 状态 |
|---------|--------|------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://carefree-determination-production-1f1f.up.railway.app` | ✅ 已设置 |
| `NODE_ENV` | `staging` | ✅ 已设置 |

### 自动生成的 Railway 变量

- `RAILWAY_ENVIRONMENT` = production
- `RAILWAY_PRIVATE_DOMAIN` = tattoo-crm-frontend-staging.railway.internal
- `RAILWAY_PROJECT_ID` = a8c43aa6-9470-4c65-b801-23343c6e1472

### 前端公开 URL

```
https://tattoo-crm-frontend-staging-production.up.railway.app
```

---

## 🔧 后端专案：carefree-determination (tattoo-crm-backend-staging)

### 已设置的环境变量

| 变量名称 | 设置值 | 状态 |
|---------|--------|------|
| `DATABASE_URL` | `postgresql://postgres:***@postgres.railway.internal:5432/railway` | ✅ 自动提供 |
| `NODE_ENV` | `staging` | ✅ 已设置 |
| `JWT_SECRET` | `staging_secret_key` | ✅ 已设置 |
| `CORS_ORIGIN` | `https://tattoo-crm-frontend-staging-production.up.railway.app` | ✅ 已更新 |
| `PORT` | `4000` | ✅ 自动设置 |

### 自动生成的 Railway 变量

- `RAILWAY_ENVIRONMENT` = production
- `RAILWAY_ENVIRONMENT_ID` = 683afe45-c007-488d-89f9-95f1d51b8a59

### 后端公开 URL

```
https://carefree-determination-production-1f1f.up.railway.app
```

---

## 🔄 重要提示：需要重新部署

**环境变量变更后必须重新部署才会生效！**

### 方法 1：使用 Railway CLI（推荐）

```bash
# 重新部署后端
cd backend
railway up --detach

# 重新部署前端
cd ../frontend
railway up --detach
```

### 方法 2：使用 Railway Dashboard

1. 前往 [Railway Dashboard](https://railway.app)
2. 选择对应的专案
3. 点击 "Deployments" 标签
4. 点击 "Redeploy" 按钮

---

## ⚠️ 安全警告

### JWT_SECRET 安全性问题

当前设置的 `JWT_SECRET = "staging_secret_key"` **不够安全**！

**建议：**

```bash
# 生成更安全的密钥（至少 32 字符）
openssl rand -base64 32

# 更新 JWT_SECRET
cd backend
railway variables --set "JWT_SECRET=$(openssl rand -base64 32)"
railway up --detach
```

**或者保持简单密钥用于测试环境，但 production 环境必须使用强密钥！**

---

## 📊 URL 对应关系

### Staging 环境

```
前端 URL（用户访问）:
https://tattoo-crm-frontend-staging-production.up.railway.app

后端 URL（API）:
https://carefree-determination-production-1f1f.up.railway.app

数据库:
PostgreSQL (Railway 内部提供)
```

### 环境变量流向

```
前端 (NEXT_PUBLIC_API_BASE_URL)
    ↓
    调用后端 API
    ↓
后端 (carefree-determination-production-1f1f.up.railway.app)
    ↓
    连接数据库 (DATABASE_URL)
    ↓
PostgreSQL (postgres.railway.internal:5432)
```

---

## ✅ 验证环境变量

### 查看前端环境变量

```bash
cd frontend
railway variables
```

### 查看后端环境变量

```bash
cd backend
railway variables
```

### 测试连接

```bash
# 测试后端 API
curl https://carefree-determination-production-1f1f.up.railway.app/health

# 预期回应
{"status":"ok","timestamp":"2025-10-21T..."}
```

---

## 🔍 环境变量说明

### 前端环境变量

#### NEXT_PUBLIC_API_BASE_URL
- **用途：** 前端调用后端 API 的完整 URL
- **格式：** 必须包含 `https://` 前缀，不要结尾斜线
- **影响：** 前端所有 API 请求都会发送到这个地址
- **注意：** Next.js 中 `NEXT_PUBLIC_*` 前缀的变量会打包到浏览器代码中

#### NODE_ENV
- **用途：** 标识当前运行环境
- **可选值：** `development`, `staging`, `production`
- **影响：** 应用行为（日志级别、错误显示等）

### 后端环境变量

#### DATABASE_URL
- **用途：** PostgreSQL 数据库连接字符串
- **格式：** `postgresql://user:password@host:port/database`
- **来源：** Railway 自动提供（当添加 PostgreSQL 服务时）
- **安全：** 不要在日志或代码中输出

#### JWT_SECRET
- **用途：** JWT token 加密密钥
- **安全：** 应该使用至少 32 字符的随机字符串
- **影响：** 用户登录、认证、授权
- **注意：** 变更后所有现有 token 会失效

#### CORS_ORIGIN
- **用途：** 允许跨域请求的前端域名
- **格式：** 完整 URL 或逗号分隔的多个 URL
- **影响：** 前端是否能成功调用后端 API
- **安全：** 生产环境不要使用 `*`

#### PORT
- **用途：** 后端服务监听的端口
- **来源：** Railway 自动设置
- **通常值：** 4000 或 Railway 动态分配

---

## 🚀 部署后验证步骤

### 1. 重新部署

```bash
# 后端
cd backend
railway up --detach

# 前端
cd frontend
railway up --detach
```

### 2. 等待部署完成（约 2-3 分钟）

```bash
# 查看后端日志
cd backend
railway logs

# 查看前端日志
cd frontend
railway logs
```

### 3. 验证后端

```bash
# 测试健康检查
curl https://carefree-determination-production-1f1f.up.railway.app/health

# 预期看到
{"status":"ok","timestamp":"..."}
```

### 4. 验证前端

1. 开启浏览器访问前端 URL
2. 按 F12 打开开发者工具
3. 查看 Console，应该显示：
   ```
   🔍 API Base URL: https://carefree-determination-production-1f1f.up.railway.app
   🔍 Environment: staging
   ```
4. 测试登录功能，确认无 CORS 错误

### 5. 检查日志

**后端应该显示：**
```
✅ DATABASE_URL 验证通过
🌐 CORS Origin: https://tattoo-crm-frontend-staging-production.up.railway.app
→ Running Prisma migrate deploy...
🚀 Server is running on port 4000
```

**前端应该显示：**
```
▲ Next.js 15.x.x
✓ Ready in XXXms
```

---

## 📝 更新记录

| 时间 | 变量 | 操作 | 旧值 | 新值 |
|------|------|------|------|------|
| 2025-10-21 | `NEXT_PUBLIC_API_BASE_URL` | 创建 | - | `https://carefree-determination-production-1f1f.up.railway.app` |
| 2025-10-21 | `NODE_ENV` (frontend) | 创建 | - | `staging` |
| 2025-10-21 | `NODE_ENV` (backend) | 创建 | - | `staging` |
| 2025-10-21 | `JWT_SECRET` | 更新 | `Z6v7NfUZ...` | `staging_secret_key` |
| 2025-10-21 | `CORS_ORIGIN` | 更新 | `https://tattoo-crm-frontend-staging.railway.internal...` | `https://tattoo-crm-frontend-staging-production.up.railway.app` |

---

## 🔄 如需修改环境变量

### 修改前端变量

```bash
cd frontend
railway variables --set "VARIABLE_NAME=new_value"
railway up --detach  # 重新部署
```

### 修改后端变量

```bash
cd backend
railway variables --set "VARIABLE_NAME=new_value"
railway up --detach  # 重新部署
```

### 删除变量

```bash
railway variables --unset "VARIABLE_NAME"
```

---

## 🆘 常见问题

### Q: 为什么前端还是显示 localhost:4000？

**A:** 环境变量变更后需要重新部署前端：
```bash
cd frontend
railway up --detach
```

### Q: CORS 错误怎么办？

**A:** 确认后端的 `CORS_ORIGIN` 包含前端完整 URL：
```bash
cd backend
railway variables | grep CORS_ORIGIN
# 如果不对，重新设置
railway variables --set "CORS_ORIGIN=https://tattoo-crm-frontend-staging-production.up.railway.app"
railway up --detach
```

### Q: JWT_SECRET 改了之后无法登录？

**A:** 这是正常的，JWT_SECRET 变更后所有现有 token 会失效，用户需要重新登录。

### Q: 如何查看完整的 DATABASE_URL？

**A:** 
```bash
cd backend
railway variables | grep DATABASE_URL
```

---

## 📚 相关文档

- [Railway 环境变量完整指南](RAILWAY_VARIABLES_STAGING.md)
- [Staging 崩溃修复报告](STAGING_CRASH_FIX.md)
- [后端部署指南](backend/README_STAGING.md)
- [前端部署指南](frontend/README_STAGING_FRONTEND.md)

---

## ✅ 设置完成检查清单

- [x] 前端 `NEXT_PUBLIC_API_BASE_URL` 已设置
- [x] 前端 `NODE_ENV` 已设置
- [x] 后端 `DATABASE_URL` 已确认（自动提供）
- [x] 后端 `NODE_ENV` 已设置
- [x] 后端 `JWT_SECRET` 已设置
- [x] 后端 `CORS_ORIGIN` 已更新为正确的前端 URL
- [ ] 后端已重新部署
- [ ] 前端已重新部署
- [ ] 已验证后端健康检查
- [ ] 已验证前端可以访问
- [ ] 已测试登录功能

---

**🎉 环境变量设置完成！记得重新部署前后端让变量生效。**

