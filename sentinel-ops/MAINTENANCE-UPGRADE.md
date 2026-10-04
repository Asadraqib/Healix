# Healix | Siemens AG

This upgrade extends the existing React, Spring Boot, PostgreSQL, and FastAPI application. Siemens AG is the client label used in the header. Windows Segoe UI is used when installed, with Arial fallback; proprietary font binaries are not bundled.

## Contents

- [LIVE and SIMULATION](#live-and-simulation)
- [Maintenance assistant and documents](#maintenance-assistant-and-documents)
- [Local startup](#local-startup)
- [Containers](#containers)
- [Inventory catalog](#inventory-catalog)
- [Telemetry persistence](#telemetry-persistence)
- [API changes](#api-changes)
- [Connecting equipment later](#connecting-equipment-later)
- [Verification commands](#verification-commands)
- [Request limits](#request-limits)

## LIVE and SIMULATION

| Behavior | LIVE | SIMULATION |
| --- | --- | --- |
| Fleet | Backend assets and readings | Copy of displayed LIVE assets and readings |
| Changes | Persisted in PostgreSQL | Temporary browser state |
| Documents | Persistent Qdrant storage | In-memory session storage |
| Reload or mode exit | Restore saved records | Discard temporary changes |

### LIVE workflow

Sign in before accessing either mode. LIVE receives backend-generated demo telemetry; these readings do not come from connected equipment. LIVE telemetry, alarms, work orders, assignments, resolutions, notifications, inventory movements, and supplier order receipts are persisted in PostgreSQL. Record part usage explicitly from an open, compatible work order. Critical threshold incidents create automatic work orders; a unique incident reference prevents duplicates even after a ticket is closed while the same alarm remains active.

Migration V4 archives and removes only recognizable, unchanged original sample work orders. Their audit copies remain in `maintenance.archived_seed_records`. Existing operational incidents are retained. Alerts are created from threshold evaluations rather than seeded records.

### SIMULATION workflow

- Start with a deep copy of current LIVE assets, readings, thresholds, work orders, inventory, notifications, alarms, supplier suggestions, and loaded stock history.
- Keep readings anchored to that snapshot until changed.
- Use the failure controls and simulation or architecture pages in this mode only.
- Evaluate failure controls immediately, including while paused.
- Create one virtual ticket per critical incident. Resolved tickets remain closed while the same alarm persists.
- Keep stock movements and maintenance actions local.
- Clear temporary records on mode exit or reload.
- Store simulation documents in a separate in-memory Qdrant collection per session.

The gateway rejects operational writes carrying `X-Healix-Mode: SIMULATION`.

### Search and suppliers

Global search finds assets, work orders including maintenance descriptions, parts by SKU, and suppliers. Results respect role visibility and open the corresponding details. Supplier catalog buttons show the supplier's recorded parts. Directory entries are clearly labeled samples; supplier orders are procurement suggestions, not purchase orders transmitted to suppliers.

## Maintenance assistant and documents

Install the updated `services/ai-service/requirements.txt` into the existing AI virtual environment. Configure `GROQ_API_KEY` and an account-supported `GROQ_MODEL` on the backend only. Provider errors and missing manuals are shown explicitly.

The assistant supports general prompts, asset analysis, forecasts, reviewed work-order drafts, and manual-based questions. Press Enter or click Send; Shift+Enter inserts a new line. Review the editable title, description, priority, and suggested parts before confirming a draft. Suggested parts are not automatically consumed.

Attach PDF, DOCX, UTF-8 TXT, or Markdown documents from the computer, up to 10 MB. LIVE extracted text and metadata persist in Qdrant. Answers show the retrieved filename and section references. Relevant extracts and maintenance context are sent to the configured Groq provider. Scanned PDFs need OCR before upload; encrypted PDFs are unsupported.

Local startup uses persistent embedded Qdrant under `.runtime/qdrant`. Set `QDRANT_PATH` to change the location. To use an external server, set `QDRANT_URL` and, if required by that server, `QDRANT_API_KEY`. Retrieval currently uses deterministic token-hash vectors with cosine similarity and word-overlap checks; neural semantic embeddings and OCR are not implemented. Do not treat forecasts as certified equipment diagnostics.

### Qdrant configuration

| Setting | Local setup | External server |
| --- | --- | --- |
| `QDRANT_URL` | Leave blank | Server URL |
| `QDRANT_API_KEY` | Leave blank | Key if required |
| `QDRANT_PATH` | Blank uses `.runtime/qdrant` | Leave blank |

The gateway forwards document uploads unchanged. The AI service checks supported formats and the **10 MB** limit.

## Local startup

### Prerequisites

Prerequisites: Node.js/npm, JDK 25 or later, Maven, Python with a virtual environment, and PostgreSQL configured through the existing service environment files. `.m2` is Maven's downloaded dependency cache, not a separate installation. Keep it ignored by Git.

### Start services

From `sentinel-ops` in PowerShell:

```powershell
services/ai-service/.venv/Scripts/python.exe -m pip install -r services/ai-service/requirements.txt
# Build each Spring service from its own directory:

# mvn package

./scripts/start-local.ps1 -BackendOnly
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. Frontend development proxies `/api` through the gateway. `localhost` and `127.0.0.1` both refer to this computer; stay on one hostname for the authentication cookie.

### Health checks and logs

| Service | Port | Health endpoint |
| --- | --- | --- |
| Gateway | 8080 | `/actuator/health` |
| Assets | 8081 | `/actuator/health` |
| Maintenance | 8082 | `/actuator/health` |
| AI | 8083 | `/api/ai/health` |
| Authentication | 8084 | `/actuator/health` |

AI health includes provider configuration and document-library readiness. Local process IDs and logs are recorded in `.runtime`. Stop only the matching Healix processes when rebuilding their running JARs.

## Containers

Install Docker Desktop with Compose. Copy `.env.example` to `.env` and supply your own PostgreSQL password and shared JWT secret (at least 32 ASCII characters). Add the optional Groq key/model. Do not commit `.env` or real credentials.

```powershell
docker compose up --build -d
docker compose ps
docker compose logs --tail 100
docker compose down
```

Open `http://127.0.0.1:8088`. Compose includes the frontend, four Spring services, FastAPI, PostgreSQL, and Qdrant. Containers address each other by service name; browser access uses localhost. PostgreSQL and Qdrant use named `postgres-data` and `qdrant-data` volumes. Ordinary `down` preserves those volumes. The AI service is configured to use the internal Qdrant server. Only the frontend and gateway publish host ports. Existing image health checks govern service startup; AI health reports document-library readiness separately.

Docker is not installed in the current development environment, so container startup and server-Qdrant interoperability still need verification on a Docker host. The local services and embedded Qdrant have been verified.

## Inventory catalog

| Machine type | Sample part coverage |
| --- | --- |
| CNC | Tooling, cooling, lubrication |
| Robot | Joints, feedback, cabling |
| Inverter | Electrical and cooling parts |
| Hydraulic press | Pumps, valves, filters, seals |
| Chiller | Refrigeration and cooling components |

New DEMO SKUs and costs are planning examples, not verified OEM bills of materials. Validate the machine model, serial number, OEM part number, and rated compatibility before procurement.

## Telemetry persistence

LIVE broadcasting now runs independently of database persistence. Generated snapshot updates and sensor history are batched into two SQL statements on a separate scheduler thread, avoiding dozens of network database round trips blocking the four-second stream. Online counts reflect fresh records; delayed or disconnected readings remain visible.

## API changes

- `GET /api/parts/movements`: up to 2,000 recent persistent stock movements, captured with the virtual snapshot.
- `POST /api/suppliers/orders/{id}/receive`: transactional, idempotent stock receipt.
- `GET/POST /api/ai/documents`: list and attach documents. Optional `mode` and `sessionId` select an isolated simulation library.
- `DELETE /api/ai/documents/{id}`: remove indexed document text.
- `DELETE /api/ai/documents/simulation/{sessionId}`: reset temporary document library.
- `POST /api/ai/chat`: free-form maintenance prompt; existing analyze, forecast, diagnose, and draft endpoints remain available.
- Work-order responses include serialized triggering readings. Migration V4 adds incident links and seed archive storage.
- Migration V5 adds 31 sample maintenance parts, bringing the catalog to 36 entries. These cover all five machine types but are planning examples, not a verified complete OEM bill of materials. Confirm model-specific manuals and part numbers before procurement.

## Connecting equipment later

Use the asset service's existing registration and telemetry ingestion API boundary (`AssetController` and `AssetTelemetryCatalog`). Keep device protocol adapters on the backend; normalize equipment readings into the established asset/sensor contract so dashboard components continue to use the same telemetry pipeline. Set the registered machine's source to connected equipment and disable generated telemetry for connected machines. Authenticate and network-isolate device adapters before deployment. Supply valid timestamps and machine-specific thresholds; the frontend retains the last valid reading and marks delayed/disconnected data rather than substituting values.

## Verification commands

```powershell
# frontend directory

npm run build
npm run test:telemetry
node tests/searchRecords.test.mjs
node --experimental-strip-types tests/simulationWorkflow.test.mjs
# asset-service directory

mvn -Dtest=TelemetryGenerationTest test
# maintenance-service directory

mvn -Dtest=AlarmPolicyTest,WorkflowServiceTest test
# gateway-service directory

mvn test
# ai-service directory

.venv/Scripts/python.exe -m unittest test_document_library test_ai_routes -v
```

Tests cover stock validation and idempotent supplier receipts, upload API errors and unavailable providers, threshold boundaries and falling thresholds, invalid readings, search permissions and mode-scoped records, telemetry stabilization/staleness, document validation, source references, LIVE document persistence, and simulation isolation/reset. Full signed-in browser workflow checks require a normal test-account login. Existing authentication is preserved.

The local LIVE stream was checked after deployment: successive generated telemetry updates arrived 3.98 and 4.02 seconds apart; all five assets reported online and persistent readings were approximately four seconds old. Frontend build, simulation workflow, telemetry and search checks passed, along with the targeted asset and maintenance backend tests. Simulation tests cover snapshot isolation, immediate failure evaluation, duplicate prevention, resolution and recurring incidents.

## Request limits

| Setting | Default |
| --- | --- |
| `GATEWAY_RATE_LIMIT_PER_MINUTE` | 300 requests per client IP |
| `GATEWAY_RATE_LIMIT_WINDOW_SECONDS` | 60 seconds |
| Background record refresh | 15 seconds |

Configure gateway limits in the root environment. Telemetry streams independently. A 429 response includes `Retry-After`; automatic polling waits for that cooldown. AI provider quotas are separate and cannot be increased through gateway settings.
