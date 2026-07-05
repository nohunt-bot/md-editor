# Task: 補完半成品功能 —— 版本還原 / 伺服器端篩選 / references 解析

Status: done (2026-07-05 — 三者補完並推 GitHub)

> 三個「寫路徑通、讀/UI 半成」的功能補完。commander inline；每步閘門 + 若涉
> UI 則 live 截圖；分別 commit + push。

## Acceptance criteria

- [ ] 版本還原：後端改用 CurrentUserProvider（棄 X-User-Id）；前端版本歷史
      每列可「還原」（editor+，確認 dialog），還原後導回詳情、版本+1
- [ ] 伺服器端團隊清單篩選：folder/tag/q 傳後端過濾（跨頁正確），移除只作用
      當前頁的前端過濾
- [ ] references/prerequisites 解析：SkillResponse 回填被引用 skill 的
      name/displayName（不再 List.of()）；authoring picker UI 維持 deferred（記明）
- [ ] 各步：後端測試（含整合）綠、前端 tsc/build/vitest 綠

## Plan

- [ ] 1 版本還原（後端 header 修 + 前端還原 UI）
      → 驗證：整合測試 restore 用 X-Dev-User；Playwright 還原流程
- [ ] 2 伺服器端篩選（team list 接 folder/tag/q）
      → 驗證：整合測試跨頁篩選；前端改傳參、移除 client filter
- [ ] 3 references 解析（後端回填 name/displayName）
      → 驗證：整合測試（手動設 reference 後 GET 回填）；picker UI deferred 記明

## Decisions

- references authoring UI（@picker）維持 deferred——本輪只補「讀路徑」解析，
  完成後端契約；寫入已由 DTO 支援。
- 版本還原授權已在 VersionService（requireResourceEditable），只修 Controller
  身分來源。

## Progress log

- 2026-07-05 | planning | 盤點確認三者皆「寫通讀半」；VersionService 授權已具、
  DTO 已收 references；範圍定案
- 2026-07-05 | 1 版本還原 | done，commit cbdc7d5。★ 抓到真 bug：SkillService
  從沒呼叫 createVersion → 版本歷史一直空、restore 無標的。補：create 存 v1、
  每次 update 存快照；Controller 改 CurrentUserProvider（棄 X-User-Id）；前端
  版本列加還原（editor+、非當前版、確認 dialog）。BE 新增 VersionRestore
  Integration（roundtrip+viewer 403）+ 既有全綠；FE vitest 50。
- 2026-07-05 | 2 伺服器端篩選 | done，commit 212f88a。list 端點接 folderId/
  tag/q（MongoTemplate + 分頁 count），前端傳參 + debounce 搜尋 + 移除
  client filter；空狀態用 filterActive 區分「無符合」vs「零 skill」。BE 新增
  跨頁 tag 篩選整合測試。
- 2026-07-05 | 3 references 解析 | done。★ 又一同款半成品：createSkill 收 DTO
  references 但沒存。補寫路徑（create/update 存）+ 讀路徑（批次解析 name/
  displayName 避 N+1）。BE 新增 references_resolvedOnRead 整合測試；全套後端
  exit 0。picker authoring UI 維持 deferred（記明）。

## Open questions
（無）
