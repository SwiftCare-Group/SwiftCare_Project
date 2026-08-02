package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.enums.Role;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, UUID> {
    List<Doctor> findAllByRoleAndIsAvailableOnlineTrueAndIsDeletedFalse(Role role);
    Optional<Doctor> findByEmail(String email);
    Optional<Doctor> findByEmailIgnoreCaseAndIsDeletedFalse(String email);
    List<Doctor> findAllByIsDeletedFalseOrderByNameAsc();
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByLicenseNoIgnoreCase(String licenseNo);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT doctor
        FROM Doctor doctor
        WHERE doctor.id = :doctorId
          AND doctor.isDeleted = false
        """)
    Optional<Doctor> findForOnlineBooking(
            @Param("doctorId") UUID doctorId
    );

}
