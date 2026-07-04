package com.company.skillmd.folder;

import com.company.skillmd.folder.FolderService.FolderResponse;
import com.company.skillmd.skill.SkillRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FolderServiceTest {

    @Mock
    private FolderRepository folderRepository;

    @Mock
    private SkillRepository skillRepository;

    private FolderService folderService;

    @BeforeEach
    void setUp() {
        folderService = new FolderService(folderRepository, skillRepository);
    }

    @Test
    @DisplayName("Same name allowed at same level across different teams")
    void createFolder_sameNameDifferentTeam_allowed() {
        // Arrange
        when(folderRepository.existsByTeamIdAndNameAndParentIdIsNull("team-b", "docs")).thenReturn(false);
        Folder saved = new Folder();
        saved.setId("f1");
        saved.setName("docs");
        saved.setTeamId("team-b");
        when(folderRepository.save(any(Folder.class))).thenReturn(saved);

        // Act
        FolderResponse response = folderService.createFolder("docs", "team-b", null);

        // Assert
        assertEquals("team-b", response.teamId());
        verify(folderRepository).existsByTeamIdAndNameAndParentIdIsNull("team-b", "docs");
    }

    @Test
    @DisplayName("Duplicate name at same level within same team throws")
    void createFolder_duplicateNameSameTeam_throws() {
        // Arrange
        when(folderRepository.existsByTeamIdAndNameAndParentIdIsNull("team-a", "docs")).thenReturn(true);

        // Act & Assert
        assertThrows(IllegalArgumentException.class,
            () -> folderService.createFolder("docs", "team-a", null));
    }

    @Test
    @DisplayName("teamId is required on create")
    void createFolder_missingTeamId_throws() {
        // Act & Assert
        assertThrows(IllegalArgumentException.class,
            () -> folderService.createFolder("docs", null, null));
    }
}
