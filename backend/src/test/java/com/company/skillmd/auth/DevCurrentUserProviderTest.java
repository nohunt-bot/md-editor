package com.company.skillmd.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DevCurrentUserProviderTest {

    @Mock
    private HttpServletRequest request;

    private DevUserProperties properties() {
        DevUserProperties properties = new DevUserProperties();
        DevUserProperties.DevUser alice = new DevUserProperties.DevUser();
        alice.setDisplayName("Alice");
        alice.setAdmin(false);
        alice.setTeams(Map.of("team-a", Role.EDITOR));
        properties.setDevUsers(Map.of("alice", alice));
        return properties;
    }

    @Test
    @DisplayName("missing X-Dev-User header -> UnauthorizedException")
    void missingHeader_throwsUnauthorized() {
        when(request.getHeader(DevCurrentUserProvider.HEADER)).thenReturn(null);
        DevCurrentUserProvider provider = new DevCurrentUserProvider(request, properties());

        assertThrows(UnauthorizedException.class, provider::getCurrentUser);
    }

    @Test
    @DisplayName("unknown X-Dev-User header value -> UnauthorizedException")
    void unknownUser_throwsUnauthorized() {
        when(request.getHeader(DevCurrentUserProvider.HEADER)).thenReturn("nobody");
        DevCurrentUserProvider provider = new DevCurrentUserProvider(request, properties());

        assertThrows(UnauthorizedException.class, provider::getCurrentUser);
    }

    @Test
    @DisplayName("known user resolves to CurrentUser with correct team roles")
    void knownUser_resolvesCurrentUser() {
        when(request.getHeader(DevCurrentUserProvider.HEADER)).thenReturn("alice");
        DevCurrentUserProvider provider = new DevCurrentUserProvider(request, properties());

        CurrentUser user = provider.getCurrentUser();

        assertEquals("alice", user.getUserId());
        assertEquals("Alice", user.getDisplayName());
        assertFalse(user.isAdmin());
        assertTrue(user.canEdit("team-a"));
    }
}
