package com.company.skillmd.version;

import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.*;
import java.time.Instant;
import java.util.Map;

@Document(collection = "skill_versions")
public class SkillVersion {

    @Id
    private String id;

    private String skillId;
    private Integer version;
    private VersionSnapshot snapshot;
    private String commitMessage;
    private String editorId;

    @CreatedDate
    private Instant createdAt;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSkillId() { return skillId; }
    public void setSkillId(String skillId) { this.skillId = skillId; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }

    public VersionSnapshot getSnapshot() { return snapshot; }
    public void setSnapshot(VersionSnapshot snapshot) { this.snapshot = snapshot; }

    public String getCommitMessage() { return commitMessage; }
    public void setCommitMessage(String commitMessage) { this.commitMessage = commitMessage; }

    public String getEditorId() { return editorId; }
    public void setEditorId(String editorId) { this.editorId = editorId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public static class VersionSnapshot {
        private String name;
        private String displayName;
        private String description;
        private String content;
        private String folderId;
        private java.util.List<String> tags;

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

        public java.util.List<String> getTags() { return tags; }
        public void setTags(java.util.List<String> tags) { this.tags = tags; }
    }
}
