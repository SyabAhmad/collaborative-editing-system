package com.syab.documentediting.ot;

public class OperationalTransformation {

    public static Operation transform(Operation op1, Operation op2) {
        if (op1.getType().equals("INSERT") && op2.getType().equals("INSERT")) {
            return transformInsertInsert((InsertOperation) op1, (InsertOperation) op2);
        } else if (op1.getType().equals("INSERT") && op2.getType().equals("DELETE")) {
            return transformInsertDelete((InsertOperation) op1, (DeleteOperation) op2);
        } else if (op1.getType().equals("DELETE") && op2.getType().equals("INSERT")) {
            return transformDeleteInsert((DeleteOperation) op1, (InsertOperation) op2);
        } else if (op1.getType().equals("DELETE") && op2.getType().equals("DELETE")) {
            return transformDeleteDelete((DeleteOperation) op1, (DeleteOperation) op2);
        }
        return op1; // No transformation needed
    }

    private static Operation transformInsertInsert(InsertOperation op1, InsertOperation op2) {
        if (op1.getPosition() < op2.getPosition()) {
            return op1;
        } else if (op1.getPosition() > op2.getPosition()) {
            op1.setPosition(op1.getPosition() + op2.getContent().length());
            return op1;
        } else {
            // Same position, assume op1 has priority (could be based on user ID)
            op2.setPosition(op2.getPosition() + op1.getContent().length());
            return op1;
        }
    }

    private static Operation transformInsertDelete(InsertOperation op1, DeleteOperation op2) {
        if (op1.getPosition() <= op2.getPosition()) {
            return op1;
        } else {
            op1.setPosition(op1.getPosition() - op2.getLength());
            return op1;
        }
    }

    private static Operation transformDeleteInsert(DeleteOperation op1, InsertOperation op2) {
        if (op1.getPosition() < op2.getPosition()) {
            return op1;
        } else {
            op1.setPosition(op1.getPosition() + op2.getContent().length());
            return op1;
        }
    }

    private static Operation transformDeleteDelete(DeleteOperation op1, DeleteOperation op2) {
        if (op1.getPosition() < op2.getPosition()) {
            return op1;
        } else if (op1.getPosition() > op2.getPosition()) {
            op1.setPosition(op1.getPosition() - op2.getLength());
            return op1;
        } else {
            // Same position, delete the overlapping part
            int overlap = Math.min(op1.getLength(), op2.getLength());
            op1 = new DeleteOperation(op1.getPosition(), op1.getLength() - overlap, op1.getVersion());
            return op1;
        }
    }
}