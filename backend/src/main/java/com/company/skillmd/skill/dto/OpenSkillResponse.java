package com.company.skillmd.skill.dto;

import java.time.Instant;
import java.util.List;

/**
 * Open-space listing row (PRD §5.2, {@code GET /api/skills?view=open}).
 * Metadata-only (no {@code content}) plus the resolved {@code teamDisplayName}
 * of the owning team, so the marketplace list can show provenance without an
 * extra lookup per row.
 */
public record OpenSkillResponse(
    String id,
    String name,
    String displayName,
    String description,
    String teamId,
    String teamDisplayName,
    String scope,
    String status,
    Instant publishedAt,
    String sourceSkillId,
    List<String> tags,
    Integer currentVersion,
    String authorId,
    String lastEditorId,
    Instant createdAt,
    Instant updatedAt
) {}
