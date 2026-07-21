package com.swiftcare.backend.admin;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
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

    @Override
    @EntityGraph(attributePaths = "hospital")
    Optional<Department> findById(UUID id);
}