# Frontend ↔ Spring Boot Gateway Contract

The frontend runs in demo mode by default. To enable live mode, copy `.env.example` to `.env`, set `VITE_API_BASE_URL` to the Spring Cloud Gateway base URL, and restart Vite:

```bash
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws/simulation
```

When `VITE_API_BASE_URL` is present, the top-right environment badge switches from **Simulation** to **Live API**. The frontend loads the gateway snapshot and subscribes to WebSocket telemetry. If the gateway is unavailable, it keeps the demo UI alive and shows **Demo mode active** rather than rendering an empty application.

## REST endpoints used

| Method | Path | Frontend use |
|---|---|---|
| `GET` | `/api/assets` | Fleet cards, asset list, dashboard |
| `GET` | `/api/work-orders` | Work-order table and overview |
| `GET` | `/api/parts` | Parts and inventory page |
| `GET` | `/api/suppliers` | Supplier directory |
| `POST` | `/api/simulation/{machineId}/override` | Manual sensor override |
| `POST` | `/api/simulation/{machineId}/reset` | Reset a simulated machine |
| `POST` | `/api/work-orders` | Create a maintenance work order |
| `POST` | `/api/ai/diagnose` | Grounded diagnosis chat |

The list endpoints may return either a raw array or an envelope:

```json
{ "assets": [] }
```

The frontend accepts the following aliases while the services stabilize:

- asset identity: `id`, `machineId`, or `assetId`
- health: `health`, `healthScore`
- machine state: `status`, `state`
- work order identity: `id`, `workOrderId`, or `number`
- inventory quantity: `onHand`, `quantityOnHand`
- inventory threshold: `reorder`, `reorderLevel`

## WebSocket message

Connect the gateway route to `/ws/simulation`. Each message should contain at least:

```json
{
  "machineId": "DRV-001",
  "sensorType": "temperature",
  "value": 74.8,
  "healthScore": 74,
  "status": "WARNING",
  "recordedAt": "2026-09-27T15:42:00Z"
}
```

Supported sensor types include `temperature`, `vibration`, `load`, and `power`. The frontend updates the corresponding metric, bounded trend history, health score, and status without refreshing the page. The connection automatically retries every three seconds after a disconnect.

## Auth

The API adapter sends `credentials: include`, so it works with an HttpOnly cookie-based session. For the JWT gateway design in the implementation guide, add the access-token injection in `src/api.js` or replace `request()` with the project’s auth client. The browser should not receive or store service credentials.