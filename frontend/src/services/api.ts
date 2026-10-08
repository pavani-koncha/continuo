import { Customer, Conversation, MemoryItem, UnresolvedIssue, TimelineEvent, DashboardStats, InsightsData, RecalledMemory, RecommendedNextAction } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_PREFIX = BASE_URL ? `${BASE_URL}/api` : '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_PREFIX}/customers`);
    return handleResponse<Customer[]>(res);
  },

  async getCustomer(id: string): Promise<Customer> {
    const res = await fetch(`${API_PREFIX}/customers/${id}`);
    return handleResponse<Customer>(res);
  },

  async createCustomer(data: {
    name: string;
    company: string;
    email: string;
    product?: string;
    initialNotes?: string;
    tags?: string[];
  }): Promise<Customer> {
    const res = await fetch(`${API_PREFIX}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Customer>(res);
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_PREFIX}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Customer>(res);
  },

  async deleteCustomer(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_PREFIX}/customers/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<{ message: string }>(res);
  },

  // Conversations
  async getConversations(customerId?: string): Promise<Conversation[]> {
    const url = customerId 
      ? `${API_PREFIX}/conversations?customerId=${encodeURIComponent(customerId)}`
      : `${API_PREFIX}/conversations`;
    const res = await fetch(url);
    return handleResponse<Conversation[]>(res);
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_PREFIX}/conversations/${id}`);
    return handleResponse<Conversation>(res);
  },

  async createConversation(customerId: string, title?: string): Promise<Conversation> {
    const res = await fetch(`${API_PREFIX}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, title })
    });
    return handleResponse<Conversation>(res);
  },

  async sendMessage(conversationId: string, text: string): Promise<{
    conversation: Conversation;
    recalledMemories: RecalledMemory[];
    recommendedNextAction: RecommendedNextAction;
    extractedMemories: MemoryItem[];
  }> {
    const res = await fetch(`${API_PREFIX}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return handleResponse(res);
  },

  // Memories
  async getMemories(customerId?: string, category?: string): Promise<MemoryItem[]> {
    const params = new URLSearchParams();
    if (customerId) params.append('customerId', customerId);
    if (category) params.append('category', category);
    const res = await fetch(`${API_PREFIX}/memories?${params.toString()}`);
    return handleResponse<MemoryItem[]>(res);
  },

  // Issues
  async getIssues(customerId?: string): Promise<UnresolvedIssue[]> {
    const url = customerId ? `${API_PREFIX}/issues?customerId=${encodeURIComponent(customerId)}` : `${API_PREFIX}/issues`;
    const res = await fetch(url);
    return handleResponse<UnresolvedIssue[]>(res);
  },

  async updateIssue(id: string, updates: Partial<UnresolvedIssue>): Promise<UnresolvedIssue> {
    const res = await fetch(`${API_PREFIX}/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse<UnresolvedIssue>(res);
  },

  // Timeline
  async getTimeline(customerId?: string): Promise<TimelineEvent[]> {
    const url = customerId ? `${API_PREFIX}/timeline?customerId=${encodeURIComponent(customerId)}` : `${API_PREFIX}/timeline`;
    const res = await fetch(url);
    return handleResponse<TimelineEvent[]>(res);
  },

  // Ask Continuo
  async askContinuo(customerId: string, question: string): Promise<{
    question: string;
    customer: { id: string; name: string; company: string };
    answer: string;
    citedMemories: RecalledMemory[];
  }> {
    const res = await fetch(`${API_PREFIX}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, question })
    });
    return handleResponse(res);
  },

  // Stats & Insights
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_PREFIX}/stats`);
    return handleResponse<DashboardStats>(res);
  },

  async getInsights(): Promise<InsightsData> {
    const res = await fetch(`${API_PREFIX}/stats/insights`);
    return handleResponse<InsightsData>(res);
  },

  // Settings
  async getSystemStatus(): Promise<any> {
    const res = await fetch(`${API_PREFIX}/settings/status`);
    return handleResponse(res);
  }
};
