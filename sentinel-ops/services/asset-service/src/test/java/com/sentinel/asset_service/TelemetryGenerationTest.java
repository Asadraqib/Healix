package com.sentinel.asset_service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class TelemetryGenerationTest {

  @Test
  void telemetryBroadcastDoesNotWaitForDatabasePersistence() {
    var repository = mock(AssetRepository.class);
    var engine = new SimulationEngine(repository);
    engine.tick();
    verifyNoInteractions(repository);
  }

  @Test
  void persistenceRunsSeparatelyAndUsesAnImmutableSnapshot() {
    var repository = mock(AssetRepository.class);
    var engine = mock(SimulationEngine.class);
    var states = List.<AssetState>of();
    when(engine.snapshots()).thenReturn(states);
    var scheduler = new SimulationScheduler(
      engine,
      mock(TelemetryWebSocketHandler.class),
      true,
      repository
    );
    scheduler.persistReadings();
    verify(repository).persistDemoSnapshots(states);
    verify(engine, never()).tick();
  }

  @Test
  void disabledGeneratorDoesNotWriteDemoSnapshots() {
    var repository = mock(AssetRepository.class);
    var scheduler = new SimulationScheduler(
      mock(SimulationEngine.class),
      mock(TelemetryWebSocketHandler.class),
      false,
      repository
    );
    scheduler.persistReadings();
    verifyNoInteractions(repository);
  }
}
