package com.syab.documentediting.controller;

import com.syab.documentediting.dto.DocumentChangeDTO;
import com.syab.documentediting.dto.DocumentDTO;
import com.syab.documentediting.dto.EditDocumentRequest;
import com.syab.documentediting.service.DocumentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {
    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    /**
     * Operation 1: Create a new document
     * POST /api/documents
     */
    @PostMapping
    public ResponseEntity<DocumentDTO> createDocument(
            @RequestParam String title,
            @RequestParam Long userId) {
        DocumentDTO document = documentService.createDocument(title, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(document);
    }

    /**
     * Operation 2: Edit an existing document
     * PUT /api/documents/{documentId}/edit
     */
    @PutMapping("/{documentId}/edit")
    public ResponseEntity<DocumentDTO> editDocument(
            @PathVariable Long documentId,
            @RequestParam Long userId,
            @Valid @RequestBody EditDocumentRequest request) {
        DocumentDTO document = documentService.editDocument(documentId, userId, request);
        return ResponseEntity.ok(document);
    }

    /**
     * Operation 3: Get all changes for a document (Track changes in real-time)
     * GET /api/documents/{documentId}/changes
     */
    @GetMapping("/{documentId}/changes")
    public ResponseEntity<List<DocumentChangeDTO>> getDocumentChanges(@PathVariable Long documentId) {
        List<DocumentChangeDTO> changes = documentService.getDocumentChanges(documentId);
        return ResponseEntity.ok(changes);
    }

    /**
     * Get a specific document
     * GET /api/documents/{documentId}
     */
    @GetMapping("/{documentId}")
    public ResponseEntity<DocumentDTO> getDocument(@PathVariable Long documentId) {
        DocumentDTO document = documentService.getDocument(documentId);
        return ResponseEntity.ok(document);
    }

    /**
     * Get all documents for a user
     * GET /api/documents/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DocumentDTO>> getUserDocuments(@PathVariable Long userId) {
        List<DocumentDTO> documents = documentService.getUserDocuments(userId);
        return ResponseEntity.ok(documents);
    }

    /**
     * Get all shared documents (documents shared by others) for this user
     * GET /api/documents/shared/{userId}
     */
    @GetMapping("/shared/{userId}")
    public ResponseEntity<List<DocumentDTO>> getSharedDocuments(@PathVariable Long userId) {
        List<DocumentDTO> documents = documentService.getSharedDocuments(userId);
        return ResponseEntity.ok(documents);
    }

    /**
     * SSE stream: Subscribe to document changes/events
     * GET /api/documents/{documentId}/stream
     */
    @GetMapping("/{documentId}/stream")
    public SseEmitter streamDocument(@PathVariable Long documentId, @RequestParam(required = false) Long userId) {
        return documentService.subscribeToDocument(documentId, userId);
    }
}
