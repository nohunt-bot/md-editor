package com.company.skillmd.skill;

import com.company.skillmd.AbstractIntegrationTest;
import com.company.skillmd.skill.dto.CreateSkillRequest;
import com.company.skillmd.skill.dto.UpdateSkillRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SkillControllerIntegrationTest extends AbstractIntegrationTest {

    @LocalServerPort
    private Integer port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private SkillRepository skillRepository;

    private String baseUrl;
    private HttpHeaders headers;

    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port + "/api/skills";
        skillRepository.deleteAll();

        headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Dev-User", "alice");
    }

    @Test
    @DisplayName("Create skill returns 200 with skill data")
    void createSkill_success() {
        // Arrange
        CreateSkillRequest request = new CreateSkillRequest(
            "test-skill",
            "Test Skill",
            "Test description",
            "# Test Content",
            "team-a",
            null,
            List.of("test"),
            null,
            null
        );

        HttpEntity<CreateSkillRequest> entity = new HttpEntity<>(request, headers);

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(baseUrl, entity, String.class);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("test-skill"));
    }

    @Test
    @DisplayName("Update with matching version returns 200")
    void updateSkill_matchingVersion_success() {
        // Arrange
        String skillId = createSkill("version-test");

        UpdateSkillRequest request = new UpdateSkillRequest(
            null, null, null, "updated content", null, null, null, null, "update test", 1, false
        );

        HttpEntity<UpdateSkillRequest> entity = new HttpEntity<>(request, headers);

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skillId, HttpMethod.PUT, entity, String.class);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("updated content"));
    }

    @Test
    @DisplayName("Update with mismatched version returns 409 Conflict")
    void updateSkill_mismatchedVersion_returns409() {
        // Arrange
        String skillId = createSkill("conflict-test");

        // First update to increment version to 2
        UpdateSkillRequest firstUpdate = new UpdateSkillRequest(
            null, null, null, "first update", null, null, null, null, "first", 1, false
        );
        restTemplate.exchange(
            baseUrl + "/" + skillId,
            HttpMethod.PUT,
            new HttpEntity<>(firstUpdate, headers),
            String.class
        );

        // Second update with stale version (1 instead of 2)
        UpdateSkillRequest staleUpdate = new UpdateSkillRequest(
            null, null, null, "stale update", null, null, null, null, "stale", 1, false
        );

        HttpEntity<UpdateSkillRequest> entity = new HttpEntity<>(staleUpdate, headers);

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skillId, HttpMethod.PUT, entity, String.class);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().contains("currentVersion"));
        assertTrue(response.getBody().contains("currentContent"));
    }

    @Test
    @DisplayName("Update with forceUpdate=true bypasses version check")
    void updateSkill_forceUpdate_bypassesVersionCheck() {
        // Arrange
        String skillId = createSkill("force-test");

        // Increment version to 2
        UpdateSkillRequest firstUpdate = new UpdateSkillRequest(
            null, null, null, "first update", null, null, null, null, "first", 1, false
        );
        restTemplate.exchange(
            baseUrl + "/" + skillId,
            HttpMethod.PUT,
            new HttpEntity<>(firstUpdate, headers),
            String.class
        );

        // Update with stale version but forceUpdate=true
        UpdateSkillRequest forceUpdate = new UpdateSkillRequest(
            null, null, null, "forced update", null, null, null, null, "forced", 1, true
        );

        HttpEntity<UpdateSkillRequest> entity = new HttpEntity<>(forceUpdate, headers);

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skillId, HttpMethod.PUT, entity, String.class);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("forced update"));
    }

    @Test
    @DisplayName("Team list exposes pagination metadata (totalPages/totalElements)")
    void listSkills_paginationMetadata() {
        // Arrange: 25 skills -> 2 pages at size 20 (Phase A v2 contract).
        for (int i = 0; i < 25; i++) {
            createSkill("page-" + i);
        }

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "?teamId=team-a&page=0&size=20",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            String.class
        );

        // Assert: Spring Page metadata must be serialized for the frontend.
        assertEquals(HttpStatus.OK, response.getStatusCode());
        String body = response.getBody();
        assertNotNull(body);
        assertTrue(body.contains("\"totalElements\":25"), "totalElements missing: " + snippet(body));
        assertTrue(body.contains("\"totalPages\":2"), "totalPages missing: " + snippet(body));

        // Second page carries the remaining 5.
        ResponseEntity<String> page2 = restTemplate.exchange(
            baseUrl + "?teamId=team-a&page=1&size=20",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            String.class
        );
        assertEquals(HttpStatus.OK, page2.getStatusCode());
        assertTrue(page2.getBody().contains("\"numberOfElements\":5"),
            "second page should hold 5 items: " + snippet(page2.getBody()));
    }

    private String snippet(String body) {
        return body == null ? "null" : body.substring(0, Math.min(body.length(), 300));
    }

    private String createSkill(String nameSuffix) {
        CreateSkillRequest request = new CreateSkillRequest(
            "skill-" + nameSuffix + "-" + System.currentTimeMillis(),
            "Test Skill",
            "Test description",
            "# Initial Content",
            "team-a",
            null,
            List.of("test"),
            null,
            null
        );

        HttpEntity<CreateSkillRequest> entity = new HttpEntity<>(request, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(baseUrl, entity, String.class);

        // Parse skill ID from response
        String body = response.getBody();
        if (body != null && body.contains("\"id\":\"")) {
            return body.split("\"id\":\"")[1].split("\"")[0];
        }
        throw new RuntimeException("Failed to parse skill ID from response: " + body);
    }
}
