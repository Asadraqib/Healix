package com.sentinel.maintenance_service;

public record WorkOrderResponse(String id, String asset, String title, String priority,
    String status, String owner, String due, String source) {

  static WorkOrderResponse from(WorkOrderRow r) {
    return new WorkOrderResponse(r.id(), r.assetId(), r.title(), r.priority(),
        r.status(), r.owner(), r.due(), r.source());
  }
}