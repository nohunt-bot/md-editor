# Task: 使用者選單（登入/登出/身分）+ /settings 設定頁 —— 前端骨架（dev-stub）

Status: done (2026-07-05 — 前端骨架完成，已推 GitHub c7f40a2；Keycloak 接回為後續任務)

> 沿用 v1/v2 驗證過的流程：commander inline（spend-limit 環境）或 worktree
> pin-base 派工；閘門在 main 重跑；live 截圖；每步 push。i18n 一律走 t()。
> 前置決策（使用者 2026-07-05）：設定＝選單快切 + /settings 頁；現在先做前端
> 骨架（dev-stub 資料，不接 Keycloak）。IA 討論結論見下方 Decisions。

## Acceptance criteria

- [ ] 側欄底部裸 select 收成一個**使用者選單**：顯示目前使用者（名字/團隊/角色，
      來自 /api/me），點擊展開選單含 個人資料、設定、主題快切、語言快切、登出
- [ ] `/settings` 路由 + SettingsPage：個人資料（唯讀，/api/me）、偏好（主題 +
      語言完整控制）、帳號/團隊管理區塊為 deferred placeholder（標「需 Keycloak」）
- [ ] dev 身分切換器保留但收進「dev only」區（env 或明確標示），非正式使用者面
- [ ] 登出：dev-stub 無真 session → 選單項存在但誠實標示「dev 模式」/導回；
      正式登出留 Keycloak 接點註解
- [ ] 全新字串走 i18n（zh-TW + en）；tsc/build/vitest 全綠；live 截圖選單+設定頁

## Plan

- [ ] 1 UserMenu 元件（app/UserMenu.tsx + css）：user chip + 展開選單（含主題/
      語言快切、個人資料/設定連結、登出）；取代 Sidebar 底部 dev-switcher 三 select
      → 驗證：vitest（渲染身分、開選單、登出項）；tsc/build
- [ ] 2 SettingsPage（pages/SettingsPage.tsx + css）+ /settings route：個人資料
      唯讀、偏好完整、帳號/團隊 deferred placeholder
      → 驗證：vitest（區塊 + 主題/語言控制）
- [ ] 3 dev 身分切換器收進 UserMenu 的 dev-only 折疊區（保留跨團隊測試能力）
      → 驗證：切身分仍 reload 生效
- [ ] 4 i18n settings 命名空間（zh-TW+en）；閘門 + live 截圖 + push
      → 驗證：git HEAD=origin

## Decisions（IA，2026-07-05 討論拍板）

- 登入 = 未驗證守衛 redirect Keycloak（不自建登入頁）；登出 = 使用者選單項。
- 使用者選單釘在側欄底部（Linear/Notion/Slack 模式）——沿用現 dev-switcher 位置。
- 設定分兩層：主題/語言在選單快切 + /settings 完整；個人資料/帳號/團隊管理在
  /settings 專屬路由。
- dev 身分切換器 = dev-only 保留（接 Keycloak 時使用者選單資料源 /api/me 從
  stub 轉真 token，前端不動）。
- 本輪只做前端骨架（dev-stub 資料）；Keycloak 接回為獨立後續任務。

## Progress log

- 2026-07-05 | planning | 任務檔建立；IA 兩個分岔（設定形式、時程）由使用者
  拍板（選單快切+/settings 頁、現在先做前端骨架）
- 2026-07-05 | done | commit c7f40a2（commander inline）。UserMenu（側欄底部
  chip+選單：Profile/Settings/主題/語言/dev身分(import.meta.env.DEV 才顯示)/
  登出）取代三裸 select；/settings 頁（個人資料唯讀、偏好完整、帳號+團隊管理
  deferred placeholder）；settings i18n（zh+en）。閘門：tsc/build 0、
  vitest 49/49（更新 AppShell 測試斷言）。live 截圖選單+設定頁。
  ⚠️ 登出為 dev-stub alert；VersionController 舊 header、真登入/登出、帳號&
  團隊管理 = Keycloak 接回任務（接點已在 UserMenu.logout 註解）。

## Open questions

（無——兩分岔已拍板。）
