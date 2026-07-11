# Task: GUI 改版 1/3 — 頂部空間分頁＋空間識別色（版型 B）

Status: done (2026-07-11 — sonnet 實作、commander 測試重跑＋真 stack 瀏覽器走查驗收、merge)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/gui-tabs
> （branch wt/gui-tabs）。commander 驗收（測試重跑＋審碼＋截圖走查），過關 merge。
> 使用者拍板（2026-07-11）：版型 B 為主、D 首頁第二步、空間識別色 OK、
> 卡片排列先維持但要可客製（→ GUI-2）。提案圖：claude.ai artifact
> 1fe3006f（four-layout-variants）。

## 目標
「我在哪」由頂層分頁直接回答：我的團隊｜開放空間｜我的收藏 三分頁；
側欄降為情境面板（只在團隊空間出現，內容=資料夾+tags）；空間識別色
藍/綠/琥珀貫穿分頁與頁首。

## 既有掛點（實碼已核）
- App.tsx:39-80 shell：Sidebar + topbar(GlobalSearch+新增) + routes
- Sidebar.tsx 三 zone（59/126/141 行）＋底部 UserMenu；TeamFilterContext 團隊切換
- 路由不變：/team /open /favorites /settings /skills/*

## 設計拍板（commander 決）
- 分頁列在 topbar 之下，NavLink 三項；active 帶各自空間色（底線+文字色）
- 側欄只在 /team 顯示（資料夾+tags+團隊切換器留在側欄頂）；其餘路由全寬
- UserMenu 從側欄底移到 topbar 右側（否則非團隊頁看不到身分）
- 空間色 CSS tokens：--space-team(#2563eb)/--space-open(#16a34a)/--space-fav(#d97706)，
  深色主題各給亮階版本
- 頁首色條：/team 藍、/open 綠、/favorites 琥珀；詳情頁 open+published 綠、
  否則藍
- 卡片/清單排列完全不動（GUI-2 才做客製化）

## Acceptance criteria
- [ ] 三分頁導航如上；active 分頁色正確；鍵盤焦點可見
- [ ] 側欄僅 /team 出現；UserMenu 移 topbar 後所有頁可用
- [ ] 空間色 token 化，深淺主題皆可讀
- [ ] `npm test`、`npx tsc --noEmit` 全綠（含既有 AppShell/Sidebar 測試修正）
- [ ] 不動後端；卡片排列不動
- [ ] main tree 全程乾淨；不 merge 不 push（未 commit 可接受，commander 代提）

## Progress log
- 2026-07-11 | planning | 使用者拍板 B+D；抽 shell/Sidebar/UserMenu 事實；
  建 worktree；派 sonnet
- 2026-07-11 | done | 實作 b7c4d36。驗收：vitest 83/83＋tsc 重跑 exit 0；
  真 stack 走查（mongo+worktree 前後端+seed）：/team 分頁+側欄+藍條、
  /open 全寬+綠、/favorites 琥珀+空狀態、詳情 open+published 綠條、
  深色主題（data-theme=dark）識別色亮階可讀。UserMenu topbar 下拉改朝下
  （agent 合理決定）。main tree 乾淨；agent 未 commit（慣例），commander 代提。
