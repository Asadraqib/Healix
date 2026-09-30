package com.sentinel.maintenance_service;

import java.util.Map;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class MaintenanceController {
  private final MaintenanceRepository repo;

  public MaintenanceController(MaintenanceRepository repo) {
    this.repo = repo;
  }

  @GetMapping("/work-orders")
  public List<WorkOrderResponse> workOrders(@RequestParam(required = false) String assetId) {
    var rows = (assetId != null && !assetId.isBlank()) ? repo.findByAsset(assetId) : repo.findAllWorkOrders();
    return rows.stream().map(WorkOrderResponse::from).toList();
  }

  @PostMapping("/work-orders")
  public WorkOrderResponse createWorkOrder(@Valid @RequestBody WorkOrderRequest req) {
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
  public Map<String, Object> suppliers() {
    return Map.of("suppliers", Map.of("items", repo.findAllSuppliers()));
  }
}