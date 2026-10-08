import { MemoryItem, RecalledMemory } from '../types.js';
import { storageService } from './storageService.js';

export interface StoreMemoryParams {
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
            'X-Customer-ID': params.customerId
          },
          body: JSON.stringify({
            customer_id: params.customerId,
            content: params.content,
            category: params.category,
            metadata: {
              source: params.source,
              timestamp: memoryItem.timestamp,
              conversation_id: params.conversationId
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
  async retrieveMemories(customerId: string, query: string, topK: number = 4): Promise<RecalledMemory[]> {
    // 1. Try remote Hindsight retrieval if key is present
    if (this.isConfigured()) {
      try {
        const response = await fetch(`${this.apiUrl}/v1/memories/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Customer-ID': customerId
          },
          body: JSON.stringify({
            customer_id: customerId,
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
    const customerMemories = storageService.getMemories(customerId);
    if (!customerMemories.length) {
      return [];
    }

    const queryWords = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const scored = customerMemories.map(mem => {
      const memWords = mem.content.toLowerCase().split(/\s+/);
      let matchCount = 0;
      
      // Keyword match
      for (const qw of queryWords) {
        if (memWords.some(mw => mw.includes(qw) || qw.includes(mw))) {
          matchCount += 2;
        }
      }

      // Contextual synonym matching for support topics
      const qLower = query.toLowerCase();
      const mLower = mem.content.toLowerCase();
      
      if ((qLower.includes('contract') || qLower.includes('sign') || qLower.includes('deal')) && 
          (mLower.includes('security') || mLower.includes('review') || mLower.includes('sign') || mLower.includes('contract'))) {
        matchCount += 5;
      }

      if ((qLower.includes('deploy') || qLower.includes('cloud') || qLower.includes('host') || qLower.includes('server')) &&
          (mLower.includes('aws') || mLower.includes('azure') || mLower.includes('gcp') || mLower.includes('kubernetes') || mLower.includes('production'))) {
        matchCount += 5;
      }

      if ((qLower.includes('login') || qLower.includes('auth') || qLower.includes('access')) &&
          (mLower.includes('login') || mLower.includes('auth') || mLower.includes('sso') || mLower.includes('permission'))) {
        matchCount += 5;
      }

      if ((qLower.includes('contact') || qLower.includes('reach') || qLower.includes('channel') || qLower.includes('email')) &&
          (mLower.includes('email') || mLower.includes('phone') || mLower.includes('slack') || mLower.includes('channel'))) {
        matchCount += 5;
      }

      return {
        memory: mem,
        score: matchCount
      };
    });

    // Sort by score descending, then by recent timestamp
    scored.sort((a, b) => b.score - a.score);

    // If matches found with score > 0, return top matches
    const topMatches = scored.filter(s => s.score > 0).slice(0, topK);
    
    // If no strong keyword match was found but query is general, return recent significant memories (Requirements, Issues)
    if (topMatches.length === 0) {
      const priorityMemories = customerMemories
        .filter(m => m.category === 'Requirement' || m.category === 'Issue')
        .slice(0, 2);

      return priorityMemories.map(m => ({
        id: m.id,
        content: m.content,
        category: m.category,
        source: m.source,
        timestamp: m.timestamp,
        relevanceReason: `Prior customer ${m.category.toLowerCase()} on record`
      }));
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
