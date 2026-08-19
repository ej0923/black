@echo off
rem UTF-8 console so the Korean output in smoke.ps1 renders when double-clicked.
chcp 65001 > nul
setlocal
cd /d "%~dp0"

rem ============================================================
rem  Smoke test wrapper.
rem  Real logic lives in scripts\smoke.ps1 - batch cannot reliably
rem  poll HTTP and tear a server down by port.
rem
rem    smoke.bat        -> port 3311
rem    smoke.bat 3999   -> port 3999
rem ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\smoke.ps1" %*
set "CODE=%ERRORLEVEL%"
endlocal & exit /b %CODE%
