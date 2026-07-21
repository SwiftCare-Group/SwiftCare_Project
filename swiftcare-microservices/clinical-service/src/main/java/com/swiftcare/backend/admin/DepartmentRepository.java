package com.swiftcare.backend.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    List<Department> findAllByIsActiveTrue();
    List<Department> findAllByHospitalIdAndIsActiveTrue(UUID hospitalId);
}