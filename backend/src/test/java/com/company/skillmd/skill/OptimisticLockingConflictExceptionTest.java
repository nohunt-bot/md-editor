package com.company.skillmd.skill;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class OptimisticLockingConflictExceptionTest {

    @Test
    @DisplayName("Exception stores all conflict details")
    void exception_storesConflictDetails() {
        // Arrange
        String skillId = "skill-1";
        Integer currentVersion = 5;
        Instant updatedAt = Instant.now();
        String currentContent = "server content";
        String currentEditorId = "user-456";

        // Act
        OptimisticLockingConflictException exception = new OptimisticLockingConflictException(
            skillId, currentVersion, updatedAt, currentContent, currentEditorId
        );

        // Assert
        assertEquals(skillId, exception.getSkillId());
        assertEquals(currentVersion, exception.getCurrentVersion());
        assertEquals(updatedAt, exception.getCurrentUpdatedAt());
        assertEquals(currentContent, exception.getCurrentContent());
        assertEquals(currentEditorId, exception.getCurrentEditorId());
        assertTrue(exception.getMessage().contains("Optimistic locking conflict"));
    }
}
