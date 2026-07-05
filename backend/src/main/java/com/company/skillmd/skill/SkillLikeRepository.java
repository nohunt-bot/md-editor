package com.company.skillmd.skill;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface SkillLikeRepository extends MongoRepository<SkillLike, String> {
    Optional<SkillLike> findBySkillIdAndUserId(String skillId, String userId);
    long countBySkillId(String skillId);
    void deleteBySkillIdAndUserId(String skillId, String userId);
}
