# Task: 版本歷史 diff 檢視（T1-2）

Status: done (2026-07-11 — sonnet 實作、commander 重跑測試+對照實碼驗收通過、merge)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/version-diff
> （branch wt/version-diff）。commander 對照實碼驗收，過關 merge。

## 問題（實碼已核）
PRD F4 承諾「選版本 → diff 檢視 → 還原」，但 diff 只存在於樂觀鎖的
ConflictDialog（react-diff-viewer-continued ^4.0.1 已是依賴）。版本歷史
（SkillDetailPage.tsx:369+ 行內清單）只能還原、看不出版本間改了什麼。
components/version/ 目錄存在但是空的。

## 既有掛點
- API 已齊：skillApi.getVersion(skillId, version)（api.ts:155，回單版本快照）、
  restoreVersion（:158）；SkillDetailPage 已有 doRestore/refreshVersions。
- diff 呈現方式照 ConflictDialog.tsx（ReactDiffViewer 用法、深色主題處理）。

## Acceptance criteria
- [ ] 新元件 components/version/VersionDiffDialog.tsx（+css +test）：
      左＝選定版本 content、右＝目前版本 content，標題標明版號
- [ ] 版本清單每列加「檢視差異」動作開啟 dialog；dialog 內含「還原到此版本」
      （接既有 restore 確認流程）
- [ ] i18n：zh-TW.ts 與 en.ts 都補 key，畫面無 hardcode 文案
- [ ] 深色主題下 diff 正常（同 ConflictDialog 的處理方式）
- [ ] `npm test` 全綠（含新元件測試）；`npx tsc --noEmit` 過
- [ ] 不動後端；不重排版本清單既有結構
- [ ] main tree 全程乾淨；單一 commit；不 merge 不 push

## Progress log
- 2026-07-11 | planning | 抽實碼事實（diff lib、API 掛點、空 version 目錄）；
  建 worktree；派 sonnet
- 2026-07-11 | done | sonnet commit b3db771。驗收：commander 重跑 npm test（67/67）
  ＋ tsc --noEmit exit 0、getVersion 回應形狀對照後端 VersionDetailResponse
  （snapshot.content）無誤、還原接既有 ConfirmDialog 非第二條路徑、檢視差異
  不受編輯權限限制（唯讀）而還原鈕維持 editable 閘控、深色主題與 ConflictDialog
  同法（useDarkTheme 硬編 true——淺色模式下 diff 面板仍深色為既有模式，非本次
  引入）、main tree 乾淨。merge。
