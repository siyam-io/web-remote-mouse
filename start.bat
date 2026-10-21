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

if not exist "bin\controller.exe" (
    echo [INFO] Compiling native Windows controller...
    if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
        "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize /out:bin\controller.exe bin\controller.cs
    ) else if exist "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
        "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" /nologo /optimize /out:bin\controller.exe bin\controller.cs
    )
)

echo [INFO] Launching Remote Mouse Server...
echo.
node server.js
if errorlevel 1 (
    echo.
    echo [ERROR] Server terminated unexpectedly.
)

pause
