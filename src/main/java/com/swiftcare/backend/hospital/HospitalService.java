package com.swiftcare.backend.hospital;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HospitalService {

    private final HospitalRepository hospitalRepository;

    public HospitalService(HospitalRepository hospitalRepository) {
        this.hospitalRepository = hospitalRepository;
    }

    public List<hospital> getAllHospitals() {
        return hospitalRepository.findAll();
    }
}