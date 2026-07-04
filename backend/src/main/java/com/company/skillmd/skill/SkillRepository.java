package com.company.skillmd.skill;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SkillRepository extends MongoRepository<Skill, String> {
    
    Optional<Skill> findByName(String name);
    
    List<Skill> findByFolderId(String folderId);
    
    List<Skill> findByTagsContaining(String tag);
    
    Page<Skill> findByDeletedAtNull(Pageable pageable);

    List<Skill> findByDeletedAtNull();

    Page<Skill> findByTeamIdAndDeletedAtNull(String teamId, Pageable pageable);
}
