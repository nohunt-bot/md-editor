# Task: 側欄層級修正——移到分頁列之下（版型 B 補完）

Status: in_progress (2026-07-11 — 派 sonnet，硬隔離 worktree)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/sidebar-layout
> （branch wt/sidebar-layout）。agent 不 commit；commander 驗收（測試＋
> 截圖走查）後代提，結案併入 merge commit。

## 問題（使用者提出＋commander 截圖實證）
GUI-1 把側欄改成「只在 /team 顯示」但沒動它的版面位置：仍是 v1 的全高
左欄（app-shell 第一個 flex 子元素），從畫面最頂端開始，把 topbar 和
分頁列擠到右半邊。視覺層級和版型 B 顛倒——側欄看起來是全域的、分頁
只管右邊。側欄頂還掛著與分頁重複的「我的團隊」標題，內部留白鬆散。

## 修法拍板（commander 決）
- Shell 改三層直排：topbar（全寬）→ SpaceTabs（全寬）→ 內容列
  （/team 時 = 側欄＋main；其他路由 = main 全寬）
- topbar 左側補品牌字「Skill.md」（連到 /，兼作回門戶的唯一入口；
  現況離開門戶後沒有回去的路）
- 側欄內部：移除「我的團隊」標題列（分頁已表達）；團隊切換器置頂
  （小標「團隊」）；「＋新增資料夾」收進「資料夾」區塊標頭右側
  （viewer 閘控不變）；區塊間距收斂
- 側欄高度 = 內容列高度（不再全高）；空間色左緣細條可保留於側欄頂
  作為隸屬提示（可選，agent 依現有 token 樣式判斷）

## Acceptance criteria
- [ ] DOM 結構：tabs 在 sidebar 祖先層之上（全寬）；/team 內容列含側欄，
      其他路由無（測試沿用/更新既有 shell 測試）
- [ ] topbar 品牌字連到 /（測試）
- [ ] 側欄無重複標題；新增資料夾在資料夾區塊標頭；viewer 閘控保持
- [ ] `npx vitest run`、`npx tsc --noEmit` 全綠；不動後端
- [ ] main tree 全程乾淨；不 merge 不 push 不 commit

## Progress log
- 2026-07-11 | planning | 截圖實證層級顛倒；拍板三層直排＋品牌字＋側欄內部
  整理；建 worktree；派 sonnet
