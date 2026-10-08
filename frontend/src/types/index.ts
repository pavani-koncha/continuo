export type CustomerHealth = 'Healthy' | 'Needs Attention' | 'At Risk';
export type CustomerPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface FollowUpTask {
  id: string;
  customerId: string;
  title: string;
  dueDate?: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
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
  priority?: CustomerPriority;
  healthReason: string;
  summary: string;
  conversationSummary?: string;
  followUpTasks?: FollowUpTask[];
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
  recentConversations: Array<{
    id: string;
    title: string;
    customerName: string;
    company: string;
    updatedAt: string;
    messageCount: number;
    lastMessageText: string;
  }>;
  healthCounts: {
    healthy: number;
    needsAttention: number;
    atRisk: number;
  };
}

export interface InsightsData {
  totalCustomers: number;
  openIssuesCount: number;
  resolvedIssuesCount: number;
  customersNeedingAttention: Array<{
    id: string;
    name: string;
    company: string;
    health: CustomerHealth;
    priority?: CustomerPriority;
    healthReason: string;
    openIssuesCount: number;
    memoryCount: number;
  }>;
  openIssuesList: UnresolvedIssue[];
  memoryCategoryCounts: Record<string, number>;
  recentMemories: MemoryItem[];
  healthDistribution?: {
    healthy: number;
    needsAttention: number;
    atRisk: number;
  };
  issueSeverityDistribution?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  issuesStatusDistribution?: {
    open: number;
    resolved: number;
  };
  activityOverTime?: Array<{
    date: string;
    count: number;
    label: string;
  }>;
  priorityDistribution?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
