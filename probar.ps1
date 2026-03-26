# Script para subir cambios a la rama de PRUEBAS (Staging)
$gitPath = "C:\Program Files\Git\cmd\git.exe"

while ($true) {
    Clear-Host
    Write-Host "==============================" -ForegroundColor Magenta
    Write-Host "    LORE - AREA DE PRUEBAS     " -ForegroundColor Magenta
    Write-Host "==============================" -ForegroundColor Magenta
    Write-Host "1. Subir cambios a PRUEBAS (pruebas)"
    Write-Host "q. Salir"
    Write-Host ""
    
    $opcion = Read-Host "Selecciona una opcion"

    if ($opcion -eq "q") {
        break
    }

    if ($opcion -eq "1") {
        # 1. Asegurarse de estar en la rama 'pruebas'
        Write-Host "`nCambiando a rama 'pruebas'..." -ForegroundColor Gray
        & $gitPath checkout pruebas

        # 2. Pedir el mensaje del commit
        $mensaje = Read-Host "Mensaje para la PRUEBA"

        if (-not $mensaje) {
            Write-Host "Debes escribir un mensaje. Operacion cancelada." -ForegroundColor Red
            Write-Host "`nPresiona Enter para volver..."
            Read-Host
            continue
        }

        # 3. Ejecutar los comandos
        Write-Host "`nSubiendo a la zona de pruebas (Vercel Preview)..." -ForegroundColor Cyan

        & $gitPath add .
        & $gitPath commit -m "$mensaje"
        & $gitPath push origin pruebas

        Write-Host "`nHecho! Recuerda que Vercel te dara una URL de Preview distinta a la principal." -ForegroundColor Green
        Write-Host "`nPresiona Enter para volver al menu..."
        Read-Host
    }
}
