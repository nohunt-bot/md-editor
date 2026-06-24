package com.company.skillmd.folder;

import com.company.skillmd.folder.FolderService.FolderNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping("/tree")
    public ResponseEntity<List<FolderNode>> getFolderTree() {
        return ResponseEntity.ok(folderService.getFolderTree());
    }

    @PostMapping
    public ResponseEntity<Folder> createFolder(@RequestBody CreateFolderRequest request) {
        Folder folder = folderService.createFolder(request.name(), request.parentId(), request.ownerId());
        return ResponseEntity.ok(folder);
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<Folder> moveFolder(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String newParentId = body.get("parentId");
        Folder moved = folderService.moveFolder(id, newParentId);
        return ResponseEntity.ok(moved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(@PathVariable String id) {
        folderService.deleteFolder(id);
        return ResponseEntity.ok().build();
    }

    public record CreateFolderRequest(String name, String parentId, String ownerId) {}
}
