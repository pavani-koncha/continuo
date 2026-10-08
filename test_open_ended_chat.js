async function runOpenEndedChatTests() {
  const base = 'http://localhost:5000/api';
  console.log('--- STARTING CONTINUO OPEN-ENDED CHAT VERIFICATION ---');

  // 1. Authenticate user
  const email = `test_chat_${Date.now()}@continuo.ai`;
  const signupRes = await fetch(base + '/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alex Lead', email, password: 'password123' })
  });
  const { token, user } = await signupRes.json();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log('1. User Authenticated:', user.name, user.email);

  // 2. Create customer
  const custRes = await fetch(base + '/customers', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Sarah Chen',
      company: 'Apex Global',
      email: 'sarah@apexglobal.com',
      product: 'Enterprise Platform'
    })
  });
  const customer = await custRes.json();
  console.log('2. Customer Created:', customer.name, `(${customer.company})`);

  // 3. Create conversation thread
  const convRes = await fetch(base + '/conversations', {
    method: 'POST',
    headers,
    body: JSON.stringify({ customerId: customer.id, title: 'Evaluation Thread' })
  });
  const conv = await convRes.json();
  console.log('3. Conversation Thread Initialized:', conv.id);

  // Test Helper
  async function sendMessage(text) {
    const res = await fetch(`${base}/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    });
    return await res.json();
  }

  // 4. Test Customer Requirement Input
  console.log('\n4. Testing Customer Requirement: "We need a security review before signing the contract."');
  const resReq = await sendMessage('We need a security review before signing the contract.');
  console.log('  Reply:', resReq.continuoMessage.text);
  console.log('  Extracted Memories:', resReq.extractedMemories.map(m => m.content));
  if (resReq.extractedMemories.length === 0) {
    throw new Error('FAILED: Expected requirement memory to be extracted');
  }

  // 5. Test Customer Question WITH Memory: "Can we sign the contract today?"
  console.log('\n5. Testing Customer Question WITH Memory: "Can we sign the contract today?"');
  const resSign = await sendMessage('Can we sign the contract today?');
  console.log('  Recalled Memories:', resSign.recalledMemories.map(m => m.content));
  console.log('  Reply:', resSign.continuoMessage.text);
  if (!resSign.continuoMessage.text.toLowerCase().includes('security')) {
    throw new Error('FAILED: Expected answer to reference the security review blocker');
  }

  // 6. Test Customer Question with MISSING Information: "What is their annual IT budget?"
  console.log('\n6. Testing Customer Question with MISSING Information: "What is their annual IT budget?"');
  const resBudget = await sendMessage('What is their annual IT budget?');
  console.log('  Reply:', resBudget.continuoMessage.text);
  if (!resBudget.continuoMessage.text.toLowerCase().includes('not currently recorded')) {
    throw new Error('FAILED: Expected response to state information is not recorded');
  }

  // 7. Test General Question: "What is the speed of light?"
  console.log('\n7. Testing General Question: "What is the speed of light?"');
  const resLight = await sendMessage('What is the speed of light?');
  console.log('  Recalled Memories Count:', resLight.recalledMemories.length);
  console.log('  Reply:', resLight.continuoMessage.text);
  if (resLight.recalledMemories.length > 0) {
    throw new Error('FAILED: General question should NOT recall customer memories');
  }
  if (!resLight.continuoMessage.text.includes('299,792,458') && !resLight.continuoMessage.text.toLowerCase().includes('speed of light')) {
    throw new Error('FAILED: Expected direct answer to speed of light');
  }
  if (resLight.continuoMessage.text.includes('Sarah Chen') || resLight.continuoMessage.text.includes('Apex Global')) {
    throw new Error('FAILED: Customer context leaked into unrelated question');
  }

  // 8. Test General Programming Question: "Can you explain binary search in TypeScript?"
  console.log('\n8. Testing General Question: "Can you explain binary search in TypeScript?"');
  const resSearch = await sendMessage('Can you explain binary search in TypeScript?');
  console.log('  Recalled Memories Count:', resSearch.recalledMemories.length);
  console.log('  Reply snippet:', resSearch.continuoMessage.text.slice(0, 150));
  if (resSearch.recalledMemories.length > 0) {
    throw new Error('FAILED: General question should NOT recall customer memories');
  }
  if (!resSearch.continuoMessage.text.toLowerCase().includes('binary search')) {
    throw new Error('FAILED: Expected direct binary search explanation');
  }

  // 9. Test General Emotional Question: "How to control anger?"
  console.log('\n9. Testing General Question: "How to control anger?"');
  const resAnger = await sendMessage('How to control anger?');
  console.log('  Recalled Memories Count:', resAnger.recalledMemories.length);
  console.log('  Reply snippet:', resAnger.continuoMessage.text.slice(0, 150));
  if (resAnger.recalledMemories.length > 0) {
    throw new Error('FAILED: General question should NOT recall customer memories');
  }
  if (!resAnger.continuoMessage.text.toLowerCase().includes('anger')) {
    throw new Error('FAILED: Expected direct anger management answer');
  }

  // 10. Test Tricky General Question with word "deal": "How do I deal with burnout?"
  console.log('\n10. Testing General Question with word "deal": "How do I deal with burnout?"');
  const resBurnout = await sendMessage('How do I deal with burnout?');
  console.log('  Reply snippet:', resBurnout.continuoMessage.text.slice(0, 150));
  if (resBurnout.continuoMessage.text.includes('not currently recorded in the account history')) {
    throw new Error('FAILED: "How do I deal with burnout?" was incorrectly classified as customer deal inquiry!');
  }

  // 11. Test Tricky General Question with word "contract": "What is a smart contract in blockchain?"
  console.log('\n11. Testing General Question with word "contract": "What is a smart contract in blockchain?"');
  const resSmartContract = await sendMessage('What is a smart contract in blockchain?');
  console.log('  Reply snippet:', resSmartContract.continuoMessage.text.slice(0, 150));
  if (resSmartContract.continuoMessage.text.includes('not currently recorded in the account history')) {
    throw new Error('FAILED: "What is a smart contract in blockchain?" was incorrectly classified as customer contract inquiry!');
  }

  // 12. Check for generic boilerplate phrases
  const allReplies = [resLight.continuoMessage.text, resSearch.continuoMessage.text, resAnger.continuoMessage.text, resBurnout.continuoMessage.text];
  for (const r of allReplies) {
    if (r.includes('General Product') || r.includes('Core Definition') || r.includes('Primary Purpose')) {
      throw new Error('FAILED: Found generic template phrases in reply!');
    }
  }

  console.log('\n======================================================');
  console.log(' ALL 12 CONTINUO OPEN-ENDED CHAT TESTS PASSED! ');
  console.log('======================================================');
}

runOpenEndedChatTests().catch(err => {
  console.error('\nTEST RUN FAILED:', err.message);
  process.exit(1);
});
