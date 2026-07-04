package com.company.skillmd.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@EnableConfigurationProperties(DevUserProperties.class)
public class DevCurrentUserProvider implements CurrentUserProvider {

    public static final String HEADER = "X-Dev-User";

    private final HttpServletRequest request;
    private final DevUserProperties devUserProperties;

    public DevCurrentUserProvider(HttpServletRequest request, DevUserProperties devUserProperties) {
        this.request = request;
        this.devUserProperties = devUserProperties;
    }

    @Override
    public CurrentUser getCurrentUser() {
        String userId = request.getHeader(HEADER);
        if (userId == null || userId.isBlank()) {
            throw new UnauthorizedException("Missing " + HEADER + " header");
        }

        DevUserProperties.DevUser devUser = devUserProperties.getDevUsers().get(userId);
        if (devUser == null) {
            throw new UnauthorizedException("Unknown dev user: " + userId);
        }

        return new CurrentUser(userId, devUser.getDisplayName(), devUser.getTeams(), devUser.isAdmin());
    }
}
