package com.company.skillmd.skill.dto;

import java.time.Instant;
import java.util.List;

public record SkillResponse(
    String id,
    String name,
    String displayName,
    String description,
    String content,
    String teamId,
    String scope,
    String status,
    Instant publishedAt,
    String sourceSkillId,
    String folderId,
    List<String> tags,
    List<ResolvedReference> references,
    List<ResolvedPrerequisite> prerequisites,
    Integer currentVersion,
    Integer publishedVersion, // Phase B (v2): version frozen at last publish; null = never published
    Integer likeCount,        // Phase C (v2)
    Integer copyCount,        // Phase C (v2): citations via copy-to-team
    Boolean likedByMe,        // Phase C (v2): only set on detail reads; null in lists
    String authorId,
    String lastEditorId,
    Instant createdAt,
    Instant updatedAt
) {
    public record ResolvedReference(String skillId, String relation, String name, String displayName) {}
    public record ResolvedPrerequisite(String skillId, String note, String name, String displayName) {}
}
