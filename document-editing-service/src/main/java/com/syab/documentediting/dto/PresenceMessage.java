package com.syab.documentediting.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PresenceMessage {
    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Action is required")
    private String action; // "JOIN", "LEAVE"

    private LocalDateTime timestamp;
}