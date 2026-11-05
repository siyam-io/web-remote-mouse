@echo off
title Stop Remote Mouse Server
echo Stopping Remote Mouse background processes...

taskkill /f /im node.exe >nul 2>&1
taskkill /f /im controller.exe >nul 2>&1

echo [INFO] Server stopped.
pause

