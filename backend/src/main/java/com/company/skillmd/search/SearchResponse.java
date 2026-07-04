package com.company.skillmd.search;

import java.util.List;

/**
 * Grouped search response (PRD §5.3 / §6.5): the frontend dropdown shows two
 * groups, "我的團隊" and "開放空間". A skill that would qualify for both groups
 * appears under {@code team} only (dedupe — team is the more specific bucket).
 */
public record SearchResponse(
    List<SearchResultResponse> team,
    List<SearchResultResponse> open
) {}
