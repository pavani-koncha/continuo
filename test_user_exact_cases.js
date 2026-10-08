async function testUserExactCases() {
  const base = 'http://localhost:5000/api';
  console.log('=================================================================');
  console.log(' TESTING USER EXACT TEST CASES');
  console.log('=================================================================\n');

  // 1. Authenticate user
  const email = `eval_${Date.now()}@continuo.ai`;
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
  console.log('✓ Agent Authenticated:', user.name, user.email);

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
  console.log('✓ Customer Created:', customer.name, `(${customer.company})`);

  // Helper: create conversation thread
  async function createThread(title) {
    const res = await fetch(base + '/conversations', {
      method: 'POST',
      headers,
      body: JSON.stringify({ customerId: customer.id, title })
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

  const thread1 = await createThread('General & Initial Discussion');

  // Case 1: “What is deep learning?”
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST CASE 1: “What is deep learning?”');
  console.log('-----------------------------------------------------------------');
  const res1 = await sendMsg(thread1.id, 'What is deep learning?');
  console.log('Recalled Memories:', res1.recalledMemories.length);
  console.log('Response:\n', res1.continuoMessage.text);
  if (res1.recalledMemories.length > 0) {
    throw new Error('Case 1 FAILED: Customer memory was forced into general deep learning question!');
  }
  if (!res1.continuoMessage.text.toLowerCase().includes('neural network') || !res1.continuoMessage.text.toLowerCase().includes('deep learning')) {
    throw new Error('Case 1 FAILED: Response did not directly explain deep learning!');
  }
  if (res1.continuoMessage.text.includes('General Product') || res1.continuoMessage.text.includes('Sarah Chen')) {
    throw new Error('Case 1 FAILED: Generic response or customer context leaked into general question!');
  }
  console.log('✓ Case 1 PASSED: Directly explained deep learning with 0 customer memories forced.');

  // Case 2: “How can I control anger?”
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST CASE 2: “How can I control anger?”');
  console.log('-----------------------------------------------------------------');
  const res2 = await sendMsg(thread1.id, 'How can I control anger?');
  console.log('Recalled Memories:', res2.recalledMemories.length);
  console.log('Response:\n', res2.continuoMessage.text);
  if (res2.recalledMemories.length > 0) {
    throw new Error('Case 2 FAILED: Customer memory was forced into anger management question!');
  }
  if (!res2.continuoMessage.text.toLowerCase().includes('anger') || !res2.continuoMessage.text.toLowerCase().includes('breathing')) {
    throw new Error('Case 2 FAILED: Response did not directly provide anger management guidance!');
  }
  if (res2.continuoMessage.text.includes('General Product') || res2.continuoMessage.text.includes('Sarah Chen')) {
    throw new Error('Case 2 FAILED: Generic response or customer context leaked into general question!');
  }
  console.log('✓ Case 2 PASSED: Directly answered anger control techniques without customer context.');

  // Case 3: “What is Python?”
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST CASE 3: “What is Python?”');
  console.log('-----------------------------------------------------------------');
  const res3 = await sendMsg(thread1.id, 'What is Python?');
  console.log('Recalled Memories:', res3.recalledMemories.length);
  console.log('Response:\n', res3.continuoMessage.text);
  if (res3.recalledMemories.length > 0) {
    throw new Error('Case 3 FAILED: Customer memory was forced into Python question!');
  }
  if (!res3.continuoMessage.text.toLowerCase().includes('programming language') || !res3.continuoMessage.text.toLowerCase().includes('python')) {
    throw new Error('Case 3 FAILED: Response did not directly explain Python!');
  }
  if (res3.continuoMessage.text.includes('General Product') || res3.continuoMessage.text.includes('Sarah Chen')) {
    throw new Error('Case 3 FAILED: Generic response or customer context leaked into general question!');
  }
  console.log('✓ Case 3 PASSED: Directly explained Python programming language without customer context.');

  // Case 4: Customer message: “Our main concern is pricing and we need a security review before signing.”
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST CASE 4: Customer message: “Our main concern is pricing and we need a security review before signing.”');
  console.log('-----------------------------------------------------------------');
  const res4 = await sendMsg(thread1.id, 'Our main concern is pricing and we need a security review before signing.');
  console.log('Extracted Memories:', res4.extractedMemories.map(m => m.content));
  console.log('Recommended Next Action:', res4.recommendedNextAction);
  console.log('Response:\n', res4.continuoMessage.text);
  if (res4.extractedMemories.length === 0) {
    throw new Error('Case 4 FAILED: Expected memory to be extracted to Hindsight!');
  }
  if (res4.continuoMessage.text.includes('Thank you for sharing your requirement. We have logged this')) {
    throw new Error('Case 4 FAILED: Returned generic "We have logged this" instead of answering the concerns first!');
  }
  if (!res4.continuoMessage.text.toLowerCase().includes('pricing') || !res4.continuoMessage.text.toLowerCase().includes('security review')) {
    throw new Error('Case 4 FAILED: Response did not directly address pricing and security review!');
  }
  console.log('✓ Case 4 PASSED: Directly addressed pricing flexibility & security review process and saved to Hindsight.');

  // Case 5: In a new conversation for the same customer: “What were our main concerns before signing?”
  console.log('\n-----------------------------------------------------------------');
  console.log('TEST CASE 5: In a new conversation: “What were our main concerns before signing?”');
  console.log('-----------------------------------------------------------------');
  const thread2 = await createThread('Contract Execution Discussion');
  const res5 = await sendMsg(thread2.id, 'What were our main concerns before signing?');
  console.log('Recalled Memories Count:', res5.recalledMemories.length);
  console.log('Recalled Memory Content:', res5.recalledMemories.map(m => m.content));
  console.log('Response:\n', res5.continuoMessage.text);
  if (res5.recalledMemories.length === 0) {
    throw new Error('Case 5 FAILED: Did not recall previous Hindsight memories in the new conversation thread!');
  }
  if (!res5.continuoMessage.text.toLowerCase().includes('pricing') || !res5.continuoMessage.text.toLowerCase().includes('security review')) {
    throw new Error('Case 5 FAILED: Response did not cite pricing and security review concerns from recalled memory!');
  }
  console.log('✓ Case 5 PASSED: New thread successfully recalled Hindsight memory and gave personalized answer.');

  console.log('\n=================================================================');
  console.log('🎉 ALL 5 USER EXACT TEST CASES VERIFIED AND PASSED 100%! ');
  console.log('=================================================================');
}

testUserExactCases().catch(err => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
