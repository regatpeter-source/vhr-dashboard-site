@echo off
REM Script Windows pour générer un certificat SSL auto-signé (cert.pem et key.pem)
REM Nécessite OpenSSL installé (https://slproweb.com/products/Win32OpenSSL.html)


REM Chemin complet vers openssl.exe (adapter si besoin)
set OPENSSL_EXE="C:\Users\peter\VR-Manager\OpenSSL-Win64\bin\openssl.exe"


if not exist %OPENSSL_EXE% (
    echo [ERREUR] OpenSSL n'est pas trouvé au chemin : %OPENSSL_EXE%
    echo Vérifiez le chemin ou réinstallez OpenSSL.
    pause
    exit /b 1
)

%OPENSSL_EXE% req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes -keyout key.pem -out cert.pem -subj "/CN=localhost"

if exist cert.pem if exist key.pem (
    echo [OK] Certificat SSL auto-signé généré : cert.pem et key.pem
) else (
    echo [ERREUR] La génération du certificat a échoué.
)
pause
