import fs from 'fs';
import path from 'path';
import { Customer, Conversation, MemoryItem, UnresolvedIssue, TimelineEvent } from '../types.js';

interface DatabaseSchema {
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
        this.data = JSON.parse(raw);
      } else {
        this.persist();
      }
    } catch (err) {
      console.error('Error initializing storage database:', err);
      this.data = {
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

  // --- Customers ---
  getCustomers(): Customer[] {
    return [...this.data.customers];
  }

  getCustomer(id: string): Customer | undefined {
    return this.data.customers.find(c => c.id === id);
  }

  addCustomer(customer: Customer): Customer {
    this.data.customers.unshift(customer);
    this.addTimelineEvent({
      id: crypto.randomUUID(),
      customerId: customer.id,
      type: 'customer_created',
      title: 'Customer Onboarded',
      description: `${customer.name} from ${customer.company} added to Continuo platform`,
      timestamp: new Date().toISOString()
    });
    this.persist();
    return customer;
  }

  updateCustomer(id: string, updates: Partial<Customer>): Customer | undefined {
    const idx = this.data.customers.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.data.customers[idx] = {
      ...this.data.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.data.customers[idx];
  }

  deleteCustomer(id: string): boolean {
    const initialLen = this.data.customers.length;
    this.data.customers = this.data.customers.filter(c => c.id !== id);
    this.data.conversations = this.data.conversations.filter(c => c.customerId !== id);
    this.data.memories = this.data.memories.filter(m => m.customerId !== id);
    this.data.issues = this.data.issues.filter(i => i.customerId !== id);
    this.data.timeline = this.data.timeline.filter(t => t.customerId !== id);
    this.persist();
    return this.data.customers.length < initialLen;
  }

  // --- Conversations ---
  getConversations(customerId?: string): Conversation[] {
    if (customerId) {
      return this.data.conversations.filter(c => c.customerId === customerId);
    }
    return [...this.data.conversations];
  }

  getConversation(id: string): Conversation | undefined {
    return this.data.conversations.find(c => c.id === id);
  }

  createConversation(conversation: Conversation): Conversation {
    this.data.conversations.unshift(conversation);
    this.addTimelineEvent({
      id: crypto.randomUUID(),
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

  // --- Memories ---
  getMemories(customerId?: string): MemoryItem[] {
    if (customerId) {
      return this.data.memories.filter(m => m.customerId === customerId);
    }
    return [...this.data.memories];
  }

  addMemory(memory: MemoryItem): MemoryItem {
    this.data.memories.unshift(memory);
    this.addTimelineEvent({
      id: crypto.randomUUID(),
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

  // --- Unresolved Issues ---
  getIssues(customerId?: string): UnresolvedIssue[] {
    if (customerId) {
      return this.data.issues.filter(i => i.customerId === customerId);
    }
    return [...this.data.issues];
  }

  addIssue(issue: UnresolvedIssue): UnresolvedIssue {
    this.data.issues.unshift(issue);
    this.addTimelineEvent({
      id: crypto.randomUUID(),
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

  updateIssue(id: string, updates: Partial<UnresolvedIssue>): UnresolvedIssue | undefined {
    const idx = this.data.issues.findIndex(i => i.id === id);
    if (idx === -1) return undefined;
    const old = this.data.issues[idx];
    this.data.issues[idx] = { ...old, ...updates };
    
    if (updates.status === 'resolved' && old.status !== 'resolved') {
      this.data.issues[idx].resolvedAt = new Date().toISOString();
      this.addTimelineEvent({
        id: crypto.randomUUID(),
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

  // --- Timeline ---
  getTimeline(customerId?: string): TimelineEvent[] {
    if (customerId) {
      return this.data.timeline.filter(t => t.customerId === customerId);
    }
    return [...this.data.timeline];
  }

  addTimelineEvent(event: TimelineEvent) {
    this.data.timeline.unshift(event);
    this.persist();
  }
}

export const storageService = new StorageService();
