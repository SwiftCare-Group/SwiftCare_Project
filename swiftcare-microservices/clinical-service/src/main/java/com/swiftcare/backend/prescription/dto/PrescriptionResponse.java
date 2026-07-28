package com.swiftcare.backend.prescription.dto;

import com.swiftcare.backend.pharmacy.dto.DispensationRecordResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionResponse {

    private UUID id;

    private UUID consultationId;

    private UUID patientId;

    private UUID doctorId;

    /**
     * List of prescribed medications.
     */
    private List<String> drugs;

    /**
     * Total number of prescribed drugs.
     */
    private Integer drugCount;

    /**
     * Base64 encoded QR code image.
     */
    private String qrCodeData;

    /** Current status and audit information for every prescribed drug. */
    private List<DispensationRecordResponse> dispensationRecords;

    /**
     * Date and time the prescription was issued.
     */
    private LocalDateTime issuedAt;
}