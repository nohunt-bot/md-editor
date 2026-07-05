package com.company.skillmd.skill.dto;

import java.util.List;

/**
 * Phase E (v2): editor presence view returned by the heartbeat.
 * {@code editors} excludes the caller; {@code currentVersion} lets the client
 * detect that someone else already saved (version moved past what it loaded)
 * and warn early — before the optimistic-lock 409 on submit.
 */
public record PresenceResponse(List<String> editors, Integer currentVersion) {}
