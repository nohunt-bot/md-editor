# Task: 「新增 Skill」按鈕收斂到團隊空間

Status: done (2026-07-11 — sonnet 實作、commander 測試重跑＋純前端實走驗收、merge 1e293c6)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/newskill-btn
> （branch wt/newskill-btn）。agent 不 commit，commander 驗收後代提，
> 任務檔結案併入 merge commit。

## 問題（使用者提出＋commander 盤點實證）
Topbar「＋新增 Skill」（App.tsx:78-96 三分支）在所有路由顯示：開放空間
（唯讀情境）、門戶（極簡）、收藏、設定、詳情全有；viewer 修過 bug #1 後
變成每頁一顆 disabled 灰按鈕，純噪音。/team 空狀態按鈕（SkillsPage:110）
是標準模式，保留。

## 修法拍板（commander 決）
- 「建立」跟著團隊空間走（與情境側欄同邏輯）：topbar 新增按鈕僅
  `pathname === '/team'` 渲染（三分支整組搬進條件，viewer 在 /team 仍見
  disabled＋提示）
- 其他路由 topbar 只剩搜尋＋UserMenu（/ 上連搜尋都沒有，僅 UserMenu）
- 空狀態按鈕不動

## Acceptance criteria
- [ ] /team 有按鈕（editor 可用、viewer disabled＋title、無團隊 disabled）；
      /open /favorites / /settings /skills/:id 皆無（測試）
- [ ] `npm test`、`npx tsc --noEmit` 全綠；不動後端
- [ ] main tree 全程乾淨；不 merge 不 push 不 commit

## Progress log
- 2026-07-11 | planning | 盤點入口（topbar 全路由＋空狀態）；建 worktree；派 sonnet
- 2026-07-11 | done | 實作 1e293c6。驗收：vitest 122/122＋tsc 重跑 exit 0；
  純前端實走 /team 有（英文 locale 曾一度誤判為缺）、/open 與 / 無
  （topbar 僅 UserMenu）；/favorites /settings /skills/:id 由 it.each 測試
  覆蓋。commander 代提，結案併入 merge commit（amend）。
