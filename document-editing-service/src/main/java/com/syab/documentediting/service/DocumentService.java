package com.syab.documentediting.service;

import com.syab.documentediting.dto.DocumentChangeDTO;
import com.syab.documentediting.dto.DocumentDTO;
import com.syab.documentediting.dto.EditDocumentRequest;
import com.syab.documentediting.model.Document;
import com.syab.documentediting.model.DocumentChange;
import com.syab.documentediting.repository.DocumentChangeRepository;
import com.syab.documentediting.repository.DocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentChangeRepository changeRepository;

    public DocumentService(DocumentRepository documentRepository, DocumentChangeRepository changeRepository) {
        this.documentRepository = documentRepository;
        this.changeRepository = changeRepository;
    }

    /**
     * Operation 1: Create a new document
     */
    public DocumentDTO createDocument(String title, Long ownerId) {
        Document document = new Document();
        document.setTitle(title);
        document.setContent("");
        document.setOwnerId(ownerId);
        document.setIsShared(false);

        Document savedDocument = documentRepository.save(document);
        return convertToDTO(savedDocument);
    }

    /**
     * Operation 2: Edit an existing document collaboratively and track changes
     */
    public DocumentDTO editDocument(Long documentId, Long userId, EditDocumentRequest request) {
        Optional<Document> documentOptional = documentRepository.findById(documentId);
        if (documentOptional.isEmpty()) {
            throw new IllegalArgumentException("Document not found");
        }

        Document document = documentOptional.get();
        
        // Update document content
        document.setContent(request.getContent());
        Document updatedDocument = documentRepository.save(document);

        // Track the change in real-time
        DocumentChange change = new DocumentChange();
        change.setDocumentId(documentId);
        change.setUserId(userId);
        change.setChangeContent(request.getContent());
        change.setOperationType(request.getOperationType());
        changeRepository.save(change);

        return convertToDTO(updatedDocument);
    }

    /**
     * Operation 3: Track changes in real-time (Get all changes for a document)
     */
    public List<DocumentChangeDTO> getDocumentChanges(Long documentId) {
        Optional<Document> document = documentRepository.findById(documentId);
        if (document.isEmpty()) {
            throw new IllegalArgumentException("Document not found");
        }

        List<DocumentChange> changes = changeRepository.findByDocumentId(documentId);
        return changes.stream().map(this::convertChangeToDTO).collect(Collectors.toList());
    }

    public DocumentDTO getDocument(Long documentId) {
        Optional<Document> document = documentRepository.findById(documentId);
        if (document.isEmpty()) {
            throw new IllegalArgumentException("Document not found");
        }
        return convertToDTO(document.get());
    }

    public List<DocumentDTO> getUserDocuments(Long userId) {
        List<Document> documents = documentRepository.findByOwnerId(userId);
        return documents.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    private DocumentDTO convertToDTO(Document document) {
        return new DocumentDTO(document.getId(), document.getTitle(), document.getContent(),
                document.getOwnerId(), document.getIsShared());
    }

    private DocumentChangeDTO convertChangeToDTO(DocumentChange change) {
        return new DocumentChangeDTO(change.getId(), change.getDocumentId(), change.getUserId(),
                change.getChangeContent(), change.getOperationType());
    }
}
