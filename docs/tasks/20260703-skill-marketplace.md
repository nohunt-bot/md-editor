# Task: 把 md-editor（Skill.md Service）發展成公司內部 skill marketplace——團隊空間 + 開放空間、發布/瀏覽/搜尋、淺色極簡前端

Status: active (2026-07-03)

> 執行協議：`~/.claude/harness/rules/long-tasks.md`。接手的 subagent 先讀本檔，
> 信任 Progress log 而非記憶，從第一個未打勾的步驟繼續。每個 phase 以
> `phase(marketplace): <step>` commit 收尾；檔案產出附 receipt
> （`bash ~/.claude/harness/scripts/receipt.sh <files>`）。
> 派工規則：`~/.claude/harness/rules/model-dispatch.md`；每條 dispatch prompt
> 含 Goal+why / Acceptance criteria / Report format 三件套。
> 背景資料：原始設計摘要 `docs/design/original-plan-summary.md`
> （全文在 `~/Documents/obsidian/Projects/mk-editor/plan.md` + `Plan Patch v0.2.md`）。
> **實作 spec：`docs/design/PRD.md`（v1.1，已覆核）——schema/API/前端架構/
> 操作手順以它為準；本檔管執行順序與驗證。**
> **MVP 不含 Keycloak**：身分走 CurrentUserProvider 抽象 + dev stub
> （docs/decisions/20260703-defer-keycloak-stub-identity.md）。

## Acceptance criteria

- [ ] Skill 具有 team 歸屬與 scope（`team`/`open`）、`draft`→`published` 狀態；
      發布到開放空間後全公司可讀，並可「複製到我的團隊」
- [ ] 進入 app 後不需任何點擊即可同時看到「我的團隊」與「開放空間」兩個入口；
      開放空間可搜尋/依 tag 篩選已發布 skill
- [ ] 編輯器 toolbar 僅：標題、粗/斜體、清單、連結、code block
      （無圖片/表格/underline）— 見 docs/decisions/20260703-editor-feature-reduction.md
- [ ] 前端為淺色極簡風，色彩/間距/字級收斂為 design tokens（CSS variables）
- [ ] 授權矩陣有整合測試：{本團隊 editor, 本團隊 viewer, 他團隊成員, admin}
      × {讀, 寫, 發布, 複製}——以 stub 身分實作，介面日後可換 Keycloak Provider
- [ ] `docker-compose up`（無 keycloak 服務）+ seed 後，能以兩個 dev 身分
      （team-a / team-b）演示跨團隊完整情境
- [ ] README / IMPLEMENTATION_STATUS.md / docs/schema.md 與程式碼一致

## Plan

步驟格式：`[ ] 編號 內容 → 驗證方式`；標注建議派工層級。
狀態記號：`[ ]` 待做 · `[~]` 進行中 · `[x]` 通過 · `[!]` 失敗（附 `(retry: N)`）。

### Phase 0 — 收斂現狀（先做，其他 phase 依賴乾淨基線）

- [x] 0.1 完成 Keycloak 移除並收斂 working tree（STANDARD）：現有未 commit
      變更（刪 `frontend/src/auth/keycloak.ts`、`DevSecurityConfig.java`）方向
      與決策一致，收尾而非 revert——後端 DevSecurityConfig 定稿（permit-all +
      stub 身分注入點）、前端移除 keycloak-js 相依與殘留引用、docker-compose
      移除 keycloak 服務、`keycloak-realm.json` 保留但 README 註明未啟用
      → 驗證：`git status --short` 乾淨；`./mvnw test` 與 `npm run build` 皆過；
      `docker-compose config` 無 keycloak 服務
- [x] 0.2 文件對齊程式碼（CHEAP 產出 + STANDARD 覆核）：IMPLEMENTATION_STATUS.md
      移除不存在的宣稱（SkillCard/SkillDetail/Sidebar/Home）；README 補上
      backend 實有的 search/discovery/audit/auth 套件、更新技術棧表
      （Auth 欄改為 dev stub / Keycloak deferred）
      → 驗證：fresh-context reviewer 對照 `find backend/src frontend/src` 清單逐項核對

### Phase 1 — 資料模型與 API（marketplace 核心）

- [x] 1.1 Schema 擴充（orchestrator）：`skills` 加 `teamId`、`scope: "team"|"open"`、
      `status: "draft"|"published"`、`publishedAt`、`sourceSkillId`（複製來源）；
      `folders` 加 `teamId`；沿用 v0.2 effective-scope 概念；既有資料 migration；
      同步更新 docs/schema.md
      → 驗證：backend 單元測試綠 + migration 在 seed 資料上跑過
- [!] 1.2 身分抽象與團隊授權（implementer in worktree + commander 閘門）(retry: 1)：`CurrentUserProvider` 介面
      （userId / teamIds / roles），MVP 提供 dev stub 實作（設定檔或 request
      header 指定身分）；注意：現有 api.ts 已硬編 `X-User-Id: user-123`，與
      PRD 的 `X-Dev-User` 命名不一致——1.2 時統一（建議照 PRD）；授權規則——團隊成員可寫本團隊 skill；`open`+`published`
      全員可讀；publish 需該團隊 editor 以上。`teamId` 語意 = 未來 Keycloak
      group id（公司 IdP 已確認有 groups），接回時只換 Provider 實作
      → 驗證：授權矩陣整合測試（Testcontainers，stub 身分）全綠
- [ ] 1.3 發布與複製 API（orchestrator）：`POST /api/skills/{id}/publish`、
      `DELETE /api/skills/{id}/publish`、`POST /api/skills/{id}/copy-to-team`
      → 驗證：整合測試——draft 對外不可見 / published 可見 / 複製後獨立演化且記 sourceSkillId
- [ ] 1.4 搜尋接可見性（orchestrator）：$text index（照原設計 MVP），
      結果按呼叫者可見範圍過濾
      → 驗證：整合測試——他團隊 draft 不出現在結果
- [ ] 1.5 Dev 身分與 seed 更新（STANDARD）：定義 demo 團隊（team-a/team-b）
      與 dev 使用者（stub，含 editor/viewer 角色）；seed-data.sh 產生兩團隊
      各自 skills + 數個已發布 open skills
      → 驗證：docker-compose up 後以兩個 dev 身分檢查可見性符合預期

### Phase 2 — 前端基礎重構（淺色極簡 + 資訊架構）

- [ ] 2.1 Design tokens（STANDARD，配合 frontend-design skill）：index.css 收斂為
      CSS variables（色彩/間距/字級/圓角），淺色底、清楚層級
      → 驗證：screenshot 對照設計檢查清單；使用者過目
- [ ] 2.2 App shell 與導覽（orchestrator）：左側欄固定兩區——「我的團隊」
      （團隊切換 + folder tree）與「開放空間」；頂部全域搜尋；dev 身分/團隊
      切換器（stub 階段的替代登入，dev 環境顯示）
      → 驗證：Playwright——進入 app 零點擊同時看到兩個入口
- [ ] 2.3 SkillsPage 重構（orchestrator）：清單/卡片、tag/folder 篩選、空狀態，
      全面套新 tokens
      → 驗證：Vitest 元件測試 + screenshot
- [ ] 2.4 SkillDetail 頁——新建（orchestrator）：rendered markdown、metadata
      （team/scope/status/版本）、版本歷史入口、發布/下架按鈕（依權限顯示）、
      open skill 顯示「複製到我的團隊」
      → 驗證：Vitest + Playwright 流程測試
- [ ] 2.5 編輯器精簡（STANDARD）：MDXEditor plugins 收斂為
      headings/bold/italic/lists/link/codeblock；移除 image/table/underline；
      顯示 draft/published 徽章
      → 驗證：toolbar 快照測試；貼上含 table 的 markdown 內容不損毀（原文保留）

### Phase 3 — 開放空間體驗

- [ ] 3.1 開放空間瀏覽頁（orchestrator）：最新發布、tag 篩選、搜尋結果
      → 驗證：Playwright——team-b 身分能找到 team-a 發布的 skill
- [ ] 3.2 發布流程 UI（orchestrator）：draft→published 確認 dialog、
      可見性 badge、unpublish
      → 驗證：Playwright 全流程
- [ ] 3.3 複製到團隊 UI（STANDARD）：確認 dialog（顯示目標團隊）、
      複製後導向自己團隊的新 skill
      → 驗證：Playwright 全流程

### Phase 4 — Polish 與總驗證

- [ ] 4.1 全站 loading/empty/error states（CHEAP，模式定型後批次套用）
      → 驗證：空資料/斷網情境 screenshot 清單
- [ ] 4.2 測試補齊（STANDARD）：後端授權矩陣全覆蓋；前端發布/複製/搜尋三主流程
      → 驗證：`./mvnw test` + `npm test` 全綠，覆蓋對照 acceptance criteria
- [ ] 4.3 E2E 冒煙（STANDARD）：docker-compose 全起，兩個 dev 身分跨團隊情境
      腳本走完
      → 驗證：腳本 exit 0 + 截圖存檔
- [ ] 4.4 文件同步 + /retro：README/IMPLEMENTATION_STATUS/schema.md 更新；
      跑 /retro 收尾，本檔改 Status: done
      → 驗證：fresh-context reviewer 核對文件與實況

### 明確不做（本任務範圍外）

**Keycloak 整合**（公司 IdP 已有 groups，`teamId` 直接對映 group id；上正式
環境前接回——見 decisions/20260703-defer-keycloak-stub-identity.md）、
LLM discovery 前端與 `/api/discovery/match` 串接（確認排在 marketplace 之後，
2026-07-03）、vector search、WebSocket 即時衝突偵測、發布審核流、評分/安裝數、
深色主題切換、對外公開網路、@reference autocomplete。

## Progress log

- 2026-07-03 | planning | 任務檔建立；現況掃描完成（backend 有
  search/discovery/audit 套件未記載於文件；frontend 實際僅
  SkillsPage/SkillEditor/FolderTree/ConflictDialog；working tree 髒——auth
  重構半途）；原始設計摘要落檔 docs/design/original-plan-summary.md
  （CHEAP subagent 產出，plan.md 611 行 + Plan Patch v0.2）
- 2026-07-03 | planning | 三個 open questions 由使用者回覆：Keycloak 排除於
  MVP（未 commit 變更收尾不 revert）、公司 Keycloak 有現成 groups、LLM
  discovery 排在 marketplace 之後。計畫更新：0.1/1.2/1.5/2.2 改走 dev stub
  身分；新 ADR defer-keycloak-stub-identity
- 2026-07-03 | planning | PRD v1.1 落檔 docs/design/PRD.md（schema、API、
  前端視覺架構、操作手順 F1-F6）。fresh-context TOP 覆核判 FIX-FIRST：
  1 blocker（F4 restore endpoint 未定義）+ 2 should-fix（admin 授權矩陣與
  API 註記矛盾）+ 3 nit——6 項全數修正後升 v1.1。實作 phase 以 PRD 為 spec
- 2026-07-03 | 0.1 | done，commit 0ac3359。keycloak-js/攔截器/SSO頁移除、
  SecurityConfig 本已 permitAll（DevSecurityConfig 冗餘、unstage）、compose
  本已無 keycloak。單元測試 6/6（exit 0）；⚠️ Docker 不可用，Testcontainers
  整合測試跳過（`-Dtest='!*IntegrationTest'`），4.3 前必補跑。npm build
  exit 0。commander 抽查：status 乾淨、grep keycloak 無殘留
- 2026-07-03 | 0.2 | CHEAP 產出 done，commit 033d373（README/
  IMPLEMENTATION_STATUS 對齊 code；Documents 路徑歸零，commander 抽查過）。
  STANDARD fresh-context 覆核進行中。⚠️ 教訓：0.2 agent 清 tree 時洗掉了
  任務檔未 commit 的進度標記——之後進度更新要即時 commit 或明示 stash
- 2026-07-03 | 0.2 | STANDARD 覆核判 FIX-FIRST（retry: 1）：抓到
  search/discovery/audit/common 為**空目錄**卻標 ✅（連最初 planning 掃描
  也誤判「backend 有這些套件」——實為空殼，特此更正）；hooks/stores 空目錄、
  README phase 清單不一致。6 項發現由 commander inline 修正（兩檔六處、
  行號明確，派工不划算）。覆核其餘 criteria 全 PASS，0.2 標 [x]
- 2026-07-04 | 1.1 | done，merge 22fd2b5（impl commit eb52965）。Skill/Folder
  新欄位+索引、team/ 套件+GET /api/teams、冪等 migration script、schema.md
  同步。implementer 自驗過；commander fresh-context 閘門重跑：單元測試
  exit 0、migration node --check OK。implementer 合理延伸：補 @Valid +
  MethodArgumentNotValidException handler（原碼未啟用 bean validation）。
  ⚠️ TRIPWIRE：orchestrator 在 implementer 完成後停住未跑閘門/合併，
  commander 手動收尾。1.2 起改「implementer in worktree + commander 閘門」
  等效管線（教訓待 4.4 retro 落 LESSONS.md）
- 2026-07-04 | 1.2 | [!] (retry: 1) PARK：implementer 於 87 次工具呼叫後撞
  **月度用量上限**中斷（"monthly spend limit"），worktree 無 commit、無未提交
  變更——無可搶救成果，worktree 已清除。非任務定義問題，是帳務資源阻斷：
  重派 subagent 會撞同一上限。解法只有使用者能做：raise limit
  （claude.ai/settings/usage）後，從本步驟重派（dispatch prompt 可沿用
  progress log 上一條所述 1.2 規格：CurrentUserProvider + dev stub +
  /api/me + 授權矩陣 + X-Dev-User 統一）。1.3-1.5 依賴 1.2，一併暫停

## Decisions

- 公司內跨團隊、開放空間 = scope `open`
  → docs/decisions/20260703-team-scope-via-keycloak-groups.md
- MVP 排除 Keycloak：CurrentUserProvider 抽象 + dev stub；teamId 語意 =
  未來 Keycloak group id
  → docs/decisions/20260703-defer-keycloak-stub-identity.md
- 編輯器收斂為文字+連結+code block，放棄原設計 table
  → docs/decisions/20260703-editor-feature-reduction.md
- MVP 深度 = 發布+瀏覽+搜尋；無審核、無評分（使用者拍板 2026-07-03；
  revisit：發布品質失控時加審核）
- 視覺基調 = 淺色極簡（使用者拍板 2026-07-03；tokens 設計不排除日後深色切換）
- scope 欄位沿用原 plan v0.2 的 scope/defaultScope 設計延伸，不另創
  visibility 欄位（降低與原設計的分歧面）

## Open questions

（2026-07-03 全數已回覆，記錄於 Progress log 與 Decisions；目前無未決問題。）
