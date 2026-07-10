# Task: 複製件的來源更新提示（T1-3）

Status: in_progress (2026-07-11 — 派 sonnet，硬隔離 worktree)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/source-hint
> （branch wt/source-hint）。commander 對照實碼驗收，過關 merge。

## 問題（實碼已核）
複製到團隊後獨立演化（設計決定），但複製方**不知道來源已更新**。
且詳情頁目前完全沒顯示來源：SkillResponse 有 sourceSkillId（dto:16）但前端
未使用；PRD §8「來源已不存在」顯示也未實作。

## 既有掛點
- copyToTeam 設 sourceSkillId（SkillService.java:354）、copy.createdAt = 複製時間
- 來源每次 publish 會更新 publishedAt → source.publishedAt > copy.createdAt
  即「複製後來源又發布過」
- 團隊名解析：TeamService.resolveDisplayNames（SearchService.java:87 用法）
- 詳情 metadata 側欄：SkillDetailPage.tsx ~260-290 的 dl/dt/dd 列

## 設計拍板（commander 決）
- 只在**詳情端點**解析來源（清單不得多查，避免 N+1）
- 可見性：來源目前 open+published → 顯示（名稱、團隊、是否已更新）；
  來源被刪/下架/私有 → 只顯示「來源已不存在或不可見」（不洩漏更多）
- SkillResponse 加 nested `source` 物件（detail-only，其餘端點 null）

## Acceptance criteria
- [ ] 後端：詳情回應含 source 資訊（available、displayName、teamDisplayName、
      updatedSinceCopy=source.publishedAt>copy.createdAt）；非詳情端點不解析
- [ ] 後端測試：可見未更新／可見已更新／來源已刪／來源已下架 四情境
- [ ] 前端：詳情 metadata 側欄顯示「複製自 …」列＋「來源已更新」badge＋
      連到來源詳情；不可見時顯示「來源已不存在」；雙語 i18n
- [ ] `./mvnw test`、`npm test`、`npx tsc --noEmit` 全綠
- [ ] main tree 全程乾淨；單一 commit；不 merge 不 push

## Progress log
- 2026-07-11 | planning | 抽實碼事實（copyToTeam 欄位、publishedAt 語意、
  詳情側欄結構、resolveDisplayNames）；建 worktree；派 sonnet
