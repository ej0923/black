@echo off
setlocal
cd /d "%~dp0"

rem ============================================================
rem  Static checks: route typegen -> tsc -> eslint -> next build
rem  Every step runs even if an earlier one fails; summary at the end.
rem  (ASCII only: cmd.exe mis-parses non-ASCII bytes in .bat files)
rem ============================================================

if not exist "node_modules" (
    echo [setup] node_modules missing - running npm install
    call npm install
    if errorlevel 1 exit /b 1
)

set "R_TYPES=OK"
set "R_LINT=OK"
set "R_BUILD=OK"

echo.
echo ============================================================
echo  1/3  route typegen + TypeScript
echo ============================================================
rem next 16 emits route types via `next typegen`; run it first so that
rem `tsc --noEmit` actually validates typed routes.
call npx --no-install next typegen
if errorlevel 1 set "R_TYPES=FAIL"
call npx --no-install tsc --noEmit
if errorlevel 1 set "R_TYPES=FAIL"

echo.
echo ============================================================
echo  2/3  ESLint
echo ============================================================
call npm run lint
if errorlevel 1 set "R_LINT=FAIL"

echo.
echo ============================================================
echo  3/3  production build
echo ============================================================
call npm run build
if errorlevel 1 set "R_BUILD=FAIL"

echo.
echo ============================================================
echo  summary
echo ============================================================
echo   types : %R_TYPES%
echo   lint  : %R_LINT%
echo   build : %R_BUILD%
echo.

if not "%R_TYPES%"=="OK" goto :bad
if not "%R_LINT%"=="OK" goto :bad
if not "%R_BUILD%"=="OK" goto :bad

echo   all passed.
endlocal
exit /b 0

:bad
echo   some steps failed - see the log above.
endlocal
exit /b 1
