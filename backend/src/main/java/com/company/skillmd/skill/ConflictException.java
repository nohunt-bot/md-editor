package com.company.skillmd.skill;

/**
 * Thrown when a request conflicts with the current state of a resource, e.g.
 * attempting to soft-delete a skill that is still published. Maps to HTTP 409.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
