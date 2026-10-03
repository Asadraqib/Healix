For the latest live-reading and login changes, see `LIVE-READINGS-UPDATE.md`.

# Run Healix with Docker

This package contains the uploaded Healix application with Docker support for
all five backend services, the React frontend, and a local PostgreSQL database.
Run commands from `sentinel-ops`, beside `compose.yaml`.

## Requirements

- Docker Desktop with Linux containers and Docker Compose v2, running.
- Internet access for the first build (Docker images, Maven, npm, and PyPI).
- Optional Groq API key for AI features; without it, the AI service reports that setup is required.
- Around 6 GB of available Docker memory is a practical starting point for builds.

You do not need Java, Maven, Node, Python, or PostgreSQL installed on your computer.
The images use Java 25, Node 24, and Python 3.12. Existing Maven and npm versions
are preserved; Python dependency versions come from the uploaded environments.

## Local development dependencies (without Docker)

- JDK 25 or newer for the Spring Boot services.
- Maven, or the included Maven wrapper in each Java service.
- Node.js and npm for the frontend (the frontend Docker build uses Node 24).
- Python and a virtual environment with `services/ai-service/requirements.txt` installed.
- Access to a configured PostgreSQL database, plus the service environment settings.

`.m2` is Maven's automatically populated dependency cache, not a separate
dependency to install. This workspace uses a cache at `Healix/.m2/repository`
because the default Maven cache location was not writable. From any Java service
directory, build with a path to that cache, for example:

```powershell
mvn "-Dmaven.repo.local=C:/path/to/Healix/.m2/repository" package
```

Replace the example path with your checkout's absolute path. Maven downloads the
dependencies declared in each service's `pom.xml`. The cache is ignored by Git;
deleting it requires those dependencies to be downloaded again. Docker builds
manage their own Maven cache inside the build environment.

## Start on Windows PowerShell

1. Extract the ZIP. Open PowerShell in `sentinel-ops`.
2. Create the root environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env`. Set `POSTGRES_PASSWORD`, `JWT_SECRET`, and `GROQ_API_KEY`.
   Use at least 32 ASCII characters for the JWT secret. Generate a secret with:

   ```powershell
   $secretBytes = New-Object byte[] 48
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $rng.GetBytes($secretBytes)
   [Convert]::ToBase64String($secretBytes)
   $rng.Dispose()
   ```

   Copy the printed value into `JWT_SECRET`. Auth and gateway receive the same
   value automatically. The example intentionally contains no real credentials.

4. Validate and start:

   ```powershell
   docker compose config --quiet
   docker compose up --build -d --wait --wait-timeout 300
   docker compose ps
   ```

5. Open http://localhost:8088. Register a user on this fresh local database, then
   sign in and check fleet readings, inventory, and work orders.

Linux/macOS: use `cp .env.example .env`, fill the same values, then use the same
Docker commands.

## Services

| Container | Internal port | Purpose |
| --- | --- | --- |
| frontend | 8080 | Nginx serves the React build and proxies API/WebSocket traffic |
| gateway-service | 8080 | Routes existing API endpoints and validates sessions |
| asset-service | 8081 | Assets, dashboard, simulation, live WebSocket readings |
| maintenance-service | 8082 | Work orders, parts, suppliers |
| ai-service | 8083 | FastAPI diagnostics using Groq |
| auth-service | 8084 | Registration, login, JWT session cookies |
| postgres | 5432 | Local database, stored in a named volume |

Only the frontend (`localhost:8088`) and gateway (`localhost:8080`) are published
on your computer. Set `FRONTEND_PORT` or `GATEWAY_PORT` in `.env` if occupied.
The frontend uses its own origin for `/api` and `/ws/simulation`, so changing
`FRONTEND_PORT` does not require a frontend rebuild. Use `localhost` in the
browser: the existing services' origin policies allow localhost.

Compose waits for PostgreSQL health before starting database services, then for
backend health before starting the gateway and frontend. Each service has a
health check and a restart policy. Flyway applies the existing migrations and
seed data in the local database. Java and AI runtimes run as an unprivileged user.

This setup uses a fresh local database, not your existing cloud database; cloud
users and records are not copied. Backend API paths and payloads are unchanged.

## Verify and troubleshoot

```powershell
docker compose config --quiet
docker compose ps
docker compose logs --tail=100
curl.exe -f http://localhost:8088/healthz
curl.exe -f http://localhost:8080/actuator/health
docker compose exec asset-service curl -fsS http://localhost:8081/actuator/health
docker compose exec maintenance-service curl -fsS http://localhost:8082/actuator/health
docker compose exec auth-service curl -fsS http://localhost:8084/actuator/health
docker compose exec ai-service python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8083/api/ai/health').read().decode())"
```

On Linux/macOS, use `curl` instead of `curl.exe`. In browser developer tools,
confirm `/ws/simulation` returns status 101 and receives messages. After
registering and signing in, check `/api/assets` and `/api/work-orders` return 200.
For AI verification, send a diagnosis request through the dashboard; its health
check only verifies the HTTP service, not whether your key or model is accepted.

If Compose reports a missing environment variable, edit the root `.env`.
If it reports a dependency unhealthy, inspect that service's logs. The first
image build can take several minutes. If a registry dependency version is
unavailable, inspect the build log; existing Java/Node dependency versions have
not been changed by this containerization work.

The existing AI implementation calls the session-protected gateway without a
session cookie, so its telemetry fetches can fall back to "unavailable". This is
an existing application behavior, separate from container networking. Its Groq
model selection is also retained from the uploaded source.

## Daily commands

```powershell
docker compose logs -f gateway-service
docker compose up --build -d --wait --wait-timeout 300
docker compose down
```

`down` stops containers while retaining database data. To deliberately delete
all local records and start again, use `docker compose down -v`. Keep `.env`
private; credentials from the uploaded archive are excluded from this package
and from Docker build contexts.

## Validation performed

- Parsed Compose YAML and checked all seven services, build paths, and dependency references.
- Parsed all four Maven POM files after adding gateway Actuator health support.
- Checked relative WebSocket URLs for HTTP/HTTPS, changed host ports, and the
  existing absolute localhost development URL; checked the same-origin API base.
- Checked the archive contains no `.env`, `.env.properties`, local dependencies,
  or generated build output.

Full Docker image builds, `docker compose config`, and container integration
checks could not run in the editing workspace because Docker is unavailable.
The frontend dependency install also could not run offline because the required
packages are not cached. Run the validation/start commands above on your machine.
