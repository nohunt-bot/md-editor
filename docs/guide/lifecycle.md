# 文件（Skill）生命週期

本文件詳細說明一份 `SKILL.md` 文件（後端資料模型 `Skill`，`backend/src/main/
java/com/company/skillmd/skill/Skill.java`）從建立到刪除的完整生命週期：每個
狀態、每個轉換、資料欄位怎麼變、以及不同身分各自看到什麼。所有行為皆對照
`SkillService.java`（服務層）與 `VersionService.java`（版本層）逐行核實，
如與直覺假設不符，一律以程式碼為準。

閱讀前提：已讀過 `setup.md`（服務啟動）、`login.md`（dev-stub 身分）、
`user-flows.md`（操作手順，本文著重「資料怎麼變」而非「畫面怎麼點」）。

## 目錄

1. [概觀](#1-概觀)
2. [生命週期總覽圖](#2-生命週期總覽圖)
3. [狀態機](#3-狀態機)
4. [逐階段詳解](#4-逐階段詳解)
   - [4.1 建立（create）](#41-建立create)
   - [4.2 編輯與版本（update）](#42-編輯與版本update)
   - [4.3 發布與凍結（publish）](#43-發布與凍結publish)
   - [4.4 發布後編輯與重新發布（re-publish）](#44-發布後編輯與重新發布re-publish)
   - [4.5 下架（unpublish）](#45-下架unpublish)
   - [4.6 複製到團隊（copy-to-team）](#46-複製到團隊copy-to-team)
   - [4.7 版本還原（restore）](#47-版本還原restore)
   - [4.8 讚與引用數（like / copyCount）](#48-讚與引用數like--copycount)
   - [4.9 軟刪除（soft delete）](#49-軟刪除soft-delete)
5. [欄位變化總表](#5-欄位變化總表)
6. [可見性總表](#6-可見性總表)
7. [已知邊界](#7-已知邊界)

---

## 1. 概觀

一份「文件」在資料庫裡是 `skills` collection 的一筆 `Skill` 文件。它的身分
由兩條獨立的軸決定，而不是單一個「狀態」欄位：

- **`status`**：`draft`（草稿，未公開）｜`published`（已發布，出現在開放
  空間）。
- **`scope`**：`team`（僅團隊內部）｜`open`（曾經發布過，公開身分——見
  4.5 節，下架後 `scope` 不會退回 `team`）。

換句話說 `scope` 記錄的是「這份文件曾經公開過」的**意圖 / 身分**，`status`
才是「現在看不看得到」的**開關**。兩軸交叉出的實際狀態只有三種會被使用者
碰到：`team+draft`（一般草稿）、`open+published`（公開中）、
`open+draft`（下架後）——不存在 `team+published` 這個組合（發布必連動
`scope=open`，見 4.3 節）。

**關鍵欄位一覽：**

| 欄位 | 型別 | 意義 |
|---|---|---|
| `status` | `draft`\|`published` | 是否出現在開放空間 |
| `scope` | `team`\|`open` | 是否「曾經」公開過（intent，不因下架而回退） |
| `currentVersion` | Integer | 最新內容的版本號，每次儲存 +1（含還原） |
| `publishedVersion` | Integer | 上次發布/重新發布當下的 `currentVersion` 值 |
| `publishedSnapshot` | 內嵌物件 | 發布當下 `{displayName, description, content, tags, version}` 的凍結副本 |
| `publishedAt` | Instant | 上次發布/重新發布的時間戳 |
| `sourceSkillId` | String\|null | 若本文件是「複製」產生，指向原始文件 id；原生建立則為 `null` |
| `deletedAt` | Instant\|null | 軟刪除時間戳；非 `null` 即視為不存在（404） |
| `likeCount` | Integer | 讚數（denormalized，來源真相是 `skill_likes` collection） |
| `copyCount` | Integer | 被複製到其他團隊的次數（只加在來源文件上） |

`publishedSnapshot` 的存在是本系統理解「發布」語意的關鍵：發布不是把
`status` 改個字串這麼簡單，而是把當下內容**複印凍結**一份，之後團隊內部
還能繼續編輯最新內容（`currentVersion` 持續往前走），但非團隊成員看到的
永遠是那份凍結副本，直到下一次（重新）發布刷新它為止。設計理由與被否決
的替代方案見 `docs/decisions/20260705-publish-freeze-embedded-snapshot.md`。

---

## 2. 生命週期總覽圖

```
                              [建立 create]
                          POST /api/skills
                     scope=team, status=draft
                       currentVersion=1
                       version snapshot "Created" (v1)
                                │
                                ▼
                     ┌───────────────────────┐
                     │   draft（團隊內部）      │◀───────────────┐
                     └───────────────────────┘                 │
                                │       ▲                       │
                     編輯 update│       │還原 restore            │
                     currentVersion+=1 │currentVersion+=1        │
                     新版本快照  │       │（載入舊版內容後也 +=1）  │
                                │       │                       │
                                ▼       │                       │
                     ┌───────────────────────┐                 │
                     │  draft（可重複編輯）     │─────────────────┘
                     └───────────────────────┘
                                │
                                │ 發布 publish
                                │ scope=open, status=published
                                │ publishedAt=now
                                │ publishedVersion=currentVersion
                                │ publishedSnapshot=凍結副本
                                ▼
                     ┌───────────────────────┐
              ┌─────▶│ published（開放空間可見） │◀─────┐
              │      └───────────────────────┘       │
              │                │       │              │
   重新發布 re-publish          │       │  下架 unpublish │
   publishedVersion/            │       │  status=draft   │
   publishedSnapshot 刷新       │       │  (scope 仍=open) │
              │                │       ▼              │
              └────────────────┘  ┌───────────────────────┐
                                   │  draft（scope=open，     │
                        編輯 update│   快照保留但不可見）      │
                        （見上方   └───────────────────────┘
                        draft 迴圈）        │       ▲
                                            │       │ 再次 publish
                                            │       │（回到 published，
                                            │       │  快照被新內容刷新）
                                            └───────┘

  ── 任何 status/scope 下 ──▶  軟刪除 soft delete（deletedAt=now）
                                （published 必須先 unpublish，見 §7）
                                從清單/搜尋/詳情消失（讀取視為 404）

  ── 分支：複製到團隊 copy-to-team（僅 scope=open ∧ status=published 可觸發）──
     來源 skill（open, published, copyCount+=1，內容不受影響）
                    │
                    ▼ POST /api/skills/{id}/copy-to-team
     ┌─────────────────────────────────────┐
     │        全新獨立文件（新 id）             │
     │  scope=team, status=draft            │
     │  currentVersion=1, sourceSkillId=來源id │
     └─────────────────────────────────────┘
                    │
                    └──▶ 進入自己的 draft 生命週期（與來源之後互不影響、
                         不會同步——見 §7）

  ── 讚 like/unlike：不影響 status/scope，任何看得見文件的人皆可操作 ──
     skill_likes（獨立 collection）+ 文件上 likeCount（denormalized）
```

---

## 3. 狀態機

```
                         ┌───────────────────────────────┐
                         │                                │
                         │      create                    │
                         │  scope=team, status=draft       │
                         ▼                                │
                 ┌───────────────┐                        │
        ┌───────▶│ team / draft   │◀──────────────┐        │
        │        └───────────────┘                │        │
        │ update           │                       │        │
        │ currentVersion++ │ publish               │restore │
        │ (自迴圈)          │ scope→open             │curVer++│
        └───────────────────┤ status→published      │        │
                             │ publishedVersion=cur   │        │
                             │ publishedSnapshot=凍結  │        │
                             ▼                        │        │
                     ┌────────────────┐               │        │
              ┌─────▶│ open / published │──────────────┘        │
              │      └────────────────┘                        │
    re-publish│              │                                  │
    快照+版本重建│    unpublish│ status→draft                     │
              │              │ （scope 仍=open）                 │
              └──────────────┤                                  │
                             ▼                                  │
                     ┌────────────────┐                         │
                     │ open / draft    │─────────────────────────┘
                     │（快照保留不可見）│  update（同左側 draft 迴圈，
                     └────────────────┘  currentVersion++）
                             │
                             │ publish（回到 published，見上方）
                             ▼
                        （回 open/published）

   任一節點 ──delete（若 status=published 先擋 409，需先 unpublish）──▶
                     ┌────────────────┐
                     │    deleted       │  （deletedAt=now；終態，
                     │  （終態，隱藏）  │   讀取一律視為 404）
                     └────────────────┘
```

每條邊的觸發與關鍵欄位變化：

| 邊 | 觸發 API | 關鍵欄位變化 |
|---|---|---|
| （起點）→ team/draft | `POST /api/skills` | `scope=team`, `status=draft`, `currentVersion=1` |
| team/draft → team/draft | `PUT /api/skills/{id}` | `currentVersion += 1` |
| team/draft → open/published | `POST /api/skills/{id}/publish` | `scope=open`, `status=published`, `publishedAt=now`, `publishedVersion=currentVersion`, `publishedSnapshot=凍結副本` |
| open/published → open/published | `PUT /api/skills/{id}`（發布後編輯，不變狀態） | `currentVersion += 1`（`publishedVersion`/`publishedSnapshot` 不動——形成漂移） |
| open/published → open/published | `POST /api/skills/{id}/publish`（重新發布） | `publishedVersion=currentVersion`, `publishedSnapshot=` 用當下內容重建, `publishedAt=now` |
| open/published → open/draft | `DELETE /api/skills/{id}/publish` | `status=draft`（`scope` 不變，仍是 `open`） |
| open/draft → open/published | `POST /api/skills/{id}/publish` | 同「team/draft → open/published」，快照被當下內容刷新 |
| open/draft → open/draft | `PUT /api/skills/{id}` | `currentVersion += 1` |
| 任一 draft/published 節點 → 自身 | `POST /api/skills/{id}/versions/{v}/restore` | 載入版本 v 內容 → `currentVersion += 1`（還原本身也是一次新版本） |
| 任一非 published 節點 → deleted | `DELETE /api/skills/{id}` | `deletedAt=now`（若目前 `status=published` 則 409，需先下架） |

---

## 4. 逐階段詳解

### 4.1 建立（create）

```
[使用者填表單：name/displayName/description/content/tags/folder]
                        │
                        ▼
          POST /api/skills （需對 teamId 有 EDITOR 權限）
                        │
                        ▼
        Skill{ scope=team, status=draft, currentVersion=1,
               sourceSkillId=null, publishedAt=null }
                        │
                        ▼
        versionService.createVersion(saved, "Created", userId)
        （存一筆 version=1 的快照，供日後版本歷史/還原使用）
                        │
                        ▼
                [回傳 201/200 + SkillResponse]
```

程式碼（`SkillService.createSkill`）：

```java
skill.setScope("team");
skill.setStatus("draft");
skill.setPublishedAt(null);
skill.setSourceSkillId(null);
...
skill.setCurrentVersion(1);
Skill saved = skillRepository.save(skill);
versionService.createVersion(saved, "Created", userId);
```

- **資料變化**：全新文件，`scope=team`／`status=draft`／`currentVersion=1`／
  `sourceSkillId=null`／`publishedVersion=null`／`publishedSnapshot=null`。
  同時在 `skill_versions` collection 留下一筆 v1 快照。
- **誰看得到**：僅建立者所屬團隊的成員（含 viewer）與 admin；非成員存取
  會被 `getSkill` 的可見性檢查擋下（`team+非published` 一律要求
  `requireResourceReadable`，非成員得到 404）。
- **API**：`POST /api/skills`。

### 4.2 編輯與版本（update）

```
[編輯表單/內容] ──儲存──▶ PUT /api/skills/{id}
                              │
                    expectedVersion 是否符合 currentVersion？
                         ┌────是────┴────否────┐
                         ▼                     ▼
              [套用欄位變更]          [409 OptimisticLockingConflictException]
                         │              （前端跳 ConflictDialog：覆蓋/合併/放棄）
                         ▼
              currentVersion += 1
                         │
                         ▼
         versionService.createVersion(saved, commitMessage, userId)
         （存一筆新版本快照，含 commit message）
                         │
                         ▼
                    [回傳最新 SkillResponse]
```

程式碼（`SkillService.updateSkill`）：

```java
if (request.expectedVersion() != null && !Boolean.TRUE.equals(request.forceUpdate())) {
    if (!skill.getCurrentVersion().equals(request.expectedVersion())) {
        throw new OptimisticLockingConflictException(...);
    }
}
...
skill.setCurrentVersion(skill.getCurrentVersion() + 1);
Skill saved = skillRepository.save(skill);
versionService.createVersion(saved, request.commitMessage(), userId);
```

- **資料變化**：任何非 null 欄位（name/displayName/description/content/
  folderId/tags/references/prerequisites）被套用；`lastEditorId` 更新；
  `currentVersion += 1`；`skill_versions` 新增一筆該版本的快照。
  **`status`／`scope`／`publishedVersion`／`publishedSnapshot` 完全不受影響**——
  這是 4.4 節「發布後編輯造成漂移」的根源。
- **樂觀鎖**：`expectedVersion` 與資料庫目前 `currentVersion` 不符時回
  409（除非帶 `forceUpdate=true`）。
- **誰看得到**：與建立相同——僅該團隊成員/admin 能編輯（`
  requireResourceEditable`）。若此文件已發布，非成員此時仍讀到舊的
  `publishedSnapshot`（見 4.4 節）。
- **API**：`PUT /api/skills/{id}`。

### 4.3 發布與凍結（publish）

```
[team/draft 或 open/draft 文件] ──發布──▶ POST /api/skills/{id}/publish
                                              │
                                   （需對該團隊有 EDITOR/admin 權限）
                                              │
                                              ▼
                          scope=open, status=published, publishedAt=now
                          publishedVersion = currentVersion
                          publishedSnapshot = PublishedSnapshot.of(skill)
                          　　（displayName/description/content/tags/version 的凍結副本）
                                              │
                                              ▼
                              [出現在開放空間 /open]
```

程式碼（`SkillService.publishSkill`）：

```java
skill.setScope("open");
skill.setStatus("published");
skill.setPublishedAt(Instant.now());
skill.setPublishedVersion(skill.getCurrentVersion());
skill.setPublishedSnapshot(Skill.PublishedSnapshot.of(skill));
```

- **資料變化**：`scope=open`、`status=published`、`publishedAt=now`、
  `publishedVersion` 設為當下 `currentVersion`、`publishedSnapshot` 建立
  （深拷貝 displayName/description/content/tags + version 標記）。
  **`currentVersion` 本身不變**——發布不是一次新版本，只是把現有版本凍結
  存證。
- **誰看得到**：發布瞬間開始，任何登入使用者都能在開放空間看到（非成員讀
  `publishedSnapshot`，見 §6）；團隊成員/admin 仍讀 `currentVersion` 的
  live 內容（此刻兩者相同）。
- **API**：`POST /api/skills/{id}/publish`。

### 4.4 發布後編輯與重新發布（re-publish）

```
[open/published，團隊成員繼續編輯] ──PUT /api/skills/{id}──▶ currentVersion += 1
                                                                    │
                                        publishedVersion／publishedSnapshot 不動
                                                                    │
                                                                    ▼
                              currentVersion > publishedVersion（版本漂移）
                                                                    │
                         ┌──────────────────────────────────────────┤
                         ▼                                          ▼
              [團隊編輯者看到「有未發布的                [非成員仍看到舊的
               變更／重新發布」提示，              publishedSnapshot ＋（凍結）標記，
               含目前公開版本 v{publishedVersion}]         看不到任何漂移訊號]
                         │
                         │ 點「重新發布」
                         ▼
                POST /api/skills/{id}/publish（同 4.3，內容用當下 currentVersion 重建）
                         │
                         ▼
        publishedVersion = currentVersion（追上）
        publishedSnapshot = 用最新內容重建
                         │
                         ▼
              [非成員下次讀取 → 看到更新後內容]
```

- **資料變化**：發布後的每次 `update` 只推進 `currentVersion`；
  `publishedVersion`／`publishedSnapshot` 原地不動，兩者出現落差
  （`currentVersion > publishedVersion`）。重新發布時呼叫的是**同一個**
  `publishSkill` 方法（4.3 節程式碼），效果是把 `publishedVersion` 追上
  最新 `currentVersion`，`publishedSnapshot` 整份重建。
- **誰看得到什麼**：這是本系統「發布」語意最容易誤解的地方——
  - 團隊成員／admin：任何時候都讀 `currentVersion` 的即時內容，不會有
    「凍結」問題，但會看到「有未發布的變更」提示（`hasUnpublishedChanges`
    邏輯，前端 `SkillDetailPage.tsx`）。
  - 非成員：在重新發布之前，永遠讀到舊的 `publishedSnapshot`，UI 會多一個
    （凍結）標記，完全不知道團隊已經編輯過。
- **API**：編輯用 `PUT /api/skills/{id}`；重新發布重用
  `POST /api/skills/{id}/publish`（沒有獨立的 re-publish 端點）。

### 4.5 下架（unpublish）

```
[open/published] ──下架──▶ DELETE /api/skills/{id}/publish
                                    │
                        （需對該團隊有 EDITOR/admin 權限）
                                    │
                                    ▼
                          status = draft
                    （注意：scope 仍是 "open"，不會退回 "team"）
                                    │
                                    ▼
                  [從開放空間清單/搜尋消失；publishedSnapshot 保留但不再對外可見]
```

程式碼（`SkillService.unpublishSkill`）：

```java
skill.setStatus("draft");
// scope 未被改動——保留 "open"
```

- **資料變化**：只有 `status` 改回 `draft`。`scope` **刻意不變**（保持
  `open`，代表這份文件的「意圖」仍是公開向——ADR 用語：scope 記錄 intent）。
  `publishedSnapshot`／`publishedVersion` 兩者都原封不動保留在文件裡，只是
  不再被任何讀取路徑回傳（`listOpenSkills` 過濾 `status=published`；非成員
  `getSkill` 的可見性檢查也要求 `open ∧ published`，下架後非成員直接
  404／禁止）。
- **誰看得到**：下架後只剩團隊成員/admin 能看到這份文件（讀 live 內容）；
  非成員完全看不到（含之前公開過的舊網址也一樣）。已經「複製到團隊」出去
  的副本不受影響——它們是獨立文件（見 4.6 節）。
- **API**：`DELETE /api/skills/{id}/publish`。

### 4.6 複製到團隊（copy-to-team）

```
[來源: scope=open ∧ status=published 的文件]
                    │
                    │ 可見性：來源對呼叫者可讀（成員 or open+published）
                    │ 且呼叫者對 targetTeamId 有 EDITOR 權限
                    ▼
        POST /api/skills/{id}/copy-to-team  { targetTeamId }
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
[來源 skill 更新]         [建立全新 copy 文件]
copyCount += 1            name = uniqueName(target, source.name)（衝突自動加 -2/-3...）
（內容不受影響）           scope=team, status=draft
                          currentVersion=1
                          sourceSkillId=<來源 id>
                          folderId=null（不繼承來源資料夾）
                          tags=複製自來源（獨立 list）
                    │
                    ▼
       [兩份文件各自獨立演化——複製後互不同步]
```

程式碼（`SkillService.copyToTeam`）：

```java
copy.setTeamId(targetTeamId);
copy.setScope("team");
copy.setStatus("draft");
copy.setPublishedAt(null);
copy.setSourceSkillId(source.getId());
source.setCopyCount((source.getCopyCount() == null ? 0 : source.getCopyCount()) + 1);
skillRepository.save(source);
...
copy.setCurrentVersion(1);
```

- **資料變化**：這是**建立一份新文件**，不是分支/連結。新文件的
  `sourceSkillId` 指回來源 id（僅供顯示「複製自」，不用於任何同步邏輯）；
  `currentVersion` 重新從 1 開始；`scope=team`／`status=draft`（回到最初
  的草稿身分，即使來源是 published）。來源文件唯一的變化是
  `copyCount += 1`。
- **誰看得到**：複製動作本身要求呼叫者「看得到來源」（團隊成員、或
  `open+published` 對外可見、或 admin）且對目標團隊有編輯權；複製完成後
  的新文件遵循一般 team/draft 可見性規則（僅新團隊成員/admin 可見）。
- **API**：`POST /api/skills/{id}/copy-to-team`，body `{ targetTeamId }`。

### 4.7 版本還原（restore）

```
[任一版本 N 的快照存在於 skill_versions] ──還原──▶
        POST /api/skills/{id}/versions/{N}/restore
                    │
        （需對該團隊有 EDITOR/admin 權限——editor-only）
                    │
                    ▼
        載入版本 N 的 snapshot：
        name/displayName/description/content/folderId/tags
                    │
                    ▼
        currentVersion += 1（還原本身視為一次新的儲存）
                    │
                    ▼
        versionService.createVersion(saved,
            "Restored to version {N}", userId)
        （在版本歷史新增一筆，而不是刪掉 N 之後的版本）
```

程式碼（`VersionService.restoreToVersion`）：

```java
skill.setContent(oldVersion.getSnapshot().getContent());
...
skill.setCurrentVersion(skill.getCurrentVersion() + 1);
Skill saved = skillRepository.save(skill);
createVersion(saved, "Restored to version " + versionNumber, userId);
```

- **資料變化**：內容欄位（name/displayName/description/content/folderId/
  tags）被版本 N 的快照覆蓋；`currentVersion` **仍然 +1**（不是跳回 N）——
  版本歷史是只增不減的線性序列，還原是「以舊內容產生新版本」，不是時間
  倒流。`status`／`scope`／`publishedVersion`／`publishedSnapshot` 不受
  影響（若文件已發布，還原同樣會造成 4.4 節的版本漂移，需要重新發布才會
  反映到非成員可見的快照）。
- **誰看得到**：只有 EDITOR（或 admin）能還原；VIEWER 在 UI 上看不到還原
  按鈕（`user-flows.md` §5）。
- **API**：`POST /api/skills/{id}/versions/{version}/restore`（另有
  `GET /api/skills/{id}/versions` 列表、
  `GET /api/skills/{id}/versions/{version}` 查看單一版本詳情）。

### 4.8 讚與引用數（like / copyCount）

```
[任何看得見此文件的使用者] ──讚──▶ PUT /api/skills/{id}/like
                          ──收回讚──▶ DELETE /api/skills/{id}/like
                                    │
                    先檢查可見性（requireVisible，同 getSkill 的規則）
                                    │
                    skill_likes（唯一索引 skillId+userId）新增/刪除一筆
                                    │
                                    ▼
                likeCount = skillLikeRepository.countBySkillId(id)
                （重新計算並寫回 skill.likeCount——每次操作都以來源表為準，
                 不是簡單 +1/-1，天生冪等）
```

- **資料變化**：`skill_likes` 是唯一真相來源（source of truth），
  `skill.likeCount` 是每次操作後**重新查詢計數**寫回的 denormalized 欄位
  （非簡單自增，因此重複按同方向不會累加）。`copyCount` 則只在 4.6 節的
  複製動作中 +=1，没有对应的「取消」操作。
- **不影響**：`status`／`scope`／`currentVersion`／`publishedVersion` 皆不
  受讚/複製影響。
- **誰看得到**：讚跟看得到文件的權限綁在一起（`requireVisible` 與
  `getSkill` 用同一組可見性判斷）；`likeCount`／`copyCount` 在 team 視圖與
  frozen 視圖都會回傳（不分版本）。開放空間支援依讚數排序
  （`?sort=likes`）。
- **API**：`PUT`/`DELETE /api/skills/{id}/like`；`copyCount` 無獨立 API，
  是 copy-to-team 的副作用。

### 4.9 軟刪除（soft delete）

```
[任一 status 的文件] ──刪除──▶ DELETE /api/skills/{id}
                                    │
                        （需對該團隊有 EDITOR/admin 權限）
                                    │
                          status == "published" ？
                              ┌────是────┴────否────┐
                              ▼                     ▼
                    [409 Conflict：            [deletedAt = now]
                     「先下架才可刪」]                │
                                                    ▼
                                    [從團隊清單/開放空間/搜尋/詳情全部消失；
                                     任何 getById 路徑視為不存在（404）]
```

程式碼（`SkillService.deleteSkill`）：

```java
if ("published".equals(skill.getStatus())) {
    throw new ConflictException("先下架才可刪");
}
skill.setDeletedAt(Instant.now());
```

- **資料變化**：文件**不會**從資料庫移除，只設定 `deletedAt` 時間戳。所有
  讀取路徑（`getSkill`、`listSkills`、`listOpenSkills`）都會過濾
  `deletedAt == null`（或以 `.filter(s -> s.getDeletedAt() == null)`
  排除），效果上等同 404 / 從搜尋消失。
- **守門**：若目前 `status=published`，刪除會被擋下並回 409（訊息
  「先下架才可刪」），必須先呼叫 unpublish。這是本文件最重要的邊界規則
  之一，見 §7。
- **誰看得到**：軟刪除後任何人（含原團隊成員）都無法再透過一般 API 讀到
  此文件——沒有「僅 admin 可見已刪除項目」的例外路徑。這是終態，本文件
  沒有描述「復原刪除」的 API。
- **API**：`DELETE /api/skills/{id}`。

---

## 5. 欄位變化總表

「轉換後」欄指的是該操作**執行成功後**的欄位值；`—` 表示該欄位在此轉換
中不受影響（維持轉換前的值）；`(unchanged)` 特別標注是提醒讀者這是常見誤解
點。

| 轉換 | `status` | `scope` | `currentVersion` | `publishedVersion` | `publishedSnapshot` | `publishedAt` | `sourceSkillId` | `deletedAt` | `likeCount` | `copyCount` |
|---|---|---|---|---|---|---|---|---|---|---|
| 建立 create | `draft` | `team` | `1` | `null` | `null` | `null` | `null` | `null` | `0`/`null`* | `0`/`null`* |
| 編輯 update | — | — | `+1` | — | — | — | — | — | — | — |
| 發布 publish | `published` | `open` | — (unchanged) | `= currentVersion` | 重建（凍結當下內容） | `now` | — | — | — | — |
| 發布後編輯 | — (仍 published) | — | `+1` | — (unchanged，形成漂移) | — (unchanged，形成漂移) | — | — | — | — | — |
| 重新發布 re-publish | — | — | — | `= currentVersion`（追上） | 重建（用最新內容） | `now`（刷新） | — | — | — | — |
| 下架 unpublish | `draft` | — (仍 `open`) | — | — (保留) | — (保留但不可見) | — | — | — | — | — |
| 複製到團隊（新文件） | `draft` | `team` | `1` | `null` | `null` | `null` | `= 來源 id` | `null` | `0`/`null`* | `0`/`null`* |
| 複製到團隊（來源文件） | — | — | — | — | — | — | — | — | — | `+1` |
| 版本還原 restore | — | — | `+1` | — | — | — | — | — | — | — |
| 讚 like/unlike | — | — | — | — | — | — | — | — | 重新計算（`skill_likes` 計數） | — |
| 軟刪除 delete | — | — | — | — | — | — | — | `now` | — | — |

\* `likeCount`/`copyCount` 的初始值取決於實體預設（未在 `createSkill`/
`copyToTeam` 中顯式設定，欄位為 `Integer` 包裝型別，初始為 `null`；
首次 like/copy 動作會把它們變成實際整數）。

---

## 6. 可見性總表

| 文件狀態 | 團隊成員（含 viewer） | 非成員 | admin |
|---|---|---|---|
| `team` / `draft` | live（`currentVersion` 的即時內容） | **404**（`requireResourceReadable` 直接拒絕，非 open+published 一律不可讀） | live |
| `open` / `published` | live（`currentVersion`，並可能看到「有未發布的變更」提示） | **frozen**（`publishedSnapshot` / `publishedVersion`，UI 附「（凍結）」標記） | live |
| `open` / `draft`（下架後） | live（`currentVersion`） | **404**（`listOpenSkills` 過濾 `status=published`；detail 的可見性判斷同樣要求 `published`） | live |
| 已軟刪除（任何 status/scope） | **404** | **404** | **404**（無「檢視已刪除項目」的特例路徑） |

補充：
- 「live」＝直接讀 `Skill` 實體目前的欄位（`toResponse`）；「frozen」＝讀
  `publishedSnapshot` 內嵌物件（`toFrozenResponse`），沒有 snapshot 的舊資料
  （遷移前）才會 fallback 回 live 欄位。
- `likeCount`／`copyCount`／`sourceSkillId`／`publishedAt` 這些「中繼資料」
  欄位在 live 與 frozen 兩種回應中都會回傳（不受凍結規則影響，因為它們本來
  就是全域可見的統計/來源資訊，不是「內容」本身）。
- admin 一律視為可讀取任意 team 的 live 內容（`AuthorizationService` 的
  admin 短路邏輯），但 admin 本身不屬於任何團隊，因此在「複製到團隊」這類
  需要「目標團隊」的操作上，admin 反而因為沒有可編輯團隊而被擋（見
  `user-flows.md` §4）。

---

## 7. 已知邊界

- **發布中的文件必須先下架才能刪除**：`deleteSkill` 對
  `status=="published"` 直接丟 409（`"先下架才可刪"`），沒有「強制刪除」
  的旁路。這保證任何曾經公開過的內容在被徹底移除前，一定先經過「從開放
  空間消失」這一步，避免外部使用者手上的連結突然變成刪除但看起來像
  普通 404（實際上兩者現象一致——都是 404——但下架/刪除在資料庫語意上是
  兩個不同狀態，此保證是給營運/稽核流程用的，不是給終端使用者的視覺差異）。
- **下架後 `publishedSnapshot`／`publishedVersion` 保留但不可見**：不會被
  清空或歸零，只是所有讀取路徑都多加了 `status=published` 的過濾條件。
  好處是重新發布時不需要「從零重建」，也保留了「上次公開的內容是什麼」的
  稽核軌跡；代價是文件在下架狀態下仍然佔用兩份內容的儲存空間（live +
  frozen）。
- **複製（copy-to-team）不追蹤上游、不會同步**：`sourceSkillId` 只是一個
  指標式的「複製自」標記，用於 UI 顯示與 `copyCount` 統計，複製後的文件是
  完全獨立的實體——來源之後的任何編輯/重新發布/下架都不會傳播到複製版本，
  複製版本的編輯也不會回饋到來源。若未來要做「同步更新」或「upstream diff」
  之類的功能，現在的資料模型不支援，需要額外設計。
- **references / prerequisites 目前只有 API，沒有編輯器 UI**：資料模型
  已支援 `SkillReference{skillId, relation}` 與
  `SkillPrerequisite{skillId, note}`，`ReferenceResolver` 也做了循環參照
  偵測，但 `SkillEditor.tsx` 的表單目前沒有對應輸入介面——這兩個欄位只能
  透過直接呼叫 `POST`/`PUT /api/skills` 帶對應陣列來設定（詳見
  `user-flows.md` §10 的 curl 範例）。這是「已建但未完成」的已知缺口，
  不是 bug。
