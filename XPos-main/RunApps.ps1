$ErrorActionPreference = "Stop"

Write-Host "Restoring dependencies..."
dotnet restore src\XPos.sln

Write-Host "Starting Web API..."
Start-Process "dotnet" -ArgumentList "run --project src/XPos.WebAPI/XPos.WebAPI.csproj --launch-profile http"

Write-Host "Starting Web Menu (Client)..."
Start-Process "dotnet" -ArgumentList "run --project src/XPos.Client/XPos.Client.csproj --launch-profile http"

Write-Host "Starting Desktop App (Windows)..."
Start-Process "dotnet" -ArgumentList "run --project src/XPos.Mobile/XPos.Mobile.csproj -f net9.0-windows10.0.19041.0"

Write-Host "Starting Mobile App (Android)..."
# This attempts to launch on a connected device or emulator.
Start-Process "dotnet" -ArgumentList "run --project src/XPos.Mobile/XPos.Mobile.csproj -f net9.0-android"
