package com.company.skillmd.skill;

import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.*;
import java.time.Instant;
import java.util.List;

@Document(collection = "skills")
public class Skill {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    private String displayName;
    private String description;
    private String content;
    private String folderId;
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
