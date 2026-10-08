import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  BrainCircuit, 
  BarChart3, 
  Settings, 
  Plus, 
  Sparkles,
  Bot,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { Customer, User } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAddCustomer: () => void;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer) => void;
  currentUser?: User | null;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAddCustomer,
  customers,
  selectedCustomer,
  onSelectCustomer,
  currentUser,
  onSignOut
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users, badge: customers.length },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'memories', label: 'Memory Explorer', icon: BrainCircuit },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'CO';
  };

  return (
    <aside className="w-64 bg-[#0c1220] border-r border-slate-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/20 text-white font-bold">
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold tracking-tight text-white">CONTINUO</h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Memory-Powered Support</p>
            </div>
          </div>
        </div>

        {/* Quick Add Customer CTA */}
        <div className="p-3">
          <button
            onClick={onOpenAddCustomer}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800/90 text-emerald-400 shadow-sm border border-slate-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Active Customer Context & Logged-in User Profile */}
      <div className="border-t border-slate-800/80 bg-slate-900/40 space-y-2 p-3">
        {/* Active Customer Context Widget */}
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 px-2 mb-1.5 flex items-center justify-between">
            <span>Customer Context</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Isolated
            </span>
          </div>
          {selectedCustomer ? (
            <div className="p-2.5 rounded-xl bg-slate-850/90 border border-slate-800 flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="text-xs font-semibold text-white truncate">{selectedCustomer.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{selectedCustomer.company}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                selectedCustomer.health === 'Healthy'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : selectedCustomer.health === 'Needs Attention'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {selectedCustomer.health}
              </span>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-slate-850/60 border border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-400">No customer selected</p>
            </div>
          )}
        </div>

        {/* Logged In User Profile Widget */}
        {currentUser && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {getInitials(currentUser.name, currentUser.email)}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate font-mono">{currentUser.email}</p>
              </div>
            </div>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                title="Sign Out of Continuo"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
