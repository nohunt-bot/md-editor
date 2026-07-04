package com.company.skillmd.auth;

/**
 * Thrown when the caller's identity cannot be resolved (missing/unknown
 * X-Dev-User header). Maps to HTTP 401.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
