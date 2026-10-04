package com.sentinel.maintenance_service;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class WorkflowServiceTest {
    @Test void invalidQuantityDoesNotTouchTheDatabase() {
        JdbcClient db = mock(JdbcClient.class);
        var service = new WorkflowService(db);
        assertThrows(ResponseStatusException.class, () -> service.adjust("part", 0, "ADJUSTMENT", null));
        assertThrows(ResponseStatusException.class, () -> service.adjust("part", Integer.MIN_VALUE, "ADJUSTMENT", null));
        verifyNoInteractions(db);
    }

    @Test void consumptionCannotMakeStockNegative() {
        JdbcClient db = mock(JdbcClient.class, RETURNS_DEEP_STUBS);
        when(db.sql("SELECT * FROM parts WHERE id=:id FOR UPDATE").param("id", "part").query().listOfRows())
                .thenReturn(List.of(Map.of("on_hand", 2, "reorder_level", 1)));
        var exception = assertThrows(ResponseStatusException.class,
                () -> new WorkflowService(db).adjust("part", -3, "WORK_ORDER", "order"));
        assertTrue(exception.getReason().contains("Insufficient stock"));
        verify(db, never()).sql(startsWith("UPDATE parts"));
    }

    @Test void receivingTheSameSupplierOrderAgainDoesNotAddStock() {
        JdbcClient db = mock(JdbcClient.class, RETURNS_DEEP_STUBS);
        when(db.sql("SELECT * FROM supplier_orders WHERE id=:id FOR UPDATE").param("id", 42L).query().listOfRows())
                .thenReturn(List.of(Map.of("status", "RECEIVED", "part_id", "part", "quantity", 10)));
        new WorkflowService(db).receive(42L);
        verify(db, never()).sql(startsWith("UPDATE parts"));
        verify(db, never()).sql(startsWith("UPDATE supplier_orders"));
    }

    @Test void receivingAnUnknownOrderReportsNotFound() {
        JdbcClient db = mock(JdbcClient.class, RETURNS_DEEP_STUBS);
        when(db.sql("SELECT * FROM supplier_orders WHERE id=:id FOR UPDATE").param("id", 42L).query().listOfRows())
                .thenReturn(List.of());
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> new WorkflowService(db).receive(42L)).getStatusCode().value());
    }
}
