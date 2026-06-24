package com.swiftcare.consultation_service.repository;

import com.swiftcare.consultation_service.model.consultation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConsultationRepository extends JpaRepository<consultation, Long> {

    List<consultation> findByPatientId(Long patientId);

    List<consultation> findByDoctorId(Long doctorId);

    List<consultation> findByStatus(String status);
}