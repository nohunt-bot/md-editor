# Decision: 頂部空間分頁＋門戶首頁（版型 B+D）over 側欄雙區／三欄瀏覽

- Date: 2026-07-11
- Task: docs/tasks/20260711-gui-space-tabs.md、20260711-gui-card-view-prefs.md、
  20260711-gui-portal-home.md（提案圖：claude.ai artifact 1fe3006f）
- Status: accepted

## Context
使用者要求 GUI 重新規劃：「一目瞭然哪邊在哪邊操作」＋極簡。原架構（v1）把
我的團隊/開放空間/收藏做成一根常駐側欄的三個分區，空間定位靠閱讀側欄，
非團隊頁面側欄內容大半無關。

## Decision
空間提升為頂層三分頁（B），側欄降為僅團隊空間的情境面板；`/` 改為搜尋門戶
（D）。貫穿空間識別色 token：藍=團隊、綠=開放、琥珀=收藏。卡片排列維持現狀
預設，另以 user_preferences 提供 list/grid＋comfortable/compact 客製。

## Alternatives rejected
- A 雙區側欄優化 — 定位仍需視線移動到側欄；極簡感靠留白硬撐，未根治
- C 三欄瀏覽（清單＋預覽） — 資訊密度天生高，與「極簡」矛盾；重構成本最大，
  且未證實使用行為以大量瀏覽為主
- 卡片排列直接改版 — 使用者明確要「先維持、可客製」，故做偏好而非改預設

## Consequences
- 空間定位零思考（分頁即答案）；非團隊頁面更空
- 兩空間不再同框，跨空間對照需切分頁；側欄時有時無需一週適應
- Revisit when: 使用數據顯示「開放空間瀏覽→比較多件」成為主流行為時，
  重評 C 的清單＋預覽欄
