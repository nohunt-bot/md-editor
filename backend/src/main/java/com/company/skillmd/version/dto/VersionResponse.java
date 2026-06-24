package com.company.skillmd.version.dto;

import java.time.Instant;

public record VersionResponse(
    String id,
    String skillId,
    Integer version,
    String commitMessage,
    String editorId,
    Instant createdAt
) {}
