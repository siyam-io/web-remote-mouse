@echo off
title Remote Mouse Server - Status Check
cd /d "%~dp0.."

:check
cls
echo ================================================================
echo             WEB REMOTE MOUSE - STATUS MONITOR
echo ================================================================
echo.

set "MY_IP=192.168.0.105"
if exist "scripts\get-ip.js" (
    for /f %%A in ('node scripts\get-ip.js 2^>nul') do set "MY_IP=%%A"
)

:: Check port 3443
set "IS_RUNNING=0"
set "SERVER_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3443" ^| findstr "LISTENING"') do (
    set "IS_RUNNING=1"
    set "SERVER_PID=%%P"
)

if "%IS_RUNNING%"=="1" goto :server_online
goto :server_offline

:server_online
echo  [STATUS]      SERVER IS ONLINE AND RUNNING!
echo  [PORT]        3443 [HTTPS Secure Active]
echo  [PROCESS ID]  %SERVER_PID%
echo  [LOCAL IP]    %MY_IP%
echo.
echo  --------------------------------------------------------------
echo   MOBILE URL:  https://%MY_IP%:3443
echo  --------------------------------------------------------------
echo.
echo  Your mobile device can connect now!
echo.
echo ================================================================
echo  OPTIONS:
echo   [1] Open Mobile URL in default browser
echo   [2] Restart Server
echo   [3] Stop Server
echo   [4] Refresh Status
echo   [5] Exit
echo ================================================================
set "opt="
set /p opt="Enter choice [1-5]: "
if "%opt%"=="1" (
    start "" "https://%MY_IP%:3443"
    goto :check
)
if "%opt%"=="2" (
    echo [INFO] Stopping server PID %SERVER_PID%...
    taskkill /F /PID %SERVER_PID% >nul 2>&1
    taskkill /F /IM controller.exe >nul 2>&1
    ping -n 2 127.0.0.1 >nul
    echo [INFO] Starting server...
    start "" "%SystemRoot%\System32\wscript.exe" "%~dp0start-hidden.vbs"
    ping -n 3 127.0.0.1 >nul
    goto :check
)
if "%opt%"=="3" (
    echo [INFO] Stopping server...
    taskkill /F /PID %SERVER_PID% >nul 2>&1
    taskkill /F /IM controller.exe >nul 2>&1
    echo Server stopped.
    ping -n 2 127.0.0.1 >nul
    goto :check
)
if "%opt%"=="4" goto :check
if "%opt%"=="5" exit /b 0
goto :check

:server_offline
echo  [STATUS]      SERVER IS OFFLINE [Not Running]
echo  [PORT]        3443 [Closed]
echo  [LOCAL IP]    %MY_IP%
echo.
echo ================================================================
echo  OPTIONS:
echo   [1] Start Server [Visible Console Window]
echo   [2] Start Server [Silent Background Mode]
echo   [3] Refresh Status
echo   [4] Exit
echo ================================================================
set "opt="
set /p opt="Enter choice [1-4]: "
if "%opt%"=="1" (
    start "Remote Mouse Server" cmd.exe /k "node server.js"
    ping -n 3 127.0.0.1 >nul
    goto :check
)
if "%opt%"=="2" (
    start "" "%SystemRoot%\System32\wscript.exe" "%~dp0start-hidden.vbs"
    ping -n 3 127.0.0.1 >nul
    goto :check
)
if "%opt%"=="3" goto :check
if "%opt%"=="4" exit /b 0
goto :check

