#!/bin/bash
# Seed a demonstrable cross-team marketplace via the REST API.
#
# Two teams, two identities (dev-stub, NO Keycloak):
#   - alice : team-a (平台團隊) editor   -> X-Dev-User: alice
#   - carol : team-b (資料團隊) editor   -> X-Dev-User: carol
# Each team gets several skills, some published to the open space and at least
# one left as a private draft (to prove drafts are NOT cross-team visible).
#
# RUN ORDER (a human demo):
#   1. docker-compose up -d               # mongo + backend + frontend, no keycloak
#   2. wait until: curl http://localhost:8080/api/health  -> OK
#   3. ./seed-data.sh                      # (this script) runs the migration then seeds
#   4. act as alice: curl -H 'X-Dev-User: alice' http://localhost:8080/api/skills?teamId=team-a
#      act as carol: curl -H 'X-Dev-User: carol' http://localhost:8080/api/skills?teamId=team-b
#      open space:   curl -H 'X-Dev-User: bob'   'http://localhost:8080/api/skills?view=open'
#
# Re-runnable: pass --reset to clear skills/folders/tags first (teams are kept and
# re-upserted). Without --reset, unique (teamId,name) collisions are tolerated and
# reported as skips, so a second run does not hard-fail.
#
# NOTE ON HEADERS: POST/PUT /api/skills require X-User-Id (author identity) AND
# authorization is driven by X-Dev-User. We send BOTH set to the same user so the
# author field and the authz check agree. Publish uses X-Dev-User only.

set -u

API_BASE="${API_BASE:-http://localhost:8080}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/skillmd}"
MIGRATION="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts/migrate-20260703-marketplace.js"

RESET=0
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

echo "🌱 Seeding cross-team marketplace demo data..."
echo "   API_BASE=$API_BASE"

# ---------------------------------------------------------------------------
# 1. Migration + teams. The migration script seeds team-a/team-b; we then
#    upsert human-friendly Chinese display names for the demo.
# ---------------------------------------------------------------------------
if command -v mongosh >/dev/null 2>&1; then
  echo "📦 Running marketplace migration..."
  mongosh "$MONGO_URI" "$MIGRATION" --quiet || {
    echo "⚠️  migration failed (is MongoDB up?) — continuing, teams may be missing" >&2
  }

  if [ "$RESET" -eq 1 ]; then
    echo "🧹 --reset: clearing skills / folders / tags (teams kept)..."
    mongosh "$MONGO_URI" --quiet <<'EOF'
db.skills.deleteMany({});
db.folders.deleteMany({});
db.tags.deleteMany({});
print("cleared skills/folders/tags");
EOF
  fi

  echo "🏷  Setting team display names (平台團隊 / 資料團隊)..."
  mongosh "$MONGO_URI" --quiet <<'EOF'
db.teams.updateOne({ _id: "team-a" }, { $set: { displayName: "平台團隊" } }, { upsert: false });
db.teams.updateOne({ _id: "team-b" }, { $set: { displayName: "資料團隊" } }, { upsert: false });
print("team display names set");
EOF
else
  echo "⚠️  mongosh not found — skipping migration/reset. Assuming teams already exist." >&2
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# create_skill <dev-user> <team> <name> <displayName> <description> <tags-json> <content>
# echoes the created skill id (empty on failure).
create_skill() {
  local user="$1" team="$2" name="$3" display="$4" desc="$5" tags="$6" content="$7"
  local body resp id
  body=$(cat <<JSON
{
  "name": "$name",
  "displayName": "$display",
  "description": "$desc",
  "content": $(json_str "$content"),
  "teamId": "$team",
  "tags": $tags
}
JSON
)
  resp=$(curl -sS -X POST "$API_BASE/api/skills" \
    -H "Content-Type: application/json" \
    -H "X-User-Id: $user" \
    -H "X-Dev-User: $user" \
    -d "$body")
  id=$(printf '%s' "$resp" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  if [ -n "$id" ]; then
    echo "   ✓ [$team] $name ($id)" >&2
    printf '%s' "$id"
  else
    echo "   ⚠️  skipped [$team] $name -> $resp" >&2
    printf ''
  fi
}

# publish_skill <dev-user> <id>
publish_skill() {
  local user="$1" id="$2"
  [ -z "$id" ] && { echo "   ⚠️  publish skipped (no id)" >&2; return; }
  local resp
  resp=$(curl -sS -X POST "$API_BASE/api/skills/$id/publish" -H "X-Dev-User: $user")
  if printf '%s' "$resp" | grep -q '"status"[[:space:]]*:[[:space:]]*"published"'; then
    echo "   ★ published $id" >&2
  else
    echo "   ⚠️  publish failed for $id -> $resp" >&2
  fi
}

# json_str <text>: emit a JSON-escaped string literal (handles quotes/newlines).
json_str() {
  printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

# ---------------------------------------------------------------------------
# 2. team-a skills as alice (editor). Publish 2, leave 1+ draft.
# ---------------------------------------------------------------------------
echo "👩‍💻 alice / team-a (平台團隊)..."

A1=$(create_skill alice team-a "github-pr-workflow" "GitHub PR Workflow" \
  "分支、提交、開 PR、CI、合併的標準流程" '["github","workflow","ci"]' \
'# GitHub PR Workflow

## When to use
標準化團隊的 pull request 流程。

## Steps
1. 建立分支 `feature/<ticket>`
2. 提交並推送
3. 開 PR，等待 CI 綠燈

```bash
git switch -c feature/PLAT-123
git push -u origin HEAD
```')

A2=$(create_skill alice team-a "ci-pipeline-setup" "CI Pipeline Setup" \
  "設定 GitHub Actions CI pipeline 的通用範本" '["ci","workflow","platform"]' \
'# CI Pipeline Setup

## Overview
平台團隊維護的 CI 範本。

```yaml
name: ci
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
```')

A3=$(create_skill alice team-a "secrets-management" "Secrets Management" \
  "以環境變數與 vault 管理機敏設定" '["platform","security"]' \
'# Secrets Management

## Rule
機敏資訊只進環境變數或未追蹤的本地檔，絕不進版控。

```bash
export DB_PASSWORD="$(vault kv get -field=password secret/db)"
```')

A4=$(create_skill alice team-a "oncall-runbook" "On-call Runbook" \
  "值班應變手冊（草稿，暫不公開）" '["platform","ops"]' \
'# On-call Runbook

## Draft
內部值班流程，尚未定稿，保留為 team-a 私有草稿以驗證跨團隊不可見。

```text
1. ack alert
2. check dashboard
```')

publish_skill alice "$A1"
publish_skill alice "$A2"
# A3, A4 remain drafts (A4 explicitly the private-draft demo)

# ---------------------------------------------------------------------------
# 3. team-b skills as carol (editor). Publish 1, leave 1+ draft.
# ---------------------------------------------------------------------------
echo "👩‍🔬 carol / team-b (資料團隊)..."

B1=$(create_skill carol team-b "data-pipeline-etl" "Data Pipeline ETL" \
  "以批次 ETL 抽取、轉換、載入資料倉儲" '["data","workflow","etl"]' \
'# Data Pipeline ETL

## When to use
資料團隊的標準批次 ETL。

```python
def run(extract, transform, load):
    load(transform(extract()))
```')

B2=$(create_skill carol team-b "sql-style-guide" "SQL Style Guide" \
  "團隊 SQL 撰寫規範與命名慣例" '["data","security"]' \
'# SQL Style Guide

## Naming
- 資料表用 snake_case
- 避免 `SELECT *`

```sql
SELECT id, created_at
FROM orders
WHERE status = ''paid'';
```')

B3=$(create_skill carol team-b "feature-store-draft" "Feature Store (Draft)" \
  "特徵倉儲設計草稿（暫不公開）" '["data","platform"]' \
'# Feature Store (Draft)

## Draft
設計中的 feature store，保留為 team-b 私有草稿以驗證跨團隊不可見。

```text
online + offline store, point-in-time join
```')

publish_skill carol "$B1"
# B2, B3 remain drafts

echo "✅ Cross-team marketplace seed complete."
echo "   team-a published: github-pr-workflow, ci-pipeline-setup (drafts: secrets-management, oncall-runbook)"
echo "   team-b published: data-pipeline-etl (drafts: sql-style-guide, feature-store-draft)"
echo "   Open space:  curl -H 'X-Dev-User: bob' '$API_BASE/api/skills?view=open'"
