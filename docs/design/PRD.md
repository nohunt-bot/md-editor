# PRD — Skill Marketplace（md-editor / Skill.md Service）

- 版本：v1.1（2026-07-03；v1.0 經 fresh-context 覆核後修正 6 項發現）
- 狀態：draft，待使用者核准
- 相關文件：
  - 任務主檔 `docs/tasks/20260703-skill-marketplace.md`（執行計畫與驗證方式）
  - 決策記錄 `docs/decisions/20260703-*.md`（scope、Keycloak 延後、編輯器收斂）
  - 原始設計摘要 `docs/design/original-plan-summary.md`
  - 現行 schema `docs/schema.md`（本文件 §4 為其擴充版，實作時以本文件為準並回寫）

---

## 1. 產品概述

### 1.1 一句話

公司內部的 **skill marketplace**：各團隊在自己的空間撰寫、維護 SKILL.md，
成熟後發布到「開放空間」供全公司搜尋、瀏覽、複製回自己團隊使用。

### 1.2 解決的問題

- 各團隊的 agent skill 散落各處（repo、wiki、聊天記錄），沒有單一可搜尋的來源。
- 團隊間重複造輪子：A 團隊寫好的 skill，B 團隊不知道存在。
- Skill 品質無演進脈絡：誰改的、改了什麼、能不能退回，無從追溯。

### 1.3 目標（MVP）

1. 團隊成員能在團隊空間建立/編輯 skill（WYSIWYG，極簡工具列）。
2. 一鍵發布到開放空間；全公司可搜尋、瀏覽已發布 skill。
3. 他團隊能把開放空間的 skill「複製到我的團隊」後獨立演化。
4. 進入 app 零點擊即可分辨「我的團隊」與「開放空間」兩個入口。
5. 版本歷史可查、可還原（沿用既有 version 機制）。

### 1.4 非目標（MVP 明確不做）

- Keycloak／正式登入（身分用 dev stub，見 §2；上線前接回）
- 對外公開網路、發布審核流、評分/安裝數
- LLM discovery 前端串接、vector search（排在 marketplace 之後）
- 即時協作（WebSocket）、圖片/表格編輯、深色主題、行動版

---

## 2. 角色與權限

### 2.1 身分供應（MVP）

- 後端：`CurrentUserProvider` 介面（`userId` / `teamIds[]` / `roles`）。
  MVP 實作 = dev stub：由 request header `X-Dev-User: <userId>` 指定身分，
  使用者定義在 `application-dev.yml`（或 seed）。
- 前端：側欄底部「dev 身分切換器」，切換後所有 API 帶對應 header。
- `teamId` 語意 = 未來 Keycloak group id；接回時僅替換 Provider 實作。

### 2.2 角色

| 角色 | 說明 |
|---|---|
| team editor | 團隊成員，可寫本團隊 skill、發布/下架、複製他人 skill 進本團隊 |
| team viewer | 團隊成員，唯讀本團隊 skill |
| admin | 全域管理：跨團隊讀寫、下架任何 open skill |

### 2.3 權限矩陣（授權整合測試以此為準）

| 動作 | 本團隊 editor | 本團隊 viewer | 他團隊成員 | admin |
|---|---|---|---|---|
| 讀本團隊 skill（含 draft） | ✓ | ✓ | ✗ | ✓ |
| 建立/編輯/軟刪本團隊 skill | ✓ | ✗ | ✗ | ✓ |
| 發布/下架本團隊 skill | ✓ | ✗ | ✗ | ✓ |
| 讀開放空間已發布 skill | ✓ | ✓ | ✓ | ✓ |
| 複製 open skill 到自己團隊 | ✓ | ✗ | （即其本團隊 editor 權限） | ✓ |
| 版本檢視/還原（本團隊） | ✓ | 檢視 ✓ / 還原 ✗ | ✗ | ✓ |

> admin 欄的 ✓ 為**跨團隊**權限：admin 可讀寫任何團隊的 skill，並可下架任何
> 團隊的 open skill（開放空間治理）。§5 各 API 的授權註記與本矩陣已對齊。

---

## 3. 領域模型

### 3.1 核心概念

- **Team**：skill 的擁有者與編輯邊界。每個 skill 恰屬一個 team。
- **Scope**：`team`（僅團隊內）｜`open`（意圖公開）。
- **Status**：`draft`｜`published`。
- **開放空間可見規則**：`scope = open ∧ status = published ∧ deletedAt = null`。
- **複製（copy-to-team）**：在目標團隊建立新 skill（status=draft、scope=team、
  version 從 1 起算），`sourceSkillId` 記錄出處；之後與原件**獨立演化**（非 fork
  同步、不追蹤上游更新）。

### 3.2 發布狀態機

```
            publish（editor+，確認 dialog）
draft ────────────────────────────────▶ published
(scope=team|open)                        (scope=open, publishedAt=now)
   ▲                                          │
   └────────────── unpublish ─────────────────┘
        （status→draft；scope 維持 open 代表發布意圖；
          團隊內可見性全程不受影響）
```

- 已發布 skill 再編輯：內容更新即時反映於開放空間（MVP 不做「發布版本凍結」；
  revisit：若需要穩定引用，改為發布時固定 version 指標）。

---

## 4. MongoDB Schema

新增 `teams`；`skills`、`folders` 擴充；`skill_versions`、`tags` 沿用。
粗體 = 相對 `docs/schema.md` 的新欄位。

### 4.1 `teams`（新）

```json
{
  "_id": "string",            // 未來 = Keycloak group id；MVP 為 seed 指定（如 "team-a"）
  "name": "string",           // unique
  "displayName": "string",
  "createdAt": "ISODate"
}
```

### 4.2 `skills`（擴充）

```json
{
  "_id": "ObjectId",
  "name": "string",
  "displayName": "string",
  "description": "string",
  "content": "string",              // Markdown
  "teamId": "string",               // ★ ref: teams._id
  "scope": "string",                // ★ "team" | "open"
  "status": "string",               // ★ "draft" | "published"
  "publishedAt": "ISODate",         // ★ null = 未發布
  "sourceSkillId": "string",        // ★ null；複製來源 skills._id
  "folderId": "string",
  "tags": ["string"],
  "references": [{ "skillId": "string", "relation": "string" }],
  "prerequisites": [{ "skillId": "string", "note": "string" }],
  "currentVersion": "number",
  "authorId": "string",
  "lastEditorId": "string",
  "createdAt": "ISODate",
  "updatedAt": "ISODate",
  "deletedAt": "ISODate"
}
```

**Indexes**
- `(teamId, name)` unique — name 唯一性由全域改為**團隊內唯一**
  （複製到多團隊必然重名；migration 時移除舊的 name unique index）
- text index：`name, displayName, description, tags`
- `(scope, status, publishedAt desc)` — 開放空間瀏覽（最新發布）
- `(teamId, folderId)` — 團隊清單

**Migration（既有資料）**
- 全部 skills：`teamId = "team-a"`（預設 demo 團隊）、`scope = "team"`、
  `status = "draft"`、`publishedAt = null`、`sourceSkillId = null`
- 重建 name index 為 compound unique

### 4.3 `folders`（擴充）

```json
{
  "_id": "ObjectId",
  "name": "string",
  "teamId": "string",         // ★ folder tree 以團隊為根
  "parentId": "string",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

- 同層同名檢查改為 `(teamId, parentId, name)`。
- 開放空間**不使用 folder**（扁平：搜尋 + tag + 最新發布），folder 僅屬團隊內部組織。

### 4.4 `skill_versions`、`tags`

沿用 `docs/schema.md` 現行定義。tags 維持**全域**（跨團隊共用同一 tag 語彙，
開放空間篩選才有一致性）。複製 skill 時 versions 不複製（新件從 v1 開始）。

---

## 5. API 設計

既有 API 不動的不列。所有 API 經 `CurrentUserProvider` 取得身分；
未帶 `X-Dev-User` 的請求 → 401。錯誤格式沿用既有 GlobalExceptionHandler。

### 5.1 身分與團隊

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/me` | 目前身分：`{ userId, displayName, teams: [{id, displayName, role}] }` |
| GET | `/api/teams` | 全部團隊（複製目標選擇、開放空間顯示來源團隊名） |

### 5.2 Skills（調整 + 新增）

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/skills?view=team&teamId=&folderId=&tag=&q=&page=&size=` | 團隊清單：呼叫者須為該團隊成員 |
| GET | `/api/skills?view=open&tag=&q=&sort=publishedAt&page=&size=` | 開放空間清單：僅 open+published；回應含 `teamDisplayName` |
| POST | `/api/skills` | 建立（body 含 `teamId`，呼叫者須為該團隊 editor 或 admin；初始 draft/team） |
| GET | `/api/skills/{id}` | 詳情：本團隊成員，或該 skill 為 open+published，或 admin |
| PUT | `/api/skills/{id}` | 更新（本團隊 editor 或 admin；沿用樂觀鎖 + 版本快照） |
| DELETE | `/api/skills/{id}` | 軟刪（本團隊 editor 或 admin；已發布件先 unpublish 才可刪） |
| POST | `/api/skills/{id}/publish` | 發布：`scope=open, status=published, publishedAt=now`；本團隊 editor 或 admin |
| DELETE | `/api/skills/{id}/publish` | 下架：`status=draft`；本團隊 editor，或 admin（admin 可下架**任何**團隊的 open skill，見 §2.3 註記） |
| POST | `/api/skills/{id}/copy-to-team` | body `{ targetTeamId }`；來源須對呼叫者可見、呼叫者須為目標團隊 editor；回應 201 + 新 skill；名稱衝突自動後綴（`name-2`、`name-3`…——必要行為，因 `(teamId, name)` unique index） |

### 5.3 搜尋

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/search?q=&scope=all\|team\|open&tag=&limit=` | $text 搜尋，metadata-only（不含 content，照原設計 v0.2）；結果按呼叫者可見範圍過濾，回應分組 `{ team: [...], open: [...] }` |

### 5.4 Folders / Tags / Versions

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/folders/tree?teamId=` | 改為必帶 teamId；呼叫者須為成員 |
| POST/PATCH/DELETE | `/api/folders...` | 沿用，加 teamId 授權檢查 |
| GET | `/api/tags` | 沿用（全域） |
| GET | `/api/skills/{id}/versions`、`/versions/{v}` | 版本清單/單版本快照；授權依 §2.3 |
| POST | `/api/skills/{id}/versions/{v}/restore` | 還原到指定版本：本團隊 editor 或 admin；還原本身產生**新版本**（currentVersion+1，見 §7 F4） |

### 5.5 授權失敗語意

- 非成員讀他團隊 draft → **404**（不揭露存在性），非 403。
- 成員但角色不足（viewer 嘗試寫）→ 403。

---

## 6. 前端 — 視覺架構

### 6.1 設計原則（淺色極簡）

1. **兩個空間，一眼分清**：側欄固定兩區塊，永遠同時可見，不收合進 menu。
2. 白底 + 灰階層級 + **單一強調色**；分隔靠 1px 邊線與留白，不用陰影堆疊。
3. 資訊密度服務「找東西」：卡片只放 displayName、描述兩行、tags、狀態 badge、
   （開放空間加）來源團隊與發布時間。
4. 狀態語彙固定：`draft` = 灰 badge、`published` = 綠 badge、開放空間件 = 「開放」外框 badge。

### 6.2 Design tokens（CSS variables，Phase 2.1 落地）

| Token 群 | 值方向 |
|---|---|
| 背景 | `--bg: #fff`、`--bg-subtle: #f8f9fa`（側欄/區塊）、`--bg-hover: #f1f3f5` |
| 邊線 | `--border: #e9ecef`（1px 實線） |
| 文字 | `--text: #1a1d21`、`--text-secondary: #6b7280`、`--text-muted: #9ca3af` |
| 強調 | `--accent: #2563eb`（唯一彩色：主按鈕、連結、選中態） |
| 語意 | `--ok: #16a34a`（published）、`--warn: #d97706`、`--danger: #dc2626` |
| 字體 | UI = Inter；code = JetBrains Mono |
| 字級 | 13 / 14（本文）/ 16 / 20 / 24，行高 1.5 |
| 間距 | 4px 級距（4/8/12/16/24/32）；圓角 6px 統一 |

### 6.3 版面（desktop-first）

```
┌────────────┬──────────────────────────────────────────────┐
│  SIDEBAR   │  TOPBAR: 全域搜尋 ⌘K ····· [＋ 新增 Skill]   │
│ (260px 固定)├──────────────────────────────────────────────┤
│            │                                              │
│ ▍我的團隊   │   MAIN（依 route）                           │
│  [團隊切換▾]│                                              │
│  folder tree│   /team    團隊 skill 清單（folder/tag 篩選）│
│            │   /open    開放空間（最新發布、tag、搜尋）    │
│ ▍開放空間   │   /skills/:id       詳情（閱讀視圖）         │
│  瀏覽全部   │   /skills/:id/edit  編輯器                   │
│  熱門 tags  │   /skills/new       建立                     │
│            │                                              │
│ ─────────  │                                              │
│ dev身分切換 │                                              │
└────────────┴──────────────────────────────────────────────┘
```

Routes：`/` → redirect `/team`。

### 6.4 主要頁面構成

- **`/team` 團隊清單**：頂部 = 目前團隊名 + tag 篩選 chips + 清單/卡片切換；
  主體 = skill 卡片（badge 顯示 draft/published）；空狀態 = 引導「建立第一個 skill」。
- **`/open` 開放空間**：頂部 = 搜尋框（同全域搜尋）+ tag chips；
  主體 = 最新發布排序卡片，卡片多顯示「來源團隊 · 發布時間」；
  空狀態 = 「還沒有團隊發布 skill」。
- **`/skills/:id` 詳情**：左 = rendered markdown（閱讀寬度 ~720px）；
  右側欄（280px）= metadata（團隊、scope/status、tags、版本、更新者）+ 動作區
  （編輯／發布或下架／複製到我的團隊——依 §2.3 權限顯示）+ 版本歷史清單。
- **編輯器 `/skills/:id/edit`**：單欄置中；頂部 = displayName（inline 編輯）+
  draft/published badge + 儲存鈕；工具列僅：**標題、粗體、斜體、清單、連結、
  code block**；下方 = description、tags、folder 欄位；沿用樂觀鎖 ConflictDialog。

### 6.5 全域搜尋（⌘K / 頂部框）

輸入 → `/api/search`（metadata-only）→ 下拉結果**分兩群**：「我的團隊」「開放
空間」，每列 = displayName + 描述一行 + badge；Enter 進詳情；「查看全部結果」
落到 `/open?q=` 或 `/team?q=`。

---

## 7. 操作手順（key user flows）

### F1 建立 → 編輯 → 發布

1. 頂部「＋ 新增 Skill」→ `/skills/new`（歸屬 = 側欄目前團隊）
2. 填 name（team 內唯一，即時檢查）、displayName、description → 建立（draft）
3. 編輯內容 → 儲存（version +1，樂觀鎖衝突走 ConflictDialog）
4. 詳情頁 →「發布到開放空間」→ 確認 dialog（說明：全公司可見）→ 確認
5. badge 轉 published；skill 出現在 `/open` 最新發布

### F2 逛開放空間 → 複製到我的團隊

1. 側欄「開放空間」→ `/open`，搜尋或 tag 篩選
2. 點卡片 → 詳情（唯讀；顯示來源團隊）
3. 「複製到我的團隊」→ dialog 顯示目標團隊（多團隊者可選）→ 確認
4. 導向新建 draft 的詳情頁（自己團隊、v1、記 sourceSkillId）；原件不受影響

### F3 全域搜尋

1. ⌘K 或點頂部搜尋 → 輸入關鍵字
2. 下拉分「我的團隊」「開放空間」兩群 → Enter/點擊進詳情

### F4 版本檢視與還原

1. 詳情右欄「版本歷史」→ 選版本 → diff 檢視
2. 「還原到此版本」（editor+）→ 確認 → currentVersion+1（還原也是一次新版本）

### F5 下架

1. 已發布 skill 詳情 →「從開放空間下架」→ 確認 dialog（說明：他團隊已複製的
   副本不受影響）→ status 回 draft，即刻自 `/open` 消失

### F6 切換 dev 身分（僅 dev 環境）

1. 側欄底部切換器 → 選使用者（顯示其團隊與角色）→ 全站以該身分重載

---

## 8. 邊界情況與錯誤處理

| 情況 | 行為 |
|---|---|
| 讀不可見的 skill（他團隊 draft） | 404（見 §5.5） |
| 複製時目標團隊 name 衝突 | 自動後綴 `-2`、`-3`，回應中註明 |
| 刪除已發布 skill | 409：先下架才可刪 |
| 已發布 skill 的來源被刪，副本的 sourceSkillId 懸空 | 允許；詳情顯示「來源已不存在」 |
| 樂觀鎖衝突 | 沿用 ConflictDialog（diff + 覆蓋/放棄） |
| 貼上含 table/image 的 markdown | 原文保存、不損毀；僅無 WYSIWYG 編輯（ADR editor-feature-reduction 的必要行為） |
| 已發布 skill 再編輯 | 內容**即時**反映於開放空間（MVP 無發布版本凍結，見 §3.2/§9） |
| 搜尋無結果 | 空狀態 + 建議放寬 scope（team→all） |
| folder 刪除 | 沿用現規則：需無子資料夾、無 skill 引用 |

---

## 9. 未來擴充（設計已預留，MVP 不做）

- **Keycloak 接回**：換 `CurrentUserProvider` 實作（JWT groups claim →
  teamIds）；teams._id 即 group id；權限矩陣測試不動。
- **LLM discovery**：`/api/discovery/match`（metadata-only match，照原設計
  v0.2）；scope 過濾直接沿用 §3.1 可見規則。
- 發布審核流：status 加 `in_review`；評分/引用數：skills 加計數欄位。
- 發布版本凍結：publish 時固定 version 指標，開放空間讀凍結版。
