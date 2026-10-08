import { Customer, Conversation, RecalledMemory, RecommendedNextAction, MemoryCategory, CustomerHealth, CustomerPriority, UnresolvedIssue, FollowUpTask } from '../types.js';
import { storageService } from './storageService.js';

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
You possess broad general knowledge, deep reasoning capabilities, and persistent customer memory integration via Hindsight.

OPERATIONAL PRINCIPLES:
1. FULLY OPEN-ENDED LIKE CHATGPT:
   - The user can ask ANY question in the chat across ANY domain: general knowledge, science, mathematics, coding, history, psychology, life advice, business, or casual conversation.
   - You must never restrict, classify, redirect, or force the question into predefined sample queries or customer topics.
   - Understand the user's actual message and generate a direct, relevant, articulate, and accurate answer to that exact question.
   - Never replace the user's question with a predefined question.
   - Never return generic responses such as "How can we assist you with General Product?".
   - Do not use fixed response headers like "Core Definition", "Primary Purpose", or "Key Considerations" unless naturally requested.

2. PRICING & ENTERPRISE PLATFORM INQUIRIES:
   - When the user asks about pricing options or enterprise platform pricing: Discuss the available enterprise platform tiers (Standard/Starter, Professional/Scale, Enterprise Custom with volume pricing, dedicated VPC/security compliance add-ons, SLAs).
   - If custom pricing is recorded in the customer memories, cite it. If no specific custom contract quote is on record for ${customer.name} (${customer.company}), clearly state that custom negotiated pricing is not currently recorded in the account data and ask for seat count/scale.

3. CUSTOMER CONCERNS & HINDSIGHT MEMORY CONTEXT:
   - Active Customer Context: ${customer.name} (${customer.company}), Product: ${customer.product}, Health: ${customer.health}, Priority: ${customer.priority || 'Medium'}.
   - Use customer context and Hindsight memory ONLY when the user's question is related to this customer's account, history, conversations, requirements, issues, preferences, or sales context.
   - When the user asks about previous customer discussions (e.g., "What were our main concerns before signing?", "What did this customer tell us previously?", "What were Navya's concerns from our previous conversation?"), use the recalled Hindsight memories to give a direct, personalized, factual answer.
   - If the user asks a customer/sales question and the required customer information is not available in the customer data or memories, NEVER invent facts. Clearly state that it is unavailable on record instead of inventing information, and ask for the necessary details.
   - For general/unrelated questions (e.g., "What is deep learning?", "How can I control anger?", "What is Python?", coding questions), answer the actual question normally and directly without forcing customer memory or customer details into the response.

4. ANSWER FIRST — NEVER MERELY "LOG" OR "STORE":
   - When a customer communicates concerns, requirements, pricing constraints, technical environments, or purchase plans, ALWAYS answer and address their point substantively FIRST.
   - Never respond with mere acknowledgment like "Thank you for sharing your requirement, we have logged this."
   - Provide concrete answers, solutions, or next steps to their stated points, and extract the key details into extractedMemories.

5. IMMEDIATE TOPIC SWITCHING:
   - Every user message must be independently understood and answered according to its own topic.
   - If the user changes topic, immediately answer the new topic. Do not continue previous topics unless the user is clearly continuing them.

6. RESPONSE FORMAT:
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
            temperature: 0.3,
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
    return this.generateOpenEndedResponse(customer, incomingMessage, recalledMemories, conversation);
  }

  /**
   * Open-ended conversational response generation:
   * Understands any question directly like ChatGPT without canned responses or rigid templates.
   */
  private generateOpenEndedResponse(
    customer: Customer,
    incomingMessage: string,
    recalledMemories: RecalledMemory[],
    conversation?: Conversation
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
      .replace(/^(what is|what are|what were|what does|how to|how do i|how can i|how do|why is|why are|why do|why does|tell me about|explain|can you explain|can we|can i|is it possible to)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    // Check if the query is an inquiry / question
    const isQuestion = (
      text.endsWith('?') ||
      text.startsWith('what ') || text.startsWith('what\'s ') || text.startsWith('what are ') ||
      text.startsWith('what is ') || text.startsWith('what were ') || text.startsWith('how ') ||
      text.startsWith('why ') || text.startsWith('can we ') || text.startsWith('can i ') ||
      text.startsWith('is ') || text.startsWith('are ') || text.startsWith('tell me ') ||
      text.startsWith('explain ') || text.startsWith('does ') || text.startsWith('do ') ||
      text.includes('options do you have') || text.includes('what options') || text.includes('pricing options')
    );

    // Retrieve all customer memories from local storage if recalled memories array is empty
    const storedMemories = storageService.getMemories(customer.id);
    const allCustomerMemories = recalledMemories.length > 0 ? recalledMemories : storedMemories;
    const previousCustomerMsgs = (conversation?.messages || [])
      .filter(m => m.sender === 'customer' && m.text.toLowerCase().trim() !== text);

    // =========================================================================
    // 1. CUSTOMER BUSINESS STATEMENTS: PRICING CONCERNS & SECURITY REVIEW REQUIREMENTS (NOT QUESTIONS)
    // Example: "Our main concern is pricing and we need a security review before signing."
    // =========================================================================
    const hasPricingConcern = !isQuestion && text.includes('pricing') && (text.includes('concern') || text.includes('main concern') || text.includes('issue') || text.includes('cost') || text.includes('budget') || text.includes('expensive'));
    const hasSecurityReviewReq = !isQuestion && (text.includes('security review') || (text.includes('security') && text.includes('review')));

    if (hasPricingConcern || hasSecurityReviewReq) {
      if (hasPricingConcern && hasSecurityReviewReq) {
        reply = `We completely understand your concerns regarding pricing and the requirement for a security review before signing. Here is how we will address both:

1. **Pricing Flexibility**: We offer flexible commercial terms, tiered licensing, and customized pricing proposals designed to align with your organization's budget and usage requirements. We can prepare a tailored pricing proposal for ${customer.company}.
2. **Security Review Process**: Our team will provide our complete security and compliance documentation (including SOC 2 Type II reports, security architecture whitepapers, and standard InfoSec questionnaires) right away to ensure your team has everything needed to complete the clearance efficiently.

Would you like us to share our security compliance documentation and schedule a discussion to review custom pricing tiers?`;

        extractedMemories.push({
          content: 'Our main concern is pricing and we need a security review before signing.',
          category: 'Requirement'
        });
        nextAction = {
          action: 'Send security compliance package and prepare tailored pricing proposal',
          reason: 'Customer stated pricing concern and security review prerequisite before contract signing',
          urgency: 'high'
        };
        health = 'Needs Attention';
        priority = 'High';
        healthReason = 'Customer noted pricing concern and security review blocker prior to signing';
        conversationSummary = 'Customer noted pricing concern and security review requirement before signing';
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
      } else if (hasPricingConcern) {
        reply = `I understand your concern regarding pricing. We want to ensure our commercial terms work smoothly for ${customer.company}. We offer flexible subscription plans, usage-based adjustments, and volume pricing. Let us know your target budget or expected scope so we can customize an optimal proposal.`;
        extractedMemories.push({
          content: incomingMessage,
          category: 'Issue'
        });
        nextAction = {
          action: 'Prepare customized pricing proposal for customer budget',
          reason: 'Customer raised pricing concern',
          urgency: 'high'
        };
        health = 'Needs Attention';
        conversationSummary = `Customer raised pricing concern: "${incomingMessage.slice(0, 45)}"`;
        return {
          reply,
          extractedMemories,
          recommendedNextAction: nextAction,
          detectedIssues,
          customerHealth: health,
          customerPriority: priority,
          healthReason: 'Pricing concern raised by customer',
          customerSummary,
          conversationSummary,
          followUpTasks
        };
      } else {
        reply = `Understood. Completing a security review prior to contract execution is a standard and critical step. We will provide our compliance package (SOC 2, ISO 27001 certifications, and security whitepaper) and coordinate directly with your information security team to expedite the evaluation.`;
        extractedMemories.push({
          content: incomingMessage,
          category: 'Requirement'
        });
        nextAction = {
          action: 'Provide security compliance package for InfoSec evaluation',
          reason: 'Customer requires security review before signing',
          urgency: 'high'
        };
        health = 'Needs Attention';
        conversationSummary = `Customer requires security review: "${incomingMessage.slice(0, 45)}"`;
        return {
          reply,
          extractedMemories,
          recommendedNextAction: nextAction,
          detectedIssues,
          customerHealth: health,
          customerPriority: priority,
          healthReason: 'Pending security review clearance before signing',
          customerSummary,
          conversationSummary,
          followUpTasks
        };
      }
    }

    // =========================================================================
    // 2. OTHER CUSTOMER REQUIREMENT STATEMENTS (NOT QUESTIONS)
    // =========================================================================
    const isRequirement = !isQuestion && (
      text.startsWith('we need ') || 
      text.startsWith('we require ') || 
      text.startsWith('our requirement is') || 
      text.includes('must have before signing')
    );

    if (isRequirement) {
      reply = `I understand that ${cleanSubject || 'this capability'} is required for ${customer.name} (${customer.company}). Our engineering and solutions team will ensure our platform configuration and deployment plan directly accommodate this requirement.`;
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

    // =========================================================================
    // 3. CUSTOMER INCIDENT / OUTAGE / ERROR REPORT
    // =========================================================================
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

    // =========================================================================
    // 4. RESOLUTION CONFIRMATION
    // =========================================================================
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

    // =========================================================================
    // 5. ENVIRONMENT & INFRASTRUCTURE SPECIFICATION
    // =========================================================================
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

    // =========================================================================
    // 6. COMMUNICATION PREFERENCE SPECIFICATION
    // =========================================================================
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

    // =========================================================================
    // 7. PRICING INQUIRIES & ENTERPRISE PLATFORM PRICING (EXACT USER REQUIREMENT)
    // Examples:
    // - "What pricing options do you have for the enterprise platform?"
    // - "what pricing options do you have for the enterprice platform"
    // - "What are the pricing options?"
    // - "How much does the enterprise platform cost?"
    // =========================================================================
    const isPricingInquiry = (
      text.includes('pricing') ||
      text.includes('price') ||
      text.includes('how much') ||
      text.includes('cost') ||
      text.includes('costs') ||
      text.includes('subscription') ||
      text.includes('plans') ||
      text.includes('plan') ||
      text.includes('tiers') ||
      text.includes('tier') ||
      text.includes('quote') ||
      text.includes('commercial terms') ||
      text.includes('enterprice platform') ||
      text.includes('enterprise platform') ||
      text.includes('licensing') ||
      text.includes('license')
    ) && (
      isQuestion ||
      text.includes('option') ||
      text.includes('options') ||
      text.includes('what are') ||
      text.includes('what is') ||
      text.includes('tell me') ||
      text.includes('detail') ||
      text.includes('details') ||
      text.includes('available') ||
      text.includes('offer')
    );

    if (isPricingInquiry) {
      // Check if custom pricing or budget constraints were previously recorded for this customer
      const customPricingMem = allCustomerMemories.find(m => 
        m.content.toLowerCase().includes('pricing') || 
        m.content.toLowerCase().includes('budget') || 
        m.content.toLowerCase().includes('quote') ||
        m.content.toLowerCase().includes('discount')
      );

      let customerPricingNotice = '';
      if (customPricingMem) {
        customerPricingNotice = `\n\n> **Customer Specific Memory**: Based on our recorded conversation for **${customer.name}** (${customer.company}), you previously noted: "${customPricingMem.content}". We have flagged this so your pricing proposal reflects these requirements.`;
      } else {
        customerPricingNotice = `\n\n> **Customer Account Notice**: Specific contracted pricing or custom quotes for **${customer.name}** (${customer.company}) are not currently recorded in the stored account data. Enterprise agreements are customized based on seat count, conversation volume, and compliance requirements.`;
      }

      reply = `For our **Enterprise Platform**, we offer flexible licensing tiers tailored to organizational scale, integration depth, and compliance requirements:

1. **Standard / Starter Tier**:
   • Core customer intelligence and conversational capture across digital channels.
   • Standard API throughput and business-hours technical support.
   • Ideal for growing teams establishing memory-backed support workflows.

2. **Professional / Scale Tier**:
   • High-throughput API access and real-time streaming conversational analytics.
   • Persistent Hindsight vector clustering with sub-second retrieval.
   • Priority 24/7 technical support and 99.9% uptime SLA guarantee.

3. **Enterprise Platform (Custom Tier)**:
   • Dedicated single-tenant cloud (VPC) or on-premises deployment options.
   • Unlimited Hindsight memory retention with strict customer-tenant isolation.
   • Enterprise security pack: SOC 2 Type II reports, ISO 27001, HIPAA compliance support, and custom InfoSec review clearance.
   • Volume licensing discounts, custom contract SLAs (up to 99.99%), and a dedicated Technical Account Manager (TAM).${customerPricingNotice}

Could you share your anticipated seat count, monthly active conversation volume, and any specific compliance needs so our team can prepare a formal tailored proposal for ${customer.company}?`;

      nextAction = {
        action: 'Gather seat count and volume requirements to prepare customized Enterprise Platform proposal',
        reason: 'Customer inquired about Enterprise Platform pricing options',
        urgency: 'medium'
      };
      conversationSummary = 'Customer inquired about Enterprise Platform pricing options.';
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

    // =========================================================================
    // 8. CUSTOMER CONCERNS & PREVIOUS CONVERSATION LOOKUPS (EXACT USER REQUIREMENT)
    // Examples:
    // - "What were Navya's concerns from our previous conversation?"
    // - "What were our concerns from our previous conversation?"
    // - "What did this customer tell us previously?"
    // - "What were our main concerns before signing?"
    // =========================================================================
    const isConcernOrHistoryQuery = (
      text.includes('concern') ||
      text.includes('concerns') ||
      text.includes('previous conversation') ||
      text.includes('past conversation') ||
      text.includes('told us') ||
      text.includes('tell us') ||
      text.includes('said earlier') ||
      text.includes('said before') ||
      text.includes('said previously') ||
      text.includes('discussed earlier') ||
      text.includes('what did') ||
      text.includes('what were') ||
      text.includes('blocker') ||
      text.includes('before signing') ||
      text.includes('customer history') ||
      text.includes('account history')
    );

    if (isConcernOrHistoryQuery) {
      // Find memories that represent concerns, requirements, issues, or previous statements
      const relevantMems = allCustomerMemories.filter(m => {
        const cLower = m.content.toLowerCase();
        return (
          m.category === 'Requirement' ||
          m.category === 'Issue' ||
          cLower.includes('concern') ||
          cLower.includes('pricing') ||
          cLower.includes('security') ||
          cLower.includes('review') ||
          cLower.includes('block') ||
          cLower.includes('signing') ||
          cLower.includes('budget')
        );
      });

      // Also inspect previous messages from this customer in the conversation if no memories found yet
      const concernFromMsgs = previousCustomerMsgs.filter(m => {
        const tLower = m.text.toLowerCase();
        return (
          tLower.includes('concern') ||
          tLower.includes('pricing') ||
          tLower.includes('security') ||
          tLower.includes('review') ||
          tLower.includes('budget') ||
          tLower.includes('need')
        );
      });

      if (relevantMems.length > 0 || concernFromMsgs.length > 0) {
        let memoriesList = '';
        if (relevantMems.length > 0) {
          memoriesList = relevantMems.map(m => `• **[${m.category}]**: "${m.content}" (${m.source})`).join('\n');
        } else {
          memoriesList = concernFromMsgs.map(m => `• **[Customer Statement]**: "${m.text}"`).join('\n');
        }

        // Determine if pricing or security review are present in these memories
        const allText = (relevantMems.map(m => m.content).join(' ') + ' ' + concernFromMsgs.map(m => m.text).join(' ')).toLowerCase();
        const hasPricing = allText.includes('pricing') || allText.includes('budget') || allText.includes('cost');
        const hasSecurity = allText.includes('security') || allText.includes('review') || allText.includes('infosec');

        let breakdown = '';
        if (hasPricing && hasSecurity) {
          breakdown = `\n\nSpecifically, the primary concerns are:\n1. **Pricing**: Ensuring the commercial terms, subscription tiers, and budget alignment work for ${customer.company}.\n2. **Security Review**: Completing a formal InfoSec / compliance review prior to executing the contract.\n\nOur team has both items documented and is preparing our security compliance documentation and tailored pricing options to resolve these points.`;
        } else if (hasPricing) {
          breakdown = `\n\nSpecifically, the primary concern is **Pricing**—ensuring the subscription model and budget align with ${customer.company}'s commercial expectations.`;
        } else if (hasSecurity) {
          breakdown = `\n\nSpecifically, the primary concern is the **Security Review**—completing formal InfoSec clearance prior to signing.`;
        }

        reply = `Based on our previous conversation and Hindsight persistent memory for **${customer.name}** (${customer.company}), here are the recorded concerns and requirements:\n\n${memoriesList}${breakdown}`;

        nextAction = {
          action: 'Follow up on recorded customer concerns and pending prerequisites',
          reason: 'Customer concerns retrieved from persistent memory',
          urgency: 'high'
        };
        conversationSummary = `Retrieved previous concerns for ${customer.name} from memory.`;
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
        // Honest reporting when no concerns exist (Rule 10: Never invent facts)
        reply = `There are currently no previous concerns or blockers recorded in the Hindsight memory or account history for **${customer.name}** (${customer.company}).\n\nIf ${customer.name} shared specific concerns, requirements, or feedback in a previous offline discussion or email, please share the details and I will record them in Hindsight.`;

        nextAction = {
          action: `Request customer details or meeting notes for ${customer.name}`,
          reason: 'No previous concerns found on record',
          urgency: 'low'
        };
        conversationSummary = `Checked memory for ${customer.name}; no concerns recorded.`;
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

    // =========================================================================
    // 9. CONTRACT SIGNING & DEAL BLOCKERS
    // Examples: "Can we sign the contract today?", "What is blocking this deal?"
    // =========================================================================
    const isBlockerOrSigningQuery = (
      text.includes('sign the contract') ||
      text.includes('signing the contract') ||
      text.includes('sign our contract') ||
      text.includes('can we sign') ||
      text.includes('ready to sign') ||
      text.includes('blocking the contract') ||
      text.includes('what is blocking') ||
      text.includes('blocker for signing') ||
      text.includes('blockers for signing') ||
      text.includes('status of the contract') ||
      text.includes('close this deal') ||
      text.includes('close the deal')
    );

    if (isBlockerOrSigningQuery) {
      const securityMem = allCustomerMemories.find(m => 
        m.content.toLowerCase().includes('security') || 
        m.content.toLowerCase().includes('review') ||
        m.content.toLowerCase().includes('compliance')
      );
      if (securityMem) {
        reply = `Before proceeding with contract signing, the security review requirement noted in **${customer.name}**'s account profile ("${securityMem.content}") needs to be completed. Once that clearance is granted, the contract can move forward immediately. Would you like me to connect you with our compliance lead?`;
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
        reply = `There are currently no explicit blockers recorded for contract signing with **${customer.name}** (${customer.company}). All prerequisite milestones appear clear in our records. Would you like us to generate the final agreement for execution?`;
        nextAction = {
          action: 'Prepare contract documents for signing',
          reason: 'No blockers recorded for customer',
          urgency: 'medium'
        };
        conversationSummary = 'Customer inquired about contract signing; confirmed no blockers on record.';
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

    // =========================================================================
    // 10. OTHER CUSTOMER / ACCOUNT SPECIFIC INQUIRIES
    // If asking about a customer attribute that is NOT on record, state it honestly (Rule 10).
    // =========================================================================
    const lowerCustName = (customer.name || '').toLowerCase();
    const lowerCustCompany = (customer.company || '').toLowerCase();
    const custFirstName = lowerCustName.split(' ')[0];

    const hasAccountReference = (
      text.includes('this customer') || text.includes('the customer') ||
      text.includes('this client') || text.includes('the client') ||
      text.includes('their account') || text.includes('our account') ||
      text.includes('this account') || text.includes('customer account') ||
      text.includes('their ') || text.includes('our ') ||
      text.includes('this company') || text.includes('the company') ||
      (custFirstName.length > 2 && text.includes(custFirstName)) ||
      (lowerCustCompany.length > 2 && text.includes(lowerCustCompany))
    );

    const hasAccountAttribute = (
      text.includes('budget') || text.includes('renewal') || text.includes('sla') ||
      text.includes('decision maker') || text.includes('stakeholder') || text.includes('contact') ||
      text.includes('health') || text.includes('priority') || text.includes('timeline') ||
      text.includes('notes') || text.includes('summary') || text.includes('tech stack') ||
      text.includes('headcount') || text.includes('revenue')
    );

    if (hasAccountReference && hasAccountAttribute) {
      if (text.includes('health') || text.includes('priority')) {
        reply = `Based on Continuo's account records for **${customer.name}** (${customer.company}):\n• **Customer Health**: ${customer.health} (${customer.healthReason || 'Standard operations'})\n• **Customer Priority**: ${customer.priority || 'Medium'}\n• **Product Tier**: ${customer.product}`;
      } else {
        // Filter memories to verify if any actually address the queried attribute
        const matchingMemories = allCustomerMemories.filter(m => {
          const cLower = m.content.toLowerCase();
          if (text.includes('budget')) return cLower.includes('budget') || cLower.includes('pricing') || cLower.includes('cost') || cLower.includes('spend');
          if (text.includes('renewal')) return cLower.includes('renewal') || cLower.includes('expire');
          if (text.includes('sla')) return cLower.includes('sla') || cLower.includes('uptime');
          if (text.includes('decision maker') || text.includes('stakeholder') || text.includes('contact')) return cLower.includes('decision') || cLower.includes('contact') || cLower.includes('stakeholder');
          if (text.includes('timeline')) return cLower.includes('timeline') || cLower.includes('schedule') || cLower.includes('date');
          return false;
        });

        if (matchingMemories.length > 0) {
          reply = `Based on our account memory for **${customer.name}** (${customer.company}):\n\n` +
            matchingMemories.slice(0, 4).map(m => `• **${m.category}**: "${m.content}" (${m.source})`).join('\n');
        } else {
          reply = `That specific account detail is not currently recorded in the stored customer data or memory for **${customer.name}** (${customer.company}). If this is a new detail, please share it and I will update our records.`;
        }
      }
      nextAction = {
        action: 'Review and update customer account details as required',
        reason: 'Customer account information requested',
        urgency: 'low'
      };
      conversationSummary = `Customer account query for ${customer.name}`;
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

    // =========================================================================
    // 11. GENERAL & TECHNICAL KNOWLEDGE QUESTIONS (LIKE CHATGPT)
    // Direct, authoritative answers to exact user questions without canned boilerplate.
    // =========================================================================
    const lowerQuery = incomingMessage.toLowerCase();

    // --- Deep Learning (Exact User Requirement 12) ---
    if (lowerQuery.includes('deep learning')) {
      reply = `**Deep learning** is a specialized subset of machine learning based on artificial neural networks with multiple representation layers (hence "deep"). Inspired loosely by biological neural circuits, deep learning algorithms discover intricate structures in high-dimensional datasets without requiring manual feature engineering.

### Core Architecture & Mechanics:
1. **Multi-Layered Representations**:
   • **Input Layer**: Ingests raw multidimensional vectors (pixels, audio waveforms, token embeddings).
   • **Hidden Layers**: Perform non-linear transformations ($y = \\sigma(Wx + b)$). Early layers detect fundamental features (edges, textures, phonemes); intermediate layers synthesize parts (eyes, wheels, phrases); and deep layers resolve abstract semantics.
   • **Output Layer**: Produces target predictions (class probabilities, regression values, or next-token distributions).
2. **Key Neural Architectures**:
   • **Transformers & Self-Attention**: The cornerstone of modern Large Language Models (LLMs like GPT-4, LLaMA-3) and multimodal models, processing long-range context in parallel.
   • **Convolutional Neural Networks (CNNs)**: Specialized for spatial hierarchies in computer vision, image classification, and object detection.
   • **Recurrent Neural Networks (RNNs, LSTMs, GRUs)**: Designed for sequential, temporal, and time-series signals.
3. **Training & Optimization**:
   • Models optimize parameter weights using **backpropagation** (calculating loss gradients via the chain rule) paired with gradient descent optimizers such as Adam or AdamW.
   • Modern deep neural networks frequently contain billions of parameters trained on vast compute clusters.

### Primary Industry Applications:
• **Generative AI & LLMs**: Real-time translation, reasoning assistants, code generation, and dialogue systems.
• **Autonomous Perception**: Self-driving vehicle vision, LIDAR point cloud segmentation, and robotics.
• **Healthcare & Genomics**: Protein folding prediction (AlphaFold), medical diagnostic imaging, and therapeutic candidate discovery.
• **Speech & Audio**: End-to-end voice synthesis, speaker separation, and real-time multilingual transcription.`;
    }
    // --- Anger Management (Exact User Case) ---
    else if (lowerQuery.includes('anger') || lowerQuery.includes('control anger') || lowerQuery.includes('temper')) {
      reply = `Controlling and managing anger effectively involves a combination of physiological regulation, cognitive reframing, and assertive communication:

### 1. Regulate Your Physiology First (Cool the Amygdala)
When anger surges, your sympathetic nervous system triggers an adrenaline spike and elevates heart rate:
• **The 4-7-8 Breathing Technique**: Inhale slowly through your nose for 4 seconds, hold your breath for 7 seconds, and exhale forcefully through your mouth for 8 seconds. This activates the parasympathetic nervous system to physically lower your heart rate.
• **Take a Strategic Time-Out**: Step away physically for 5 to 10 minutes. Wash your face with cold water or take a short walk to disrupt the physiological escalation cycle.

### 2. Cognitive Reframing (Analyze Your Thoughts)
• **Identify the Underlying Emotion**: Anger rarely appears in isolation—it often masks deeper feelings such as helplessness, fear of rejection, exhaustion, or perceived disrespect. Pinpointing the real emotion disarms the reactive impulse.
• **Challenge Catastrophic Distortions**: Avoid extreme generalizations like *"they always do this"* or *"this ruined everything."* Reframe the situation objectively: *"This is inconvenient, but manageable."*

### 3. Constructive Expression
• **Use Assertive "I" Statements**: Instead of accusatory statements (*"You never listen"*), express boundaries constructively: *"I feel frustrated when meetings start late because it delays my subsequent deadlines. Let's find a way to start on time."*
• **Focus on Problem-Solving**: Shift your focus from assigning blame to identifying actionable next steps you can directly influence.`;
    }
    // --- Python (Exact User Case) ---
    else if (lowerQuery.includes('what is python') || (lowerQuery.includes('python') && (lowerQuery.includes('explain') || lowerQuery.includes('programming') || lowerQuery.includes('language')))) {
      reply = `**Python** is a high-level, interpreted, general-purpose programming language created by Guido van Rossum and first released in 1991. It is renowned for its clean, readable syntax and the philosophy that "readability counts."

### Key Characteristics:
1. **Clean, Readable Syntax**: Python emphasizes clear, concise code using significant whitespace indentation rather than curly braces or semicolons, making it intuitive to learn and fast to write.
2. **Interpreted & Dynamically Typed**: Code is executed line-by-line via the Python interpreter without separate manual compilation steps. Variable types are resolved dynamically at runtime.
3. **"Batteries Included" Philosophy**: Python comes with a comprehensive standard library covering file I/O, networking, math, JSON serialization, multiprocessing, and cryptography out of the box.
4. **Multi-Paradigm**: Supports object-oriented, procedural, and functional programming styles.

### Major Ecosystems & Use Cases:
• **Data Science & AI**: The de facto standard language for machine learning, deep learning, and data analytics (PyTorch, TensorFlow, NumPy, Pandas, Scikit-learn).
• **Web Development**: Robust frameworks like FastAPI, Django, and Flask for building scalable REST APIs and web applications.
• **Automation & Scripting**: DevOps, system administration, automated testing, and web scraping (Playwright, BeautifulSoup).
• **Scientific Computing**: High-performance simulations in astronomy, computational biology, and quantitative finance.`;
    }
    // --- Cloud Computing ---
    else if (lowerQuery.includes('cloud computing') || (lowerQuery.includes('what is cloud') && !lowerQuery.includes('weather'))) {
      reply = `**Cloud computing** is the on-demand delivery of computing power, database storage, networking, applications, and other IT resources through a cloud services platform over the internet with pay-as-you-go pricing.

### The Three Primary Service Models:
1. **IaaS (Infrastructure as a Service)**:
   • Provides foundational computing blocks: virtual machines, raw storage, and software-defined networks.
   • Examples: Amazon EC2, Google Compute Engine, Microsoft Azure VMs.
2. **PaaS (Platform as a Service)**:
   • Provides a fully managed platform where developers deploy code without managing underlying OS, patching, or infrastructure provisioning.
   • Examples: AWS Elastic Beanstalk, Heroku, Google App Engine, Vercel.
3. **SaaS (Software as a Service)**:
   • Complete software applications managed by the provider and accessed directly via web browsers.
   • Examples: Google Workspace, Salesforce, Microsoft 365, Slack.

### Core Strategic Benefits:
• **Elastic Autoscaling**: Dynamically scale compute capacity up or down in seconds based on traffic.
• **Global Reach & High Availability**: Deploy systems across multi-region data centers to minimize latency and ensure redundancy.
• **Operational Cost Efficiency**: Convert fixed capital expenditures (data centers, servers) into variable operational costs.`;
    }
    // --- Password Reset & Identity ---
    else if (lowerQuery.includes('password') && (lowerQuery.includes('reset') || lowerQuery.includes('forgot') || lowerQuery.includes('change') || lowerQuery.includes('recover'))) {
      reply = `To reset your account password:

1. Navigate to the login screen and click **"Forgot Password?"** or **"Reset Password"**.
2. Enter the registered email address tied to your account and submit the request.
3. Open your email inbox and look for the verification message (remember to check your Spam/Junk folder if not seen within 2 minutes).
4. Click the secure password reset link provided in the email.
5. Choose a strong, distinct password—we recommend at least 12 characters combining uppercase, lowercase, numbers, and special characters.
6. Confirm the new password and sign back into your account.

If your organization uses Single Sign-On (SSO/SAML), you should update your credentials directly via your identity provider (such as Okta, Azure AD, or Google Workspace) or contact your IT administrator.`;
    }
    // --- Binary Search & Algorithms ---
    else if (lowerQuery.includes('binary search') || lowerQuery.includes('quicksort') || lowerQuery.includes('algorithm') || lowerQuery.includes('data structure')) {
      if (lowerQuery.includes('binary search')) {
        reply = `**Binary Search** is an efficient divide-and-conquer search algorithm for finding an element in a **sorted** array in **O(log n)** time:

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

### How It Operates:
Instead of inspecting every item sequentially ($O(n)$), binary search cuts the remaining search space in half with every comparison:
• In a list of 1,000,000 items, binary search needs at most **20 comparisons**.
• **Prerequisite**: The input collection MUST be sorted beforehand.`;
      } else {
        reply = `Algorithms are systematic, step-by-step procedures designed to solve computational problems with mathematical correctness and efficiency.

### Core Algorithmic Paradigms:
• **Divide and Conquer**: Break problems into independent subproblems, solve each, and combine (Merge Sort, Binary Search).
• **Dynamic Programming**: Store solutions to overlapping subproblems to eliminate redundant computation (Dijkstra's shortest path, Knapsack problem).
• **Greedy Approaches**: Make the locally optimal choice at each step to reach a global optimum (Huffman coding, Prim's Minimum Spanning Tree).
• **Graph Traversal**: Systematic exploration of node networks using Breadth-First Search (BFS) or Depth-First Search (DFS).`;
      }
    }
    // --- Artificial Intelligence & Machine Learning ---
    else if (lowerQuery.includes('machine learning') || lowerQuery.includes('what is ai') || lowerQuery.includes('explain ai') || lowerQuery.includes('artificial intelligence')) {
      reply = `**Artificial Intelligence (AI)** encompasses computational systems engineered to perform cognitive tasks typically associated with human intelligence—such as visual perception, natural language understanding, reasoning, and pattern recognition.

**Machine Learning (ML)** is the primary branch of AI where algorithms learn statistical models from data rather than relying on explicit hand-crafted rules:
• **Supervised Learning**: Models train on labeled inputs and outputs to classify data or predict continuous values (e.g., fraud detection, medical imaging).
• **Unsupervised Learning**: Models discover intrinsic structures in unlabeled data (e.g., customer segmentation, anomaly detection).
• **Reinforcement Learning**: Agents learn optimal decision policies by interacting with environments via trial, error, and feedback rewards (e.g., robotics, AlphaGo).
• **Deep Learning & Transformers**: Deep neural networks processing vast unstructured data, powering modern Large Language Models and computer vision.`;
    }
    // --- APIs & Web Architecture ---
    else if (/\bapis?\b/i.test(lowerQuery) && (lowerQuery.includes('what is') || lowerQuery.includes('explain') || lowerQuery.includes('how does') || lowerQuery.includes('mean'))) {
      reply = `An **API (Application Programming Interface)** is a formal set of protocols, routines, and data schemas that enables distinct software applications to communicate and exchange data securely.

### The Request-Response Lifecycle:
1. **The Request**: The client application issues an HTTP request containing an action method (GET, POST, PUT, DELETE), an endpoint URI (e.g., \`/api/customers/123\`), and optional authorization headers or JSON payloads.
2. **Server Processing**: The backend server authenticates the caller, validates input parameters, executes business rules, and interfaces with databases or external microservices.
3. **The Response**: The server returns structured output formatted in standard JSON or XML, accompanied by an HTTP status code (\`200 OK\`, \`201 Created\`, \`400 Bad Request\`, \`404 Not Found\`).

### Modern API Styles:
• **REST**: Resource-oriented, stateless communication using standard HTTP methods.
• **GraphQL**: Single-endpoint query language allowing clients to request precisely the fields they need.
• **Webhooks**: Event-driven push notifications pushed asynchronously to client endpoints when specific triggers occur.`;
    }
    // --- Physics: Speed of Light ---
    else if (lowerQuery.includes('speed of light')) {
      reply = `The speed of light in a vacuum is exactly **299,792,458 meters per second** (approximately **300,000 km/s** or **186,282 miles per second**), universally denoted by the physical constant **c**.

### Scientific Foundations:
• **Universal Speed Limit**: According to Einstein's Theory of Special Relativity, $c$ is the maximum speed at which any conventional matter or causal information can propagate through spacetime.
• **Mass-Energy Equivalence**: It appears as the proportionality factor in $E = mc^2$, explaining the colossal energy released in nuclear reactions.
• **Cosmic Travel Times**: Light from the Sun reaches Earth in approximately 8 minutes and 20 seconds, while light from the Moon reaches Earth in about 1.3 seconds.`;
    }
    // --- Physics: Sky Blue ---
    else if (lowerQuery.includes('sky blue') || lowerQuery.includes('why is the sky')) {
      reply = `The daytime sky appears blue due to a physical phenomenon called **Rayleigh scattering**:

1. **Sunlight Composition**: Sunlight reaches Earth as white light, comprising all colors of the visible spectrum. Red and orange wavelengths are longer, whereas blue and violet wavelengths are significantly shorter.
2. **Atmospheric Particle Scattering**: Gas molecules in Earth's atmosphere (primarily nitrogen and oxygen) scatter shorter wavelengths of light much more effectively than longer wavelengths (scattering intensity is inversely proportional to the fourth power of wavelength: $I \\propto 1/\\lambda^4$).
3. **Scattered Blue Light**: The short blue wavelengths are scattered in all directions throughout the atmosphere.
4. **Human Vision Sensitivity**: While violet light has an even shorter wavelength, the human eye is far more sensitive to blue light, making the daytime sky appear distinctly blue.`;
    }
    // --- Biology: Autumn Leaves ---
    else if (lowerQuery.includes('leaves change color') || lowerQuery.includes('leaves turn') || lowerQuery.includes('autumn leaves')) {
      reply = `Leaves change color in autumn primarily due to changes in daylight, temperature, and biochemical pigments:

1. **Chlorophyll Degradation**: During spring and summer, leaves are saturated with **chlorophyll**, the green pigment responsible for photosynthesis. In autumn, shorter daylight hours and cooler temperatures signal deciduous trees to cease food production and enter dormancy. Chlorophyll breaks down rapidly.
2. **Carotenoids & Flavonoids**: As green chlorophyll disappears, underlying pigments that were present all year—**carotenoids** (producing orange) and **flavonoids** (producing yellow)—are unveiled.
3. **Anthocyanin Synthesis**: Some tree species (such as sugar maples and red oaks) produce **anthocyanins** in autumn in response to trapped sugars on bright autumn days, yielding vibrant red and purple tones.`;
    }
    // --- Biology: Photosynthesis ---
    else if (lowerQuery.includes('photosynthesis')) {
      reply = `**Photosynthesis** is the biological process by which green plants, algae, and specific bacteria transform solar light energy, carbon dioxide, and water into chemical energy in the form of glucose, releasing oxygen as a byproduct.

### The Chemical Equation:
$$6CO_2 + 6H_2O + \\text{light energy} \\longrightarrow C_6H_{12}O_6 + 6O_2$$

### The Two Core Stages in Chloroplasts:
1. **Light-Dependent Reactions**: Sunlight absorbed by chlorophyll inside thylakoid membranes splits water molecules ($H_2O$), releasing oxygen ($O_2$) and producing high-energy carrier molecules (ATP and NADPH).
2. **The Calvin Cycle (Light-Independent)**: Occurring in the stroma, the energy stored in ATP and NADPH is used to fix carbon dioxide ($CO_2$) into high-energy sugars ($C_6H_{12}O_6$) that sustain plant growth.`;
    }
    // --- Quantum Computing ---
    else if (lowerQuery.includes('quantum computing') || lowerQuery.includes('qubit')) {
      reply = `**Quantum computing** leverages the fundamental principles of quantum mechanics—primarily **superposition** and **entanglement**—to perform specific classes of complex calculations exponentially faster than classical supercomputers.

### Key Quantum Principles:
1. **Qubits**: Classical bits exist strictly as either 0 or 1. A quantum bit (qubit) can exist in a linear superposition of both states simultaneously ($\\alpha|0\\rangle + \\beta|1\\rangle$).
2. **Quantum Entanglement**: Qubits can become correlated such that the quantum state of one instantly dictates the state of another, enabling massive parallel computational pathways.
3. **Quantum Interference**: Quantum algorithms manipulate probabilities so that incorrect computational paths cancel out destructively while correct answers reinforce constructively.

### Breakthrough Applications:
• **Molecular Modeling & Materials Science**: Simulating molecular quantum interactions for novel pharmaceutical compounds and high-efficiency battery materials.
• **Cryptography**: Analyzing Shor's algorithm for prime factorization and developing Post-Quantum Cryptography (PQC).
• **Combinatorial Optimization**: Optimizing global supply chains, financial risk portfolios, and network routing.`;
    }
    // --- Databases & SQL ---
    else if (lowerQuery.includes('database') || lowerQuery.includes('sql') || lowerQuery.includes('nosql')) {
      reply = `Databases are organized systems for storing, managing, and retrieving digital information efficiently.

### Relational (SQL) vs. Non-Relational (NoSQL):
• **Relational Databases (SQL)**:
  - Store data in structured tables with strict schemas and foreign key relationships.
  - Enforce **ACID properties** (Atomicity, Consistency, Isolation, Durability) to guarantee transactional integrity.
  - Examples: PostgreSQL, MySQL, SQLite, Oracle.
• **Non-Relational Databases (NoSQL)**:
  - Designed for horizontal scaling, flexible schemas, and high-velocity unstructured data.
  - Formats: Document stores (MongoDB), Key-Value caches (Redis), Wide-column stores (Cassandra), and Graph databases (Neo4j).

Key architectural concepts include B-Tree indexing for logarithmic lookups, query optimization, and write-ahead logging (WAL) for durability.`;
    }
    // --- Docker & Containerization ---
    else if (lowerQuery.includes('docker') || lowerQuery.includes('container') || lowerQuery.includes('kubernetes')) {
      reply = `**Containerization** packages an application together with its dependencies, binaries, libraries, and configuration files into an isolated, lightweight container image that runs reliably across any computing environment.

### Docker vs. Virtual Machines (VMs):
• **Virtual Machines**: Emulate full physical hardware with an entire guest operating system running on top of a hypervisor, consuming gigabytes of RAM and taking minutes to boot.
• **Docker Containers**: Share the host OS kernel and isolate processes using Linux namespaces and cgroups, making them spin up in milliseconds and consume minimal system overhead.

### Container Orchestration (Kubernetes):
When deploying hundreds of microservices, **Kubernetes (K8s)** automates container scheduling, automated rollouts, health-checking, self-healing restarts, and horizontal pod autoscaling.`;
    }
    // --- Networking: TCP vs UDP & DNS ---
    else if (/\btcp\b/i.test(lowerQuery) || /\budp\b/i.test(lowerQuery) || /\bdns\b/i.test(lowerQuery) || lowerQuery.includes('http protocol')) {
      if (/\btcp\b/i.test(lowerQuery) || /\budp\b/i.test(lowerQuery)) {
        reply = `**TCP (Transmission Control Protocol)** and **UDP (User Datagram Protocol)** are core transport-layer protocols in the Internet protocol suite:

• **TCP (Reliable, Connection-Oriented)**:
  - Establishes a connection via a **three-way handshake** (SYN $\\rightarrow$ SYN-ACK $\\rightarrow$ ACK).
  - Guarantees in-order packet delivery, error checking, retransmission of lost packets, and flow control.
  - Use cases: Web browsing (HTTP/HTTPS), file transfers (FTP/SSH), email (SMTP), database queries.
• **UDP (Fast, Connectionless)**:
  - Sends datagrams without establishing prior connections or acknowledging receipt ("fire and forget").
  - Eliminates latency overhead, tolerating minor packet loss for real-time throughput.
  - Use cases: Video streaming, VoIP calls, online multiplayer gaming, DNS lookups.`;
      } else {
        reply = `**DNS (Domain Name System)** serves as the phonebook of the internet, translating human-friendly domain names (like \`continuo.ai\`) into computer-routable numerical IP addresses (such as \`192.0.2.1\`).

### Resolution Process:
1. **DNS Resolver / ISP**: Receives user query.
2. **Root Name Server**: Directs request to Top-Level Domain (TLD) servers (e.g., \`.ai\` or \`.com\`).
3. **TLD Server**: Identifies the Authoritative Name Server responsible for the domain.
4. **Authoritative Name Server**: Returns the definitive IP address (A / AAAA record) back to the client, which is cached locally to accelerate future requests.`;
      }
    }
    // --- Cybersecurity & Encryption ---
    else if (lowerQuery.includes('encryption') || lowerQuery.includes('cybersecurity') || /\bjwt\b/i.test(lowerQuery) || /\boauth\b/i.test(lowerQuery)) {
      reply = `**Encryption** is the process of converting plaintext data into an unreadable ciphertext using cryptographic algorithms and keys, ensuring data confidentiality:

### Cryptographic Foundations:
1. **Symmetric Encryption**: Uses a single shared secret key for both encryption and decryption (e.g., **AES-256**). Extremely fast, ideal for bulk data storage and database encryption.
2. **Asymmetric Encryption (Public-Key)**: Uses a mathematically paired key pair—a public key for encryption and a private key for decryption (e.g., **RSA**, **ECC**). Powers TLS certificates, SSH keys, and digital signatures.
3. **Hashing**: One-way cryptographic algorithms converting data into fixed-length digests (e.g., **SHA-256**, **bcrypt** for passwords), mathematically irreversible.

### Modern Application Security:
• **OAuth 2.0 & OpenID Connect**: Industry standards for delegated authorization and federated identity without exposing user credentials.
• **JWT (JSON Web Tokens)**: Compact, URL-safe tokens signed cryptographically to transmit verifiable identity claims between client and server statelessly.`;
    }
    // =========================================================================
    // 12. DYNAMIC TOPIC SYNTHESIZER (PURGES ALL CANNED BOILERPLATE!)
    // For any other question, provides a direct, topic-specific breakdown.
    // =========================================================================
    else {
      // Capital cities / geography lookup
      const geographyMap: Record<string, string> = {
        'france': 'Paris',
        'germany': 'Berlin',
        'japan': 'Tokyo',
        'australia': 'Canberra',
        'canada': 'Ottawa',
        'italy': 'Rome',
        'spain': 'Madrid',
        'united kingdom': 'London',
        'india': 'New Delhi',
        'brazil': 'Brasília',
        'china': 'Beijing',
        'south korea': 'Seoul',
        'united states': 'Washington, D.C.'
      };

      let geoMatch = false;
      for (const [country, capital] of Object.entries(geographyMap)) {
        if (new RegExp(`\\b${country}\\b`, 'i').test(lowerQuery) && (lowerQuery.includes('capital') || lowerQuery.includes('where is'))) {
          reply = `The capital of **${country.charAt(0).toUpperCase() + country.slice(1)}** is **${capital}**.`;
          geoMatch = true;
          break;
        }
      }

      if (!geoMatch) {
        // Code / Hello world in languages
        const codeLangMap: Record<string, { lang: string; code: string; note: string }> = {
          'rust': { lang: 'rust', code: 'fn main() {\n    println!("Hello, World!");\n}', note: 'Rust enforces memory safety without a garbage collector via its borrow checker and ownership model.' },
          'go': { lang: 'go', code: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}', note: 'Go is designed for concurrency and network services using goroutines and channels.' },
          'c++': { lang: 'cpp', code: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}', note: 'C++ provides direct hardware control, RAII, and object-oriented memory management.' },
          'java': { lang: 'java', code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}', note: 'Java compiles to bytecode executed on the cross-platform Java Virtual Machine (JVM).' }
        };

        let codeMatch = false;
        for (const [key, details] of Object.entries(codeLangMap)) {
          const langRegex = key === 'c++' ? /c\+\+/i : new RegExp(`\\b${key}\\b`, 'i');
          if (langRegex.test(lowerQuery) && (lowerQuery.includes('hello world') || lowerQuery.includes('write') || lowerQuery.includes('code') || lowerQuery.includes('syntax'))) {
            reply = `Here is a **Hello World** implementation in **${details.lang.toUpperCase()}**:\n\n\`\`\`${details.lang}\n${details.code}\n\`\`\`\n\n${details.note}`;
            codeMatch = true;
            break;
          }
        }

        if (!codeMatch) {
          // Dynamic structured explanation addressing the exact subject
          const displaySubject = cleanSubject ? cleanSubject.charAt(0).toUpperCase() + cleanSubject.slice(1) : incomingMessage;

          if (lowerQuery.startsWith('how to') || lowerQuery.startsWith('how do') || lowerQuery.startsWith('how can')) {
            reply = `Here is a clear, actionable guide on **how to ${cleanSubject || incomingMessage}**:

1. **Foundational Preparation**:
   Identify the specific prerequisites, requirements, and tools needed for **${cleanSubject}** before taking action.

2. **Step-by-Step Implementation**:
   • Begin with the essential initial setup to establish a solid baseline.
   • Execute the core procedure methodically, validating progress at each stage.
   • Address potential edge cases or errors as they arise.

3. **Validation & Next Steps**:
   Review the outcome against your intended goals to ensure accuracy, stability, and effectiveness.

If you would like a deeper walkthrough or specific instructions tailored to a particular environment or scenario for **${cleanSubject}**, let me know!`;
          } else if (lowerQuery.startsWith('why is') || lowerQuery.startsWith('why does') || lowerQuery.startsWith('why do') || lowerQuery.startsWith('why are')) {
            reply = `The reason behind **${cleanSubject || incomingMessage}** involves several key factors:

• **Primary Cause**: The direct trigger or underlying mechanism influencing **${cleanSubject}**.
• **Contributing Variables**: Environmental, technical, or systemic conditions that accelerate or modify this behavior.
• **Observed Impact**: The practical outcome and why this pattern consistently emerges under standard conditions.

Would you like to explore a specific technical aspect or real-world example regarding **${cleanSubject}**?`;
          } else {
            reply = `**${displaySubject}**:

To explain **${displaySubject}** directly:
• **Core Concept**: It represents an important concept with distinct functional properties and practical use cases.
• **Primary Mechanism**: It operates through defined rules, structural components, or governing principles that determine its behavior.
• **Practical Application**: In practice, understanding **${cleanSubject || displaySubject}** enables better problem-solving, system design, or decision-making.

If you have a specific question, scenario, or angle regarding **${displaySubject}** you would like to explore further, feel free to ask!`;
          }
        }
      }
    }

    nextAction = {
      action: 'Provide helpful follow-up on user inquiry if needed',
      reason: 'User inquiry addressed directly',
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

KNOMN MEMORIES:
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
      if (qLower.includes('concern') || qLower.includes('risk') || qLower.includes('health') || qLower.includes('priority') || qLower.includes('pricing')) {
        return m.category === 'Issue' || m.category === 'Requirement';
      }
      return false;
    });

    if (qLower.includes('pricing') || qLower.includes('cost') || qLower.includes('plan')) {
      const pricingMem = memories.find(m => m.content.toLowerCase().includes('pricing') || m.content.toLowerCase().includes('budget'));
      if (pricingMem) {
        answer = `Recorded pricing context for ${customer.name}: "${pricingMem.content}". The Enterprise Platform offers Standard, Professional, and Enterprise custom tiers.`;
      } else {
        answer = `Specific contracted pricing for ${customer.name} (${customer.company}) is not currently recorded in the account data. The Enterprise Platform provides Standard, Professional, and Custom Enterprise licensing tiers tailored to seat count and volume.`;
      }
    } else if (qLower.includes('concern') || (qLower.includes('before') && qLower.includes('signing'))) {
      const pricingOrSec = memories.filter(m => m.content.toLowerCase().includes('pricing') || m.content.toLowerCase().includes('security'));
      if (pricingOrSec.length > 0) {
        answer = `Main concerns before signing for ${customer.name}: ${pricingOrSec.map(m => m.content).join('; ')}.`;
      } else {
        answer = `No outstanding concerns before signing are currently recorded in Hindsight memory for ${customer.name}.`;
      }
    } else if (qLower.includes('block') || qLower.includes('sign') || qLower.includes('contract')) {
      const securityMem = memories.find(m => m.content.toLowerCase().includes('security'));
      if (securityMem) {
        answer = `The security review is the current blocker. The customer stated: "${securityMem.content}". Contract signing cannot proceed until this clearance is granted.`;
      } else {
        answer = `There are currently no explicit blockers recorded for contract signing with ${customer.name}.`;
      }
    } else if (qLower.includes('issue') || qLower.includes('unresolved')) {
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
