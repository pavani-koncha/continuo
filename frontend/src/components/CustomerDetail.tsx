import React, { useState, useEffect } from 'react';
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
  Settings
} from 'lucide-react';
import { Customer, Conversation, MemoryItem, UnresolvedIssue, TimelineEvent } from '../types';
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
  const [activeTab, setActiveTab] = useState<'context' | 'memories' | 'issues' | 'conversations' | 'timeline'>('context');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [issues, setIssues] = useState<UnresolvedIssue[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [customer.id]);

  const loadCustomerData = async () => {
    setIsLoading(true);
    try {
      const [mems, iss, convs, time] = await Promise.all([
        api.getMemories(customer.id),
        api.getIssues(customer.id),
        api.getConversations(customer.id),
        api.getTimeline(customer.id)
      ]);
      setMemories(mems);
      setIssues(iss);
      setConversations(convs);
      setTimeline(time);
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

  const requirements = memories.filter(m => m.category === 'Requirement');
  const technicalContexts = memories.filter(m => m.category === 'Technical Context');
  const preferences = memories.filter(m => m.category === 'Preference');
  const commitments = memories.filter(m => m.category === 'Commitment');
  const openIssues = issues.filter(i => i.status === 'open');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');

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
            onClick={() => onOpenAskContinuo(customer)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold shadow-sm transition-all"
          >
            <Brain className="w-4 h-4 text-indigo-400" />
            <span>Ask Continuo</span>
          </button>
          <button
            onClick={() => onOpenConversation(customer.id)}
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{customer.name}</h1>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                customer.health === 'Healthy'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : customer.health === 'Needs Attention'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                ● {customer.health}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> {customer.company}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
              <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {customer.product}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-right min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Health Status Reason</span>
            <p className="text-xs font-medium text-slate-200">{customer.healthReason || 'No blockers detected'}</p>
          </div>
        </div>

        {/* AI Customer Summary Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-emerald-500/30 shadow-inner">
          <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>AI Customer Summary & Living Context</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            "{customer.summary || 'Customer profile created. Pending conversation threads.'}"
          </p>
        </div>

        {/* Profile Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pt-2 overflow-x-auto">
          {[
            { id: 'context', label: 'Living Context & Commitments' },
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
              <p className="text-xs text-slate-400 py-3">No active unresolved issues for this customer.</p>
            )}
          </div>

          {/* Resolved Issues */}
          {resolvedIssues.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Resolved Issues ({resolvedIssues.length})</span>
              </h3>
              <div className="space-y-2">
                {resolvedIssues.map(issue => (
                  <div key={issue.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between opacity-80">
                    <div>
                      <p className="text-xs font-medium text-slate-300 line-through">{issue.title}</p>
                      <p className="text-[11px] text-slate-400">{issue.description}</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">Resolved</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Conversations */}
      {activeTab === 'conversations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Customer Support Threads</h3>
            <button
              onClick={() => onOpenConversation(customer.id)}
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
                  onClick={() => onOpenConversation(customer.id, conv.id)}
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
