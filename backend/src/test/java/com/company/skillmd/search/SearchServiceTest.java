package com.company.skillmd.search;

import com.company.skillmd.auth.AuthorizationService;
import com.company.skillmd.auth.CurrentUser;
import com.company.skillmd.auth.CurrentUserProvider;
import com.company.skillmd.auth.Role;
import com.company.skillmd.skill.Skill;
import com.company.skillmd.team.TeamService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private TeamService teamService;

    private SearchService serviceFor(CurrentUser user, List<Skill> hits) {
        CurrentUserProvider provider = () -> user;
        AuthorizationService auth = new AuthorizationService(provider);
        lenient().when(mongoTemplate.find(any(Query.class), eq(Skill.class))).thenReturn(hits);
        lenient().when(teamService.resolveDisplayNames(any())).thenReturn(Map.of("team-a", "Alpha", "team-b", "Beta"));
        return new SearchService(mongoTemplate, auth, teamService);
    }

    private Skill skill(String id, String teamId, String scope, String status) {
        Skill s = new Skill();
        s.setId(id);
        s.setName(id);
        s.setDisplayName(id);
        s.setDescription("desc");
        s.setTeamId(teamId);
        s.setScope(scope);
        s.setStatus(status);
        s.setTags(List.of("t"));
        s.setCurrentVersion(1);
        return s;
    }

    @Test
    @DisplayName("scope=team excludes other-team drafts")
    void teamScope_excludesOtherTeamDrafts() {
        CurrentUser bob = new CurrentUser("bob", "Bob", Map.of("team-a", Role.EDITOR), false);
        Skill mine = skill("mine", "team-a", "team", "draft");
        Skill others = skill("others", "team-b", "team", "draft");
        SearchService svc = serviceFor(bob, List.of(mine, others));

        SearchResponse res = svc.search("q", "team", null, 20);

        assertEquals(1, res.team().size());
        assertEquals("mine", res.team().get(0).id());
        assertTrue(res.open().isEmpty());
    }

    @Test
    @DisplayName("scope=open excludes unpublished skills")
    void openScope_excludesUnpublished() {
        CurrentUser carol = new CurrentUser("carol", "Carol", Map.of("team-b", Role.EDITOR), false);
        Skill published = skill("pub", "team-a", "open", "published");
        Skill openDraft = skill("openDraft", "team-a", "open", "draft");
        SearchService svc = serviceFor(carol, List.of(published, openDraft));

        SearchResponse res = svc.search("q", "open", null, 20);

        assertEquals(1, res.open().size());
        assertEquals("pub", res.open().get(0).id());
        assertTrue(res.team().isEmpty());
    }

    @Test
    @DisplayName("dedupe: own published-open skill appears under team only")
    void dedupe_ownPublishedOpen_underTeamOnly() {
        CurrentUser alice = new CurrentUser("alice", "Alice", Map.of("team-a", Role.EDITOR), false);
        Skill ownPublished = skill("own", "team-a", "open", "published");
        SearchService svc = serviceFor(alice, List.of(ownPublished));

        SearchResponse res = svc.search("q", "all", null, 20);

        assertEquals(1, res.team().size());
        assertEquals("own", res.team().get(0).id());
        assertTrue(res.open().isEmpty(), "own team's skill must not be duplicated into open");
    }

    @Test
    @DisplayName("all scope: non-member sees another team's published-open under open")
    void allScope_nonMemberSeesPublishedOpen() {
        CurrentUser carol = new CurrentUser("carol", "Carol", Map.of("team-b", Role.EDITOR), false);
        Skill otherPublished = skill("pub", "team-a", "open", "published");
        Skill otherDraft = skill("draft", "team-a", "team", "draft");
        SearchService svc = serviceFor(carol, List.of(otherPublished, otherDraft));

        SearchResponse res = svc.search("q", "all", null, 20);

        assertTrue(res.team().isEmpty());
        assertEquals(1, res.open().size());
        assertEquals("pub", res.open().get(0).id());
        assertEquals("Alpha", res.open().get(0).teamDisplayName());
    }
}
