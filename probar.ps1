# Script para subir cambios a la rama de PRUEBAS (Staging)
$gitPath = "C:\Program Files\Git\cmd\git.exe"

# 1. Asegurarse de estar en la rama 'pruebas'
Write-Host "Cambiando a rama 'pruebas'..." -ForegroundColor Gray
& $gitPath checkout pruebas

# 2. Pedir el mensaje del commit
$mensaje = Read-Host "Mensaje para la PRUEBA (ej: Ajustes responsive v1)"

if (-not $mensaje) {
    Write-Host "Debes escribir un mensaje. Operacion cancelada." -ForegroundColor Red
    exit
}

# 3. Ejecutar los comandos
Write-Host "`nSubiendo a la zona de pruebas (Vercel Preview)..." -ForegroundColor Cyan

& $gitPath add .
& $gitPath commit -m "$mensaje"
& $gitPath push origin pruebas

Write-Host "`nHecho! Recuerda que Vercel te dara una URL de Preview distinta a la principal." -ForegroundColor Green
