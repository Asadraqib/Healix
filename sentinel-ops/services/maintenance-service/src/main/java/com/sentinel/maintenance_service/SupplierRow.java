package com.sentinel.maintenance_service;

import java.math.BigDecimal;

public record SupplierRow(
  String id,
  String name,
  String contact,
  String phone,
  BigDecimal rating
) {}
