# Script para subir cambios a la rama PRINCIPAL (Produccion)
$gitPath = "C:\Program Files\Git\cmd\git.exe"

while ($true) {
    Clear-Host
    Write-Host "==============================" -ForegroundColor Yellow
    Write-Host "  LORE - DESPLIEGUE PRODUCCION " -ForegroundColor Yellow
    Write-Host "==============================" -ForegroundColor Yellow
    Write-Host "1. Subir cambios a PRODUCCION (main)"
    Write-Host "q. Salir"
    Write-Host ""
    
    $opcion = Read-Host "Selecciona una opcion"

    if ($opcion -eq "q") {
        break
    }

    if ($opcion -eq "1") {
        # 1. Asegurarse de estar en la rama 'main'
        Write-Host "`nCambiando a rama 'main'..." -ForegroundColor Gray
        & $gitPath checkout main

        # 2. Pedir el mensaje del commit
        $mensaje = Read-Host "Escribe el nombre del commit para PRODUCCION"

        if (-not $mensaje) {
            Write-Host "Debes escribir un mensaje. Operacion cancelada." -ForegroundColor Red
            Write-Host "`nPresiona Enter para volver..."
            Read-Host
            continue
        }

        # 3. Ejecutar los comandos
        Write-Host "`nSubiendo cambios a la web real (Produccion)..." -ForegroundColor Cyan

        & $gitPath add .
        & $gitPath commit -m "$mensaje"
        & $gitPath push origin main

        Write-Host "`nListo! Tu web principal se esta actualizando." -ForegroundColor Green
        Write-Host "`nPresiona Enter para volver al menu..."
        Read-Host
    }
}
