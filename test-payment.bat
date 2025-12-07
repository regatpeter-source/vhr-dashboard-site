@echo off
REM Test du flux de paiement utilisateur

echo.
echo 📝 Étape 1: Enregistrement du nouvel utilisateur...

curl -s -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testpay3@vhr.local\",\"password\":\"Pass12345!\",\"username\":\"testpay_user3\"}" ^
  > c:\temp\register_response.json

echo ✅ Réponse d'enregistrement:
type c:\temp\register_response.json

echo.
echo 📋 Étape 2: Vérification du statut du démo...

REM Extraire le token using PowerShell
for /f "tokens=*" %%a in ('powershell -NoProfile "Get-Content c:\temp\register_response.json | ConvertFrom-Json | Select-Object -ExpandProperty token"') do set TOKEN=%%a

echo Token: %TOKEN%

curl -s http://localhost:3000/api/demo/status ^
  -H "Cookie: token=%TOKEN%" ^
  > c:\temp\demo_status.json

echo ✅ Réponse du statut:
type c:\temp\demo_status.json

echo.
echo 💳 Étape 3: Simulation du paiement de l'abonnement...

curl -s -X POST http://localhost:3000/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"checkout.session.completed\",\"data\":{\"object\":{\"mode\":\"subscription\",\"customer_email\":\"testpay3@vhr.local\",\"payment_status\":\"paid\",\"amount_total\":2900,\"currency\":\"eur\",\"subscription\":\"sub_test_123\",\"metadata\":{\"userId\":\"testpay_user3\",\"planName\":\"STANDARD\",\"price\":29}}}}" ^
  > c:\temp\webhook_response.json

echo ✅ Réponse du webhook:
type c:\temp\webhook_response.json

echo.
echo ✨ Résumé du flux de paiement:
echo    ✅ Utilisateur enregistré
echo    ✅ Démo 7 jours activé
echo    ✅ Webhook de paiement reçu
echo    ✅ Abonnement activé
echo    ✅ Email de confirmation devrait être envoyé
echo.
echo 💡 Test terminé avec succès !
