# Task: 複製到團隊流程 UX 修正（4 項）

Status: active (2026-07-05)

> 派工 sonnet（worktree，pin base 6b332c9），commander 驗收（閘門 + live +
> UI/UX 合理性）。i18n 走 t()。

## 背景
發布到開放空間不會把 skill 移出團隊（teamId 不變、scope=open）。所以已發布
skill 同時在「團隊清單」與「開放空間」。複製到團隊只對「別團隊」的 skill 有意義。

## Acceptance criteria（4 項）

- [ ] 1. 「複製到我的團隊」在**你已是該 skill 團隊成員**時隱藏（複製進自己團隊
     只會產生重複）。canCopy = open+published ∧ 已登入 ∧ 非該團隊成員。admin
     非真實成員→仍可見。
- [ ] 2. 無可編輯團隊時，複製按鈕的 disabled 狀態要有**說明**（tooltip/小字
     「需要團隊編輯權限」）。
- [ ] 3. 開放空間卡片加**快速複製**入口（僅在可複製條件成立時顯示）：單一團隊
     直接複製→導向新 skill；多團隊→小的選團隊 modal（重用 Modal 元件）。
     複製後導向新 skill 詳情。
- [ ] 4. scope 標示更清楚：詳情頁 open+published 顯示「團隊 + 開放空間」而非
     只有「開放空間」，讓「發布後仍屬團隊」一目了然。
- [ ] 全數 i18n（zh-TW + en）；tsc/build/vitest 綠；不回歸既有測試。

## Plan（給 implementer）

- [ ] 1 SkillDetailPage：canCopy 排除「已是 skill.teamId 成員」；保留 admin。
- [ ] 2 SkillDetailPage：targetTeams 空時，複製鈕加 title 提示 + 視覺說明。
- [ ] 3 OpenSpacePage：卡片加複製按鈕（stopPropagation 不觸發卡片導航）；
     抽共用複製邏輯（single→直接、multi→Modal 選團隊）。可抽 useCopyToTeam hook
     或共用元件，避免與詳情頁重複。
- [ ] 4 SkillDetailPage：scope dd 顯示 open+published→「團隊 + 開放空間」。

## Decisions
- 複製只對「非本團隊成員」有意義（發布後 skill 仍在本團隊，成員無需複製）。
- 卡片快速複製沿用詳情頁同一套邏輯，避免行為分歧。

## Progress log
- 2026-07-05 | planning | 四項界定；派 sonnet worktree（pin base 6b332c9）

## Open questions
（無）
