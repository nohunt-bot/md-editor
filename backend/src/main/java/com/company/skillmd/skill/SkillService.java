package com.company.skillmd.skill;

import com.company.skillmd.auth.AuthorizationService;
import com.company.skillmd.auth.ResourceNotFoundException;
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
    private final AuthorizationService authorizationService;

    public SkillService(SkillRepository skillRepository, ReferenceResolver referenceResolver,
                         AuthorizationService authorizationService) {
        this.skillRepository = skillRepository;
        this.referenceResolver = referenceResolver;
        this.authorizationService = authorizationService;
    }

    public SkillResponse createSkill(CreateSkillRequest request, String userId) {
        authorizationService.requireCanEdit(request.teamId());
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
            .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));
        authorizationService.requireResourceEditable(skill.getTeamId());

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
        return skillRepository.findById(id)
            .filter(skill -> skill.getDeletedAt() == null)
            .map(skill -> {
                boolean openAndPublished = "open".equals(skill.getScope()) && "published".equals(skill.getStatus());
                authorizationService.requireResourceReadable(skill.getTeamId(), openAndPublished);
                return toResponse(skill);
            });
    }

    public Page<SkillResponse> listSkills(String teamId, Pageable pageable) {
        authorizationService.requireTeamMember(teamId);
        return skillRepository.findByTeamIdAndDeletedAtNull(teamId, pageable).map(this::toResponse);
    }

    public void deleteSkill(String id) {
        Skill skill = skillRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));
        authorizationService.requireResourceEditable(skill.getTeamId());
        if ("published".equals(skill.getStatus())) {
            throw new ConflictException("先下架才可刪");
        }
        skill.setDeletedAt(Instant.now());
        skillRepository.save(skill);
    }

    /**
     * Publish a skill: scope=open, status=published, publishedAt=now.
     * Editor of the skill's team or admin only. Idempotent-safe (re-publishing
     * an already-published skill just refreshes publishedAt).
     */
    public SkillResponse publishSkill(String id) {
        Skill skill = skillRepository.findById(id)
            .filter(s -> s.getDeletedAt() == null)
            .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));
        authorizationService.requireResourceEditable(skill.getTeamId());
        skill.setScope("open");
        skill.setStatus("published");
        skill.setPublishedAt(Instant.now());
        return toResponse(skillRepository.save(skill));
    }

    /**
     * Unpublish a skill: status=draft, scope stays "open" (scope encodes
     * intent). Editor of the skill's team, or admin (admin may unpublish any
     * team's open skill).
     */
    public SkillResponse unpublishSkill(String id) {
        Skill skill = skillRepository.findById(id)
            .filter(s -> s.getDeletedAt() == null)
            .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));
        authorizationService.requireResourceEditable(skill.getTeamId());
        skill.setStatus("draft");
        return toResponse(skillRepository.save(skill));
    }

    /**
     * Copy a skill into targetTeamId as a fresh independent draft. Source must
     * be visible to the caller (team member, open+published, or admin) and the
     * caller must be an editor of the target team. Name collisions within the
     * target team are resolved by auto-suffixing (-2, -3, ...).
     */
    public SkillResponse copyToTeam(String id, String targetTeamId, String userId) {
        Skill source = skillRepository.findById(id)
            .filter(s -> s.getDeletedAt() == null)
            .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));
        boolean openAndPublished = "open".equals(source.getScope()) && "published".equals(source.getStatus());
        authorizationService.requireResourceReadable(source.getTeamId(), openAndPublished);
        authorizationService.requireCanEdit(targetTeamId);

        Skill copy = new Skill();
        copy.setName(uniqueName(targetTeamId, source.getName()));
        copy.setDisplayName(source.getDisplayName());
        copy.setDescription(source.getDescription());
        copy.setContent(source.getContent());
        copy.setTeamId(targetTeamId);
        copy.setScope("team");
        copy.setStatus("draft");
        copy.setPublishedAt(null);
        copy.setSourceSkillId(source.getId());
        copy.setFolderId(null);
        copy.setTags(source.getTags() != null ? List.copyOf(source.getTags()) : List.of());
        copy.setCurrentVersion(1);
        copy.setAuthorId(userId);
        copy.setLastEditorId(userId);

        return toResponse(skillRepository.save(copy));
    }

    private String uniqueName(String teamId, String baseName) {
        if (!skillRepository.existsByTeamIdAndName(teamId, baseName)) {
            return baseName;
        }
        int suffix = 2;
        String candidate;
        do {
            candidate = baseName + "-" + suffix;
            suffix++;
        } while (skillRepository.existsByTeamIdAndName(teamId, candidate));
        return candidate;
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
