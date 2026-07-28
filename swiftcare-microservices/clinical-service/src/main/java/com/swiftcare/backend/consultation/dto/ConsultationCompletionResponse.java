package com.swiftcare.backend.consultation.dto;

import com.swiftcare.backend.clinicalrecord.dto.ClinicalRecordResponse;
import com.swiftcare.backend.lab.dto.LabOrderResponse;
import com.swiftcare.backend.prescription.dto.PrescriptionResponse;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ConsultationCompletionResponse {
    private UUID consultationId;
    private ClinicalRecordResponse clinicalRecord;
    private PrescriptionResponse prescription;
    private List<LabOrderResponse> labOrders;
}
