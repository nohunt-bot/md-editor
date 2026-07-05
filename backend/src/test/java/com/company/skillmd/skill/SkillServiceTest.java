package com.company.skillmd.skill;

import com.company.skillmd.auth.AuthorizationService;
import com.company.skillmd.auth.CurrentUser;
import com.company.skillmd.auth.CurrentUserProvider;
import com.company.skillmd.auth.ForbiddenException;
import com.company.skillmd.auth.ResourceNotFoundException;
import com.company.skillmd.auth.Role;
import com.company.skillmd.skill.dto.CreateSkillRequest;
import com.company.skillmd.skill.dto.SkillResponse;
import com.company.skillmd.skill.dto.UpdateSkillRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SkillServiceTest {

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private ReferenceResolver referenceResolver;

    @Mock
    private com.company.skillmd.team.TeamService teamService;

    @Mock
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @Mock
    private SkillLikeRepository skillLikeRepository;

    @Mock
    private SkillPresenceRepository skillPresenceRepository;

    @Mock
    private com.company.skillmd.version.VersionService versionService;

    private SkillService skillService;

    @BeforeEach
    void setUp() {
        CurrentUserProvider adminProvider = () -> new CurrentUser("admin", "Admin", Map.of(), true);
        AuthorizationService authorizationService = new AuthorizationService(adminProvider);
        skillService = new SkillService(skillRepository, referenceResolver, authorizationService, teamService, mongoTemplate, skillLikeRepository, skillPresenceRepository, versionService);
    }

    @Test
    @DisplayName("Update succeeds when expectedVersion matches current version")
    void updateSkill_versionMatches_success() {
        // Arrange
        String skillId = "skill-1";
        Integer currentVersion = 5;
        String userId = "user-123";

        Skill skill = createSkill(skillId, currentVersion);
        when(skillRepository.findById(skillId)).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenReturn(skill);

        UpdateSkillRequest request = new UpdateSkillRequest(
            null, null, null, "updated content", null, null, null, null, "test commit", currentVersion, false
        );

        // Act
        skillService.updateSkill(skillId, request, userId);

        // Assert
        verify(skillRepository).save(any(Skill.class));
    }

    @Test
    @DisplayName("Update throws OptimisticLockingConflictException when version mismatch")
    void updateSkill_versionMismatch_throwsException() {
        // Arrange
        String skillId = "skill-1";
        Integer currentVersion = 5;
        Integer expectedVersion = 3;
        String userId = "user-123";

        Skill skill = createSkill(skillId, currentVersion);
        when(skillRepository.findById(skillId)).thenReturn(Optional.of(skill));

        UpdateSkillRequest request = new UpdateSkillRequest(
            null, null, null, "updated content", null, null, null, null, "test commit", expectedVersion, false
        );

        // Act & Assert
        OptimisticLockingConflictException exception = assertThrows(
            OptimisticLockingConflictException.class,
            () -> skillService.updateSkill(skillId, request, userId)
        );

        assertEquals(skillId, exception.getSkillId());
        assertEquals(currentVersion, exception.getCurrentVersion());
        verify(skillRepository, never()).save(any());
    }

    @Test
    @DisplayName("Update succeeds with forceUpdate=true even when version mismatch")
    void updateSkill_forceUpdate_bypassesVersionCheck() {
        // Arrange
        String skillId = "skill-1";
        Integer currentVersion = 5;
        Integer expectedVersion = 3;
        String userId = "user-123";

        Skill skill = createSkill(skillId, currentVersion);
        when(skillRepository.findById(skillId)).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenReturn(skill);

        UpdateSkillRequest request = new UpdateSkillRequest(
            null, null, null, "updated content", null, null, null, null, "test commit", expectedVersion, true
        );

        // Act
        skillService.updateSkill(skillId, request, userId);

        // Assert
        verify(skillRepository).save(any(Skill.class));
    }

    @Test
    @DisplayName("Update succeeds when expectedVersion is null (backward compatibility)")
    void updateSkill_noExpectedVersion_noVersionCheck() {
        // Arrange
        String skillId = "skill-1";
        Integer currentVersion = 5;
        String userId = "user-123";

        Skill skill = createSkill(skillId, currentVersion);
        when(skillRepository.findById(skillId)).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenReturn(skill);

        UpdateSkillRequest request = new UpdateSkillRequest(
            null, null, null, "updated content", null, null, null, null, "test commit", null, false
        );

        // Act
        skillService.updateSkill(skillId, request, userId);

        // Assert
        verify(skillRepository).save(any(Skill.class));
    }

    @Test
    @DisplayName("Create skill defaults scope=team, status=draft, publishedAt=null, sourceSkillId=null")
    void createSkill_setsDefaults() {
        // Arrange
        String userId = "user-123";
        CreateSkillRequest request = new CreateSkillRequest(
            "new-skill", "New Skill", "desc", "# content", "team-a",
            null, List.of("tag1"), null, null
        );
        when(skillRepository.save(any(Skill.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        SkillResponse response = skillService.createSkill(request, userId);

        // Assert
        assertEquals("team-a", response.teamId());
        assertEquals("team", response.scope());
        assertEquals("draft", response.status());
        assertNull(response.publishedAt());
        assertNull(response.sourceSkillId());
    }

    @Test
    @DisplayName("teamId is required on create (bean validation fails when missing)")
    void createSkill_missingTeamId_failsValidation() {
        // Arrange
        CreateSkillRequest request = new CreateSkillRequest(
            "new-skill", "New Skill", "desc", "# content", null,
            null, List.of("tag1"), null, null
        );

        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();

            // Act
            Set<ConstraintViolation<CreateSkillRequest>> violations = validator.validate(request);

            // Assert
            assertFalse(violations.isEmpty());
            assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("teamId")));
        }
    }

    // --- Phase 1.3: publish / unpublish / copy-to-team / delete guard ---

    private SkillService serviceForUser(CurrentUser user) {
        CurrentUserProvider provider = () -> user;
        return new SkillService(skillRepository, referenceResolver, new AuthorizationService(provider),
            teamService, mongoTemplate, skillLikeRepository, skillPresenceRepository, versionService);
    }

    private Skill teamSkill(String id, String teamId) {
        Skill skill = new Skill();
        skill.setId(id);
        skill.setName("my-skill");
        skill.setDisplayName("My Skill");
        skill.setDescription("desc");
        skill.setContent("# content");
        skill.setTeamId(teamId);
        skill.setScope("team");
        skill.setStatus("draft");
        skill.setTags(List.of("tag1"));
        skill.setCurrentVersion(3);
        return skill;
    }

    @Test
    @DisplayName("Publish sets scope=open, status=published, publishedAt")
    void publishSkill_setsFields() {
        Skill skill = teamSkill("skill-1", "team-a");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));

        SkillResponse response = skillService.publishSkill("skill-1");

        assertEquals("open", response.scope());
        assertEquals("published", response.status());
        assertNotNull(response.publishedAt());
    }

    @Test
    @DisplayName("Publish freezes a snapshot: publishedVersion + snapshot content (Phase B v2)")
    void publishSkill_freezesSnapshot() {
        Skill skill = teamSkill("skill-1", "team-a");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));

        SkillResponse response = skillService.publishSkill("skill-1");

        assertEquals(3, response.publishedVersion());
        assertNotNull(skill.getPublishedSnapshot());
        assertEquals("# content", skill.getPublishedSnapshot().getContent());
        assertEquals(3, skill.getPublishedSnapshot().getVersion());
    }

    @Test
    @DisplayName("Non-member reads the frozen snapshot; member reads live (Phase B v2)")
    void getSkill_nonMemberSeesFrozen_memberSeesLive() {
        Skill skill = teamSkill("skill-1", "team-a");
        skill.setScope("open");
        skill.setStatus("published");
        skill.setPublishedVersion(3);
        skill.setPublishedSnapshot(Skill.PublishedSnapshot.of(skill));
        // Team edits after publishing — live content moves ahead of the snapshot.
        skill.setContent("# edited after publish");
        skill.setCurrentVersion(4);
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));

        SkillService asOutsider = serviceForUser(
            new CurrentUser("carol", "Carol", Map.of("team-b", Role.EDITOR), false));
        SkillResponse frozen = asOutsider.getSkill("skill-1").orElseThrow();
        assertEquals("# content", frozen.content());
        assertEquals(3, frozen.currentVersion());
        assertEquals(3, frozen.publishedVersion());

        SkillService asMember = serviceForUser(
            new CurrentUser("alice", "Alice", Map.of("team-a", Role.EDITOR), false));
        SkillResponse live = asMember.getSkill("skill-1").orElseThrow();
        assertEquals("# edited after publish", live.content());
        assertEquals(4, live.currentVersion());
    }

    @Test
    @DisplayName("Like is idempotent and refreshes the denormalized count (Phase C v2)")
    void like_idempotent() {
        Skill skill = teamSkill("skill-1", "team-a");
        skill.setScope("open");
        skill.setStatus("published");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));
        when(skillLikeRepository.findBySkillIdAndUserId("skill-1", "carol"))
            .thenReturn(Optional.empty())                       // first like: not yet present
            .thenReturn(Optional.of(new SkillLike("skill-1", "carol"))); // second: present
        when(skillLikeRepository.countBySkillId("skill-1")).thenReturn(1L);

        SkillService asCarol = serviceForUser(
            new CurrentUser("carol", "Carol", Map.of("team-b", Role.EDITOR), false));

        SkillService.LikeStatus first = asCarol.like("skill-1");
        SkillService.LikeStatus second = asCarol.like("skill-1");

        assertEquals(1L, first.likeCount());
        assertTrue(first.likedByMe());
        assertEquals(1L, second.likeCount()); // no double count
        verify(skillLikeRepository, times(1)).save(any(SkillLike.class));
        assertEquals(1, skill.getLikeCount());
    }

    @Test
    @DisplayName("Unlike removes the like and refreshes the count (Phase C v2)")
    void unlike_decrements() {
        Skill skill = teamSkill("skill-1", "team-a");
        skill.setScope("open");
        skill.setStatus("published");
        skill.setLikeCount(1);
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));
        when(skillLikeRepository.countBySkillId("skill-1")).thenReturn(0L);

        SkillService asCarol = serviceForUser(
            new CurrentUser("carol", "Carol", Map.of("team-b", Role.EDITOR), false));
        SkillService.LikeStatus status = asCarol.unlike("skill-1");

        verify(skillLikeRepository).deleteBySkillIdAndUserId("skill-1", "carol");
        assertEquals(0L, status.likeCount());
        assertFalse(status.likedByMe());
        assertEquals(0, skill.getLikeCount());
    }

    @Test
    @DisplayName("Re-publishing an already-published skill just refreshes (no error)")
    void publishSkill_idempotent() {
        Skill skill = teamSkill("skill-1", "team-a");
        skill.setScope("open");
        skill.setStatus("published");
        skill.setPublishedAt(Instant.now().minusSeconds(1000));
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));

        SkillResponse response = skillService.publishSkill("skill-1");

        assertEquals("published", response.status());
        assertTrue(response.publishedAt().isAfter(Instant.now().minusSeconds(10)));
    }

    @Test
    @DisplayName("Publish by team viewer throws Forbidden (403)")
    void publishSkill_viewer_forbidden() {
        SkillService service = serviceForUser(new CurrentUser("bob", "Bob", Map.of("team-a", Role.VIEWER), false));
        Skill skill = teamSkill("skill-1", "team-a");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));

        assertThrows(ForbiddenException.class, () -> service.publishSkill("skill-1"));
        verify(skillRepository, never()).save(any());
    }

    @Test
    @DisplayName("Publish by non-member throws ResourceNotFound (404)")
    void publishSkill_nonMember_notFound() {
        SkillService service = serviceForUser(new CurrentUser("carol", "Carol", Map.of("team-b", Role.EDITOR), false));
        Skill skill = teamSkill("skill-1", "team-a");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));

        assertThrows(ResourceNotFoundException.class, () -> service.publishSkill("skill-1"));
        verify(skillRepository, never()).save(any());
    }

    @Test
    @DisplayName("Unpublish sets status=draft, keeps scope=open")
    void unpublishSkill_keepsScopeOpen() {
        Skill skill = teamSkill("skill-1", "team-a");
        skill.setScope("open");
        skill.setStatus("published");
        skill.setPublishedAt(Instant.now());
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));

        SkillResponse response = skillService.unpublishSkill("skill-1");

        assertEquals("draft", response.status());
        assertEquals("open", response.scope());
    }

    @Test
    @DisplayName("Admin can unpublish any team's open skill")
    void unpublishSkill_adminAnyTeam() {
        // default skillService uses admin provider
        Skill skill = teamSkill("skill-1", "team-b");
        skill.setScope("open");
        skill.setStatus("published");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));

        SkillResponse response = skillService.unpublishSkill("skill-1");

        assertEquals("draft", response.status());
    }

    @Test
    @DisplayName("Copy-to-team creates independent v1 draft with sourceSkillId")
    void copyToTeam_createsIndependentDraft() {
        // editor of both team-a (source) and team-b (target)
        SkillService service = serviceForUser(new CurrentUser(
            "u", "U", Map.of("team-a", Role.EDITOR, "team-b", Role.EDITOR), false));
        Skill source = teamSkill("src-1", "team-a");
        when(skillRepository.findById("src-1")).thenReturn(Optional.of(source));
        when(skillRepository.existsByTeamIdAndName("team-b", "my-skill")).thenReturn(false);
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));

        SkillResponse response = service.copyToTeam("src-1", "team-b", "u");

        assertEquals("team-b", response.teamId());
        assertEquals("team", response.scope());
        assertEquals("draft", response.status());
        assertEquals(1, response.currentVersion());
        assertEquals("src-1", response.sourceSkillId());
        assertNull(response.folderId());
        assertNull(response.publishedAt());
        assertEquals("u", response.authorId());
    }

    @Test
    @DisplayName("Copy-to-team auto-suffixes on name collision")
    void copyToTeam_nameCollision_autoSuffix() {
        SkillService service = serviceForUser(new CurrentUser(
            "u", "U", Map.of("team-a", Role.EDITOR, "team-b", Role.EDITOR), false));
        Skill source = teamSkill("src-1", "team-a");
        when(skillRepository.findById("src-1")).thenReturn(Optional.of(source));
        when(skillRepository.existsByTeamIdAndName("team-b", "my-skill")).thenReturn(true);
        when(skillRepository.existsByTeamIdAndName("team-b", "my-skill-2")).thenReturn(true);
        when(skillRepository.existsByTeamIdAndName("team-b", "my-skill-3")).thenReturn(false);
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));

        SkillResponse response = service.copyToTeam("src-1", "team-b", "u");

        assertEquals("my-skill-3", response.name());
    }

    @Test
    @DisplayName("Copy-to-team where caller isn't editor of target throws Forbidden (403)")
    void copyToTeam_notEditorOfTarget_forbidden() {
        // member of source team-a but only viewer of target team-b
        SkillService service = serviceForUser(new CurrentUser(
            "u", "U", Map.of("team-a", Role.EDITOR, "team-b", Role.VIEWER), false));
        Skill source = teamSkill("src-1", "team-a");
        when(skillRepository.findById("src-1")).thenReturn(Optional.of(source));

        assertThrows(ForbiddenException.class, () -> service.copyToTeam("src-1", "team-b", "u"));
        verify(skillRepository, never()).save(any());
    }

    @Test
    @DisplayName("Copy-to-team where source not visible throws ResourceNotFound (404)")
    void copyToTeam_sourceNotVisible_notFound() {
        // editor of target team-b but not a member of source team-a; source is a private draft
        SkillService service = serviceForUser(new CurrentUser(
            "u", "U", Map.of("team-b", Role.EDITOR), false));
        Skill source = teamSkill("src-1", "team-a");
        when(skillRepository.findById("src-1")).thenReturn(Optional.of(source));

        assertThrows(ResourceNotFoundException.class, () -> service.copyToTeam("src-1", "team-b", "u"));
        verify(skillRepository, never()).save(any());
    }

    @Test
    @DisplayName("Delete of a published skill throws Conflict (409)")
    void deleteSkill_published_conflict() {
        Skill skill = teamSkill("skill-1", "team-a");
        skill.setScope("open");
        skill.setStatus("published");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));

        assertThrows(ConflictException.class, () -> skillService.deleteSkill("skill-1"));
        verify(skillRepository, never()).save(any());
    }

    @Test
    @DisplayName("Delete of a draft skill succeeds (soft delete)")
    void deleteSkill_draft_success() {
        Skill skill = teamSkill("skill-1", "team-a");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        when(skillRepository.save(any(Skill.class))).thenAnswer(inv -> inv.getArgument(0));

        skillService.deleteSkill("skill-1");

        verify(skillRepository).save(any(Skill.class));
    }

    // --- Phase 1.4: update authz (403 vs 404, PRD §5.5) ---

    @Test
    @DisplayName("Update by team viewer throws Forbidden (403), not masked as NotFound")
    void updateSkill_viewer_forbidden() {
        SkillService service = serviceForUser(new CurrentUser("bob", "Bob", Map.of("team-a", Role.VIEWER), false));
        Skill skill = teamSkill("skill-1", "team-a");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        UpdateSkillRequest request = new UpdateSkillRequest(
            null, null, null, "new", null, null, null, null, "c", null, false);

        assertThrows(ForbiddenException.class, () -> service.updateSkill("skill-1", request, "bob"));
        verify(skillRepository, never()).save(any());
    }

    @Test
    @DisplayName("Update by non-member throws ResourceNotFound (404)")
    void updateSkill_nonMember_notFound() {
        SkillService service = serviceForUser(new CurrentUser("carol", "Carol", Map.of("team-b", Role.EDITOR), false));
        Skill skill = teamSkill("skill-1", "team-a");
        when(skillRepository.findById("skill-1")).thenReturn(Optional.of(skill));
        UpdateSkillRequest request = new UpdateSkillRequest(
            null, null, null, "new", null, null, null, null, "c", null, false);

        assertThrows(ResourceNotFoundException.class, () -> service.updateSkill("skill-1", request, "carol"));
        verify(skillRepository, never()).save(any());
    }

    // --- Phase 1.4: open-space listing ---

    @Test
    @DisplayName("listOpenSkills resolves teamDisplayName and returns metadata-only rows")
    void listOpenSkills_resolvesTeamDisplayName() {
        Skill open = teamSkill("open-1", "team-a");
        open.setScope("open");
        open.setStatus("published");
        open.setPublishedAt(Instant.now());
        when(mongoTemplate.count(any(org.springframework.data.mongodb.core.query.Query.class), eq(Skill.class)))
            .thenReturn(1L);
        when(mongoTemplate.find(any(org.springframework.data.mongodb.core.query.Query.class), eq(Skill.class)))
            .thenReturn(List.of(open));
        when(teamService.resolveDisplayNames(Set.of("team-a"))).thenReturn(Map.of("team-a", "Team Alpha"));

        var page = skillService.listOpenSkills(null, null, org.springframework.data.domain.PageRequest.of(0, 20));

        assertEquals(1, page.getTotalElements());
        var row = page.getContent().get(0);
        assertEquals("open-1", row.id());
        assertEquals("Team Alpha", row.teamDisplayName());
        assertEquals("published", row.status());
        assertEquals("open", row.scope());
    }

    private Skill createSkill(String id, Integer version) {
        Skill skill = new Skill();
        skill.setId(id);
        skill.setName("test-skill");
        skill.setContent("original content");
        skill.setCurrentVersion(version);
        skill.setUpdatedAt(Instant.now());
        skill.setLastEditorId("other-user");
        return skill;
    }
}
