// Marketplace v2 Phase B — publish-freeze backfill (idempotent).
// For every already-published skill without a snapshot, freeze the CURRENT
// content as the published snapshot (freeze point = migration time).
// Run: mongosh skillmd scripts/migrate-20260705-v2-freeze.js
//  or: docker exec <mongo> mongosh skillmd --file /path/to/this.js

const db_ = db.getSiblingDB('skillmd');

let backfilled = 0;
db_.skills
  .find({ status: 'published', publishedSnapshot: { $exists: false } })
  .forEach((s) => {
    db_.skills.updateOne(
      { _id: s._id },
      {
        $set: {
          publishedVersion: s.currentVersion ?? 1,
          publishedSnapshot: {
            displayName: s.displayName ?? null,
            description: s.description ?? null,
            content: s.content ?? null,
            tags: s.tags ?? [],
            version: s.currentVersion ?? 1,
          },
        },
      }
    );
    backfilled += 1;
  });

print('v2-freeze migration: backfilled ' + backfilled + ' published skill(s).');
print('published without snapshot remaining: ' +
  db_.skills.countDocuments({ status: 'published', publishedSnapshot: { $exists: false } }));

// Phase C — counters backfill (idempotent): copyCount from sourceSkillId
// aggregation; likeCount from skill_likes (0 for rows without likes).
const copyCounts = {};
db_.skills.find({ sourceSkillId: { $ne: null } }, { sourceSkillId: 1 }).forEach((s) => {
  copyCounts[s.sourceSkillId] = (copyCounts[s.sourceSkillId] || 0) + 1;
});
let counterUpdates = 0;
db_.skills.find({}, { _id: 1 }).forEach((s) => {
  const idStr = s._id.toString();
  const copies = copyCounts[idStr] || 0;
  const likes = db_.skill_likes ? db_.skill_likes.countDocuments({ skillId: idStr }) : 0;
  db_.skills.updateOne({ _id: s._id }, { $set: { copyCount: copies, likeCount: likes } });
  counterUpdates += 1;
});
print('v2-counters migration: refreshed counters on ' + counterUpdates + ' skill(s).');
