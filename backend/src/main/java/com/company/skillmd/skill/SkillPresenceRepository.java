package com.company.skillmd.skill;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SkillPresenceRepository extends MongoRepository<SkillPresence, String> {
    Optional<SkillPresence> findBySkillIdAndUserId(String skillId, String userId);

    // Active editors = heartbeated within the freshness window.
    List<SkillPresence> findBySkillIdAndLastSeenAfter(String skillId, Instant cutoff);

    void deleteBySkillIdAndUserId(String skillId, String userId);
}
