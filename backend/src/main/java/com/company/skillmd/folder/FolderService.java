package com.company.skillmd.folder;

import com.company.skillmd.skill.SkillRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class FolderService {

    private final FolderRepository folderRepository;
    private final SkillRepository skillRepository;

    public FolderService(FolderRepository folderRepository, SkillRepository skillRepository) {
        this.folderRepository = folderRepository;
        this.skillRepository = skillRepository;
    }

    public FolderResponse createFolder(String name, String teamId, String parentId) {
        name = validateName(name);
        if (teamId == null || teamId.isBlank()) {
            throw new IllegalArgumentException("teamId is required");
        }
        if (isDuplicateName(teamId, name, parentId)) {
            throw new IllegalArgumentException("A folder named '" + name + "' already exists here");
        }
        if (parentId != null) {
            folderRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Parent folder not found: " + parentId));
        }
        Folder folder = new Folder();
        folder.setName(name);
        folder.setTeamId(teamId);
        folder.setParentId(parentId);
        return toResponse(folderRepository.save(folder));
    }

    public FolderResponse renameFolder(String id, String newName) {
        newName = validateName(newName);
        Folder folder = findById(id);
        if (!folder.getName().equals(newName) && isDuplicateName(folder.getTeamId(), newName, folder.getParentId())) {
            throw new IllegalArgumentException("A folder named '" + newName + "' already exists here");
        }
        folder.setName(newName);
        return toResponse(folderRepository.save(folder));
    }

    public FolderResponse moveFolder(String id, String newParentId) {
        Folder folder = findById(id);
        if (id.equals(newParentId)) {
            throw new IllegalArgumentException("Cannot move a folder into itself");
        }
        if (newParentId != null) {
            folderRepository.findById(newParentId)
                .orElseThrow(() -> new RuntimeException("Target folder not found: " + newParentId));
            if (isDescendant(newParentId, id)) {
                throw new IllegalArgumentException("Cannot move a folder into its own descendant");
            }
        }
        folder.setParentId(newParentId);
        return toResponse(folderRepository.save(folder));
    }

    public void deleteFolder(String id) {
        findById(id);
        if (!folderRepository.findByParentId(id).isEmpty()) {
            throw new IllegalStateException("Cannot delete a folder that contains subfolders");
        }
        if (!skillRepository.findByFolderId(id).isEmpty()) {
            throw new IllegalStateException("Cannot delete a folder that contains skills");
        }
        folderRepository.deleteById(id);
    }

    public List<FolderResponse> listFolders() {
        return folderRepository.findAll().stream()
            .map(this::toResponse)
            .toList();
    }

    public List<FolderNode> getFolderTree() {
        List<Folder> all = folderRepository.findAll();
        return buildTree(all, null);
    }

    private List<FolderNode> buildTree(List<Folder> all, String parentId) {
        return all.stream()
            .filter(f -> parentId == null ? f.getParentId() == null : parentId.equals(f.getParentId()))
            .map(f -> new FolderNode(f.getId(), f.getName(), f.getParentId(), buildTree(all, f.getId())))
            .toList();
    }

    private boolean isDuplicateName(String teamId, String name, String parentId) {
        return parentId == null
            ? folderRepository.existsByTeamIdAndNameAndParentIdIsNull(teamId, name)
            : folderRepository.existsByTeamIdAndNameAndParentId(teamId, name, parentId);
    }

    // Returns true if targetId is a descendant of ancestorId
    private boolean isDescendant(String targetId, String ancestorId) {
        Folder current = folderRepository.findById(targetId).orElse(null);
        while (current != null && current.getParentId() != null) {
            if (current.getParentId().equals(ancestorId)) return true;
            current = folderRepository.findById(current.getParentId()).orElse(null);
        }
        return false;
    }

    private Folder findById(String id) {
        return folderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Folder not found: " + id));
    }

    private String validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Folder name cannot be empty");
        }
        return name.trim();
    }

    private FolderResponse toResponse(Folder folder) {
        return new FolderResponse(folder.getId(), folder.getName(), folder.getTeamId(), folder.getParentId(),
            folder.getCreatedAt(), folder.getUpdatedAt());
    }

    public record FolderResponse(String id, String name, String teamId, String parentId,
                                 java.time.Instant createdAt, java.time.Instant updatedAt) {}

    public record FolderNode(String id, String name, String parentId, List<FolderNode> children) {}
}
