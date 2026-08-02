package com.swiftcare.backend.admin;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {

    @EntityGraph(attributePaths = "hospital")
    List<Department> findAllByIsActiveTrue();

    @EntityGraph(attributePaths = "hospital")
    List<Department> findAllByHospitalIdAndIsActiveTrue(UUID hospitalId);

    long countByIsActiveTrue();

    boolean existsByHospitalIdAndNameIgnoreCase(UUID hospitalId, String name);

    Optional<Department> findByIdAndIsActiveTrue(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT d
            FROM Department d
            JOIN FETCH d.hospital
            WHERE d.id = :id
              AND d.isActive = true
            """)
    Optional<Department> findActiveForBooking(@Param("id") UUID id);

    @Override
    @EntityGraph(attributePaths = "hospital")
    Optional<Department> findById(UUID id);
}
