@echo off
title Web Remote Mouse - Enable Windows Auto-Start
cd /d "%~dp0"

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

:: 2. Register in Windows Registry & Startup Folder
echo [1/3] Registering auto-start on Windows boot...
cscript //nologo setup-autostart.vbs
if errorlevel 1 (
    :: Fallback: Add Registry Run key directly via reg command
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RemoteMouseServer" /t REG_SZ /d "\"%SystemRoot%\System32\wscript.exe\" \"%~dp0start-hidden.vbs\"" /f >nul 2>&1
    echo [SUCCESS] Auto-start registered directly via Windows Registry.
)

:: 3. Launch server in background right now if not already running
echo.
echo [2/3] Checking background server status...
netstat -ano | findstr /R ":3443 .*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Starting background server now...
    start "" "%SystemRoot%\System32\wscript.exe" "%~dp0start-hidden.vbs"
    timeout /t 2 /nobreak >nul
) else (
    echo [INFO] Background server is already running!
)

:: 4. Get Local IPv4 Address
echo.
echo [3/3] Getting connection information...
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IPv4-Adresse"') do (
    set "MY_IP=%%A"
    goto :ip_found
)
set "MY_IP= localhost"

:ip_found
set "MY_IP=%MY_IP: =%"

echo.
echo ================================================================
echo                 SETUP COMPLETE & ACTIVE!
echo ================================================================
echo.
echo  [*] Auto-Start:  ENABLED (Runs silently every time Windows boots)
echo  [*] Server:      RUNNING in background
echo  [*] Mobile URL:  https://%MY_IP%:3443
echo.
echo  You can now open the app on your mobile browser or installed PWA!
echo  No need to manually start the server on PC again.
echo.
echo ================================================================
echo.
pause
