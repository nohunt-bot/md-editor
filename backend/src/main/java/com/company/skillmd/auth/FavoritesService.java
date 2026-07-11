package com.company.skillmd.auth;

import com.company.skillmd.search.SearchResultResponse;
import com.company.skillmd.skill.Skill;
import com.company.skillmd.skill.SkillRepository;
import com.company.skillmd.team.TeamService;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Favorites + recently-viewed (T1-4): a per-user bookmark list and a capped,
 * most-recent-first view history, both stored on {@link UserPreferences}. All
 * writes are atomic Mongo update operators (Phase E lesson, MeController:58)
 * — never find-then-save on the keyed preferences doc.
 */
@Service
public class FavoritesService {

    private static final int RECENT_CAP = 10;

    private final SkillRepository skillRepository;
    private final AuthorizationService authorizationService;
    private final TeamService teamService;
    private final MongoTemplate mongoTemplate;

    public FavoritesService(SkillRepository skillRepository, AuthorizationService authorizationService,
                            TeamService teamService, MongoTemplate mongoTemplate) {
        this.skillRepository = skillRepository;
        this.authorizationService = authorizationService;
        this.teamService = teamService;
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Add a skill to the caller's favorites. Validates the skill exists,
     * isn't soft-deleted, and is visible to the caller (admin, team member,
     * or open+published) — 404 otherwise (same rule as SearchService §3.1).
     * Idempotent via {@code $addToSet}.
     */
    public void addFavorite(String skillId) {
        Skill skill = skillRepository.findById(skillId)
            .filter(s -> s.getDeletedAt() == null)
            .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + skillId));
        boolean openAndPublished = "open".equals(skill.getScope()) && "published".equals(skill.getStatus());
        authorizationService.requireResourceReadable(skill.getTeamId(), openAndPublished);

        String userId = authorizationService.currentUser().getUserId();
        mongoTemplate.upsert(
            Query.query(Criteria.where("_id").is(userId)),
            new Update().addToSet("favoriteSkillIds", skillId),
            UserPreferences.class);
    }

    /** Remove a skill from the caller's favorites. Idempotent — no-op if absent. */
    public void removeFavorite(String skillId) {
        String userId = authorizationService.currentUser().getUserId();
        mongoTemplate.upsert(
            Query.query(Criteria.where("_id").is(userId)),
            new Update().pull("favoriteSkillIds", skillId),
            UserPreferences.class);
    }

    public List<SearchResultResponse> listFavorites() {
        String userId = authorizationService.currentUser().getUserId();
        List<String> ids = preferences(userId).map(UserPreferences::getFavoriteSkillIds).orElse(null);
        return resolve(ids);
    }

    /**
     * Best-effort: record that the caller just viewed a skill's detail. No
     * strict validation — the caller already successfully loaded the detail.
     * Pull-then-push-front with {@code $slice} dedupes and caps at
     * {@value #RECENT_CAP} via two sequential atomic updates.
     */
    public void recordRecent(String skillId) {
        String userId = authorizationService.currentUser().getUserId();
        Query query = Query.query(Criteria.where("_id").is(userId));
        mongoTemplate.upsert(query, new Update().pull("recentSkillIds", skillId), UserPreferences.class);
        mongoTemplate.upsert(query,
            new Update().push("recentSkillIds").atPosition(Update.Position.FIRST).slice(RECENT_CAP).each(skillId),
            UserPreferences.class);
    }

    public List<SearchResultResponse> listRecent() {
        String userId = authorizationService.currentUser().getUserId();
        List<String> ids = preferences(userId).map(UserPreferences::getRecentSkillIds).orElse(null);
        return resolve(ids);
    }

    private Optional<UserPreferences> preferences(String userId) {
        return Optional.ofNullable(mongoTemplate.findById(userId, UserPreferences.class));
    }

    /**
     * Resolve stored ids to metadata-only summaries (no content), preserving
     * stored order, filtering out skills that are now deleted or no longer
     * visible to the caller. Never rewrites the stored list — filtering
     * happens on read only.
     */
    private List<SearchResultResponse> resolve(List<String> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        CurrentUser user = authorizationService.currentUser();

        Map<String, Skill> byId = skillRepository.findAllById(ids).stream()
            .collect(Collectors.toMap(Skill::getId, s -> s, (a, b) -> a));

        List<Skill> visible = ids.stream()
            .map(byId::get)
            .filter(s -> s != null && s.getDeletedAt() == null)
            .filter(s -> isVisible(s, user))
            .toList();

        Set<String> teamIds = visible.stream().map(Skill::getTeamId).collect(Collectors.toSet());
        Map<String, String> displayNames = teamService.resolveDisplayNames(teamIds);

        return visible.stream()
            .map(s -> toResult(s, displayNames.get(s.getTeamId()), user))
            .collect(Collectors.toList());
    }

    private boolean isVisible(Skill s, CurrentUser user) {
        boolean openAndPublished = "open".equals(s.getScope()) && "published".equals(s.getStatus());
        return user.isAdmin() || user.isMemberOf(s.getTeamId()) || openAndPublished;
    }

    /**
     * Phase B (v2) invariant: a non-member reads the frozen publish snapshot,
     * never the live fields (mirrors SearchService's open-bucket handling).
     */
    private SearchResultResponse toResult(Skill s, String teamDisplayName, CurrentUser user) {
        boolean memberView = user.isAdmin() || user.isMemberOf(s.getTeamId());
        Skill.PublishedSnapshot snap = memberView ? null : s.getPublishedSnapshot();
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
