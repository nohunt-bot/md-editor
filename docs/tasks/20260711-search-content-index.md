# Task: 全文搜尋納入 content ＋ 實體化宣告 index（T1-1）

Status: in_progress (2026-07-11 — 派 sonnet，硬隔離 worktree)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/search-content
> （branch wt/search-content）。commander 對照實碼驗收，過關 merge。

## 問題（實碼已核）
1. `Skill.java:29` 的 `content` 沒有 `@TextIndexed` → 搜尋只命中
   name/displayName/description/tags（20/23/26/37），內文搜不到。
2. Mongo 一個 collection 只能一個 text index → 必須 drop 舊的
   `skills_text_index`（migrate-20260703-marketplace.js:83-86 建立）再重建。
3. Spring auto-index-creation 關閉 → 改 annotation 不會生效，必須走 migration；
   整合測試自建 index（SearchVisibilityIntegrationTest.java:50-54 @BeforeEach）
   也要同步加 content。
4. 順帶收掉 docs/guide/schema.md「index 宣告 vs 實際建立」已知缺口：
   skill_likes (skillId,userId) unique、skill_presence (skillId,userId) unique
   ＋ lastSeen TTL 60s，宣告了但從未建立。

## Acceptance criteria
- [ ] Skill.content 加 @TextIndexed；annotation 與實際 index 權重一致
      （name/displayName 10、tags 8、description 5、content 1）
- [ ] scripts/migrate-20260711-search-content-indexes.js：drop+重建
      skills_text_index（含 content＋weights）、skill_likes/skill_presence
      unique index（先去重）、presence lastSeen TTL；風格同既有 migration、
      冪等、`node --check` 過
- [ ] SearchVisibilityIntegrationTest：setUp index 同步；新增「關鍵字只出現在
      content 也命中」測試
- [ ] SearchResultResponse 不得回傳 content（metadata-only 不變）
- [ ] `./mvnw test` 全綠
- [ ] docs/guide/schema.md：text index 欄位清單與缺口段更新（缺口由本 migration
      收掉，保留歷史脈絡）
- [ ] main tree 全程乾淨；單一 commit；不 merge 不 push

## Progress log
- 2026-07-11 | planning | 抽實碼事實（text index 建立點、測試自建 index、
  migration 慣例）；建 worktree；派 sonnet
