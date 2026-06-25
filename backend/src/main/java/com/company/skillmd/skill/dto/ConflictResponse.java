package com.company.skillmd.skill.dto;

import java.time.Instant;

public record ConflictResponse(
    String skillId,
    Integer currentVersion,
    Instant currentUpdatedAt,
    String currentContent,
    String currentEditorId,
    String message
) {
    public static ConflictResponse of(
        String skillId,
        Integer version,
        Instant updatedAt,
        String content,
        String editorId
    ) {
        return new ConflictResponse(
            skillId,
            version,
            updatedAt,
            content,
            editorId,
            "This skill was modified by another user. Please review the changes."
        );
    }
}
