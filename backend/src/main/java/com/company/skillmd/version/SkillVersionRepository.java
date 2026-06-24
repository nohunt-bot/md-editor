package com.company.skillmd.version;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SkillVersionRepository extends MongoRepository<SkillVersion, String> {
    
    List<SkillVersion> findBySkillIdOrderByVersionDesc(String skillId);
    
    Optional<SkillVersion> findBySkillIdAndVersion(String skillId, Integer version);
    
    void deleteBySkillId(String skillId);
}
