package com.syab.documentediting.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditMessage {
    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Operation type is required")
    private String operationType; // "INSERT", "DELETE"

    @NotNull(message = "Position is required")
    private Integer position;

    private String content; // For INSERT

    private Integer length; // For DELETE

    @NotNull(message = "Version is required")
    private Integer version;
    private String opId;

    public String getOpId() {
        return opId;
    }

    public void setOpId(String opId) {
        this.opId = opId;
    }

    // Lombok @AllArgsConstructor provides a full-args constructor that includes opId
}