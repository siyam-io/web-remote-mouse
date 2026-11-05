@echo off
title Web Remote Mouse - Disable Windows Auto-Start
cd /d "%~dp0"

echo ========================================================
echo       Web Remote Mouse - Disable Windows Auto-Start
echo ========================================================
echo.

cscript //nologo uninstall-autostart.vbs

echo.
pause
