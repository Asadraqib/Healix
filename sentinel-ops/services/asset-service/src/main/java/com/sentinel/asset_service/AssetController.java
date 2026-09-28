package com.sentinel.asset_service;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assets")
public class AssetController {
  private final AssetRepository repo;
  public AssetController(AssetRepository repo) { this.repo = repo; }

  @GetMapping
  public List<AssetResponse> list() {
    return repo.findAll().stream().map(AssetResponse::from).toList();
  }

  @GetMapping("/{id}")
  public ResponseEntity<AssetResponse> one(@PathVariable String id) {
    return repo.findById(id).map(AssetResponse::from).map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }
}