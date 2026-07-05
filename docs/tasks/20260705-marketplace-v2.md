# Task: Marketplace v2 —— 分頁、發布版本凍結、讚/引用數、深色主題、WebSocket 在線提示

Status: done (2026-07-05 — Phase A-F 全數完成，已推 GitHub)

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

- [x] C1 Schema/後端：skill_likes unique compound、likeCount/copyCount
      denormalized（讚後由 countBySkillId 重算防漂移）、like/unlike endpoint
      （可見即可讚）、copy 遞增來源 copyCount、migration 附 counters 回填
      → 驗證：單元 2（冪等/遞減）+ 整合 like 流程（雙讚不重計/likedByMe/
      unlike 歸零/copy 遞增）全綠（真 Mongo）
- [x] C2 開放空間排序：sort=likes（likeCount desc、publishedAt 決勝）
      → 驗證：service 層排序邏輯 + 前端傳參測試
- [x] C3 前端：詳情 metadata 區讚 toggle（♥/♡+數字，likedByMe 種子）+
      「引用 n 次」；open 卡片 ♥ n · 引用 n；最新/最熱 chips（?sort=likes）
      → 驗證：vitest 35/35（新 2 測試）；tsc/build 0。live 走查併收尾輪

### Phase D — 深色主題（前端 only；STANDARD，~1d）

- [x] D1 tokens 深色值：[data-theme=dark] 全套覆蓋（accent 提亮為 #5b8def
      顧深底對比、--ok-soft 深色版、color-scheme: dark）
- [x] D2 切換器：useTheme hook（light/dark/system、localStorage、system 模式
      live 追蹤 prefers-color-scheme）+ 側欄「主題」三態 select；MDXEditor
      CSS 早已零 hex 全 token → 深色自動生效（2.1/2.5 的 TODO 自然關閉）
      → 驗證：vitest 38/38（useTheme 3 測試）、tsc/build 0；深色截圖過目
      （深底/亮藍 accent/層級完整）。空狀態與含資料頁對照併收尾輪

### Phase F — 多語系框架（i18n，使用者 2026-07-05 追加；排在 E 之前避免 E 新字串返工）

- [x] F1 框架建置：react-i18next + i18next（新依賴）；src/i18n config；
      zh-TW（預設）+ en 資源檔（9 命名空間）；<html lang> 同步；lang localStorage
      → 驗證：i18n.test 3（default/switch/interpolate）；tsc/build 0
- [x] F2 字串抽取：11 個 UI 檔全 t('...')；grep 殘留硬編中文＝0（範例值/
      識別符除外）；test setup 匯入 i18n 使 t() 解析；SkillsPage 空狀態斷言
      更新為新文案
      → 驗證：vitest 41/41
- [x] F3 語言切換器：側欄底部繁中/English 下拉（persist、mirror html lang）
      → 驗證：live 英文截圖確認全站切換（My Team/Open Space/Create your
      first skill…）

### Phase E — 在線提示 + 軟鎖（改採 DB 輪詢；使用者選型 2026-07-05）
> ⚠️ 選型變更：原規劃 WebSocket，使用者於討論後改 **DB 輪詢**（避開新 infra、
> 天生多實例相容）→ ADR 20260705-presence-db-poll-over-websocket。WS handler
> 一度寫好但未 commit，已整條移除。E 的新 UI 字串走 F 的 i18n。

- [x] E1 後端 presence：skill_presence collection（lastSeen TTL index 60s 自動
      清除）；`PUT /api/skills/{id}/presence`（心跳+讀取合一：upsert 自己、回
      其他在線編輯者 + 該 skill currentVersion）、`DELETE`（離開）；需 edit 權限；
      身分沿 dev-stub（Keycloak 接回只換 CurrentUserProvider）
      → 驗證：整合測試 presenceHeartbeat（兩人互見、版本漂移回報、viewer=403、
      leave 移除）全綠（真 Mongo）
- [x] E2 前端：usePresence hook 每 5s 輪詢；編輯器顯示「X 也在編輯」；
      currentVersion 超前載入版本時顯示「已被更新」警示（早於送出；409 樂觀鎖
      留最後防線）；錯誤靜默退化（回空、編輯照常）；離開 best-effort DELETE
      → 驗證：hook 單元 5 測試；live 雙身分走查——alice 編輯器顯示
      「admin is also editing」（截圖）
- [x] E3 明確不做：共同編輯、游標同步、即時合併——維持 OT/CRDT 排除（原 ADR）

### 收尾

- [x] 收尾 /retro：done-check（每 phase 閘門 + live 驗證證據見各 progress
      行）；ADR 落檔（publish-freeze、presence-db-poll）；教訓入
      ~/.claude/harness/LESSONS.md（live-E2E 抓 index/upsert bug）；README +
      IMPLEMENTATION_STATUS 同步；本檔 Status: done；最終 push
      → 驗證：git rev-parse HEAD origin/main 一致

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
- 2026-07-05 | C | done，commit aabf916（commander inline）。skill_likes +
  denormalized 計數 + like/unlike API + 最熱排序 + 前端 toggle/計數/chips +
  migration counters 回填。閘門：BE 全套 exit 0（ServiceTest 23→25、
  PublishIntegration 12→13）、FE tsc/build 0 vitest 35/35。已 push。
  下一步：Phase D 深色主題
- 2026-07-05 | D | done，commit f0f41ab（commander inline）。dark token
  overrides + useTheme + 三態切換器；編輯器 CSS 已全 token 化故自動相容。
  閘門：tsc/build 0、vitest 38/38、深色截圖確認。已 push。
  下一步：Phase E WebSocket 在線提示（最後一個 phase）
- 2026-07-05 | i18n + docs | 使用者回饋：介面殘餘英文 + 更新專案 markdown。
  掃出並 zh 化 FolderTree（No folders/All Skills/+New Folder/prompt）、
  ConflictDialog（衝突對話全部 6 處 + 測試斷言）、Sidebar「Tags」。順修
  folderApi.create 未帶 teamId 的既有 bug（後端 1.1 起要求；FolderTree 加
  teamId prop、無團隊時 disable）。README 全面改寫（功能總覽 / API 表 / 結構樹
  / v1+v2 階段）、IMPLEMENTATION_STATUS 加 v2 摘要。閘門：tsc/build 0、
  vitest 38/38（ConflictDialog 測試已更新）。全站 UI = zh-TW。
- 2026-07-05 | F | done，commit 720b370（commander inline）。使用者要真正的
  多語系框架：安裝 react-i18next（新依賴）、zh-TW+en 資源（9 命名空間）、11
  個 UI 檔字串全抽取為 t()、側欄語言切換器、test setup 初始化 i18n。
  ⚠️ 注意 SkillDetailPage 的 targetTeams.map((t)=>) 原本會遮蔽 i18n 的 t，
  已改名 tm。閘門：tsc/build 0、vitest 41/41、英文全站截圖確認。已 push。
  ★ Phase E（WebSocket）現在可在 i18n 基礎上開跑——E 新字串一律走 t()。
- 2026-07-05 | E | done，commit 5deb4de（commander inline）。★ 選型變更：
  使用者質疑「為何不用 DB lock 要 WebSocket」，討論後改 DB 輪詢（ADR
  presence-db-poll-over-websocket）；已寫好的 WS handler 整條移除、pom
  還原。skill_presence + TTL、PUT/DELETE presence endpoint、usePresence
  hook、編輯器在線提示 + 版本漂移警示。閘門：BE 全套 exit 0（Publish
  Integration 14 含 presence）、FE tsc/build 0 vitest 46/46。
  ⚠️★ live E2E 抓到單元/整合測試漏掉的 bug：presence 用 find-then-save +
  unique index，但 Spring Boot 預設關閉 auto-index-creation → 實跑累積重複列、
  findBySkillIdAndUserId 拋 IncorrectResultSize 500。改 MongoTemplate 原子
  upsert 根治。教訓：靠 unique index 去重的寫入，測試（每次清空 collection）
  不會暴露，必須 live 或 upsert。★ v2 全數完成（A-F + E）。已 push。

## Open questions

（無——兩個分岔已於規劃時拍板。）
