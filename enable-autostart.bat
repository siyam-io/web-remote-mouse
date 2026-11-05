@echo off
title Web Remote Mouse - Enable Windows Auto-Start
cd /d "%~dp0"

echo ========================================================
echo        Web Remote Mouse - Enable Windows Auto-Start
echo ========================================================
echo.
echo Installing silent background launcher on Windows boot...
echo.

cscript //nologo setup-autostart.vbs

echo.
echo --------------------------------------------------------
echo Server will now automatically start in the background
echo whenever your PC boots up.
echo You will never have to manually run the server on PC again!
echo --------------------------------------------------------
echo.
pause
