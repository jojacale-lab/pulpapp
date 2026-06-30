@echo off
title PulpApp - Servidores
echo Iniciando PulpApp...
echo.

start "PulpApp Backend :3001" cmd /k "cd /d C:\Users\johnl\pulpapp\backend && node src/index.js"
timeout /t 3 /nobreak > nul
start "PulpApp Frontend :5173" cmd /k "cd /d C:\Users\johnl\pulpapp\frontend && npm run dev"

echo.
echo Servidores iniciados. Abre http://localhost:5173 en tu navegador.
echo NO cierres las ventanas que se abrieron.
pause
