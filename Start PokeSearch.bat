@echo off
title PokeSearch
echo.
echo  ==========================================
echo    PokeSearch - Starting up...
echo  ==========================================
echo.
echo  DO NOT close this window while using the app.
echo  The app will open in your browser automatically.
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo  First run detected - installing dependencies...
    "C:\Program Files\nodejs\npm.cmd" install
    echo.
)

:: Start the dev server (--open auto-launches the browser)
"C:\Program Files\nodejs\npm.cmd" run dev

pause
