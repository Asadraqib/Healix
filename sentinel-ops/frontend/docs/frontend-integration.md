# Frontend and Spring Boot Integration

Run Vite from this directory with `npm run dev`. The checked-in example uses the existing local service addresses:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8081/ws/simulation
```

The header switches between `SIMULATION` and `LIVE` without restarting Vite. LIVE mode uses the Spring Cloud Gateway for REST and connects directly to the asset service WebSocket because the gateway does not proxy WebSockets. Use `localhost` rather than `127.0.0.1`; the backend CORS configuration allows `http://localhost:*`.

## REST contract

| Method | Path | Frontend behavior |
|---|---|---|
| `GET` | `/api/auth/me` | Read the current cookie session |
| `POST` | `/api/auth/login` | Sign in and receive the HttpOnly `sentinel_token` cookie |
| `POST` | `/api/auth/logout` | Clear the cookie session |
| `GET` | `/api/assets` | Load asset records |
| `GET` | `/api/dashboard/summary` | Load live fleet totals, health, alarms, and trend |
| `GET` | `/api/work-orders` | Load maintenance work orders |
| `POST` | `/api/work-orders` | Create with `assetId`, `title`, optional `priority`, `owner`, and `due` |
| `GET` | `/api/parts` | Load inventory records |
| `GET` | `/api/suppliers` | Load supplier records |
| `POST` | `/api/simulation/{machineId}/override` | Send `value` and optional `holdSeconds` |
| `POST` | `/api/simulation/{machineId}/reset` | Reset a simulated machine |
| `POST` | `/api/ai/diagnose` | Send `machineId` and `question` to the AI service |

All browser REST calls include credentials; JWTs are not stored in JavaScript. The app maps service DTOs into the existing UI model and does not invent missing telemetry fields. The current services do not expose work-order status updates or inventory reorder operations, so those actions remain simulation-only.

## Accounts and role access

The account menu provides sign-out through `POST /api/auth/logout`. Registration sends only the supported `name`, `email`, and `password` fields to `POST /api/auth/register`; the auth service assigns new accounts the `VIEWER` role. The client does not offer self-selection of elevated roles. An administrator must assign an elevated role through a trusted server-side process.

Navigation and action controls are filtered by the role returned from `/api/auth/me`. The current gateway validates that a session exists but does not enforce per-role authorization on REST routes. These client-side restrictions are therefore usability controls, not a security boundary; enforce the same role matrix in the backend before using it for sensitive operations.

| Role | Available workspace | Mutations |
|---|---|---|
| `ADMIN` | All pages | All supported actions |
| `RELIABILITY_ENGINEER` | All pages | Overrides, resets, work orders, inventory simulation, and AI diagnosis |
| `TECHNICIAN` | Dashboard, simulation, assets, work orders, inventory | Overrides, resets, and work-order actions |
| `EXECUTIVE_VIEWER` | Dashboard, assets, work orders, suppliers, architecture | Read-only |
| `VIEWER` | Dashboard and assets | Read-only |

Only `ADMIN` and `VIEWER` are currently issued by the auth service; the other roles are supported by the client if provisioned by a trusted backend process.

## Telemetry WebSocket

Connect to `ws://localhost:8081/ws/simulation`. Messages include `machineId`, `sensorType`, `value`, `healthScore`, `status`, and `recordedAt`. The client reconnects after disconnects. The current scheduler publishes temperature messages; the override endpoint changes temperature only.