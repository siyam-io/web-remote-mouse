@echo off
title Web Remote Mouse Launcher
cd /d "%~dp0"

echo ================================================================
echo                   WEB REMOTE MOUSE
echo ================================================================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Install node_modules if missing
if not exist "node_modules\" (
    echo [INFO] Installing packages...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: Compile controller.exe if missing
if not exist "bin\controller.exe" (
    echo [INFO] Compiling native Windows controller...
    if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
        "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\UIAutomationClient.dll" /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\UIAutomationTypes.dll" /r:"%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\WPF\WindowsBase.dll" /out:bin\controller.exe bin\controller.cs
    )
)

:: Clear any stale process listening on port 3443
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3443" ^| findstr "LISTENING"') do (
    echo [INFO] Stopping old instance PID %%P...
    taskkill /F /PID %%P >nul 2>&1
    ping -n 2 127.0.0.1 >nul
)
taskkill /F /IM controller.exe >nul 2>&1

echo [INFO] Starting Web Remote Mouse Server...
echo.
node server.js
if errorlevel 1 (
    echo.
    echo [ERROR] Server terminated unexpectedly.
)

pause
