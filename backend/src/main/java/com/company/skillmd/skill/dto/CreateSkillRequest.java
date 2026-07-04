package com.company.skillmd.skill.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateSkillRequest(
    @NotBlank String name,
    String displayName,
    String description,
    @NotBlank String content,
    @NotBlank String teamId,
    String folderId,
    List<String> tags,
    List<ReferenceDTO> references,
    List<PrerequisiteDTO> prerequisites
) {
    public record ReferenceDTO(String skillId, String relation) {}
    public record PrerequisiteDTO(String skillId, String note) {}
}
