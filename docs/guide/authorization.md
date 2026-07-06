# 權限（授權）設計

本文件說明 Skill.md Service 的權限模型：**誰**（身分怎麼解析）、**能做
什麼**（團隊角色 EDITOR/VIEWER 與全域 admin）、以及**每個操作背後跑哪一道
授權檢查、失敗時回哪個 HTTP 狀態碼、為什麼是 403 還是 404**。所有規則皆對照
後端原始碼逐條核實（`backend/src/main/java/com/company/skillmd/auth/` 下的
`AuthorizationService`、`CurrentUser`、`DevCurrentUserProvider` 等，以及
`SkillService.java`／`FolderService.java` 的授權呼叫點），如與直覺假設不符，
一律以程式碼為準。

閱讀前提：已讀過 `setup.md`（服務啟動）、`login.md`（dev-stub 身分機制、有
哪些 dev users）、`lifecycle.md`（文件狀態機與可見性總表）。本文著重「授權
如何判斷」，`login.md` 著重「身分從哪來」，兩者互補。

## 目錄

1. [概觀](#1-概觀)
2. [身分解析流程](#2-身分解析流程)
3. [三種能力層級](#3-三種能力層級)
4. [四個授權檢查詳解](#4-四個授權檢查詳解)
5. [授權判斷流程圖](#5-授權判斷流程圖)
6. [操作 × 所需權限總表](#6-操作--所需權限總表)
7. [403 vs 404 的設計原則](#7-403-vs-404-的設計原則)
8. [「複製到團隊」的雙重授權](#8-複製到團隊的雙重授權)
9. [例外 → HTTP 狀態對照](#9-例外--http-狀態對照)
10. [已知邊界／未來](#10-已知邊界未來)

---

## 1. 概觀

授權由**三個維度**共同決定，任何一個操作能不能過，都是這三者交叉的結果：

- **身分來源（identity source）**：目前是 **dev-stub**——請求帶
  `X-Dev-User` header，後端查 `application.yml` 的設定把它解析成一個
  `CurrentUser`。Keycloak 為 deferred，**尚未接回**（見第 10 節）。這一層
  只回答「你是誰」，不回答「你能不能做這件事」。
- **團隊角色（team role）**：`Role` enum 只有 **`EDITOR`／`VIEWER`** 兩種，
  以「每個團隊各一個角色」的形式掛在身分上（`teamRoles: Map<teamId, Role>`）。
  同一個人在 team-a 可以是 EDITOR、在 team-b 是 VIEWER、在 team-c 完全不是
  成員——角色永遠是**對某個特定團隊**而言，沒有「全域角色」這種東西。
- **全域 admin 旗標（admin flag）**：`admin` 是身分上的一個布林旗標，**不是
  一種團隊角色**。它對「成員？可編輯？」這兩個判斷一律短路成 true（見第 3
  節），效果上等於「對所有團隊都可讀可寫」。但要特別注意：admin 的
  `teamRoles` 通常是**空的**——他不隸屬任何團隊——這在需要「選一個目標團隊」
  的操作（「複製到團隊」）上會反過來把 admin 擋下（見第 8 節）。

身分模型（`CurrentUser`）的完整形狀：

```
CurrentUser
├─ userId       : String                 使用者 id
├─ displayName  : String                 顯示名稱
├─ teamRoles    : Map<teamId, Role>      每個所屬團隊 → EDITOR / VIEWER
└─ admin        : boolean                全域旗標（不是團隊角色）
```

兩個核心判斷方法（`CurrentUser.java`）：

- **`isMemberOf(teamId)`** = `teamRoles` 這個 map 含有該 teamId 這個 key
  （不論角色是 EDITOR 還是 VIEWER）。
- **`canEdit(teamId)`** = `admin` 為 true（短路），**或**該團隊的角色
  恰好 == `EDITOR`。

> 注意 `canEdit` 對 admin 短路，但 `isMemberOf` **不**對 admin 短路——
> `isMemberOf` 只看 map 有沒有 key。所以一個「admin 但無團隊」的身分：
> `canEdit(任一團隊)` = true，但 `isMemberOf(任一團隊)` = false。這個
> 不對稱是後面幾個檢查行為的根源。

---

## 2. 身分解析流程

身分解析發生在**每一個請求**進到需要授權的服務方法之前。抽象介面是
`CurrentUserProvider`（`getCurrentUser()`），目前唯一實作是
`DevCurrentUserProvider`。這個介面就是未來接 Keycloak 的**縫**——換掉實作
即可，上層授權邏輯（`AuthorizationService`）完全不用動。

```
[HTTP 請求]
      │  帶 header: X-Dev-User: <userId>
      ▼
DevCurrentUserProvider.getCurrentUser()
      │
      ▼
  header 缺失或空白？
      ┌────是────┴────否────┐
      ▼                     ▼
[UnauthorizedException]   查 application.yml 的 app.dev-users[userId]
   → HTTP 401                     │
「Missing X-Dev-User header」      ▼
                            該 userId 有對應設定？
                              ┌────否────┴────是────┐
                              ▼                     ▼
                    [UnauthorizedException]   建立 CurrentUser{
                       → HTTP 401              userId, displayName,
                    「Unknown dev user: X」     teamRoles, admin }
                                                    │
                                                    ▼
                                        [交給 AuthorizationService 判斷授權]
```

重點：

- **缺 header** 與 **未知使用者** 兩種都丟 `UnauthorizedException` → **401**。
  這是「沒登入 / 認不出你是誰」，跟後面授權階段的「認得你、但不准你做」是
  兩件事（401 vs 403/404）。
- `app.dev-users` 的每一筆設定就是一個 `CurrentUser` 的來源：`displayName`、
  `teams`（→ `teamRoles`）、`admin`。有哪些 dev users、怎麼設，見 `login.md`
  與 `application.yml`。
- 解析成功後，`CurrentUser` 就固定了；後續所有授權判斷都只讀這個物件的
  `teamRoles` 與 `admin`，**不再回頭查資料庫**。

---

## 3. 三種能力層級

實務上使用者會落在三種能力層級。注意「層級」是**對某個特定團隊**而言
（admin 除外，admin 是跨團隊的）：

| 能力 | VIEWER（該團隊） | EDITOR（該團隊） | admin（全域） |
|---|---|---|---|
| 是該團隊成員（`isMemberOf`） | ✅ | ✅ | ❌（通常無團隊，靠短路涵蓋讀寫） |
| 讀團隊私有資源（team/draft） | ✅ | ✅ | ✅（短路） |
| 讀開放空間（open+published） | ✅ | ✅ | ✅ |
| 建立 / 編輯 / 刪除 / 發布 / 還原 | ❌ | ✅ | ✅（短路） |
| 看團隊清單 / 資料夾樹 | ✅ | ✅ | ✅（短路） |
| 讚 / 收回讚（看得到就能讚） | ✅ | ✅ | ✅ |
| 複製開放空間 skill 到團隊 | ⚠️ 需另有一個可編輯的目標團隊 | ✅（若有可編輯團隊） | ❌ 被擋（無目標團隊，見第 8 節） |

要點：

- **VIEWER** 能看團隊內全部內容（含 draft），但一切「寫」動作全被擋
  （回 403，因為他是成員、只是角色不足）。
- **EDITOR** 是團隊內的完整讀寫角色。
- **admin** 靠 `canEdit`／`requireResourceReadable` 的短路邏輯取得跨團隊
  讀寫能力，但因為**不隸屬任何團隊**，凡是需要「挑一個他所屬／可編輯的
  目標團隊」的操作（複製到團隊），他反而做不到。

---

## 4. 四個授權檢查詳解

所有授權都收斂在 `AuthorizationService` 的四個方法。它們的差異是**兩軸**：
（a）要求的是「成員」還是「可編輯」，（b）失敗時洩不洩漏資源存在性
（→ 決定 403 還是 404）。

### 4.1 `requireTeamMember(teamId)` — 清單類讀取

- **語意**：團隊層級的讀取（團隊 skill 清單、資料夾樹/清單）。這裡 `teamId`
  是呼叫者**明確帶進來的請求參數**，不是某個「可能不該讓你知道存在」的
  資源，所以不需要隱藏存在性。
- **通過條件**：`isAdmin()` **或** `isMemberOf(teamId)`。
- **失敗**：非成員 → `ForbiddenException` → **403**。
- **為何 403 不是 404**：團隊是你自己指定的參數，回「你不是這個團隊的成員」
  不會洩漏任何私有資源的存在——你本來就知道有這個團隊 id。

### 4.2 `requireCanEdit(teamId)` — 團隊層級寫入

- **語意**：對某個團隊做「建立」類寫入（新建 skill、新建資料夾、複製到
  團隊時的目標團隊檢查）。
- **通過條件**：`canEdit(teamId)`（admin 短路，或角色 == EDITOR）。
- **失敗**：
  - 成員但角色是 VIEWER → `ForbiddenException` → **403**
    （「Editor role required」）。
  - 非成員 → `ForbiddenException` → **403**（「Not a member」）。
- **為何全都 403**：跟 4.1 一樣，`teamId` 是明確參數，不涉及隱藏某個具體
  資源是否存在，所以連「非成員」也回 403 而非 404。

### 4.3 `requireResourceReadable(teamId, openAndPublished)` — 資源層級讀取

- **語意**：讀取某個**屬於 `teamId` 的具體資源**（skill 詳情、版本清單/
  單版本、複製時的來源 skill），並帶一個「開放空間逃生門」旗標
  `openAndPublished`（= 該資源 `scope==open ∧ status==published`）。
- **通過條件**：`isAdmin()` **或** `isMemberOf(teamId)` **或**
  `openAndPublished` 三者任一為真。
- **失敗**：以上皆否 → `ResourceNotFoundException` → **404**。
- **為何 404 不是 403**：這是在讀一個**具體私有資源**。若對非成員回 403，
  等於告訴他「這個 id 確實存在、只是你不能看」——洩漏了私有資源的存在性。
  回 404 讓「不存在」與「存在但你無權」對外觀感一致，無法區分。

### 4.4 `requireResourceEditable(teamId)` — 資源層級寫入

- **語意**：對某個**屬於 `teamId` 的具體資源**做寫入（更新、軟刪除、發布、
  下架、版本還原、資料夾更新/移動/刪除、presence 心跳）。
- **通過條件**：`canEdit(teamId)`（admin 短路，或角色 == EDITOR）。
- **失敗**（**注意這裡 403 與 404 並存**）：
  - admin 或成員、但不可編輯（即成員且是 VIEWER）→ `ForbiddenException`
    → **403**（「Editor role required」）。
  - 非成員（且非 admin）→ `ResourceNotFoundException` → **404**。
- **為何一半 403 一半 404**：判斷順序是先問 `canEdit`（過就放行）；沒過再
  問 `isAdmin() || isMemberOf`——**能看到這個資源的人**（admin/成員）得到
  誠實的 403「你權限不夠」；**看不到這個資源的人**（非成員）得到 404，
  同樣不洩漏存在性。這是四個檢查裡唯一會同時回兩種碼的。

> 對照記憶法：
> - 「清單／團隊為明確參數」→ **Member/CanEdit**，失敗一律 **403**。
> - 「具體資源、要防存在性洩漏」→ **ResourceReadable/Editable**，非成員一律
>   **404**；成員但角色不足才 **403**。

---

## 5. 授權判斷流程圖

### 5.1 讀取路徑（`requireResourceReadable` + member-aware 內容）

以「讀 skill 詳情」（`getSkill`，`SkillService.java:120-129`）為例，這條路
同時決定「能不能讀」與「讀到 live 還是 frozen 快照」：

```
[讀某個 skill 詳情]
      │
      ▼
  admin？ ──是──▶ 可讀，且看 live（currentVersion 即時內容）
      │否
      ▼
  isMemberOf(teamId)？ ──是──▶ 可讀，且看 live（currentVersion）
      │否
      ▼
  open ∧ published？（openAndPublished）
      ┌────否────┴────是────┐
      ▼                     ▼
[ResourceNotFound → 404]  可讀，但 memberView=false
  （不洩漏私有資源存在）      → 看 frozen（publishedSnapshot
                            ＋UI「（凍結）」標記）
```

- 「能不能讀」由 `requireResourceReadable` 決定（admin / 成員 / open+published
  任一過）。
- 「讀到什麼版本」由 `memberView = isAdmin || isMemberOf` 再決定一次：成員/
  admin 看 **live**，其餘看 **frozen 快照**（凍結語意見 `lifecycle.md` §4.3）。
- 版本清單/單版本讀（`VersionService.java:52-53, 58-59`）直接呼叫
  `requireResourceReadable`（不經 `requireVisible`），只做可見性判斷、不做
  member-aware 切換。

### 5.2 寫入路徑（`requireResourceEditable`）

以「更新／發布／下架／軟刪除 skill」（`SkillService.java:83, 289, 306, 326`）
與「版本還原」（`VersionService.java:68`）為例：

```
[對某個 skill 做寫入操作]
      │
      ▼
  canEdit(teamId)？（admin 短路，或角色==EDITOR）
      ┌────是────┴────否────┐
      ▼                     ▼
   [放行]         isAdmin || isMemberOf(teamId)？
                      ┌────是────┴────否────┐
                      ▼                     ▼
             [Forbidden → 403]      [ResourceNotFound → 404]
             （看得到、但你是         （非成員，連存在性
              VIEWER，權限不足）        都不該讓你知道）
```

一句話：**canEdit 過就放行；不過的人裡，「看得到資源的」（admin/成員 viewer）
回 403，「看不到的」（非成員）回 404。**

---

## 6. 操作 × 所需權限總表

下表列出每個服務操作實際呼叫的授權檢查與原始碼行號（`SkillService.java`
與 `FolderService.java`）。行號已逐一對照確認。

| 操作 | 授權檢查 | 失敗碼（非成員 / viewer） | 原始碼 |
|---|---|---|---|
| 建立 skill | `requireCanEdit(request.teamId)` | 403 / 403 | `SkillService:55` |
| 更新 skill | `requireResourceEditable` | 404 / 403 | `SkillService:83` |
| 讀 skill 詳情 | `requireResourceReadable` + `memberView` 決定 live/frozen | 404（非 open+published） | `SkillService:120,124-125` |
| 版本清單 / 單版本讀 | `requireResourceReadable`（直接呼叫） | 404 | `VersionService:52-53,58-59` |
| 版本還原 | `requireResourceEditable` | 404 / 403 | `VersionService:68` |
| 團隊 skill 清單 | `requireTeamMember` | 403 / 403 | `SkillService:222` |
| 軟刪除 skill | `requireResourceEditable`（published 需先下架，否則 409） | 404 / 403 | `SkillService:289` |
| 發布 skill | `requireResourceEditable` | 404 / 403 | `SkillService:306` |
| 下架 skill | `requireResourceEditable` | 404 / 403 | `SkillService:326` |
| 複製到團隊 | `requireResourceReadable(來源)` **＋** `requireCanEdit(目標)` | 見第 8 節 | `SkillService:342-343` |
| 讚 / 收回讚 | 無角色檢查——只取 `currentUser().getUserId()`（先過 `requireVisible` 的可見性） | 任何看得到的登入者皆可 | `SkillService:140,149` |
| 開放空間清單 | **無** `require*` 檢查 → 任何已登入者可讀（且只回 published） | — | `SkillService:250,254` |
| presence 心跳 | `requireResourceEditable` | 404 / 403 | `SkillService:174` |
| 建立資料夾 | `requireCanEdit(teamId)` | 403 / 403 | `FolderService:31` |
| 更新 / 移動 / 刪除資料夾 | `requireResourceEditable(folder.teamId)` | 404 / 403 | `FolderService:49,59,76` |
| 資料夾樹 / 清單 | `requireTeamMember(teamId)` | 403 / 403 | `FolderService:87,94` |

補充：

- **讚（like/unlike）**：`SkillService.like/unlike` 先呼叫 `requireVisible`
  （＝ `requireResourceReadable`）確認你看得到這個 skill，之後**不再檢查
  任何角色**，只用 `getUserId()` 寫 `skill_likes`。所以「凡是看得到的登入者
  皆可讚」，包含開放空間裡別團隊的 skill。冪等性由唯一索引與計數重算保證
  （見 `lifecycle.md` §4.8），**沒有防濫用機制**（見第 10 節）。
- **開放空間清單（`listOpenSkills`）**：整個方法**沒有任何 `require*`
  呼叫**——身分已由 security 層解析過（登入即可），查詢條件寫死
  `scope=open ∧ status=published ∧ deletedAt=null`，所以任何登入者都讀得到，
  且天然只回已發布內容。

---

## 7. 403 vs 404 的設計原則

同樣是「不准你做」，本系統**刻意**用兩種不同狀態碼，區別在**存在性洩漏
防護**：

```
                    ┌─────────────────────────────────────────┐
                    │  失敗時，該不該讓對方知道「這東西存在」？   │
                    └─────────────────────────────────────────┘
                              │                        │
              teamId 是明確參數                具體資源、id 可能私有
              （清單 / 團隊層級）              （skill / 版本 / 資料夾）
                    │                                  │
                    ▼                                  ▼
              回 403 Forbidden                   非成員 → 回 404 Not Found
          「你不是這團隊成員 /                 （「不存在」與「存在但無權」
           角色不足」                            對外無法區分）
          （不洩漏任何私有資源，              成員但角色不足 → 回 403
           team id 本來就是你給的）           （反正你看得到，誠實告知權限不足）
```

- **清單 / 團隊層級檢查（`requireTeamMember`、`requireCanEdit`）** → 失敗
  **一律 403**。因為 `teamId` 是呼叫者自己帶進來的參數，回 403 不會讓他
  得知任何他原本不知道的私有資源存在。
- **資源層級檢查（`requireResourceReadable`、`requireResourceEditable`）**
  → **非成員一律 404**（`ResourceNotFoundException`）。回 403 等於承認
  「這個 id 存在、只是不給你」，洩漏了私有資源的存在性。回 404 讓「真的
  不存在」跟「存在但你無權」對外看起來一模一樣。
- **例外：成員但角色不足**（成員且 VIEWER 想寫）→ 資源層級檢查回 **403**。
  因為這個人本來就看得到該資源（他是成員），不存在「隱藏存在性」的問題，
  誠實回「你權限不足」反而比較清楚。這正是 `requireResourceEditable`
  同時會回 403 與 404 的原因（見 §4.4）。

`ResourceNotFoundException` 的 javadoc 也寫明：「Maps to HTTP 404 — never
used to signal *found but forbidden*」——404 專門用來抹平存在性差異，
「看得到但沒權」永遠走 403。

---

## 8. 「複製到團隊」的雙重授權

「複製到團隊」（`SkillService.copyToTeam`，`SkillService.java:341-343`）是
唯一一個**串接兩道獨立授權檢查**的操作，因為它同時碰兩個團隊：**來源**
（要讀得到）與**目標**（要寫得進去）。

```
POST /api/skills/{id}/copy-to-team  { targetTeamId }
      │
      ▼
① requireResourceReadable(source.teamId, source 是 open ∧ published？)
      │    你看得到來源嗎？（admin / 來源團隊成員 / open+published 任一）
      ┌────否────┴────是────┐
      ▼                     ▼
[404 來源不可讀]        ② requireCanEdit(targetTeamId)
（不洩漏來源存在）             你能寫進目標團隊嗎？（admin 短路，或目標==EDITOR）
                              ┌────否────┴────是────┐
                              ▼                     ▼
                    [403 目標不可編輯]         [建立新副本，導向新 skill]
                    （成員但 viewer，或        （scope=team, status=draft,
                     非成員——皆 403，          sourceSkillId=來源 id，
                     因 targetTeamId 是         來源 copyCount+=1）
                     明確參數）
```

兩道都過才會真的複製。要點：

- **第①道用 ResourceReadable（資源層級）**：來源是一個具體資源，失敗要防
  存在性洩漏，所以非成員且非 open+published → **404**。
- **第②道用 CanEdit（團隊層級）**：`targetTeamId` 是呼叫者明確帶進來的
  參數，失敗一律 **403**（成員但 viewer、或根本不是目標團隊成員，都是 403）。
- **admin 為什麼會被擋**：第①②道對 admin 都短路成 true，理論上 admin 一定
  過。但**授權過不代表操作可行**——複製需要一個**具體的 `targetTeamId`**，
  而 admin 的 `teamRoles` 是空的，前端無法給他列出任何「可編輯的目標團隊」
  可選（見 `user-flows.md` §4：admin 的複製按鈕停用）。也就是說 admin 不是
  被授權層擋下，而是**因為沒有合法的目標團隊參數可帶**而做不成。這是第 1
  節提到的「admin 無團隊」不對稱在操作面的具體後果。

複製後兩份文件各自獨立演化（`sourceSkillId` 只是顯示用的「複製自」標記），
資料面細節見 `lifecycle.md` §4.6。

---

## 9. 例外 → HTTP 狀態對照

授權相關例外由 `GlobalExceptionHandler` 統一轉成 HTTP 狀態碼：

| 例外 | HTTP | 意義 | 典型觸發 |
|---|---|---|---|
| `UnauthorizedException` | **401** | 認不出你是誰（身分解析階段） | 缺 `X-Dev-User` header、未知 dev user |
| `ForbiddenException` | **403** | 認得你、但不准你做 | 非團隊成員（清單類）、成員但 VIEWER 想寫 |
| `ResourceNotFoundException` | **404** | 資源不存在，或存在但你無權（不洩漏差異） | 非成員讀/寫具體私有資源、已軟刪除 |
| `ConflictException` | **409** | 狀態衝突 | 刪除仍在 published 的 skill（「先下架才可刪」） |
| `OptimisticLockingConflictException` | **409** | 樂觀鎖版本不符 | 儲存時 `expectedVersion` 與現況不符（回衝突內容供合併） |
| `IllegalStateException` | **409** | 非法狀態 | 一般狀態機違規 |

（另：`IllegalArgumentException` 與欄位驗證失敗 `MethodArgumentNotValidException`
回 **400 Bad Request**，屬輸入驗證，不是授權範疇——例如 `FolderService:29`
的「teamId is required」。）

401 vs 403/404 的分界即「你是誰」與「你能不能」兩階段的分界：401 是身分
解析（第 2 節）失敗，403/404 是授權（第 4 節）失敗。

---

## 10. 已知邊界／未來

- **Keycloak 尚未接入（deferred）**：目前身分完全靠 `X-Dev-User` header +
  `application.yml` 的 dev-users 靜態設定，**沒有密碼、沒有 token 驗證**，
  任何人只要帶對 header 就是那個身分——這只適用於開發/測試環境，**不可用於
  正式環境**。`CurrentUserProvider` 介面是預留的接入縫：未來換上 Keycloak
  版實作（從 JWT/session 解析出 `userId`/`teamRoles`/`admin`），
  `AuthorizationService` 與所有 `require*` 呼叫點**一行都不用改**。決策背景
  見 `docs/decisions/20260703-defer-keycloak-stub-identity.md`。
- **admin 無團隊，因此不能複製到團隊**：admin 靠短路取得跨團隊讀寫，但
  `teamRoles` 為空，導致「複製到團隊」因為沒有可選的目標團隊而做不成
  （見第 8 節）。這是設計上可接受的取捨——admin 的定位是維運/稽核，不是
  內容生產者——但若未來要讓 admin 也能複製，需要額外提供「以哪個團隊身分
  複製」的機制。
- **讚（like）沒有防濫用機制**：`like/unlike` 只要求「看得到該 skill」，
  之後不做任何速率限制或角色限制；冪等性靠唯一索引保證「每人對每個 skill
  一票」，但沒有防止大量帳號刷讚、也沒有針對開放空間「最熱」排序
  （`?sort=likes`）的操縱防護。目前 dev-stub 身分下這不是問題，接 Keycloak
  後若排序權重涉及實際影響力，需要重新評估。
- **授權不查資料庫、只讀已解析身分**：所有 `require*` 判斷只讀請求當下
  `CurrentUser` 的 `teamRoles`/`admin` 快照（第 2 節末）。若身分的團隊角色
  在請求生命週期內於外部變更，不會即時反映——這在 dev-stub 下無意義（設定
  是靜態的），但接 Keycloak 後 token 效期與角色變更的一致性需納入考量。
