package com.syab.versioncontrol.repository;

import com.syab.versioncontrol.model.UserContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserContributionRepository extends JpaRepository<UserContribution, Long> {
    List<UserContribution> findByDocumentId(Long documentId);
    Optional<UserContribution> findByDocumentIdAndUserId(Long documentId, Long userId);
}
