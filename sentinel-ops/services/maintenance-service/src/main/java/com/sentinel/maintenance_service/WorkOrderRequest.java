package com.sentinel.maintenance_service;

public record WorkOrderRequest(String assetId, String title, String priority, String owner, String due) {}