@echo off
title Web Remote Mouse - Background Starter
cd /d "%~dp0"

echo ================================================================
echo          Starting Web Remote Mouse in Background...
echo ================================================================
echo.

:: Clear any stale process listening on port 3443
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3443" ^| findstr "LISTENING"') do (
    echo [INFO] Closing old instance PID: %%P...
    taskkill /F /PID %%P >nul 2>&1
    ping -n 2 127.0.0.1 >nul
)
taskkill /F /IM controller.exe >nul 2>&1

:: Launch hidden background process
start "" "%SystemRoot%\System32\wscript.exe" "%~dp0start-hidden.vbs"
ping -n 3 127.0.0.1 >nul

:: Get LAN IP
set "MY_IP=192.168.0.105"
if exist "scripts\get-ip.js" (
    for /f %%A in ('node scripts\get-ip.js 2^>nul') do set "MY_IP=%%A"
)

:: Verify port 3443
set "IS_RUNNING=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3443" ^| findstr "LISTENING"') do (
    set "IS_RUNNING=1"
    set "RUN_PID=%%P"
)

if "%IS_RUNNING%"=="1" (
    echo  [OK] SERVER IS ACTIVE IN BACKGROUND!
    echo  [OK] Process ID: %RUN_PID%
    echo  [OK] Mobile URL: https://%MY_IP%:3443
    echo.
    echo  You can now close this window. The server continues running silently!
) else (
    echo  [WARN] Server starting up. Check status using: check-status.bat
)

echo.
echo ================================================================
echo.
pause
