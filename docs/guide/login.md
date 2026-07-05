# 登入手順 / 身分（Identity）

> **這裡沒有登入頁面、沒有帳號密碼。** 目前的身分機制是 **dev-stub**：
> 前端在每一個 API 請求上帶一個 `X-Dev-User` header，後端依這個 header
> 值查表決定「你是誰」。Keycloak（正式的 SSO/OAuth）**已經被明確排除在
> MVP 之外**，是未來要接回的項目——見下方「Keycloak 現況」。

## 身分模型：dev-stub 怎麼運作

後端有一個抽象介面 `CurrentUserProvider`
（`backend/src/main/java/com/company/skillmd/auth/CurrentUserProvider.java`），
目前唯一的實作是 `DevCurrentUserProvider`：

```java
// backend/src/main/java/com/company/skillmd/auth/DevCurrentUserProvider.java
public static final String HEADER = "X-Dev-User";

@Override
public CurrentUser getCurrentUser() {
    String userId = request.getHeader(HEADER);
    if (userId == null || userId.isBlank()) {
        throw new UnauthorizedException("Missing " + HEADER + " header");
    }
    DevUserProperties.DevUser devUser = devUserProperties.getDevUsers().get(userId);
    if (devUser == null) {
        throw new UnauthorizedException("Unknown dev user: " + userId);
    }
    return new CurrentUser(userId, devUser.getDisplayName(), devUser.getTeams(), devUser.isAdmin());
}
```

也就是說：

- 沒有帶 `X-Dev-User` header → 401 Unauthorized。
- 帶了一個不在名單內的值（例如 `X-Dev-User: dave`）→ 401 Unauthorized。
- 帶了合法值 → 後端從 `application.yml` 的 `app.dev-users` 設定查出
  `displayName`、所屬團隊與角色、是否 admin，組成當次請求的身分。

這個設計是刻意留的抽象層：未來接 Keycloak 時，只要換一個
`CurrentUserProvider` 的實作（讀 JWT 而非 header），授權矩陣測試與其他
程式碼都不需要改。詳見決策記錄
`docs/decisions/20260703-defer-keycloak-stub-identity.md`。

## Dev users 清單

以下**直接讀自** `backend/src/main/resources/application.yml` 的
`app.dev-users`：

| userId | 顯示名稱 | 所屬團隊 | 角色 | admin |
|---|---|---|---|---|
| `alice` | Alice | team-a（平台團隊） | EDITOR | 否 |
| `bob` | Bob | team-a（平台團隊） | VIEWER | 否 |
| `carol` | Carol | team-b（資料團隊） | EDITOR | 否 |
| `admin` | Admin | （無團隊） | — | **是** |

> team-a／team-b 的中文顯示名稱「平台團隊」「資料團隊」是 `seed-data.sh`
> 灌資料時另外設定的（見 `setup.md`），不是寫死在 `application.yml` 裡。

角色意義（EDITOR / VIEWER）：

- **EDITOR**：可以建立、編輯、發布/下架、複製 skill，看得到自己團隊的
  draft。
- **VIEWER**：只能讀，看得到自己團隊的內容，但看不到編輯/發布相關按鈕。
- **admin**：`admin: true`，不屬於任何團隊（`teams: {}`），但視同所有團隊
  的 editor 權限（見下方「admin 能做什麼」）。

## 前端：切換身分（Dev-only identity switcher）

前端把目前的 dev user 存在 `localStorage`（`devUser` key，預設 `alice`），
每次 API 呼叫由 axios interceptor 自動加上 `X-Dev-User` header
（`frontend/src/api/api.ts`）：

```ts
export const DEV_USERS = ['alice', 'bob', 'carol', 'admin'] as const

api.interceptors.request.use((config) => {
  config.headers['X-Dev-User'] = getDevUser()
  return config
})
```

**切換步驟：**

1. 點側欄左下角的使用者選單（顯示目前身分名稱 + 所屬團隊/角色，例如
   「Alice · 平台團隊 · EDITOR」）。
2. 選單展開後，往下捲會看到一個標示「Dev」的區塊（僅在開發模式
   `import.meta.env.DEV` 下顯示），是一個下拉選單，列出
   `alice / bob / carol / admin`。
3. 選一個不同的身分 → 頁面會立即 `window.location.reload()` 重新整理，
   之後所有請求就會帶新身分的 header。

> 這個下拉選單是**開發用途**（`UserMenu.tsx` 註解明講：「Keycloak 接回時，
   只有登出動作會改成導去 IdP」）。目前按「登出」只會跳出提示文字，不會清除
   任何 session（因為本來就沒有真正的 session）。

## 用 curl 直接指定身分

不透過前端，直接對 API 測試不同身分的可見範圍：

```bash
# 以 alice 身分看 team-a 的 skills
curl -H 'X-Dev-User: alice' 'http://localhost:8080/api/skills?teamId=team-a'

# 以 carol 身分看 team-b 的 skills
curl -H 'X-Dev-User: carol' 'http://localhost:8080/api/skills?teamId=team-b'

# 任何身分都看得到開放空間（已發布的 skills）
curl -H 'X-Dev-User: bob' 'http://localhost:8080/api/skills?view=open'

# 查詢「我是誰」
curl -H 'X-Dev-User: alice' 'http://localhost:8080/api/me'
```

`/api/me` 回傳目前身分、所屬團隊（含 displayName、role）與 `admin` 旗標
（見 `backend/src/main/java/com/company/skillmd/auth/MeController.java`）。

## admin 能做什麼

`admin: true` 的身分（目前只有 `admin` 這個 dev user）：

- 在所有需要 EDITOR 權限的地方（編輯、發布/下架、複製、還原版本）一律視同
  editor，不管該 skill 屬於哪個團隊——`SkillDetailPage.tsx` 的
  `canEdit()` 邏輯：`if (identity.admin) return true`。
- 但 admin **不是**任何團隊的「成員」（`teams: {}`），所以「複製到我的
  團隊」的判斷（`canCopyTeam`）對 admin 永遠回傳 `true`（因為它不檢查
  admin 是否已是成員，只要是 admin 就顯示複製選項）——實際能複製到的目標
  團隊清單則因為 `admin` 沒有任何 team membership 而是空的，UI 上會停用
  複製按鈕並顯示提示（「需要至少一個可編輯的團隊」）。
- 目前沒有額外的「audit log 檢視」等 admin 專屬頁面（`audit/` 模組尚未
  實作，見 `IMPLEMENTATION_STATUS.md`）。

## Keycloak 現況（重要：目前不存在真正的登入畫面）

- **不要**把這個系統想成有 Keycloak 登入頁——目前完全沒有。
- `keycloak-realm.json` 檔案還留在 repo 根目錄，但只是「保留供未來使用」，
  未被任何服務載入或啟動（`docker-compose.yml` 裡也沒有 keycloak 服務）。
- 決策記錄 `docs/decisions/20260703-defer-keycloak-stub-identity.md`
  明確記載：使用者拍板「先不要 Keycloak」，MVP 以
  `CurrentUserProvider` 介面 + dev-stub 實作頂著，前端用 dev
  身分/團隊切換器取代登入畫面。`teamId` 欄位的語意就是預留給未來的
  Keycloak group id。
- **接回時機**：Revisit when 要上正式環境或多人真實使用時。屆時只需要
  新增一個讀 JWT 的 `CurrentUserProvider` 實作換掉 `DevCurrentUserProvider`，
  授權矩陣邏輯不需要重寫。
