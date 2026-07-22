package com.swiftcare.backend.admin;

import com.swiftcare.backend.admin.dto.DepartmentResponse;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.AdminRequired;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {
    private final DepartmentRepository departmentRepository;
    private final HospitalRepository hospitalRepository;

    @PostMapping("/departments")
    @AdminRequired
    public ResponseEntity<DepartmentResponse> createDepartment(@RequestBody CreateDepartmentRequest request) {
        Hospital hospital = hospitalRepository.findAllByIsActiveTrue().stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No active hospital found"));
        Department saved = departmentRepository.save(Department.builder()
                .hospital(hospital).name(request.getName())
                .operatingHours(request.getOperatingHours())
                .queueCapacity(request.getQueueCapacity()).build());
        return ResponseEntity.status(HttpStatus.CREATED).body(DepartmentResponse.builder()
                .id(saved.getId()).hospitalId(hospital.getId()).hospitalName(hospital.getName())
                .name(saved.getName()).operatingHours(saved.getOperatingHours())
                .queueCapacity(saved.getQueueCapacity()).isActive(saved.isActive()).build());
    }
}
