# Stable live readings and Live-first sessions

Copy the contents of this archive's `sentinel-ops` folder into your existing
`sentinel-ops` folder. Keep your existing root `.env`.

Rebuild from that folder in PowerShell:

```powershell
docker compose --parallel 1 build frontend asset-service
docker compose up -d --wait --wait-timeout 300
```

Then refresh http://localhost:8088 and sign in. Existing accounts and admin roles
remain in the same PostgreSQL volume. This update requires no database migration.

## What changed

- Live is the default. A saved login cookie restores Live mode after reload.
  Sign-in and registration automatically load the live snapshot. Simulation is
  an explicit choice. Connection failures show an error instead of displaying
  simulated assets as Live data.
- Display updates are batched every two seconds. Sensor-specific EMA, change
  thresholds and rate limits reduce jitter. Large isolated jumps are held;
  three consistent samples confirm a sustained change.
- Invalid, duplicate, old, future and out-of-order packets are ignored. Display
  filtering freezes when a channel is stale. Socket status also checks freshness.
- Health uses a slower EMA. Server faults and worsening status are shown
  immediately. Recovery requires three confirming readings, and the display
  remains conservative until its health score recovers.
- Temperature arrives through WebSocket. Vibration, load and power refresh every
  ten seconds through the existing assets API and use the same display filter.
- The backend's generated readings now use bounded noise and a pull toward the
  startup baseline instead of an unbounded random walk. Normal generated readings
  do not steadily deteriorate merely because the server has been running longer.
  Manual overrides still trigger fault evaluation immediately.
- Fleet health is calculated from displayed asset scores rather than retaining
  a stale startup summary. Display trends start fresh for each Live session.

API endpoint paths and payloads are unchanged. The current asset service generates
telemetry; containerizing it does not connect physical machine sensors. Display
smoothing never changes stored measurements or upgrades reported faults to healthy.
Existing low health values are preserved at startup; this update does not silently
reset your machines or clear faults. The existing explicit reset remains available
for demo assets if you intend to reset them.

## Tuning

`frontend/src/services/telemetryStabilizer.ts` contains `TELEMETRY_CONFIG` and
per-sensor policies. Defaults: EMA alpha 0.2; health alpha 0.15; display interval
2000 ms; stale interval 15000 ms. Temperature display rate is capped at 0.25 C/s.
Rebuild the frontend after changing these values.

## Validation

TypeScript project checks passed. Deterministic filter tests passed for EMA,
spikes, sustained steps, rate limiting, invalid/duplicate packets, fault alerts,
confirmed recovery, stale freezing and session reset. Run them inside `frontend`:

```powershell
npm run test:telemetry
```

A complete frontend bundle could not be built in the editing environment because
its extracted dependencies contain Windows native bindings, not Linux bindings.
Docker builds install the platform's dependencies with `npm ci`.
Docker and a Java compiler are unavailable in that environment, so full Spring
Boot builds and browser/container integration remain to be verified locally.
After rebuilding, confirm sign-in and reload select Live, temperatures change
smoothly, and an explicit fault override still shows Critical immediately.
