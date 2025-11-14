package com.syab.versioncontrol.controller;

import com.syab.versioncontrol.dto.DocumentVersionDTO;
import com.syab.versioncontrol.dto.UserContributionDTO;
import com.syab.versioncontrol.service.VersionControlService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/versions")
public class VersionControlController {
    private final VersionControlService versionControlService;

    public VersionControlController(VersionControlService versionControlService) {
        this.versionControlService = versionControlService;
    }

    /**
     * Operation 1: Create a new version (maintain version history)
     * POST /api/versions
     */
    @PostMapping
    public ResponseEntity<DocumentVersionDTO> createVersion(
            @RequestParam Long documentId,
            @RequestParam Long userId,
            @RequestParam String content,
            @RequestParam(required = false) String description) {
        DocumentVersionDTO version = versionControlService.createVersion(documentId, content, userId, description);
        return ResponseEntity.status(HttpStatus.CREATED).body(version);
    }

    /**
     * Operation 2: Revert to a previous version
     * GET /api/versions/{documentId}/revert/{versionNumber}
     */
    @GetMapping("/{documentId}/revert/{versionNumber}")
    public ResponseEntity<DocumentVersionDTO> revertToVersion(
            @PathVariable Long documentId,
            @PathVariable Integer versionNumber) {
        DocumentVersionDTO version = versionControlService.revertToVersion(documentId, versionNumber);
        return ResponseEntity.ok(version);
    }

    /**
     * Operation 3: Get user contributions for a document
     * GET /api/versions/{documentId}/contributions
     */
    @GetMapping("/{documentId}/contributions")
    public ResponseEntity<List<UserContributionDTO>> getUserContributions(@PathVariable Long documentId) {
        List<UserContributionDTO> contributions = versionControlService.getUserContributions(documentId);
        return ResponseEntity.ok(contributions);
    }

    /**
     * Get document version history
     * GET /api/versions/{documentId}/history
     */
    @GetMapping("/{documentId}/history")
    public ResponseEntity<List<DocumentVersionDTO>> getVersionHistory(@PathVariable Long documentId) {
        List<DocumentVersionDTO> history = versionControlService.getDocumentVersionHistory(documentId);
        return ResponseEntity.ok(history);
    }
}
