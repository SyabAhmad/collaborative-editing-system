package com.syab.documentediting.service;

import com.syab.documentediting.dto.EditMessage;
import com.syab.documentediting.ot.*;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OTService {
    private Map<Long, VersionManager> versionManagers = new ConcurrentHashMap<>();
    private Map<Long, StringBuilder> documentContents = new ConcurrentHashMap<>();
    private final VersionControlClient versionControlClient;

    public OTService(VersionControlClient versionControlClient) {
        this.versionControlClient = versionControlClient;
    }

    public synchronized Operation applyOperation(Long documentId, EditMessage message) {
        VersionManager vm = versionManagers.computeIfAbsent(documentId, k -> new VersionManager());
        StringBuilder content = documentContents.computeIfAbsent(documentId, k -> new StringBuilder());

        Operation op;
        if ("INSERT".equals(message.getOperationType())) {
            op = new InsertOperation(message.getPosition(), message.getContent(), message.getVersion());
        } else if ("DELETE".equals(message.getOperationType())) {
            op = new DeleteOperation(message.getPosition(), message.getLength(), message.getVersion());
        } else {
            throw new IllegalArgumentException("Unknown operation type");
        }

        // Get concurrent operations since client's version
        var concurrentOps = vm.getOperationsSinceVersion(message.getVersion());

        // Transform the operation against concurrent operations
        for (Operation concurrentOp : concurrentOps) {
            op = OperationalTransformation.transform(op, concurrentOp);
        }

        // Apply the transformed operation to the document
        applyToContent(content, op);

        // Add to history
        vm.addOperation(op);

        // Trigger snapshot every 10 operations
        if (vm.getCurrentVersion() % 10 == 0) {
            versionControlClient.createVersion(documentId, message.getUserId(), content.toString(), "Periodic snapshot at version " + vm.getCurrentVersion());
        }

        return op;
    }

    private void applyToContent(StringBuilder content, Operation op) {
        if (op instanceof InsertOperation) {
            InsertOperation insert = (InsertOperation) op;
            content.insert(insert.getPosition(), insert.getContent());
        } else if (op instanceof DeleteOperation) {
            DeleteOperation delete = (DeleteOperation) op;
            content.delete(delete.getPosition(), delete.getPosition() + delete.getLength());
        }
    }

    public String getDocumentContent(Long documentId) {
        return documentContents.getOrDefault(documentId, new StringBuilder()).toString();
    }

    public int getCurrentVersion(Long documentId) {
        VersionManager vm = versionManagers.get(documentId);
        return vm != null ? vm.getCurrentVersion() : 0;
    }
}