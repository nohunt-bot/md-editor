package com.company.skillmd.version;

import com.company.skillmd.auth.AuthorizationService;
import com.company.skillmd.version.dto.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/skills/{skillId}/versions")
public class VersionController {

    private final VersionService versionService;
    private final AuthorizationService authorizationService;

    public VersionController(VersionService versionService, AuthorizationService authorizationService) {
        this.versionService = versionService;
        this.authorizationService = authorizationService;
    }

    @GetMapping
    public ResponseEntity<List<VersionResponse>> listVersions(@PathVariable String skillId) {
        List<VersionResponse> versions = versionService.getVersions(skillId).stream()
            .map(v -> new VersionResponse(
                v.getId(),
                v.getSkillId(),
                v.getVersion(),
                v.getCommitMessage(),
                v.getEditorId(),
                v.getCreatedAt()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(versions);
    }

    @GetMapping("/{version}")
    public ResponseEntity<VersionDetailResponse> getVersion(
            @PathVariable String skillId,
            @PathVariable Integer version) {
        return versionService.getVersion(skillId, version)
            .map(v -> ResponseEntity.ok(toDetailResponse(v)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{version}/restore")
    public ResponseEntity<Void> restoreVersion(
            @PathVariable String skillId,
            @PathVariable Integer version) {
        // Identity from the auth abstraction (not a client-supplied header);
        // VersionService enforces editor rights on the skill's team.
        String userId = authorizationService.currentUser().getUserId();
        versionService.restoreToVersion(skillId, version, userId);
        return ResponseEntity.ok().build();
    }

    private VersionDetailResponse toDetailResponse(SkillVersion v) {
        return new VersionDetailResponse(
            v.getId(),
            v.getSkillId(),
            v.getVersion(),
            new VersionDetailResponse.SnapshotData(
                v.getSnapshot().getName(),
                v.getSnapshot().getDisplayName(),
                v.getSnapshot().getDescription(),
                v.getSnapshot().getContent(),
                v.getSnapshot().getFolderId(),
                v.getSnapshot().getTags()
            ),
            v.getCommitMessage(),
            v.getEditorId(),
            v.getCreatedAt()
        );
    }
}
