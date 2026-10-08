import fs from 'fs';
import path from 'path';
import { User, Customer, Conversation, MemoryItem, UnresolvedIssue, TimelineEvent } from '../types.js';

interface DatabaseSchema {
  users: User[];
  customers: Customer[];
  conversations: Conversation[];
  memories: MemoryItem[];
  issues: UnresolvedIssue[];
  timeline: TimelineEvent[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'continuo_db.json');

class StorageService {
  private data: DatabaseSchema = {
    users: [],
    customers: [],
    conversations: [],
    memories: [],
    issues: [],
    timeline: []
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          customers: Array.isArray(parsed.customers) ? parsed.customers : [],
          conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
          memories: Array.isArray(parsed.memories) ? parsed.memories : [],
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          timeline: Array.isArray(parsed.timeline) ? parsed.timeline : []
        };
      } else {
        this.persist();
      }
    } catch (err) {
      console.error('Error initializing storage database:', err);
      this.data = {
        users: [],
        customers: [],
        conversations: [],
        memories: [],
        issues: [],
        timeline: []
      };
    }
  }

  private persist() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  // --- Users & Authentication ---
  createUser(user: User): User {
    this.data.users.push(user);
    this.persist();
    return user;
  }

  findUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find(u => u.email.toLowerCase() === normalized);
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  // --- Customers (Isolated per User) ---
  getCustomers(userId?: string): Customer[] {
    if (userId) {
      return this.data.customers.filter(c => c.userId === userId);
    }
    return [...this.data.customers];
  }

  getCustomer(id: string, userId?: string): Customer | undefined {
    return this.data.customers.find(c => c.id === id && (!userId || c.userId === userId));
  }

  addCustomer(customer: Customer): Customer {
    this.data.customers.unshift(customer);
    this.addTimelineEvent({
      id: crypto.randomUUID(),
      userId: customer.userId,
      customerId: customer.id,
      type: 'customer_created',
      title: 'Customer Onboarded',
      description: `${customer.name} from ${customer.company} added to Continuo platform`,
      timestamp: new Date().toISOString()
    });
    this.persist();
    return customer;
  }

  updateCustomer(id: string, updates: Partial<Customer>, userId?: string): Customer | undefined {
    const idx = this.data.customers.findIndex(c => c.id === id && (!userId || c.userId === userId));
    if (idx === -1) return undefined;
    this.data.customers[idx] = {
      ...this.data.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.data.customers[idx];
  }

  deleteCustomer(id: string, userId?: string): boolean {
    const initialLen = this.data.customers.length;
    const target = this.data.customers.find(c => c.id === id && (!userId || c.userId === userId));
    if (!target) return false;

    this.data.customers = this.data.customers.filter(c => c.id !== id);
    this.data.conversations = this.data.conversations.filter(c => c.customerId !== id);
    this.data.memories = this.data.memories.filter(m => m.customerId !== id);
    this.data.issues = this.data.issues.filter(i => i.customerId !== id);
    this.data.timeline = this.data.timeline.filter(t => t.customerId !== id);
    this.persist();
    return this.data.customers.length < initialLen;
  }

  // --- Conversations (Isolated per User) ---
  getConversations(customerId?: string, userId?: string): Conversation[] {
    let result = [...this.data.conversations];
    if (userId) {
      result = result.filter(c => c.userId === userId);
    }
    if (customerId) {
      result = result.filter(c => c.customerId === customerId);
    }
    return result;
  }

  getConversation(id: string, userId?: string): Conversation | undefined {
    return this.data.conversations.find(c => c.id === id && (!userId || c.userId === userId));
  }

  createConversation(conversation: Conversation): Conversation {
    this.data.conversations.unshift(conversation);
    this.addTimelineEvent({
      id: crypto.randomUUID(),
      userId: conversation.userId,
      customerId: conversation.customerId,
      type: 'conversation_started',
      title: 'New Conversation Thread Started',
      description: `Thread "${conversation.title}" opened`,
      timestamp: new Date().toISOString(),
      relatedId: conversation.id
    });
    this.persist();
    return conversation;
  }

  addMessageToConversation(conversationId: string, message: any): Conversation | undefined {
    const conv = this.data.conversations.find(c => c.id === conversationId);
    if (!conv) return undefined;
    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();
    this.persist();
    return conv;
  }

  // --- Memories (Isolated per User) ---
  getMemories(customerId?: string, userId?: string): MemoryItem[] {
    let result = [...this.data.memories];
    if (userId) {
      result = result.filter(m => m.userId === userId);
    }
    if (customerId) {
      result = result.filter(m => m.customerId === customerId);
    }
    return result;
  }

  addMemory(memory: MemoryItem): MemoryItem {
    this.data.memories.unshift(memory);
    this.addTimelineEvent({
      id: crypto.randomUUID(),
      userId: memory.userId,
      customerId: memory.customerId,
      type: 'memory_stored',
      title: `Retained: ${memory.category}`,
      description: memory.content,
      timestamp: new Date().toISOString(),
      relatedId: memory.id
    });
    this.persist();
    return memory;
  }

  // --- Unresolved Issues (Isolated per User) ---
  getIssues(customerId?: string, userId?: string): UnresolvedIssue[] {
    let result = [...this.data.issues];
    if (userId) {
      result = result.filter(i => i.userId === userId);
    }
    if (customerId) {
      result = result.filter(i => i.customerId === customerId);
    }
    return result;
  }

  addIssue(issue: UnresolvedIssue): UnresolvedIssue {
    this.data.issues.unshift(issue);
    this.addTimelineEvent({
      id: crypto.randomUUID(),
      userId: issue.userId,
      customerId: issue.customerId,
      type: 'issue_opened',
      title: `Detected Issue: ${issue.title}`,
      description: issue.description,
      timestamp: new Date().toISOString(),
      relatedId: issue.id
    });
    this.persist();
    return issue;
  }

  updateIssue(id: string, updates: Partial<UnresolvedIssue>, userId?: string): UnresolvedIssue | undefined {
    const idx = this.data.issues.findIndex(i => i.id === id && (!userId || i.userId === userId));
    if (idx === -1) return undefined;
    const old = this.data.issues[idx];
    this.data.issues[idx] = { ...old, ...updates };
    
    if (updates.status === 'resolved' && old.status !== 'resolved') {
      this.data.issues[idx].resolvedAt = new Date().toISOString();
      this.addTimelineEvent({
        id: crypto.randomUUID(),
        userId: old.userId,
        customerId: old.customerId,
        type: 'issue_resolved',
        title: `Resolved Issue: ${old.title}`,
        description: `Issue marked as resolved`,
        timestamp: new Date().toISOString(),
        relatedId: old.id
      });
    }
    this.persist();
    return this.data.issues[idx];
  }

  // --- Timeline (Isolated per User) ---
  getTimeline(customerId?: string, userId?: string): TimelineEvent[] {
    let result = [...this.data.timeline];
    if (userId) {
      result = result.filter(t => t.userId === userId);
    }
    if (customerId) {
      result = result.filter(t => t.customerId === customerId);
    }
    return result;
  }

  addTimelineEvent(event: TimelineEvent) {
    this.data.timeline.unshift(event);
    this.persist();
  }
}

export const storageService = new StorageService();
