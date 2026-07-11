package com.company.skillmd.auth;

import com.company.skillmd.AbstractIntegrationTest;
import com.company.skillmd.skill.Skill;
import com.company.skillmd.skill.SkillRepository;
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
 * T1-4: favorites + recently viewed. Dev users (application.yml): alice
 * (team-a EDITOR), bob (team-a VIEWER), carol (team-b EDITOR), admin.
 */
class FavoritesIntegrationTest extends AbstractIntegrationTest {

    @LocalServerPort
    private Integer port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private SkillRepository skillRepository;

    @Autowired
    private UserPreferencesRepository preferencesRepository;

    private String favoritesUrl;
    private String recentUrl;

    @BeforeEach
    void setUp() {
        favoritesUrl = "http://localhost:" + port + "/api/me/favorites";
        recentUrl = "http://localhost:" + port + "/api/me/recent";
        skillRepository.deleteAll();
        preferencesRepository.deleteAll();
    }

    private HttpHeaders headersFor(String devUser) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Dev-User", devUser);
        return headers;
    }

    private String persist(String name, String teamId, String scope, String status) {
        Skill skill = new Skill();
        skill.setName(name);
        skill.setDisplayName(name);
        skill.setDescription("desc for " + name);
        skill.setContent("# secret content that must never leak");
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
        return skillRepository.save(skill).getId();
    }

    @Test
    @DisplayName("add / remove / list favorites round-trips, metadata-only (no content), idempotent")
    void addRemoveListFavorites() {
        String id = persist("deploy-guide", "team-a", "team", "draft");

        // Add as alice (team-a member)
        ResponseEntity<String> add = restTemplate.exchange(
            favoritesUrl + "/" + id, HttpMethod.PUT, new HttpEntity<>(headersFor("alice")), String.class);
        assertEquals(HttpStatus.OK, add.getStatusCode());

        // Idempotent re-add
        ResponseEntity<String> addAgain = restTemplate.exchange(
            favoritesUrl + "/" + id, HttpMethod.PUT, new HttpEntity<>(headersFor("alice")), String.class);
        assertEquals(HttpStatus.OK, addAgain.getStatusCode());
        assertEquals(1, preferencesRepository.findById("alice").orElseThrow().getFavoriteSkillIds().size());

        ResponseEntity<String> list = restTemplate.exchange(
            favoritesUrl, HttpMethod.GET, new HttpEntity<>(headersFor("alice")), String.class);
        assertEquals(HttpStatus.OK, list.getStatusCode());
        assertTrue(list.getBody().contains("deploy-guide"));
        // Metadata-only: content must never leak.
        assertFalse(list.getBody().contains("secret content"));

        // Remove — idempotent, 200 even called twice.
        ResponseEntity<String> remove = restTemplate.exchange(
            favoritesUrl + "/" + id, HttpMethod.DELETE, new HttpEntity<>(headersFor("alice")), String.class);
        assertEquals(HttpStatus.OK, remove.getStatusCode());
        ResponseEntity<String> removeAgain = restTemplate.exchange(
            favoritesUrl + "/" + id, HttpMethod.DELETE, new HttpEntity<>(headersFor("alice")), String.class);
        assertEquals(HttpStatus.OK, removeAgain.getStatusCode());

        ResponseEntity<String> afterRemove = restTemplate.exchange(
            favoritesUrl, HttpMethod.GET, new HttpEntity<>(headersFor("alice")), String.class);
        assertFalse(afterRemove.getBody().contains("deploy-guide"));
    }

    @Test
    @DisplayName("adding a non-visible skill returns 404")
    void addFavorite_notVisible_returns404() {
        // team-a draft, private — carol is not a member of team-a.
        String id = persist("team-a-draft", "team-a", "team", "draft");

        ResponseEntity<String> response = restTemplate.exchange(
            favoritesUrl + "/" + id, HttpMethod.PUT, new HttpEntity<>(headersFor("carol")), String.class);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());

        // Favoriting a nonexistent id is also 404.
        ResponseEntity<String> missing = restTemplate.exchange(
            favoritesUrl + "/no-such-id", HttpMethod.PUT, new HttpEntity<>(headersFor("carol")), String.class);
        assertEquals(HttpStatus.NOT_FOUND, missing.getStatusCode());
    }

    @Test
    @DisplayName("list filters out a favorite that is later unpublished (no longer visible to a non-member)")
    void listFavorites_filtersOutNoLongerVisible() {
        // open+published in team-b, visible to non-member bob (team-a VIEWER only).
        String id = persist("open-doc", "team-b", "open", "published");

        ResponseEntity<String> add = restTemplate.exchange(
            favoritesUrl + "/" + id, HttpMethod.PUT, new HttpEntity<>(headersFor("bob")), String.class);
        assertEquals(HttpStatus.OK, add.getStatusCode());

        ResponseEntity<String> before = restTemplate.exchange(
            favoritesUrl, HttpMethod.GET, new HttpEntity<>(headersFor("bob")), String.class);
        assertTrue(before.getBody().contains("open-doc"));

        // Unpublish directly (no longer open+published, bob isn't a team-b member).
        Skill skill = skillRepository.findById(id).orElseThrow();
        skill.setStatus("draft");
        skillRepository.save(skill);

        ResponseEntity<String> after = restTemplate.exchange(
            favoritesUrl, HttpMethod.GET, new HttpEntity<>(headersFor("bob")), String.class);
        assertEquals(HttpStatus.OK, after.getStatusCode());
        assertFalse(after.getBody().contains("open-doc"), "unpublished skill should be filtered on read");

        // Stored list itself is untouched (filter-on-read, not rewrite-on-read).
        assertEquals(1, preferencesRepository.findById("bob").orElseThrow().getFavoriteSkillIds().size());
    }

    @Test
    @DisplayName("recent view history caps at 10, most-recent-first, and re-viewing dedupes to the front")
    void recentCapAndDedupe() {
        String[] ids = new String[12];
        for (int i = 0; i < 12; i++) {
            ids[i] = persist("skill-" + i, "team-a", "team", "draft");
        }

        HttpHeaders headers = headersFor("alice");
        for (String id : ids) {
            restTemplate.exchange(
                recentUrl + "/" + id, HttpMethod.POST, new HttpEntity<>(headers), String.class);
        }

        List<String> stored = preferencesRepository.findById("alice").orElseThrow().getRecentSkillIds();
        assertEquals(10, stored.size(), "capped at 10");
        // Most-recent-first: last posted (skill-11) is at the front, oldest two dropped.
        assertEquals(ids[11], stored.get(0));
        assertEquals(ids[2], stored.get(9));
        assertFalse(stored.contains(ids[0]));
        assertFalse(stored.contains(ids[1]));

        // Re-view an already-listed skill (skill-5) — moves to front, no duplicate.
        restTemplate.exchange(
            recentUrl + "/" + ids[5], HttpMethod.POST, new HttpEntity<>(headers), String.class);
        List<String> afterReview = preferencesRepository.findById("alice").orElseThrow().getRecentSkillIds();
        assertEquals(10, afterReview.size(), "still capped, no duplicate added");
        assertEquals(ids[5], afterReview.get(0));
        assertEquals(1, afterReview.stream().filter(id -> id.equals(ids[5])).count());

        ResponseEntity<String> list = restTemplate.exchange(
            recentUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertEquals(HttpStatus.OK, list.getStatusCode());
        assertTrue(list.getBody().contains("\"skill-5\""));
        // skill-5 (re-viewed) should now appear before skill-11 (the previous front).
        assertTrue(list.getBody().indexOf("\"skill-5\"") < list.getBody().indexOf("\"skill-11\""));
    }
}
