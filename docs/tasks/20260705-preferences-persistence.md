# Task: 使用者偏好後端持久化（主題 + 語言，綁 userId）

Status: done (2026-07-05 — 已推 GitHub b8c1693)

> 使用者要求偏好跨裝置跟著人走。dev-stub 的 userId 已穩定，現在就綁；接
> Keycloak 後同一 CurrentUserProvider.getUserId() 無縫接軌。localStorage 保留
> 當離線快取。⚠️ 寫入用 MongoTemplate.upsert（Phase E 教訓：find-then-save +
> 無 auto-index 會累積重複列）。

## Acceptance criteria

- [ ] 後端 user_preferences（keyed by userId）：GET/PUT /api/me/preferences
      （theme, language）；upsert；per-user 隔離
- [ ] 前端：登入/身分載入後 fetch 並套用（主題+語言）；SettingsPage 變更時
      PUT 後端；localStorage 續當離線快取（先套快取避免閃爍，後端回來覆蓋）
- [ ] 範圍：只有 theme + language 後端持久化；view mode/activeTeam/devUser
      維持 localStorage（裝置本地）
- [ ] 後端回不來時靜默退化（用 localStorage）；tsc/build/vitest 綠；live 驗證
      跨「瀏覽器」（清 localStorage 後仍讀到後端偏好）

## Plan

- [ ] 1 後端：UserPreferences entity + repo；MeController 加 GET/PUT
      /api/me/preferences（upsert by userId）
      → 驗證：整合測試 save+get roundtrip、per-user 隔離、預設值
- [ ] 2 前端 api client + 套用：getPreferences/savePreferences；app-load effect
      fetch+apply；SettingsPage 變更 PUT；localStorage 快取保留
      → 驗證：vitest（SettingsPage 變更觸發 PUT）；hook/effect 套用
- [ ] 3 閘門 + live（清 localStorage 後仍套用後端偏好）+ push
      → 驗證：git HEAD=origin

## Decisions

- 只持久化 theme+language（跟人跨裝置有意義）；其餘裝置本地。
- upsert（非 find-then-save）——Phase E 教訓。
- localStorage 為離線快取 + 首載即時套用（避免 FOUC），後端為權威。

## Progress log

- 2026-07-05 | planning | 任務檔建立；範圍與離線快取策略定案
- 2026-07-05 | done | commit b8c1693（commander inline）。後端 user_preferences
  + GET/PUT /api/me/preferences（原子 upsert、per-user 隔離）；前端身分載入後
  fetch+套用（localStorage 先套避免 FOUC、後端覆蓋、離線靜默退化）、SettingsPage
  變更 PUT。只持久化 theme+language；其餘裝置本地。閘門：BE 全套 exit 0
  （PreferencesIntegration 2）、FE tsc/build 0 vitest 50/50。★ live 跨裝置
  證明：清 localStorage → app 開機從後端讀回 dark+English 並套用（data-theme=
  dark/lang=en，下拉標籤同步）。修：主題 select 改讀 localStorage（同語言），
  解非同步載入時標籤滯後。接 Keycloak 時同 userId keying 無需 migration。

## Open questions
（無）
