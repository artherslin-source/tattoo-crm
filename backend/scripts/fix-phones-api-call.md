# 更新管理員和刺青師手機號碼 - API 調用方式

## 方式一：瀏覽器主控台執行

1. 打開瀏覽器，進入後端 API 的網址（例如：`https://your-backend.railway.app`）
2. 打開開發者工具（F12），切換到 Console（主控台）標籤
3. 執行以下 JavaScript 代碼：

```javascript
fetch('https://your-backend.railway.app/auth/fix-admin-artist-phones', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    secret: 'temporary-init-secret-2024'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ 執行結果:', data);
  console.log('\n📋 帳號列表:');
  console.log('BOSS:', data.accountList.BOSS);
  console.log('三重店經理:', data.accountList['三重店經理']);
  console.log('東港店經理:', data.accountList['東港店經理']);
  console.log('陳震宇:', data.accountList['陳震宇']);
  console.log('黃晨洋:', data.accountList['黃晨洋']);
  console.log('林承葉:', data.accountList['林承葉']);
  console.log('\n預設密碼:', data.defaultPassword);
})
.catch(error => {
  console.error('❌ 執行失敗:', error);
});
```

**注意：請將 `https://your-backend.railway.app` 替換為您的實際後端網址**

## 方式二：使用 curl 命令

在終端機或命令提示字元中執行：

```bash
curl -X POST https://your-backend.railway.app/auth/fix-admin-artist-phones \
  -H "Content-Type: application/json" \
  -d '{"secret":"temporary-init-secret-2024"}'
```

**注意：請將 `https://your-backend.railway.app` 替換為您的實際後端網址**

## 方式三：使用 Postman 或類似工具

1. 方法：POST
2. URL：`https://your-backend.railway.app/auth/fix-admin-artist-phones`
3. Headers：
   - `Content-Type: application/json`
4. Body (raw JSON)：
```json
{
  "secret": "temporary-init-secret-2024"
}
```

## 預期結果

成功執行後，會返回類似以下的 JSON 響應：

```json
{
  "success": true,
  "message": "手機號碼更新完成",
  "results": {
    "boss": {
      "name": "Super Admin",
      "phone": "0988666888",
      "status": "updated"
    },
    "managers": [
      {
        "name": "三重店經理",
        "branch": "三重店",
        "phone": "0911111111",
        "status": "updated"
      },
      {
        "name": "東港店經理",
        "branch": "東港店",
        "phone": "0922222222",
        "status": "updated"
      }
    ],
    "artists": [
      {
        "name": "陳震宇",
        "branch": "東港店",
        "phone": "0933333333",
        "status": "updated"
      },
      {
        "name": "黃晨洋",
        "branch": "三重店",
        "phone": "0944444444",
        "status": "updated"
      },
      {
        "name": "林承葉",
        "branch": "三重店",
        "phone": "0955555555",
        "status": "updated"
      }
    ],
    "errors": []
  },
  "accountList": {
    "BOSS": "0988666888",
    "三重店經理": "0911111111",
    "東港店經理": "0922222222",
    "陳震宇": "0933333333",
    "黃晨洋": "0944444444",
    "林承葉": "0955555555"
  },
  "defaultPassword": "12345678"
}
```

## 帳號列表

| 角色 | 姓名 | 手機號碼 | 密碼 |
|------|------|---------|------|
| BOSS | Super Admin | 0988666888 | 12345678 |
| BRANCH_MANAGER | 三重店經理 | 0911111111 | 12345678 |
| BRANCH_MANAGER | 東港店經理 | 0922222222 | 12345678 |
| ARTIST | 陳震宇 | 0933333333 | 12345678 |
| ARTIST | 黃晨洋 | 0944444444 | 12345678 |
| ARTIST | 林承葉 | 0955555555 | 12345678 |

## 安全說明

此端點使用 `secret` 參數進行保護，預設值為 `temporary-init-secret-2024`。

如需更改 secret，請在環境變數中設置 `BOSS_INIT_SECRET`。

