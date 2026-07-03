# Decision: 公司內跨團隊 marketplace（team = Keycloak group）over 對外公開平台

- Date: 2026-07-03
- Task: docs/tasks/20260703-skill-marketplace.md
- Status: accepted（實作時程由 20260703-defer-keycloak-stub-identity.md 修正：
  Keycloak 整合延後，MVP 用 dev stub；scope 與 team=group 的目標對映不變）

## Context
md-editor 要從團隊內部 Skill.md 編輯服務發展成 skill marketplace，需要決定「開放空間」的邊界。原設計（plan.md 1.3）明確排除 public sharing；現有 auth 是單一 Keycloak realm + 三個 realm roles（skill-admin/editor/viewer），沒有團隊概念。

## Decision
Marketplace 範圍為**公司內跨團隊**：team 對映 Keycloak group，「開放空間」= scope `open` 的已發布 skill，全公司登入者可讀。沿用並延伸原 plan v0.2 的 scope 設計（skill.scope ∩ folder.defaultScope），不另創 visibility 欄位。

## Alternatives rejected
- 對外公開網路 marketplace — 需公開註冊、內容審核、防濫用機制，MVP 工程量倍增，且與原設計的內部定位衝突。
- app 內自建 team 資料表 — 與 IdP 形成雙重身分事實來源；除非公司 Keycloak 無法提供 groups（見任務檔 Open questions Q2）。

## Consequences
- 現有 Keycloak realm 與 JWT 驗證直接沿用，只需加 groups claim 解析與 demo groups。
- Schema 需加 `teamId` 與 scope/status 欄位（任務檔 Phase 1）。
- Revisit when: 需要對外開放時（屆時補審核與註冊）；或確認公司 IdP 不管理 groups 時（改 app 內團隊表）。
