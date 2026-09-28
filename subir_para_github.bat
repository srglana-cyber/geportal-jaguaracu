@echo off
chcp 65001 > nul
echo ========================================================
echo   Enviando Geoportal Jaguaracu para o GitHub...
echo   Repositorio: https://github.com/srglana-cyber/geportal-jaguaracu
echo ========================================================
echo.

set "GIT=C:\Users\Sergio\MinGit\cmd\git.exe"

"%GIT%" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCESSO] Repositorio atualizado com sucesso no GitHub!
    echo Acesse: https://github.com/srglana-cyber/geportal-jaguaracu
) else (
    echo.
    echo [AVISO] Se solicitou login ou token, informe suas credenciais do GitHub.
    echo Voce tambem pode utilizar um Personal Access Token (PAT) do GitHub como senha.
)

echo.
pause
