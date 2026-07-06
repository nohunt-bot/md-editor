# Task: 更新 DB schema 文件至 v2 現況（docs/schema.md）

Status: done (2026-07-07 — sonnet 實作、硬隔離 worktree、commander 對照實碼驗收通過、merge)

> 派 sonnet，硬隔離 worktree：/Users/ch/md-editor-wt/docs-schema
> （branch wt/docs-schema，base 3578908）。commander 對照實碼驗收，過關 merge。
> **編輯既有文件**（非重寫）：保留現有 5 collection 的內容與風格，補上缺的。

## 問題
docs/schema.md 停在 v1，實際有 8 個 collection（實碼 @Document 確認），文件只記 5 個。

## 缺口（實碼已核）
1. 漏 `skill_likes`：{id, skillId, userId, createdAt(@CreatedDate)}；
   `@CompoundIndex (skillId,userId) unique`（宣告用）
2. 漏 `skill_presence`：{id, skillId, userId, lastSeen}；
   `@CompoundIndex (skillId,userId) unique` + `lastSeen @Indexed(expireAfterSeconds=60)` TTL
3. 漏 `user_preferences`：{userId(@Id 自然鍵), theme, language}；無額外 index
4. `skills` 少 `likeCount`、`copyCount`（Integer，可為 null；Skill.java:65-66）
5. 關聯圖沒有 likes/presence → skills、preferences（userId 獨立）
6. 未納入 guide 索引（docs/guide/README.md 文件地圖）

## 重要誠實點（必寫進文件）
- Spring auto-index-creation **關閉**（SkillService.java:178 註解證實）→ 上述
  `@CompoundIndex`/`@Indexed` **只是宣告，不會自動建立**。
- v2 migration（scripts/migrate-20260705-v2-freeze.js）只回填 publishedSnapshot +
  copyCount/likeCount 資料，**沒有建立** likes/presence 的 index。
- 因此 presence 冪等改由 app 層 atomic upsert 保證（MongoTemplate.upsert），
  非靠 unique index。文件要如實標註「宣告 vs 實際建立」的落差為已知缺口。

## Acceptance criteria
- [ ] docs/schema.md 補上 3 個 collection（欄位/index/規則/用途），格式同現有段落
- [ ] skills 段補 likeCount/copyCount
- [ ] Collections Overview 表 5→8 列；關聯圖補 likes/presence/preferences
- [ ] index 誠實標註「宣告（annotation）vs 實際建立（migration）」落差
- [ ] docs/guide/README.md 文件地圖加一列指向 ../schema.md（或註明位置）
- [ ] main tree 乾淨；純文件；對照實碼無杜撰

## Progress log
- 2026-07-07 | planning | 抽三實體全文 + 確認 auto-index-creation 關 + v2 migration
  未建 index；自建硬隔離 worktree；派 sonnet
- 2026-07-07 | done | sonnet commit 46be1bd。驗收：對照 SkillLike/SkillPresence/
  UserPreferences 實體全對、Overview 5→8 列、關聯圖補齊、誠實缺口段點出 likes 唯一性
  未由 DB 保證 + TTL 未生效改靠讀取時窗過濾。main tree 乾淨。commander merge。
