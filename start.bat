@echo off
title Remote Mouse Server
cd /d "%~dp0"
if not exist "server.js" (
    if exist "D:\pg\web_app\mouse\server.js" (
        cd /d "D:\pg\web_app\mouse"
    )
)

echo ========================================================
echo               Web Remote Mouse Launcher
echo ========================================================
echo.

if not exist "node_modules\" (
    echo [INFO] Dependencies not found. Installing packages...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b %errorlevel%
    )
    echo [INFO] Installation completed successfully!
    echo.
)

if not exist "bin\controller.exe" (
    echo [INFO] Compiling native Windows controller...
    if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
        "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\UIAutomationClient.dll" /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\UIAutomationTypes.dll" /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\WindowsBase.dll" /out:bin\controller.exe bin\controller.cs
    ) else if exist "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
        "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" /nologo /optimize /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\UIAutomationClient.dll" /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\UIAutomationTypes.dll" /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\WindowsBase.dll" /out:bin\controller.exe bin\controller.cs
    )
)

:: Clear any stale process listening on port 3443
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3443" ^| findstr "LISTENING"') do (
    echo [INFO] Closing old background instance (PID: %%P)...
    taskkill /F /PID %%P >nul 2>&1
    ping -n 2 127.0.0.1 >nul
)
taskkill /F /IM controller.exe >nul 2>&1

echo [INFO] Launching Remote Mouse Server (Visible Mode)...
echo.
node server.js
if errorlevel 1 (
    echo.
    echo [ERROR] Server terminated unexpectedly.
)

pause
