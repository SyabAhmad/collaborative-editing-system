package com.syab.documentediting.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChangeDTO {
    private Long id;
    private Long documentId;
    private Long userId;
    private String changeContent;
    private String operationType;
}
