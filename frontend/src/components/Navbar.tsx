import React from 'react';
import { Sparkles, MessageSquare, Brain, HelpCircle, ChevronDown, CheckCircle2, LogOut, User as UserIcon } from 'lucide-react';
import { Customer, User } from '../types';

interface NavbarProps {
  currentTab: string;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer) => void;
  onOpenAskContinuo: () => void;
  onOpenAddCustomer: () => void;
  statusInfo: any;
  currentUser?: User | null;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onOpenAskContinuo,
  onOpenAddCustomer,
  statusInfo,
  currentUser,
  onSignOut
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Intelligence Dashboard';
      case 'customers': return 'Customer Directory & Profiles';
      case 'conversations': return 'Active Conversations & Support Memory';
      case 'memories': return 'Hindsight Memory Explorer';
      case 'insights': return 'Customer Support Insights';
      case 'settings': return 'System Settings & Architecture';
      default: return 'Continuo Support Agent';
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0c1220]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">{getTabTitle()}</h2>
          <p className="text-[11px] text-slate-400">
            {selectedCustomer ? (
              <span>Focused on <strong className="text-slate-200">{selectedCustomer.name}</strong> ({selectedCustomer.company})</span>
            ) : (
              <span>Customer intelligence platform</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Customer Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const cust = customers.find(c => c.id === e.target.value);
              if (cust) onSelectCustomer(cust);
            }}
            className="appearance-none bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
          >
            {customers.length === 0 ? (
              <option value="">No customers yet</option>
            ) : (
              customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.company}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Ask Continuo Trigger */}
        <button
          onClick={onOpenAskContinuo}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95"
          title="Ask questions grounded strictly in customer memory"
        >
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ask Continuo</span>
        </button>

        {/* User Profile Pill in Navbar */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="hidden sm:inline font-bold truncate max-w-[120px]">{currentUser.name}</span>
              <span className="text-slate-400 text-[10px] hidden md:inline truncate max-w-[140px]">({currentUser.email})</span>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* System Health Indicators */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo?.groq?.configured ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span>Groq</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo?.hindsight?.configured ? 'bg-emerald-400' : 'bg-emerald-400'}`}></span>
            <span>Hindsight</span>
          </div>
        </div>
      </div>
    </header>
  );
};
