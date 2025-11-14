package com.syab.versioncontrol.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVersionDTO {
    private Long id;
    private Long documentId;
    private Integer versionNumber;
    private String content;
    private Long createdBy;
    private String createdAt;
    private String description;
}
