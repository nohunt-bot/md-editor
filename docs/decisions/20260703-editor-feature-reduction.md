# Decision: 編輯器收斂為 文字+連結+code block，放棄原設計的 table 支援

- Date: 2026-07-03
- Task: docs/tasks/20260703-skill-marketplace.md
- Status: accepted

## Context
使用者要求編輯器極簡：「不需要圖片等等，只要一般的編輯文字跟連結」。原設計（plan.md 40-41, 320-343）的 MDXEditor 含 code block + table；現有實作 toolbar 另有 underline、tables。但 SKILL.md 文件幾乎必含指令範例，純文字+連結無法表達。

## Decision
MDXEditor toolbar/plugins 收斂為：標題、粗體/斜體、清單、連結、code block。移除圖片、表格、underline。（使用者 2026-07-03 拍板，選項「文字+連結+code block」。）

## Alternatives rejected
- 維持原設計（含 tables）— 與使用者的極簡要求直接衝突。
- 嚴格只有文字+連結 — skill 文件的指令範例只能用 inline code 土法表示，實務上不可行。

## Consequences
- MDXEditor plugin 配置與樣式維護面縮小；淺色極簡改版（Phase 2）工作量降低。
- 既有含 table 的 skill 內容仍以 markdown 原文保存，但失去 WYSIWYG 編輯；Phase 2.5 需驗證貼上含 table 的內容不會損毀。
- Revisit when: 使用者回饋確實需要表格編輯時。
