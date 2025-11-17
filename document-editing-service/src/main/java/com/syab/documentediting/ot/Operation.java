package com.syab.documentediting.ot;

public interface Operation {
    String getType();
    int getPosition();
    String getContent();
    int getVersion();
    void setVersion(int version);
}