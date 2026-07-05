package com.company.skillmd.skill;

import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.*;
import java.time.Instant;
import java.util.List;

@Document(collection = "skills")
@CompoundIndexes({
    @CompoundIndex(name = "teamId_name_unique", def = "{'teamId': 1, 'name': 1}", unique = true),
    @CompoundIndex(name = "scope_status_publishedAt", def = "{'scope': 1, 'status': 1, 'publishedAt': -1}"),
    @CompoundIndex(name = "teamId_folderId", def = "{'teamId': 1, 'folderId': 1}")
})
public class Skill {

    @Id
    private String id;

    @TextIndexed
    private String name;

    @TextIndexed
    private String displayName;

    @TextIndexed
    private String description;

    private String content;
    private String teamId;
    private String scope;
    private String status;
    private Instant publishedAt;
    private String sourceSkillId;
    private String folderId;

    @TextIndexed
    private List<String> tags;
    private List<SkillReference> references;
    private List<SkillPrerequisite> prerequisites;
    private Integer currentVersion;

    @CreatedBy
    private String authorId;

    @LastModifiedBy
    private String lastEditorId;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    private Instant deletedAt;

    // Phase B (v2): publish freeze — snapshot of the content as of the last
    // publish. Non-members read this, never the live fields. See
    // docs/decisions/20260705-publish-freeze-embedded-snapshot.md.
    private Integer publishedVersion;
    private PublishedSnapshot publishedSnapshot;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }

    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }

    public String getSourceSkillId() { return sourceSkillId; }
    public void setSourceSkillId(String sourceSkillId) { this.sourceSkillId = sourceSkillId; }

    public String getFolderId() { return folderId; }
    public void setFolderId(String folderId) { this.folderId = folderId; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public List<SkillReference> getReferences() { return references; }
    public void setReferences(List<SkillReference> references) { this.references = references; }

    public List<SkillPrerequisite> getPrerequisites() { return prerequisites; }
    public void setPrerequisites(List<SkillPrerequisite> prerequisites) { this.prerequisites = prerequisites; }

    public Integer getCurrentVersion() { return currentVersion; }
    public void setCurrentVersion(Integer currentVersion) { this.currentVersion = currentVersion; }

    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }

    public String getLastEditorId() { return lastEditorId; }
    public void setLastEditorId(String lastEditorId) { this.lastEditorId = lastEditorId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }

    public Integer getPublishedVersion() { return publishedVersion; }
    public void setPublishedVersion(Integer publishedVersion) { this.publishedVersion = publishedVersion; }

    public PublishedSnapshot getPublishedSnapshot() { return publishedSnapshot; }
    public void setPublishedSnapshot(PublishedSnapshot publishedSnapshot) { this.publishedSnapshot = publishedSnapshot; }

    /** Frozen copy of the publish-time content (Phase B v2). */
    public static class PublishedSnapshot {
        private String displayName;
        private String description;
        private String content;
        private List<String> tags;
        private Integer version;

        public static PublishedSnapshot of(Skill s) {
            PublishedSnapshot snap = new PublishedSnapshot();
            snap.displayName = s.getDisplayName();
            snap.description = s.getDescription();
            snap.content = s.getContent();
            snap.tags = s.getTags();
            snap.version = s.getCurrentVersion();
            return snap;
        }

        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }

        public List<String> getTags() { return tags; }
        public void setTags(List<String> tags) { this.tags = tags; }

        public Integer getVersion() { return version; }
        public void setVersion(Integer version) { this.version = version; }
    }

    public static class SkillReference {
        private String skillId;
        private String relation; // "depends_on", "related", "extends"

        public String getSkillId() { return skillId; }
        public void setSkillId(String skillId) { this.skillId = skillId; }

        public String getRelation() { return relation; }
        public void setRelation(String relation) { this.relation = relation; }
    }

    public static class SkillPrerequisite {
        private String skillId;
        private String note;

        public String getSkillId() { return skillId; }
        public void setSkillId(String skillId) { this.skillId = skillId; }

        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }
}
