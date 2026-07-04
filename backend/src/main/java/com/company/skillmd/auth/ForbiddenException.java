package com.company.skillmd.auth;

/**
 * Thrown when the caller is authenticated and a member of the resource's
 * team but lacks the required role (e.g. viewer attempting a write).
 * Maps to HTTP 403.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
