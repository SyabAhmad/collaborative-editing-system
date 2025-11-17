package com.syab.documentediting.ot;

public class DeleteOperation implements Operation {
    private int position;
    private int length; // number of characters to delete
    private int version;

    public DeleteOperation(int position, int length, int version) {
        this.position = position;
        this.length = length;
        this.version = version;
    }

    @Override
    public String getType() {
        return "DELETE";
    }

    @Override
    public int getPosition() {
        return position;
    }

    @Override
    public String getContent() {
        return ""; // Delete doesn't have content, but for interface
    }

    public int getLength() {
        return length;
    }

    @Override
    public int getVersion() {
        return version;
    }

    @Override
    public void setVersion(int version) {
        this.version = version;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}