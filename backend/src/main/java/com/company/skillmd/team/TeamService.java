package com.company.skillmd.team;

import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TeamService {

    private final TeamRepository teamRepository;

    public TeamService(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    public List<TeamResponse> listTeams() {
        return teamRepository.findAll().stream()
            .map(this::toResponse)
            .toList();
    }

    public Optional<TeamResponse> getTeam(String id) {
        return teamRepository.findById(id).map(this::toResponse);
    }

    /**
     * Batch-resolves teamId -> displayName for the given ids in a single query
     * (avoids N+1 lookups when decorating open-space skill listings). Ids with
     * no matching team are simply absent from the returned map.
     */
    public Map<String, String> resolveDisplayNames(Set<String> teamIds) {
        if (teamIds == null || teamIds.isEmpty()) {
            return Map.of();
        }
        return teamRepository.findAllById(teamIds).stream()
            .collect(Collectors.toMap(Team::getId, Team::getDisplayName, (a, b) -> a, LinkedHashMap::new));
    }

    private TeamResponse toResponse(Team team) {
        return new TeamResponse(team.getId(), team.getName(), team.getDisplayName(), team.getCreatedAt());
    }

    public record TeamResponse(String id, String name, String displayName, java.time.Instant createdAt) {}
}
