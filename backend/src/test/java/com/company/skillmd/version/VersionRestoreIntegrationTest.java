package com.company.skillmd.version;

import com.company.skillmd.AbstractIntegrationTest;
import com.company.skillmd.skill.SkillRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase (v3): version restore is wired to CurrentUserProvider (X-Dev-User), not
 * the old X-User-Id header, and enforces editor rights.
 */
class VersionRestoreIntegrationTest extends AbstractIntegrationTest {

    @LocalServerPort
    private Integer port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private SkillRepository skillRepository;

    private String base;

    @BeforeEach
    void setUp() {
        base = "http://localhost:" + port + "/api/skills";
        skillRepository.deleteAll();
    }

    private HttpHeaders headers(String devUser) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.set("X-Dev-User", devUser);
        return h;
    }

    private String createAndEdit() {
        // Create v1 as alice (team-a editor)
        String createBody = "{\"name\":\"restore-me\",\"displayName\":\"Restore Me\","
            + "\"content\":\"# v1 content\",\"teamId\":\"team-a\"}";
        ResponseEntity<String> created = restTemplate.exchange(base, HttpMethod.POST,
            new HttpEntity<>(createBody, headers("alice")), String.class);
        assertEquals(HttpStatus.OK, created.getStatusCode());
        String id = created.getBody().split("\"id\":\"")[1].split("\"")[0];

        // Edit → v2
        String updateBody = "{\"content\":\"# v2 content\",\"expectedVersion\":1}";
        ResponseEntity<String> updated = restTemplate.exchange(base + "/" + id, HttpMethod.PUT,
            new HttpEntity<>(updateBody, headers("alice")), String.class);
        assertEquals(HttpStatus.OK, updated.getStatusCode());
        return id;
    }

    @Test
    @DisplayName("Restore to v1 brings content back and bumps the version (X-Dev-User, no X-User-Id)")
    void restore_success() {
        String id = createAndEdit();

        ResponseEntity<String> restore = restTemplate.exchange(
            base + "/" + id + "/versions/1/restore", HttpMethod.POST,
            new HttpEntity<>(headers("alice")), String.class);
        assertEquals(HttpStatus.OK, restore.getStatusCode());

        ResponseEntity<String> after = restTemplate.exchange(base + "/" + id, HttpMethod.GET,
            new HttpEntity<>(headers("alice")), String.class);
        assertTrue(after.getBody().contains("v1 content"), "content restored: " + after.getBody());
        assertTrue(after.getBody().contains("\"currentVersion\":3"), "restore creates a new version");
    }

    @Test
    @DisplayName("Viewer cannot restore (403)")
    void restore_viewer_forbidden() {
        String id = createAndEdit();
        ResponseEntity<String> restore = restTemplate.exchange(
            base + "/" + id + "/versions/1/restore", HttpMethod.POST,
            new HttpEntity<>(headers("bob")), String.class); // bob = team-a VIEWER
        assertEquals(HttpStatus.FORBIDDEN, restore.getStatusCode());
    }
}
