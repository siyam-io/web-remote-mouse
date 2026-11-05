@echo off
title Revert PC to Automatic DHCP IP
cd /d "%~dp0"

echo ========================================================
echo       Revert PC Network to Automatic Dynamic (DHCP)
echo ========================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Administrator rights required. Requesting elevation...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dp0unlock-pc-dhcp-ip.bat\"\"' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*Default Switch*' -and $_.InterfaceAlias -notlike '*Cloudflare*' } | Select-Object -First 1; ^
   if (-not $adapter) { Write-Host '[ERROR] No active physical network adapter found.' -ForegroundColor Red; exit 1; }; ^
   Write-Host \"Setting $($adapter.InterfaceAlias) back to Automatic DHCP...\" -ForegroundColor Cyan; ^
   netsh interface ip set address name=\"$($adapter.InterfaceAlias)\" dhcp; ^
   netsh interface ip set dns name=\"$($adapter.InterfaceAlias)\" dhcp; ^
   Write-Host '[SUCCESS] Network adapter is now set to Automatic DHCP.' -ForegroundColor Green;"

echo.
pause

