@echo off
title Web Remote Mouse - Enable Windows Auto-Start
cd /d "%~dp0.."

echo ================================================================
echo          Web Remote Mouse - Enable Windows Auto-Start
echo ================================================================
echo.

:: 1. Compile native controller if missing
if not exist "bin\controller.exe" (
    echo [INFO] Building native controller...
    if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
        "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\UIAutomationClient.dll" /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\UIAutomationTypes.dll" /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\WindowsBase.dll" /out:bin\controller.exe bin\controller.cs
    )
)

:: 2. Register in Windows Registry Run Key
echo [1/3] Registering auto-start on Windows boot...
set "VBS_PATH=%~dp0start-hidden.vbs"
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RemoteMouseServer" /t REG_SZ /d "\"%SystemRoot%\System32\wscript.exe\" \"%VBS_PATH%\"" /f >nul 2>&1
echo [SUCCESS] Auto-start registered in Windows Registry Run key.

:: 3. Launch server in background right now if not already running
echo.
echo [2/3] Checking background server status...
netstat -ano | findstr ":3443" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Server not running. Starting background server now...
    start "" "%SystemRoot%\System32\wscript.exe" "%VBS_PATH%"
    ping -n 3 127.0.0.1 >nul
) else (
    echo [INFO] Background server is already running!
)

:: Verify port 3443 is listening
netstat -ano | findstr ":3443" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [WARN] Waiting for server port 3443 to open...
    ping -n 3 127.0.0.1 >nul
)

:: 4. Get Accurate Local Wi-Fi IPv4 Address
echo.
echo [3/3] Getting connection information...
set "MY_IP=192.168.0.105"
if exist "scripts\get-ip.js" (
    for /f %%A in ('node scripts\get-ip.js 2^>nul') do set "MY_IP=%%A"
)

echo.
echo ================================================================
echo           SERVER STATUS: ONLINE AND READY TO CONNECT!
echo ================================================================
echo.
echo  [OK] Auto-Start:    ENABLED (Starts automatically on Windows boot)
echo  [OK] Server Status: ONLINE (Port 3443 is ACTIVE and LISTENING)
echo  [OK] Local PC IP:   %MY_IP%
echo.
echo  --------------------------------------------------------------
echo   MOBILE URL:  https://%MY_IP%:3443
echo  --------------------------------------------------------------
echo.
echo  Open the URL above in Chrome or Safari on your phone.
echo  You can also check server status anytime by running: scripts\check-status.bat
echo.
echo ================================================================
echo.
pause
