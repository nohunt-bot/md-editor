// Migration: 2026-07-11 search content index + declared-index materialization
//
// 1. Rebuilds the skills text index to include `content` (weight 1) alongside
//    the existing name/displayName/description/tags fields (weights
//    10/10/5/8), matching the @TextIndexed annotations on Skill.java. Mongo
//    only allows one text index per collection, so the old skills_text_index
//    (created by migrate-20260703-marketplace.js) is dropped and recreated.
// 2. Materializes the skill_likes and skill_presence unique
//    (skillId, userId) indexes, which were declared via @CompoundIndex but
//    never actually created (Spring Boot auto-index-creation is off — see
//    SkillService.java:178). Duplicate (skillId, userId) rows are deduped
//    first (keep earliest by _id), since createIndex with `unique: true`
//    fails on existing duplicates.
// 3. Materializes the skill_presence `lastSeen` TTL index
//    (expireAfterSeconds: 60), matching the @Indexed annotation on
//    SkillPresence.lastSeen. The read path already filters presence rows by
//    a PRESENCE_WINDOW_SECONDS time window, so enabling DB-side TTL cleanup
//    of rows older than 60s is behavior-safe — it only removes rows the read
//    path already treats as stale.
//
// Idempotent: safe to run twice (dropIndex is wrapped to ignore "index not
// found", createIndex is idempotent for identical spec/options, dedupe only
// removes true duplicates).
//
// Usage:
//   mongosh <connection-string> scripts/migrate-20260711-search-content-indexes.js
//   mongosh --nodb --eval "load('scripts/migrate-20260711-search-content-indexes.js')"

(function () {
  const dbRef = db; // provided by mongosh shell context

  print("== migrate-20260711-search-content-indexes: start ==");

  // 1. Drop old skills text index (ignore if missing) and recreate with content.
  try {
    dbRef.skills.dropIndex("skills_text_index");
    print("dropped old index skills.skills_text_index");
  } catch (e) {
    print("skipped dropping skills.skills_text_index (not present): " + e);
  }

  dbRef.skills.createIndex(
    { name: "text", displayName: "text", description: "text", tags: "text", content: "text" },
    {
      name: "skills_text_index",
      weights: { name: 10, displayName: 10, tags: 8, description: 5, content: 1 },
    }
  );
  print("skills text index rebuilt (name/displayName/tags/description/content)");

  // 2. Dedupe + materialize skill_likes unique (skillId, userId) index.
  function dedupeBySkillIdUserId(collection) {
    const seen = {};
    let removed = 0;
    collection.find({}).sort({ _id: 1 }).forEach(function (doc) {
      const key = doc.skillId + "::" + doc.userId;
      if (seen[key]) {
        collection.deleteOne({ _id: doc._id });
        removed += 1;
      } else {
        seen[key] = true;
      }
    });
    return removed;
  }

  const likesRemoved = dedupeBySkillIdUserId(dbRef.skill_likes);
  print("skill_likes deduped: removed=" + likesRemoved);

  dbRef.skill_likes.createIndex(
    { skillId: 1, userId: 1 },
    { unique: true, name: "skillId_userId_unique" }
  );
  print("skill_likes indexes ensured");

  // 3. Dedupe + materialize skill_presence unique (skillId, userId) index,
  //    plus the lastSeen TTL index.
  const presenceRemoved = dedupeBySkillIdUserId(dbRef.skill_presence);
  print("skill_presence deduped: removed=" + presenceRemoved);

  dbRef.skill_presence.createIndex(
    { skillId: 1, userId: 1 },
    { unique: true, name: "skillId_userId_unique" }
  );
  dbRef.skill_presence.createIndex(
    { lastSeen: 1 },
    { expireAfterSeconds: 60, name: "lastSeen_ttl" }
  );
  print("skill_presence indexes ensured");

  print("== migrate-20260711-search-content-indexes: done ==");
})();
