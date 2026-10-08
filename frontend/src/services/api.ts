import { 
  User, 
  AuthResponse, 
  Customer, 
  Conversation, 
  MemoryItem, 
  UnresolvedIssue, 
  TimelineEvent, 
  DashboardStats, 
  InsightsData, 
  RecalledMemory, 
  RecommendedNextAction 
} from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_PREFIX = BASE_URL ? `${BASE_URL}/api` : '/api';
const TOKEN_KEY = 'continuo_token';

function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const combined: Record<string, string> = { ...headers };
  if (token) {
    combined['Authorization'] = `Bearer ${token}`;
  }
  return combined;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    const errorBody = await res.json().catch(() => ({ error: 'Unauthorized' }));
    throw new Error(errorBody.message || errorBody.error || 'Authentication required');
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Authentication
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  signOut(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  async signUp(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_PREFIX}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await handleResponse<AuthResponse>(res);
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_PREFIX}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse<AuthResponse>(res);
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getCurrentUser(): Promise<{ user: User }> {
    const res = await fetch(`${API_PREFIX}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse<{ user: User }>(res);
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_PREFIX}/customers`, {
      headers: getAuthHeaders()
    });
    return handleResponse<Customer[]>(res);
  },

  async getCustomer(id: string): Promise<Customer> {
    const res = await fetch(`${API_PREFIX}/customers/${id}`, {
      headers: getAuthHeaders()
    });
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    return handleResponse<Customer>(res);
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_PREFIX}/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    return handleResponse<Customer>(res);
  },

  async deleteCustomer(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_PREFIX}/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse<{ message: string }>(res);
  },

  // Conversations
  async getConversations(customerId?: string): Promise<Conversation[]> {
    const url = customerId 
      ? `${API_PREFIX}/conversations?customerId=${encodeURIComponent(customerId)}`
      : `${API_PREFIX}/conversations`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse<Conversation[]>(res);
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_PREFIX}/conversations/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse<Conversation>(res);
  },

  async createConversation(customerId: string, title?: string): Promise<Conversation> {
    const res = await fetch(`${API_PREFIX}/conversations`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text })
    });
    return handleResponse(res);
  },

  // Memories
  async getMemories(customerId?: string, category?: string): Promise<MemoryItem[]> {
    const params = new URLSearchParams();
    if (customerId) params.append('customerId', customerId);
    if (category) params.append('category', category);
    const res = await fetch(`${API_PREFIX}/memories?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse<MemoryItem[]>(res);
  },

  // Issues
  async getIssues(customerId?: string): Promise<UnresolvedIssue[]> {
    const url = customerId ? `${API_PREFIX}/issues?customerId=${encodeURIComponent(customerId)}` : `${API_PREFIX}/issues`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse<UnresolvedIssue[]>(res);
  },

  async updateIssue(id: string, updates: Partial<UnresolvedIssue>): Promise<UnresolvedIssue> {
    const res = await fetch(`${API_PREFIX}/issues/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates)
    });
    return handleResponse<UnresolvedIssue>(res);
  },

  // Timeline
  async getTimeline(customerId?: string): Promise<TimelineEvent[]> {
    const url = customerId ? `${API_PREFIX}/timeline?customerId=${encodeURIComponent(customerId)}` : `${API_PREFIX}/timeline`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ customerId, question })
    });
    return handleResponse(res);
  },

  // Stats & Insights
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_PREFIX}/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse<DashboardStats>(res);
  },

  async getInsights(): Promise<InsightsData> {
    const res = await fetch(`${API_PREFIX}/stats/insights`, {
      headers: getAuthHeaders()
    });
    return handleResponse<InsightsData>(res);
  },

  // Settings
  async getSystemStatus(): Promise<any> {
    const res = await fetch(`${API_PREFIX}/settings/status`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};
