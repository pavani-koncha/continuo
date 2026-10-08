export type CustomerHealth = 'Healthy' | 'Needs Attention' | 'At Risk';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  company: string;
  email: string;
  product: string;
  initialNotes: string;
  tags: string[];
  health: CustomerHealth;
  healthReason: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export type MemoryCategory = 
  | 'Requirement'
  | 'Issue'
  | 'Preference'
  | 'Technical Context'
  | 'Commitment'
  | 'General Context';

export interface MemoryItem {
  id: string;
  userId?: string;
  customerId: string;
  conversationId?: string;
  content: string;
  category: MemoryCategory;
  source: string;
  timestamp: string;
  confidence?: number;
}

export interface RecalledMemory {
  id: string;
  content: string;
  category: MemoryCategory;
  source: string;
  timestamp: string;
  relevanceReason?: string;
}

export interface RecommendedNextAction {
  action: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface Message {
  id: string;
  conversationId: string;
  customerId: string;
  sender: 'customer' | 'continuo';
  text: string;
  timestamp: string;
  recalledMemories?: RecalledMemory[];
  recommendedNextAction?: RecommendedNextAction;
  extractedMemories?: MemoryItem[];
}

export interface Conversation {
  id: string;
  userId?: string;
  customerId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface UnresolvedIssue {
  id: string;
  userId?: string;
  customerId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'resolved';
  detectedAt: string;
  resolvedAt?: string;
  sourceConversationId?: string;
}

export interface TimelineEvent {
  id: string;
  userId?: string;
  customerId: string;
  type: 
    | 'customer_created'
    | 'conversation_started'
    | 'memory_stored'
    | 'issue_opened'
    | 'issue_resolved'
    | 'action_recommended';
  title: string;
  description: string;
  timestamp: string;
  relatedId?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalConversations: number;
  storedMemories: number;
  openIssues: number;
  customersNeedingAttention: number;
  recentActivity: TimelineEvent[];
}
