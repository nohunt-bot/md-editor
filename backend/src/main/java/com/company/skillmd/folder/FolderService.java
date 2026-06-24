package com.company.skillmd.folder;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class FolderService {

    private final FolderRepository folderRepository;

    public FolderService(FolderRepository folderRepository) {
        this.folderRepository = folderRepository;
    }

    public Folder createFolder(String name, String parentId, String ownerId) {
        Folder folder = new Folder();
        folder.setName(name);
        folder.setParentId(parentId);
        folder.setOwnerId(ownerId);
        
        // Build path
        if (parentId == null) {
            folder.setPath("/" + name);
        } else {
            Folder parent = folderRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Parent folder not found: " + parentId));
            folder.setPath(parent.getPath() + "/" + name);
        }
        
        return folderRepository.save(folder);
    }

    public List<Folder> getRootFolders() {
        return folderRepository.findByParentIdNull();
    }

    public List<Folder> getSubfolders(String parentId) {
        return folderRepository.findByParentId(parentId);
    }

    public Folder moveFolder(String folderId, String newParentId) {
        Folder folder = folderRepository.findById(folderId)
            .orElseThrow(() -> new RuntimeException("Folder not found: " + folderId));
        
        folder.setParentId(newParentId);
        
        // Update path
        if (newParentId == null) {
            folder.setPath("/" + folder.getName());
        } else {
            Folder parent = folderRepository.findById(newParentId)
                .orElseThrow(() -> new RuntimeException("Parent folder not found: " + newParentId));
            folder.setPath(parent.getPath() + "/" + folder.getName());
        }
        
        return folderRepository.save(folder);
    }

    public void deleteFolder(String folderId) {
        // TODO: Check if folder contains skills
        folderRepository.deleteById(folderId);
    }

    public List<FolderNode> getFolderTree() {
        List<Folder> allFolders = folderRepository.findAll();
        return buildTree(allFolders, null);
    }

    private List<FolderNode> buildTree(List<Folder> allFolders, String parentId) {
        return allFolders.stream()
            .filter(f -> (parentId == null && f.getParentId() == null) || 
                         (parentId != null && parentId.equals(f.getParentId())))
            .map(f -> new FolderNode(
                f.getId(),
                f.getName(),
                f.getPath(),
                buildTree(allFolders, f.getId())
            ))
            .toList();
    }

    public record FolderNode(String id, String name, String path, List<FolderNode> children) {}
}
