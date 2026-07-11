# Task: 拔掉 topbar 新增 Skill，建立入口移入 /team 頁首

Status: in_progress (2026-07-11 — 派 sonnet，硬隔離 worktree)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/newskill-header
> （branch wt/newskill-header）。agent 不 commit；commander 驗收後代提，
> 結案併入 merge commit。

## 問題（使用者提出）
三層直排後 topbar 右上的「＋新增 Skill」仍讓排版怪；使用者指示拔掉。
但不能留功能缺口——非空清單時 /team 需要有建立入口。

## 修法拍板（commander 決）
- App.tsx topbar：新增鈕整組移除（含三分支）；topbar 全路由一致 =
  品牌＋搜尋（/ 除外）＋UserMenu
- SkillsPage 頁首（team-a Skills 標題列，與篩選框/ViewToggle 同列）加入
  「＋新增 Skill」主按鈕：editor 可用；viewer/無團隊 disabled＋title
  （沿用既有 key 與 canEditActiveTeam）
- 空狀態按鈕保留

## Acceptance criteria
- [ ] 所有路由 topbar 無新增鈕（測試更新）；/team 頁首有（三分支測試搬家）
- [ ] `npx vitest run`、`npx tsc --noEmit` 全綠；不動後端
- [ ] main tree 乾淨；不 merge 不 push 不 commit

## Progress log
- 2026-07-11 | planning | 拍板移入頁首而非純刪除（保建立動線）；建 worktree；派工
