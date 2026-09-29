package com.sentinel.auth_service;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ErrorHandler {
  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Object> handleBadRequest(IllegalArgumentException e) {
    return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
  }
}