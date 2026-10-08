import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Building, 
  Mail, 
  Package, 
  MessageSquare, 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  ArrowRight,
  Brain,
  Trash2
} from 'lucide-react';
import { Customer } from '../types';

interface CustomersProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer) => void;
  onOpenAddCustomer: () => void;
  onOpenCustomerDetail: (cust: Customer) => void;
  onOpenConversation: (customerId: string) => void;
  onOpenAskContinuo: (cust?: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenCustomerDetail,
  onOpenConversation,
  onOpenAskContinuo,
  onDeleteCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [healthFilter, setHealthFilter] = useState<'All' | 'Healthy' | 'Needs Attention' | 'At Risk'>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'Low' | 'Medium' | 'High' | 'Critical'>('All');

  const filtered = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.product.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHealth = healthFilter === 'All' || c.health === healthFilter;
    const matchesPriority = priorityFilter === 'All' || (c.priority || 'Medium') === priorityFilter;
    return matchesSearch && matchesHealth && matchesPriority;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Customer Intelligence Profiles</h2>
          <p className="text-xs text-slate-400 mt-1">Manage dynamic customer records with isolated persistent memory layers and customer priorities</p>
        </div>
        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Controls: Search and Filter Tabs */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#0f172a]/80 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, company, email, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Health Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Health:</span>
          {(['All', 'Healthy', 'Needs Attention', 'At Risk'] as const).map(status => (
            <button
              key={status}
              onClick={() => setHealthFilter(status)}
              className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all ${
                healthFilter === status
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Priority:</span>
          {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all ${
                priorityFilter === p
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(cust => (
            <div
              key={cust.id}
              className={`p-6 rounded-2xl bg-[#0f172a]/90 border transition-all duration-200 flex flex-col justify-between hover:shadow-xl ${
                selectedCustomer?.id === cust.id 
                  ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header: Name, Health & Priority Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
                        onClick={() => onOpenCustomerDetail(cust)}>
                      {cust.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cust.company}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      cust.health === 'Healthy'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : cust.health === 'Needs Attention'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {cust.health}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      cust.priority === 'Critical'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : cust.priority === 'High'
                        ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                        : cust.priority === 'Low'
                        ? 'bg-slate-700/30 text-slate-400 border-slate-700/50'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {cust.priority || 'Medium'} Priority
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.product}</span>
                  </div>
                </div>

                {/* Pending Tasks Count if Any */}
                {cust.followUpTasks && cust.followUpTasks.some(t => t.status === 'pending') && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
                    <span className="font-medium">Follow-up Tasks</span>
                    <span className="font-mono font-bold">
                      {cust.followUpTasks.filter(t => t.status === 'pending').length} pending
                    </span>
                  </div>
                )}

                {/* AI Summary Quote */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed mb-4">
                  <span className="text-emerald-400 font-semibold block text-[10px] uppercase mb-0.5">
                    {cust.conversationSummary ? 'AI Conversation Summary' : 'Living Intelligence Summary'}
                  </span>
                  {cust.conversationSummary || cust.summary || 'Customer profile created. Ready for conversational intake and persistent memory capture.'}
                </div>

                {/* Tags */}
                {cust.tags && cust.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {cust.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenCustomerDetail(cust)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                >
                  View Profile
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectCustomer(cust);
                      onOpenAskContinuo(cust);
                    }}
                    className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-all"
                    title="Ask Continuo about this customer"
                  >
                    <Brain className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      onSelectCustomer(cust);
                      onOpenConversation(cust.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl bg-[#0f172a]/60 border border-slate-800 space-y-4">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">No customers found</h3>
            <p className="text-xs text-slate-400">Create a dynamic customer profile to start tracking context and memory.</p>
          </div>
          <button
            onClick={onOpenAddCustomer}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      )}
    </div>
  );
};
