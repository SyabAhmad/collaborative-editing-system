package com.syab.documentediting.service;

import com.syab.documentediting.dto.PresenceMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;

@Service
public class PresenceService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ConcurrentMap<Long, ConcurrentMap<Long, LocalDateTime>> documentPresence = new ConcurrentHashMap<>();
    private static final int TIMEOUT_SECONDS = 60;

    public PresenceService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void joinDocument(Long documentId, Long userId) {
        documentPresence.computeIfAbsent(documentId, k -> new ConcurrentHashMap<>()).put(userId, LocalDateTime.now());
        broadcastPresence(documentId, new PresenceMessage(userId, "JOIN", LocalDateTime.now()));
    }

    public void leaveDocument(Long documentId, Long userId) {
        ConcurrentMap<Long, LocalDateTime> users = documentPresence.get(documentId);
        if (users != null) {
            users.remove(userId);
            if (users.isEmpty()) {
                documentPresence.remove(documentId);
            }
            broadcastPresence(documentId, new PresenceMessage(userId, "LEAVE", LocalDateTime.now()));
        }
    }

    public void heartbeat(Long documentId, Long userId) {
        documentPresence.computeIfAbsent(documentId, k -> new ConcurrentHashMap<>()).put(userId, LocalDateTime.now());
    }

    public Set<Long> getActiveUsers(Long documentId) {
        ConcurrentMap<Long, LocalDateTime> users = documentPresence.get(documentId);
        if (users == null) {
            return Set.of();
        }
        return users.keySet();
    }

    private void broadcastPresence(Long documentId, PresenceMessage message) {
        messagingTemplate.convertAndSend("/topic/documents/" + documentId + "/presence", message);
    }

    @Scheduled(fixedRate = 30000) // Check every 30 seconds
    public void checkTimeouts() {
        LocalDateTime now = LocalDateTime.now();
        documentPresence.forEach((documentId, users) -> {
            Set<Long> timedOutUsers = users.entrySet().stream()
                .filter(entry -> entry.getValue().isBefore(now.minusSeconds(TIMEOUT_SECONDS)))
                .map(entry -> entry.getKey())
                .collect(Collectors.toSet());

            timedOutUsers.forEach(userId -> {
                users.remove(userId);
                broadcastPresence(documentId, new PresenceMessage(userId, "LEAVE", now));
            });

            if (users.isEmpty()) {
                documentPresence.remove(documentId);
            }
        });
    }
}