@echo off
setlocal
echo Eros Academy - Preparando projeto Android
where node >nul 2>nul || (echo Node.js nao encontrado. Instale Node.js 24+ e tente novamente.& pause & exit /b 1)
call npm install || (echo Falha no npm install.& pause & exit /b 1)
if not exist android (
  call npx cap add android || (echo Falha ao criar plataforma Android.& pause & exit /b 1)
)
call npx cap sync android || (echo Falha ao sincronizar o app.& pause & exit /b 1)
call npx cap open android
pause
