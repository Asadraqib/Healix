# Healix monitoring and maintenance update

## Fleet and modes

Both modes now use the same five asset IDs, names, machine types, sensor names, units, baselines, and critical thresholds. The backend catalog in `services/asset-service/.../AssetTelemetryCatalog.java` mirrors the browser fleet fixtures in `frontend/src/data/mockData.ts`. Live uses backend telemetry marked `GENERATED_DEMO`; Simulation remains in browser memory and is reset when the page reloads or the user returns to Live.

The backend generator varies temperature, vibration, load, power, RPM, and production gradually around stored baselines. Readings and the last valid sensor history are stored in PostgreSQL, with a 30-day history retention window. Missing values are omitted from the API mapping rather than converted to zero. The frontend applies validation, EMA smoothing, step/rate limits, critical-status fast path, and stale-stream indicators.

## Machine adapter boundary

The HTTP adapter boundary is authenticated by the existing gateway session:

```http
POST /api/assets
Content-Type: application/json

{"id":"PLC-CELL-01","name":"Cell 1 CNC","type":"CNC","model":"Controller model","location":"Plant / Bay","health":100,"temperature":48.4,"vibration":1.8,"load":70,"power":12.5,"rpm":12000,"productionCount":0}
```

```http
POST /api/assets/PLC-CELL-01/telemetry
Content-Type: application/json

{"sensorType":"temperature","value":49.1,"recordedAt":"2026-10-03T07:00:00Z"}
```

The telemetry endpoint accepts logical channel names `temperature`, `vibration`, `load`, `power`, `rpm`, and `production`. A machine-specific OPC UA, Modbus, MQTT, or vendor adapter should translate its tags into these validated channels and include the source timestamp. A machine switches from generated demo readings to connected readings on its first valid adapter update; the generator then leaves that asset alone. Set `TELEMETRY_GENERATOR_ENABLED=false` to disable generated readings globally. To add a new machine model, add its sensor mapping, units, baselines, and thresholds to `AssetTelemetryCatalog` and the matching frontend asset adapter; the dashboard continues to consume the shared sensor DTO.

Generated demo telemetry is never represented as a physical measurement. Each asset detail view reports its source and timestamp; data older than 15 seconds is labeled delayed. Out-of-order and invalid readings are rejected without replacing the last valid value.

## Persistent workflows and endpoints

Asset service migrations `V2` and `V3` align IDs and seed values with the browser fleet and create telemetry history. Maintenance service migration `V2` adds work-order descriptions, trigger readings, recommended actions, assignments/resolutions, inventory metadata, stock movements, supplier order suggestions, and notifications.

Added routes through the existing gateway:

- `POST /api/assets` and `POST /api/assets/{id}/telemetry`
- `GET /api/assets/{id}/telemetry?limit=60`
- `PATCH /api/work-orders/{id}`
- `POST /api/parts/{id}/adjust`, `POST /api/parts/{id}/reorder`, and `GET /api/parts/{id}/movements`
- `GET /api/notifications`, `PATCH /api/notifications/{id}/read`, and `DELETE /api/notifications`
- AI `POST /api/ai/analyze`, `/forecast`, `/draft-work-order`, and `/diagnose`

Critical transitions create at most one unresolved automatic work order per asset. Warning transitions create an alarm notification. Consumed parts are linked to a work order and create a stock movement; reorder suggestions include supplier ID, quantity, estimated cost, and suggestion status. Suggestions do not transmit purchase orders to vendors. Supplier entries and contact values in both modes are explicitly marked as samples; verify before procurement.

Simulation mutations stay local. AI requests receive the selected mode's readings and work orders, but do not write simulation data to the persistent APIs. AI work-order drafts are shown for review and only saved after confirmation.

## AI and retrieval

Set `GROQ_API_KEY` on the backend to enable analysis, forecasts, draft work orders, and the maintenance copilot. The frontend receives no provider key. Without a key, the service remains healthy and returns HTTP 503 with a configuration message. The RAG layer currently uses transparent keyword retrieval over Markdown files in `services/ai-service/documents`; source filenames are returned to the UI. Add approved service manuals to that directory when permitted. The included Healix workflow note is a project reference, not a manufacturer manual and does not define safety limits.

## Docker startup fix from the latest project archive

The asset-service startup failure was caused by a stale/mixed asset-service source tree. Its `AssetRow` expected fields added by V2, but an older `AssetRepository` query selected only V1 columns. The current repository query now includes `rpm`, `production_count`, `last_seen_at`, `telemetry_source`, and all baseline columns. V2 also widens `assets.type` to `VARCHAR(100)` before writing longer machine type names. Replace the complete `services/asset-service/src/main/java/com/sentinel/asset_service` package from this project copy, then rebuild `asset-service`. Keep the existing `.env` and PostgreSQL volume; do not reset the volume.

## Apply and verify

After extracting the update into your existing project, keep your `.env` and PostgreSQL volume, then run:

```powershell
docker compose --parallel 1 build asset-service maintenance-service ai-service frontend gateway-service
docker compose up -d --wait --wait-timeout 300
```

Flyway applies the additive migrations on startup. Existing account and role behavior is preserved. Verify telemetry with `GET /api/assets`, history with `GET /api/assets/{id}/telemetry`, and the maintenance routes above after signing in. Existing session roles continue to gate UI actions; the gateway continues to require an authenticated session for `/api/**`.


## Simulation engine correction (2026-10-03)

The asset service simulation engine now matches the expanded `AssetRepository.updateTelemetry` contract and restores all persisted baselines/readings (including RPM, production count, telemetry source, and last-seen time). It keeps generated readings bounded and gradual, skips assets marked `CONNECTED_MACHINE`, stamps demo data as `GENERATED_DEMO`, and writes sensor history alongside snapshots. The scheduler publishes the full shared sensor catalog and can be controlled with `TELEMETRY_GENERATOR_ENABLED` (defaults to `true`). Set it to `false` after a real adapter takes ownership of assets. The existing manual override endpoint remains available and validates temperature and hold duration.

Build the service with Java 25 using `docker compose build asset-service`; the current verification workspace only has Java 17 and cannot run this project's Java 25 Maven build locally.
