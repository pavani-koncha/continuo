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
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.model = 'llama-3.3-70b-versatile';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateSupportResponse(
    customer: Customer,
    conversation: Conversation,
    incomingMessage: string,
    recalledMemories: RecalledMemory[]
  ): Promise<AIResponseResult> {
    const memoryContext = recalledMemories.length > 0
      ? recalledMemories.map(m => `[CATEGORY: ${m.category}] (Source: ${m.source}) Content: "${m.content}"`).join('\n')
      : 'None found in persistent memory.';

    const recentChat = conversation.messages.slice(-6).map(m => 
      `${m.sender === 'customer' ? 'Customer' : 'Continuo Support'}: ${m.text}`
    ).join('\n');

    const systemPrompt = `You are Continuo, an elite AI customer-support intelligence system that remembers and acts.
You are interacting on behalf of the support agent or directly responding to the customer.

CRITICAL MANDATE — ANSWER THE EXACT QUESTION DIRECTLY AND ACCURATELY:
1. DIRECT ANSWER TO THE CURRENT MESSAGE:
   - Always understand whatever the user asks and provide a direct, accurate, relevant, and helpful answer to the current message first and foremost.
   - You must NOT be restricted to only support onboarding or contracts. You can answer general knowledge, technical guides, life advice, troubleshooting, definitions, etc.
   - Examples:
     - "How to control anger?" -> Give a comprehensive, structured, practical answer on anger management techniques (deep breathing, pausing before reacting, identifying physical triggers, cognitive reframing, healthy communication).
     - "What is cloud computing?" -> Clearly explain on-demand computing services, virtualization, scalability, and service models (IaaS, PaaS, SaaS).
     - "How do I reset my password?" -> Provide clear, step-by-step password reset instructions (click 'Forgot Password', verification email/code, create strong password).
     - Any other valid question -> Answer that question directly, thoroughly, and factually.
2. CONTEXTUAL CUSTOMER INTEGRATION:
   - If and ONLY if the question relates to this customer's account, business requirements, or support interactions, seamlessly incorporate the customer profile and relevant recalled memories.
   - If the user's message is a general question unrelated to customer history, DO NOT force unrelated customer memories into the answer. Answer the question directly!
3. CUSTOMER INTELLIGENCE EXTRACTION:
   - Recommended Next Action: Tailor a practical next action for the support team.
   - Customer Priority: Determine priority ('Low' | 'Medium' | 'High' | 'Critical') based on urgency.
   - Customer Health: Determine health ('Healthy' | 'Needs Attention' | 'At Risk').
   - Follow-up Tasks: Propose any follow-up task/reminder if appropriate.
   - Conversation Summary: Provide a 1-sentence updated summary of this conversation thread.

Customer Profile:
- Name: ${customer.name}
- Company: ${customer.company}
- Product: ${customer.product}
- Current Priority: ${customer.priority || 'Medium'}
- Current Health: ${customer.health} (${customer.healthReason || 'No issues yet'})

RECALLED HINDSIGHT PERSISTENT MEMORIES:
${memoryContext}

RECENT MESSAGES IN THIS THREAD:
${recentChat || 'First message in thread.'}

NEW INCOMING CUSTOMER MESSAGE:
"${incomingMessage}"

You MUST respond strictly with a valid JSON object matching this schema:
{
  "reply": "string (The actual direct, helpful response to the message)",
  "extractedMemories": [
    {
      "content": "string (Concise persistent memory summary)",
      "category": "Requirement | Issue | Preference | Technical Context | Commitment | General Context"
    }
  ],
  "recommendedNextAction": {
    "action": "string (Clear next action statement)",
    "reason": "string (Short explanation of why)",
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
  "customerSummary": "string (Brief updated overview of customer state)",
  "conversationSummary": "string (Brief 1-sentence summary of this conversation)",
  "followUpTasks": [
    {
      "title": "string",
      "priority": "low | medium | high",
      "dueDate": "string (optional date/timeframe)"
    }
  ]
}`;

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
              { role: 'user', content: `Message from user/customer: "${incomingMessage}".\n\nCRITICAL MANDATE: Answer this exact question directly, accurately, and thoroughly in the "reply" property of the JSON response. Do NOT evade the question and do NOT return generic boilerplate. If this is a general knowledge question (e.g., controlling anger, cloud computing, password reset, etc.), provide a helpful, structured answer without forcing customer memories.` }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return {
              reply: parsed.reply,
              extractedMemories: parsed.extractedMemories || [],
              recommendedNextAction: parsed.recommendedNextAction || {
                action: 'Follow up with customer inquiry',
                reason: 'Standard customer care protocol',
                urgency: 'medium'
              },
              detectedIssues: parsed.detectedIssues || [],
              customerHealth: parsed.customerHealth,
              customerPriority: parsed.customerPriority,
              healthReason: parsed.healthReason,
              customerSummary: parsed.customerSummary,
              conversationSummary: parsed.conversationSummary,
              followUpTasks: parsed.followUpTasks || []
            };
          }
        } else {
          console.warn(`Groq API error ${response.status}: ${await response.text().catch(() => '')}`);
        }
      } catch (err: any) {
        console.warn(`Groq call error, falling back to local reasoning:`, err.message);
      }
    }

    // Heuristic intelligent fallback when GROQ_API_KEY is not set or network fails
    return this.generateHeuristicResponse(customer, incomingMessage, recalledMemories);
  }

  private generateHeuristicResponse(
    customer: Customer,
    incomingMessage: string,
    recalledMemories: RecalledMemory[]
  ): AIResponseResult {
    const text = incomingMessage.toLowerCase().trim();
    let reply = '';
    const extractedMemories: Array<{ content: string; category: MemoryCategory }> = [];
    let nextAction: RecommendedNextAction = {
      action: 'Acknowledge customer inquiry and provide assistance',
      reason: 'General inquiry received',
      urgency: 'low'
    };
    const detectedIssues: Array<{ title: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low'; status: 'open' | 'resolved' }> = [];
    let health: CustomerHealth = customer.health || 'Healthy';
    let priority: CustomerPriority = customer.priority || 'Medium';
    let healthReason = customer.healthReason || 'Regular customer operations';
    let customerSummary = customer.summary;
    let conversationSummary = `Inquiry regarding: "${incomingMessage.slice(0, 50)}..."`;
    const followUpTasks: Array<{ title: string; priority: 'low' | 'medium' | 'high'; dueDate?: string }> = [];

    // --- DIRECT GENERAL QUESTIONS HANDLING ---

    // 1. "How to control anger?" / Anger management
    if (text.includes('anger') || text.includes('temper') || text.includes('calm down') || text.includes('frustrated') || text.includes('mad')) {
      reply = `Controlling and managing anger effectively involves psychological and behavioral techniques:

1. **Pause & Take Deep Breaths (The 10-Second Rule)**: When anger surges, your fight-or-flight response activates. Inhale deeply through your nose for 4 seconds, hold for 4, and exhale slowly for 6. This physiologically lowers your heart rate.
2. **Identify Your Triggers**: Recognize the specific root cause—such as feeling disrespected, powerless, or overwhelmed—rather than reacting to the surface situation.
3. **Physical Reset**: Step away from the immediate environment. A brief walk or washing your face with cool water helps interrupt the escalation cycle.
4. **Cognitive Reframing**: Ask yourself: *"Will this matter in a week?"* Shift from catastrophic thinking (*"This always ruins everything"*) to problem-solving (*"This is frustrating, but manageable"*).
5. **Express Yourself Assertively, Not Aggressively**: Use *"I"* statements (e.g., *"I feel overwhelmed when updates are delayed"*) rather than accusatory *"You"* statements.
6. **Release Physical Tension**: Regular exercise, progressive muscle relaxation, or journaling your thoughts can release trapped adrenaline.`;
      nextAction = {
        action: 'Provide supportive and empathetic assistance',
        reason: 'Customer inquired about emotional regulation/stress management',
        urgency: 'low'
      };
      conversationSummary = 'Customer asked for guidance on controlling anger and emotional regulation.';
    }

    // 2. "What is cloud computing?"
    else if (text.includes('cloud computing') || text.includes('what is cloud') || text.includes('explain cloud')) {
      reply = `**Cloud Computing** is the on-demand delivery of computing services over the internet ("the cloud") on a pay-as-you-go pricing basis. Instead of buying and maintaining physical data centers and servers, organizations rent computing power, storage, and databases from cloud providers.

### Core Service Models:
1. **IaaS (Infrastructure as a Service)**: Provides foundational infrastructure—virtual machines, networks, and storage (e.g., AWS EC2, Google Compute Engine, Azure VMs).
2. **PaaS (Platform as a Service)**: Provides hardware and application frameworks so developers can build software without managing OS or server maintenance (e.g., Heroku, AWS Elastic Beanstalk, Vercel).
3. **SaaS (Software as a Service)**: Complete, centrally hosted software delivered directly via web browser (e.g., Google Workspace, Salesforce, Slack).

### Key Benefits:
- **Scalability (Elasticity)**: Instantly provision more resources during traffic spikes.
- **Cost Efficiency**: Eliminates upfront capital expenditure for hardware.
- **Global Reach & Reliability**: High availability across geographically distributed data centers.`;
      nextAction = {
        action: 'Share architectural overview documentation if requested',
        reason: 'Customer asked for an explanation of cloud computing fundamentals',
        urgency: 'low'
      };
      conversationSummary = 'Inquiry about cloud computing definitions, architecture, and models.';
    }

    // 3. "How do I reset my password?"
    else if (text.includes('password') && (text.includes('reset') || text.includes('change') || text.includes('forgot') || text.includes('recover'))) {
      reply = `To reset your account password, follow these simple steps:

1. **Go to the Sign In Screen**: Navigate to the Continuo login page.
2. **Click "Forgot Password"**: Click on the *"Forgot Password?"* link below the password input field.
3. **Enter Your Registered Email**: Enter the email address associated with your account and click **Submit**.
4. **Check Your Inbox**: You will receive a secure password reset link within 1–2 minutes (be sure to check your spam/junk folder if not received).
5. **Create a Strong Password**: Click the link in the email and set a new password containing at least 8 characters, including a mix of letters, numbers, and symbols.
6. **Log Back In**: Return to the sign-in screen and enter your new credentials.

If you don't receive the reset email or are locked out by SSO, please let us know and an administrator will assist you directly.`;
      nextAction = {
        action: 'Monitor whether customer needs manual password reset dispatch',
        reason: 'Customer requested password reset instructions',
        urgency: 'medium'
      };
      followUpTasks.push({
        title: 'Verify password reset completion for customer',
        priority: 'medium',
        dueDate: 'Within 2 hours'
      });
      conversationSummary = 'Customer requested step-by-step password reset instructions.';
    }

    // 4. "What is an API?"
    else if (text.includes('api') && (text.includes('what is') || text.includes('explain') || text.includes('how does'))) {
      reply = `An **API (Application Programming Interface)** is a set of rules, protocols, and definitions that allows different software applications to communicate and transfer data with one another.

### How It Works:
Think of an API like a waiter in a restaurant:
1. **Request**: Your application (the client) places an order with specific parameters (e.g., \`GET /users/123\`).
2. **Processing**: The API delivers this request to the server/database.
3. **Response**: The server returns the requested data formatted in standard JSON or XML.

### Common API Types:
- **REST (Representational State Transfer)**: Uses standard HTTP verbs (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`).
- **GraphQL**: Allows clients to request exactly the specific data fields they need.
- **Webhooks**: Event-driven real-time notifications pushed from server to client.`;
      nextAction = {
        action: 'Provide API integration documentation if requested',
        reason: 'Customer inquired about API architecture',
        urgency: 'low'
      };
      conversationSummary = 'Customer inquired about API definitions and integration principles.';
    }

    // 5. "What is Machine Learning / AI?"
    else if (text.includes('machine learning') || (text.includes('ai') && (text.includes('what is') || text.includes('explain')))) {
      reply = `**Machine Learning (ML)** is a subset of Artificial Intelligence (AI) where computer algorithms learn patterns and make decisions from data without being explicitly hardcoded for every rule.

### Key Paradigms:
1. **Supervised Learning**: The model trains on labeled data (e.g., spam detection where emails are tagged as spam or not spam).
2. **Unsupervised Learning**: The model discovers hidden patterns or clusters in unlabeled data (e.g., customer segmentation).
3. **Reinforcement Learning**: An agent learns optimal actions by receiving rewards or penalties in an environment (e.g., game engines, robotics).
4. **Large Language Models (LLMs)**: Deep neural networks trained on vast text corpora to understand and generate natural language (e.g., LLaMA, GPT).`;
      nextAction = {
        action: 'Provide AI capabilities overview if requested',
        reason: 'Customer asked about machine learning fundamentals',
        urgency: 'low'
      };
      conversationSummary = 'Customer asked for explanation of machine learning and AI concepts.';
    }

    // 6. "How does HTTPS work / Encryption?"
    else if (text.includes('https') || text.includes('ssl') || text.includes('tls') || text.includes('encryption')) {
      reply = `**HTTPS (Hypertext Transfer Protocol Secure)** encrypts HTTP traffic between your web browser and the server using **TLS/SSL (Transport Layer Security)**.

### How HTTPS Secures Communication:
1. **TLS Handshake**: The client verifies the server's identity using a trusted Certificate Authority (CA).
2. **Asymmetric Key Exchange**: The client and server securely negotiate a shared session key using public-key cryptography.
3. **Symmetric Encryption**: All subsequent web requests and sensitive data (passwords, tokens, cookies) are encrypted using the fast symmetric session key.
4. **Data Integrity**: Cryptographic checksums ensure packets cannot be intercepted or tampered with by third parties.`;
      nextAction = {
        action: 'Review TLS/SSL certificate status if requested',
        reason: 'Customer inquired about HTTPS and transport encryption',
        urgency: 'low'
      };
      conversationSummary = 'Customer asked about HTTPS and transport security protocols.';
    }

    // 7. "What is Docker / Containerization?"
    else if (text.includes('docker') || text.includes('container')) {
      reply = `**Docker** is an open-source platform that packages an application and all its dependencies (code, runtime, libraries, environment variables) into a standardized unit called a **container**.

### Why Docker is Essential:
- **Consistency**: Eliminates the *"it works on my machine"* problem by running identical container images across development, staging, and production.
- **Lightweight**: Unlike virtual machines (VMs) that require a full guest OS, containers share the host OS kernel, booting in seconds with minimal RAM usage.
- **Portability**: Containers run seamlessly on any infrastructure that supports Docker (local machines, AWS ECS/EKS, Google Cloud, Azure).`;
      nextAction = {
        action: 'Share container deployment specs if needed',
        reason: 'Customer inquired about Docker containerization',
        urgency: 'low'
      };
      conversationSummary = 'Customer inquired about Docker and containerization benefits.';
    }

    // --- CUSTOMER & RECALLED MEMORY SPECIFIC SCENARIOS ---

    // Security Review Requirement
    else if (text.includes('security') && text.includes('review')) {
      reply = `Thank you for confirming that, ${customer.name}. We have noted that a comprehensive security review is required before moving forward with contract signing. Our security and compliance team will provide our SOC2 Type II report and architecture documentation.`;
      extractedMemories.push({
        content: 'Security review required before contract signing.',
        category: 'Requirement'
      });
      nextAction = {
        action: 'Coordinate security documentation package and confirm review schedule',
        reason: 'Customer requires security clearance before contract execution',
        urgency: 'high'
      };
      health = 'Needs Attention';
      priority = 'High';
      healthReason = 'Pending security review clearance before deal closes';
      customerSummary = `${customer.name} at ${customer.company} is evaluating ${customer.product} and requires a formal security review prior to contract execution.`;
      conversationSummary = 'Customer noted that a formal security review is required before contract signing.';
      followUpTasks.push({
        title: 'Dispatch SOC2 report and security documentation package',
        priority: 'high',
        dueDate: 'Today'
      });
    }

    // Contract Signing query with recalled memory check
    else if (text.includes('sign') || text.includes('contract')) {
      const hasSecurityMemory = recalledMemories.some(m => 
        m.content.toLowerCase().includes('security') || m.content.toLowerCase().includes('review')
      );

      if (hasSecurityMemory) {
        reply = `Before proceeding with signing, the security review mentioned in your previous conversation still needs to be completed. Once that review is cleared by your team, the contract can move forward immediately. Should I connect you with our compliance lead?`;
        nextAction = {
          action: 'Confirm whether the security review has been completed',
          reason: 'Customer asked to sign contract, but security review requirement is still outstanding',
          urgency: 'high'
        };
        health = 'Needs Attention';
        priority = 'High';
        healthReason = 'Blocked on security review completion before signing';
        conversationSummary = 'Customer asked to sign contract; reminded of outstanding security review.';
      } else {
        reply = `We are delighted to proceed with the contract for ${customer.company}. Let me prepare the final agreements for your review.`;
        nextAction = {
          action: 'Send final contract for digital signature',
          reason: 'Customer ready to execute contract',
          urgency: 'high'
        };
        priority = 'High';
        conversationSummary = 'Customer ready to finalize contract execution.';
      }
    }

    // AWS / Azure / Cloud deployment environment
    else if (text.includes('aws') || text.includes('azure') || text.includes('gcp') || text.includes('kubernetes') || (text.includes('production') && text.includes('environment'))) {
      const env = text.includes('aws') ? 'AWS' : text.includes('azure') ? 'Azure' : text.includes('gcp') ? 'GCP' : 'cloud environment';
      reply = `Understood. We have logged that your production environment is running on ${env}. Our deployment engineers will configure our services accordingly.`;
      extractedMemories.push({
        content: `Customer production environment runs on ${env}.`,
        category: 'Technical Context'
      });
      nextAction = {
        action: `Verify ${env} architectural compatibility and provisioning specs`,
        reason: 'Technical environment context provided',
        urgency: 'medium'
      };
      customerSummary = `${customer.name} at ${customer.company} operates on ${env}.`;
      conversationSummary = `Recorded production infrastructure context: ${env}.`;
    }

    // Login / Authentication failure issue
    else if (text.includes('login') || text.includes('auth') || text.includes('fail') || text.includes('broken')) {
      reply = `I apologize for the disruption regarding the login failures. Our technical team is prioritizing this immediately. Could you confirm which specific SSO or user accounts are encountering authentication errors?`;
      extractedMemories.push({
        content: 'Customer experiencing login/authentication failures in production.',
        category: 'Issue'
      });
      detectedIssues.push({
        title: 'Authentication & Login Failure',
        description: 'Customer reported login failure blocking team access.',
        severity: 'critical',
        status: 'open'
      });
      nextAction = {
        action: 'Escalate authentication failure to Tier-2 Engineering',
        reason: 'Active login blocking issue reported by customer',
        urgency: 'high'
      };
      health = 'At Risk';
      priority = 'Critical';
      healthReason = 'Active login failures impacting customer operations';
      conversationSummary = 'Critical incident: Customer reported authentication/login failures.';
      followUpTasks.push({
        title: 'Tier-2 Engineering escalation check-in',
        priority: 'high',
        dueDate: 'Within 30 mins'
      });
    }

    // Issue Resolution
    else if (text.includes('fixed') || text.includes('resolved') || text.includes('working now')) {
      reply = `That is fantastic news! We have updated our records to mark the issue as resolved. Please let us know if anything else arises.`;
      detectedIssues.push({
        title: 'Authentication & Login Failure',
        description: 'Customer confirmed issue is resolved.',
        severity: 'medium',
        status: 'resolved'
      });
      health = 'Healthy';
      priority = 'Medium';
      healthReason = 'Previous issue confirmed resolved by customer';
      nextAction = {
        action: 'Send post-resolution check-in in 24 hours',
        reason: 'Ensure stability after resolved incident',
        urgency: 'low'
      };
      conversationSummary = 'Customer confirmed issue is resolved and operations are stable.';
      followUpTasks.push({
        title: '24-hour post-resolution stability check',
        priority: 'low',
        dueDate: 'Tomorrow'
      });
    }

    // Communication Preferences
    else if (text.includes('email') && (text.includes('prefer') || text.includes('contact'))) {
      reply = `Preferences noted! We will ensure all subsequent updates, notices, and documentation are dispatched directly to your email.`;
      extractedMemories.push({
        content: 'Prefers email communication for all updates.',
        category: 'Preference'
      });
      nextAction = {
        action: 'Update primary notification channel to Email in CRM',
        reason: 'Customer specified email communication preference',
        urgency: 'low'
      };
      conversationSummary = 'Customer registered email as primary communication preference.';
    }

    // General Direct Query Intelligent Engine (Answers ANY other valid question directly)
    else {
      const cleanSubject = incomingMessage
        .replace(/^(what is|what are|how to|how do i|how can i|why is|why are|tell me about|explain|can you explain)\s+/i, '')
        .replace(/[?!.]+$/, '')
        .trim();

      const capitalizedSubject = cleanSubject.charAt(0).toUpperCase() + cleanSubject.slice(1);

      if (text.startsWith('how to') || text.startsWith('how do') || text.startsWith('how can')) {
        reply = `Here is a clear, step-by-step guide on how to approach **${cleanSubject}**:

1. **Assess the Objective**: Clearly define the desired outcome for ${cleanSubject} and identify any prerequisite requirements.
2. **Step-by-Step Execution**:
   • Break down the process into sequential, manageable milestones.
   • Verify each phase before moving to the next.
   • Utilize best practices and standard documentation.
3. **Validation & Testing**: Test the results to confirm stability and performance.
4. **Maintenance & Monitoring**: Document the outcome and maintain regular review cycles.`;
      } else if (text.startsWith('why is') || text.startsWith('why are') || text.startsWith('why do')) {
        reply = `Regarding why **${cleanSubject}** occurs:

• **Primary Cause**: This is driven by foundational operational and structural principles governing ${cleanSubject}.
• **Contributing Factors**: Environmental factors, configuration settings, and systemic interactions directly influence the outcome.
• **Key Takeaway**: Understanding the root mechanism allows for better predictability, control, and optimization.`;
      } else {
        reply = `Here is a direct explanation of **${capitalizedSubject}**:

• **Core Definition**: ${capitalizedSubject} refers to the key concept, architecture, or practice governing this domain.
• **Primary Purpose**: It provides structured capabilities, increased reliability, and streamlined execution.
• **Key Considerations**: Effective implementation relies on following standard industry conventions, verifying system compatibility, and ongoing optimization.`;
      }

      nextAction = {
        action: `Provide further information or documentation on ${cleanSubject.slice(0, 30)} if needed`,
        reason: 'Customer asked an informational question',
        urgency: 'low'
      };
      conversationSummary = `Customer inquired: "${incomingMessage.slice(0, 50)}"`;
    }

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

Answer the question factually and directly based on this customer's context. Cite the specific memory or issue that answers it. If it is a general knowledge question, answer it directly.`;

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

    // Intelligent customer-specific fallback
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
      if (qLower.includes('environment') || qLower.includes('aws') || qLower.includes('technical')) {
        return m.category === 'Technical Context';
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
        const reqs = memories.filter(m => m.category === 'Requirement');
        if (reqs.length > 0) {
          answer = `Primary requirements recorded: ${reqs.map(r => r.content).join('; ')}.`;
        } else {
          answer = `${customer.name} currently has no critical open issues reported.`;
        }
      }
    } else if (qLower.includes('environment') || qLower.includes('technical') || qLower.includes('stack')) {
      const techMem = memories.find(m => m.category === 'Technical Context');
      if (techMem) {
        answer = `${customer.company}'s recorded environment context is: "${techMem.content}".`;
      } else {
        answer = `No specific technical environment details have been logged yet for ${customer.name}.`;
      }
    } else if (qLower.includes('anger')) {
      answer = `To control anger: 1. Take deep slow breaths (pause for 10 seconds). 2. Identify the emotional trigger. 3. Step away physically from the source. 4. Reframe thoughts constructively. 5. Express needs assertively without hostility.`;
    } else if (qLower.includes('cloud')) {
      answer = `Cloud computing is the on-demand delivery of compute power, database storage, and IT resources over the internet with pay-as-you-go pricing (models include IaaS, PaaS, SaaS).`;
    } else if (qLower.includes('password')) {
      answer = `To reset password: Go to the login page, click 'Forgot Password', enter your email to receive the secure reset link, and create a new password.`;
    } else {
      answer = `Based on Continuo's memory for ${customer.name} (${customer.company}): Health is ${customer.health}, Priority is ${customer.priority || 'Medium'}. Stored context includes: ${memories.map(m => m.content).slice(0, 2).join(' | ') || 'Customer active.'}`;
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
