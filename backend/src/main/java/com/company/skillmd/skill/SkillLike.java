package com.company.skillmd.skill;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Phase C (v2): one like per user per skill. The unique compound index makes
 * the like operation idempotent at the datastore level; skills carry a
 * denormalized likeCount for list rendering/sorting.
 */
@Document(collection = "skill_likes")
@CompoundIndex(name = "skillId_userId_unique", def = "{'skillId': 1, 'userId': 1}", unique = true)
public class SkillLike {

    @Id
    private String id;
    private String skillId;
    private String userId;

    @CreatedDate
    private Instant createdAt;

    public SkillLike() {}

    public SkillLike(String skillId, String userId) {
        this.skillId = skillId;
        this.userId = userId;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSkillId() { return skillId; }
    public void setSkillId(String skillId) { this.skillId = skillId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
