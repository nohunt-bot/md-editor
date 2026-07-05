package com.company.skillmd.search;

import com.company.skillmd.auth.AuthorizationService;
import com.company.skillmd.auth.CurrentUser;
import com.company.skillmd.skill.Skill;
import com.company.skillmd.team.TeamService;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Visibility-scoped $text search (PRD §5.3). Metadata-only results grouped as
 * {@code { team: [...], open: [...] }} per the caller's visibility (§3.1):
 * <ul>
 *   <li>team — skills in teams the caller belongs to (any status), plus, for an
 *       admin, any team's non-open skills (admin sees everything);</li>
 *   <li>open — {@code scope=open ∧ status=published} in any team.</li>
 * </ul>
 * A skill qualifying for both buckets appears under {@code team} only (dedupe).
 */
@Service
public class SearchService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final MongoTemplate mongoTemplate;
    private final AuthorizationService authorizationService;
    private final TeamService teamService;

    public SearchService(MongoTemplate mongoTemplate, AuthorizationService authorizationService,
                         TeamService teamService) {
        this.mongoTemplate = mongoTemplate;
        this.authorizationService = authorizationService;
        this.teamService = teamService;
    }

    public SearchResponse search(String q, String scope, String tag, Integer limit) {
        String effectiveScope = (scope == null || scope.isBlank()) ? "all" : scope;
        int effectiveLimit = limit == null ? DEFAULT_LIMIT : Math.min(Math.max(limit, 1), MAX_LIMIT);
        CurrentUser user = authorizationService.currentUser();

        Query query = new Query();
        query.addCriteria(TextCriteria.forDefaultLanguage().matching(q));
        Criteria base = Criteria.where("deletedAt").isNull();
        if (tag != null && !tag.isBlank()) {
            base = base.and("tags").is(tag);
        }
        query.addCriteria(base);
        query.limit(effectiveLimit);

        List<Skill> hits = mongoTemplate.find(query, Skill.class);

        List<Skill> teamHits = new ArrayList<>();
        List<Skill> openHits = new ArrayList<>();
        for (Skill s : hits) {
            boolean inTeam = user.isAdmin() || user.isMemberOf(s.getTeamId());
            boolean openPublished = "open".equals(s.getScope()) && "published".equals(s.getStatus());
            if (inTeam) {
                teamHits.add(s);          // dedupe: team is the more specific bucket
            } else if (openPublished) {
                openHits.add(s);
            }
        }

        boolean wantTeam = "all".equals(effectiveScope) || "team".equals(effectiveScope);
        boolean wantOpen = "all".equals(effectiveScope) || "open".equals(effectiveScope);

        if (!wantTeam) {
            teamHits = List.of();
        }
        if (!wantOpen) {
            openHits = List.of();
        }

        Set<String> teamIds = new java.util.HashSet<>();
        teamHits.forEach(s -> teamIds.add(s.getTeamId()));
        openHits.forEach(s -> teamIds.add(s.getTeamId()));
        Map<String, String> displayNames = teamService.resolveDisplayNames(teamIds);

        return new SearchResponse(
            teamHits.stream().map(s -> toResult(s, displayNames.get(s.getTeamId()), false)).collect(Collectors.toList()),
            // Phase B (v2): the open bucket is the frozen-publish view —
            // metadata from the snapshot so results match the frozen detail.
            openHits.stream().map(s -> toResult(s, displayNames.get(s.getTeamId()), true)).collect(Collectors.toList())
        );
    }

    private SearchResultResponse toResult(Skill s, String teamDisplayName, boolean frozenView) {
        Skill.PublishedSnapshot snap = frozenView ? s.getPublishedSnapshot() : null;
        return new SearchResultResponse(
            s.getId(),
            s.getName(),
            snap != null ? snap.getDisplayName() : s.getDisplayName(),
            snap != null ? snap.getDescription() : s.getDescription(),
            s.getTeamId(),
            teamDisplayName,
            s.getScope(),
            s.getStatus(),
            snap != null ? snap.getTags() : s.getTags(),
            s.getPublishedAt(),
            s.getUpdatedAt()
        );
    }
}
