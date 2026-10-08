import { Customer, Conversation, RecalledMemory, RecommendedNextAction, MemoryCategory, CustomerHealth, UnresolvedIssue } from '../types.js';

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
  healthReason?: string;
  customerSummary?: string;
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
CRITICAL MANDATE:
"ChatGPT answers the current question. Continuo understands the customer behind the question."

Customer Profile:
- Name: ${customer.name}
- Company: ${customer.company}
- Product: ${customer.product}
- Current Health: ${customer.health} (${customer.healthReason || 'No issues yet'})

RECALLED HINDSIGHT PERSISTENT MEMORIES:
${memoryContext}

RECENT MESSAGES IN THIS THREAD:
${recentChat || 'First message in thread.'}

NEW INCOMING CUSTOMER MESSAGE:
"${incomingMessage}"

TASK INSTRUCTIONS:
1. Formulate a personalized, deeply context-aware support response.
   - If the customer asks something where a past memory is relevant (e.g. asking to sign contract when a security review was required, or asking about deployments when they run on AWS), YOU MUST address and reference that remembered context naturally.
   - Do NOT give generic AI non-answers. Connect past customer commitments/requirements to their current request!
2. Identify any NEW important customer context that should be stored into persistent Hindsight memory (Requirements, Issues, Preferences, Technical Context, Commitments).
3. Generate a concrete "Recommended Next Action" for the support team (e.g., "Confirm security review completion", "Escalate to AWS team").
4. Detect any open or resolved issues. If customer reports a fix, mark it resolved.
5. Determine updated customer health ('Healthy', 'Needs Attention', 'At Risk') based on blockers, unresolved issues, or sentiment.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "reply": "string (The actual response to the customer)",
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
  "healthReason": "string",
  "customerSummary": "string (Brief updated overview of customer state)"
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
              { role: 'user', content: `Analyze incoming message and produce the JSON output.` }
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
                action: 'Follow up with customer',
                reason: 'Standard customer care protocol',
                urgency: 'medium'
              },
              detectedIssues: parsed.detectedIssues || [],
              customerHealth: parsed.customerHealth,
              healthReason: parsed.healthReason,
              customerSummary: parsed.customerSummary
            };
          }
        } else {
          console.warn(`Groq API error ${response.status}: ${await response.text().catch(() => '')}`);
        }
      } catch (err: any) {
        console.warn(`Groq call error, falling back to local heuristic reasoning:`, err.message);
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
    const text = incomingMessage.toLowerCase();
    let reply = '';
    const extractedMemories: Array<{ content: string; category: MemoryCategory }> = [];
    let nextAction: RecommendedNextAction = {
      action: 'Acknowledge customer inquiry and log requirements',
      reason: 'General inquiry received',
      urgency: 'low'
    };
    const detectedIssues: Array<{ title: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low'; status: 'open' | 'resolved' }> = [];
    let health: CustomerHealth = customer.health || 'Healthy';
    let healthReason = customer.healthReason || 'Regular customer operations';
    let customerSummary = customer.summary;

    // Detect Security Review & Contract signing scenario
    const hasSecurityMemory = recalledMemories.some(m => 
      m.content.toLowerCase().includes('security') || m.content.toLowerCase().includes('review')
    );

    if (text.includes('security') && text.includes('review')) {
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
      healthReason = 'Pending security review clearance before deal closes';
      customerSummary = `${customer.name} at ${customer.company} is evaluating ${customer.product} and requires a formal security review prior to contract execution.`;
    } else if (text.includes('sign') || text.includes('contract')) {
      if (hasSecurityMemory) {
        reply = `Before proceeding with signing, the security review mentioned in your previous conversation still needs to be completed. Once that review is cleared by your team, the contract can move forward immediately. Should I connect you with our compliance lead?`;
        nextAction = {
          action: 'Confirm whether the security review has been completed',
          reason: 'Customer asked to sign contract, but security review requirement is still outstanding',
          urgency: 'high'
        };
        health = 'Needs Attention';
        healthReason = 'Blocked on security review completion before signing';
      } else {
        reply = `We are delighted to proceed with the contract for ${customer.company}. Let me prepare the final agreements for your review.`;
        nextAction = {
          action: 'Send final contract for digital signature',
          reason: 'Customer ready to execute contract',
          urgency: 'high'
        };
      }
    } else if (text.includes('aws') || text.includes('azure') || text.includes('cloud') || text.includes('production')) {
      const env = text.includes('aws') ? 'AWS' : text.includes('azure') ? 'Azure' : 'cloud environment';
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
    } else if (text.includes('login') || text.includes('auth') || text.includes('fail') || text.includes('broken')) {
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
      healthReason = 'Active login failures impacting customer operations';
    } else if (text.includes('fixed') || text.includes('resolved') || text.includes('working now')) {
      reply = `That is fantastic news! We have updated our records to mark the issue as resolved. Please let us know if anything else arises.`;
      detectedIssues.push({
        title: 'Authentication & Login Failure',
        description: 'Customer confirmed issue is resolved.',
        severity: 'medium',
        status: 'resolved'
      });
      health = 'Healthy';
      healthReason = 'Previous issue confirmed resolved by customer';
      nextAction = {
        action: 'Send post-resolution check-in in 24 hours',
        reason: 'Ensure stability after resolved incident',
        urgency: 'low'
      };
    } else if (text.includes('email') && (text.includes('prefer') || text.includes('contact'))) {
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
    } else {
      reply = `Thank you for reaching out, ${customer.name}. I have reviewed your profile and past context for ${customer.company}. How can we best assist you with ${customer.product} today?`;
      nextAction = {
        action: 'Review inquiry and respond with requested information',
        reason: 'Inbound message from customer',
        urgency: 'medium'
      };
    }

    return {
      reply,
      extractedMemories,
      recommendedNextAction: nextAction,
      detectedIssues,
      customerHealth: health,
      healthReason,
      customerSummary
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

KNOWN MEMORIES:
${memoryContext || 'No stored memories.'}

KNOWN ISSUES:
${issueContext || 'No known issues.'}

QUESTION:
"${question}"

Answer the question factually and directly based ONLY on this customer's context. Cite the specific memory or issue that answers it.`;

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
      if (qLower.includes('concern') || qLower.includes('risk') || qLower.includes('health')) {
        return m.category === 'Issue' || m.category === 'Requirement';
      }
      if (qLower.includes('environment') || qLower.includes('aws') || qLower.includes('technical')) {
        return m.category === 'Technical Context';
      }
      return true;
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
    } else {
      answer = `Based on Continuo's memory for ${customer.name} (${customer.company}): Health is ${customer.health}. Stored context includes: ${memories.map(m => m.content).slice(0, 2).join(' | ') || 'Customer onboarded.'}`;
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
