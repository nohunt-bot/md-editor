package com.company.skillmd.folder;

import com.company.skillmd.folder.FolderService.FolderNode;
import com.company.skillmd.folder.FolderService.FolderResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping("/tree")
    public ResponseEntity<List<FolderNode>> getTree(@RequestParam String teamId) {
        return ResponseEntity.ok(folderService.getFolderTree(teamId));
    }

    @GetMapping
    public ResponseEntity<List<FolderResponse>> list(@RequestParam String teamId) {
        return ResponseEntity.ok(folderService.listFolders(teamId));
    }

    @PostMapping
    public ResponseEntity<FolderResponse> create(@RequestBody CreateFolderRequest request) {
        return ResponseEntity.ok(folderService.createFolder(request.name(), request.teamId(), request.parentId()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<FolderResponse> rename(
            @PathVariable String id,
            @RequestBody RenameFolderRequest request) {
        return ResponseEntity.ok(folderService.renameFolder(id, request.name()));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<FolderResponse> move(
            @PathVariable String id,
            @RequestBody MoveFolderRequest request) {
        return ResponseEntity.ok(folderService.moveFolder(id, request.parentId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        folderService.deleteFolder(id);
        return ResponseEntity.noContent().build();
    }

    public record CreateFolderRequest(String name, String teamId, String parentId) {}

    public record RenameFolderRequest(String name) {}

    public record MoveFolderRequest(String parentId) {}
}
