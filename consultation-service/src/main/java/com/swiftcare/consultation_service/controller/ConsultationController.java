package com.swiftcare.consultation_service.controller;

import com.swiftcare.consultation_service.model.consultation;
import com.swiftcare.consultation_service.repository.ConsultationRepository;
import com.swiftcare.consultation_service.service.DailyVideoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/consultations")
public class ConsultationController {

    @Autowired
    private ConsultationRepository consultationRepository;

    @Autowired
    private DailyVideoService dailyVideoService;

    // GET all consultations
    @GetMapping
    public List<consultation> getAllConsultations() {
        return consultationRepository.findAll();
    }

    // GET one consultation by ID
    @GetMapping("/{id}")
    public ResponseEntity<consultation> getConsultationById(
            @PathVariable Long id) {
        return consultationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST - create a new consultation (book an appointment)
    @PostMapping
    public consultation createConsultation(
            @RequestBody consultation consultation) {
        return consultationRepository.save(consultation);
    }

    // POST - patient or doctor JOINS the consultation
    // This is when the video room gets created!
    @PostMapping("/{id}/join")
    public ResponseEntity<consultation> joinConsultation(
            @PathVariable Long id) {
        return consultationRepository.findById(id)
                .map(existing -> {
                    // Generate a real Daily.co video room link
                    String videoUrl = dailyVideoService.createVideoRoom(id);

                    // Save the video link and mark as ACTIVE
                    existing.setVideoRoomUrl(videoUrl);
                    existing.setStatus("ACTIVE");
                    existing.setStartedAt(LocalDateTime.now());

                    return ResponseEntity.ok(
                            consultationRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // POST - doctor marks consultation as COMPLETED
    @PostMapping("/{id}/complete")
    public ResponseEntity<consultation> completeConsultation(
            @PathVariable Long id,
            @RequestBody(required = false) consultation updates) {
        return consultationRepository.findById(id)
                .map(existing -> {
                    existing.setStatus("COMPLETED");
                    existing.setEndedAt(LocalDateTime.now());
                    if (updates != null && updates.getNotes() != null) {
                        existing.setNotes(updates.getNotes());
                    }
                    return ResponseEntity.ok(
                            consultationRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // POST - cancel a consultation
    @PostMapping("/{id}/cancel")
    public ResponseEntity<consultation> cancelConsultation(
            @PathVariable Long id) {
        return consultationRepository.findById(id)
                .map(existing -> {
                    existing.setStatus("CANCELLED");
                    return ResponseEntity.ok(
                            consultationRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // PUT - update consultation details
    @PutMapping("/{id}")
    public ResponseEntity<consultation> updateConsultation(
            @PathVariable Long id,
            @RequestBody consultation updatedConsultation) {
        return consultationRepository.findById(id)
                .map(existing -> {
                    existing.setStatus(
                            updatedConsultation.getStatus());
                    existing.setNotes(
                            updatedConsultation.getNotes());
                    return ResponseEntity.ok(
                            consultationRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}