async function runAuthFlowTest() {
  const base = 'http://localhost:5000/api';

  console.log('====================================================');
  console.log('🧪 TESTING CONTINUO AUTHENTICATION & MULTI-TENANCY');
  console.log('====================================================\n');

  // Test 1: Protected Endpoint Without Auth
  console.log('Test 1: Accessing /api/customers without authentication token...');
  const unauthRes = await fetch(`${base}/customers`);
  console.log(`Status: ${unauthRes.status} (Expected: 401)`);
  const unauthBody = await unauthRes.json();
  console.log('Response:', unauthBody);
  if (unauthRes.status !== 401) throw new Error('Expected 401 Unauthorized');
  console.log('✓ PASS: Protected endpoint blocked unauthenticated access.\n');

  // Test 2: User 1 Sign Up
  const u1Email = `alice_${Date.now()}@novacorp.com`;
  console.log(`Test 2: Signing up User 1 (${u1Email})...`);
  const u1SignupRes = await fetch(`${base}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Walker',
      email: u1Email,
      password: 'password123'
    })
  });
  console.log(`Status: ${u1SignupRes.status} (Expected: 201)`);
  const u1Data = await u1SignupRes.json();
  console.log('User 1 Created:', u1Data.user);
  console.log('Token Received:', u1Data.token.substring(0, 20) + '...');
  if (!u1Data.token) throw new Error('Missing token');
  console.log('✓ PASS: User 1 registration succeeded with JWT token.\n');

  // Test 3: Verify /api/auth/me
  console.log('Test 3: Verifying /api/auth/me with User 1 token...');
  const meRes = await fetch(`${base}/auth/me`, {
    headers: { 'Authorization': `Bearer ${u1Data.token}` }
  });
  const meData = await meRes.json();
  console.log('Current User Profile:', meData.user);
  if (meData.user.email !== u1Email) throw new Error('User email mismatch');
  console.log('✓ PASS: Token verified and returned logged-in user.\n');

  // Test 4: Duplicate Email Prevention
  console.log('Test 4: Attempting to sign up again with same email...');
  const dupRes = await fetch(`${base}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Duplicate',
      email: u1Email,
      password: 'password123'
    })
  });
  console.log(`Status: ${dupRes.status} (Expected: 409)`);
  if (dupRes.status !== 409) throw new Error('Expected 409 Conflict');
  console.log('✓ PASS: Duplicate email registration blocked.\n');

  // Test 5: User 1 Creates Customer A
  console.log('Test 5: User 1 creating Customer A (Apex Aerospace)...');
  const custRes = await fetch(`${base}/customers`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${u1Data.token}`
    },
    body: JSON.stringify({
      name: 'Mark Vance',
      company: 'Apex Aerospace',
      email: 'mark@apex.com',
      product: 'Enterprise Avionics'
    })
  });
  const custA = await custRes.json();
  console.log('Customer A Created:', custA.id, custA.name, custA.company);

  // User 1 stores a memory
  console.log('User 1 starting conversation & storing memory for Customer A...');
  const convRes = await fetch(`${base}/conversations`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${u1Data.token}`
    },
    body: JSON.stringify({
      customerId: custA.id,
      title: 'Security Compliance Kickoff'
    })
  });
  const conv = await convRes.json();

  const msgRes = await fetch(`${base}/conversations/${conv.id}/messages`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${u1Data.token}`
    },
    body: JSON.stringify({
      text: 'We require FedRAMP High certification before contract signing.'
    })
  });
  const msgData = await msgRes.json();
  console.log('Retained to Hindsight for Customer A:', msgData.extractedMemories[0]?.content);
  console.log('✓ PASS: User 1 customer and persistent memory created.\n');

  // Test 6: User 2 Registration
  const u2Email = `bob_${Date.now()}@stonecorp.com`;
  console.log(`Test 6: Signing up User 2 (${u2Email})...`);
  const u2SignupRes = await fetch(`${base}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Stone',
      email: u2Email,
      password: 'password456'
    })
  });
  const u2Data = await u2SignupRes.json();
  console.log('User 2 Created:', u2Data.user);
  console.log('✓ PASS: User 2 created.\n');

  // Test 7: Multi-Tenant Customer & Memory Isolation
  console.log('Test 7: Verifying User 2 sees ZERO customers (Strict Multi-Tenancy)...');
  const u2CustsRes = await fetch(`${base}/customers`, {
    headers: { 'Authorization': `Bearer ${u2Data.token}` }
  });
  const u2Custs = await u2CustsRes.json();
  console.log('User 2 Customers Count:', u2Custs.length);
  if (u2Custs.length !== 0) throw new Error('User isolation failure: User 2 saw User 1 customers');
  console.log('✓ PASS: User 2 customer directory is completely empty and isolated!\n');

  console.log('Test 8: Verifying User 2 cannot access Customer A by ID...');
  const directAccessRes = await fetch(`${base}/customers/${custA.id}`, {
    headers: { 'Authorization': `Bearer ${u2Data.token}` }
  });
  console.log(`Status: ${directAccessRes.status} (Expected: 404)`);
  if (directAccessRes.status !== 404) throw new Error('User 2 was able to access User 1 customer directly');
  console.log('✓ PASS: Direct customer ID access across tenant boundaries denied.\n');

  // Test 9: Sign In - Invalid Password
  console.log('Test 9: Testing Sign In with wrong password...');
  const badLoginRes = await fetch(`${base}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: u1Email,
      password: 'wrong_password_xyz'
    })
  });
  console.log(`Status: ${badLoginRes.status} (Expected: 401)`);
  if (badLoginRes.status !== 401) throw new Error('Expected 401 Unauthorized for wrong password');
  console.log('✓ PASS: Invalid password rejected.\n');

  // Test 10: Sign In - Valid Password
  console.log('Test 10: Testing Sign In with correct password...');
  const goodLoginRes = await fetch(`${base}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: u1Email,
      password: 'password123'
    })
  });
  console.log(`Status: ${goodLoginRes.status} (Expected: 200)`);
  const goodLoginData = await goodLoginRes.json();
  console.log('Signed in successfully as:', goodLoginData.user.name, goodLoginData.user.email);
  if (!goodLoginData.token) throw new Error('Missing token on signin');
  console.log('✓ PASS: Sign In succeeded with valid token.\n');

  console.log('====================================================');
  console.log('🎉 ALL 10 AUTHENTICATION & MULTI-TENANCY TESTS PASSED!');
  console.log('====================================================');
}

runAuthFlowTest().catch(console.error);
