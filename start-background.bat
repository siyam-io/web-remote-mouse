@echo off
title Web Remote Mouse - Background Launcher
cd /d "%~dp0"

echo ================================================================
echo          Web Remote Mouse - Silent Background Launcher
echo ================================================================
echo.

wscript.exe "%~dp0start-hidden.vbs"

echo [SUCCESS] Server launched in background!
echo.
echo No terminal window will stay open.
echo Server runs silently and will listen at:
echo   https://192.168.0.105:3443
echo.
echo You can close this window now.
echo ================================================================
echo.
timeout /t 4
