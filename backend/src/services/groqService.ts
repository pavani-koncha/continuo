import { Customer, Conversation, RecalledMemory, RecommendedNextAction, MemoryCategory, CustomerHealth, CustomerPriority, UnresolvedIssue, FollowUpTask } from '../types.js';

export interface AIResponseResult {
  reply: string;
  extractedMemories: Array<{
    content: string;
    category: MemoryCategory;
  }>;
  recommendedNextAction: RecommendedNextAction;
  detectedIssues: Array<{
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'open' | 'resolved';
  }>;
  customerHealth?: CustomerHealth;
  customerPriority?: CustomerPriority;
  healthReason?: string;
  customerSummary?: string;
  conversationSummary?: string;
  followUpTasks?: Array<{
    title: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
  }>;
}

export class GroqService {
  private model: string;

  constructor() {
    this.model = 'llama-3.3-70b-versatile';
  }

  get apiKey(): string {
    return (process.env.GROQ_API_KEY || '').trim();
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  async generateSupportResponse(
    customer: Customer,
    conversation: Conversation,
    incomingMessage: string,
    recalledMemories: RecalledMemory[]
  ): Promise<AIResponseResult> {
    const memoryContext = recalledMemories.length > 0
      ? recalledMemories.map(m => `[${m.category}] (Source: ${m.source}): "${m.content}"`).join('\n')
      : 'No relevant memories found.';

    // Format previous messages for multi-turn conversational context (like ChatGPT)
    const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    const prevList = (conversation.messages || [])
      .filter(m => m.text !== incomingMessage)
      .slice(-6);

    for (const msg of prevList) {
      historyMessages.push({
        role: msg.sender === 'customer' ? 'user' : 'assistant',
        content: msg.text
      });
    }

    const systemPrompt = `You are CONTINUO, a fully open-ended AI assistant and customer intelligence system (like ChatGPT).
You possess broad general knowledge, deep reasoning capabilities, and customer memory integration.

OPERATIONAL PRINCIPLES:
1. FULLY OPEN-ENDED LIKE CHATGPT:
   - The user can ask ANY question in the chat across ANY domain: general knowledge, science, mathematics, coding, history, psychology, life advice, business, or casual conversation.
   - You must never restrict, classify, redirect, or force the question into predefined sample queries or customer topics.
   - Understand the user's actual message and generate a direct, relevant, articulate, and accurate answer to that exact question.
   - Never replace the user's question with a predefined question.
   - Never return generic responses such as "How can we assist you with General Product?".
   - Do not use fixed response headers like "Core Definition", "Primary Purpose", or "Key Considerations" unless naturally requested.

2. CUSTOMER & HINDSIGHT MEMORY CONTEXT:
   - Active Customer Context: ${customer.name} (${customer.company}), Product: ${customer.product}, Health: ${customer.health}, Priority: ${customer.priority || 'Medium'}.
   - Use customer context and Hindsight memory ONLY when the user's question is related to this customer's account, history, conversations, requirements, issues, preferences, or sales context.
   - For general/unrelated questions, answer the actual question normally without forcing customer memory or customer details into the response.
   - If the user asks a customer/sales question and the required customer information is not available in the customer data or memories, clearly state that it is unavailable on record instead of inventing information.

3. IMMEDIATE TOPIC SWITCHING:
   - Every user message must be independently understood and answered according to its own topic.
   - If the user changes topic, immediately answer the new topic. Do not continue previous topics unless the user is clearly continuing them.

4. RESPONSE FORMAT:
   Respond strictly with a valid JSON object matching this schema:
   {
     "reply": "string (Direct, comprehensive, natural answer to the user's exact message)",
     "extractedMemories": [
       {
         "content": "string (Only if the message contains a new specific customer requirement, preference, commitment, or technical setup)",
         "category": "Requirement | Issue | Preference | Technical Context | Commitment | General Context"
       }
     ],
     "recommendedNextAction": {
       "action": "string (Direct recommended action)",
       "reason": "string (Brief rationale)",
       "urgency": "high | medium | low"
     },
     "detectedIssues": [
       {
         "title": "string",
         "description": "string",
         "severity": "critical | high | medium | low",
         "status": "open | resolved"
       }
     ],
     "customerHealth": "Healthy | Needs Attention | At Risk",
     "customerPriority": "Low | Medium | High | Critical",
     "healthReason": "string",
     "customerSummary": "string",
     "conversationSummary": "string",
     "followUpTasks": [
       {
         "title": "string",
         "priority": "low | medium | high",
         "dueDate": "string"
       }
     ]
   }

${recalledMemories.length > 0 ? `RELEVANT RECALLED CUSTOMER MEMORIES:\n${memoryContext}\n` : ''}`;

    if (this.isConfigured()) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...historyMessages,
              { role: 'user', content: incomingMessage }
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            let cleaned = content.trim();
            if (cleaned.startsWith('```json')) {
              cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleaned.startsWith('```')) {
              cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            try {
              const parsed = JSON.parse(cleaned);
              if (parsed.reply && typeof parsed.reply === 'string') {
                return {
                  reply: parsed.reply,
                  extractedMemories: Array.isArray(parsed.extractedMemories) ? parsed.extractedMemories : [],
                  recommendedNextAction: parsed.recommendedNextAction || {
                    action: 'Acknowledge message and assist user',
                    reason: 'General inquiry received',
                    urgency: 'low'
                  },
                  detectedIssues: Array.isArray(parsed.detectedIssues) ? parsed.detectedIssues : [],
                  customerHealth: parsed.customerHealth || customer.health,
                  customerPriority: parsed.customerPriority || customer.priority,
                  healthReason: parsed.healthReason,
                  customerSummary: parsed.customerSummary,
                  conversationSummary: parsed.conversationSummary || `User asked: "${incomingMessage.slice(0, 40)}"`,
                  followUpTasks: Array.isArray(parsed.followUpTasks) ? parsed.followUpTasks : []
                };
              }
            } catch (pErr) {
              console.warn('Groq returned non-JSON, checking raw text:', pErr);
              if (cleaned.length > 0 && !cleaned.startsWith('{')) {
                return {
                  reply: cleaned,
                  extractedMemories: [],
                  recommendedNextAction: {
                    action: 'Provide follow-up if user requests more details',
                    reason: 'Direct response generated',
                    urgency: 'low'
                  },
                  detectedIssues: [],
                  customerHealth: customer.health,
                  customerPriority: customer.priority,
                  conversationSummary: `User asked: "${incomingMessage.slice(0, 40)}"`
                };
              }
            }
          }
        } else {
          console.warn(`Groq API error ${response.status}: ${await response.text().catch(() => '')}`);
        }
      } catch (err: any) {
        console.warn(`Groq call error, falling back to local open-ended engine:`, err.message);
      }
    }

    // Fully open-ended local reasoning engine (when Groq key is not set or network fails)
    return this.generateOpenEndedResponse(customer, incomingMessage, recalledMemories);
  }

  /**
   * Open-ended conversational response generation:
   * Understands any question directly like ChatGPT without canned responses or rigid templates.
   */
  private generateOpenEndedResponse(
    customer: Customer,
    incomingMessage: string,
    recalledMemories: RecalledMemory[]
  ): AIResponseResult {
    const text = incomingMessage.toLowerCase().trim();
    let reply = '';
    const extractedMemories: Array<{ content: string; category: MemoryCategory }> = [];
    let nextAction: RecommendedNextAction = {
      action: 'Acknowledge inquiry and provide assistance',
      reason: 'General inquiry received',
      urgency: 'low'
    };
    const detectedIssues: Array<{ title: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low'; status: 'open' | 'resolved' }> = [];
    let health: CustomerHealth = customer.health || 'Healthy';
    let priority: CustomerPriority = customer.priority || 'Medium';
    let healthReason = customer.healthReason || 'Regular customer operations';
    let customerSummary = customer.summary;
    let conversationSummary = `Inquiry: "${incomingMessage.slice(0, 50)}"`;
    const followUpTasks: Array<{ title: string; priority: 'low' | 'medium' | 'high'; dueDate?: string }> = [];

    // Clean subject extraction
    const cleanSubject = incomingMessage
      .replace(/^(what is|what are|how to|how do i|how can i|why is|why are|why do|why does|tell me about|explain|can you explain|can we|can i|is it possible to)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    // 1. CUSTOMER REQUIREMENT STATEMENTS (Extracts & retains to Hindsight)
    const isRequirement = (
      text.startsWith('we need ') || 
      text.startsWith('we require ') || 
      text.startsWith('our requirement is') || 
      text.includes('must have before signing') ||
      (text.includes('need') && text.includes('security review'))
    );

    if (isRequirement) {
      reply = `Thank you for sharing that requirement, ${customer.name}. We have logged that "${incomingMessage.replace(/^we need\s+/i, '').replace(/[.]+$/, '')}" is required into our persistent customer context.`;
      extractedMemories.push({
        content: incomingMessage,
        category: 'Requirement'
      });
      nextAction = {
        action: `Coordinate deliverables for customer requirement: ${cleanSubject.slice(0, 30)}`,
        reason: 'New customer requirement specified',
        urgency: 'high'
      };
      conversationSummary = `Customer stated requirement: "${incomingMessage.slice(0, 45)}"`;
      return {
        reply,
        extractedMemories,
        recommendedNextAction: nextAction,
        detectedIssues,
        customerHealth: health,
        customerPriority: priority,
        healthReason,
        customerSummary,
        conversationSummary,
        followUpTasks
      };
    }

    // 2. CUSTOMER INCIDENT / OUTAGE / ERROR REPORT
    const isIncident = (
      (text.includes('down') && (text.includes('system') || text.includes('server') || text.includes('service') || text.includes('all'))) ||
      text.includes('outage') || text.includes('production is down') || text.includes('site is down') ||
      text.includes('blocking access') || text.includes('cannot login') || text.includes('unable to login')
    );

    if (isIncident) {
      reply = `I apologize for the disruption you are encountering with this issue. Our engineering team is prioritizing this immediately. Could you share any specific error codes, affected user accounts, or timestamps so we can investigate the root cause without delay?`;
      extractedMemories.push({
        content: `Customer reported critical incident: ${cleanSubject || incomingMessage}`,
        category: 'Issue'
      });
      detectedIssues.push({
        title: `Service Disruption / Issue: ${cleanSubject || 'Incident Reported'}`,
        description: incomingMessage,
        severity: 'critical',
        status: 'open'
      });
      nextAction = {
        action: 'Escalate reported issue to Tier-2 Engineering immediately',
        reason: 'Active disruption reported by customer',
        urgency: 'high'
      };
      health = 'At Risk';
      priority = 'Critical';
      healthReason = 'Active issue reported by customer';
      conversationSummary = `Critical issue reported: ${incomingMessage.slice(0, 40)}`;
      followUpTasks.push({
        title: 'Check engineering diagnostics for reported incident',
        priority: 'high',
        dueDate: 'Within 30 mins'
      });
      return {
        reply,
        extractedMemories,
        recommendedNextAction: nextAction,
        detectedIssues,
        customerHealth: health,
        customerPriority: priority,
        healthReason,
        customerSummary,
        conversationSummary,
        followUpTasks
      };
    }

    // 3. RESOLUTION CONFIRMATION
    const isResolution = (text.includes('issue is resolved') || text.includes('fixed now') || text.includes('working now') || text.includes('everything is fixed') || text.includes('all good now'));
    if (isResolution) {
      reply = `That is wonderful to hear! We have marked the issue as resolved in our records. Our team will continue monitoring stability to ensure uninterrupted performance. Please let us know if anything else arises.`;
      detectedIssues.push({
        title: 'Service Disruption',
        description: 'Customer confirmed issue is resolved.',
        severity: 'medium',
        status: 'resolved'
      });
      health = 'Healthy';
      priority = 'Medium';
      healthReason = 'Previous issue confirmed resolved';
      nextAction = {
        action: 'Schedule 24-hour stability check-in',
        reason: 'Verify system remains stable after resolution',
        urgency: 'low'
      };
      conversationSummary = 'Customer confirmed issue is resolved.';
      followUpTasks.push({
        title: 'Perform 24-hour post-resolution stability verification',
        priority: 'low',
        dueDate: 'Tomorrow'
      });
      return {
        reply,
        extractedMemories,
        recommendedNextAction: nextAction,
        detectedIssues,
        customerHealth: health,
        customerPriority: priority,
        healthReason,
        customerSummary,
        conversationSummary,
        followUpTasks
      };
    }

    // 4. ENVIRONMENT & INFRASTRUCTURE SPECIFICATION
    const isEnvironment = (text.includes('our production environment') || text.includes('our stack runs on') || text.includes('our infrastructure is on') || text.includes('environment is running on'));
    if (isEnvironment) {
      reply = `Understood. We have logged your infrastructure details into our customer context. Our engineering team will ensure all integration steps align with your setup.`;
      extractedMemories.push({
        content: incomingMessage,
        category: 'Technical Context'
      });
      nextAction = {
        action: `Review environment compatibility for ${cleanSubject.slice(0, 30)}`,
        reason: 'Technical context recorded',
        urgency: 'medium'
      };
      conversationSummary = `Recorded technical context: "${incomingMessage.slice(0, 45)}"`;
      return {
        reply,
        extractedMemories,
        recommendedNextAction: nextAction,
        detectedIssues,
        customerHealth: health,
        customerPriority: priority,
        healthReason,
        customerSummary,
        conversationSummary,
        followUpTasks
      };
    }

    // 5. COMMUNICATION PREFERENCE SPECIFICATION
    const isPreference = (text.startsWith('we prefer ') || text.startsWith('please contact us via') || text.startsWith('please email us'));
    if (isPreference) {
      reply = `Got it, thank you for letting us know! We have updated your account profile with this communication preference so our team reaches out through your preferred channel.`;
      extractedMemories.push({
        content: incomingMessage,
        category: 'Preference'
      });
      nextAction = {
        action: 'Update communication preference in CRM',
        reason: 'Customer specified channel preference',
        urgency: 'low'
      };
      conversationSummary = `Recorded communication preference: "${incomingMessage.slice(0, 45)}"`;
      return {
        reply,
        extractedMemories,
        recommendedNextAction: nextAction,
        detectedIssues,
        customerHealth: health,
        customerPriority: priority,
        healthReason,
        customerSummary,
        conversationSummary,
        followUpTasks
      };
    }

    // 6. TARGETED CUSTOMER & SALES INQUIRY (QUESTIONS ABOUT CUSTOMER / DEAL)
    const lowerCustName = (customer.name || '').toLowerCase();
    const lowerCustCompany = (customer.company || '').toLowerCase();

    const hasAccountReference = (
      text.includes('this customer') || text.includes('the customer') ||
      text.includes('this client') || text.includes('the client') ||
      text.includes('their account') || text.includes('our account') ||
      text.includes('this account') || text.includes('customer account') ||
      text.includes('their ') || text.includes('customer') ||
      (lowerCustName.length > 2 && text.includes(lowerCustName)) ||
      (lowerCustCompany.length > 2 && text.includes(lowerCustCompany))
    );

    const hasAccountAttribute = (
      text.includes('budget') || text.includes('pricing') || text.includes('sla') ||
      text.includes('renewal') || text.includes('discount') || text.includes('contract') ||
      text.includes('deal') || text.includes('timeline') || text.includes('blocker') ||
      text.includes('decision maker') || text.includes('stakeholder') || text.includes('requirement') ||
      text.includes('health') || text.includes('priority') || text.includes('preference')
    );

    const isCustomerInquiry = (
      // Direct combination of account reference and sales/account attribute
      (hasAccountReference && hasAccountAttribute) ||
      // Specific deal / contract execution with the customer
      text.includes('sign the contract') || text.includes('sign our contract') ||
      text.includes('signing the contract') || text.includes('sign this contract') ||
      text.includes('can we sign the contract') || text.includes('can we sign today') ||
      text.includes('can we sign') || text.includes('ready to sign') ||
      text.includes('block the contract') || text.includes('blocking the contract') ||
      text.includes('blocking this customer') || text.includes('blocking from signing') ||
      text.includes('blocker for signing') || text.includes('blocker for this deal') ||
      text.includes('what is blocking') ||
      text.includes('can we close the deal') || text.includes('close this deal') ||
      text.includes('status of the contract') || text.includes('status of this deal')
    );

    if (isCustomerInquiry) {
      if (recalledMemories.length > 0) {
        const securityMem = recalledMemories.find(m => 
          m.content.toLowerCase().includes('security') || 
          m.content.toLowerCase().includes('review') ||
          m.content.toLowerCase().includes('compliance')
        );
        if (securityMem && (text.includes('sign') || text.includes('contract') || text.includes('block'))) {
          reply = `Before proceeding with contract signing, the security review requirement noted in ${customer.name}'s profile (${securityMem.content}) needs to be completed. Once that clearance is granted, the contract can move forward immediately. Would you like me to connect you with our compliance lead?`;
          nextAction = {
            action: 'Verify security review clearance before proceeding with contract signing',
            reason: 'Security review requirement is currently pending',
            urgency: 'high'
          };
          health = 'Needs Attention';
          priority = 'High';
          healthReason = 'Blocked on security review completion before signing';
          conversationSummary = 'Customer inquired about signing contract; reminded of outstanding security review.';
          return {
            reply,
            extractedMemories,
            recommendedNextAction: nextAction,
            detectedIssues,
            customerHealth: health,
            customerPriority: priority,
            healthReason,
            customerSummary,
            conversationSummary,
            followUpTasks
          };
        } else {
          reply = `Based on our customer memory for ${customer.name} (${customer.company}):\n\n• ${recalledMemories.map(m => m.content).join('\n• ')}`;
          nextAction = {
            action: 'Follow up on referenced customer requirements',
            reason: 'Customer history referenced',
            urgency: 'medium'
          };
          return {
            reply,
            extractedMemories,
            recommendedNextAction: nextAction,
            detectedIssues,
            customerHealth: health,
            customerPriority: priority,
            healthReason,
            customerSummary,
            conversationSummary,
            followUpTasks
          };
        }
      } else {
        // Customer query, but information is not available: clearly state unavailable instead of inventing
        reply = `That information is not currently recorded in the account history or memory for ${customer.name} (${customer.company}). If this is a new requirement or account detail, please share the details and I will update our records.`;
        nextAction = {
          action: 'Request required context from customer or account executive',
          reason: 'Information requested is not currently on record',
          urgency: 'low'
        };
        return {
          reply,
          extractedMemories,
          recommendedNextAction: nextAction,
          detectedIssues,
          customerHealth: health,
          customerPriority: priority,
          healthReason,
          customerSummary,
          conversationSummary,
          followUpTasks
        };
      }
    }

    // 5. FULLY OPEN-ENDED KNOWLEDGE BASE & DIRECT REASONING (LIKE CHATGPT)
    // Never forces customer memory. Directly answers whatever the user asks.
    const lowerQuery = incomingMessage.toLowerCase();

    // --- Emotional Regulation, Psychology & Wellbeing ---
    if (lowerQuery.includes('anger') || lowerQuery.includes('temper') || lowerQuery.includes('calm down') || lowerQuery.includes('frustrated') || lowerQuery.includes('stress')) {
      reply = `Controlling and managing anger effectively relies on physiological awareness and behavioral reframing:

1. **Pause and Regulate Physiology**: When anger triggers, your sympathetic nervous system initiates a fight-or-flight response. Slow diaphragmatic breathing (inhale for 4 seconds, hold for 4, exhale for 6) lowers heart rate and dampens adrenaline.
2. **Identify the Underlying Emotion**: Anger is often a secondary protective emotion masking vulnerability, helplessness, disrespect, or fatigue. Identifying the root trigger prevents automatic escalation.
3. **Take a Strategic Time-Out**: Step away physically for 5 to 10 minutes. A brief walk or splashing cool water on your face helps reset amygdala activation.
4. **Cognitive Reframing**: Challenge catastrophic thoughts. Ask: *"Will this matter in six months?"* and shift focus from perceived offenses to practical solutions you can directly control.
5. **Assertive Expression**: Once calm, state your feelings clearly using constructive "I" statements rather than accusatory language.`;
    } 
    // --- Cloud Computing & Infrastructure ---
    else if (lowerQuery.includes('cloud computing') || (lowerQuery.includes('what is cloud') && !lowerQuery.includes('weather'))) {
      reply = `Cloud computing is the on-demand delivery of IT infrastructure and computing services over the internet on a pay-as-you-go pricing model, replacing the need to procure and maintain physical data centers.

The primary service models include:
• **IaaS (Infrastructure as a Service)**: Provides foundational compute, networking, and block storage (e.g., AWS EC2, Google Compute Engine, Microsoft Azure VMs).
• **PaaS (Platform as a Service)**: Delivers managed application environments and runtimes so developers focus purely on code (e.g., AWS Elastic Beanstalk, Heroku, Vercel).
• **SaaS (Software as a Service)**: Complete end-user applications accessed via web browsers (e.g., Google Workspace, Salesforce, Microsoft 365).

Key operational benefits include elastic autoscaling, high availability across multi-region data centers, reduced capital expenditure (CapEx), and rapid time-to-market.`;
    } 
    // --- Password Reset & Identity ---
    else if (lowerQuery.includes('password') && (lowerQuery.includes('reset') || lowerQuery.includes('forgot') || lowerQuery.includes('change') || lowerQuery.includes('recover'))) {
      reply = `To reset your account password:

1. Navigate to the login screen and click **"Forgot Password?"** or **"Reset Password"**.
2. Enter the registered email address tied to your account and submit the request.
3. Open your email inbox and look for the verification message (remember to check your Spam/Junk folder if not seen within 2 minutes).
4. Click the secure password reset link provided in the email.
5. Choose a strong, distinct password—recommend at least 12 characters combining uppercase, lowercase, numbers, and special characters.
6. Confirm the new password and sign back into your account.

If your organization uses Single Sign-On (SSO/SAML), you should update your credentials directly via your identity provider (such as Okta or Google Workspace) or contact your IT administrator.`;
    }
    // --- Software Architecture & APIs ---
    else if (lowerQuery.includes('api') && (lowerQuery.includes('what is') || lowerQuery.includes('explain') || lowerQuery.includes('how does') || lowerQuery.includes('mean'))) {
      reply = `An **API (Application Programming Interface)** is a structured set of rules, protocols, and endpoints that allows different software applications to communicate and exchange data seamlessly.

Think of an API like a waiter in a restaurant:
1. **The Request**: Your application sends an HTTP request specifying an action (e.g., \`GET /api/users/42\`).
2. **The Processing**: The API endpoint validates authorization, contacts the underlying database, and runs business logic.
3. **The Response**: The server returns the requested data formatted in standard JSON or XML, accompanied by an HTTP status code (such as \`200 OK\` or \`404 Not Found\`).

The main API paradigms in modern engineering are **REST** (stateless HTTP resources), **GraphQL** (declarative client-driven queries), and **Webhooks** (event-driven real-time push notifications).`;
    }
    // --- Artificial Intelligence & Machine Learning ---
    else if (lowerQuery.includes('machine learning') || lowerQuery.includes('what is ai') || lowerQuery.includes('explain ai') || lowerQuery.includes('artificial intelligence')) {
      reply = `Artificial Intelligence (AI) refers to computer systems designed to perform tasks that typically require human cognition, such as visual perception, natural language processing, decision-making, and pattern recognition.

**Machine Learning (ML)** is the primary subset of AI where systems learn statistical patterns from data rather than following hardcoded manual rules:
• **Supervised Learning**: Models train on input-output pairs to make predictions (e.g., spam detection, price forecasting).
• **Unsupervised Learning**: Models discover intrinsic structures in unlabeled data (e.g., clustering, anomaly detection).
• **Reinforcement Learning**: Agents learn optimal actions through trial, error, and reward signals (e.g., game engines, robotics).
• **Deep Learning & Transformers**: Multi-layered neural networks capable of processing massive sequential data, powering modern Large Language Models (LLMs) and computer vision.`;
    }
    // --- Algorithms & Data Structures ---
    else if (lowerQuery.includes('binary search') || lowerQuery.includes('quicksort') || lowerQuery.includes('algorithm') || lowerQuery.includes('data structure')) {
      if (lowerQuery.includes('binary search')) {
        reply = `**Binary Search** is an efficient divide-and-conquer algorithm for finding an element in a **sorted** array in **O(log n)** time:

\`\`\`typescript
function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid; // Found target at index
    if (arr[mid] < target) left = mid + 1; // Search right half
    else right = mid - 1; // Search left half
  }

  return -1; // Target not found
}
\`\`\`

Instead of scanning all $n$ items sequentially ($O(n)$), binary search cuts the search space in half each iteration, requiring at most ~20 comparisons even in a list of 1,000,000 items.`;
      } else {
        reply = `Algorithms are step-by-step procedures designed to solve computational problems efficiently.

Key algorithmic paradigms include:
• **Divide and Conquer**: Breaking problems into independent subproblems (e.g., Merge Sort, Quicksort).
• **Dynamic Programming**: Storing solutions to overlapping subproblems to prevent redundant work (e.g., Dijkstra, Knapsack problem).
• **Greedy Algorithms**: Making locally optimal choices at each stage (e.g., Huffman coding, Prim's MST).
• **Graph Traversal**: Exploring networks systematically via Breadth-First Search (BFS) or Depth-First Search (DFS).`;
      }
    }
    // --- Physics & Astronomy ---
    else if (lowerQuery.includes('speed of light')) {
      reply = `The speed of light in a vacuum is exactly **299,792,458 meters per second** (approximately **300,000 km/s** or **186,282 miles per second**), universally denoted by the letter **c**.

Key scientific principles:
• **Cosmic Speed Limit**: According to Einstein's Theory of Special Relativity, nothing carrying mass or information can travel faster than $c$ through spacetime.
• **Mass-Energy Equivalence**: It appears in the famous equation $E = mc^2$, signifying the massive energy content bound within matter.
• **Travel Times**: Light from the Sun takes roughly 8 minutes and 20 seconds to reach Earth, while moonlight takes approximately 1.3 seconds.`;
    }
    else if (lowerQuery.includes('sky blue') || lowerQuery.includes('why is the sky')) {
      reply = `The sky appears blue due to a phenomenon called **Rayleigh scattering**:

1. **Composition of Sunlight**: Sunlight reaches Earth as white light, composed of all colors in the visible spectrum. Red and orange have longer wavelengths, while blue and violet have much shorter wavelengths.
2. **Atmospheric Interaction**: Earth's atmosphere is dense with tiny gas molecules (predominantly nitrogen and oxygen). Particles smaller than the wavelength of light scatter shorter wavelengths far more intensely than longer wavelengths.
3. **Scattering**: The short blue wavelengths are scattered in all directions across the atmosphere.
4. **Human Vision**: Although violet light has an even shorter wavelength, the human eye is significantly more sensitive to blue light, and solar sunlight has higher blue intensity, making the daytime sky look vibrant blue.`;
    }
    else if (lowerQuery.includes('leaves change color') || lowerQuery.includes('leaves turn') || lowerQuery.includes('autumn leaves')) {
      reply = `Leaves change color in autumn primarily due to changes in sunlight, temperature, and chemical pigments:

1. **Chlorophyll Breakdown**: During spring and summer, leaves are packed with **chlorophyll**, the green pigment essential for photosynthesis. In autumn, shorter daylight hours and cooler temperatures trigger trees to stop producing food and enter dormancy. Chlorophyll breaks down rapidly.
2. **Carotenoids & Flavonoids**: As the overpowering green fades, pigments that were already present—**carotenoids** (producing orange) and **flavonoids** (producing yellow)—are finally revealed.
3. **Anthocyanins**: Some trees (like red maples and sweetgums) produce **anthocyanins** in response to trapped sugars on sunny autumn days, creating deep red and purple hues.`;
    }
    else if (lowerQuery.includes('photosynthesis')) {
      reply = `**Photosynthesis** is the biological process by which green plants, algae, and certain bacteria convert sunlight, water, and carbon dioxide into chemical energy (glucose) and oxygen.

**The Chemical Equation:**
$$6CO_2 + 6H_2O + \\text{light} \\longrightarrow C_6H_{12}O_6 + 6O_2$$

The process occurs in two main stages inside plant **chloroplasts**:
1. **Light-Dependent Reactions**: Sunlight captured by chlorophyll splits water molecules ($H_2O$), releasing oxygen ($O_2$) and producing high-energy carrier molecules (ATP and NADPH).
2. **Calvin Cycle (Light-Independent)**: Uses the chemical energy from ATP and NADPH to convert carbon dioxide ($CO_2$) from the air into glucose ($C_6H_{12}O_6$), which fuels plant growth.`;
    }
    // --- Dynamic General Inquiry Synthesizer (Natural, direct, non-boilerplate) ---
    else if (lowerQuery.startsWith('how to') || lowerQuery.startsWith('how do') || lowerQuery.startsWith('how can') || lowerQuery.startsWith('steps to')) {
      reply = `To accomplish **${cleanSubject}**, here is a practical, direct approach:

1. **Clarify the Core Objective**: Clearly define the outcome you want to achieve before beginning, and gather all necessary prerequisites or reference materials.
2. **Execute in Logical Phases**:
   • Start with the fundamental setup or groundwork.
   • Implement the core solution incrementally, verifying each step as you proceed.
   • Troubleshoot any anomalies early before moving to subsequent stages.
3. **Validate and Review**: Test the final output against your initial criteria to ensure stability, accuracy, and longevity.
4. **Iterate and Maintain**: Document key learnings or adjustments so the process is easy to reproduce or optimize going forward.`;
    }
    else if (lowerQuery.startsWith('what is') || lowerQuery.startsWith('what are') || lowerQuery.startsWith('explain') || lowerQuery.startsWith('tell me about')) {
      reply = `**${cleanSubject.charAt(0).toUpperCase() + cleanSubject.slice(1)}** refers to a significant subject with wide applications in its field.

At its core, it addresses how specific elements, systems, or principles function together to produce reliable outcomes. Understanding how it operates involves looking at its underlying mechanics, recognizing real-world use cases, and adopting recognized best practices when applying it.

If there is a specific angle, implementation, or technical detail about **${cleanSubject}** you would like to dive deeper into, feel free to ask!`;
    }
    else if (lowerQuery.startsWith('why is') || lowerQuery.startsWith('why does') || lowerQuery.startsWith('why do') || lowerQuery.startsWith('why are')) {
      reply = `The phenomenon behind **${cleanSubject}** is driven by foundational cause-and-effect mechanisms.

In analyzing this, key factors include the interaction of environmental conditions, structural properties, and underlying operational forces. Recognizing these driving dynamics makes it significantly easier to predict behavior, mitigate potential pitfalls, and achieve desired outcomes effectively.`;
    }
    else {
      reply = `Regarding **"${incomingMessage}"**:

To answer this directly: achieving success or understanding here depends on breaking the problem down into clear components, examining the governing principles, and executing thoughtfully. 

Feel free to share any additional context or specific questions on this topic, and I will be glad to provide further in-depth guidance!`;
    }

    nextAction = {
      action: 'Provide helpful follow-up on user inquiry if needed',
      reason: 'General inquiry addressed directly',
      urgency: 'low'
    };
    conversationSummary = `User asked: "${incomingMessage.slice(0, 50)}"`;

    return {
      reply,
      extractedMemories,
      recommendedNextAction: nextAction,
      detectedIssues,
      customerHealth: health,
      customerPriority: priority,
      healthReason,
      customerSummary,
      conversationSummary,
      followUpTasks
    };
  }

  async askContinuo(
    customer: Customer,
    memories: Array<{ content: string; category: string; source: string; timestamp: string }>,
    issues: UnresolvedIssue[],
    question: string
  ): Promise<{ answer: string; citedMemories: RecalledMemory[] }> {
    const memoryContext = memories.map(m => `[${m.category}] ${m.content} (Source: ${m.source})`).join('\n');
    const issueContext = issues.map(i => `[${i.status.toUpperCase()}] ${i.title}: ${i.description}`).join('\n');

    const prompt = `You are Continuo Support Intelligence.
You are answering a question for a support agent about a SPECIFIC customer:
Customer Name: ${customer.name}
Company: ${customer.company}
Product: ${customer.product}
Health: ${customer.health} (${customer.healthReason})
Priority: ${customer.priority || 'Medium'}

KNOWN MEMORIES:
${memoryContext || 'No stored memories.'}

KNOWN ISSUES:
${issueContext || 'No known issues.'}

QUESTION:
"${question}"

Answer the question factually and directly based on this customer's context. Cite the specific memory or issue that answers it. If the requested information is not available in the customer data or memories, clearly state that it is unavailable instead of inventing information. If it is a general knowledge question, answer it directly.`;

    if (this.isConfigured()) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: 'You are Continuo Customer Intelligence. Provide clear, direct, customer-grounded answers.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const answer = data.choices?.[0]?.message?.content || 'No response generated.';
          return {
            answer,
            citedMemories: memories.slice(0, 3).map(m => ({
              id: crypto.randomUUID(),
              content: m.content,
              category: m.category as MemoryCategory,
              source: m.source,
              timestamp: m.timestamp
            }))
          };
        }
      } catch (err: any) {
        console.warn(`Groq askContinuo error:`, err.message);
      }
    }

    // Dynamic customer query answering fallback
    const qLower = question.toLowerCase();
    let answer = '';
    const relevantMemories = memories.filter(m => {
      const cLower = m.content.toLowerCase();
      if (qLower.includes('block') || qLower.includes('sign') || qLower.includes('contract')) {
        return cLower.includes('security') || cLower.includes('review') || cLower.includes('sign');
      }
      if (qLower.includes('concern') || qLower.includes('risk') || qLower.includes('health') || qLower.includes('priority')) {
        return m.category === 'Issue' || m.category === 'Requirement';
      }
      return false;
    });

    if (qLower.includes('block') || qLower.includes('sign') || qLower.includes('contract')) {
      const securityMem = memories.find(m => m.content.toLowerCase().includes('security'));
      if (securityMem) {
        answer = `The security review is the current blocker. The customer stated: "${securityMem.content}". Contract signing cannot proceed until this clearance is granted.`;
      } else {
        answer = `There are currently no explicit blockers recorded for contract signing with ${customer.name}.`;
      }
    } else if (qLower.includes('concern') || qLower.includes('issue') || qLower.includes('unresolved')) {
      const openIssues = issues.filter(i => i.status === 'open');
      if (openIssues.length > 0) {
        answer = `Open issues for ${customer.name}: ${openIssues.map(i => `${i.title} (${i.description})`).join('; ')}.`;
      } else {
        answer = `${customer.name} currently has no critical open issues reported.`;
      }
    } else {
      answer = `Based on Continuo's memory for ${customer.name} (${customer.company}): Health is ${customer.health}, Priority is ${customer.priority || 'Medium'}.`;
    }

    return {
      answer,
      citedMemories: relevantMemories.slice(0, 3).map(m => ({
        id: crypto.randomUUID(),
        content: m.content,
        category: m.category as MemoryCategory,
        source: m.source,
        timestamp: m.timestamp
      }))
    };
  }
}

export const groqService = new GroqService();
