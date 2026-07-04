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

> **Auth note:** Keycloak is currently disabled (deferred). All requests are permitted without authentication. See `docs/decisions/20260703-defer-keycloak-stub-identity.md`.

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
