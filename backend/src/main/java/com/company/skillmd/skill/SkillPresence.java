package com.company.skillmd.skill;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Phase E (v2): soft-presence — who is currently editing a skill. Heartbeated
 * from the editor (~5s). Stale entries auto-expire via a TTL index on
 * {@code lastSeen}. See docs/decisions/20260705-presence-db-poll-over-websocket.md.
 */
@Document(collection = "skill_presence")
@CompoundIndex(name = "skillId_userId_unique", def = "{'skillId': 1, 'userId': 1}", unique = true)
public class SkillPresence {

    @Id
    private String id;
    private String skillId;
    private String userId;

    // TTL: an abandoned heartbeat is cleaned up automatically after 60s.
    @Indexed(expireAfterSeconds = 60)
    private Instant lastSeen;

    public SkillPresence() {}

    public SkillPresence(String skillId, String userId, Instant lastSeen) {
        this.skillId = skillId;
        this.userId = userId;
        this.lastSeen = lastSeen;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSkillId() { return skillId; }
    public void setSkillId(String skillId) { this.skillId = skillId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }
}
