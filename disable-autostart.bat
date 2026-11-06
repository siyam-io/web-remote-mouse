@echo off
title Web Remote Mouse - Disable Windows Auto-Start
cd /d "%~dp0"

echo ================================================================
echo         Web Remote Mouse - Disable Windows Auto-Start
echo ================================================================
echo.

:: 1. Remove Registry & Startup shortcut
echo [1/2] Removing auto-start registration...
cscript //nologo uninstall-autostart.vbs
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RemoteMouseServer" /f >nul 2>&1

:: 2. Stop running server processes
echo.
echo [2/2] Stopping running background processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im controller.exe >nul 2>&1

echo.
echo ================================================================
echo  [SUCCESS] Auto-start disabled and background processes stopped!
echo ================================================================
echo.
pause
