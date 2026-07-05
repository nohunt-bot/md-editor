package com.company.skillmd.skill;

import com.company.skillmd.AbstractIntegrationTest;
import com.company.skillmd.skill.dto.CopyToTeamRequest;
import com.company.skillmd.skill.dto.UpdateSkillRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testcontainers/embedded-Mongo HTTP integration test for Phase 1.3
 * publish / unpublish / copy-to-team endpoints and the delete guard.
 * Dev users come from application.yml: alice (team-a EDITOR),
 * bob (team-a VIEWER), carol (team-b EDITOR), admin (global admin).
 */
class SkillPublishIntegrationTest extends AbstractIntegrationTest {

    @LocalServerPort
    private Integer port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private SkillRepository skillRepository;

    private String baseUrl;

    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port + "/api/skills";
        skillRepository.deleteAll();
    }

    private HttpHeaders headersFor(String devUser) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Dev-User", devUser);
        return headers;
    }

    private Skill persistSkill(String name, String teamId, String scope, String status) {
        Skill skill = new Skill();
        skill.setName(name);
        skill.setDisplayName(name);
        skill.setDescription("desc");
        skill.setContent("# content");
        skill.setTeamId(teamId);
        skill.setScope(scope);
        skill.setStatus(status);
        skill.setTags(List.of("tag1"));
        skill.setCurrentVersion(1);
        skill.setAuthorId("alice");
        skill.setLastEditorId("alice");
        if ("published".equals(status)) {
            skill.setPublishedAt(Instant.now());
        }
        return skillRepository.save(skill);
    }

    @Test
    @DisplayName("POST /{id}/publish by editor returns 200 with published state")
    void publish_happyPath() {
        Skill skill = persistSkill("pub-skill", "team-a", "team", "draft");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skill.getId() + "/publish", HttpMethod.POST,
            new HttpEntity<>(headersFor("alice")), String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("\"status\":\"published\""));
        assertTrue(response.getBody().contains("\"scope\":\"open\""));
    }

    @Test
    @DisplayName("POST /{id}/publish by viewer returns 403")
    void publish_viewer_forbidden() {
        Skill skill = persistSkill("pub-skill-2", "team-a", "team", "draft");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skill.getId() + "/publish", HttpMethod.POST,
            new HttpEntity<>(headersFor("bob")), String.class);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("POST /{id}/publish by non-member returns 404")
    void publish_nonMember_notFound() {
        Skill skill = persistSkill("pub-skill-3", "team-a", "team", "draft");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skill.getId() + "/publish", HttpMethod.POST,
            new HttpEntity<>(headersFor("carol")), String.class);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("DELETE /{id}/publish keeps scope=open, sets status=draft")
    void unpublish_happyPath() {
        Skill skill = persistSkill("unpub-skill", "team-a", "open", "published");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skill.getId() + "/publish", HttpMethod.DELETE,
            new HttpEntity<>(headersFor("alice")), String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("\"status\":\"draft\""));
        assertTrue(response.getBody().contains("\"scope\":\"open\""));
    }

    @Test
    @DisplayName("DELETE /{id}/publish by admin on another team's skill returns 200")
    void unpublish_adminAnyTeam() {
        Skill skill = persistSkill("unpub-admin", "team-b", "open", "published");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skill.getId() + "/publish", HttpMethod.DELETE,
            new HttpEntity<>(headersFor("admin")), String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    @DisplayName("POST /{id}/copy-to-team creates a 201 draft in target team")
    void copyToTeam_happyPath() {
        // source open+published in team-a, carol is editor of team-b
        Skill source = persistSkill("copy-src", "team-a", "open", "published");

        CopyToTeamRequest body = new CopyToTeamRequest("team-b");
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + source.getId() + "/copy-to-team", HttpMethod.POST,
            new HttpEntity<>(body, headersFor("carol")), String.class);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertTrue(response.getBody().contains("\"teamId\":\"team-b\""));
        assertTrue(response.getBody().contains("\"status\":\"draft\""));
        assertTrue(response.getBody().contains("\"sourceSkillId\":\"" + source.getId() + "\""));
    }

    @Test
    @DisplayName("POST /{id}/copy-to-team where caller isn't editor of target returns 403")
    void copyToTeam_notEditorOfTarget_forbidden() {
        // bob is a viewer of team-a; source visible (open+published) but target team-a not editable
        Skill source = persistSkill("copy-src-2", "team-a", "open", "published");

        CopyToTeamRequest body = new CopyToTeamRequest("team-a");
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + source.getId() + "/copy-to-team", HttpMethod.POST,
            new HttpEntity<>(body, headersFor("bob")), String.class);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("POST /{id}/copy-to-team where source not visible returns 404")
    void copyToTeam_sourceNotVisible_notFound() {
        // source is a private team-a draft; carol (team-b editor) cannot see it
        Skill source = persistSkill("copy-src-3", "team-a", "team", "draft");

        CopyToTeamRequest body = new CopyToTeamRequest("team-b");
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + source.getId() + "/copy-to-team", HttpMethod.POST,
            new HttpEntity<>(body, headersFor("carol")), String.class);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("DELETE /{id} on a published skill returns 409")
    void deletePublished_conflict() {
        Skill skill = persistSkill("del-pub", "team-a", "open", "published");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skill.getId(), HttpMethod.DELETE,
            new HttpEntity<>(headersFor("alice")), String.class);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    // --- Phase 1.4: updateSkill 403-vs-404 fix (PRD §5.5) ---

    private HttpHeaders updateHeadersFor(String devUser) {
        // Author/editor identity now comes from X-Dev-User (headersFor);
        // X-User-Id is no longer read by the controller.
        return headersFor(devUser);
    }

    @Test
    @DisplayName("PUT /{id} by team viewer returns 403 (not masked as 404)")
    void update_viewer_forbidden() {
        Skill skill = persistSkill("upd-viewer", "team-a", "team", "draft");
        UpdateSkillRequest body = new UpdateSkillRequest(
            null, null, null, "new content", null, null, null, null, "edit", null, false);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skill.getId(), HttpMethod.PUT,
            new HttpEntity<>(body, updateHeadersFor("bob")), String.class);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("PUT /{id} by non-member returns 404")
    void update_nonMember_notFound() {
        Skill skill = persistSkill("upd-nonmember", "team-a", "team", "draft");
        UpdateSkillRequest body = new UpdateSkillRequest(
            null, null, null, "new content", null, null, null, null, "edit", null, false);

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/" + skill.getId(), HttpMethod.PUT,
            new HttpEntity<>(body, updateHeadersFor("carol")), String.class);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // --- Phase B (v2): publish freeze ---

    @Test
    @DisplayName("Freeze flow: non-member sees publish-time content until re-publish")
    void publishFreeze_nonMemberSeesFrozenUntilRepublish() {
        Skill skill = persistSkill("freeze-flow", "team-a", "team", "draft");
        String id = skill.getId();

        // alice publishes v1 content
        ResponseEntity<String> publish = restTemplate.exchange(
            baseUrl + "/" + id + "/publish", HttpMethod.POST,
            new HttpEntity<>(headersFor("alice")), String.class);
        assertEquals(HttpStatus.OK, publish.getStatusCode());

        // alice edits after publishing (live moves ahead of the snapshot)
        UpdateSkillRequest update = new UpdateSkillRequest(
            null, null, null, "# secret rewrite", null, null, null, null, "wip", 1, false);
        ResponseEntity<String> updated = restTemplate.exchange(
            baseUrl + "/" + id, HttpMethod.PUT,
            new HttpEntity<>(update, headersFor("alice")), String.class);
        assertEquals(HttpStatus.OK, updated.getStatusCode());

        // carol (non-member) still reads the frozen publish-time content
        ResponseEntity<String> carolView = restTemplate.exchange(
            baseUrl + "/" + id, HttpMethod.GET,
            new HttpEntity<>(headersFor("carol")), String.class);
        assertEquals(HttpStatus.OK, carolView.getStatusCode());
        assertTrue(carolView.getBody().contains("# content"), "carol should see frozen content");
        assertFalse(carolView.getBody().contains("secret rewrite"), "draft edit must not leak");

        // alice (member) reads the live edit
        ResponseEntity<String> aliceView = restTemplate.exchange(
            baseUrl + "/" + id, HttpMethod.GET,
            new HttpEntity<>(headersFor("alice")), String.class);
        assertTrue(aliceView.getBody().contains("secret rewrite"), "member should see live content");

        // re-publish refreshes the freeze; carol now sees the new content
        restTemplate.exchange(
            baseUrl + "/" + id + "/publish", HttpMethod.POST,
            new HttpEntity<>(headersFor("alice")), String.class);
        ResponseEntity<String> carolAfter = restTemplate.exchange(
            baseUrl + "/" + id, HttpMethod.GET,
            new HttpEntity<>(headersFor("carol")), String.class);
        assertTrue(carolAfter.getBody().contains("secret rewrite"),
            "after re-publish carol sees the refreshed content");
    }
}
