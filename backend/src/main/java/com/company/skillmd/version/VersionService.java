package com.company.skillmd.version;

import com.company.skillmd.auth.AuthorizationService;
import com.company.skillmd.auth.ResourceNotFoundException;
import com.company.skillmd.skill.Skill;
import com.company.skillmd.skill.SkillRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class VersionService {

    private final SkillVersionRepository versionRepository;
    private final SkillRepository skillRepository;
    private final AuthorizationService authorizationService;

    public VersionService(SkillVersionRepository versionRepository, SkillRepository skillRepository,
                           AuthorizationService authorizationService) {
        this.versionRepository = versionRepository;
        this.skillRepository = skillRepository;
        this.authorizationService = authorizationService;
    }

    /**
     * Create a new version snapshot when skill is updated
     */
    public SkillVersion createVersion(Skill skill, String commitMessage, String editorId) {
        SkillVersion version = new SkillVersion();
        version.setSkillId(skill.getId());
        version.setVersion(skill.getCurrentVersion());
        
        SkillVersion.VersionSnapshot snapshot = new SkillVersion.VersionSnapshot();
        snapshot.setName(skill.getName());
        snapshot.setDisplayName(skill.getDisplayName());
        snapshot.setDescription(skill.getDescription());
        snapshot.setContent(skill.getContent());
        snapshot.setFolderId(skill.getFolderId());
        snapshot.setTags(skill.getTags());
        
        version.setSnapshot(snapshot);
        version.setCommitMessage(commitMessage != null ? commitMessage : "Version " + skill.getCurrentVersion());
        version.setEditorId(editorId);
        
        return versionRepository.save(version);
    }

    public List<SkillVersion> getVersions(String skillId) {
        Skill skill = requireSkill(skillId);
        authorizationService.requireResourceReadable(skill.getTeamId(), isOpenAndPublished(skill));
        return versionRepository.findBySkillIdOrderByVersionDesc(skillId);
    }

    public Optional<SkillVersion> getVersion(String skillId, Integer version) {
        Skill skill = requireSkill(skillId);
        authorizationService.requireResourceReadable(skill.getTeamId(), isOpenAndPublished(skill));
        return versionRepository.findBySkillIdAndVersion(skillId, version);
    }

    /**
     * Restore skill to a specific version (creates a new version with old content)
     */
    public Skill restoreToVersion(String skillId, Integer versionNumber, String userId) {
        Skill skill = requireSkill(skillId);
        authorizationService.requireResourceEditable(skill.getTeamId());

        SkillVersion oldVersion = versionRepository.findBySkillIdAndVersion(skillId, versionNumber)
            .orElseThrow(() -> new ResourceNotFoundException("Version not found: " + versionNumber));

        // Update skill with old version content
        skill.setName(oldVersion.getSnapshot().getName());
        skill.setDisplayName(oldVersion.getSnapshot().getDisplayName());
        skill.setDescription(oldVersion.getSnapshot().getDescription());
        skill.setContent(oldVersion.getSnapshot().getContent());
        skill.setFolderId(oldVersion.getSnapshot().getFolderId());
        skill.setTags(oldVersion.getSnapshot().getTags());
        skill.setCurrentVersion(skill.getCurrentVersion() + 1);
        skill.setLastEditorId(userId);
        
        Skill saved = skillRepository.save(skill);
        
        // Create new version for the restore
        createVersion(saved, "Restored to version " + versionNumber, userId);
        
        return saved;
    }

    private Skill requireSkill(String skillId) {
        return skillRepository.findById(skillId)
            .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + skillId));
    }

    private boolean isOpenAndPublished(Skill skill) {
        return "open".equals(skill.getScope()) && "published".equals(skill.getStatus());
    }
}
