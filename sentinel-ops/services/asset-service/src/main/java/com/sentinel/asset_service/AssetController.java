package com.sentinel.asset_service;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

  private final AssetRepository repo;
  private final SimulationEngine engine;

  public AssetController(AssetRepository repo, SimulationEngine engine) {
    this.repo = repo;
    this.engine = engine;
  }

  @GetMapping
  public List<AssetResponse> list() {
    return repo.findAll().stream().map(AssetResponse::from).toList();
  }

  @GetMapping("/{id}")
  public ResponseEntity<AssetResponse> one(@PathVariable String id) {
    return repo
      .findById(id)
      .map(AssetResponse::from)
      .map(ResponseEntity::ok)
      .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping
  public AssetResponse register(@Valid @RequestBody AssetRegistrationRequest r) {
    if (repo.findById(r.id()).isPresent()) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Asset already exists"
    );
    if (
      r.name().length() > 100 ||
      r.type().length() > 100 ||
      r.model().length() > 100 ||
      r.location().length() > 100
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Asset fields exceed 100 characters"
    );
    var row = new AssetRow(
      r.id(),
      r.name(),
      r.type(),
      r.model(),
      r.location(),
      "Running",
      r.health(),
      r.temperature(),
      r.vibration(),
      r.load(),
      r.power(),
      "#1677c8",
      "Temperature",
      "Vibration",
      r.vibration() + " mm/s",
      "0",
      r.rpm() == null ? 0 : r.rpm(),
      r.productionCount() == null ? 0 : r.productionCount(),
      Instant.now(),
      "CONNECTED_MACHINE",
      r.temperature(),
      r.vibration(),
      r.load(),
      r.power(),
      r.rpm() == null ? 0 : r.rpm(),
      r.health()
    );
    repo.insert(row);
    engine.load();
    return AssetResponse.from(repo.findById(r.id()).orElseThrow());
  }

  @PostMapping("/{id}/telemetry")
  public AssetResponse ingest(
    @PathVariable String id,
    @Valid @RequestBody TelemetryIngestRequest r
  ) {
    engine.ingest(id, r);
    return AssetResponse.from(repo.findById(id).orElseThrow());
  }

  @GetMapping("/{id}/telemetry")
  public List<Map<String, Object>> history(
    @PathVariable String id,
    @RequestParam(defaultValue = "60") int limit
  ) {
    return repo.readings(id, Math.max(1, Math.min(1000, limit)));
  }
}
