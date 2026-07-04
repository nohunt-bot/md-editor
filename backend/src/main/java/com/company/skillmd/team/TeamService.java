package com.company.skillmd.team;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

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

    private TeamResponse toResponse(Team team) {
        return new TeamResponse(team.getId(), team.getName(), team.getDisplayName(), team.getCreatedAt());
    }

    public record TeamResponse(String id, String name, String displayName, java.time.Instant createdAt) {}
}
