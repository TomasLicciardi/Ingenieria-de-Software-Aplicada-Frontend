@echo off
echo Construyendo aplicación para producción...
call ng build --configuration production

echo Copiando manifest.webmanifest a la carpeta www si no se ha copiado...
if not exist "www\manifest.webmanifest" (
  copy "public\manifest.webmanifest" "www\"
)

echo Asegurando que la carpeta icons exista...
if not exist "www\icons" (
  mkdir "www\icons"
  xcopy "public\icons\*" "www\icons\" /E /Y
)

echo Iniciando servidor para PWA...
node server.js
