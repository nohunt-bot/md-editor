package com.company.skillmd.auth;

public interface CurrentUserProvider {

    /**
     * Resolves the identity of the caller of the current request.
     * Implementations should throw UnauthorizedException when the identity
     * cannot be resolved (missing/unknown header, no session, etc).
     */
    CurrentUser getCurrentUser();
}
