package com.syab.documentediting.service;

import com.syab.documentediting.dto.DocumentChangeDTO;
import com.syab.documentediting.dto.DocumentDTO;
import com.syab.documentediting.dto.EditDocumentRequest;
import com.syab.documentediting.model.Document;
import com.syab.documentediting.model.DocumentChange;
import com.syab.documentediting.repository.DocumentChangeRepository;
import com.syab.documentediting.repository.DocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CompletableFuture;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentChangeRepository changeRepository;
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final Map<SseEmitter, Long> emitterToUser = new ConcurrentHashMap<>();
    private final Map<Long, Set<Long>> onlineUsers = new ConcurrentHashMap<>();

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

        // broadcast the change to SSE subscribers
        broadcastDocumentChange(documentId, convertToDTO(updatedDocument), convertChangeToDTO(change));

        return convertToDTO(updatedDocument);
    }

    public SseEmitter subscribeToDocument(Long documentId, Long userId) {
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        emitters.computeIfAbsent(documentId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitterToUser.put(emitter, userId);
        onlineUsers.computeIfAbsent(documentId, k -> ConcurrentHashMap.newKeySet()).add(userId);
        // broadcast updated presence
        broadcastPresence(documentId);

        emitter.onCompletion(() -> removeEmitter(documentId, emitter));
        emitter.onTimeout(() -> removeEmitter(documentId, emitter));
        emitter.onError((e) -> removeEmitter(documentId, emitter));

        // Optionally, send a welcome event with current document state
        try {
            DocumentDTO doc = getDocument(documentId);
            emitter.send(SseEmitter.event().name("init").data(doc));
        } catch (Exception e) {
            // ignore
        }

        return emitter;
    }

    private void removeEmitter(Long documentId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(documentId);
        if (list != null) {
            list.remove(emitter);
        }
        Long uid = emitterToUser.remove(emitter);
        if (uid != null) {
            Set<Long> users = onlineUsers.get(documentId);
            if (users != null) {
                // Check if any other emitter remains for this same user
                boolean stillHasEmitter = false;
                List<SseEmitter> remaining = emitters.get(documentId);
                if (remaining != null && !remaining.isEmpty()) {
                    for (SseEmitter e : remaining) {
                        Long u = emitterToUser.get(e);
                        if (u != null && u.equals(uid)) {
                            stillHasEmitter = true;
                            break;
                        }
                    }
                }
                if (!stillHasEmitter) {
                    users.remove(uid);
                }
                // if no more online users, remove set
                if (users.isEmpty()) onlineUsers.remove(documentId);
            }
            broadcastPresence(documentId);
        }
    }

    private void broadcastPresence(Long documentId) {
        List<SseEmitter> list = emitters.get(documentId);
        if (list == null) return;
        Set<Long> users = onlineUsers.get(documentId);
        List<Long> userList = users == null ? List.of() : List.copyOf(users);

        for (SseEmitter emitter : list) {
            CompletableFuture.runAsync(() -> {
                try {
                    emitter.send(SseEmitter.event().name("presence").data(userList));
                } catch (Exception e) {
                    removeEmitter(documentId, emitter);
                }
            });
        }
    }

    private void broadcastDocumentChange(Long documentId, DocumentDTO documentDTO, DocumentChangeDTO changeDTO) {
        List<SseEmitter> list = emitters.get(documentId);
        if (list == null) return;

        for (SseEmitter emitter : list) {
            CompletableFuture.runAsync(() -> {
                try {
                    var payload = Map.of("document", documentDTO, "change", changeDTO);
                    emitter.send(SseEmitter.event().name("document").data(payload));
                } catch (Exception e) {
                    removeEmitter(documentId, emitter);
                }
            });
        }
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

    public List<DocumentDTO> getSharedDocuments(Long userId) {
        // Return documents that are shared (isShared true) and not owned by the user
        List<Document> documents = documentRepository.findByIsSharedTrue();
        return documents.stream()
                .filter(d -> !d.getOwnerId().equals(userId))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private DocumentDTO convertToDTO(Document document) {
        return new DocumentDTO(
            document.getId(),
            document.getTitle(),
            document.getContent(),
            document.getOwnerId(),
            document.getIsShared(),
            document.getUpdatedAt() != null ? document.getUpdatedAt().toString() : null
        );
    }

    private DocumentChangeDTO convertChangeToDTO(DocumentChange change) {
        return new DocumentChangeDTO(change.getId(), change.getDocumentId(), change.getUserId(),
                change.getChangeContent(), change.getOperationType());
    }
}
