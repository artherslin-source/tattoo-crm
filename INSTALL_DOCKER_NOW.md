# 🐳 立即安裝 Docker Desktop

## 📥 下載和安裝（5分鐘）

### 方法 1：直接下載（推薦，最簡單）

1. **點擊下載鏈接**：
   - Apple Silicon (M1/M2/M3): https://desktop.docker.com/mac/main/arm64/Docker.dmg
   - Intel 芯片: https://desktop.docker.com/mac/main/amd64/Docker.dmg

2. **安裝步驟**：
   ```
   1. 打開下載的 Docker.dmg 文件
   2. 將 Docker 圖標拖到 Applications 文件夾
   3. 打開 Applications，雙擊 Docker
   4. 按照提示完成安裝（需要輸入密碼）
   5. 等待 Docker Desktop 啟動（右上角圖標變綠）
   ```

3. **驗證安裝**：
   ```bash
   docker --version
   docker-compose --version
   ```

---

### 方法 2：使用 Homebrew

如果你已經安裝了 Homebrew：

```bash
# 安裝 Docker Desktop
brew install --cask docker

# 啟動 Docker Desktop
open /Applications/Docker.app
```

如果還沒有 Homebrew，先安裝它：

```bash
# 安裝 Homebrew（需要管理員密碼）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 然後安裝 Docker
brew install --cask docker
```

---

## ✅ 安裝完成後的檢查

### 1. 確認 Docker Desktop 正在運行

- 查看右上角菜單欄
- 應該看到 Docker 圖標（鯨魚）
- 圖標應該是**穩定的**（不是動畫）

### 2. 打開終端驗證

```bash
docker --version
docker-compose --version
docker info
```

**期望輸出**：
```
Docker version 24.x.x, build xxxxx
Docker Compose version v2.x.x
...（Docker 信息）
```

---

## 🚀 安裝完成後，運行設置腳本

```bash
cd /Users/jerrylin/tattoo-crm/backend
./scripts/setup-local-postgres.sh
```

---

## 📞 需要幫助？

### Docker Desktop 無法啟動？

1. **重啟電腦**
2. **檢查系統要求**：
   - macOS 10.15 或更高版本 ✅（你的是 15.6）
   - 至少 4GB RAM
3. **重新安裝 Docker Desktop**

### 端口衝突？

```bash
# 查看 5432 端口是否被佔用
lsof -i :5432

# 如果有其他 PostgreSQL，停止它
brew services stop postgresql
```

### 其他問題？

查看完整文檔：`LOCAL_POSTGRESQL_SETUP.md`

---

## ⏱️ 預計時間

- 下載 Docker Desktop: 2-3 分鐘
- 安裝 Docker Desktop: 1-2 分鐘
- 啟動 Docker Desktop: 1 分鐘
- 運行設置腳本: 2-3 分鐘

**總計：約 5-10 分鐘** ⏰

---

## 🎯 下一步

安裝完 Docker Desktop 後：

```bash
# 1. 驗證 Docker 已安裝
docker --version

# 2. 運行自動設置腳本
cd /Users/jerrylin/tattoo-crm/backend
./scripts/setup-local-postgres.sh

# 3. 啟動後端服務
npm run start:dev
```

---

**準備好了嗎？開始下載 Docker Desktop 吧！** 🚀

