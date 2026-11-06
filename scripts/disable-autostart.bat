@echo off
title Web Remote Mouse - Disable Windows Auto-Start
cd /d "%~dp0.."

echo ================================================================
echo         Web Remote Mouse - Disable Windows Auto-Start
echo ================================================================
echo.

echo [1/2] Removing auto-start registration...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RemoteMouseServer" /f >nul 2>&1
echo [SUCCESS] Auto-start removed from Windows Registry.

echo.
echo [2/2] Stopping running background server on port 3443...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3443" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%P >nul 2>&1
)
taskkill /F /IM controller.exe >nul 2>&1

echo.
echo ================================================================
echo  [SUCCESS] Auto-start disabled and background processes stopped!
echo ================================================================
echo.
pause

