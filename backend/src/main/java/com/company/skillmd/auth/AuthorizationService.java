package com.company.skillmd.auth;

import org.springframework.stereotype.Service;

@Service
public class AuthorizationService {

    private final CurrentUserProvider currentUserProvider;

    public AuthorizationService(CurrentUserProvider currentUserProvider) {
        this.currentUserProvider = currentUserProvider;
    }

    public CurrentUser currentUser() {
        return currentUserProvider.getCurrentUser();
    }

    /**
     * Team-scoped read (e.g. team skill list/folder tree): caller must be a
     * member of the team, or admin. Non-member -> 403 (used for listing
     * endpoints where the team is an explicit request parameter, not a
     * resource whose existence should be hidden).
     */
    public void requireTeamMember(String teamId) {
        CurrentUser user = currentUser();
        if (user.isAdmin() || user.isMemberOf(teamId)) {
            return;
        }
        throw new ForbiddenException("Not a member of team: " + teamId);
    }

    /**
     * Team-scoped write (create/update/soft-delete/publish/restore): caller
     * must be an editor of the team, or admin. Member-but-viewer -> 403.
     */
    public void requireCanEdit(String teamId) {
        CurrentUser user = currentUser();
        if (user.canEdit(teamId)) {
            return;
        }
        if (user.isMemberOf(teamId)) {
            throw new ForbiddenException("Editor role required for team: " + teamId);
        }
        throw new ForbiddenException("Not a member of team: " + teamId);
    }

    /**
     * Resource-level read for a skill/version/folder belonging to teamId,
     * with an optional open+published escape hatch. Non-member reading a
     * private resource -> 404 (existence must not be leaked).
     */
    public void requireResourceReadable(String teamId, boolean openAndPublished) {
        CurrentUser user = currentUser();
        if (user.isAdmin() || user.isMemberOf(teamId) || openAndPublished) {
            return;
        }
        throw new ResourceNotFoundException("Resource not found");
    }

    /**
     * Resource-level write for a skill/version/folder belonging to teamId.
     * Non-member -> 404 (don't leak existence). Member-but-viewer -> 403.
     */
    public void requireResourceEditable(String teamId) {
        CurrentUser user = currentUser();
        if (user.canEdit(teamId)) {
            return;
        }
        if (user.isAdmin() || user.isMemberOf(teamId)) {
            throw new ForbiddenException("Editor role required for team: " + teamId);
        }
        throw new ResourceNotFoundException("Resource not found");
    }
}
