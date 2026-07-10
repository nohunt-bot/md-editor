# MongoDB Schema

## Collections Overview

| Collection | 用途 |
|------------|------|
| `teams` | 團隊定義（skill 的擁有者與編輯邊界） |
| `skills` | skill 主資料，含 Markdown 內容 |
| `folders` | 巢狀資料夾，parent-child 關聯，以團隊為根 |
| `skill_versions` | skill 每個版本的快照 |
| `tags` | 全域 tag 定義 |
| `skill_likes` | 一使用者對一 skill 一個讚；skills.likeCount 為其去正規化計數（Phase C） |
| `skill_presence` | 軟在線提示——誰正在編輯某 skill，編輯器約每 5s 心跳一次（Phase E） |
| `user_preferences` | 跟隨帳號跨裝置的使用者偏好（主題、語言） |

---

## `teams`

```json
{
  "_id": "string",            // 未來 = Keycloak group id；MVP 為 seed 指定（如 "team-a"）
  "name": "string",           // unique
  "displayName": "string",
  "createdAt": "ISODate"
}
```

**Indexes**
- `name`: unique

---

## `skills`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "displayName": "string",
  "description": "string",
  "content": "string",              // Markdown
  "teamId": "string",                // ref: teams._id
  "scope": "string",                 // "team" | "open"
  "status": "string",                // "draft" | "published"
  "publishedAt": "ISODate",          // null = 未發布
  "publishedVersion": "number",      // v2：發布當下的版本；null = 未發布過
  "publishedSnapshot": {             // v2：發布凍結內容（非成員讀此，非 live 欄位）
    "displayName": "string",         //   ADR: 20260705-publish-freeze-embedded-snapshot
    "description": "string",
    "content": "string",
    "tags": ["string"],
    "version": "number"
  },
  "sourceSkillId": "string",         // null；複製來源 skills._id
  "likeCount": "number",             // 去正規化：skill_likes 的計數（可為 null，首次 like 才有值）
  "copyCount": "number",             // 去正規化：以此為 sourceSkillId 的複製次數（可為 null）
  "folderId": "string",
  "tags": ["string"],
  "references": [
    {
      "skillId": "string",    // ref: skills._id
      "relation": "string"    // "depends_on" | "related" | "extends"
    }
  ],
  "prerequisites": [
    {
      "skillId": "string",    // ref: skills._id
      "note": "string"
    }
  ],
  "currentVersion": "number",
  "authorId": "string",
  "lastEditorId": "string",
  "createdAt": "ISODate",
  "updatedAt": "ISODate",
  "deletedAt": "ISODate"      // null = 未刪除（soft delete）
}
```

**Indexes**
- `(teamId, name)`: unique — name 唯一性由全域改為**團隊內唯一**
  （複製到多團隊必然重名；migration 時移除舊的全域 `name` unique index）
- text index：`name(10), displayName(10), tags(8), description(5), content(1)`
  （weights；`content` 使已發布/草稿內文的關鍵字可被搜到，非僅 metadata 欄位）
- `(scope, status, publishedAt desc)` — 開放空間瀏覽（最新發布）
- `(teamId, folderId)` — 團隊清單

**規則**
- 新建 skill 預設：`scope = "team"`、`status = "draft"`、`publishedAt = null`、
  `sourceSkillId = null`；`teamId` 為必填，建立後不可變更。
- 開放空間可見規則：`scope = open ∧ status = published ∧ deletedAt = null`。
- 複製（copy-to-team）：在目標團隊建立新 skill（`status=draft`、`scope=team`、
  version 從 1 起算），`sourceSkillId` 記錄出處；之後與原件獨立演化。

---

## `folders`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "teamId": "string",         // folder tree 以團隊為根
  "parentId": "string",       // ref: folders._id，null = root
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

**Indexes**
- `(teamId, parentId, name)`: unique

**規則**
- 同層（相同 `teamId` + `parentId`）不允許同名
- 刪除前需確認無子資料夾、無 skill 引用
- 開放空間不使用 folder（扁平：搜尋 + tag + 最新發布），folder 僅屬團隊內部組織

---

## `skill_versions`

```json
{
  "_id": "ObjectId",
  "skillId": "string",        // ref: skills._id
  "version": "number",
  "snapshot": {
    "name": "string",
    "displayName": "string",
    "description": "string",
    "content": "string",
    "folderId": "string",
    "tags": ["string"]
  },
  "commitMessage": "string",
  "editorId": "string",
  "createdAt": "ISODate"
}
```

複製 skill 時 versions 不複製（新件從 v1 開始）。

---

## `tags`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "color": "string",
  "usageCount": "number"
}
```

tags 維持**全域**（跨團隊共用同一 tag 語彙，開放空間篩選才有一致性）。

---

## `skill_likes`

```json
{
  "_id": "ObjectId",
  "skillId": "string",        // ref: skills._id
  "userId": "string",
  "createdAt": "ISODate"      // @CreatedDate
}
```

**Indexes**
- `(skillId, userId)`: unique（名 `skillId_userId_unique`）——讓 like 在資料層冪等
  （宣告；目前未由 migration 建立，見文末說明）

**規則**
- Phase C（v2）：一使用者對一 skill 一個讚。
- `skills.likeCount` 是此 collection 的去正規化計數，供清單顯示／排序用；此
  collection 才是讚的真實來源（source of truth）。

---

## `skill_presence`

```json
{
  "_id": "ObjectId",
  "skillId": "string",        // ref: skills._id
  "userId": "string",
  "lastSeen": "ISODate"       // TTL：放棄的心跳 60 秒後自動清除
}
```

**Indexes**
- `(skillId, userId)`: unique（名 `skillId_userId_unique`）
  （宣告；目前未由 migration 建立，見文末說明）
- `lastSeen`：TTL index `@Indexed(expireAfterSeconds = 60)`——放棄的心跳 60 秒
  後自動清除（宣告；目前未由 migration 建立，見文末說明）

**規則**
- Phase E（v2）：軟在線提示——誰正在編輯某 skill。編輯器約每 5s 心跳一次。
- 冪等實際上是靠 app 層的 atomic upsert（`MongoTemplate.upsert`）保證，而非
  靠上面宣告的 unique index（見文末說明）。
- 參見 ADR `docs/decisions/20260705-presence-db-poll-over-websocket.md`。

---

## `user_preferences`

```json
{
  "_id": "string",            // = userId（@Id，自然鍵）；dev-stub id，未來為 Keycloak subject
  "theme": "string",          // "light" | "dark" | "system"
  "language": "string"        // "zh-TW" | "en"
}
```

**Indexes**
- 無額外 index（以 `userId` 為 `_id`）

**規則**
- 跟隨帳號跨裝置的偏好（主題、語言）。
- 裝置／工作階段區域性偏好（view mode、active team、dev 身分）留在
  localStorage，**不**存這裡。

---

## 關聯圖

```
teams
  _id ←── skills.teamId
  _id ←── folders.teamId

folders
  _id ←── skills.folderId
  _id ←── folders.parentId   (自我參照，巢狀結構)

skills
  _id ←── skill_versions.skillId
  _id ←── skill_likes.skillId
  _id ←── skill_presence.skillId
  _id ←── skills.references[].skillId
  _id ←── skills.prerequisites[].skillId
  _id ←── skills.sourceSkillId（複製來源；可懸空）
  name ←── (skills.tags[] 直接存 tag 名稱，非 FK)

tags
  name ←── skills.tags[]

user_preferences
  _id = userId   (獨立，不 FK 到其他 collection；對應身分主體)
```

---

## Migration 記錄

- `scripts/migrate-20260703-marketplace.js`：既有 skills 補上
  `teamId="team-a"`、`scope="team"`、`status="draft"`、`publishedAt=null`、
  `sourceSkillId=null`；既有 folders 補上 `teamId="team-a"`；seed `team-a`／
  `team-b` 至 `teams`；移除舊的 `name` 全域 unique index，建立本文件所列新
  indexes。此腳本為 idempotent（可重複執行）。
- `scripts/migrate-20260705-v2-freeze.js`：v2 回填。Phase B 為已發布但缺
  `publishedSnapshot` 者以當下內容凍結快照；Phase C 回填去正規化計數
  （`copyCount` 由 `sourceSkillId` 聚合、`likeCount` 由 `skill_likes` 計數）。
  **此腳本只回填資料，不建立任何 index**（含 skill_likes / skill_presence 的
  unique 與 TTL index）。此腳本為 idempotent（可重複執行）。
- `scripts/migrate-20260711-search-content-indexes.js`：重建 skills text
  index 納入 `content`（weights 見上）；為 skill_likes / skill_presence 去重
  （保留每組 `(skillId, userId)` 最早一筆）後建立 unique compound index；為
  skill_presence 建立 `lastSeen` TTL index（60 秒）。此腳本為 idempotent（可
  重複執行）——收掉下方「已知缺口」一節所述的宣告與實際建立落差。

---

## Index 宣告 vs 實際建立

Spring Boot **預設關閉 auto-index-creation**（`SkillService.java:178` 附近註解
證實）。因此本文件各 collection 標示的 `@CompoundIndex` / `@Indexed`（含 TTL）／
text index，過去只是程式碼中的註解宣告，不會自動在 DB 建立；`skill_likes` /
`skill_presence` 的 unique 與 TTL index、以及 skills text index 納入 `content`，
現在由 `scripts/migrate-20260711-search-content-indexes.js` 建立，缺口已收掉。

**歷史脈絡（曾經的落差，現況見上）**：

- `skill_presence` 的冪等在 index 補建前，是靠 app 層的 **atomic upsert**
  （`MongoTemplate.upsert`，見 `SkillService.java:177-187`）保證的，並非靠宣告
  的 unique index；補建 index 後兩者一致，upsert 邏輯不變。
- `skill_likes` 的 unique index 在補建前未於 DB 建立；一使用者對一 skill 的唯一性
  當時不由 DB 端保證。
- `skill_presence` 的 60 秒 TTL 在補建前不會於 DB 端自動清除過期心跳；讀取路徑
  以 `PRESENCE_WINDOW_SECONDS` 時間窗過濾的行為不變（TTL 只是額外的 DB 端清理，
  對讀取結果無影響，故啟用 TTL 是行為安全的）。

**現況**：執行過 `scripts/migrate-20260711-search-content-indexes.js` 之後，
上述 index 已實際建立在 DB，不再只是註解宣告。若未執行過此腳本的環境，仍處於
「宣告；未由 migration 建立」的狀態，需先跑一次此腳本。
