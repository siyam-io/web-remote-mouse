@echo off
title Lock PC Static IP (Prevent IP Change)
cd /d "%~dp0"

echo ========================================================
echo       Lock PC IP to Permanent Static Address
echo ========================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Administrator rights required. Requesting elevation...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dp0lock-pc-static-ip.bat\"\"' -Verb RunAs"
    exit /b
)

echo [1/3] Detecting current active network adapter...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*Default Switch*' -and $_.InterfaceAlias -notlike '*Cloudflare*' } | Select-Object -First 1; ^
   if (-not $adapter) { Write-Host '[ERROR] No active physical network adapter found.' -ForegroundColor Red; exit 1; }; ^
   $ipConfig = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' } | Select-Object -First 1; ^
   $route = Get-NetRoute -InterfaceIndex $adapter.InterfaceIndex -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1; ^
   $gateway = if ($route) { $route.NextHop } else { '192.168.0.1' }; ^
   $currentIp = $ipConfig.IPAddress; ^
   Write-Host \"Adapter: $($adapter.InterfaceAlias)\" -ForegroundColor Cyan; ^
   Write-Host \"Current IP: $currentIp\" -ForegroundColor Yellow; ^
   Write-Host \"Gateway: $gateway\" -ForegroundColor Gray; ^
   Write-Host ''; ^
   Write-Host 'Locking this IP permanently so your router never changes it...'; ^
   netsh interface ip set address name=\"$($adapter.InterfaceAlias)\" static $currentIp 255.255.255.0 $gateway 1; ^
   netsh interface ip set dns name=\"$($adapter.InterfaceAlias)\" static 1.1.1.1; ^
   netsh interface ip add dns name=\"$($adapter.InterfaceAlias)\" 8.8.8.8 index=2; ^
   Write-Host ''; ^
   Write-Host \"[SUCCESS] Your PC IP is now permanently locked to $currentIp!\" -ForegroundColor Green; ^
   Write-Host 'Your router will never change this IP again.' -ForegroundColor Green;"

echo.
echo --------------------------------------------------------
echo If you ever want to revert to automatic DHCP, run:
echo unlock-pc-dhcp-ip.bat
echo --------------------------------------------------------
echo.
pause

