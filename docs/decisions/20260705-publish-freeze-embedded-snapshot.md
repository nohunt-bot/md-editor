# Decision: 發布凍結採內嵌 publishedSnapshot over 版本指標 join

- Date: 2026-07-05
- Task: docs/tasks/20260705-marketplace-v2.md (Phase B)
- Status: accepted

## Context
v1 的開放空間讀「最新內容」：已發布 skill 再編輯會即時外洩未完成的修改
（PRD §9 已預留凍結為未來項）。v2 要求非團隊成員永遠看到發布當下的版本，
重新發布才更新。凍結內容的存放有兩種做法。

## Decision
`skills` 內嵌 `publishedSnapshot { displayName, description, content, tags,
version }` + `publishedVersion` 欄位。publish/re-publish 時以當下內容重建
snapshot；非成員的 detail／open 清單／搜尋一律讀 snapshot 欄位；團隊成員與
admin 讀最新。unpublish 後 snapshot 保留（不可見，重新發布可刷新）。

## Alternatives rejected
- 版本指標（`publishedVersion` → join `skill_versions` snapshot）——省儲存
  空間，但開放空間清單/搜尋每列都要多一次 versions 查詢（N+1 或 $lookup），
  且 skill_versions 的保留策略（原設計：50 版+月度清理）將來可能刪掉被指標
  引用的版本，形成懸空引用。
- 不凍結、維持 v1 即時外洩——與本 phase 的目標直接矛盾。

## Consequences
- 讀取零 join、清單與詳情必然一致；代價＝已發布 skill 內容雙份儲存（可接受，
  文字量級）。
- migration：現有已發布 skills 以現行內容回填 snapshot（凍結點=migration 時）。
- Revisit when: 內容體積若大到儲存敏感（如附件內嵌），改回指標並給
  skill_versions 加引用保護。
