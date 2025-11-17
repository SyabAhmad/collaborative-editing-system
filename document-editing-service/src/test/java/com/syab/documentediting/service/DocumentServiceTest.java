package com.syab.documentediting.service;

import com.syab.documentediting.dto.DocumentChangeDTO;
import com.syab.documentediting.dto.DocumentDTO;
import com.syab.documentediting.dto.EditDocumentRequest;
import com.syab.documentediting.model.Document;
import com.syab.documentediting.model.DocumentChange;
import com.syab.documentediting.repository.DocumentChangeRepository;
import com.syab.documentediting.repository.DocumentRepository;
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
class DocumentServiceTest {
    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private DocumentChangeRepository changeRepository;

    @Mock
    private OTService otService;

    @InjectMocks
    private DocumentService documentService;

    private Document document;
    private DocumentChange change;

    @BeforeEach
    void setUp() {
        document = new Document(1L, "Test Doc", "Content", 1L, LocalDateTime.now(), LocalDateTime.now(), false);
        change = new DocumentChange(1L, 1L, 1L, "Updated content", "UPDATE", LocalDateTime.now());
    }

    @Test
    void testCreateDocumentSuccess() {
        when(documentRepository.save(any(Document.class))).thenReturn(document);

        DocumentDTO result = documentService.createDocument("Test Doc", 1L);

        assertNotNull(result);
        assertEquals("Test Doc", result.getTitle());
        assertEquals(1L, result.getOwnerId());
        verify(documentRepository, times(1)).save(any(Document.class));
    }

    @Test
    void testEditDocumentSuccess() {
        EditDocumentRequest request = new EditDocumentRequest("Updated content", "UPDATE");
        
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document));
        when(documentRepository.save(any(Document.class))).thenReturn(document);
        when(changeRepository.save(any(DocumentChange.class))).thenReturn(change);

        DocumentDTO result = documentService.editDocument(1L, 1L, request);

        assertNotNull(result);
        verify(documentRepository, times(1)).save(any(Document.class));
        verify(changeRepository, times(1)).save(any(DocumentChange.class));
    }

    @Test
    void testEditDocumentNotFound() {
        EditDocumentRequest request = new EditDocumentRequest("Updated content", "UPDATE");
        when(documentRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> documentService.editDocument(1L, 1L, request));
    }

    @Test
    void testGetDocumentChangesSuccess() {
        List<DocumentChange> changes = Arrays.asList(change);
        
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document));
        when(changeRepository.findByDocumentId(1L)).thenReturn(changes);

        List<DocumentChangeDTO> result = documentService.getDocumentChanges(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Updated content", result.get(0).getChangeContent());
    }

    @Test
    void testGetDocumentSuccess() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(document));
        when(otService.getDocumentContent(1L)).thenReturn("Content");

        DocumentDTO result = documentService.getDocument(1L);

        assertNotNull(result);
        assertEquals("Test Doc", result.getTitle());
    }

    @Test
    void testGetUserDocumentsSuccess() {
        List<Document> documents = Arrays.asList(document);
        
        when(documentRepository.findByOwnerId(1L)).thenReturn(documents);

        List<DocumentDTO> result = documentService.getUserDocuments(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
    }
}
