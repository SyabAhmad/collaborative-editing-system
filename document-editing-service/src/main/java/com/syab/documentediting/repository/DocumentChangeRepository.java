package com.syab.documentediting.repository;

import com.syab.documentediting.model.DocumentChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentChangeRepository extends JpaRepository<DocumentChange, Long> {
    List<DocumentChange> findByDocumentId(Long documentId);
}
