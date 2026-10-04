# Frontend and backend integration

For installation and container instructions, see [the project guide](../../MAINTENANCE-UPGRADE.md).

## Start locally

Start the backend from `sentinel-ops`:

```powershell
.\scripts\start-local.ps1 -BackendOnly
```

Start the frontend in a separate terminal:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open **http://127.0.0.1:5173/**. Starting Vite alone does not start the backend.

## Development proxies

| Browser path | Backend destination | Purpose |
| --- | --- | --- |
| `/api` | `http://127.0.0.1:8080` | REST through the gateway |
| `/ws` | `ws://127.0.0.1:8081` | Asset telemetry stream |

Use the existing same-origin defaults. `VITE_API_BASE_URL` and `VITE_WS_URL` optionally override them. Both `localhost` and `127.0.0.1` refer to this computer; keep one hostname throughout a session for the authentication cookie.

## Authentication and permissions

- Sign in before viewing either mode.
- REST requests include the HttpOnly `sentinel_token` cookie; JWTs are not stored in JavaScript.
- Registration accepts `name`, `email`, and `password`. New accounts receive `VIEWER`.
- Provision elevated roles through a trusted backend process.
- The gateway enforces role permissions; frontend controls also reflect the account role.

| Role | Main access | LIVE actions |
| --- | --- | --- |
| `ADMIN` | All available pages | All supported actions |
| `RELIABILITY_ENGINEER` | All available pages | Maintenance, inventory, suppliers, AI |
| `TECHNICIAN` | Dashboard, assets, work orders, inventory | Work-order actions and parts consumption |
| `EXECUTIVE_VIEWER` | Dashboard, assets, work orders, suppliers | Read-only records |
| `VIEWER` | Dashboard and assets | Read-only records |

Architecture and failure demonstration pages appear only in SIMULATION. Simulation role previews do not elevate the backend account.

## Mode behavior

| Behavior | LIVE | SIMULATION |
| --- | --- | --- |
| Starting records | Backend records | Copy of current displayed LIVE records |
| Readings | Backend-generated demo telemetry | Captured readings with temporary overrides |
| Operational actions | Persisted in PostgreSQL | Isolated browser state |
| Documents | Persistent Qdrant library | Separate in-memory session library |
| Reload or exit | Restore persistent records | Discard temporary changes |

Critical incidents generate automatic work orders without an AI call. Incident links prevent duplicate tickets. Simulation faults evaluate immediately, including while paused.

## REST contracts

All paths below use the gateway origin. `src/services/domainAdapters.ts` maps DTOs to frontend models.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/me` | Account and role |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/register` | Register a viewer |
| `POST` | `/api/auth/logout` | Sign out |
| `GET` | `/api/assets` | Fleet and readings |
| `GET` | `/api/dashboard/summary` | Fleet totals and trend |
| `GET`, `POST` | `/api/work-orders` | List or create work orders |
| `GET` | `/api/parts` | Inventory |
| `GET` | `/api/parts/movements` | Recent stock movements |
| `GET` | `/api/suppliers` | Supplier directory |
| `POST` | `/api/suppliers/orders/{id}/receive` | Receive a supplier suggestion once |
| `GET`, `POST` | `/api/ai/documents` | List or attach documents |
| `DELETE` | `/api/ai/documents/{id}` | Remove a document |
| `DELETE` | `/api/ai/documents/simulation/{sessionId}` | Reset a temporary library |
| `POST` | `/api/ai/chat` | Maintenance question |

Work-order status, assignments, parts usage, notifications, and AI analysis/forecast/draft calls are wrapped in `src/services/liveApi.ts`. Simulation operational actions use local context services rather than LIVE write endpoints.

## Telemetry

The browser connects through `/ws/simulation`. Messages include machine and sensor identity, readings, timestamps, status, and telemetry source.

- Generated LIVE updates arrive approximately every four seconds.
- Shared handling validates and smooths incoming readings.
- Delayed or disconnected machines retain their last valid reading.
- Missing readings are never replaced with zero or random values.
- Generated demo readings are labeled and do not represent physical equipment.

## Documents and AI

Attach PDF, DOCX, UTF-8 TXT, or Markdown files up to **10 MB**. The gateway forwards multipart bytes unchanged; the AI service validates size and format. Scanned PDFs require OCR first.

Leave `QDRANT_URL`, `QDRANT_API_KEY`, and `QDRANT_PATH` blank for local embedded storage. Set a URL and optional key for an external server. Provider keys stay on the backend.

AI results have loading, error, and unavailable states. Review a drafted work order before saving it. Suggested parts are not automatically consumed.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Port 8081 refused | Start the backend services |
| Gateway unreachable | `/actuator/health` on port 8080 |
| Sign-in issues | One hostname; auth service on port 8084 |
| Upload fails | Displayed error, supported format, 10 MB limit |
| Library unavailable | `/api/ai/health` on port 8083 and Qdrant settings |
| Too many requests | `Retry-After`; gateway and provider quotas are separate |

## Frontend checks

Run from `frontend`:

```powershell
npm run lint
npm run build
npm run test:telemetry
node tests/searchRecords.test.mjs
node --experimental-strip-types tests/simulationWorkflow.test.mjs
```
