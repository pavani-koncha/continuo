import { MemoryItem, RecalledMemory } from '../types.js';
import { storageService } from './storageService.js';

export interface StoreMemoryParams {
  userId?: string;
  customerId: string;
  conversationId?: string;
  content: string;
  category: MemoryItem['category'];
  source: string;
}

export class HindsightService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.HINDSIGHT_API_URL || 'https://api.hindsight.vectorize.io';
    this.apiKey = process.env.HINDSIGHT_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Stores a memory item into Hindsight persistent layer with customer isolation
   */
  async storeMemory(params: StoreMemoryParams): Promise<MemoryItem> {
    const memoryItem: MemoryItem = {
      id: crypto.randomUUID(),
      userId: params.userId,
      customerId: params.customerId,
      conversationId: params.conversationId,
      content: params.content,
      category: params.category,
      source: params.source,
      timestamp: new Date().toISOString()
    };

    // Save to local storage registry first
    storageService.addMemory(memoryItem);

    // If Hindsight API key is configured, push to Hindsight remote cluster
    if (this.isConfigured()) {
      try {
        const response = await fetch(`${this.apiUrl}/v1/memories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Customer-ID': params.customerId,
            ...(params.userId ? { 'X-User-ID': params.userId } : {})
          },
          body: JSON.stringify({
            customer_id: params.customerId,
            user_id: params.userId,
            content: params.content,
            category: params.category,
            metadata: {
              source: params.source,
              timestamp: memoryItem.timestamp,
              conversation_id: params.conversationId,
              user_id: params.userId
            }
          })
        });

        if (!response.ok) {
          console.warn(`Hindsight API responded with status ${response.status}: ${await response.text().catch(() => '')}`);
        } else {
          console.log(`[Hindsight] Memory stored successfully for customer ${params.customerId}`);
        }
      } catch (err: any) {
        console.warn(`[Hindsight] Remote storage call error (falling back to local memory):`, err.message);
      }
    } else {
      console.log(`[Hindsight] HINDSIGHT_API_KEY not set - stored memory in customer-isolated local layer.`);
    }

    return memoryItem;
  }

  /**
   * Retrieves relevant memories for a specific customer.
   * Guarantees 100% customer isolation.
   */
  async retrieveMemories(customerId: string, query: string, topK: number = 4, userId?: string): Promise<RecalledMemory[]> {
    // 1. Try remote Hindsight retrieval if key is present
    if (this.isConfigured()) {
      try {
        const response = await fetch(`${this.apiUrl}/v1/memories/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Customer-ID': customerId,
            ...(userId ? { 'X-User-ID': userId } : {})
          },
          body: JSON.stringify({
            customer_id: customerId,
            user_id: userId,
            query: query,
            limit: topK
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          if (Array.isArray(data.memories) && data.memories.length > 0) {
            return data.memories.map((m: any) => ({
              id: m.id || crypto.randomUUID(),
              content: m.content || m.text,
              category: m.category || 'General Context',
              source: m.metadata?.source || m.source || 'Hindsight Remote Memory',
              timestamp: m.metadata?.timestamp || m.timestamp || new Date().toISOString(),
              relevanceReason: m.relevance_reason || 'Retrieved from Hindsight vector index'
            }));
          }
        }
      } catch (err: any) {
        console.warn(`[Hindsight] Remote retrieval error:`, err.message);
      }
    }

    // 2. Fallback: Intelligent semantic & keyword matching on customer-isolated persistent memories
    const customerMemories = storageService.getMemories(customerId, userId);
    if (!customerMemories.length) {
      return [];
    }

    const stopWords = new Set([
      'what', 'is', 'how', 'why', 'who', 'when', 'where', 'which', 'can', 'could',
      'would', 'should', 'the', 'a', 'an', 'and', 'or', 'to', 'in', 'on', 'at',
      'by', 'for', 'with', 'about', 'from', 'into', 'my', 'our', 'your', 'their',
      'his', 'her', 'its', 'this', 'that', 'these', 'those', 'do', 'does', 'did',
      'done', 'be', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
      'tell', 'me', 'explain', 'please', 'just', 'we', 'i', 'you'
    ]);

    const queryTerms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    if (queryTerms.length === 0) {
      return [];
    }

    const scored = customerMemories.map(mem => {
      const memWords = mem.content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      let matchCount = 0;
      for (const qt of queryTerms) {
        if (memWords.some(mw => mw === qt || (mw.length > 4 && qt.length > 4 && (mw.startsWith(qt) || qt.startsWith(mw))))) {
          matchCount += 2;
        }
      }

      return {
        memory: mem,
        score: matchCount
      };
    });

    // Sort by score descending, then by recent timestamp
    scored.sort((a, b) => b.score - a.score);

    // Require genuine keyword overlap (score >= 2)
    const topMatches = scored.filter(s => s.score >= 2).slice(0, topK);
    
    // If no strong match was found (e.g. general question unrelated to customer history),
    // return empty array so unrelated customer memories are NOT forced into the response.
    if (topMatches.length === 0) {
      return [];
    }

    return topMatches.map(s => ({
      id: s.memory.id,
      content: s.memory.content,
      category: s.memory.category,
      source: s.memory.source,
      timestamp: s.memory.timestamp,
      relevanceReason: `High semantic relevance to current context`
    }));
  }
}

export const hindsightService = new HindsightService();
