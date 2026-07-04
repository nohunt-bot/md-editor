// Migration: 2026-07-03 marketplace core fields
//
// Adds teamId/scope/status/publishedAt/sourceSkillId to skills, teamId to
// folders, seeds the `teams` collection, and rebuilds the skills name index
// as a (teamId, name) compound unique index.
//
// Idempotent: safe to run twice (uses updateMany with existence filters,
// upserts for teams, and dropIndex is wrapped to ignore "index not found").
//
// Usage:
//   mongosh <connection-string> scripts/migrate-20260703-marketplace.js
//   mongosh --nodb --eval "load('scripts/migrate-20260703-marketplace.js')"

(function () {
  const dbRef = db; // provided by mongosh shell context

  print("== migrate-20260703-marketplace: start ==");

  // 1. Backfill skills with marketplace defaults (only where teamId missing)
  const skillsResult = dbRef.skills.updateMany(
    { teamId: { $exists: false } },
    {
      $set: {
        teamId: "team-a",
        scope: "team",
        status: "draft",
        publishedAt: null,
        sourceSkillId: null,
      },
    }
  );
  print(
    "skills backfilled: matched=" +
      skillsResult.matchedCount +
      " modified=" +
      skillsResult.modifiedCount
  );

  // 2. Backfill folders with teamId
  const foldersResult = dbRef.folders.updateMany(
    { teamId: { $exists: false } },
    { $set: { teamId: "team-a" } }
  );
  print(
    "folders backfilled: matched=" +
      foldersResult.matchedCount +
      " modified=" +
      foldersResult.modifiedCount
  );

  // 3. Seed teams collection (idempotent via upsert on _id)
  const teams = [
    { _id: "team-a", name: "team-a", displayName: "Team A", createdAt: new Date() },
    { _id: "team-b", name: "team-b", displayName: "Team B", createdAt: new Date() },
  ];
  teams.forEach(function (team) {
    dbRef.teams.updateOne(
      { _id: team._id },
      {
        $setOnInsert: team,
      },
      { upsert: true }
    );
  });
  print("teams seeded: team-a, team-b");

  // 4. Drop old global unique name index on skills (ignore if missing)
  try {
    dbRef.skills.dropIndex("name_1");
    print("dropped old index skills.name_1");
  } catch (e) {
    print("skipped dropping skills.name_1 (not present): " + e);
  }

  // 5. Drop old folder same-level unique constraints if present as indexes
  // (existing schema had no unique index for folders, enforced in app code only)

  // 6. Create new indexes (createIndex is idempotent if identical spec/options)
  dbRef.skills.createIndex(
    { teamId: 1, name: 1 },
    { unique: true, name: "teamId_name_unique" }
  );
  dbRef.skills.createIndex(
    { name: "text", displayName: "text", description: "text", tags: "text" },
    { name: "skills_text_index" }
  );
  dbRef.skills.createIndex(
    { scope: 1, status: 1, publishedAt: -1 },
    { name: "scope_status_publishedAt" }
  );
  dbRef.skills.createIndex(
    { teamId: 1, folderId: 1 },
    { name: "teamId_folderId" }
  );
  print("skills indexes ensured");

  dbRef.folders.createIndex(
    { teamId: 1, parentId: 1, name: 1 },
    { unique: true, name: "teamId_parentId_name_unique" }
  );
  print("folders indexes ensured");

  dbRef.teams.createIndex({ name: 1 }, { unique: true, name: "name_unique" });
  print("teams indexes ensured");

  print("== migrate-20260703-marketplace: done ==");
})();
