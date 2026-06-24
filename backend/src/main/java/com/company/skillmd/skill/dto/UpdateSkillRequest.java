package com.company.skillmd.skill.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record UpdateSkillRequest(
    String name,
    String displayName,
    String description,
    String content,
    String folderId,
    List<String> tags,
    List<ReferenceDTO> references,
    List<PrerequisiteDTO> prerequisites,
    String commitMessage
) {
    public record ReferenceDTO(String skillId, String relation) {}
    public record PrerequisiteDTO(String skillId, String note) {}
}
