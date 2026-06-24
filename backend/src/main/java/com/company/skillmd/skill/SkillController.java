package com.company.skillmd.skill;

import com.company.skillmd.skill.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/skills")
public class SkillController {

    private final SkillService skillService;

    public SkillController(SkillService skillService) {
        this.skillService = skillService;
    }

    @PostMapping
    public ResponseEntity<SkillResponse> createSkill(
            @RequestBody CreateSkillRequest request,
            @RequestHeader("X-User-Id") String userId) {
        SkillResponse response = skillService.createSkill(request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<SkillResponse>> listSkills(Pageable pageable) {
        return ResponseEntity.ok(skillService.listSkills(pageable));
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
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSkill(@PathVariable String id) {
        skillService.deleteSkill(id);
        return ResponseEntity.ok().build();
    }
}
