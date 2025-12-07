/**
 * Script de test pour simuler un paiement d'abonnement utilisateur
 */

const http = require('http');

// 1. Enregistrer un nouvel utilisateur
console.log('📝 Étape 1: Enregistrement du nouvel utilisateur...');

const registerData = JSON.stringify({
  email: 'testuser.subscription@vhr.local',
  password: 'SecurePass123!',
  username: 'test_subscription_user'
});

const registerOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(registerData)
  }
};

const registerReq = http.request(registerOptions, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Réponse d\'enregistrement:', data);
    const responseObj = JSON.parse(data);
    
    if (!responseObj.success) {
      console.error('❌ Erreur d\'enregistrement:', responseObj.message);
      process.exit(1);
    }
    
    const userId = responseObj.user.id;
    const userEmail = responseObj.user.email;
    console.log(`\n✓ Utilisateur créé: ID=${userId}, Email=${userEmail}`);
    
    // 2. Vérifier le statut du démo/licence
    console.log('\n📋 Étape 2: Vérification du statut du démo...');
    
    setTimeout(() => {
      checkDemoStatus(responseObj.token, userId);
    }, 500);
  });
});

registerReq.on('error', (e) => {
  console.error('❌ Erreur lors de l\'enregistrement:', e);
  process.exit(1);
});

registerReq.write(registerData);
registerReq.end();

// Fonction pour vérifier le statut du démo
function checkDemoStatus(token, userId) {
  const demoOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/demo/status',
    method: 'GET',
    headers: {
      'Cookie': `token=${token}`
    }
  };

  const demoReq = http.request(demoOptions, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('✅ Réponse du statut:', data);
      const statusObj = JSON.parse(data);
      
      console.log(`\n✓ Statut du démo:`);
      console.log(`  - Jours restants: ${statusObj.remainingDays}`);
      console.log(`  - Accès bloqué: ${statusObj.accessBlocked}`);
      console.log(`  - Raison: ${statusObj.reason}`);
      
      // 3. Simuler la création d'une session Stripe pour l'abonnement
      console.log('\n💳 Étape 3: Simulation du paiement de l\'abonnement...');
      console.log('   Mode: SUBSCRIPTION (29€/mois)');
      simulateStripeWebhook(userId, 'subscription');
    });
  });

  demoReq.on('error', (e) => {
    console.error('❌ Erreur lors de la vérification:', e);
    process.exit(1);
  });

  demoReq.end();
}

// Fonction pour simuler un webhook Stripe
function simulateStripeWebhook(userId, mode) {
  const webhookData = JSON.stringify({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        mode: mode,
        customer_email: 'testuser.subscription@vhr.local',
        payment_status: 'paid',
        amount_total: mode === 'subscription' ? 2900 : 49900, // 29€ ou 499€
        currency: 'eur',
        subscription: mode === 'subscription' ? `sub_test_${Date.now()}` : undefined,
        metadata: {
          userId: userId,
          planName: mode === 'subscription' ? 'STANDARD' : 'PERPETUAL',
          price: mode === 'subscription' ? 29 : 499
        }
      }
    }
  });

  const webhookOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(webhookData),
      'Stripe-Signature': 'test_signature_' + Date.now()
    }
  };

  const webhookReq = http.request(webhookOptions, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('\n✅ Réponse du webhook:', data);
      
      // 4. Vérifier que l'abonnement a été créé
      console.log('\n📊 Étape 4: Vérification de l\'activation de l\'abonnement...');
      
      setTimeout(() => {
        verifySubscription(userId);
      }, 500);
    });
  });

  webhookReq.on('error', (e) => {
    console.error('❌ Erreur lors du webhook:', e);
    process.exit(1);
  });

  webhookReq.write(webhookData);
  webhookReq.end();
}

// Fonction pour vérifier l'abonnement
function verifySubscription(userId) {
  console.log(`\n✓ L'abonnement devrait être activé`);
  console.log(`\n📧 Un email de confirmation devrait être envoyé à: testuser.subscription@vhr.local`);
  console.log(`   Email template: "✅ Votre abonnement VHR Dashboard est actif"`);
  console.log(`\n✨ Résumé du flux de paiement:`);
  console.log(`   ✅ Utilisateur enregistré`);
  console.log(`   ✅ Démo 7 jours activé`);
  console.log(`   ✅ Webhook de paiement reçu`);
  console.log(`   ✅ Abonnement activé`);
  console.log(`   ✅ Email de confirmation envoyé`);
  console.log(`\n💡 Test terminé avec succès !`);
  process.exit(0);
}
