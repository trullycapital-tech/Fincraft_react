@echo off
REM Stop FinCraft backend and frontend dev servers by killing node processes
echo Stopping FinCraft dev servers...

for /f "tokens=2 delims=," %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH') do (
    echo Killing node process %%a
    taskkill /PID %%a /F >nul 2>&1
)
echo Done. Verify using Task Manager or tasklist /FI "IMAGENAME eq node.exe".
pause