# Decision: 在線提示 + 軟鎖採 DB 輪詢 over WebSocket

- Date: 2026-07-05
- Task: docs/tasks/20260705-marketplace-v2.md (Phase E)
- Status: accepted

## Context
Phase E 要「在編輯器顯示某某也在編輯」+「他人儲存後盡快提示」。需求是**軟提示**
（非強制鎖），既有樂觀鎖版本檢查（存檔時比對 version → 409）維持為權威防線。
實作有兩條路：WebSocket 推播 vs DB 輪詢。WS handler 一度已寫好但未 commit，
使用者於選型討論後改採 DB 輪詢（優先簡化、天生多實例相容）。

## Decision
新增 `skill_presence` collection（skillId, userId, lastSeen；TTL index 自動
過期），前端進編輯器時每 ~5s 呼叫 `PUT /api/skills/{id}/presence`（心跳 +
讀取合一）：upsert 自己的 presence，回應含「其他在線編輯者」與該 skill 的
`currentVersion`。前端據此顯示在線提示；若 `currentVersion` 超前載入時的版本，
即代表他人已儲存 → 提早顯示衝突橫幅（不必等送出才撞 409）。離開編輯器
best-effort `DELETE`；abandoned 條目由 TTL index 清除。

## Alternatives rejected
- **WebSocket 推播** — 「立即」推播最理想，但：(1) 引入新 infra（ws starter、
  連線/斷線重連管理）；(2) 單機記憶體 registry 不支援多實例，跨 pod presence
  需 sticky session 或 Redis pub/sub。使用者選擇避開這層複雜度。
- **硬鎖（DB 排他鎖擋第二編輯者）** — 需求明確是軟提示；且與既有樂觀鎖重複。

## Consequences
- 無新後端依賴；presence 存共享 DB → 多實例天生相容。
- 「立即」降級為「輪詢間隔內（~5s）」；持續有輕量 DB 寫入（TTL 控制資料量）。
- WS 不可用時的靜默退化需求自然滿足（輪詢失敗 → hook 回空、編輯器照常）。
- Revisit when: 需要真正即時（<1s）或輪詢負載過高 → 屆時再上 WebSocket +
  Redis pub/sub（多實例 fan-out）。
