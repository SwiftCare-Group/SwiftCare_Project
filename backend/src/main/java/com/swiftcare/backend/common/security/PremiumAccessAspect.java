package com.swiftcare.backend.common.security;

import com.swiftcare.backend.common.enums.Tier;
import com.swiftcare.backend.common.exception.UnauthorizedException;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class PremiumAccessAspect {

    private final PatientRepository patientRepository;

    @Before("@annotation(PremiumRequired)")
    public void checkPremiumAccess() {
        Authentication authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Authentication required");
        }

        String email = (String) authentication.getPrincipal();

        Patient patient = patientRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Patient not found"));

        if (patient.getTier() != Tier.PREMIUM) {
            throw new UnauthorizedException(
                "This feature requires a Premium subscription. Please upgrade to access online consultations, digital prescriptions, and priority queue benefits."
            );
        }
    }
}