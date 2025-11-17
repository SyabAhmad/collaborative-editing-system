package com.syab.documentediting.repository;

import com.syab.documentediting.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByOwnerId(Long ownerId);
    Optional<Document> findByIdAndOwnerId(Long id, Long ownerId);
    List<Document> findByIsSharedTrue();
}
