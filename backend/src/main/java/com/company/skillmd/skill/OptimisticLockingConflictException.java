package com.company.skillmd.skill;

import java.time.Instant;

public class OptimisticLockingConflictException extends RuntimeException {
    private final String skillId;
    private final Integer currentVersion;
    private final Instant currentUpdatedAt;
    private final String currentContent;
    private final String currentEditorId;
    
    public OptimisticLockingConflictException(
        String skillId,
        Integer currentVersion,
        Instant currentUpdatedAt,
        String currentContent,
        String currentEditorId
    ) {
        super("Optimistic locking conflict for skill " + skillId);
        this.skillId = skillId;
        this.currentVersion = currentVersion;
        this.currentUpdatedAt = currentUpdatedAt;
        this.currentContent = currentContent;
        this.currentEditorId = currentEditorId;
    }
    
    public String getSkillId() { return skillId; }
    public Integer getCurrentVersion() { return currentVersion; }
    public Instant getCurrentUpdatedAt() { return currentUpdatedAt; }
    public String getCurrentContent() { return currentContent; }
    public String getCurrentEditorId() { return currentEditorId; }
}
