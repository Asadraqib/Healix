param([switch]$BackendOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
function Import-ServiceEnvironment([string]$path) {
  if (Test-Path -LiteralPath $path) {
    foreach ($line in Get-Content -LiteralPath $path) {
      if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim().Trim('"').Trim("'"), 'Process')
      }
    }
  }
}
function Test-Port([int]$port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try { $client.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $client.Dispose() }
}
$servicePorts = @{ 'asset-service'=8081; 'maintenance-service'=8082; 'auth-service'=8084; 'gateway-service'=8080 }
foreach ($service in @('asset-service','maintenance-service','auth-service','gateway-service')) {
  if (Test-Port $servicePorts[$service]) { Write-Output "$service already listening"; continue }
  $serviceDir = Join-Path $projectRoot "services/$service"
  Import-ServiceEnvironment (Join-Path $serviceDir '.env')
  Import-ServiceEnvironment (Join-Path $serviceDir 'src/main/resources/.env.properties')
  Import-ServiceEnvironment (Join-Path $projectRoot '.env')
  $jar = Join-Path $serviceDir "target/$service-0.0.1-SNAPSHOT.jar"
  if (!(Test-Path -LiteralPath $jar)) { throw "Build $service first with mvn package" }
  $process = Start-Process -FilePath 'java' -ArgumentList @('-jar', ('"' + $jar + '"')) -WorkingDirectory $serviceDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir "$service.log") -RedirectStandardError (Join-Path $runtimeDir "$service.err.log")
  $process.Id | Set-Content (Join-Path $runtimeDir "$service.pid")
  Write-Output "$service started (PID $($process.Id))"
}
$aiDir = Join-Path $projectRoot 'services/ai-service'
Import-ServiceEnvironment (Join-Path $aiDir '.env')
Import-ServiceEnvironment (Join-Path $projectRoot '.env')
if (!(Test-Port 8083)) {
  $python = Join-Path $aiDir '.venv/Scripts/python.exe'
  $process = Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','main:app','--host','127.0.0.1','--port','8083') -WorkingDirectory $aiDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'ai-service.log') -RedirectStandardError (Join-Path $runtimeDir 'ai-service.err.log')
  $process.Id | Set-Content (Join-Path $runtimeDir 'ai-service.pid')
  Write-Output "ai-service started (PID $($process.Id))"
}
Write-Output 'Frontend: http://127.0.0.1:5173/ ; Gateway: http://localhost:8080/actuator/health'
