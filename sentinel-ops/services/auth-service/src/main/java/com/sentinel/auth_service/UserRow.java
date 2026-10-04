package com.sentinel.auth_service;

public record UserRow(String id, String email, String passwordHash, String name, String role) {}
