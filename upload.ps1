# Script para automatizar Git Add, Commit y Push
$gitPath = "C:\Program Files\Git\cmd\git.exe"

# 1. Pedir el mensaje del commit
$mensaje = Read-Host "Escribe el nombre del commit (ej: Cambios en el diseño)"

if (-not $mensaje) {
    Write-Host "Debes escribir un mensaje. Operación cancelada." -ForegroundColor Red
    exit
}

# 2. Ejecutar los comandos
Write-Host "`nSubiendo cambios..." -ForegroundColor Cyan

& $gitPath add .
& $gitPath commit -m "$mensaje"
& $gitPath push

Write-Host "`n¡Listo! Cambios subidos a GitHub." -ForegroundColor Green
