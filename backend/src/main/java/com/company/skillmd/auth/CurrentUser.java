package com.company.skillmd.auth;

import java.util.Map;

public class CurrentUser {

    private final String userId;
    private final String displayName;
    private final Map<String, Role> teamRoles;
    private final boolean admin;

    public CurrentUser(String userId, String displayName, Map<String, Role> teamRoles, boolean admin) {
        this.userId = userId;
        this.displayName = displayName;
        this.teamRoles = Map.copyOf(teamRoles);
        this.admin = admin;
    }

    public String getUserId() {
        return userId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Map<String, Role> getTeamRoles() {
        return teamRoles;
    }

    public boolean isAdmin() {
        return admin;
    }

    public boolean isMemberOf(String teamId) {
        return teamId != null && teamRoles.containsKey(teamId);
    }

    public boolean canEdit(String teamId) {
        if (admin) {
            return true;
        }
        return teamRoles.get(teamId) == Role.EDITOR;
    }
}
