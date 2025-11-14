package com.syab.versioncontrol.service;

import com.syab.versioncontrol.dto.DocumentVersionDTO;
import com.syab.versioncontrol.dto.UserContributionDTO;
import com.syab.versioncontrol.model.DocumentVersion;
import com.syab.versioncontrol.model.UserContribution;
import com.syab.versioncontrol.repository.DocumentVersionRepository;
import com.syab.versioncontrol.repository.UserContributionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VersionControlServiceTest {
    @Mock
    private DocumentVersionRepository versionRepository;

    @Mock
    private UserContributionRepository contributionRepository;

    @InjectMocks
    private VersionControlService versionControlService;

    private DocumentVersion version;
    private UserContribution contribution;

    @BeforeEach
    void setUp() {
        version = new DocumentVersion(1L, 1L, 1, "Content v1", 1L, LocalDateTime.now(), "Initial version");
        contribution = new UserContribution(1L, 1L, 1L, 5, LocalDateTime.now());
    }

    @Test
    void testCreateVersionSuccess() {
        when(versionRepository.findByDocumentIdOrderByVersionNumberDesc(1L)).thenReturn(Arrays.asList());
        when(versionRepository.save(any(DocumentVersion.class))).thenReturn(version);
        when(contributionRepository.findByDocumentIdAndUserId(1L, 1L)).thenReturn(Optional.empty());
        when(contributionRepository.save(any(UserContribution.class))).thenReturn(contribution);

        DocumentVersionDTO result = versionControlService.createVersion(1L, "Content v1", 1L, "Initial version");

        assertNotNull(result);
        assertEquals(1, result.getVersionNumber());
        verify(versionRepository, times(1)).save(any(DocumentVersion.class));
    }

    @Test
    void testRevertToVersionSuccess() {
        when(versionRepository.findByDocumentIdAndVersionNumber(1L, 1)).thenReturn(Optional.of(version));

        DocumentVersionDTO result = versionControlService.revertToVersion(1L, 1);

        assertNotNull(result);
        assertEquals(1, result.getVersionNumber());
        assertEquals("Content v1", result.getContent());
    }

    @Test
    void testRevertToVersionNotFound() {
        when(versionRepository.findByDocumentIdAndVersionNumber(1L, 1)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> versionControlService.revertToVersion(1L, 1));
    }

    @Test
    void testGetUserContributionsSuccess() {
        List<UserContribution> contributions = Arrays.asList(contribution);
        
        when(contributionRepository.findByDocumentId(1L)).thenReturn(contributions);

        List<UserContributionDTO> result = versionControlService.getUserContributions(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(5, result.get(0).getChangesCount());
    }

    @Test
    void testGetDocumentVersionHistorySuccess() {
        List<DocumentVersion> versions = Arrays.asList(version);
        
        when(versionRepository.findByDocumentIdOrderByVersionNumberDesc(1L)).thenReturn(versions);

        List<DocumentVersionDTO> result = versionControlService.getDocumentVersionHistory(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
    }
}
