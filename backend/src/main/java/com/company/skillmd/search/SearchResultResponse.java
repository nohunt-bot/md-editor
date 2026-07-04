package com.company.skillmd.search;

import java.time.Instant;
import java.util.List;

/**
 * Metadata-only search hit (PRD §5.3, §6.5). Deliberately excludes
 * {@code content} — the global search dropdown only needs enough to render a
 * row and route to the detail page.
 */
public record SearchResultResponse(
    String id,
    String name,
    String displayName,
    String description,
    String teamId,
    String teamDisplayName,
    String scope,
    String status,
    List<String> tags,
    Instant publishedAt,
    Instant updatedAt
) {}
