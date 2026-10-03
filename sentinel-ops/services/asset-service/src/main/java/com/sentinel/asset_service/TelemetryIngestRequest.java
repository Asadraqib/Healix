package com.sentinel.asset_service;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TelemetryIngestRequest(@NotBlank String sensorType, @NotNull Double value,
    java.time.Instant recordedAt) {}
