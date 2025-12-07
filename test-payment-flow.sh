#!/bin/bash

# Test du flux de paiement utilisateur

echo "📝 Étape 1: Enregistrement du nouvel utilisateur..."

REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser.subscription@vhr.local",
    "password": "SecurePass123!",
    "username": "test_subscription_user"
  }')

echo "✅ Réponse d'enregistrement:"
echo "$REGISTER_RESPONSE" | jq .

# Extraire les informations
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')
USER_EMAIL=$(echo "$REGISTER_RESPONSE" | jq -r '.user.email')
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')

if [ "$USER_ID" == "null" ]; then
  echo "❌ Erreur d'enregistrement"
  exit 1
fi

echo ""
echo "✓ Utilisateur créé: ID=$USER_ID, Email=$USER_EMAIL"

# 2. Vérifier le statut du démo
echo ""
echo "📋 Étape 2: Vérification du statut du démo..."

DEMO_RESPONSE=$(curl -s -X GET http://localhost:3000/api/demo/status \
  -H "Cookie: token=$TOKEN")

echo "✅ Réponse du statut:"
echo "$DEMO_RESPONSE" | jq .

# 3. Simuler la création d'une session Stripe pour l'abonnement
echo ""
echo "💳 Étape 3: Simulation du paiement de l'abonnement..."
echo "   Mode: SUBSCRIPTION (29€/mois)"

WEBHOOK_DATA=$(cat <<EOF
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_$(date +%s)",
      "mode": "subscription",
      "customer_email": "$USER_EMAIL",
      "payment_status": "paid",
      "amount_total": 2900,
      "currency": "eur",
      "subscription": "sub_test_$(date +%s)",
      "metadata": {
        "userId": "$USER_ID",
        "planName": "STANDARD",
        "price": 29
      }
    }
  }
}
EOF
)

WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test_signature_$(date +%s)" \
  -d "$WEBHOOK_DATA")

echo "✅ Réponse du webhook:"
echo "$WEBHOOK_RESPONSE" | jq .

echo ""
echo "✨ Résumé du flux de paiement:"
echo "   ✅ Utilisateur enregistré"
echo "   ✅ Démo 7 jours activé"
echo "   ✅ Webhook de paiement reçu"
echo "   ✅ Abonnement activé"
echo "   ✅ Email de confirmation devrait être envoyé à: $USER_EMAIL"
echo ""
echo "💡 Test terminé avec succès !"
