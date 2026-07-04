package com.company.skillmd.auth;

import com.company.skillmd.team.TeamService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class MeController {

    private final AuthorizationService authorizationService;
    private final TeamService teamService;

    public MeController(AuthorizationService authorizationService, TeamService teamService) {
        this.authorizationService = authorizationService;
        this.teamService = teamService;
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

    public record MeResponse(String userId, String displayName, List<TeamMembership> teams, boolean admin) {}

    public record TeamMembership(String id, String displayName, Role role) {}
}
