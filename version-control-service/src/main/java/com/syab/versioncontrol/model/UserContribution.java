package com.syab.versioncontrol.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_contributions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserContribution {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "changes_count")
    private Integer changesCount = 0;

    @Column(name = "last_edited_at")
    private LocalDateTime lastEditedAt;

    @PreUpdate
    protected void onUpdate() {
        lastEditedAt = LocalDateTime.now();
    }
}
