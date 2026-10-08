async function runTests() {
  const base = 'http://localhost:5000/api';
  console.log('=================================================================');
  console.log(' VERIFYING CHAT RESPONSE LOGIC FIX');
  console.log('=================================================================\n');

  // 1. Authenticate user
  const email = `test_agent_${Date.now()}@continuo.ai`;
  const signupRes = await fetch(base + '/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Agent Smith', email, password: 'password123' })
  });
  const { token, user } = await signupRes.json();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log('✓ Agent Authenticated:', user.name, user.email);

  // Helper: check that generic canned response does NOT appear
  function assertNoGenericBoilerplate(text, caseName) {
    const forbidden = [
      'achieving success or understanding',
      'breaking the problem down into clear components',
      'refers to a significant subject with wide applications',
      'foundational cause-and-effect mechanisms',
      'Clarify the Core Objective'
    ];
    for (const phrase of forbidden) {
      if (text.includes(phrase)) {
        throw new Error(`${caseName} FAILED: Found generic canned response phrase: "${phrase}"`);
      }
    }
  }

  // Helper: create customer
  async function createCustomer(name, company, product) {
    const res = await fetch(base + '/customers', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, company, email: `${name.toLowerCase().replace(/\s+/g, '')}@test.com`, product })
    });
    return await res.json();
  }

  // Helper: create conversation thread
  async function createThread(customerId, title) {
    const res = await fetch(base + '/conversations', {
      method: 'POST',
      headers,
      body: JSON.stringify({ customerId, title })
    });
    return await res.json();
  }

  // Helper: send message
  async function sendMsg(convId, text) {
    const res = await fetch(`${base}/conversations/${convId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    });
    return await res.json();
  }

  // ---------------------------------------------------------------------------
  // TEST 1: User asks "What pricing options do you have for the enterprise platform?"
  // ---------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST 1: "What pricing options do you have for the enterprise platform?"');
  console.log('-----------------------------------------------------------------');
  const customer1 = await createCustomer('Acme Buyer', 'Acme Corp', 'Enterprise Platform');
  const thread1 = await createThread(customer1.id, 'Pricing Inquiries');
  const res1 = await sendMsg(thread1.id, 'What pricing options do you have for the enterprise platform?');

  const answer1 = res1.continuoMessage.text;
  console.log('Answer 1:\n', answer1);
  assertNoGenericBoilerplate(answer1, 'Test 1');

  if (!answer1.toLowerCase().includes('enterprise platform') || !answer1.toLowerCase().includes('tier')) {
    throw new Error('Test 1 FAILED: Answer did not describe Enterprise Platform pricing tiers!');
  }
  if (!answer1.toLowerCase().includes('standard') || !answer1.toLowerCase().includes('professional')) {
    throw new Error('Test 1 FAILED: Answer missed standard/professional tiers!');
  }
  if (!answer1.toLowerCase().includes('not currently recorded') && !answer1.toLowerCase().includes('tailored proposal')) {
    throw new Error('Test 1 FAILED: Answer did not clarify customer-specific custom quote status or ask for seat count!');
  }
  console.log('✓ Test 1 PASSED: Directly explained Enterprise Platform pricing tiers with zero generic canned boilerplate.');

  // Also test with the exact typo user tested earlier: "what pricing options do you have for the enterprice platform"
  console.log('\nTesting typo tolerance ("enterprice platform")...');
  const res1b = await sendMsg(thread1.id, 'what pricing options do you have for the enterprice platform');
  assertNoGenericBoilerplate(res1b.continuoMessage.text, 'Test 1b');
  if (!res1b.continuoMessage.text.toLowerCase().includes('tier')) {
    throw new Error('Test 1b FAILED: Typos in enterprise platform not handled!');
  }
  console.log('✓ Test 1b PASSED: Handled typo variant seamlessly without generic boilerplate.');

  // ---------------------------------------------------------------------------
  // TEST 2: User asks "What is deep learning?"
  // ---------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST 2: "What is deep learning?"');
  console.log('-----------------------------------------------------------------');
  const res2 = await sendMsg(thread1.id, 'What is deep learning?');
  const answer2 = res2.continuoMessage.text;
  console.log('Answer 2:\n', answer2);
  assertNoGenericBoilerplate(answer2, 'Test 2');

  if (res2.recalledMemories.length > 0) {
    throw new Error('Test 2 FAILED: Customer memory was forced into general deep learning question!');
  }
  if (!answer2.toLowerCase().includes('neural network') || !answer2.toLowerCase().includes('deep learning')) {
    throw new Error('Test 2 FAILED: Answer did not explain deep learning!');
  }
  console.log('✓ Test 2 PASSED: Directly explained deep learning with 0 customer memories forced.');

  // ---------------------------------------------------------------------------
  // TEST 3: Navya customer memory & concerns
  // User: "What were Navya's concerns from our previous conversation?"
  // ---------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST 3: Customer Navya\'s memory & concerns');
  console.log('-----------------------------------------------------------------');
  const navya = await createCustomer('Navya', 'Infosys', 'Enterprise Platform');
  const navyaThread1 = await createThread(navya.id, 'Contract Discussion');

  // First: Navya communicates her concerns
  console.log('Step 3a: Navya states: "Our main concern is pricing and we need a security review before signing."');
  const navyaStatement = await sendMsg(navyaThread1.id, 'Our main concern is pricing and we need a security review before signing.');
  console.log('Navya Statement Answer:\n', navyaStatement.continuoMessage.text);
  assertNoGenericBoilerplate(navyaStatement.continuoMessage.text, 'Test 3a');

  if (navyaStatement.extractedMemories.length === 0) {
    throw new Error('Test 3a FAILED: Did not extract requirement memory from Navya\'s statement!');
  }
  console.log('✓ Step 3a PASSED: Extracted memory:', navyaStatement.extractedMemories[0].content);

  // Second: In a new conversation thread, ask about Navya's concerns
  console.log('\nStep 3b: In a fresh conversation, ask: "What were Navya\'s concerns from our previous conversation?"');
  const navyaThread2 = await createThread(navya.id, 'Follow-up Alignment');
  const navyaQueryRes = await sendMsg(navyaThread2.id, "What were Navya's concerns from our previous conversation?");
  const answer3 = navyaQueryRes.continuoMessage.text;
  console.log('Answer 3b:\n', answer3);
  assertNoGenericBoilerplate(answer3, 'Test 3b');

  if (!answer3.toLowerCase().includes('pricing') || !answer3.toLowerCase().includes('security review')) {
    throw new Error('Test 3b FAILED: Answer did not cite Navya\'s actual remembered concerns (pricing and security review)!');
  }
  console.log('✓ Step 3b PASSED: Successfully retrieved Navya\'s actual remembered concerns from Hindsight!');

  // Also test asking from another thread referring to Navya by name
  console.log('\nStep 3c: From Acme thread, ask: "What were Navya\'s concerns from our previous conversation?"');
  const crossThreadRes = await sendMsg(thread1.id, "What were Navya's concerns from our previous conversation?");
  console.log('Answer 3c:\n', crossThreadRes.continuoMessage.text);
  assertNoGenericBoilerplate(crossThreadRes.continuoMessage.text, 'Test 3c');
  if (!crossThreadRes.continuoMessage.text.toLowerCase().includes('pricing') || !crossThreadRes.continuoMessage.text.toLowerCase().includes('security review')) {
    throw new Error('Test 3c FAILED: Name-routed customer inquiry did not cite Navya\'s concerns!');
  }
  console.log('✓ Step 3c PASSED: Name-routed customer inquiry correctly identified Navya and cited concerns.');

  // ---------------------------------------------------------------------------
  // TEST 4: Question about information not on record (Rule 10: Never invent facts)
  // ---------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST 4: Non-existent customer data query (Rule 10: Never invent facts)');
  console.log('-----------------------------------------------------------------');
  const res4 = await sendMsg(thread1.id, "What is this customer's annual renewal budget and timeline?");
  console.log('Answer 4:\n', res4.continuoMessage.text);
  assertNoGenericBoilerplate(res4.continuoMessage.text, 'Test 4');
  if (!res4.continuoMessage.text.toLowerCase().includes('not currently recorded') && !res4.continuoMessage.text.toLowerCase().includes('not currently')) {
    throw new Error('Test 4 FAILED: AI invented facts instead of stating information is not on record!');
  }
  console.log('✓ Test 4 PASSED: Accurately stated information is not currently recorded without inventing facts.');

  // ---------------------------------------------------------------------------
  // TEST 5: Open-ended questions across different domains
  // ---------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST 5: Open-ended questions across different domains');
  console.log('-----------------------------------------------------------------');

  const questions = [
    { q: 'How can I control anger?', expected: ['anger', 'breathing'] },
    { q: 'What is Python?', expected: ['python', 'programming'] },
    { q: 'How do I reset my password?', expected: ['password', 'reset'] },
    { q: 'What is cloud computing?', expected: ['cloud', 'iaas'] },
    { q: 'How to implement a binary search in TypeScript?', expected: ['binarysearch', 'left'] },
    { q: 'What is the capital of France?', expected: ['paris'] },
    { q: 'Can you write a hello world in Rust?', expected: ['println!', 'main'] },
    { q: 'Why is the sky blue?', expected: ['rayleigh', 'scattering'] }
  ];

  for (const { q, expected } of questions) {
    const res = await sendMsg(thread1.id, q);
    const ans = res.continuoMessage.text;
    assertNoGenericBoilerplate(ans, `Question: "${q}"`);
    for (const exp of expected) {
      if (!ans.toLowerCase().replace(/\s+/g, '').includes(exp)) {
        throw new Error(`Question "${q}" failed to include expected term "${exp}"!`);
      }
    }
    console.log(`✓ "${q}" -> Answered directly (${ans.slice(0, 70).replace(/\n/g, ' ')}...)`);
  }

  console.log('\n=================================================================');
  console.log(' ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY! ZERO CANNED RESPONSES.');
  console.log('=================================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err.message);
  process.exit(1);
});
