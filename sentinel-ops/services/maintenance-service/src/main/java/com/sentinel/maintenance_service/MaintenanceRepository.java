package com.sentinel.maintenance_service;

import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class MaintenanceRepository {

  private final JdbcClient jdbc;

  public MaintenanceRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  private static final String WO_COLS = "id, asset_id, title, priority, status, owner, due, source";
  private static final String PART_COLS =
    "id, name, on_hand, reorder_level, unit_cost, supplier_id";
  private static final String SUPPLIER_COLS = "id, name, contact, phone, rating";

  public java.util.List<WorkOrderRow> findByAsset(String assetId) {
    return jdbc
      .sql(
        "SELECT " + WO_COLS + " FROM work_orders WHERE asset_id = :assetId ORDER BY created_at DESC"
      )
      .param("assetId", assetId)
      .query(WorkOrderRow.class)
      .list();
  }

  public List<WorkOrderRow> findAllWorkOrders() {
    return jdbc
      .sql("SELECT " + WO_COLS + " FROM work_orders ORDER BY created_at DESC")
      .query(WorkOrderRow.class)
      .list();
  }

  public WorkOrderRow insertWorkOrder(WorkOrderRow w) {
    jdbc
      .sql(
        """
        INSERT INTO work_orders (id, asset_id, title, priority, status, owner, due, source)
        VALUES (:id, :assetId, :title, :priority, :status, :owner, :due, :source)
        """
      )
      .param("id", w.id())
      .param("assetId", w.assetId())
      .param("title", w.title())
      .param("priority", w.priority())
      .param("status", w.status())
      .param("owner", w.owner())
      .param("due", w.due())
      .param("source", w.source())
      .update();
    return w;
  }

  public List<PartRow> findAllParts() {
    return jdbc
      .sql("SELECT " + PART_COLS + " FROM parts ORDER BY id")
      .query(PartRow.class)
      .list();
  }

  public List<SupplierRow> findAllSuppliers() {
    return jdbc
      .sql("SELECT " + SUPPLIER_COLS + " FROM suppliers ORDER BY id")
      .query(SupplierRow.class)
      .list();
  }
}
