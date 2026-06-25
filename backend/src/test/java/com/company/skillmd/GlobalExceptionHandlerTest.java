package com.company.skillmd;

import com.company.skillmd.skill.OptimisticLockingConflictException;
import com.company.skillmd.skill.dto.ConflictResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("handleOptimisticLockingConflict returns 409 with ConflictResponse")
    void handleOptimisticLockingConflict_returns409() {
        // Arrange
        String skillId = "skill-1";
        Integer currentVersion = 5;
        Instant updatedAt = Instant.now();
        String currentContent = "server content";
        String currentEditorId = "user-456";

        OptimisticLockingConflictException exception = new OptimisticLockingConflictException(
            skillId, currentVersion, updatedAt, currentContent, currentEditorId
        );

        // Act
        ResponseEntity<ConflictResponse> response = handler.handleOptimisticLockingConflict(exception);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(skillId, response.getBody().skillId());
        assertEquals(currentVersion, response.getBody().currentVersion());
        assertEquals(currentContent, response.getBody().currentContent());
        assertEquals(currentEditorId, response.getBody().currentEditorId());
        assertNotNull(response.getBody().message());
    }
}
