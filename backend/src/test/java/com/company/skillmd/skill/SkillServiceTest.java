package com.company.skillmd.skill;

import com.company.skillmd.skill.dto.UpdateSkillRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SkillServiceTest {

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private ReferenceResolver referenceResolver;

    private SkillService skillService;

    @BeforeEach
    void setUp() {
        skillService = new SkillService(skillRepository, referenceResolver);
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
        Integer expectedVersion = 3; // Stale version
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
        Integer expectedVersion = 3; // Stale version
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
