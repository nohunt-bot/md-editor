# Skill.md Service — 技術文件索引

這是公司內部的 **skill marketplace**：各團隊在自己的空間撰寫、維護
`SKILL.md`，成熟後發布到「開放空間」供全公司搜尋、瀏覽、複製回自己團隊使用。
可視為 AI agent 系統的 skill knowledge base。

本目錄（`docs/guide/`）是給**新加入的工程師**看的操作型文件：怎麼把服務跑起
來、怎麼「登入」、以及每個功能怎麼操作。規格與決策記錄不在這裡，見下方連結。

## 技術棧一覽

| 層 | 技術 |
|---|---|
| Frontend | React 18 + TypeScript + Vite（5173） |
| Editor | MDXEditor（精簡版 toolbar） |
| State | Zustand（規劃中，目前主要用 React state + Context） |
| Backend | Spring Boot 3.x（Java 17），port 8080 |
| Database | MongoDB 7.x，port 27017 |
| Auth | **Dev-stub**（`X-Dev-User` header）。Keycloak 為 deferred，尚未接回 |

## 系統架構（簡易流程圖）

以下用純文字表示請求怎麼從瀏覽器一路走到資料庫：

```
┌─────────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│      Browser         │        │      後端 API       │        │     MongoDB        │
│  前端 (Vite, :5173)   │ ─────▶ │  Spring Boot (:8080)│ ─────▶ │      (:27017)      │
└─────────────────────┘  HTTP + └──────────────────┘  driver └──────────────────┘
                        X-Dev-User header
```

## 文件地圖

| 文件 | 內容 | 適合誰 |
|---|---|---|
| [`setup.md`](./setup.md) | 啟動服務的設定：prerequisites、本機啟動步驟（mongo → backend → frontend → seed）、docker-compose 方式與已知問題、環境變數、健康檢查、關閉服務 | 第一次把服務跑起來的人 |
| [`login.md`](./login.md) | 身分模型：dev-stub 是什麼、`X-Dev-User` 怎麼運作、有哪些 dev users、怎麼切換身分（UI + curl）、admin 能做什麼、Keycloak 現況 | 要用不同身分測試功能的人 |
| [`user-flows.md`](./user-flows.md) | 逐步操作手順：瀏覽、建立/發布/下架、複製到團隊、版本歷史還原、讚/引用、資料夾、設定、在線提示等所有功能 | 要實際操作 UI 的人 |
| [`lifecycle.md`](./lifecycle.md) | 文件（skill）完整生命週期：每個狀態、每個轉換的欄位變化、可見性規則，對照 `SkillService.java` 逐行核實 | 要理解資料模型/狀態機、或要改後端邏輯的人 |
| [`authorization.md`](./authorization.md) | 權限（授權）設計：身分解析（dev-stub）、團隊角色 EDITOR/VIEWER 與全域 admin、四個授權檢查、403 vs 404 原則、操作×權限總表、複製到團隊的雙重授權，對照 `AuthorizationService`/`SkillService`/`FolderService` 核實 | 要理解授權規則、或要改權限邏輯的人 |
| [`schema.md`](./schema.md) | MongoDB 資料模型（v2）：八個 collection（teams/skills/folders/skill_versions/tags/skill_likes/skill_presence/user_preferences）的欄位、index、規則、關聯圖與 migration 記錄，含「index 宣告 vs 實際建立」的已知缺口說明 | 要理解資料模型、或要改 schema/migration 的人 |

## 其他參考文檔（非本目錄，規劃與決策向）

- 專案總覽：[`../../README.md`](../../README.md)
- 實作進度：[`../../IMPLEMENTATION_STATUS.md`](../../IMPLEMENTATION_STATUS.md)
- 規格書：[`../design/PRD.md`](../design/PRD.md)
- 決策記錄（ADR）：[`../decisions/`](../decisions/)
  - 身分為何是 dev-stub、Keycloak 為何 deferred：
    `20260703-defer-keycloak-stub-identity.md`
  - 發布版本凍結（embedded snapshot）：
    `20260705-publish-freeze-embedded-snapshot.md`
  - 在線提示為何用 DB 輪詢而非 WebSocket：
    `20260705-presence-db-poll-over-websocket.md`
  - 編輯器功能收斂：`20260703-editor-feature-reduction.md`
- 任務主檔：`../tasks/20260703-skill-marketplace.md`（v1）、
  `../tasks/20260705-marketplace-v2.md`（v2）

## 快速上手（三步驟，細節見 setup.md / login.md）

```bash
# 1. 啟動 mongo + backend + frontend（本機直跑法，見 setup.md）
docker run -d -p 27017:27017 --name mongo mongo:7
cd backend && ./mvnw spring-boot:run &          # http://localhost:8080
cd frontend && cp .env.example .env && npm install && npm run dev &  # http://localhost:5173

# 2. 灌入示範資料（跨團隊、dev-stub 身分）
./seed-data.sh

# 3. 打開瀏覽器 http://localhost:5173，或直接用 curl 帶 X-Dev-User 呼叫 API
curl -H 'X-Dev-User: alice' 'http://localhost:8080/api/skills?teamId=team-a'
```

> 目前沒有登入頁面、沒有密碼——身分是靠 `X-Dev-User` header 決定的
> dev-stub。詳見 `login.md`。
