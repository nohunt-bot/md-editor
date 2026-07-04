package com.company.skillmd.skill;

import com.company.skillmd.auth.AuthorizationService;
import com.company.skillmd.skill.dto.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/skills")
public class SkillController {

    private final SkillService skillService;
    private final AuthorizationService authorizationService;

    public SkillController(SkillService skillService, AuthorizationService authorizationService) {
        this.skillService = skillService;
        this.authorizationService = authorizationService;
    }

    @PostMapping
    public ResponseEntity<SkillResponse> createSkill(
            @Valid @RequestBody CreateSkillRequest request,
            @RequestHeader("X-User-Id") String userId) {
        SkillResponse response = skillService.createSkill(request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<SkillResponse>> listSkills(
            @RequestParam String teamId,
            Pageable pageable) {
        return ResponseEntity.ok(skillService.listSkills(teamId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SkillResponse> getSkill(@PathVariable String id) {
        return skillService.getSkill(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SkillResponse> updateSkill(
            @PathVariable String id,
            @RequestBody UpdateSkillRequest request,
            @RequestHeader("X-User-Id") String userId) {
        try {
            SkillResponse response = skillService.updateSkill(id, request, userId);
            return ResponseEntity.ok(response);
        } catch (OptimisticLockingConflictException e) {
            throw e;
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSkill(@PathVariable String id) {
        skillService.deleteSkill(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<SkillResponse> publishSkill(@PathVariable String id) {
        return ResponseEntity.ok(skillService.publishSkill(id));
    }

    @DeleteMapping("/{id}/publish")
    public ResponseEntity<SkillResponse> unpublishSkill(@PathVariable String id) {
        return ResponseEntity.ok(skillService.unpublishSkill(id));
    }

    @PostMapping("/{id}/copy-to-team")
    public ResponseEntity<SkillResponse> copyToTeam(
            @PathVariable String id,
            @RequestBody CopyToTeamRequest request) {
        String userId = authorizationService.currentUser().getUserId();
        SkillResponse response = skillService.copyToTeam(id, request.targetTeamId(), userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
