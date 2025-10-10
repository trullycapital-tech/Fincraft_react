@echo off
REM Start backend and frontend dev servers in separate PowerShell windows (Windows)

SET BACKEND_DIR=%~dp0..\backend
SET FRONTEND_DIR=%~dp0..\frontend

echo Starting FinCraft backend in a new window...
start powershell -NoExit -Command "cd '%BACKEND_DIR%'; npm run dev"

echo Starting FinCraft frontend in a new window...
start powershell -NoExit -Command "cd '%FRONTEND_DIR%'; npm start"

echo All dev servers started. Use stop-dev.bat to stop them.
pause