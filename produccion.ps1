# Script para subir cambios a la rama PRINCIPAL (Producción)
$gitPath = "C:\Program Files\Git\cmd\git.exe"

# 1. Asegurarse de estar en la rama 'main'
Write-Host "Cambiando a rama 'main'..." -ForegroundColor Gray
& $gitPath checkout main

# 2. Pedir el mensaje del commit
$mensaje = Read-Host "Escribe el nombre del commit para PRODUCCIÓN"

if (-not $mensaje) {
    Write-Host "Debes escribir un mensaje. Operación cancelada." -ForegroundColor Red
    exit
}

# 3. Ejecutar los comandos
Write-Host "`nSubiendo cambios a la web real (Producción)..." -ForegroundColor Cyan

& $gitPath add .
& $gitPath commit -m "$mensaje"
& $gitPath push origin main

Write-Host "`n¡Listo! Tu web principal se está actualizando." -ForegroundColor Green
