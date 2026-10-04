package com.sentinel.maintenance_service;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.simple.JdbcClient;

@RestController
@RequestMapping("/api")
public class MaintenanceController {
 private final WorkflowService workflow; private final MaintenanceRepository repo; private final JdbcClient db;
 public MaintenanceController(WorkflowService workflow,MaintenanceRepository repo,JdbcClient db) {this.workflow=workflow;this.repo=repo;this.db=db;}
 @GetMapping("/work-orders") public List<Map<String,Object>> orders(@RequestParam(required=false) String assetId) {return workflow.orders().stream().filter(w -> assetId==null || assetId.equals(w.get("asset"))).toList();}
 @PostMapping("/work-orders") public Map<String,Object> create(@RequestBody Map<String,Object> input) {return workflow.create(input);}
 @PatchMapping("/work-orders/{id}") public Map<String,Object> update(@PathVariable String id,@RequestBody Map<String,Object> input) {return workflow.update(id,input);}
 @GetMapping("/parts") public List<Map<String,Object>> parts() {return workflow.parts();}
 @GetMapping("/suppliers") public Map<String,Object> suppliers() {return Map.of("suppliers",Map.of("items",repo.findAllSuppliers()));}
 @GetMapping("/parts/movements") public List<Map<String,Object>> allMovements() {return db.sql("SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 2000").query().listOfRows();}
 @GetMapping("/parts/{id}/movements") public List<Map<String,Object>> movements(@PathVariable String id) {return db.sql("SELECT * FROM inventory_movements WHERE part_id=:id ORDER BY created_at DESC").param("id",id).query().listOfRows();}
 @PostMapping("/parts/{id}/adjust") public void adjust(@PathVariable String id,@RequestBody Map<String,Object> input) {workflow.adjust(id,quantity(input,"delta"),"ADJUSTMENT",null);}
 @PostMapping("/parts/{id}/consume") public void consume(@PathVariable String id,@RequestBody Map<String,Object> input) {int q=quantity(input,"quantity");if(q<1) WorkflowService.bad("Positive quantity required"); String wo=WorkflowService.text(input,"workOrderId",""); if(wo.isBlank()) WorkflowService.bad("Work order required"); workflow.adjust(id,-q,"WORK_ORDER",wo);}
 @PostMapping("/parts/{id}/reorder") public void reorder(@PathVariable String id,@RequestBody Map<String,Object> input) {workflow.reorder(id,quantity(input,"quantity"));}
 @GetMapping("/suppliers/orders") public List<Map<String,Object>> reorders() {return workflow.rows("supplier_orders");}
 @PostMapping("/suppliers/orders/{id}/receive") public void receive(@PathVariable long id) {workflow.receive(id);}
 @GetMapping("/alarms") public List<Map<String,Object>> alarms() {return workflow.rows("alarms");}
 @GetMapping("/notifications") public List<Map<String,Object>> notifications() {return workflow.rows("notifications");}
 @PatchMapping("/notifications/{id}/read") public void read(@PathVariable long id) {db.sql("UPDATE notifications SET is_read=true WHERE id=:id").param("id",id).update();}
 @DeleteMapping("/notifications") public void clear() {db.sql("DELETE FROM notifications").update();}
 private int quantity(Map<String,Object> input,String key) {Object n=input.get(key); if(!(n instanceof Number) || !Double.isFinite(((Number)n).doubleValue()) || ((Number)n).doubleValue()!=((Number)n).intValue()) WorkflowService.bad("Integer quantity required"); return ((Number)n).intValue();}
}
