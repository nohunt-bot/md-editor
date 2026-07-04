# Skill.md Service

一個團隊共享的 Skill.md 編輯與管理服務，作為 AI agent 系統的 skill knowledge base。

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
│       ├── pages/    # SkillsPage (list/grid/filter view)
│       ├── components/
│       │   ├── editor/     # SkillEditor, MdxEditorWrapper
│       │   ├── tree/       # FolderTree
│       │   └── dialog/     # ConflictDialog
│       ├── api/      # API client
│       ├── hooks/    # (空目錄 — 規劃中)
│       └── stores/   # (空目錄 — Zustand 規劃中)
└── docker-compose.yml
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/skills` | Create skill |
| GET | `/api/skills` | List skills (paginated) |
| GET | `/api/skills/{id}` | Get skill detail |
| PUT | `/api/skills/{id}` | Update skill |
| DELETE | `/api/skills/{id}` | Soft delete |
| GET | `/api/health` | Health check |

## 開發階段

- [x] Phase 0: Foundation (專案骨架)
- [x] Phase 1: MVP CRUD
- [ ] Phase 2: 編輯體驗 (MDXEditor) — partial（進行中）
- [ ] Phase 3: 版本與權限
- [ ] Phase 4: LLM Discovery
- [ ] Phase 5: Polish

## 參考文檔

- 實作規格：`docs/design/PRD.md`
- 任務追蹤：`docs/tasks/20260703-skill-marketplace.md`
- Auth 決策：`docs/decisions/20260703-defer-keycloak-stub-identity.md`
