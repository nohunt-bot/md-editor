# Original md-editor Plan Summary

**Verdict**: Complete extraction. The original design is a team-internal web-based Skill.md WYSIWYG editor with role-based access (Admin/Editor/Viewer), folder+tag organization, version history, and LLM discovery API. Plan v0.2 patch adds scope-based visibility filtering, server-side caching (Caffeine), and refactors discovery into two-stage (metadata-only match + detail fetch).

---

## Extraction by Criterion

### 1. Overall Product Vision & Intended Users
**plan.md:3-4, §1.1-1.2**: Build a web-based service for team members to write/maintain Skill.md via WYSIWYG editor (no markdown syntax needed), organize via folders/tags/references, track version history, and provide LLM/Orchestrator an API for skill discovery. Four roles: Admin (full control), Editor (read/write own skills), Viewer (read-only + browse/search/copy), Service Account (API only, LLM discovery + batch export).

### 2. Phase Plan (Phase 0..N)
**plan.md:§8**: 
- **Phase 0 (1 week)**: Spring Boot skeleton, Gradle/Docker-Compose, Keycloak resource-server, React+Vite + keycloak-js, CI/CD, OpenAPI auto-generation. Complete: `docker-compose up` + login shows /health 200.
- **Phase 1 (2 weeks)**: skills/folders/tags CRUD, React list+edit pages, folder tree, tag input, user lazy sync. Complete: create/browse/edit/delete skills, organize with folder/tag.
- **Phase 2 (1.5 weeks)**: MDXEditor integration (code block, table), reference picker (@autocomplete), cycle detection, full-text search ($text index). Complete: WYSIWYG editor + skill references + search.
- **Phase 3 (1.5 weeks)**: version snapshots, version list/view/diff/restore, Keycloak role→app-permission mapping, audit log AOP. Complete: versions + proper RBAC + audit.
- **Phase 4 (1 week)**: `/api/discovery/match` endpoint, service account client, vector embedding evaluation. Complete: Orchestrator calls discovery with service token.
- **Phase 5 (1 week)**: markdown bundle export (zip), audit log UI, user management page, empty/loading/error states. **Total ~8 weeks single-person, 5-6 weeks two-person.**

### 3. Permission/Role Model Design
**plan.md:§1.2, §7.5**: Three Keycloak realm roles (`skill-admin`, `skill-editor`, `skill-viewer`) + one service account (confidential client, client credentials grant). Admin: all operations. Editor: CRUD own skills OR all (spec says "if need to restrict use check in service layer"). Viewer: read-only + search + discovery API. Service account (viewer role): LLM/Orchestrator calls discovery. Backend is Keycloak resource-server pattern (OAuth2 JWT validation), **not** identity provider.

### 4. Visibility, Scope, Team, Sharing, Publishing Concepts
**plan.md:§1.3 (non-goals)**: Explicitly NOT doing: real-time collaboration (OT/CRDT), Markdown-outside formats, public sharing / external publishing, mobile app. **plan.md:v0.2 §4.2**: NEW `scope` field on skills (e.g. `["tpm", "backend-dev"]`), `defaultScope` on folders (inherited by skills if `skill.scope=null`). Scope filtering in discovery: `effectiveScope ∩ request.scope ≠ ∅` (empty request = all scopes pass). **Design principle (v0.2 line 43)**: compute effective scope at query time, never write to document — avoids cascade updates when folder scope changes.

### 5. LLM Discovery API Design
**plan.md:§5.2 `/api/discovery/match`** (original): Input query, return ranked skill name+description. **plan.md:v0.2 §5.2 (rewrite)**: `POST /api/discovery/match` request: `{ query, scope[], limit, minScore }`. Response: `{ queryId, matches[] }` where each match is `{ id, name, displayName, description, scope, tags, score, currentVersion, updatedAt }` (no content). Behavior: match name+displayName+description (not content), score desc sort, exclude deleted/archived, scope filter. Matching approach: `$text` index (v0.1 concern R3 flags semantic weakness → consider Atlas Vector Search post-MVP; v0.2 line 245 defers). **queryId** written to audit log for telemetry/debug.

### 6. Editor Feature List (Markdown Features Planned)
**plan.md:§2 (MDXEditor)**: WYSIWYG, supports code block + table. **plan.md:§6.2 (frontend components)**: MetadataForm (name/description/tag/folder). **plan.md:§6.3 (editing UX)**: autosave draft to localStorage (30s interval), true version on save; conflict detection (warn if `updatedAt` changed since edit started); lock hint via polling (soft, not hard lock, shows "OOO editing last activity 1min ago"). **§10.2 (dependencies)**: `@mdxeditor/editor:latest`, `react-diff-viewer-continued` for diff UX, code language support (javascript, python noted). **No images/tables detail explicit**, but MDXEditor is noted to support "table".

### 7. Plan Patch v0.2 Overrides/Amendments
**v0.2 §4.2**: skills + scope field (null = inherit folder.defaultScope). folders + defaultScope array. Effective scope rule: skill.scope overrides folder.defaultScope; null → inherit; no folder → global (all roles). **v0.2 §5.2**: Discovery restructured: only return metadata (no content), clients fetch detail via GET /skills/{id} with ETag (If-None-Match: "v{currentVersion}", 304 if unchanged). **v0.2 §5.5 (new)**: Server-side Caffeine cache: `skillMetadataAll` (all active skills metadata, 10 min TTL), `skillDetail` (skill detail, 10 min TTL), `folderTree` (30 min TTL). Invalidation: create/update/delete skill → evict `skillMetadataAll` + `skillDetail::{id}`; folder operations → evict `skillMetadataAll` + `folderTree`; tag → evict `skillMetadataAll`. **MVP single-instance Caffeine; multi-instance upgrade path pre-planned** (interface `CacheInvalidator`, later swap to `RedisCacheInvalidator` or `MongoChangeStreamCacheInvalidator` without touching service layer). **v0.2 §9 (new risks)**: R8 (cache stale drift → 10min TTL safety net), R9 (scope inheritance confusion → UI distinguish inherit vs override, audit folder scope changes), R10 (discovery rate limit → Bucket4j per service account, queryId audit, alert on anomaly), R11 (weak scoring → $text MVP, Atlas Vector Search later).

### 8. Explicitly Deferred / Rejected Ideas
**plan.md:§1.3 (non-goals)**: No real-time collab (OT/CRDT), no non-Markdown import (Word/Notion), no public sharing, no mobile. **§9 risk R2**: Version retention: NOT doing unlimited history — future policy: keep last 50 + monthly archive, background job purge 90d old. **§9 R3**: LLM discovery ranking; $text index MVP acceptable; vector embedding **post-MVP evaluation** (Atlas Search). **§9 R4**: Multi-edit conflict MVP = last-write-wins + `updatedAt` warning (no WebSocket lock, no CRDT). **plan.md:v0.2 line 10**: **"eval baseline lock 暫不實作（已決定）"** = "eval baseline lock deferred (decided)". **v0.2 §9 / "還沒處理但要記的"** (Not Doing Yet But Remember): Trace ID X-Trace-Id optional; vector search "when keyword match hit rate obviously insufficient" (v0.2 line 251: after your evaluation). Folder scope broadcast: NOT centrally managing — expected behavior: skill discovery rules change when folder scope changes, audit log marks impact count.

---

## Source Mapping

| Criterion | Location | Key Lines |
|-----------|----------|-----------|
| Vision & Users | plan.md:1.1–1.2 | 3–25 |
| Phase Plan | plan.md:§8 | 443–498 |
| RBAC | plan.md:1.2, 7.5; v0.2 | 20–25, 429–439 |
| Scope/Visibility | plan.md:1.3 (non-goal); v0.2:§4.2, 5.2 | plan.md:27–32; v0.2:14–50 |
| Discovery API | plan.md:5.2; v0.2:§5.2 (rewrite) | plan.md:271; v0.2:62–125 |
| Editor Features | plan.md:§2, 6.2–6.3, 10.2 | 40–41, 320–343, 554 |
| v0.2 Amendments | v0.2:§4.2, 5.2, 5.5, 9 | lines 14–246 |
| Deferred / Rejected | plan.md:§1.3, 9; v0.2:10, 249–253 | plan.md:27–32, 502–521; v0.2 full |

---

## Key Architectural Decisions (Load-Bearing)

1. **MongoDB** over relational: document-shaped, schema evolution (embeddings/attachments later), version append-only fits. (plan.md:§2)
2. **Keycloak resource-server** (not auth server): JWT validation only, identity stays external. (plan.md:§7.2)
3. **Scope by query-time calculation, not denormalization**: prevents cascade updates. (v0.2:line 43)
4. **Discovery two-stage**: metadata-only match + lazy detail fetch (ETag caching). (v0.2:§5.2)
5. **Server-side Caffeine cache** for discovery performance; multi-instance path pre-designed. (v0.2:§5.5)
6. **Soft delete** for referential stability. (plan.md:§4.4)
7. **$text index MVP, vector search post-evaluation**: keyword search acceptable initially. (plan.md:R3; v0.2:R11)

---

## Estimated Effort & Dependencies

- **Total**: ~8 weeks single-person, 5–6 weeks two-person (plan.md:§8 end).
- **Critical path**: Foundation (Phase 0) + CRUD (Phase 1) = 3 weeks minimum before testable MVP.
- **No external unprovided dependencies**: Keycloak exists, MongoDB sourced (Atlas or self-hosted), all tools listed.

---

**Summary File**: `/private/tmp/claude-501/-Users-ch-dotfiles-claude/430080a1-78f8-47f1-82c7-cafc5a77f0aa/scratchpad/original-plan-summary.md`
