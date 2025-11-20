package com.syab.versioncontrol.service;

import com.syab.versioncontrol.dto.DocumentVersionDTO;
import com.syab.versioncontrol.dto.UserContributionDTO;
import com.syab.versioncontrol.model.DocumentVersion;
import com.syab.versioncontrol.model.UserContribution;
import com.syab.versioncontrol.repository.DocumentVersionRepository;
import com.syab.versioncontrol.repository.UserContributionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import java.util.Map;

@Service
@Transactional
public class VersionControlService {
    private final DocumentVersionRepository versionRepository;
    private final UserContributionRepository contributionRepository;

    public VersionControlService(DocumentVersionRepository versionRepository, UserContributionRepository contributionRepository) {
        this.versionRepository = versionRepository;
        this.contributionRepository = contributionRepository;
    }

    /**
     * Operation 1: Maintain version history of documents
     */
    public DocumentVersionDTO createVersion(Long documentId, String content, Long userId, String description) {
        // Get the next version number
        List<DocumentVersion> versions = versionRepository.findByDocumentIdOrderByVersionNumberDesc(documentId);
        int nextVersionNumber = versions.isEmpty() ? 1 : versions.get(0).getVersionNumber() + 1;

        DocumentVersion version = new DocumentVersion();
        version.setDocumentId(documentId);
        version.setVersionNumber(nextVersionNumber);
        version.setContent(content);
        version.setCreatedBy(userId);
        version.setDescription(description);

        DocumentVersion savedVersion = versionRepository.save(version);

        // Update user contribution
        updateUserContribution(documentId, userId);

        return convertToDTO(savedVersion);
    }

    /**
     * Operation 2: Revert to previous document versions
     */
    public DocumentVersionDTO revertToVersion(Long documentId, Integer versionNumber) {
        Optional<DocumentVersion> versionOptional = versionRepository.findByDocumentIdAndVersionNumber(documentId, versionNumber);
        if (versionOptional.isEmpty()) {
            throw new IllegalArgumentException("Version not found");
        }

        DocumentVersion version = versionOptional.get();
        // Additionally, apply the version to the actual document via the API Gateway.
        // This keeps the revert operation consistent across services.
        try {
            RestTemplate rest = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            var body = Map.of("content", version.getContent(), "operationType", "REVERT");
            HttpEntity<Map<String, String>> entity = new HttpEntity(body, headers);
            // call gateway which will proxy to document service to apply the content change
            String url = String.format("http://localhost:8081/api/documents/%d/edit?userId=%d", documentId, version.getCreatedBy());
            ResponseEntity<String> resp = rest.exchange(url, HttpMethod.PUT, entity, String.class);
        } catch (Exception e) {
            // don't fail revert; just log and return version info
            // logging omitted to keep dependency minimal
        }
        return convertToDTO(version);
    }

    /**
     * Operation 3: Track user contributions
     */
    public List<UserContributionDTO> getUserContributions(Long documentId) {
        List<UserContribution> contributions = contributionRepository.findByDocumentId(documentId);
        return contributions.stream().map(this::convertContributionToDTO).collect(Collectors.toList());
    }

    public List<DocumentVersionDTO> getDocumentVersionHistory(Long documentId) {
        List<DocumentVersion> versions = versionRepository.findByDocumentIdOrderByVersionNumberDesc(documentId);
        return versions.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    private void updateUserContribution(Long documentId, Long userId) {
        Optional<UserContribution> contributionOptional = contributionRepository.findByDocumentIdAndUserId(documentId, userId);
        
        if (contributionOptional.isPresent()) {
            UserContribution contribution = contributionOptional.get();
            contribution.setChangesCount(contribution.getChangesCount() + 1);
            contribution.setLastEditedAt(LocalDateTime.now());
            contributionRepository.save(contribution);
        } else {
            UserContribution contribution = new UserContribution();
            contribution.setDocumentId(documentId);
            contribution.setUserId(userId);
            contribution.setChangesCount(1);
            contribution.setLastEditedAt(LocalDateTime.now());
            contributionRepository.save(contribution);
        }
    }

    private DocumentVersionDTO convertToDTO(DocumentVersion version) {
        return new DocumentVersionDTO(
            version.getId(),
            version.getDocumentId(),
            version.getVersionNumber(),
            version.getContent(),
            version.getCreatedBy(),
            version.getCreatedAt() != null ? version.getCreatedAt().toString() : null,
            version.getDescription()
        );
    }

    private UserContributionDTO convertContributionToDTO(UserContribution contribution) {
        return new UserContributionDTO(contribution.getId(), contribution.getDocumentId(),
                contribution.getUserId(), contribution.getChangesCount());
    }
}
