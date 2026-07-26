package com.swiftcare.backend.notification.config;
import com.swiftcare.backend.notification.device.PushDeviceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PushDeviceNotFoundException.class)
    public ResponseEntity<Map<String, Object>>
    handleDeviceNotFound(
            PushDeviceNotFoundException exception,
            HttpServletRequest request
    ) {
        return buildResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>>
    handleValidationFailure(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        Map<String, String> fieldErrors =
                new LinkedHashMap<>();

        exception.getBindingResult()
                .getFieldErrors()
                .forEach(error ->
                        fieldErrors.put(
                                error.getField(),
                                error.getDefaultMessage()
                        )
                );

        Map<String, Object> body =
                createBaseBody(
                        HttpStatus.BAD_REQUEST,
                        "Request validation failed.",
                        request.getRequestURI()
                );

        body.put("fieldErrors", fieldErrors);

        return ResponseEntity
                .badRequest()
                .body(body);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>>
    handleIllegalState(
            IllegalStateException exception,
            HttpServletRequest request
    ) {
        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                exception.getMessage(),
                request.getRequestURI()
        );
    }

    private ResponseEntity<Map<String, Object>>
    buildResponse(
            HttpStatus status,
            String message,
            String path
    ) {
        return ResponseEntity
                .status(status)
                .body(
                        createBaseBody(
                                status,
                                message,
                                path
                        )
                );
    }

    private Map<String, Object> createBaseBody(
            HttpStatus status,
            String message,
            String path
    ) {
        Map<String, Object> body =
                new LinkedHashMap<>();

        body.put(
                "timestamp",
                OffsetDateTime.now(ZoneOffset.UTC)
        );

        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", path);

        return body;
    }
}