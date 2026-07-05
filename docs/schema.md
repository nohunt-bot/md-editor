# MongoDB Schema

## Collections Overview

| Collection | 用途 |
|------------|------|
| `teams` | 團隊定義（skill 的擁有者與編輯邊界） |
| `skills` | skill 主資料，含 Markdown 內容 |
| `folders` | 巢狀資料夾，parent-child 關聯，以團隊為根 |
| `skill_versions` | skill 每個版本的快照 |
| `tags` | 全域 tag 定義 |

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
- text index：`name, displayName, description, tags`
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
  _id ←── skills.references[].skillId
  _id ←── skills.prerequisites[].skillId
  _id ←── skills.sourceSkillId（複製來源；可懸空）
  name ←── (skills.tags[] 直接存 tag 名稱，非 FK)

tags
  name ←── skills.tags[]
```

---

## Migration 記錄

- `scripts/migrate-20260703-marketplace.js`：既有 skills 補上
  `teamId="team-a"`、`scope="team"`、`status="draft"`、`publishedAt=null`、
  `sourceSkillId=null`；既有 folders 補上 `teamId="team-a"`；seed `team-a`／
  `team-b` 至 `teams`；移除舊的 `name` 全域 unique index，建立本文件所列新
  indexes。此腳本為 idempotent（可重複執行）。
