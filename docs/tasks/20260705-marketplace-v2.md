# Task: Marketplace v2 —— 分頁、發布版本凍結、讚/引用數、深色主題、WebSocket 在線提示

Status: active (2026-07-05 使用者核准開跑)

> 執行協議沿用 v1（`docs/tasks/20260703-skill-marketplace.md` 驗證過的模式）：
> implementer in worktree + **pin base SHA（首要驗收條件）** + commander 在
> main 重跑閘門才合併；agent 死於 spend-limit 時 commander 搶救/inline；
> 每 phase 結束 push origin main。spec 基準：`docs/design/PRD.md` + 本檔。
> 前置決策（使用者 2026-07-05 拍板）：WebSocket 範圍＝**在線提示+軟鎖**
> （不做 OT/CRDT 共編，維持原設計決策）；評分形式＝**讚（like）**。

## Acceptance criteria（總）

- [ ] 團隊清單與開放空間皆可分頁瀏覽（>20 筆時），頁碼狀態清楚
- [ ] 已發布 skill 對非團隊成員呈現**發布當下的凍結版**；團隊再編輯不外洩，
      重新發布才更新；團隊成員看得到「有未發布更新」的提示
- [ ] 任何登入者可對 skill 按讚/收回讚（每人一票）；卡片與詳情顯示讚數與
      被引用數（被 copy-to-team 的次數）；開放空間可依「最新/最熱」排序
- [ ] 深色主題可切換（預設跟隨系統），兩主題下全站可讀、token 驅動、無硬編色
- [ ] 兩人同開一份 skill 編輯時，彼此即時看到「◯◯ 正在編輯」提示；一方儲存
      後另一方**立即**（非儲存時才發現）收到版本已變的警示
- [ ] 每 phase：後端 `./mvnw test`（含整合）+ 前端 build/tsc/vitest 全綠；
      關鍵流程 live 走查；合併後 push，遠端 HEAD=本地 HEAD

## Plan

### Phase A — 分頁 UI（快贏；CHEAP-STANDARD，~0.5-1d）

- [x] A1 後端確認：Page 序列化已外露 totalPages/totalElements；integration
      test 鎖住契約（25 筆→2 頁、第二頁 numberOfElements=5）
      → 驗證：SkillControllerIntegrationTest 5/5（真 Mongo）
- [x] A2 前端分頁元件（共用 Pagination）：接上 SkillsPage（teamId 變更 reset）
      與 OpenSpacePage（q/tag 變更 reset）；單頁時隱藏
      → 驗證：vitest 31/31（含 Pagination 3 測試）；tsc/build 0；
      已知限制記於程式碼註解——團隊清單側欄篩選仍為前端過濾（backlog）

### Phase B — 發布版本凍結（核心語意變更；orchestrator 級，~2-3d）

- [x] B1 決策落檔：ADR 20260705-publish-freeze-embedded-snapshot（內嵌
      snapshot over 版本指標 join——版本指標另有 versions 保留策略懸空引用
      風險）+ schema.md 同步
- [x] B2 後端：publish/re-publish 重建 snapshot；非成員 detail 走
      toFrozenResponse、open 清單與 open 搜尋 bucket 走 snapshot metadata
      （pre-migration fallback live）；SkillResponse 加 publishedVersion；
      冪等 migration scripts/migrate-20260705-v2-freeze.js
      → 驗證：單元 2 新測試（freeze/雙視角）+ 整合 freeze 流程（alice 發布→
      編輯→carol 看舊→re-publish→carol 看新）全綠（真 Mongo，套件 exit 0）
- [x] B3 前端：非成員版本列標「（發布版）」；成員 currentVersion >
      publishedVersion 時顯示「有未發布的更新（開放空間仍顯示 vN）」+
      重新發布按鈕（沿用 publish confirm dialog）
      → 驗證：vitest 2 新情境（33/33）；tsc/build 0。live 走查併 F1 收尾輪

### Phase C — 讚 + 引用數（STANDARD，~1.5-2d）

- [ ] C1 Schema/後端：`skill_likes {skillId, userId, createdAt}` unique
      compound；skills 加 denormalized `likeCount`、`copyCount`；
      `PUT/DELETE /api/skills/{id}/like`（冪等）；copy-to-team 時 copyCount+1；
      migration 以 sourceSkillId aggregate 回填 copyCount
      → 驗證：整合測試——重複讚不重計、收回讚遞減、copy 遞增
- [ ] C2 開放空間排序：`sort=publishedAt|likes`（預設最新）
      → 驗證：整合測試排序正確
- [ ] C3 前端：詳情動作區讚 toggle（♥/♡ + 數字）；卡片 footer 顯示 ♥ n ·
      引用 n；開放空間「最新/最熱」切換 chips
      → 驗證：vitest + live 走查（alice 讚 carol 的 skill、排序改變）

### Phase D — 深色主題（前端 only；STANDARD，~1d）

- [ ] D1 tokens 深色值：index.css `[data-theme="dark"]` 全套覆蓋（bg/text/
      border/semantic/--ok-soft/--accent-contrast）；對比度抽查（本文對背景
      ≥ 4.5:1）
- [ ] D2 切換器：側欄底部 淺/深/跟隨系統 三態（localStorage `theme`，預設
      system，用 prefers-color-scheme）；MDXEditor 深色 pass（2.5 留的
      TODO 一併清）
      → 驗證：兩主題 × {/team, /open, 詳情, 編輯器} 截圖對照；vitest 切換
      persist

### Phase E — WebSocket 在線提示 + 軟鎖（最大工程；orchestrator 級，~3-5d）

- [ ] E1 後端 WS 基礎：spring-boot-starter-websocket；`/ws` endpoint；
      presence 協議——client 進編輯頁送 `editing:start {skillId}`、離開/逾時
      （30s heartbeat）自動清除；儲存成功後 server 廣播
      `skill:updated {skillId, version, editorId}`。身分沿 dev-stub
      （query param，設計為 Keycloak token 可直接替換——記入 ADR 接點）
      → 驗證：整合測試（WS client 模擬兩連線）——presence 廣播、逾時清除、
      updated 推播
- [ ] E2 前端：編輯器頂部在線提示（「⚠ carol 也在編輯」）；收到他人
      `skill:updated` 時**立即**顯示衝突橫幅（早於送出；現有 409 樂觀鎖流程
      保留為最後防線）；斷線自動重連、WS 不可用時靜默退化（功能照舊）
      → 驗證：vitest（mock WS）+ live 雙瀏覽器走查——A/B 同開、A 見 B 在線、
      B 儲存 A 立刻見警示
- [ ] E3 明確不做（本 phase 邊界）：共同編輯、游標/選取同步、內容即時合併
      ——維持原設計 ADR（OT/CRDT 排除）

### 收尾

- [ ] F1 /retro：done-check、新 ADR 檢查（B1、E1 身分接點）、LESSONS、
      本檔 Status: done、最終 push

## 順序依據（Decisions）

- A 最小快贏先行；B 在 C 前——C 的「最熱」排序與 B 都動開放空間查詢，先定
  凍結語意避免返工；D 獨立、置於 C 後給使用者可見變化；E 工程最大且有新
  infra（WS），最後做，失敗不拖累其他交付。
- B 採內嵌 snapshot（讀取簡單）over version join（省空間）→ B1 落 ADR。
- E 範圍＝在線提示+軟鎖（使用者拍板 2026-07-05；OT/CRDT 維持排除）。
- C 評分＝讚制（使用者拍板 2026-07-05）；引用數 denormalize（copyCount）
  以免清單 N+1 aggregate。

## Progress log

- 2026-07-05 | planning | 任務檔建立；兩個範圍決策由使用者拍板（WS=軟鎖、
  評分=讚）；五 phase 排序含依據；等核准開跑
- 2026-07-05 | A | done，commit 76fb415（commander inline——沿 v1 教訓不再
  重派進 spend-limit 牆）。共用 Pagination + 兩清單接線 + 分頁契約整合測試
  （25 筆→2 頁）。閘門：FE tsc/build 0、vitest 31/31；BE 全套含整合 exit 0
  （SkillControllerIntegrationTest 4→5）。已 push。下一步：Phase B 凍結
  （先落 B1 ADR）
- 2026-07-05 | B | done，commit 6cefeae（commander inline）。ADR+schema、
  entity snapshot、publish 凍結、非成員三讀取路徑（detail/open 清單/open
  搜尋）snapshot 化、前端凍結視角+重新發布提示、冪等 migration。閘門：BE
  全套 exit 0（ServiceTest 21→23、PublishIntegration 11→12 含完整 freeze
  流程）、FE tsc/build 0 vitest 33/33、migration node --check OK。已 push。
  下一步：Phase C 讚+引用數

## Open questions

（無——兩個分岔已於規劃時拍板。）
