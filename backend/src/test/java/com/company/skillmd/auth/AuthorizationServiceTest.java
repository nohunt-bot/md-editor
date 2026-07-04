package com.company.skillmd.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AuthorizationServiceTest {

    private static final String TEAM_A = "team-a";
    private static final String TEAM_B = "team-b";

    private CurrentUser teamAEditor() {
        return new CurrentUser("alice", "Alice", Map.of(TEAM_A, Role.EDITOR), false);
    }

    private CurrentUser teamAViewer() {
        return new CurrentUser("bob", "Bob", Map.of(TEAM_A, Role.VIEWER), false);
    }

    private CurrentUser otherTeamMember() {
        return new CurrentUser("carol", "Carol", Map.of(TEAM_B, Role.EDITOR), false);
    }

    private CurrentUser admin() {
        return new CurrentUser("admin", "Admin", Map.of(), true);
    }

    private AuthorizationService serviceFor(CurrentUser user) {
        CurrentUserProvider provider = () -> user;
        return new AuthorizationService(provider);
    }

    @Nested
    @DisplayName("read team skill (requireResourceReadable, not open+published)")
    class ReadTeamSkill {

        @Test
        @DisplayName("team editor can read own team's skill")
        void teamEditor_canRead() {
            assertDoesNotThrow(() ->
                serviceFor(teamAEditor()).requireResourceReadable(TEAM_A, false));
        }

        @Test
        @DisplayName("team viewer can read own team's skill")
        void teamViewer_canRead() {
            assertDoesNotThrow(() ->
                serviceFor(teamAViewer()).requireResourceReadable(TEAM_A, false));
        }

        @Test
        @DisplayName("other-team member reading private draft gets 404 (ResourceNotFoundException)")
        void otherTeamMember_getsNotFound() {
            assertThrows(ResourceNotFoundException.class, () ->
                serviceFor(otherTeamMember()).requireResourceReadable(TEAM_A, false));
        }

        @Test
        @DisplayName("admin can read any team's skill")
        void admin_canRead() {
            assertDoesNotThrow(() ->
                serviceFor(admin()).requireResourceReadable(TEAM_A, false));
        }
    }

    @Nested
    @DisplayName("read open+published skill")
    class ReadOpenPublished {

        @Test
        @DisplayName("other-team member can read open+published skill")
        void otherTeamMember_canReadOpenPublished() {
            assertDoesNotThrow(() ->
                serviceFor(otherTeamMember()).requireResourceReadable(TEAM_A, true));
        }

        @Test
        @DisplayName("team viewer can read open+published skill")
        void teamViewer_canReadOpenPublished() {
            assertDoesNotThrow(() ->
                serviceFor(teamAViewer()).requireResourceReadable(TEAM_A, true));
        }

        @Test
        @DisplayName("admin can read open+published skill")
        void admin_canReadOpenPublished() {
            assertDoesNotThrow(() ->
                serviceFor(admin()).requireResourceReadable(TEAM_A, true));
        }
    }

    @Nested
    @DisplayName("write / canEdit checks (create, update, publish-permission)")
    class Write {

        @Test
        @DisplayName("team editor can write own team's skill")
        void teamEditor_canWrite() {
            assertDoesNotThrow(() -> serviceFor(teamAEditor()).requireCanEdit(TEAM_A));
        }

        @Test
        @DisplayName("team viewer cannot write (403 Forbidden)")
        void teamViewer_cannotWrite() {
            assertThrows(ForbiddenException.class, () -> serviceFor(teamAViewer()).requireCanEdit(TEAM_A));
        }

        @Test
        @DisplayName("other-team member cannot write (403 Forbidden, foreign teamId)")
        void otherTeamMember_cannotWrite() {
            assertThrows(ForbiddenException.class, () -> serviceFor(otherTeamMember()).requireCanEdit(TEAM_A));
        }

        @Test
        @DisplayName("admin can write any team's skill")
        void admin_canWrite() {
            assertDoesNotThrow(() -> serviceFor(admin()).requireCanEdit(TEAM_A));
        }
    }

    @Nested
    @DisplayName("write on an existing resource (requireResourceEditable) - 404 vs 403 semantics")
    class ResourceWrite {

        @Test
        @DisplayName("team editor can edit own team's resource")
        void teamEditor_canEdit() {
            assertDoesNotThrow(() -> serviceFor(teamAEditor()).requireResourceEditable(TEAM_A));
        }

        @Test
        @DisplayName("team viewer editing own team's resource gets 403 (member, insufficient role)")
        void teamViewer_getsForbidden() {
            assertThrows(ForbiddenException.class, () -> serviceFor(teamAViewer()).requireResourceEditable(TEAM_A));
        }

        @Test
        @DisplayName("other-team member editing gets 404, not 403 (don't leak existence)")
        void otherTeamMember_getsNotFound() {
            assertThrows(ResourceNotFoundException.class,
                () -> serviceFor(otherTeamMember()).requireResourceEditable(TEAM_A));
        }

        @Test
        @DisplayName("admin can edit any team's resource")
        void admin_canEdit() {
            assertDoesNotThrow(() -> serviceFor(admin()).requireResourceEditable(TEAM_A));
        }
    }

    @Nested
    @DisplayName("team membership listing (requireTeamMember)")
    class TeamMembership {

        @Test
        @DisplayName("team editor is a member")
        void teamEditor_isMember() {
            assertDoesNotThrow(() -> serviceFor(teamAEditor()).requireTeamMember(TEAM_A));
        }

        @Test
        @DisplayName("team viewer is a member")
        void teamViewer_isMember() {
            assertDoesNotThrow(() -> serviceFor(teamAViewer()).requireTeamMember(TEAM_A));
        }

        @Test
        @DisplayName("other-team member is not a member -> 403")
        void otherTeamMember_notMember() {
            assertThrows(ForbiddenException.class, () -> serviceFor(otherTeamMember()).requireTeamMember(TEAM_A));
        }

        @Test
        @DisplayName("admin is treated as a member of any team")
        void admin_isMember() {
            assertDoesNotThrow(() -> serviceFor(admin()).requireTeamMember(TEAM_A));
        }
    }

    @Nested
    @DisplayName("CurrentUser helper methods")
    class CurrentUserHelpers {

        @Test
        @DisplayName("isMemberOf true only for teams present in the map")
        void isMemberOf() {
            CurrentUser user = teamAEditor();
            assertTrue(user.isMemberOf(TEAM_A));
            assertFalse(user.isMemberOf(TEAM_B));
        }

        @Test
        @DisplayName("canEdit true for editor role or admin, false for viewer or non-member")
        void canEdit() {
            assertTrue(teamAEditor().canEdit(TEAM_A));
            assertFalse(teamAViewer().canEdit(TEAM_A));
            assertFalse(otherTeamMember().canEdit(TEAM_A));
            assertTrue(admin().canEdit(TEAM_A));
        }
    }
}
