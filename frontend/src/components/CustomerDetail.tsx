import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building, 
  Mail, 
  Package, 
  ArrowLeft, 
  MessageSquare, 
  Brain, 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Check, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  Server,
  Settings,
  ListTodo,
  Calendar,
  Flag,
  Zap
} from 'lucide-react';
import { Customer, Conversation, MemoryItem, UnresolvedIssue, TimelineEvent, FollowUpTask, CustomerPriority } from '../types';
import { api } from '../services/api';

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
  onOpenConversation: (customerId: string, conversationId?: string) => void;
  onOpenAskContinuo: (cust: Customer) => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customer,
  onBack,
  onOpenConversation,
  onOpenAskContinuo
}) => {
  const [currentCustomer, setCurrentCustomer] = useState<Customer>(customer);
  const [activeTab, setActiveTab] = useState<'context' | 'tasks' | 'memories' | 'issues' | 'conversations' | 'timeline'>('context');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [issues, setIssues] = useState<UnresolvedIssue[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>(customer.followUpTasks || []);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentCustomer(customer);
    setTasks(customer.followUpTasks || []);
    loadCustomerData();
  }, [customer.id]);

  const loadCustomerData = async () => {
    setIsLoading(true);
    try {
      const [mems, iss, convs, time, freshCust] = await Promise.all([
        api.getMemories(customer.id),
        api.getIssues(customer.id),
        api.getConversations(customer.id),
        api.getTimeline(customer.id),
        api.getCustomer(customer.id).catch(() => null)
      ]);
      setMemories(mems);
      setIssues(iss);
      setConversations(convs);
      setTimeline(time);
      if (freshCust) {
        setCurrentCustomer(freshCust);
        setTasks(freshCust.followUpTasks || []);
      }
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    try {
      await api.updateIssue(issueId, { status: 'resolved' });
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'resolved' } : i));
    } catch (err) {
      console.error('Failed to resolve issue:', err);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: 'pending' | 'completed') => {
    const nextStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    try {
      const updatedCust = await api.toggleCustomerTask(currentCustomer.id, taskId, nextStatus);
      if (updatedCust && updatedCust.followUpTasks) {
        setTasks(updatedCust.followUpTasks);
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const updatedCust = await api.addCustomerTask(currentCustomer.id, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined
      });
      if (updatedCust && updatedCust.followUpTasks) {
        setTasks(updatedCust.followUpTasks);
      }
      setNewTaskTitle('');
      setNewTaskDueDate('');
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const latestRecommendedAction = useMemo(() => {
    for (const conv of conversations) {
      for (let i = conv.messages.length - 1; i >= 0; i--) {
        if (conv.messages[i].recommendedNextAction) {
          return conv.messages[i].recommendedNextAction;
        }
      }
    }
    return null;
  }, [conversations]);

  const requirements = memories.filter(m => m.category === 'Requirement');
  const technicalContexts = memories.filter(m => m.category === 'Technical Context');
  const preferences = memories.filter(m => m.category === 'Preference');
  const commitments = memories.filter(m => m.category === 'Commitment');
  const openIssues = issues.filter(i => i.status === 'open');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button & Action Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenAskContinuo(currentCustomer)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold shadow-sm transition-all"
          >
            <Brain className="w-4 h-4 text-indigo-400" />
            <span>Ask Continuo</span>
          </button>
          <button
            onClick={() => onOpenConversation(currentCustomer.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Conversation</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="p-6 rounded-2xl bg-[#0f172a]/95 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">{currentCustomer.name}</h1>
              
              {/* Health Badge */}
              <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                currentCustomer.health === 'Healthy'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : currentCustomer.health === 'Needs Attention'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                ● {currentCustomer.health}
              </span>

              {/* Priority Badge */}
              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
                currentCustomer.priority === 'Critical'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                  : currentCustomer.priority === 'High'
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm'
                  : currentCustomer.priority === 'Low'
                  ? 'bg-slate-700/40 text-slate-400 border-slate-600'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                ▲ {currentCustomer.priority || 'Medium'} Priority
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> {currentCustomer.company}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {currentCustomer.email}</span>
              <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {currentCustomer.product}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-right min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Health Status Reason</span>
            <p className="text-xs font-medium text-slate-200">{currentCustomer.healthReason || 'No blockers detected'}</p>
          </div>
        </div>

        {/* Recommended Next Action Banner (if active) */}
        {latestRecommendedAction && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Recommended Next Action</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  latestRecommendedAction.urgency === 'high'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : latestRecommendedAction.urgency === 'medium'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                  {latestRecommendedAction.urgency} urgency
                </span>
              </div>
              <p className="text-xs font-semibold text-white">{latestRecommendedAction.action}</p>
              <p className="text-[11px] text-slate-300">{latestRecommendedAction.reason}</p>
            </div>
          </div>
        )}

        {/* AI Customer Summary & Living Context Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-emerald-500/30 shadow-inner space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>{currentCustomer.conversationSummary ? 'AI Conversation Summary & Living Context' : 'Customer Profile Summary'}</span>
            </div>
            {currentCustomer.conversationSummary && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Live AI Generated
              </span>
            )}
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            "{currentCustomer.conversationSummary || currentCustomer.summary || 'Customer profile created. Pending conversation threads.'}"
          </p>
        </div>

        {/* Profile Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pt-2 overflow-x-auto">
          {[
            { id: 'context', label: 'Living Context & Commitments' },
            { id: 'tasks', label: `Follow-up Tasks (${pendingTasks.length} pending)` },
            { id: 'memories', label: `Persistent Memories (${memories.length})` },
            { id: 'issues', label: `Issues Tracker (${openIssues.length} open)` },
            { id: 'conversations', label: `Conversations (${conversations.length})` },
            { id: 'timeline', label: 'Journey Timeline' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Context & Commitments */}
      {activeTab === 'context' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Important Requirements */}
          <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Important Requirements</span>
            </div>
            {requirements.length > 0 ? (
              <div className="space-y-2">
                {requirements.map(req => (
                  <div key={req.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 space-y-1">
                    <p className="font-medium text-white">{req.content}</p>
                    <span className="text-[10px] text-slate-400 block">Source: {req.source}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No critical requirements recorded yet.</p>
            )}
          </div>

          {/* Technical Context */}
          <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold">
              <Server className="w-4 h-4" />
              <span>Technical & Infrastructure Context</span>
            </div>
            {technicalContexts.length > 0 ? (
              <div className="space-y-2">
                {technicalContexts.map(tc => (
                  <div key={tc.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 space-y-1">
                    <p className="font-medium text-white">{tc.content}</p>
                    <span className="text-[10px] text-slate-400 block">Source: {tc.source}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No infrastructure details recorded yet.</p>
            )}
          </div>

          {/* Customer Preferences */}
          <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
              <Settings className="w-4 h-4" />
              <span>Preferences & Communication Channels</span>
            </div>
            {preferences.length > 0 ? (
              <div className="space-y-2">
                {preferences.map(pref => (
                  <div key={pref.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 space-y-1">
                    <p className="font-medium text-white">{pref.content}</p>
                    <span className="text-[10px] text-slate-400 block">Source: {pref.source}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No communication preferences stated yet.</p>
            )}
          </div>

          {/* Important Commitments */}
          <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Important Commitments & Promises</span>
            </div>
            {commitments.length > 0 ? (
              <div className="space-y-2">
                {commitments.map(comm => (
                  <div key={comm.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 space-y-1">
                    <p className="font-medium text-white">{comm.content}</p>
                    <span className="text-[10px] text-slate-400 block">Source: {comm.source}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No pending commitments recorded.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Follow-up Tasks & Reminders */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Create new task form */}
          <form onSubmit={handleAddTask} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              placeholder="Add follow-up task or reminder (e.g., Deliver SOC2 compliance report)..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-2">
              <select
                value={newTaskPriority}
                onChange={e => setNewTaskPriority(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={e => setNewTaskDueDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          </form>

          {/* Tasks List */}
          <div className="space-y-3">
            {tasks.length > 0 ? (
              tasks.map(task => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    task.status === 'completed'
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        task.status === 'completed'
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                          : 'border-slate-700 hover:border-emerald-500 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <div>
                      <span className={`text-xs font-medium block ${
                        task.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'
                      }`}>
                        {task.title}
                      </span>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            Due: {task.dueDate}
                          </span>
                        )}
                        <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border shrink-0 ${
                    task.priority === 'high'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : task.priority === 'medium'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                <ListTodo className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                <p>No follow-up tasks or reminders scheduled for this account.</p>
                <p className="text-[11px] text-slate-500 mt-1">Add tasks above to ensure all support commitments are delivered.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Persistent Memories */}
      {activeTab === 'memories' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Customer-isolated memories stored via Hindsight API layer</span>
            <span className="text-emerald-400 font-semibold">{memories.length} Stored Memories</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memories.map(mem => (
              <div key={mem.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {mem.category}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(mem.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-medium text-slate-100">{mem.content}</p>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Source: {mem.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Issues Tracker */}
      {activeTab === 'issues' && (
        <div className="space-y-6">
          {/* Open Issues */}
          <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Open & Unresolved Issues ({openIssues.length})</span>
              </h3>
            </div>
            {openIssues.length > 0 ? (
              <div className="space-y-3">
                {openIssues.map(issue => (
                  <div key={issue.id} className="p-4 rounded-xl bg-slate-900 border border-rose-900/40 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{issue.title}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{issue.description}</p>
                    </div>
                    <button
                      onClick={() => handleResolveIssue(issue.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No unresolved issues pending for this customer.</p>
            )}
          </div>

          {/* Resolved Issues */}
          <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Resolved Issues History ({resolvedIssues.length})</span>
            </h3>
            {resolvedIssues.length > 0 ? (
              <div className="space-y-3">
                {resolvedIssues.map(issue => (
                  <div key={issue.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 opacity-80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-300 line-through">{issue.title}</span>
                      <p className="text-xs text-slate-400">{issue.description}</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold">Resolved</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No previously resolved issues recorded.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Conversations */}
      {activeTab === 'conversations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Customer Support Threads</h3>
            <button
              onClick={() => onOpenConversation(currentCustomer.id)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Conversation</span>
            </button>
          </div>
          {conversations.length > 0 ? (
            <div className="space-y-3">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => onOpenConversation(currentCustomer.id, conv.id)}
                  className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">{conv.title}</h4>
                    <p className="text-xs text-slate-400">
                      {conv.messages.length} messages · Last updated {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium">
                    Resume Thread →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No conversation threads yet.</p>
          )}
        </div>
      )}

      {/* Tab 5: Timeline */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white mb-4">Customer Journey Timeline</h3>
          {timeline.length > 0 ? (
            <div className="space-y-6 relative border-l-2 border-slate-800 ml-3">
              {timeline.map((event) => (
                <div key={event.id} className="relative pl-6 space-y-1">
                  <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-950"></span>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{event.title}</h4>
                    <span className="text-[10px] text-slate-400">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">{event.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">No milestone events logged yet.</p>
          )}
        </div>
      )}
    </div>
  );
};
