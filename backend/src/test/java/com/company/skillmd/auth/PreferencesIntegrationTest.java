package com.company.skillmd.auth;

import com.company.skillmd.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase (v3): user preferences persist server-side, keyed by userId, isolated
 * per user. Dev users from application.yml: alice, carol, ...
 */
class PreferencesIntegrationTest extends AbstractIntegrationTest {

    @LocalServerPort
    private Integer port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserPreferencesRepository preferencesRepository;

    private String url;

    @BeforeEach
    void setUp() {
        url = "http://localhost:" + port + "/api/me/preferences";
        preferencesRepository.deleteAll();
    }

    private HttpHeaders headersFor(String devUser) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Dev-User", devUser);
        return headers;
    }

    @Test
    @DisplayName("Defaults are null when nothing saved; save then get round-trips; upsert is idempotent")
    void saveAndGet() {
        // Default: nulls (client falls back to its own default)
        ResponseEntity<String> def = restTemplate.exchange(
            url, HttpMethod.GET, new HttpEntity<>(headersFor("alice")), String.class);
        assertEquals(HttpStatus.OK, def.getStatusCode());
        assertTrue(def.getBody().contains("\"theme\":null"));

        // Save alice's prefs
        ResponseEntity<String> saved = restTemplate.exchange(
            url, HttpMethod.PUT,
            new HttpEntity<>("{\"theme\":\"dark\",\"language\":\"en\"}", headersFor("alice")),
            String.class);
        assertEquals(HttpStatus.OK, saved.getStatusCode());
        assertTrue(saved.getBody().contains("\"theme\":\"dark\""));
        assertTrue(saved.getBody().contains("\"language\":\"en\""));

        // Re-save (upsert) — still one row, updated
        restTemplate.exchange(url, HttpMethod.PUT,
            new HttpEntity<>("{\"theme\":\"light\"}", headersFor("alice")), String.class);
        assertEquals(1, preferencesRepository.count());
        ResponseEntity<String> after = restTemplate.exchange(
            url, HttpMethod.GET, new HttpEntity<>(headersFor("alice")), String.class);
        assertTrue(after.getBody().contains("\"theme\":\"light\""));
        assertTrue(after.getBody().contains("\"language\":\"en\""), "partial update keeps language");
    }

    @Test
    @DisplayName("cardView/cardDensity round-trip and default to null when nothing saved")
    void cardViewAndDensityRoundTrip() {
        // Default: nulls
        ResponseEntity<String> def = restTemplate.exchange(
            url, HttpMethod.GET, new HttpEntity<>(headersFor("alice")), String.class);
        assertTrue(def.getBody().contains("\"cardView\":null"));
        assertTrue(def.getBody().contains("\"cardDensity\":null"));

        // Save alice's card prefs
        ResponseEntity<String> saved = restTemplate.exchange(
            url, HttpMethod.PUT,
            new HttpEntity<>("{\"cardView\":\"grid\",\"cardDensity\":\"compact\"}", headersFor("alice")),
            String.class);
        assertEquals(HttpStatus.OK, saved.getStatusCode());
        assertTrue(saved.getBody().contains("\"cardView\":\"grid\""));
        assertTrue(saved.getBody().contains("\"cardDensity\":\"compact\""));

        // Re-fetch to confirm persistence
        ResponseEntity<String> after = restTemplate.exchange(
            url, HttpMethod.GET, new HttpEntity<>(headersFor("alice")), String.class);
        assertTrue(after.getBody().contains("\"cardView\":\"grid\""));
        assertTrue(after.getBody().contains("\"cardDensity\":\"compact\""));
    }

    @Test
    @DisplayName("Preferences are isolated per user")
    void perUserIsolation() {
        restTemplate.exchange(url, HttpMethod.PUT,
            new HttpEntity<>("{\"theme\":\"dark\"}", headersFor("alice")), String.class);

        ResponseEntity<String> carol = restTemplate.exchange(
            url, HttpMethod.GET, new HttpEntity<>(headersFor("carol")), String.class);
        assertTrue(carol.getBody().contains("\"theme\":null"), "carol should not see alice's prefs");
    }
}
