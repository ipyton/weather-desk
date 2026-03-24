package com.noah.temperatureconverter.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler({
            IllegalArgumentException.class,
            MethodArgumentTypeMismatchException.class,
            MethodArgumentNotValidException.class
    })
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleBadRequest(Exception exception, HttpServletRequest request) {
        return Map.of(
                "timestamp", Instant.now().toString(),
                "status", HttpStatus.BAD_REQUEST.value(),
                "error", "Bad Request",
                "message", exception.getMessage(),
                "path", request.getRequestURI()
        );
    }
}
