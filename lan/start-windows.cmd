@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
 echo Please use the portable ValoNow-LAN-Windows package, or install Node.js 22+.
 pause
 exit /b 1
)
if not exist "%~dp0node_modules\ws" (
 call npm --prefix "%~dp0" ci --omit=dev
 if errorlevel 1 exit /b 1
)
node "%~dp0cli.mjs" %*
pause
