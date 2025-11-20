# Simple PowerShell script to start microservices and frontend in separate windows for demo purposes
Write-Host "Starting Collaborative Editing System services..."

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Start-ServiceWindow($path, $command, $title) {
    $ps = "powershell -NoExit -Command cd '$path'; $command"
    Start-Process -FilePath 'powershell' -ArgumentList "-NoExit", "-Command", "cd '$path'; $command" -WindowStyle Normal
}

Start-ServiceWindow "$root\api-gateway" "mvn -q spring-boot:run" "API Gateway"
Start-ServiceWindow "$root\user-management-service" "mvn -q spring-boot:run" "User Management"
Start-ServiceWindow "$root\document-editing-service" "mvn -q spring-boot:run" "Document Editing"
Start-ServiceWindow "$root\version-control-service" "mvn -q spring-boot:run" "Version Control"
Start-ServiceWindow "$root\frontend" "npm run dev" "Frontend"

Write-Host "Started all services (they opened in new windows)." -ForegroundColor Green
