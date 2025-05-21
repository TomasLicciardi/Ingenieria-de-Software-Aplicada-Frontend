@echo off
echo Verificando archivos de PWA...

set WWW_DIR=www
set ICONOS_OK=0
set MANIFEST_OK=0
set SW_OK=0
set NGSW_OK=0

:: Verificar manifest.webmanifest
if exist "%WWW_DIR%\manifest.webmanifest" (
  echo [OK] manifest.webmanifest encontrado
  set MANIFEST_OK=1
) else (
  echo [ERROR] manifest.webmanifest NO encontrado
)

:: Verificar que existan los iconos
if exist "%WWW_DIR%\icons" (
  set ICON_COUNT=0
  for %%f in (%WWW_DIR%\icons\*.png) do set /a ICON_COUNT+=1
  
  if !ICON_COUNT! GTR 0 (
    echo [OK] Hay !ICON_COUNT! iconos en la carpeta icons
    set ICONOS_OK=1
  ) else (
    echo [ERROR] No hay iconos en la carpeta icons
  )
) else (
  echo [ERROR] Carpeta icons NO encontrada
)

:: Verificar service worker
if exist "%WWW_DIR%\ngsw-worker.js" (
  echo [OK] ngsw-worker.js encontrado
  set SW_OK=1
) else (
  echo [ERROR] ngsw-worker.js NO encontrado
)

:: Verificar ngsw.json
if exist "%WWW_DIR%\ngsw.json" (
  echo [OK] ngsw.json encontrado
  set NGSW_OK=1
) else (
  echo [ERROR] ngsw.json NO encontrado
)

:: Verificar si todo está correcto
if %MANIFEST_OK%==1 if %ICONOS_OK%==1 if %SW_OK%==1 if %NGSW_OK%==1 (
  echo.
  echo ✅ La PWA está correctamente configurada
) else (
  echo.
  echo ❌ La PWA NO está correctamente configurada
  echo Por favor, ejecuta el script clean-rebuild.bat para reconstruir la aplicación
)

echo.
echo Para iniciar el servidor, ejecuta: node server.js
