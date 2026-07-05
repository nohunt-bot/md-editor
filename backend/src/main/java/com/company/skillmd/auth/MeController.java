package com.company.skillmd.auth;

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

    public MeController(AuthorizationService authorizationService, TeamService teamService,
                        UserPreferencesRepository preferencesRepository, MongoTemplate mongoTemplate) {
        this.authorizationService = authorizationService;
        this.teamService = teamService;
        this.preferencesRepository = preferencesRepository;
        this.mongoTemplate = mongoTemplate;
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

    /** Preferences that follow the user across devices (theme + language). */
    @GetMapping("/api/me/preferences")
    public ResponseEntity<PreferencesResponse> getPreferences() {
        String userId = authorizationService.currentUser().getUserId();
        return ResponseEntity.ok(preferencesRepository.findById(userId)
            .map(p -> new PreferencesResponse(p.getTheme(), p.getLanguage()))
            .orElse(new PreferencesResponse(null, null))); // null = client uses its default
    }

    @PutMapping("/api/me/preferences")
    public ResponseEntity<PreferencesResponse> savePreferences(@RequestBody PreferencesRequest req) {
        String userId = authorizationService.currentUser().getUserId();
        // Atomic upsert (Phase E lesson: don't find-then-save on a keyed doc).
        Update update = new Update();
        if (req.theme() != null) update.set("theme", req.theme());
        if (req.language() != null) update.set("language", req.language());
        mongoTemplate.upsert(Query.query(Criteria.where("_id").is(userId)),
            update, UserPreferences.class);
        return getPreferences();
    }

    public record MeResponse(String userId, String displayName, List<TeamMembership> teams, boolean admin) {}

    public record TeamMembership(String id, String displayName, Role role) {}

    public record PreferencesResponse(String theme, String language) {}

    public record PreferencesRequest(String theme, String language) {}
}
