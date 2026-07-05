# 啟動服務的設定（Setup）

本文件說明如何在本機把 Skill.md Service 完整跑起來：MongoDB、Spring Boot
後端、React 前端，以及灌入跨團隊示範資料。

> **目前建議走「本機直跑」路線（下方方法 A）。** `docker-compose up --build`
> 在本機環境會因為 Docker credential-helper 問題而失敗（見下方「已知問題」）。
> `docker-compose` 仍是專案設計上「打算」使用的方式，這裡兩種都記錄。

## Prerequisites

| 工具 | 版本 | 用途 | 檢查指令 |
|---|---|---|---|
| Docker | 任意近期版本 | 跑 MongoDB 容器 | `docker --version` |
| Java | 17+ | 跑後端（Spring Boot 3.x） | `java -version` |
| Node.js | 建議 18+（Vite 5、React 18 需求） | 跑前端 | `node -v` |
| npm | 隨 Node 附帶 | 安裝前端依賴 | `npm -v` |
| Maven wrapper（`./mvnw`） | 已隨 repo 附帶 | 免裝 Maven 就能跑後端 | 位於 `backend/mvnw` |
| mongosh（選用但建議） | 任意近期版本 | 讓 `seed-data.sh` 能建立 team-a / team-b | `mongosh --version` |

以上對應 `setup.sh` 的檢查邏輯（`command -v docker`、`docker-compose`、
`java`）與 `backend/pom.xml` 的 `<java.version>17</java.version>`。

## 方法 A：本機直跑（目前推薦）

依序啟動：MongoDB → 後端 → 前端 → 灌資料。整體順序如下：

```
[啟動 MongoDB (:27017)]
          │
          ▼
[啟動後端 (:8080)]
          │
          ▼
[等 /api/health = OK]
          │
          ▼
[啟動前端 (:5173)]
          │
          ▼
[執行 seed-data.sh]
          │
          ▼
[開 http://localhost:5173]
```

### 1. 啟動 MongoDB

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

- Port：`27017`（對應 `backend/src/main/resources/application.yml` 的
  `spring.data.mongodb.uri: mongodb://localhost:27017/skillmd`）
- 資料庫名稱：`skillmd`

### 2. 啟動後端

```bash
cd backend
./mvnw spring-boot:run
```

- Port：`8080`（`application.yml` 的 `server.port: 8080`）
- Swagger UI：http://localhost:8080/swagger-ui.html
- 後端啟動時會用 `application.yml` 內建的 `app.dev-users` 設定
  （alice / bob / carol / admin），細節見 `login.md`。

若想改用系統安裝的 Maven：`mvn spring-boot:run`（效果相同）。

### 3. 啟動前端

另開一個 terminal：

```bash
cd frontend
cp .env.example .env      # 建立本機環境變數（見下方「環境變數」）
npm install
npm run dev
```

- Port：`5173`（Vite 預設）
- 開啟 http://localhost:5173

### 4. 灌入跨團隊示範資料

**前提：後端必須已啟動且 `/api/health` 回應 OK。**

```bash
until curl -sf http://localhost:8080/api/health; do sleep 1; done
./seed-data.sh
```

`seed-data.sh` 做的事（讀自腳本本身）：

1. 若本機有 `mongosh`：先跑 `scripts/migrate-20260703-marketplace.js`（這支
   migration 會 seed `team-a`／`team-b` 兩個團隊、幫 `skills`/`folders`
   補上 marketplace 欄位），接著把 `team-a`/`team-b` 的 `displayName` 設為
   「平台團隊」/「資料團隊」。
   - **若沒有 `mongosh`，腳本會印警告並跳過 migration/team seed**，直接假設
     teams 已存在——這種情況下後續建立 skill 的 API 呼叫可能因為
     `teamId` 不存在而失敗。**強烈建議安裝 `mongosh`**，或先手動執行過一次
     migration。
2. 透過 REST API（帶 `X-Dev-User` + `X-User-Id` header）以 `alice`
   （team-a／editor）與 `carol`（team-b／editor）身分各建立數個 skill，
   並發布其中一部分到開放空間，刻意保留至少一份 draft（驗證草稿不跨團隊
   可見）。
3. 支援 `--reset` 參數：清空 `skills`/`folders`/`tags`（teams 保留）後重灌，
   方便重跑示範。

```bash
./seed-data.sh --reset   # 需要乾淨重灌時
```

灌完後可驗證：

```bash
# alice 看 team-a 的 skills（含 draft）
curl -H 'X-Dev-User: alice' 'http://localhost:8080/api/skills?teamId=team-a'
# carol 看 team-b 的 skills
curl -H 'X-Dev-User: carol' 'http://localhost:8080/api/skills?teamId=team-b'
# 任何身分都看得到開放空間（已發布的 skills）
curl -H 'X-Dev-User: bob' 'http://localhost:8080/api/skills?view=open'
```

## 方法 B：docker-compose（設計上的方式，目前有已知問題）

`docker-compose.yml` 定義三個服務：`mongo`（27017）、`backend`（8080，
`SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/skillmd`）、`frontend`
（5173，`VITE_API_BASE=http://localhost:8080`）。設計上的啟動方式：

```bash
cp frontend/.env.example frontend/.env
docker-compose up -d
docker-compose logs -f
```

或使用附帶的 `setup.sh`（會順便檢查 prerequisites、補 Maven wrapper jar、
建立 `.env`）：

```bash
./setup.sh
```

### 已知問題：`docker-compose up --build` 在本機失敗

本機環境上執行 `docker-compose up --build`（或 `up -d`）會因為 Docker
credential-helper 問題失敗：

```
error getting credentials - err: exec: "docker-credential-desktop": executable file not found in $PATH
```

原因是 Docker CLI 設定（`~/.docker/config.json`）的
`credsStore: "desktop"` 指向的 helper 執行檔不在 `PATH` 上，導致
`docker-compose` 在 pull/build image 時卡在認證這步。

**Workaround：**

- 檢查 `~/.docker/config.json` 中的 `credsStore` 設定，確認
  `docker-credential-desktop`（或對應 helper）是否真的在 `PATH`
  （例如 Docker Desktop 未正確安裝或 PATH 未包含
  `/Applications/Docker.app/Contents/Resources/bin`）。
- 或暫時將 `credsStore` 移除／改成不需要 helper 的設定，讓 `docker` 直接用
  plaintext 儲存（僅本機開發環境考慮，勿用於有機敏 registry 認證的環境）。
- 在此問題排除前，**請直接使用上方「方法 A：本機直跑」**，它不經過
  docker-compose build，只用 `docker run` 起一個公開 image（`mongo:7`），
  不會觸發這個 credential-helper 路徑。

## 環境變數

前端環境變數在 `frontend/.env`（從 `frontend/.env.example` 複製）：

```bash
VITE_API_BASE=http://localhost:8080
```

- `VITE_API_BASE`：前端 API client（`frontend/src/api/api.ts`）呼叫後端的
  base URL，預設即為 `http://localhost:8080`（找不到環境變數時的
  fallback 也是這個值）。
- 目前 `.env.example` **只有這一個變數**，沒有殘留的 Keycloak 相關變數
  （`keycloak-realm.json` 檔案仍保留在 repo 根目錄供未來接回使用，但前端
  `.env.example` 已不含 `VITE_KEYCLOAK_*` 之類的設定）。若在較舊的分支或
  文件中看到 Keycloak 環境變數，那些已經是過時資訊——目前的身分機制是
  dev-stub（見 `login.md`）。

後端設定在 `backend/src/main/resources/application.yml`（無需另建
`.env`，直接改此檔或用 Spring 的環境變數覆寫）：

```yaml
server:
  port: 8080
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/skillmd
app:
  dev-users:
    alice: { display-name: Alice, admin: false, teams: { team-a: EDITOR } }
    bob:   { display-name: Bob,   admin: false, teams: { team-a: VIEWER } }
    carol: { display-name: Carol, admin: false, teams: { team-b: EDITOR } }
    admin: { display-name: Admin, admin: true,  teams: {} }
```

## 驗證服務是否正常（健康檢查）

```bash
curl -sf http://localhost:8080/api/health
# → "OK"（200）
```

對應 `backend/src/main/java/com/company/skillmd/HealthController.java`：

```java
@GetMapping("/api/health")
public ResponseEntity<String> health() {
    return ResponseEntity.ok("OK");
}
```

前端存活確認：瀏覽器開 http://localhost:5173，應可看到側欄（我的團隊 /
開放空間兩區）。若後端尚未啟動，`useIdentity` 會 catch `/api/me` 的失敗、
把 `identity.offline` 設為 true，畫面仍會渲染（不會白屏），但團隊清單會是空的。

Swagger／OpenAPI 文件：http://localhost:8080/swagger-ui.html

## 打包（選用）

```bash
cd backend
./mvnw clean package -DskipTests
```

## 關閉服務（Teardown）

**本機直跑法：**

```bash
# 前端/後端：在各自 terminal 按 Ctrl+C
docker stop mongo && docker rm mongo   # 若不需要保留資料
```

**docker-compose 法（若已修好 credential 問題並用它啟動）：**

```bash
docker-compose down          # 停止並移除容器，保留 volume（mongo 資料還在）
docker-compose down -v       # 連同 volume 一起清掉（Mongo 資料全清空）
```
