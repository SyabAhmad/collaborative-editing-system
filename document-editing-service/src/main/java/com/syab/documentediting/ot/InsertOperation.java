package com.syab.documentediting.ot;

public class InsertOperation implements Operation {
    private int position;
    private String content;
    private int version;

    public InsertOperation(int position, String content, int version) {
        this.position = position;
        this.content = content;
        this.version = version;
    }

    @Override
    public String getType() {
        return "INSERT";
    }

    @Override
    public int getPosition() {
        return position;
    }

    @Override
    public String getContent() {
        return content;
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