@echo off
setlocal
cd /d "%~dp0"

rem ============================================================
rem  Dev server
rem    dev.bat        -> http://localhost:3000
rem    dev.bat 4000   -> http://localhost:4000
rem  (ASCII only: cmd.exe mis-parses non-ASCII bytes in .bat files)
rem ============================================================

if not exist "node_modules" (
    echo [setup] node_modules missing - running npm install
    call npm install
    if errorlevel 1 goto :fail
)

if not exist ".env.local" (
    if exist ".env.local.example" (
        echo [setup] .env.local missing - copying .env.local.example
        copy /y ".env.local.example" ".env.local" > nul
        echo         Set USE_LOCAL_DB=true to run without Supabase.
    ) else (
        echo [warn]  .env.local missing. Add USE_LOCAL_DB=true for the local file DB.
    )
)

set "PORT=%~1"
if "%PORT%"=="" set "PORT=3000"

echo.
echo   dev server : http://localhost:%PORT%
echo   stop       : Ctrl+C
echo.

call npm run dev -- --port %PORT%
endlocal
exit /b 0

:fail
echo.
echo [fail] npm install failed.
endlocal
exit /b 1
