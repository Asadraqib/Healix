package com.sentinel.asset_service;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public record AssetRegistrationRequest(
  @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{3,20}") String id,
  @NotBlank String name,
  @NotBlank String type,
  @NotBlank String model,
  @NotBlank String location,
  @NotNull @Min(0) @Max(100) Integer health,
  @NotNull @DecimalMin("-50") @DecimalMax("500") BigDecimal temperature,
  @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal vibration,
  @NotNull @Min(0) @Max(100) Integer load,
  @NotNull @DecimalMin("0") @DecimalMax("10000") BigDecimal power,
  @Min(0) @Max(30000) Integer rpm,
  @Min(0) Long productionCount
) {}
