package com.sentinel.maintenance_service;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class MaintenanceController {
  private final MaintenanceRepository repo;
  public MaintenanceController(MaintenanceRepository repo) { this.repo = repo; }

  @GetMapping("/work-orders")
  public List<WorkOrderResponse> workOrders() {
    return repo.findAllWorkOrders().stream().map(WorkOrderResponse::from).toList();
  }

  @PostMapping("/work-orders")
  public WorkOrderResponse createWorkOrder(@RequestBody WorkOrderRequest req) {
    String id = "WO-" + (1000 + (int) (Math.random() * 9000));
    WorkOrderRow row = new WorkOrderRow(id, req.assetId(),
        req.title() != null ? req.title() : "Maintenance work order",
        req.priority() != null ? req.priority() : "Medium",
        "Scheduled",
        req.owner() != null ? req.owner() : "Unassigned",
        req.due() != null ? req.due() : "Not scheduled",
        "Dashboard");
    return WorkOrderResponse.from(repo.insertWorkOrder(row));
  }

  @GetMapping("/parts")
  public List<PartRow> parts() {
    return repo.findAllParts();
  }

  @GetMapping("/suppliers")
  public List<SupplierRow> suppliers() {
    return repo.findAllSuppliers();
  }
}