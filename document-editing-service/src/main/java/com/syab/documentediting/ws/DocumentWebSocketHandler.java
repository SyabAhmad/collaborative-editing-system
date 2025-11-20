package com.syab.documentediting.ws;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.syab.documentediting.dto.DocumentChangeDTO;
import com.syab.documentediting.dto.DocumentDTO;
import com.syab.documentediting.dto.EditDocumentRequest;
import com.syab.documentediting.service.DocumentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Very small and simple WebSocket handler for document edits.
 * Accepts messages like: { "documentId": 1, "userId": 1, "content": "...", "operationType": "UPDATE" }
 */
@Component
public class DocumentWebSocketHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(DocumentWebSocketHandler.class);
    private final DocumentService documentService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // documentId -> sessions
    private final Map<Long, CopyOnWriteArrayList<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public DocumentWebSocketHandler(DocumentService documentService) {
        this.documentService = documentService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // extract documentId from query string
        URI uri = session.getUri();
        Long documentId = parseDocumentId(uri);
        Long userId = parseUserId(uri);
        log.info("WS connect request: sessionId={}, uri={}, documentId={}, userId={}", session.getId(), uri, documentId, userId);
        if (documentId == null) {
            log.warn("Missing documentId in WS connect for session={}. Closing.", session.getId());
            try { session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Missing documentId query param")); } catch (Exception e) { log.error("Failed to close session", e); }
            return;
        }
        sessions.computeIfAbsent(documentId, k -> new CopyOnWriteArrayList<>()).add(session);
        log.debug("WebSocket connected: docId={} sessionId={}", documentId, session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        URI uri = session.getUri();
        Long documentId = parseDocumentId(uri);
        if (documentId != null) {
            List<WebSocketSession> list = sessions.get(documentId);
            if (list != null) list.remove(session);
        }
        log.debug("WebSocket disconnected: docId={} sessionId={}", documentId, session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            log.debug("WS message from session {}: {}", session.getId(), message.getPayload());
            Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
            // Heartbeat support: respond to ping
            if ("ping".equals(payload.get("type"))) {
                session.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
                return;
            }

            Long documentId = payload.get("documentId") == null ? null : Long.valueOf(String.valueOf(payload.get("documentId")));
            Long userId = payload.get("userId") == null ? null : Long.valueOf(String.valueOf(payload.get("userId")));
            String content = (String) payload.get("content");
            String operationType = payload.getOrDefault("operationType", "UPDATE").toString();
            if (documentId == null || userId == null || content == null) return;

            // Persist the change and broadcast using service (SSE). Keep websocket echo minimal.
            EditDocumentRequest req = new EditDocumentRequest(content, operationType);
            DocumentDTO updated = documentService.editDocument(documentId, userId, req);

            // Construct change DTO (service saved via changeRepository internally)
            // Prepare payload
            var changeDTO = new DocumentChangeDTO(null, documentId, userId, content, operationType);
            var payloadOut = Map.of("document", updated, "change", changeDTO);

            String json = objectMapper.writeValueAsString(payloadOut);
            // Broadcast to sessions for this document, excluding sender
            List<WebSocketSession> list = sessions.get(documentId);
            if (list != null) {
                CompletableFuture.runAsync(() -> {
                    for (WebSocketSession s : list) {
                        if (!s.isOpen() || s.getId().equals(session.getId())) continue;
                        try {
                            s.sendMessage(new TextMessage(json));
                            log.debug("WS broadcast to session {}: {}", s.getId(), json);
                        } catch (Exception e) {
                            log.error("Failed to send ws message", e);
                        }
                    }
                });
            }
        } catch (Exception e) {
            log.error("ws handler error", e);
        }
    }

    private Long parseDocumentId(URI uri) {
        if (uri == null) return null;
        String query = uri.getQuery();
        if (query == null) return null;
        for (String part : query.split("&")) {
            String[] kv = part.split("=");
            if (kv.length == 2 && "documentId".equals(kv[0])) {
                try {
                    return Long.valueOf(kv[1]);
                } catch (Exception e) {
                    return null;
                }
            }
        }
        return null;
    }

    private Long parseUserId(URI uri) {
        if (uri == null) return null;
        String query = uri.getQuery();
        if (query == null) return null;
        for (String part : query.split("&")) {
            String[] kv = part.split("=");
            if (kv.length == 2 && "userId".equals(kv[0])) {
                try {
                    return Long.valueOf(kv[1]);
                } catch (Exception e) {
                    return null;
                }
            }
        }
        return null;
    }
}
