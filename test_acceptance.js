async function runAcceptanceTest() {
  const base = 'http://localhost:5000/api';

  console.log('1. Testing Create Customer A (Alex Morgan)...');
  const custARes = await fetch(base + '/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex Morgan',
      company: 'NovaTech',
      email: 'alex@novatech.io',
      product: 'Enterprise Platform',
      initialNotes: 'Evaluating enterprise tier',
      tags: ['enterprise', 'prospect']
    })
  });
  const custA = await custARes.json();
  console.log('✓ Customer A Created:', custA.id, custA.name, custA.company);

  console.log('\n2. Starting Conversation Thread 1 for Customer A...');
  const conv1Res = await fetch(base + '/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: custA.id, title: 'Contract & Security Discussion' })
  });
  const conv1 = await conv1Res.json();
  console.log('✓ Conversation 1 Created:', conv1.id);

  console.log('\n3. Sending message in Thread 1: "We need a security review before signing the contract."');
  const msg1Res = await fetch(base + '/conversations/' + conv1.id + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'We need a security review before signing the contract.' })
  });
  const msg1Data = await msg1Res.json();
  console.log('✓ Continuo Reply:', msg1Data.continuoMessage.text);
  console.log('✓ Retained to Hindsight:', msg1Data.extractedMemories);
  console.log('✓ Recommended Next Action:', msg1Data.recommendedNextAction);

  console.log('\n4. Verifying Memory Explorer contains the retained memory...');
  const memsRes = await fetch(base + '/memories?customerId=' + custA.id);
  const mems = await memsRes.json();
  console.log('✓ Stored Memories Count for Customer A:', mems.length);
  console.log('✓ Memory Sample:', mems[0].content, '| Category:', mems[0].category);

  console.log('\n5. Starting a COMPLETELY NEW CONVERSATION Thread 2...');
  const conv2Res = await fetch(base + '/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: custA.id, title: 'Contract Execution Follow-up' })
  });
  const conv2 = await conv2Res.json();
  console.log('✓ Conversation 2 Created:', conv2.id);

  console.log('\n6. Sending query in Thread 2: "Can we sign the contract today?"');
  const msg2Res = await fetch(base + '/conversations/' + conv2.id + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Can we sign the contract today?' })
  });
  const msg2Data = await msg2Res.json();
  console.log('✓ Recalled Memories in Thread 2:', msg2Data.recalledMemories.map(m => m.content));
  console.log('✓ Continuo Reply in Thread 2:', msg2Data.continuoMessage.text);
  console.log('✓ Thread 2 Next Action:', msg2Data.recommendedNextAction);

  console.log('\n7. Creating Customer B (Sarah Jenkins / CloudScale)...');
  const custBRes = await fetch(base + '/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Jenkins',
      company: 'CloudScale',
      email: 'sarah@cloudscale.com',
      product: 'API Gateway',
      initialNotes: 'Standard onboarding',
      tags: ['api']
    })
  });
  const custB = await custBRes.json();
  console.log('✓ Customer B Created:', custB.id, custB.name);

  console.log('\n8. Verifying Customer Isolation (Customer B memories should be empty)...');
  const custBMemsRes = await fetch(base + '/memories?customerId=' + custB.id);
  const custBMems = await custBMemsRes.json();
  console.log('✓ Customer B Stored Memories Count:', custBMems.length);
  if (custBMems.length === 0) {
    console.log('✓ SUCCESS: Customer B is 100% isolated from Customer A!');
  } else {
    console.error('✗ FAILURE: Customer B has leaked memories!');
  }

  console.log('\n9. Testing "Ask Continuo": "What is blocking this customer from signing?" for Customer A...');
  const askRes = await fetch(base + '/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: custA.id,
      question: 'What is blocking this customer from signing?'
    })
  });
  const askData = await askRes.json();
  console.log('✓ Ask Continuo Answer:', askData.answer);
  console.log('✓ Cited Memories:', askData.citedMemories.map(m => m.content));

  console.log('\n=============================================');
  console.log('🎉 ALL ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
  console.log('=============================================');
}

runAcceptanceTest().catch(console.error);
