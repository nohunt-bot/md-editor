# Skill.md Service

一個團隊共享的 Skill.md 編輯與管理服務，作為 AI agent 系統的 skill knowledge base。

## 快速開始

### 本地開發（需要 Docker）

```bash
cd ~/Documents/md-editor

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
- Keycloak: http://localhost:8081 (admin/admin)

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
| Auth | Keycloak |

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
│       └── audit/    # Audit logging
├── frontend/         # React app
│   └── src/
│       ├── pages/    # Route components
│       ├── components/
│       │   ├── editor/
│       │   ├── tree/
│       │   ├── version/
│       │   └── common/
│       ├── api/      # OpenAPI generated client
│       ├── hooks/
│       ├── stores/   # Zustand stores
│       └── auth/     # Keycloak integration
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
- [ ] Phase 1: MVP CRUD
- [ ] Phase 2: 編輯體驗 (MDXEditor)
- [ ] Phase 3: 版本與權限
- [ ] Phase 4: LLM Discovery
- [ ] Phase 5: Polish

## 參考文檔

完整設計文檔：`~/Documents/obsidian/Projects/mk-editor/plan.md`
