package com.syab.documentediting.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditDocumentRequest {
    @NotBlank(message = "Content is required")
    private String content;
    
    @NotBlank(message = "Operation type is required")
    private String operationType; // "INSERT", "DELETE", "UPDATE"
}
