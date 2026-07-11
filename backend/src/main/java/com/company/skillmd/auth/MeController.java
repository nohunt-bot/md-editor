package com.company.skillmd.auth;

import com.company.skillmd.search.SearchResultResponse;
import com.company.skillmd.team.TeamService;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class MeController {

    private final AuthorizationService authorizationService;
    private final TeamService teamService;
    private final UserPreferencesRepository preferencesRepository;
    private final MongoTemplate mongoTemplate;
    private final FavoritesService favoritesService;

    public MeController(AuthorizationService authorizationService, TeamService teamService,
                        UserPreferencesRepository preferencesRepository, MongoTemplate mongoTemplate,
                        FavoritesService favoritesService) {
        this.authorizationService = authorizationService;
        this.teamService = teamService;
        this.preferencesRepository = preferencesRepository;
        this.mongoTemplate = mongoTemplate;
        this.favoritesService = favoritesService;
    }

    @GetMapping("/api/me")
    public ResponseEntity<MeResponse> me() {
        CurrentUser user = authorizationService.currentUser();

        List<TeamMembership> teams = user.getTeamRoles().entrySet().stream()
            .map(entry -> {
                String teamId = entry.getKey();
                String displayName = teamService.getTeam(teamId)
                    .map(TeamService.TeamResponse::displayName)
                    .orElse(teamId);
                return new TeamMembership(teamId, displayName, entry.getValue());
            })
            .toList();

        return ResponseEntity.ok(new MeResponse(user.getUserId(), user.getDisplayName(), teams, user.isAdmin()));
    }

    /** Preferences that follow the user across devices (theme + language + card view/density). */
    @GetMapping("/api/me/preferences")
    public ResponseEntity<PreferencesResponse> getPreferences() {
        String userId = authorizationService.currentUser().getUserId();
        return ResponseEntity.ok(preferencesRepository.findById(userId)
            .map(p -> new PreferencesResponse(p.getTheme(), p.getLanguage(), p.getCardView(), p.getCardDensity()))
            .orElse(new PreferencesResponse(null, null, null, null))); // null = client uses its default
    }

    @PutMapping("/api/me/preferences")
    public ResponseEntity<PreferencesResponse> savePreferences(@RequestBody PreferencesRequest req) {
        String userId = authorizationService.currentUser().getUserId();
        // Atomic upsert (Phase E lesson: don't find-then-save on a keyed doc).
        Update update = new Update();
        if (req.theme() != null) update.set("theme", req.theme());
        if (req.language() != null) update.set("language", req.language());
        if (req.cardView() != null) update.set("cardView", req.cardView());
        if (req.cardDensity() != null) update.set("cardDensity", req.cardDensity());
        mongoTemplate.upsert(Query.query(Criteria.where("_id").is(userId)),
            update, UserPreferences.class);
        return getPreferences();
    }

    // --- T1-4: favorites + recently viewed --------------------------------

    /** Add to favorites. 404 if the skill doesn't exist, is deleted, or isn't visible to the caller. Idempotent. */
    @PutMapping("/api/me/favorites/{skillId}")
    public ResponseEntity<Void> addFavorite(@PathVariable String skillId) {
        favoritesService.addFavorite(skillId);
        return ResponseEntity.ok().build();
    }

    /** Remove from favorites. Idempotent — 200 even if absent. */
    @DeleteMapping("/api/me/favorites/{skillId}")
    public ResponseEntity<Void> removeFavorite(@PathVariable String skillId) {
        favoritesService.removeFavorite(skillId);
        return ResponseEntity.ok().build();
    }

    /** Metadata-only, stored order, filtered to what's currently visible to the caller. */
    @GetMapping("/api/me/favorites")
    public ResponseEntity<List<SearchResultResponse>> listFavorites() {
        return ResponseEntity.ok(favoritesService.listFavorites());
    }

    /** Best-effort: record a detail view. No visibility validation (the caller just loaded it). */
    @PostMapping("/api/me/recent/{skillId}")
    public ResponseEntity<Void> recordRecent(@PathVariable String skillId) {
        favoritesService.recordRecent(skillId);
        return ResponseEntity.ok().build();
    }

    /** Same resolution/filtering as favorites, most-recent-first, capped at 10. */
    @GetMapping("/api/me/recent")
    public ResponseEntity<List<SearchResultResponse>> listRecent() {
        return ResponseEntity.ok(favoritesService.listRecent());
    }

    public record MeResponse(String userId, String displayName, List<TeamMembership> teams, boolean admin) {}

    public record TeamMembership(String id, String displayName, Role role) {}

    public record PreferencesResponse(String theme, String language, String cardView, String cardDensity) {}

    public record PreferencesRequest(String theme, String language, String cardView, String cardDensity) {}
}
