package com.syab.documentediting.ot;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class VersionManager {
    private int currentVersion = 0;
    private List<Operation> operationHistory = new CopyOnWriteArrayList<>();

    public synchronized int getCurrentVersion() {
        return currentVersion;
    }

    public synchronized void addOperation(Operation op) {
        op.setVersion(++currentVersion);
        operationHistory.add(op);
    }

    public List<Operation> getOperationsSinceVersion(int version) {
        if (version >= operationHistory.size()) {
            return List.of();
        }
        return operationHistory.subList(version, operationHistory.size());
    }

    public Operation getOperationAtVersion(int version) {
        if (version > 0 && version <= operationHistory.size()) {
            return operationHistory.get(version - 1);
        }
        return null;
    }
}