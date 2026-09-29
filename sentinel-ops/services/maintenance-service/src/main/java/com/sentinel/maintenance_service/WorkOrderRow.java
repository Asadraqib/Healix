package com.sentinel.maintenance_service;

public record WorkOrderRow(String id, String assetId, String title, String priority,
    String status, String owner, String due, String source) {}