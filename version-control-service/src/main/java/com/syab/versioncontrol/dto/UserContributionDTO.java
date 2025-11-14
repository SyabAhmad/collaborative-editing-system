package com.syab.versioncontrol.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserContributionDTO {
    private Long id;
    private Long documentId;
    private Long userId;
    private Integer changesCount;
}
