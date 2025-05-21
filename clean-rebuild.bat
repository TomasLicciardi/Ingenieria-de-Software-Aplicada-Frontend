@echo off
echo Limpiando archivos de Service Worker y cache antiguos...

:: Detener cualquier proceso de node existente
taskkill /F /IM node.exe 2>nul

:: Limpieza de archivos generados previamente
echo Limpiando archivos de la carpeta www...
if exist "www" (
  rmdir /S /Q "www"
  mkdir "www"
)

:: Construcción para producción
echo Construyendo la aplicación para producción...
call ng build --configuration production

:: Copiar manifest y iconos
echo Copiando manifest.webmanifest a la carpeta www...
copy "public\manifest.webmanifest" "www\" /Y

echo Copiando iconos a la carpeta www...
if not exist "www\icons" mkdir "www\icons"
xcopy "public\icons\*" "www\icons\" /E /Y

:: Copiar ngsw-worker.js a la carpeta www (necesario para el Service Worker)
echo Copiando service worker a la carpeta www...
copy "node_modules\@angular\service-worker\ngsw-worker.js" "www\" /Y

echo Creando archivo sw-version.js para asegurar que el SW se actualice...
echo // Versión: %random% > "www\sw-version.js"

echo Iniciar el servidor:
echo node server.js
