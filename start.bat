@echo off
title Remote Mouse Server
cd /d "%~dp0"

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

echo [INFO] Launching Remote Mouse Server...
echo.
node server.js
if errorlevel 1 (
    echo.
    echo [ERROR] Server terminated unexpectedly.
)

pause
