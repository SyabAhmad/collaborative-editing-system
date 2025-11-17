package com.syab.documentediting.controller;

import com.syab.documentediting.dto.EditMessage;
// HeartbeatMessage import removed as unused
import com.syab.documentediting.dto.JoinMessage;
import com.syab.documentediting.dto.LeaveMessage;
import com.syab.documentediting.ot.Operation;
import com.syab.documentediting.service.OTService;
import com.syab.documentediting.service.PresenceService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListSet;

@Controller
public class WebSocketController {
    private static final Logger logger = LoggerFactory.getLogger(WebSocketController.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final OTService otService;
    private final PresenceService presenceService;
    private final ConcurrentHashMap<Long, ConcurrentSkipListSet<String>> documentSessions = new ConcurrentHashMap<>();

    public WebSocketController(SimpMessagingTemplate messagingTemplate, OTService otService, PresenceService presenceService) {
        this.messagingTemplate = messagingTemplate;
        this.otService = otService;
        this.presenceService = presenceService;
    }

    @MessageMapping("/documents/{documentId}/join")
    public void joinDocument(@DestinationVariable Long documentId, @Payload JoinMessage message) {
        presenceService.joinDocument(documentId, message.getUserId());
    }

    @MessageMapping("/documents/{documentId}/edit")
    public void editDocument(@DestinationVariable Long documentId, @Payload EditMessage message) {
        // Apply the operation using OT
        Operation transformedOp = otService.applyOperation(documentId, message);

        // Create response message with updated version
        EditMessage response = new EditMessage(
            message.getUserId(),
            transformedOp.getType(),
            transformedOp.getPosition(),
            transformedOp instanceof com.syab.documentediting.ot.InsertOperation ? transformedOp.getContent() : null,
            transformedOp instanceof com.syab.documentediting.ot.DeleteOperation ? ((com.syab.documentediting.ot.DeleteOperation) transformedOp).getLength() : null,
            transformedOp.getVersion(),
            null
        );
        // copy opId back to client so it can match pending op ACKs
        response.setOpId(message.getOpId());

        // Broadcast the transformed operation to all subscribers
        logger.info("Broadcasting transformed op for doc {}: userId={}, opId={}, type={}, pos={}, ver={}",
            documentId, response.getUserId(), response.getOpId(), response.getOperationType(), response.getPosition(), response.getVersion());
        messagingTemplate.convertAndSend("/topic/documents/" + documentId, response);
    }

    @MessageMapping("/documents/{documentId}/leave")
    public void leaveDocument(@DestinationVariable Long documentId, @Payload LeaveMessage message) {
        presenceService.leaveDocument(documentId, message.getUserId());
    }

    @EventListener
    public void handleSessionSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = headerAccessor.getDestination();
        String sessionId = headerAccessor.getSessionId();

        if (destination != null && destination.startsWith("/topic/documents/")) {
            String[] parts = destination.split("/");
            if (parts.length >= 4) {
                try {
                    Long documentId = Long.parseLong(parts[3]);
                    documentSessions.computeIfAbsent(documentId, k -> new ConcurrentSkipListSet<>()).add(sessionId);
                } catch (NumberFormatException e) {
                    // Invalid documentId
                }
            }
        }
    }

    @EventListener
    public void handleSessionUnsubscribe(SessionUnsubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = headerAccessor.getDestination();
        String sessionId = headerAccessor.getSessionId();

        if (destination != null && destination.startsWith("/topic/documents/")) {
            String[] parts = destination.split("/");
            if (parts.length >= 4) {
                try {
                    Long documentId = Long.parseLong(parts[3]);
                    ConcurrentSkipListSet<String> sessions = documentSessions.get(documentId);
                    if (sessions != null) {
                        sessions.remove(sessionId);
                        if (sessions.isEmpty()) {
                            documentSessions.remove(documentId);
                        }
                    }
                } catch (NumberFormatException e) {
                    // Invalid documentId
                }
            }
        }
    }
}