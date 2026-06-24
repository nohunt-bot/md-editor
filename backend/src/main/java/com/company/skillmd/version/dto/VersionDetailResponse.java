package com.company.skillmd.version.dto;

import java.time.Instant;
import java.util.List;

public record VersionDetailResponse(
    String id,
    String skillId,
    Integer version,
    SnapshotData snapshot,
    String commitMessage,
    String editorId,
    Instant createdAt
) {
    public record SnapshotData(
        String name,
        String displayName,
        String description,
        String content,
        String folderId,
        List<String> tags
    ) {}
}
