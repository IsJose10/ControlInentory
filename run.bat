@echo off
title HABITAD WMS Server

cd /d "%~dp0"

echo ==================================================
echo   HABITAD WMS - CONTROL DE INVENTARIOS
echo   Carpeta: %~dp0
echo ==================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro el motor Node.js en el sistema.
    echo Por favor, instale Node.js y asegurese de que este en el PATH.
    echo.
    pause
    exit /b
)

echo [OK] Motor Node.js detectado.
echo [INFO] Iniciando servidor en http://localhost:3000 ...
echo [INFO] Para detener el servidor presione CTRL+C
echo.

start /b cmd /c "timeout /t 1 >nul && start http://localhost:3000"


node server.js

pause
