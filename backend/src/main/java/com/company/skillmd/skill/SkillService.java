package com.company.skillmd.skill;

import com.company.skillmd.skill.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class SkillService {

    private final SkillRepository skillRepository;
    private final ReferenceResolver referenceResolver;

    public SkillService(SkillRepository skillRepository, ReferenceResolver referenceResolver) {
        this.skillRepository = skillRepository;
        this.referenceResolver = referenceResolver;
    }

    public SkillResponse createSkill(CreateSkillRequest request, String userId) {
        Skill skill = new Skill();
        skill.setName(request.name());
        skill.setDisplayName(request.displayName());
        skill.setDescription(request.description());
        skill.setContent(request.content());
        skill.setTeamId(request.teamId());
        skill.setScope("team");
        skill.setStatus("draft");
        skill.setPublishedAt(null);
        skill.setSourceSkillId(null);
        skill.setFolderId(request.folderId());
        skill.setTags(request.tags() != null ? request.tags() : List.of());
        skill.setCurrentVersion(1);
        skill.setAuthorId(userId);
        skill.setLastEditorId(userId);
        
        Skill saved = skillRepository.save(skill);
        return toResponse(saved);
    }

    public SkillResponse updateSkill(String id, UpdateSkillRequest request, String userId) {
        Skill skill = skillRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Skill not found: " + id));
        
        // Optimistic locking check
        if (request.expectedVersion() != null && !Boolean.TRUE.equals(request.forceUpdate())) {
            if (!skill.getCurrentVersion().equals(request.expectedVersion())) {
                throw new OptimisticLockingConflictException(
                    skill.getId(),
                    skill.getCurrentVersion(),
                    skill.getUpdatedAt(),
                    skill.getContent(),
                    skill.getLastEditorId()
                );
            }
        }
        
        if (request.name() != null) skill.setName(request.name());
        if (request.displayName() != null) skill.setDisplayName(request.displayName());
        if (request.description() != null) skill.setDescription(request.description());
        if (request.content() != null) skill.setContent(request.content());
        if (request.folderId() != null) skill.setFolderId(request.folderId());
        if (request.tags() != null) skill.setTags(request.tags());
        
        skill.setLastEditorId(userId);
        skill.setCurrentVersion(skill.getCurrentVersion() + 1);
        
        Skill saved = skillRepository.save(skill);
        return toResponse(saved);
    }

    public Optional<SkillResponse> getSkill(String id) {
        return skillRepository.findById(id).map(this::toResponse);
    }

    public Page<SkillResponse> listSkills(Pageable pageable) {
        return skillRepository.findByDeletedAtNull(pageable).map(this::toResponse);
    }

    public void deleteSkill(String id) {
        Skill skill = skillRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Skill not found: " + id));
        skill.setDeletedAt(Instant.now());
        skillRepository.save(skill);
    }

    private SkillResponse toResponse(Skill skill) {
        return new SkillResponse(
            skill.getId(),
            skill.getName(),
            skill.getDisplayName(),
            skill.getDescription(),
            skill.getContent(),
            skill.getTeamId(),
            skill.getScope(),
            skill.getStatus(),
            skill.getPublishedAt(),
            skill.getSourceSkillId(),
            skill.getFolderId(),
            skill.getTags(),
            List.of(), // TODO: resolve references
            List.of(), // TODO: resolve prerequisites
            skill.getCurrentVersion(),
            skill.getAuthorId(),
            skill.getLastEditorId(),
            skill.getCreatedAt(),
            skill.getUpdatedAt()
        );
    }
}
