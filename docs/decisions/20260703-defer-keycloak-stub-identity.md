# Decision: MVP 排除 Keycloak，身分以介面抽象 + dev stub 實作

- Date: 2026-07-03
- Task: docs/tasks/20260703-skill-marketplace.md
- Status: accepted（修正 20260703-team-scope-via-keycloak-groups.md 的實作時程；scope 決策不變）

## Context
使用者拍板「先不要 Keycloak，把這個排除在外」。working tree 上未 commit 的變更
（刪 `frontend/src/auth/keycloak.ts`、新增 `DevSecurityConfig.java`）本來就在往
拆除 Keycloak 的方向走。同時確認：公司 Keycloak 已有現成 groups 可當團隊。

## Decision
MVP 不整合 Keycloak。後端以身分抽象介面（CurrentUserProvider：userId /
teamIds / roles）+ dev stub 實作供應身分；前端以 dev 身分/團隊切換器替代登入。
`teamId` 欄位語意即未來的 Keycloak group id，接回時只換 Provider 實作。

## Alternatives rejected
- MVP 保留 Keycloak 整合 — 使用者明確排除；開發迴圈多一個重型服務。
- 不做身分抽象、直接寫死 dev 邏輯 — 之後接 Keycloak 要翻掉整個授權層。

## Consequences
- docker-compose 可移除 keycloak 服務；本地開發變輕。
- 授權矩陣測試針對介面寫，換 Provider 實作時測試不用重寫。
- keycloak-realm.json 與相關設定保留在 repo 供日後接回，README 註明未啟用。
- Revisit when: 要上正式環境或多人真實使用時，接回 Keycloak（groups 已確認存在）。
