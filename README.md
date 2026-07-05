# Skill.md Service — 公司內部 Skill Marketplace

公司內部的 skill marketplace：各團隊在自己的空間撰寫、維護 SKILL.md，成熟後
發布到「開放空間」供全公司搜尋、瀏覽、複製回自己團隊使用。作為 AI agent 系統
的 skill knowledge base。

## 功能總覽

- **團隊空間 / 開放空間**：雙區側欄，登入零點擊即分清「我的團隊」與「開放空間」
- **發布 / 下架 / 複製到團隊**：draft → published 狀態機；複製後獨立演化（記
  來源），支援跨團隊探索
- **發布版本凍結**：非團隊成員永遠看到發布當下的版本；團隊再編輯不外洩，重新
  發布才更新（見 `docs/decisions/20260705-publish-freeze-embedded-snapshot.md`）
- **搜尋 / 分頁 / 排序**：$text 可見性搜尋（分「我的團隊 / 開放空間」兩群）、
  清單分頁、開放空間「最新 / 最熱」排序
- **讚 / 引用數**：每人一票的讚、被複製次數（引用數）
- **淺色 / 深色主題**：token 驅動，淺 / 深 / 跟隨系統三態切換
- **多語系**：繁體中文 / English（react-i18next，側欄即時切換）
- **在線提示**：編輯同一 skill 時顯示「某某也在編輯」+ 他人儲存後的更新警示
  （DB 輪詢軟提示，樂觀鎖 409 為最後防線）
- **權限矩陣**：team editor / viewer / admin × 讀 / 寫 / 發布 / 複製；不可見資源
  一律 404（不洩露存在性）
- **身分（MVP）**：dev-stub（`X-Dev-User` header），Keycloak 接回為 deferred
  （換 `CurrentUserProvider` 實作即可）

> 規劃與決策：v1 主檔 `docs/tasks/20260703-skill-marketplace.md`、v2 主檔
> `docs/tasks/20260705-marketplace-v2.md`；spec `docs/design/PRD.md`；ADR 在
> `docs/decisions/`。

## 快速開始

### 本地開發（需要 Docker）

```bash
cd ~/md-editor

# 複製前端環境變數
cp frontend/.env.example frontend/.env

# 啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

服務將運行在：
- Frontend: http://localhost:5173
- Backend: http://localhost:8080 (Swagger: http://localhost:8080/swagger-ui.html)
- MongoDB: localhost:27017

> **Auth note:** Keycloak is currently disabled (deferred). Identity is a dev
> stub read from the `X-Dev-User` header. See
> `docs/decisions/20260703-defer-keycloak-stub-identity.md`.

### 跨團隊 Demo 資料

兩個團隊、兩個開發身分（無 Keycloak，靠 `X-Dev-User` header 切換身分）：

| 身分 | 團隊 | 角色 |
| --- | --- | --- |
| alice | team-a（平台團隊） | editor |
| carol | team-b（資料團隊） | editor |
| bob | team-a | viewer |

```bash
docker-compose up -d                                   # 啟動（含 mongo/backend，無 keycloak）
until curl -sf http://localhost:8080/api/health; do sleep 1; done   # 等後端就緒
./seed-data.sh                                         # 跑 migration 並灌入跨團隊資料（--reset 可清空重灌）

# 以 alice 身分看 team-a 的 skills
curl -H 'X-Dev-User: alice' 'http://localhost:8080/api/skills?teamId=team-a'
# 以 carol 身分看 team-b 的 skills
curl -H 'X-Dev-User: carol' 'http://localhost:8080/api/skills?teamId=team-b'
# 任一身分都看得到開放空間（已發布的 skills）
curl -H 'X-Dev-User: bob' 'http://localhost:8080/api/skills?view=open'
```

每個團隊各保留至少一份 draft，用來驗證草稿不會跨團隊可見。前端的身分切換 UI 為 Phase 2.2。

### 單獨運行後端

```bash
cd backend

# Using Maven wrapper
./mvnw spring-boot:run

# Or with system Maven
mvn spring-boot:run
```

需要 MongoDB 運行中：
```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 打包後端

```bash
cd backend
./mvnw clean package -DskipTests
# or
mvn clean package -DskipTests
```

### 單獨運行前端

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 技術棧

| 層 | 技術 |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Editor | MDXEditor |
| State | Zustand |
| Backend | Spring Boot 3.x (Java 17) |
| Database | MongoDB 7.x |
| Auth | Dev stub (Keycloak deferred — see docs/decisions/) |

## 專案結構

```
md-editor/
├── backend/          # Spring Boot API
│   └── src/main/java/com/company/skillmd/
│       ├── config/   # Security, MongoDB, OpenAPI
│       ├── skill/    # Skill CRUD
│       ├── version/  # Version history
│       ├── folder/   # Folder tree
│       ├── tag/      # Tag management
│       ├── search/   # Full-text search
│       ├── discovery/# LLM discovery API
│       ├── audit/    # Audit logging
│       ├── auth/     # Auth interfaces (deferred)
│       └── common/   # Shared utilities
├── frontend/         # React app
│   └── src/
│       ├── app/      # 應用外殼：Sidebar, GlobalSearch, useIdentity,
│       │             #   useTheme, TeamFilterContext
│       ├── pages/    # SkillsPage(團隊清單), OpenSpacePage(開放空間),
│       │             #   SkillDetailPage(詳情)
│       ├── components/
│       │   ├── editor/     # SkillEditor, MdxEditorWrapper（精簡 toolbar）
│       │   ├── tree/       # FolderTree
│       │   ├── dialog/     # ConflictDialog
│       │   └── common/     # Badge, Pagination, ErrorBanner, Markdown
│       ├── api/      # API client
│       ├── hooks/    # (空目錄 — 規劃中)
│       └── stores/   # (空目錄 — Zustand 規劃中)
└── docker-compose.yml
```

## API Endpoints

所有請求帶 `X-Dev-User` header（dev-stub 身分）。

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/me` | 目前身分 + 團隊 + 角色 |
| GET | `/api/teams` | 全部團隊 |
| POST | `/api/skills` | 建立 skill（歸屬 body.teamId） |
| GET | `/api/skills?view=team&teamId=` | 團隊清單（分頁） |
| GET | `/api/skills?view=open&sort=publishedAt\|likes` | 開放空間清單（分頁、排序） |
| GET | `/api/skills/{id}` | 詳情（非成員得凍結版） |
| PUT / DELETE | `/api/skills/{id}` | 更新 / 軟刪 |
| POST / DELETE | `/api/skills/{id}/publish` | 發布 / 下架 |
| POST | `/api/skills/{id}/copy-to-team` | 複製到團隊 |
| PUT / DELETE | `/api/skills/{id}/like` | 讚 / 收回讚（冪等） |
| GET | `/api/search?q=&scope=all\|team\|open` | 可見性搜尋（分兩群） |
| GET/POST | `/api/skills/{id}/versions...` | 版本清單 / 還原 |
| GET/POST/... | `/api/folders...`, `/api/tags` | 資料夾 / 標籤 |
| GET | `/api/health` | 健康檢查 |

## 開發階段

**Marketplace v1**（`docs/tasks/20260703-skill-marketplace.md`）— 全數完成
- [x] 後端核心：schema、身分授權、發布 / 複製、可見性搜尋、seed
- [x] 前端：淺色 tokens、雙區 shell、卡片、詳情頁、精簡編輯器
- [x] 開放空間體驗、UX 補完（導向 / 錯誤處理 / 中文化）、E2E 驗證

**Marketplace v2**（`docs/tasks/20260705-marketplace-v2.md`）
- [x] A 分頁 UI
- [x] B 發布版本凍結
- [x] C 讚 + 引用數 + 最熱排序
- [x] D 深色主題
- [x] E 在線提示 + 軟鎖（DB 輪詢，非 WebSocket——見 decisions/）
- [x] F 多語系框架（react-i18next，繁中/English）

**Deferred**（原設計明確排除）：LLM discovery 前端、Keycloak 接回、發布審核流。

## 參考文檔

- 實作規格：`docs/design/PRD.md`
- 任務追蹤：`docs/tasks/20260703-skill-marketplace.md`（v1）、
  `docs/tasks/20260705-marketplace-v2.md`（v2）
- 決策記錄：`docs/decisions/`（team scope、Keycloak 延後、編輯器收斂、
  發布凍結 snapshot）
