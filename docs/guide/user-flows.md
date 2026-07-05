# 使用者操作手順（User Flows）

本文件逐一說明前端每個功能怎麼操作。前提：服務已依 `setup.md` 啟動，並已
了解 `login.md` 描述的 dev-stub 身分機制。以下範例多以 `alice`
（team-a／平台團隊／EDITOR）為主要示範身分，需要對照其他角色時會特別註明。

## 目錄

1. [瀏覽：團隊空間 / 開放空間](#1-瀏覽團隊空間--開放空間)
2. [建立 skill → 儲存 → 發布](#2-建立-skill--儲存--發布)
3. [下架（unpublish）與發布版本凍結](#3-下架unpublish與發布版本凍結)
4. [複製開放空間的 skill 到我的團隊](#4-複製開放空間的-skill-到我的團隊)
5. [版本歷史與還原](#5-版本歷史與還原)
6. [讚 / 引用數 / 開放空間排序](#6-讚--引用數--開放空間排序)
7. [資料夾（Folders）](#7-資料夾folders)
8. [設定（Settings）與使用者選單](#8-設定settings與使用者選單)
9. [在線提示與版本漂移警示](#9-在線提示與版本漂移警示)
10. [Skill 參照（references/prerequisites）](#10-skill-參照referencesprerequisites)

---

## 1. 瀏覽：團隊空間 / 開放空間

側欄分成兩區（zone），登入後零點擊就能分清「我的團隊」跟「開放空間」：

**Zone 1：我的團隊**
1. 上方有一個團隊切換器（下拉選單），列出目前身分所屬的所有團隊，顯示格式
   為「顯示名稱（角色）」，例如「平台團隊（EDITOR）」。若身分不屬於任何
   團隊（如 `admin`），會顯示「沒有團隊」且選單停用。
2. 切換團隊後，下方的資料夾樹（folder tree）與清單頁（`/team`）會重新載入
   該團隊的內容。
3. 資料夾樹下方有標籤（tag）篩選區，點一個 tag chip 即依標籤篩選團隊清單；
   點「全部」清除篩選。

**Zone 2：開放空間**
1. 點「開放空間」連結進入 `/open`，瀏覽全公司已發布的 skills。

**團隊清單頁（`/team`，`SkillsPage.tsx`）操作：**
1. 上方有清單/網格檢視切換（☰ / ▦），選擇會存在 `localStorage`
   （`teamSkillsView`），重整後仍記得。
2. 篩選輸入框（debounce 300ms）可依名稱/描述搜尋，與資料夾、標籤篩選皆為
   **伺服器端**篩選（會套用到所有分頁，不是只篩當頁）。
3. 清單為伺服器端分頁（每頁預設 20 筆），頁底有分頁元件。
4. 空狀態會區分「這個團隊完全沒有 skill」（顯示「建立第一個 skill」按鈕）
   跟「篩選條件沒有符合的結果」兩種文案。

**開放空間頁（`/open`，`OpenSpacePage.tsx`）操作：**
1. 卡片顯示標題、描述、標籤、來源團隊名稱、讚數、引用數、發布日期。
2. 上方有標籤篩選 chips，以及排序切換「最新／最熱」（見第 6 節）。
3. 點卡片本體（非複製按鈕區域）進入該 skill 的詳情頁。

**全域搜尋（⌘K / Ctrl+K）：**
1. 在頁面任何地方按 `⌘K`（Mac）或 `Ctrl+K`，游標會自動跳到頂欄的搜尋框
   （`GlobalSearch.tsx`）。
2. 輸入關鍵字（debounce 250ms）後，下拉會顯示兩組結果：「我的團隊」與
   「開放空間」，各自最多顯示該分組的搜尋結果（後端 `$text` 搜尋，依
   `scope=all` 回傳分組後的 `{ team, open }`）。
3. 按 `Enter` 直接跳到第一筆結果（優先「我的團隊」分組）；按 `Esc`
   關閉下拉；點下拉最下方「查看全部結果」會跳到 `/open?q=<關鍵字>`。

---

## 2. 建立 skill → 儲存 → 發布

1. 確認側欄「我的團隊」已選好一個團隊（活躍團隊）。若沒有任何團隊可選，
   頂欄的「+ 新增 skill」按鈕會呈停用狀態並顯示提示「請先選擇團隊」
   （`App.tsx` 的 no-team guard）。
2. 點頂欄「+ 新增 skill」（或直接前往 `/skills/new`）。
3. 填寫表單：
   - **Name**（必填，會顯示 hint 說明命名規則）
   - **Display Name**（選填，清單/詳情頁優先顯示這個）
   - **Description**（選填）
   - **Content**（必填）：MDXEditor 精簡版 WYSIWYG 編輯器（標題、粗體/
     斜體、清單、連結、程式碼區塊；**沒有底線、表格、圖片按鈕**——見決策
     記錄 `docs/decisions/20260703-editor-feature-reduction.md`）
   - 右側欄：標籤（輸入後按 Enter 加入，可點 × 移除）、資料夾下拉（目前
     UI 尚未載入實際資料夾清單選項，見第 10 節「已知缺口」類似的限制）
4. 點右上角「儲存」。新建立的 skill 會歸屬於側欄目前選定的活躍團隊
   （`teamId: getActiveTeamId()`）。
5. **儲存成功後會直接導向該 skill 的詳情頁**（`/skills/{id}`），而不是
   回列表——因為發布按鈕就在詳情頁上。
6. 在詳情頁右側「操作」區塊，若目前身分對此 skill 所屬團隊是 EDITOR
   （或 admin），會看到「發布」按鈕（skill 狀態為非 published 時顯示）。
7. 點「發布」→ 跳出確認對話框（標題/訊息/確認鈕皆為 i18n 文案），點確認
   後呼叫 `POST /api/skills/{id}/publish`，成功後重新載入詳情頁，狀態變為
   `published`，並開始出現在開放空間（`/open`）。

---

## 3. 下架（unpublish）與發布版本凍結

**下架：**
1. 在已發布 skill 的詳情頁，操作區塊會改顯示「下架」按鈕（取代發布按鈕）。
2. 點擊 → 確認對話框 → 確認後呼叫 `DELETE /api/skills/{id}/publish`。
3. 下架後該 skill 從開放空間消失，但**已複製到其他團隊的副本不受影響**
   （複製後是獨立演化的，記錄 `sourceSkillId` 但內容各自獨立）。

**發布版本凍結（publish freeze）——這是理解「發布」語意的關鍵行為：**

- 發布／重新發布的當下，後端會把當時的內容重建成一份
  `publishedSnapshot`（`displayName`/`description`/`content`/`tags`/
  `version`）連同 `publishedVersion` 一起存進該 skill 文件（決策記錄
  `docs/decisions/20260705-publish-freeze-embedded-snapshot.md`）。
- **非團隊成員**（包含在開放空間瀏覽、搜尋、看詳情頁的人）永遠讀到的是
  這份 **凍結快照**，不是團隊之後繼續編輯的最新內容。
- **團隊成員（editor/viewer）與 admin** 看到的一律是**最新內容**
  （`currentVersion`），不是快照。
- 若團隊在發布後又編輯過（`currentVersion > publishedVersion`），編輯者
  在詳情頁會看到一個「有未發布的變更」提示區塊，內含目前公開版本號
  （`v{publishedVersion}`）與「重新發布」按鈕（`SkillDetailPage.tsx` 的
  `hasUnpublishedChanges` 邏輯）。
- 非成員看到的詳情頁版本欄位會多一個「（凍結）」標記（`frozenTag`），
  提醒目前看到的不是最新版。
- 下架後快照**保留但不可見**；重新發布會用當下內容刷新快照。

**操作驗證步驟（示範跨團隊差異）：**
1. 以 `alice`（team-a）身分編輯一個已發布 skill 並儲存（不重新發布）。
2. 用 `carol`（team-b，非 team-a 成員）身分開同一個 skill 的詳情頁 →
   應看到編輯前的舊內容 + 「（凍結）」標記。
3. 切回 `alice` → 應看到「有未發布的變更」提示 + 「重新發布」按鈕。
4. 點「重新發布」→ 用 `carol` 身分重新整理 → 應看到更新後的內容。

---

## 4. 複製開放空間的 skill 到我的團隊

「複製到我的團隊」讓你把開放空間的 skill 複製一份進自己團隊，複製後兩邊
獨立演化（新副本記錄 `sourceSkillId` 指回原始 skill，但編輯互不影響）。

**顯示規則（member-aware）：**
- 只有「已發布到開放空間」（`scope=open` 且 `status=published`）的 skill
  才會顯示複製選項。
- 若你已經是該 skill 所屬團隊的成員，**不會**顯示複製按鈕（複製對你沒有
  意義——你團隊本來就看得到最新版）。
- 若你沒有任何可編輯的目標團隊（例如你只有 VIEWER 角色、沒有任何
  EDITOR 團隊），複製按鈕會顯示但**停用**，並附上提示文字（「需要至少
  一個可編輯的團隊」）。
- Admin 一律視為「可複製」，但因為 admin 不屬於任何團隊，實際可選的目標
  團隊清單是空的，複製按鈕同樣會停用。

**入口一：開放空間卡片的快速複製按鈕**
1. 在 `/open` 頁面，符合上述條件的卡片右下角會有「複製到我的團隊」按鈕。
2. 若你只有**一個**可編輯的團隊：點擊立即複製（不用選）。
3. 若你有**多個**可編輯的團隊：點擊會跳出一個小型 modal，用下拉選單挑
   目標團隊，確認後才真的複製。
4. 複製成功後導向新副本的詳情頁（`/skills/{newId}`）。

**入口二：詳情頁的複製按鈕**
1. 在該開放空間 skill 的詳情頁（`SkillDetailPage.tsx`），操作區塊會有
   「複製到團隊」按鈕，行為與入口一相同（單一團隊直接複製 / 多團隊跳
   選擇對話框）。

兩個入口共用同一套邏輯（`useCopyToTeam` hook），呼叫
`POST /api/skills/{id}/copy-to-team`，body 帶 `{ targetTeamId }`。

---

## 5. 版本歷史與還原

1. 在任何 skill 的詳情頁，右側欄有「版本歷史」區塊，列出每次儲存留下的
   版本（版本號、編輯者 id、時間）。
2. **只有 EDITOR（或 admin）會看到「還原」按鈕**，且不會出現在「目前版本」
   那一列（不能還原到自己）。
3. 點「還原」→ 跳出確認對話框（含目標版本號）→ 確認後呼叫
   `POST /api/skills/{id}/versions/{version}/restore`，成功後重新載入
   詳情頁內容與版本清單。
4. 沒有版本記錄時顯示「尚無版本」空狀態文案。

---

## 6. 讚 / 引用數 / 開放空間排序

**讚（like）：**
1. 詳情頁metadata 區塊下方有一個愛心按鈕，顯示目前讚數，未讚時是空心
   愛心（♡），已讚是實心（♥）。
2. 點擊會呼叫 `PUT /api/skills/{id}/like`（讚）或
   `DELETE /api/skills/{id}/like`（收回讚）——**每人一票、操作是冪等的**
   （重複按同個方向不會累加）。
3. 回應會直接更新畫面上的讚數與愛心狀態（不需要重新整理整頁）。

**引用數（citation / copy count）：**
- 每次有人透過「複製到我的團隊」複製這個 skill，`copyCount` 會累加。
- 詳情頁與開放空間卡片都會顯示「引用 N 次」（i18n key `citeCount` /
  `open:cite`）。

**開放空間排序：**
1. 在 `/open` 頁面上方有「最新／最熱」兩個切換 chip。
2. 「最新」（預設）：依 `publishedAt` 由新到舊。
3. 「最熱」：依讚數（`likes`）排序，對應 URL 參數 `?sort=likes`。
4. 切換排序或篩選都會把分頁重置回第一頁。

---

## 7. 資料夾（Folders）

1. 在側欄「我的團隊」區塊，資料夾樹下方有「+ 新增資料夾」按鈕（僅在已
   選定活躍團隊時顯示）。
2. 點擊後跳出一個 modal（`NewFolderModal.tsx`），輸入資料夾名稱、按
   Enter 或點「建立」提交（呼叫 `POST /api/folders`，帶目前活躍
   `teamId`）。
3. 建立成功後 modal 關閉、資料夾樹自動重新載入（顯示新資料夾——舊版用
   `prompt()` 實作時建立後不會刷新，這是已修正的行為，見 commit
   `fix(folders): create via a proper modal + refresh the tree`）。
4. **點擊側欄的任一個資料夾節點，會同時：**（a）把該資料夾設為目前篩選
   條件，且（b）導航到 `/team`（即使你原本在 `/open` 或 `/settings`
   頁面點資料夾，也會被帶回團隊清單頁並套用篩選）——這是
   `FolderTree.tsx` 的 `selectFolder()` 行為，修正了「在非團隊頁點資料夾
   沒有反應」的問題。
5. 資料夾支援巢狀（有子資料夾時節點旁會有展開/收合箭頭 ▶）。

---

## 8. 設定（Settings）與使用者選單

**使用者選單（側欄左下角，`UserMenu.tsx`）：**
- 顯示目前身分頭像（姓名字首）、姓名、所屬團隊 + 角色。
- 展開選單包含：「個人資料」「設定」連結（皆導向 `/settings`）、
  dev-only 身分切換器（見 `login.md`）、登出按鈕。

**設定頁（`/settings`，`SettingsPage.tsx`）：**

1. **個人資料（唯讀）**：userId、顯示名稱、所屬團隊清單（含角色）、是否
   admin——全部從 `/api/me` 唯讀顯示，這裡**不能編輯**（Keycloak 接回前
   都是如此）。
2. **偏好設定（可操作）：**
   - **主題（theme）**：`light` / `dark` / `system` 三態下拉選單。切換
     時立即套用（`<html data-theme="...">`），並呼叫
     `PUT /api/me/preferences` 存到後端（**跟著帳號走**，換裝置登入
     同身分會同步）。若離線存檔失敗會靜默降級（畫面上的切換仍生效，只是
     這次沒存到後端）。
   - **語言（language）**：繁體中文／English 下拉選單（react-i18next），
     切換立即生效，同樣存到 `/api/me/preferences`。
   - **注意**：畫面顯示模式（清單/網格 view-mode）與「目前選定的活躍
     團隊」**不會**跟著帳號走，是存在瀏覽器 `localStorage`
     （`teamSkillsView`、`activeTeamId`），**裝置本地**設定，換瀏覽器/
     換電腦不會同步。
3. **帳號 / 團隊管理**：目前顯示為「deferred」提示區塊，尚未開放（要等
   Keycloak 接回後才會實作帳號管理與團隊管理介面）。

**偏好設定載入順序（App.tsx）：** 開啟頁面時先用 `localStorage`
即時套用主題/語言（避免畫面閃爍），身分載入完成後再用後端存的偏好覆蓋
（若後端有值）——這一步只套用、不會反過來把 localStorage 的值寫回後端。

---

## 9. 在線提示與版本漂移警示

編輯任何既有 skill（`/skills/{id}/edit`）時：

1. 進入編輯器後，每約 5 秒會呼叫一次
   `PUT /api/skills/{id}/presence`（心跳），回傳目前有哪些人也在編輯這個
   skill，以及該 skill 目前最新的版本號。
2. 若有其他人也在編輯，編輯器上方會出現提示：「⚠ X 也在編輯」
   （`editor:presenceEditing`，列出所有其他在線編輯者的名字）。
3. 若後端回傳的「目前最新版本」大於你載入時的版本（代表別人已經存檔），
   會出現另一則警示：「內容已被更新」（`editor:presenceUpdated`）——**這是
   軟提示**，不會阻止你繼續編輯，但提醒你儲存時可能會撞版本衝突。
4. 真正的防線是**樂觀鎖**：儲存時若版本不符，後端回 409，前端跳出衝突
   對話框（`ConflictDialog`），可以選擇覆蓋（override）、合併
   （merge，把對方內容跟你的內容一起顯示做手動合併）、或放棄
   （abandon，導回詳情頁）。
5. 離開編輯器時，前端會盡力送出「離開」通知
   （`DELETE /api/skills/{id}/presence`），但即使沒送到，presence 記錄
   也有 TTL 索引會自動過期。
6. 這整套是 **DB 輪詢**實作，不是 WebSocket——刻意的技術選擇（見決策記錄
   `docs/decisions/20260705-presence-db-poll-over-websocket.md`），優點是
   不需要額外 infra、天生支援多實例，代價是「即時」降級成「輪詢間隔內
   （~5 秒）」。

---

## 10. Skill 參照（references/prerequisites）

- Skill 的資料模型支援 `references`（`{ skillId, relation }`）與
  `prerequisites`（`{ skillId, note }`）欄位，後端已有
  `ReferenceResolver`（含循環參照偵測）與相關持久化邏輯
  （`CreateSkillData`/`UpdateSkillData` 的型別都定義了這兩個欄位）。
- **目前編輯器 UI 沒有提供「設定參照/前置需求」的介面**——
  `SkillEditor.tsx` 的表單只有 name/displayName/description/content/
  tags/folder，沒有 reference picker（`IMPLEMENTATION_STATUS.md` 也把
  「ReferencePicker with @ autocomplete」列在尚未完成的 Phase 2 項目）。
- 換句話說：**現階段只能透過直接呼叫 API**（`POST`/`PUT
  /api/skills`，body 帶 `references`/`prerequisites` 陣列）來設定這兩個
  欄位，UI 上看不到、也不能用滑鼠操作設定。若你需要示範或測試這個功能，
  用 curl 或 Postman 直接打 API：

```bash
curl -X PUT http://localhost:8080/api/skills/<id> \
  -H 'Content-Type: application/json' \
  -H 'X-Dev-User: alice' \
  -d '{
    "references": [{ "skillId": "<other-skill-id>", "relation": "related" }],
    "prerequisites": [{ "skillId": "<prereq-skill-id>", "note": "先讀這篇" }]
  }'
```

- 這是明確的「已建但未完成」缺口，不是 bug——文件在此如實記錄，避免誤以為
  UI 支援卻找不到入口。
