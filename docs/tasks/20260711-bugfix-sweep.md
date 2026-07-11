# Task: Bug 掃蕩修復（GUI 改版後）

Status: in_progress (2026-07-11 — 派 sonnet，硬隔離 worktree)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/bugfix-sweep
> （branch wt/bugfix-sweep）。commander 已完成真 stack 掃蕩並實證下列 4 項；
> agent 不 commit，commander 驗收後代提。

## Bug 清單（commander 實證）
1. 權限 UI：VIEWER 看到可點的「＋新增 Skill」（App.tsx 只檢查
   identity.activeTeamId）與側欄「＋新增資料夾」；後端 403 但 UI 不該給入口。
   開放空間複製鈕已有 disabled+「需要團隊編輯權限」正確模式可沿用；
   identity.activeTeam.role（useIdentity.ts:20,66）可判 EDITOR。
2. 視覺：ConflictDialog.tsx:59 與 VersionDiffDialog.tsx:76 的
   `useDarkTheme={true}` 硬編——淺色主題下 diff 面板深色。
3. UX：`/` 門戶同時出現 topbar 與 hero 兩個搜尋框；⌘K 雙監聽器靠註冊順序。
4. 清理：shell:browseAll（zh-TW.ts:26、en.ts:26）無人使用。

## 修法拍板（commander 決）
1. topbar 新增鈕：無團隊或角色非 EDITOR（且非 admin）→ disabled＋title
   沿用 selectTeamFirst 模式（新 i18n key「需要團隊編輯權限」可重用既有
   copy 鈕的 key）；側欄「＋新增資料夾」同樣角色閘控。
2. useTheme.ts 加 useResolvedTheme()：回傳 'light'|'dark'，監聽
   documentElement data-theme 變化（MutationObserver）；兩個 dialog 改
   useDarkTheme={resolved === 'dark'}。
3. AppShell：pathname === '/' 時不渲染 topbar GlobalSearch（hero 即搜尋）。
4. 刪 browseAll key（雙語）。

## Acceptance criteria
- [ ] viewer（bob）看不到可用的新增入口；editor（alice）不受影響（測試）
- [ ] 淺色模式 diff 亮、深色模式 diff 暗；主題切換即時反應（測試 hook）
- [ ] `/` 只有 hero 搜尋；其他路由 topbar 搜尋照舊（測試）
- [ ] grep browseAll = 0
- [ ] `npm test`、`npx tsc --noEmit` 全綠；不動後端
- [ ] main tree 全程乾淨；不 merge 不 push；不 commit（commander 代提）

## Progress log
- 2026-07-11 | planning | commander 真 stack 掃蕩（console、viewer 視角、
  ⌘K、清單檢視、UserMenu）；4 實證 bug、4 嫌疑排除；建 worktree；派 sonnet
