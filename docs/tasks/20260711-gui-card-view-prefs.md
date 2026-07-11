# Task: GUI 改版 2/3 — 卡片檢視客製化（排列＋密度偏好）

Status: in_progress (2026-07-11 — 派 sonnet，硬隔離 worktree)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/gui-cardprefs
> （branch wt/gui-cardprefs）。commander 驗收（測試重跑＋走查），過關 merge。
> 使用者拍板：卡片排列先維持現狀，但要能「透過客製化方式改變」。

## 問題（實碼已核）
- list/grid 切換只存在 /team（SkillsPage.tsx:14-37，localStorage
  `teamSkillsView`），/open 與 /favorites 是固定 grid，偏好不跨頁不跨裝置。
- user_preferences 已有 theme/language 的「localStorage 即時 + server 覆蓋」
  模式（App.tsx:28-37、MeController PUT atomic upsert）可直接沿用。

## 設計拍板（commander 決）
- 偏好兩軸：`cardView`（"list"|"grid"，預設 list）＋
  `cardDensity`（"comfortable"|"compact"，預設 comfortable）
- 存 user_preferences（PreferencesRequest/Response 加欄位，atomic upsert 不變）
- 三個清單頁（/team /open /favorites）共用同一組偏好；共用 ViewToggle 元件
  （排列切換＋密度切換）放在各頁頁首右側
- compact＝縮 padding、描述一行截斷；純 CSS class，不改卡片 DOM 結構
- 預設值＝現狀外觀（list+comfortable on /team、grid 頁維持其現有樣貌不變的
  遷移：/open /favorites 首次無偏好時維持 grid 顯示——以「未設定時各頁沿用
  現有預設」處理，設定後三頁一致）

## Acceptance criteria
- [ ] 後端 preferences 加 cardView/cardDensity（GET/PUT、atomic upsert、測試）
- [ ] 共用 ViewToggle 於三頁；偏好跨頁一致、重整不丟、跨裝置（server）生效
- [ ] compact 密度 CSS 生效且不改卡片結構；未設定時各頁外觀與現狀相同
- [ ] `./mvnw test`、`npm test`、`npx tsc --noEmit` 全綠
- [ ] main tree 全程乾淨；不 merge 不 push（未 commit 由 commander 代提）

## Progress log
- 2026-07-11 | planning | 抽實碼事實（VIEW_KEY localStorage、prefs 覆蓋模式）；
  建 worktree；派 sonnet
