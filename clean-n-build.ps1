# Girgit – Clean & Build Script

$ErrorActionPreference = "Stop"

$APP_NAME = "girgit"  
$BUILD_COMMAND = "npm run build"

$localAppData = $env:LOCALAPPDATA
$roamingAppData = $env:APPDATA

$userDataPaths = @(
    "$localAppData\$APP_NAME",
    "$roamingAppData\$APP_NAME"
)


Write-Host "Cleaning Electron userData folders..." -ForegroundColor Cyan

foreach ($path in $userDataPaths) {
    if (Test-Path $path) {
        Write-Host " Removing $path"
        Remove-Item -Recurse -Force -Path $path
    } else {
        Write-Host " Not found: $path"
    }
}


$buildDirs = @("dist", "build", "out")

Write-Host "Cleaning build folders..." -ForegroundColor Cyan

foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        Write-Host " Removing .\$dir"
        Remove-Item -Recurse -Force $dir
    }
}

Write-Host " Running build..." -ForegroundColor Green

npm run build

Write-Host "Build completed successfully" -ForegroundColor Green
