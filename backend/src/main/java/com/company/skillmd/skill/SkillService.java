package com.company.skillmd.skill;

import com.company.skillmd.auth.AuthorizationService;
import com.company.skillmd.auth.ResourceNotFoundException;
import com.company.skillmd.skill.dto.*;
import com.company.skillmd.team.TeamService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class SkillService {

    private final SkillRepository skillRepository;
    private final ReferenceResolver referenceResolver;
    private final AuthorizationService authorizationService;
    private final TeamService teamService;
    private final MongoTemplate mongoTemplate;

    public SkillService(SkillRepository skillRepository, ReferenceResolver referenceResolver,
                         AuthorizationService authorizationService, TeamService teamService,
                         MongoTemplate mongoTemplate) {
        this.skillRepository = skillRepository;
        this.referenceResolver = referenceResolver;
        this.authorizationService = authorizationService;
        this.teamService = teamService;
        this.mongoTemplate = mongoTemplate;
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
                // Phase B (v2): team members and admins read the live fields;
                // everyone else reads the frozen publish snapshot.
                var user = authorizationService.currentUser();
                boolean memberView = user.isAdmin() || user.isMemberOf(skill.getTeamId());
                return memberView ? toResponse(skill) : toFrozenResponse(skill);
            });
    }

    public Page<SkillResponse> listSkills(String teamId, Pageable pageable) {
        authorizationService.requireTeamMember(teamId);
        return skillRepository.findByTeamIdAndDeletedAtNull(teamId, pageable).map(this::toResponse);
    }

    /**
     * Open-space listing (PRD §5.2, {@code view=open}): only
     * {@code scope=open ∧ status=published ∧ deletedAt=null}, visible to any
     * authenticated user (no team membership required — the caller's identity
     * is already resolved by the security layer). Optional {@code tag} / {@code q}
     * ($text) filters; sorted by {@code publishedAt} desc. Each row carries the
     * owning team's displayName, batch-resolved to avoid N+1.
     */
    public Page<OpenSkillResponse> listOpenSkills(String tag, String q, Pageable pageable) {
        Criteria criteria = Criteria.where("scope").is("open")
            .and("status").is("published")
            .and("deletedAt").isNull();
        if (tag != null && !tag.isBlank()) {
            criteria = criteria.and("tags").is(tag);
        }

        Query query = new Query(criteria);
        if (q != null && !q.isBlank()) {
            query.addCriteria(TextCriteria.forDefaultLanguage().matching(q));
        }
        query.with(Sort.by(Sort.Direction.DESC, "publishedAt"));

        long total = mongoTemplate.count(Query.of(query).limit(0).skip(0), Skill.class);
        query.with(pageable);
        List<Skill> skills = mongoTemplate.find(query, Skill.class);

        Set<String> teamIds = skills.stream().map(Skill::getTeamId).collect(Collectors.toSet());
        var displayNames = teamService.resolveDisplayNames(teamIds);

        List<OpenSkillResponse> rows = skills.stream()
            .map(s -> toOpenResponse(s, displayNames.get(s.getTeamId())))
            .toList();
        return new PageImpl<>(rows, pageable, total);
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
        // Phase B (v2): freeze the publish-time content. Non-members read the
        // snapshot; re-publishing rebuilds it (ADR 20260705-publish-freeze).
        skill.setPublishedVersion(skill.getCurrentVersion());
        skill.setPublishedSnapshot(Skill.PublishedSnapshot.of(skill));
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

    private OpenSkillResponse toOpenResponse(Skill skill, String teamDisplayName) {
        // Phase B (v2): the open space is the frozen-publish view for
        // everyone — listing metadata comes from the snapshot so cards always
        // match the frozen detail. Fallback to live fields for pre-migration
        // rows without a snapshot.
        Skill.PublishedSnapshot snap = skill.getPublishedSnapshot();
        return new OpenSkillResponse(
            skill.getId(),
            skill.getName(),
            snap != null ? snap.getDisplayName() : skill.getDisplayName(),
            snap != null ? snap.getDescription() : skill.getDescription(),
            skill.getTeamId(),
            teamDisplayName,
            skill.getScope(),
            skill.getStatus(),
            skill.getPublishedAt(),
            skill.getSourceSkillId(),
            snap != null ? snap.getTags() : skill.getTags(),
            snap != null ? snap.getVersion() : skill.getCurrentVersion(),
            skill.getAuthorId(),
            skill.getLastEditorId(),
            skill.getCreatedAt(),
            skill.getUpdatedAt()
        );
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
            skill.getPublishedVersion(),
            skill.getAuthorId(),
            skill.getLastEditorId(),
            skill.getCreatedAt(),
            skill.getUpdatedAt()
        );
    }

    /**
     * Phase B (v2): non-member view of an open+published skill — content
     * fields come from the publish-time snapshot, never the live draft.
     * Falls back to live fields for pre-migration rows without a snapshot.
     */
    private SkillResponse toFrozenResponse(Skill skill) {
        Skill.PublishedSnapshot snap = skill.getPublishedSnapshot();
        if (snap == null) {
            return toResponse(skill);
        }
        return new SkillResponse(
            skill.getId(),
            skill.getName(),
            snap.getDisplayName(),
            snap.getDescription(),
            snap.getContent(),
            skill.getTeamId(),
            skill.getScope(),
            skill.getStatus(),
            skill.getPublishedAt(),
            skill.getSourceSkillId(),
            skill.getFolderId(),
            snap.getTags(),
            List.of(),
            List.of(),
            snap.getVersion(), // the frozen version is the visible version
            skill.getPublishedVersion(),
            skill.getAuthorId(),
            skill.getLastEditorId(),
            skill.getCreatedAt(),
            skill.getUpdatedAt()
        );
    }
}
