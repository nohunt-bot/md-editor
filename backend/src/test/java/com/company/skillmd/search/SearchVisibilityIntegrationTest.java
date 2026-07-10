package com.company.skillmd.search;

import com.company.skillmd.AbstractIntegrationTest;
import com.company.skillmd.skill.Skill;
import com.company.skillmd.skill.SkillRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.TextIndexDefinition;
import org.springframework.http.*;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * HTTP integration test for Phase 1.4 open-space listing + visibility-scoped
 * search. Dev users (application.yml): alice (team-a EDITOR), bob (team-a
 * VIEWER), carol (team-b EDITOR), admin. Docker/Mongo may be unavailable in CI —
 * this test is written primarily to guarantee the endpoints compile and to
 * document the expected visibility behavior when a Mongo backend is present.
 */
class SearchVisibilityIntegrationTest extends AbstractIntegrationTest {

    @LocalServerPort
    private Integer port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private SkillRepository skillRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    private String skillsUrl;
    private String searchUrl;

    @BeforeEach
    void setUp() {
        skillsUrl = "http://localhost:" + port + "/api/skills";
        searchUrl = "http://localhost:" + port + "/api/search";
        skillRepository.deleteAll();
        // $text queries need the text index; auto index creation is off by default.
        mongoTemplate.indexOps(Skill.class).ensureIndex(
            new TextIndexDefinition.TextIndexDefinitionBuilder()
                .onField("name", 10F).onField("displayName", 10F).onField("tags", 8F)
                .onField("description", 5F).onField("content", 1F)
                .build());
    }

    private HttpHeaders headersFor(String devUser) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Dev-User", devUser);
        return headers;
    }

    private void persist(String name, String teamId, String scope, String status) {
        Skill skill = new Skill();
        skill.setName(name);
        skill.setDisplayName(name);
        skill.setDescription("searchable description");
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
        skillRepository.save(skill);
    }

    private void persistWithContent(String name, String teamId, String scope, String status, String content) {
        Skill skill = new Skill();
        skill.setName(name);
        skill.setDisplayName(name);
        skill.setDescription("searchable description");
        skill.setContent(content);
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
        skillRepository.save(skill);
    }

    @Test
    @DisplayName("search matches a keyword that appears only in content, not in name/displayName/description/tags")
    void search_matchesKeywordOnlyInContent() {
        persistWithContent("plain-skill", "team-a", "team", "draft",
            "This paragraph mentions xylophone somewhere in the markdown body.");

        ResponseEntity<String> response = restTemplate.exchange(
            searchUrl + "?q=xylophone", HttpMethod.GET,
            new HttpEntity<>(headersFor("alice")), String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        String body = response.getBody();
        assertTrue(body.contains("plain-skill"));
        // Metadata-only: the matched keyword itself must not leak into the response.
        assertFalse(body.contains("xylophone"));
    }

    @Test
    @DisplayName("view=open lists only open+published and is visible to a non-member")
    void openListing_visibleToNonMember_excludesDrafts() {
        persist("open-published", "team-a", "open", "published");
        persist("team-draft", "team-a", "team", "draft");
        persist("open-draft", "team-a", "open", "draft");

        // carol is not a member of team-a
        ResponseEntity<String> response = restTemplate.exchange(
            skillsUrl + "?view=open", HttpMethod.GET,
            new HttpEntity<>(headersFor("carol")), String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        String body = response.getBody();
        assertTrue(body.contains("open-published"));
        assertFalse(body.contains("team-draft"));
        assertFalse(body.contains("open-draft"));
    }

    @Test
    @DisplayName("search open scope excludes another team's draft, includes published-open")
    void search_openScope_excludesOtherTeamDraft() {
        persist("open-published", "team-a", "open", "published");
        persist("team-draft", "team-a", "team", "draft");

        ResponseEntity<String> response = restTemplate.exchange(
            searchUrl + "?q=searchable&scope=open", HttpMethod.GET,
            new HttpEntity<>(headersFor("carol")), String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        String body = response.getBody();
        assertTrue(body.contains("open-published"));
        assertFalse(body.contains("team-draft"));
    }
}
