package com.company.skillmd.auth;

/**
 * Thrown when a resource does not exist, or exists but the caller must not
 * be able to tell the difference (e.g. reading another team's draft skill).
 * Maps to HTTP 404 — never used to signal "found but forbidden".
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
