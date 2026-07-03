# MongoDB Schema

## Collections Overview

| Collection | 用途 |
|------------|------|
| `skills` | skill 主資料，含 Markdown 內容 |
| `folders` | 巢狀資料夾，parent-child 關聯 |
| `skill_versions` | skill 每個版本的快照 |
| `tags` | 全域 tag 定義 |

---

## `skills`

```json
{
  "_id": "ObjectId",
  "name": "string",           // unique index
  "displayName": "string",
  "description": "string",
  "content": "string",        // Markdown
  "folderId": "string",       // ref: folders._id
  "tags": ["string"],         // ref: tags.name
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
- `name`: unique

---

## `folders`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "parentId": "string",       // ref: folders._id，null = root
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

**規則**
- 同層（相同 `parentId`）不允許同名
- 刪除前需確認無子資料夾、無 skill 引用

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

---

## 關聯圖

```
folders
  _id ←── skills.folderId
  _id ←── folders.parentId   (自我參照，巢狀結構)

skills
  _id ←── skill_versions.skillId
  _id ←── skills.references[].skillId
  _id ←── skills.prerequisites[].skillId
  name ←── (skills.tags[] 直接存 tag 名稱，非 FK)

tags
  name ←── skills.tags[]
```
