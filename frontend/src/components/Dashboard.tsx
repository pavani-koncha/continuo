import React from 'react';
import { 
  Users, 
  MessageSquare, 
  BrainCircuit, 
  AlertTriangle, 
  HeartHandshake, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Building, 
  CheckCircle2, 
  Flame,
  Bot
} from 'lucide-react';
import { Customer, DashboardStats, TimelineEvent } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  customers: Customer[];
  onSelectCustomer: (cust: Customer) => void;
  onOpenAddCustomer: () => void;
  onOpenConversation: (customerId: string, conversationId?: string) => void;
  onOpenAskContinuo: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  customers,
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenConversation,
  onOpenAskContinuo,
  onNavigateTab
}) => {
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#101b33] to-[#0c1a2e] border border-slate-800 p-6 shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Persistent AI Customer Support Intelligence</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              The AI Support Agent That Remembers.
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              ChatGPT answers the current question. <strong>Continuo understands the customer behind the question.</strong> Every customer, conversation, and commitment — continuously connected through Hindsight memory.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenAddCustomer}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition-all duration-150 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
            <button
              onClick={() => onNavigateTab('conversations')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all duration-150"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Customers</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-white tracking-tight">{stats?.totalCustomers ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Dynamic customer profiles</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Conversations</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-white tracking-tight">{stats?.totalConversations ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Multi-thread customer chats</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Stored Memories</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-white tracking-tight">{stats?.storedMemories ?? 0}</p>
            <p className="text-[11px] text-emerald-400 font-medium mt-1">Hindsight persistent layer</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Open Issues</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-white tracking-tight">{stats?.openIssues ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Blockers & open tickets</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Needing Attention</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-white tracking-tight">{stats?.customersNeedingAttention ?? 0}</p>
            <p className="text-[11px] text-amber-400/90 font-medium mt-1">Context-determined health</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Conversations vs Customer Health & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Conversations (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent Customer Conversations</h3>
                <p className="text-xs text-slate-400">Live support interactions with persistent recall</p>
              </div>
              <button
                onClick={() => onNavigateTab('conversations')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {stats?.recentConversations && stats.recentConversations.length > 0 ? (
              <div className="space-y-3">
                {stats.recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      const cust = customers.find(c => c.name === conv.customerName);
                      if (cust) {
                        onSelectCustomer(cust);
                        onOpenConversation(cust.id, conv.id);
                      }
                    }}
                    className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{conv.title}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                          {conv.customerName} ({conv.company})
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-md">
                        {conv.lastMessageText}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400">{formatTime(conv.updatedAt)}</span>
                      <p className="text-[11px] text-emerald-400 font-medium">{conv.messageCount} messages</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <p className="text-xs text-slate-400">No active conversations yet.</p>
                <button
                  onClick={onOpenAddCustomer}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Customer</span>
                </button>
              </div>
            )}
          </div>

          {/* Customer Health Overview */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Customer Health Overview</h3>
                <p className="text-xs text-slate-400">Calculated dynamically from issues, sentiment, and blockers</p>
              </div>
              <button
                onClick={() => onNavigateTab('customers')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Healthy</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-200 mt-2">{stats?.healthCounts?.healthy ?? 0}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Smooth operations & active</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">Needs Attention</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-200 mt-2">{stats?.healthCounts?.needsAttention ?? 0}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Pending reviews / commitments</p>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400">At Risk</span>
                  <Flame className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-2xl font-bold text-rose-200 mt-2">{stats?.healthCounts?.atRisk ?? 0}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Critical failures / unresolved blockers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Journey Timeline & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Demo Walkthrough Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/40 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
              <Bot className="w-4 h-4" />
              <span>Hackathon Live Demo Flow</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Experience the <strong>Remember → Understand → Detect → Act</strong> lifecycle in 3 minutes.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">1</span>
                <span>Add Customer: <strong>Alex Morgan (NovaTech)</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">2</span>
                <span>Thread 1: State security review requirement</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">3</span>
                <span>New Thread: Ask "Can we sign today?"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">4</span>
                <span>See recalled memory + recommended action!</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('conversations')}
              className="w-full mt-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
            >
              Start Live Demonstration
            </button>
          </div>

          {/* Recent Activity Timeline Feed */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Recent Customer Activity</h3>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.slice(0, 6).map((event) => (
                  <div key={event.id} className="relative pl-5 border-l border-slate-800 space-y-1">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-emerald-400"></span>
                    <p className="text-xs font-semibold text-slate-200">{event.title}</p>
                    <p className="text-[11px] text-slate-400 leading-snug">{event.description}</p>
                    <span className="text-[10px] text-slate-400 block">{formatTime(event.timestamp)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Activity will populate as customers interact.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
