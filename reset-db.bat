@echo off
setlocal
cd /d "%~dp0"

rem ============================================================
rem  Reset the local file DB (USE_LOCAL_DB=true mode only).
rem  Deleting .data\dev-db.json reseeds parties A-F and 6 sample
rem  members on the next run. Supabase mode is unaffected.
rem
rem    reset-db.bat      -> ask first
rem    reset-db.bat -y   -> no prompt
rem  (ASCII only: cmd.exe mis-parses non-ASCII bytes in .bat files)
rem ============================================================

if not exist ".data\dev-db.json" (
    echo .data\dev-db.json not found - already at the initial state.
    endlocal
    exit /b 0
)

if /i "%~1"=="-y" goto :doit
if /i "%~1"=="/y" goto :doit

echo This deletes .data\dev-db.json - all local test data is lost.
choice /c YN /n /m "Continue? [Y/N] "
if errorlevel 2 (
    echo Cancelled.
    endlocal
    exit /b 0
)

:doit
del /q ".data\dev-db.json"
if errorlevel 1 (
    echo [fail] Could not delete. Stop the dev server first.
    endlocal
    exit /b 1
)

echo Deleted. Sample data will be reseeded on the next run.
endlocal
exit /b 0
