# Skill.md Service - Implementation Status

> **Marketplace 轉型（2026-07-03-05）已完成 Phase 0–4**：公司內部 skill
> marketplace（團隊空間 + 開放空間、發布/複製/搜尋、淺色極簡前端、dev-stub
> 身分）。主檔 `docs/tasks/20260703-skill-marketplace.md`；spec `docs/design/PRD.md`。
> 後端單元+整合測試全綠（含 Testcontainers），前端 24 tests 綠，跨團隊 E2E
> 已於真 stack 驗證。以下為早期 Phase 0/1 骨架記錄，marketplace 增量見任務檔。

## ✅ Completed (early skeleton — Phase 0 + Phase 1)

### Backend (Spring Boot)

**Core Infrastructure:**
- [x] Spring Boot 3.x project skeleton (Maven)
- [x] Maven build configuration (pom.xml)
- [x] Maven wrapper (mvnw)
- [x] Docker Compose setup (MongoDB + Backend + Frontend; Keycloak deferred)
- [x] OpenAPI/Swagger documentation

**Security:**
- [x] ~~OAuth2 Resource Server configuration~~ (deferred with Keycloak, 2026-07-03)
- [x] ~~Keycloak JWT authentication~~ (deferred, 2026-07-03)
- [x] ~~Role-based access control (admin/editor/viewer)~~ (deferred, 2026-07-03)
- [x] CORS configuration (permissive for dev)

**Domain - Skills:**
- [x] Skill entity with full schema
- [x] SkillRepository (MongoDB)
- [x] SkillService (CRUD operations)
- [x] SkillController (REST API)
- [x] DTOs (CreateSkillRequest, UpdateSkillRequest, SkillResponse)
- [x] ReferenceResolver (cycle detection)

**Domain - Versions:**
- [x] SkillVersion entity (snapshot storage)
- [x] SkillVersionRepository
- [x] VersionService (create, list, restore)
- [x] VersionController (REST API)
- [x] Version DTOs

**Domain - Folders:**
- [x] Folder entity (tree structure)
- [x] FolderRepository
- [x] FolderService (CRUD, tree building, move)
- [x] FolderController (REST API)

**Domain - Tags:**
- [x] Tag entity
- [x] TagRepository
- [x] TagService (getOrCreate, usage tracking)
- [x] TagController (REST API)

**Utilities:**
- [x] Health check endpoint
- [x] Test data seed script

### Frontend (React + TypeScript)

**Core Infrastructure:**
- [x] Vite + React 18 + TypeScript setup
- [x] React Router configuration
- [x] Light-minimal design-token styling（Inter + JetBrains Mono；2.1 深→淺翻轉）
- [x] Environment configuration

**Authentication:**
- [x] ~~Keycloak JS integration~~ (removed 2026-07-03, deferred per docs/decisions/)
- [x] ~~Token management (refresh, expiry)~~ (removed 2026-07-03)
- [x] ~~Role checking utilities~~ (removed 2026-07-03)

**API Layer:**
- [x] Axios instance with interceptors
- [x] Auth token injection
- [x] Skill API client
- [x] Folder API client
- [x] Tag API client

**UI Pages:**
- [x] Home page (redirects to /skills in App.tsx)
- [x] Skills list page with filtering (folder, tag, search) — SkillsPage.tsx
- [x] List/Grid view toggle
- [x] SkillCard component (inline in SkillsPage.tsx)
- [x] SkillEditor (Create/Edit form with MDXEditor WYSIWYG) — SkillEditor.tsx
- [x] SkillDetail page — SkillDetailPage.tsx（完整閱讀頁：rendered markdown、
      metadata、權限閘控動作、版本歷史；2.4）

**Components:**
- [x] FolderTree (collapsible tree structure) — FolderTree.tsx
- [x] Tag sidebar (clickable tag list in SkillsPage.tsx)
- [x] Sidebar navigation (folder/tag sections in SkillsPage.tsx)
- [x] Responsive layout

**Editor:**
- [x] MDXEditor WYSIWYG integration
- [x] Toolbar — 精簡版（headings, bold/italic, lists, links, code blocks；
      無 underline/table/image 按鈕，2.5 ADR editor-feature-reduction）
- [x] Light token-based styling
- [x] Syntax highlighting support (JavaScript, TypeScript, Python)

### DevOps

- [x] Docker Compose (3 services: MongoDB, Backend, Frontend)
- [x] Backend Dockerfile (multi-stage)
- [x] Frontend Dockerfile (multi-stage with nginx)
- [x] ~~Keycloak realm JSON~~ (retained for future use; Keycloak deferred 2026-07-03)
- [x] Setup script (setup.sh)
- [x] Seed data script (seed-data.sh)
- [x] .gitignore

### Testing

- [x] Backend unit tests (JUnit 5 + Mockito)
  - SkillServiceTest: 4 tests for optimistic locking logic
  - OptimisticLockingConflictExceptionTest: 1 test for exception
  - GlobalExceptionHandlerTest: 1 test for 409 response
- [x] Backend integration tests (Testcontainers MongoDB)
  - SkillControllerIntegrationTest: 4 HTTP flow tests (requires Docker)
- [x] Frontend unit tests (Vitest + Testing Library)
  - ConflictDialog.test.tsx: 5 tests for conflict dialog

---

## 🚧 Next Steps

### Phase 2 Complete - Editor Experience

- [x] Skills list with filtering (folder, tag, search)
- [x] List/Grid view toggle
- [x] SkillEditor form (Create/Edit)
- [x] FolderTree component
- [x] Tag input
- [x] MDXEditor WYSIWYG integration
- [x] Optimistic locking (conflict detection + diff viewer)
- [ ] ReferencePicker with @ autocomplete
- [ ] Real-time conflict detection (WebSocket)

### Phase 3 - Version & Permissions

- [ ] Version history sidebar on SkillDetail
- [ ] Version diff viewer (standalone, not just conflict)
- [ ] Restore to previous version
- [ ] Keycloak role-based UI (show/hide based on permissions)
- [ ] Audit log viewer (admin only)

### Phase 4 - LLM Discovery

- [ ] `/api/discovery/match` endpoint
- [ ] Service account client setup
- [ ] Vector embedding evaluation (Atlas Vector Search)

### Phase 5 - Polish

- [ ] Markdown bundle export
- [ ] Empty states
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsive improvements

---

## 📁 Project Structure

```
md-editor/
├── backend/
│   ├── src/main/java/com/company/skillmd/
│   │   ├── config/
│   │   │   ├── SecurityConfig.java ✅
│   │   │   ├── MongoConfig.java ✅
│   │   │   └── OpenApiConfig.java ✅
│   │   ├── skill/
│   │   │   ├── Skill.java ✅
│   │   │   ├── SkillRepository.java ✅
│   │   │   ├── SkillService.java ✅
│   │   │   ├── SkillController.java ✅
│   │   │   ├── ReferenceResolver.java ✅
│   │   │   └── dto/ ✅
│   │   ├── version/
│   │   │   ├── SkillVersion.java ✅
│   │   │   ├── SkillVersionRepository.java ✅
│   │   │   ├── VersionService.java ✅
│   │   │   ├── VersionController.java ✅
│   │   │   └── dto/ ✅
│   │   ├── folder/
│   │   │   ├── Folder.java ✅
│   │   │   ├── FolderRepository.java ✅
│   │   │   ├── FolderService.java ✅
│   │   │   └── FolderController.java ✅
│   │   ├── tag/
│   │   │   ├── Tag.java ✅
│   │   │   ├── TagRepository.java ✅
│   │   │   ├── TagService.java ✅
│   │   │   └── TagController.java ✅
│   │   ├── search/     ✅ SearchController/SearchService（$text 可見性搜尋，1.4）
│   │   ├── discovery/  (空目錄 — 未實作，LLM discovery deferred)
│   │   ├── audit/      (空目錄 — 未實作)
│   │   ├── auth/       ✅ CurrentUserProvider/AuthorizationService/MeController
│   │   │                  等 10 檔（dev-stub 身分＋授權矩陣，1.2）
│   │   ├── team/       ✅ Team/TeamService/TeamController（1.1）
│   │   ├── common/     (僅空子目錄 exception/、validation/ — 未實作)
│   │   ├── SkillMdApplication.java ✅
│   │   └── HealthController.java ✅
│   ├── src/main/resources/
│   │   └── application.yml ✅
│   ├── pom.xml ✅
│   ├── mvnw ✅
│   ├── .mvn/wrapper/
│   │   └── maven-wrapper.properties ✅
│   └── Dockerfile ✅
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── SkillsPage.tsx ✅
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   ├── SkillEditor.tsx ✅
│   │   │   │   └── MdxEditorWrapper.tsx ✅
│   │   │   ├── tree/
│   │   │   │   └── FolderTree.tsx ✅
│   │   │   └── dialog/
│   │   │       └── ConflictDialog.tsx ✅
│   │   ├── api/
│   │   │   └── api.ts ✅
│   │   ├── test/
│   │   │   ├── setup.ts ✅
│   │   │   └── ConflictDialog.test.tsx ✅
│   │   ├── App.tsx ✅
│   │   ├── main.tsx ✅
│   │   └── vite-env.d.ts ✅
│   ├── public/ ✅
│   ├── package.json ✅
│   ├── vite.config.ts ✅
│   ├── tsconfig.json ✅
│   ├── .env.example ✅
│   └── Dockerfile ✅
├── docker-compose.yml ✅
├── keycloak-realm.json (retained for future use) ⚠️
├── setup.sh ✅
├── seed-data.sh ✅
├── README.md ✅
└── .gitignore ✅
```

---

## 🚀 Quick Start

```bash
cd ~/md-editor

# Setup and start all services
./setup.sh

# Seed test data (optional)
./seed-data.sh

# Access
# Frontend: http://localhost:5173
# Backend:  http://localhost:8080
# Swagger:  http://localhost:8080/swagger-ui.html
```

---

## 📋 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/skills` | Create skill |
| GET | `/api/skills` | List skills (paginated) |
| GET | `/api/skills/{id}` | Get skill detail |
| PUT | `/api/skills/{id}` | Update skill |
| DELETE | `/api/skills/{id}` | Soft delete |
| GET | `/api/skills/{id}/versions` | List versions |
| GET | `/api/skills/{id}/versions/{v}` | Get version detail |
| POST | `/api/skills/{id}/versions/{v}/restore` | Restore to version |
| GET | `/api/folders/tree` | Get folder tree |
| POST | `/api/folders` | Create folder |
| PATCH | `/api/folders/{id}/move` | Move folder |
| DELETE | `/api/folders/{id}` | Delete folder |
| GET | `/api/tags` | List tags |

---

**Status:** Marketplace Phase 0–4 complete ✅ (see docs/tasks/20260703-skill-marketplace.md)  
**Next:** LLM discovery 前端串接、Keycloak 接回（皆為原任務明確 deferred 項）
