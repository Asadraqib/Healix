# Healix | Siemens AG

This upgrade extends the existing React, Spring Boot, PostgreSQL, and FastAPI application. Siemens AG is the client label used in the header. Windows Segoe UI is used when installed, with Arial fallback; proprietary font binaries are not bundled.

## LIVE and SIMULATION

Sign in before accessing either mode. LIVE receives backend-generated demo telemetry; these readings do not come from connected equipment. LIVE telemetry, alarms, work orders, assignments, resolutions, notifications, inventory movements, and supplier order receipts are persisted in PostgreSQL. Record part usage explicitly from an open, compatible work order. Critical threshold incidents create automatic work orders; a unique incident reference prevents duplicates even after a ticket is closed while the same alarm remains active.

Migration V4 archives and removes only recognizable, unchanged original sample work orders. Their audit copies remain in `maintenance.archived_seed_records`. Existing operational incidents are retained. Alerts are created from threshold evaluations rather than seeded records.

SIMULATION starts with a deep copy of the current LIVE assets, displayed readings, thresholds, work orders, inventory, notifications, alarms, supplier suggestions, and loaded stock history. Readings stay anchored to that captured LIVE snapshot until changed. Failure controls, the simulation page, and the architecture page appear only in this mode. Failure controls evaluate readings immediately, including while paused. Critical incidents create a single virtual ticket; resolved tickets remain closed while the same alarm persists. Stock movements and maintenance actions stay local. Leaving simulation or reloading clears temporary records. Simulation document attachments use a separate in-memory Qdrant collection per session; they do not write to the LIVE document library. The gateway rejects operational writes carrying `X-Healix-Mode: SIMULATION`.

Global search finds assets, work orders including maintenance descriptions, parts by SKU, and suppliers. Results respect role visibility and open the corresponding details. Supplier catalog buttons show the supplier's recorded parts. Directory entries are clearly labeled samples; supplier orders are procurement suggestions, not purchase orders transmitted to suppliers.

## Maintenance assistant and documents

Install the updated `services/ai-service/requirements.txt` into the existing AI virtual environment. Configure `GROQ_API_KEY` and an account-supported `GROQ_MODEL` on the backend only. Provider errors and missing manuals are shown explicitly.

The assistant supports general prompts, asset analysis, forecasts, reviewed work-order drafts, and manual-based questions. Press Enter or click Send; Shift+Enter inserts a new line. Review the editable title, description, priority, and suggested parts before confirming a draft. Suggested parts are not automatically consumed.

Attach PDF, DOCX, UTF-8 TXT, or Markdown documents from the computer, up to 10 MB. LIVE extracted text and metadata persist in Qdrant. Answers show the retrieved filename and section references. Relevant extracts and maintenance context are sent to the configured Groq provider. Scanned PDFs need OCR before upload; encrypted PDFs are unsupported.

Local startup uses persistent embedded Qdrant under `.runtime/qdrant`. Set `QDRANT_PATH` to change the location. To use an external server, set `QDRANT_URL` and, if required by that server, `QDRANT_API_KEY`. Retrieval currently uses deterministic token-hash vectors with cosine similarity and word-overlap checks; neural semantic embeddings and OCR are not implemented. Do not treat forecasts as certified equipment diagnostics.

## Local startup

Prerequisites: Node.js/npm, JDK 25 or later, Maven, Python with a virtual environment, and PostgreSQL configured through the existing service environment files. `.m2` is Maven's downloaded dependency cache, not a separate installation. Keep it ignored by Git.

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

Health checks: Spring services expose `/actuator/health` on ports 8080, 8081, 8082, and 8084. AI exposes `/api/ai/health` on port 8083, including provider configuration and document-library readiness. Local process IDs and logs are recorded in `.runtime`. Stop only the matching Healix processes when rebuilding their running JARs.

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

The sample maintenance catalog now covers CNC tooling/cooling/lubrication, robot joints/feedback/cabling, inverter electrical/cooling parts, hydraulic pumps/valves/filters/seals, and chiller refrigeration/cooling components. New DEMO SKUs and costs are planning examples, not verified OEM bills of materials. Validate exact machine model, serial number, OEM part number, and rated compatibility before procurement.

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

Gateway API traffic defaults to 300 requests per client IP per 60-second window. Configure `GATEWAY_RATE_LIMIT_PER_MINUTE` and `GATEWAY_RATE_LIMIT_WINDOW_SECONDS` in the root environment. Background records refresh every 15 seconds while telemetry streams independently. A 429 response includes `Retry-After`; automatic read polling waits for that cooldown. AI provider quotas are separate and cannot be increased by changing the gateway limit.
