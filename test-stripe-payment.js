#!/usr/bin/env node
/**
 * Test Stripe Payment Flow
 * Simule un paiement complet end-to-end
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testPaymentFlow() {
  console.log('\n========================================');
  console.log('🧪 TEST PAIEMENT STRIPE - FLOW COMPLET');
  console.log('========================================\n');

  try {
    // Test 1: Vérifier la clé Stripe
    console.log('[1/5] Vérification de la clé Stripe...');
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Clé valide - Compte: ${account.email}\n`);

    // Test 2: Vérifier les plans de prix
    console.log('[2/5] Vérification des plans de prix...');
    const professionalPrice = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_PROFESSIONAL);
    const perpetualPrice = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_PERPETUAL_PRO);
    
    console.log(`✅ Plan Professional: €${(professionalPrice.unit_amount / 100).toFixed(2)}/mois`);
    console.log(`✅ Plan Perpetual Pro: €${(perpetualPrice.unit_amount / 100).toFixed(2)} (one-time)\n`);

    // Test 3: Créer une session de checkout (Professional - abonnement)
    console.log('[3/5] Création de session d\'abonnement (Professional)...');
    const subscriptionSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_PROFESSIONAL,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://vhr-dashboard-site.onrender.com/account.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://vhr-dashboard-site.onrender.com/pricing.html',
      customer_email: 'test@example.com',
      metadata: {
        test: 'true',
      },
    });
    console.log(`✅ Session d'abonnement créée`);
    console.log(`   ID: ${subscriptionSession.id}`);
    console.log(`   URL: ${subscriptionSession.url}\n`);

    // Test 4: Créer une session de checkout (Perpetual - one-time)
    console.log('[4/5] Création de session d\'achat (Perpetual Pro)...');
    const purchaseSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_PERPETUAL_PRO,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://vhr-dashboard-site.onrender.com/account.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://vhr-dashboard-site.onrender.com/pricing.html',
      customer_email: 'test-perpetual@example.com',
      metadata: {
        test: 'true',
      },
    });
    console.log(`✅ Session d'achat créée`);
    console.log(`   ID: ${purchaseSession.id}`);
    console.log(`   URL: ${purchaseSession.url}\n`);

    // Test 5: Récupérer une session créée pour vérifier les données
    console.log('[5/5] Vérification des données de session...');
    const retrievedSession = await stripe.checkout.sessions.retrieve(subscriptionSession.id);
    console.log(`✅ Session récupérée avec succès`);
    console.log(`   Status: ${retrievedSession.payment_status}`);
    console.log(`   Mode: ${retrievedSession.mode}`);
    console.log(`   Email: ${retrievedSession.customer_email}\n`);

    console.log('========================================');
    console.log('✅ TOUS LES TESTS RÉUSSIS!');
    console.log('========================================\n');

    console.log('📋 PROCHAINES ÉTAPES POUR TESTER UN VRAI PAIEMENT:\n');
    console.log('1. Ouvrez le site: https://vhr-dashboard-site.onrender.com/pricing.html');
    console.log('2. Cliquez sur "S\'abonner maintenant" ou "Acheter maintenant"');
    console.log('3. Vous serez redirigé vers Stripe Checkout');
    console.log('4. Utilisez une carte de test:\n');
    console.log('   ✅ SUCCÈS:   4242 4242 4242 4242');
    console.log('   ❌ DÉCLINÉ:  4000 0000 0000 0002\n');
    console.log('5. Expirations/CVC: N\'importe quels chiffres futur\n');
    console.log('💡 Pour une vraie carte: utilisez votre vrai numéro de carte');
    console.log('   (elle ne sera jamais débité, c\'est du test Stripe)\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('\nDétails:', error);
    process.exit(1);
  }
}

// Lancer le test
testPaymentFlow();
