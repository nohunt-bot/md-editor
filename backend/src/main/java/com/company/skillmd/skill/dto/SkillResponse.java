package com.company.skillmd.skill.dto;

import java.time.Instant;
import java.util.List;

public record SkillResponse(
    String id,
    String name,
    String displayName,
    String description,
    String content,
    String folderId,
    List<String> tags,
    List<ResolvedReference> references,
    List<ResolvedPrerequisite> prerequisites,
    Integer currentVersion,
    String authorId,
    String lastEditorId,
    Instant createdAt,
    Instant updatedAt
) {
    public record ResolvedReference(String skillId, String relation, String name, String displayName) {}
    public record ResolvedPrerequisite(String skillId, String note, String name, String displayName) {}
}
