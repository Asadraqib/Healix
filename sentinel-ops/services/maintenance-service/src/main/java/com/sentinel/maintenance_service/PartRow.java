package com.sentinel.maintenance_service;
import java.math.BigDecimal;

public record PartRow(String id, String name, int onHand, int reorderLevel,
    BigDecimal unitCost, String supplierId) {}