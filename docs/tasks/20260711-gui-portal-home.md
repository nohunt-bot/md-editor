# Task: GUI 改版 3/3 — 搜尋門戶首頁（版型 D）

Status: in_progress (2026-07-11 — 派 sonnet，硬隔離 worktree)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/gui-portal
> （branch wt/gui-portal）。commander 驗收（測試重跑＋走查），過關 merge。
> 使用者拍板：B 為主＋D 首頁。GUI-1/2 已 merge。

## 目標
`/` 不再 redirect 到 /team，改為極簡門戶：搜尋＋兩扇門（我的團隊/開放空間）
＋個人捷徑（我的收藏/最近瀏覽）。新人一眼懂全貌，回訪者一步到常用內容。

## 既有掛點（實碼已核）
- App.tsx route `/` = Navigate → 改 HomePage
- GlobalSearch.tsx:106 已有「查看全部」→ /open?q=；OpenSpacePage 讀 searchParams
- favoritesApi.list()/recent()（api.ts）回 metadata 摘要
- 空間色 token --space-team/--space-open/--space-fav；shell 分頁列全路由可見

## 設計拍板（commander 決）
- 門戶置中窄欄（~560px）：品牌字 → 大搜尋 → 兩張門卡 → 收藏/最近瀏覽 chips
- 搜尋：優先重用 GlobalSearch（hero 包裝樣式放大）；不可行則輸入框 Enter →
  /open?q=（沿用既有動線）
- 門卡：藍頂邊=我的團隊（顯示 active team 名）→ /team；綠頂邊=開放空間 → /open；
  無團隊者團隊卡顯示引導文案
- 捷徑列：收藏在前、最近瀏覽在後，各最多 5 個 chip → 詳情；皆空時不顯示該列
- 分頁列在 / 上無 active；topbar 新增鈕行為不變

## Acceptance criteria
- [ ] `/` 門戶如上；搜尋可用；門卡/捷徑導航正確
- [ ] 無收藏無紀錄時捷徑列優雅缺席；無團隊時門卡有引導
- [ ] 空間色僅用 token；深淺主題可讀；鍵盤可操作
- [ ] `npm test`、`npx tsc --noEmit` 全綠（新增 HomePage 測試）
- [ ] 不動後端；不動 /team /open /favorites 頁面本體
- [ ] main tree 全程乾淨；不 merge 不 push（未 commit 由 commander 代提）

## Progress log
- 2026-07-11 | planning | 抽掛點（/open?q= 動線、favoritesApi、空間色 token）；
  建 worktree；派 sonnet
