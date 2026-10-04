package com.sentinel.maintenance_service;

import jakarta.validation.constraints.NotBlank;

public record WorkOrderRequest(
  @NotBlank String assetId,
  @NotBlank String title,
  String priority,
  String owner,
  String due
) {}
