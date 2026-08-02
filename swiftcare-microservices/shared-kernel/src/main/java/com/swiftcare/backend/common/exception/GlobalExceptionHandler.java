package com.swiftcare.backend.common.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(
            ResourceNotFoundException exception
    ) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateEmail(
            EmailAlreadyExistsException exception
    ) {
        return response(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(
            UnauthorizedException exception
    ) {
        return response(HttpStatus.UNAUTHORIZED, exception.getMessage());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(
            AuthenticationException exception
    ) {
        return response(
                HttpStatus.UNAUTHORIZED,
                "Authentication is required to access this resource"
        );
    }

    @ExceptionHandler({AccessDeniedException.class, SecurityException.class})
    public ResponseEntity<Map<String, Object>> handleForbidden(
            RuntimeException exception
    ) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            message = "You do not have permission to access this resource";
        }
        return response(HttpStatus.FORBIDDEN, message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException exception
    ) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(
            IllegalStateException exception
    ) {
        return response(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException exception
    ) {
        Map<String, String> validationErrors = new LinkedHashMap<>();

        exception.getBindingResult()
                .getFieldErrors()
                .forEach(error -> validationErrors.putIfAbsent(
                        error.getField(),
                        error.getDefaultMessage()
                ));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("message", "Validation failed");
        body.put("errors", validationErrors);

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpectedException(
            Exception exception
    ) {
        log.error("Unhandled server error", exception);

        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected server error occurred"
        );
    }

    private ResponseEntity<Map<String, Object>> response(
            HttpStatus status,
            String message
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("message", message);

        return ResponseEntity.status(status).body(body);
    }
}
