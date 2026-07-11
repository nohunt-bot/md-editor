# Task: 收藏＋最近瀏覽（T1-4）

Status: done (2026-07-11 — sonnet 實作（中途遇月上限中斷、SendMessage 續作）、
commander 重跑測試+審碼驗收通過、merge)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/favorites
> （branch wt/favorites）。commander 對照實碼驗收，過關 merge。

## 問題
開放空間長大後「上次看過的 skill」找不回來；沒有任何個人化書籤機制。
user_preferences collection 已存在（userId/theme/language），加欄位即可。

## 設計拍板（commander 決）
- UserPreferences += `favoriteSkillIds`、`recentSkillIds`（最近在前、cap 10）
- API 掛 MeController（沿用 atomic upsert 教訓，MeController.java:58 註解）：
  PUT/DELETE /api/me/favorites/{skillId}（加入需可見否則 404；移除冪等）、
  GET /api/me/favorites、POST /api/me/recent/{skillId}（best-effort）、
  GET /api/me/recent
- 解析回 metadata-only 摘要（不含 content），讀取時按目前可見性過濾
  （admin/成員，或 open+published——同 SearchService.java:64-71 規則）
- 前端：詳情頁 ★ 收藏 toggle（鄰近讚按鈕）；詳情載入成功後 fire-and-forget
  記 recent；新路由 /favorites（收藏＋最近瀏覽兩區）；Sidebar 加導航項

## Acceptance criteria
- [ ] 後端四端點如上；favorites 加入前驗證可見性；recent cap 10、重複上移
- [ ] 後端測試：加入/移除/清單可見性過濾、不可見加入 404、recent cap 與去重
- [ ] 前端：詳情 ★ toggle、/favorites 頁（含空狀態）、Sidebar 導航、雙語 i18n
- [ ] `./mvnw test`、`npm test`、`npx tsc --noEmit` 全綠
- [ ] main tree 全程乾淨；不 merge 不 push（未 commit 可接受，commander 代提）

## Progress log
- 2026-07-11 | planning | 抽實碼事實（MeController/UserPreferences、共用
  Sidebar、like pattern、visibility 規則）；建 worktree；派 sonnet
- 2026-07-11 | interrupted | agent 被月花費上限打斷（讀檔階段、無半成品）；
  使用者明令 commander 不得代做實作（只規劃/驗收，已入永久記憶）；
  SendMessage 讓原 agent 續作
- 2026-07-11 | done | 實作 2f1df72。驗收：commander 重跑 mvnw test（95）exit 0、
  vitest 81/81、tsc OK；FavoritesService 全原子操作、可見性同 SearchService
  規則、非成員讀凍結快照、讀取時過濾不改寫儲存清單、recent cap 10 去重上移
  皆有測試；main tree 乾淨。agent 依例不 commit，commander 代提後 merge。
