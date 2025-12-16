#!/usr/bin/env node

/**
 * Test: Registration Flow Path
 * 
 * Purpose: Test the complete registration journey to verify:
 * 1. Registration endpoint works
 * 2. User data is saved to PostgreSQL
 * 3. User is properly authenticated
 * 4. User should be redirected to dashboard
 */

const https = require('https');
const BASE_URL = 'https://vhr-dashboard-site.onrender.com';

let cookies = '';

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Registration-Test/1.0',
      },
    };

    // Add cookies to request
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';

      // Store cookies from response
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        if (Array.isArray(setCookie)) {
          cookies = setCookie.map(c => c.split(';')[0]).join('; ');
        } else {
          cookies = setCookie.split(';')[0];
        }
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData,
            cookies: cookies,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            cookies: cookies,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 REGISTRATION FLOW TEST');
  console.log('='.repeat(80));

  // Test 1: Register new user
  console.log('\n1️⃣  TEST: Register new user');
  console.log('   URL: POST ' + BASE_URL + '/api/register');

  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'TestPassword123!@',
    email: `testuser_${Date.now()}@test.com`,
  };

  console.log(`   Username: ${testUser.username}`);
  console.log(`   Email: ${testUser.email}`);

  try {
    const registerRes = await makeRequest('POST', '/api/register', testUser);
    
    console.log(`\n   ✓ Response Status: ${registerRes.status}`);
    console.log(`   ✓ Response Body:`, JSON.stringify(registerRes.body, null, 2));
    
    if (registerRes.status === 200 && registerRes.body.ok) {
      console.log('\n   ✅ REGISTRATION SUCCESSFUL');
      console.log(`   User ID: ${registerRes.body.userId}`);
      console.log(`   Username: ${registerRes.body.username}`);
      console.log(`   Role: ${registerRes.body.role}`);
      console.log(`   Cookies received: ${cookies ? 'YES' : 'NO'}`);
      
      if (registerRes.body.token) {
        console.log(`   Token: ${registerRes.body.token.substring(0, 30)}...`);
      }
    } else {
      console.log('\n   ❌ REGISTRATION FAILED');
      console.log(`   Error: ${registerRes.body.error}`);
      return;
    }
  } catch (err) {
    console.log(`\n   ❌ ERROR: ${err.message}`);
    return;
  }

  // Test 2: Verify user exists in database
  console.log('\n\n2️⃣  TEST: Verify user created (GET /api/me)');
  console.log('   URL: GET ' + BASE_URL + '/api/me');

  try {
    const meRes = await makeRequest('GET', '/api/me');
    
    console.log(`\n   ✓ Response Status: ${meRes.status}`);
    
    if (meRes.status === 200 && meRes.body.ok) {
      console.log('   ✅ USER VERIFIED IN DATABASE');
      console.log(`   Username: ${meRes.body.user.username}`);
      console.log(`   Email: ${meRes.body.user.email}`);
      console.log(`   Role: ${meRes.body.user.role}`);
    } else {
      console.log('   ❌ USER NOT FOUND');
      console.log(`   Response:`, JSON.stringify(meRes.body, null, 2));
    }
  } catch (err) {
    console.log(`\n   ❌ ERROR: ${err.message}`);
  }

  // Test 3: Check dashboard redirect
  console.log('\n\n3️⃣  TEST: Dashboard Access Check');
  console.log('   URL: GET ' + BASE_URL + '/admin-dashboard.html');

  try {
    const dashRes = await makeRequest('GET', '/admin-dashboard.html');
    
    console.log(`\n   ✓ Response Status: ${dashRes.status}`);
    
    if (dashRes.status === 200) {
      console.log('   ✅ DASHBOARD ACCESSIBLE');
      console.log(`   Content length: ${dashRes.body.length || 'unknown'} bytes`);
      
      // Check if it contains authentication checks
      if (typeof dashRes.body === 'string') {
        if (dashRes.body.includes('authMiddleware') || dashRes.body.includes('login')) {
          console.log('   ℹ️  Dashboard includes authentication checks');
        }
        if (dashRes.body.includes('admin-dashboard')) {
          console.log('   ℹ️  Dashboard file is properly served');
        }
      }
    } else {
      console.log(`   ⚠️  Unexpected status: ${dashRes.status}`);
    }
  } catch (err) {
    console.log(`\n   ❌ ERROR: ${err.message}`);
  }

  // Test 4: Check login path
  console.log('\n\n4️⃣  TEST: Login with newly created user');
  console.log('   URL: POST ' + BASE_URL + '/api/login');

  try {
    const loginRes = await makeRequest('POST', '/api/login', {
      username: testUser.username,
      password: testUser.password,
    });
    
    console.log(`\n   ✓ Response Status: ${loginRes.status}`);
    
    if (loginRes.status === 200 && loginRes.body.ok) {
      console.log('   ✅ LOGIN SUCCESSFUL');
      console.log(`   Username: ${loginRes.body.username}`);
      console.log(`   Role: ${loginRes.body.role}`);
      console.log(`   Token: ${loginRes.body.token.substring(0, 30)}...`);
    } else {
      console.log('   ❌ LOGIN FAILED');
      console.log(`   Error: ${loginRes.body.error}`);
    }
  } catch (err) {
    console.log(`\n   ❌ ERROR: ${err.message}`);
  }

  // Test 5: Check where user should be redirected
  console.log('\n\n5️⃣  TEST: Recommended flow after registration');
  console.log('   ℹ️  Current flow: account.html → /api/register → loadMe() → show logged-in section');
  console.log('   ⚠️  ISSUE: No automatic redirect to dashboard');
  console.log('\n   RECOMMENDATION:');
  console.log('   After successful registration, redirect to:');
  console.log('   → ' + BASE_URL + '/admin-dashboard.html');
  console.log('\n   OR show dashboard in same page with tab switching');

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`
Flow Path Analysis:
  1. User visits: ${BASE_URL}/account.html
  2. Fills registration form
  3. Submits to: /api/register (POST)
  4. Server: Creates user in PostgreSQL
  5. Server: Returns: { ok: true, token, userId, ... }
  6. Client: Calls loadMe() to refresh user state
  7. Client: Shows logged-in section on account.html
  
❌ MISSING STEP:
  8. NO REDIRECT TO DASHBOARD
  
✅ SHOULD ADD:
  - Automatic redirect to admin-dashboard.html after registration
  - OR embed dashboard view in account page
  - OR show success message with link to dashboard

Implementation Suggestion:
  In public/js/account.js, line 104:
  
  if (res && res.ok) {
    loginMessage.textContent = 'Compte créé, redirection...';
    await loadMe();
    // ⬇️ ADD THIS:
    setTimeout(() => {
      window.location.href = '/admin-dashboard.html';
    }, 1500);
  }
`);

  console.log('='.repeat(80) + '\n');
}

// Run tests
runTests().catch(console.error);
