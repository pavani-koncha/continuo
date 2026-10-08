import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Flame, 
  AlertTriangle, 
  BrainCircuit, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { Customer, InsightsData } from '../types';
import { api } from '../services/api';

interface InsightsViewProps {
  customers: Customer[];
  onSelectCustomer: (cust: Customer) => void;
  onNavigateTab: (tab: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  customers,
  onSelectCustomer,
  onNavigateTab
}) => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInsights();
      setInsights(data);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Support Intelligence Insights</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
            Real-time Aggregation
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          System-wide customer sentiment, memory clusters, and high-priority support bottlenecks
        </p>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Attention Required</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {insights?.customersNeedingAttention.length ?? 0}
          </p>
          <p className="text-[11px] text-amber-400/90 mt-1">Customers at risk or pending clearance</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Open Issues</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {insights?.openIssuesCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Active tickets & blockers</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Resolved Incidents</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {insights?.resolvedIssuesCount ?? 0}
          </p>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">Successfully closed</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Monitored</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {insights?.totalCustomers ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Across all enterprise accounts</p>
        </div>
      </div>

      {/* Grid: Customers Needing Attention vs Memory Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customers Needing Attention */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>High-Priority Customers Needing Attention</span>
            </h3>
            <span className="text-xs text-slate-400">
              {insights?.customersNeedingAttention.length} accounts
            </span>
          </div>

          {insights?.customersNeedingAttention && insights.customersNeedingAttention.length > 0 ? (
            <div className="space-y-3">
              {insights.customersNeedingAttention.map((c) => {
                const fullCust = customers.find(cust => cust.id === c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (fullCust) {
                        onSelectCustomer(fullCust);
                        onNavigateTab('customers');
                      }
                    }}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{c.name}</span>
                        <span className="text-[11px] text-slate-400">({c.company})</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          c.health === 'At Risk'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {c.health}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{c.healthReason}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              All active customers are currently evaluated as Healthy.
            </p>
          )}
        </div>

        {/* Memory Distribution by Category */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-emerald-400" />
            <span>Persistent Memory Category Distribution</span>
          </h3>

          {insights?.memoryCategoryCounts && Object.keys(insights.memoryCategoryCounts).length > 0 ? (
            <div className="space-y-3 pt-2">
              {Object.entries(insights.memoryCategoryCounts).map(([cat, count]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat}</span>
                    <span className="text-slate-400 font-mono">{count} items</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      style={{ width: `${Math.min(100, (count / 10) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No persistent memories recorded yet.</p>
          )}
        </div>
      </div>

      {/* Recent Memory Updates Feed */}
      <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Recent Hindsight Memory Updates</span>
          </h3>
          <button
            onClick={() => onNavigateTab('memories')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            <span>Open Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {insights?.recentMemories && insights.recentMemories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {insights.recentMemories.map((m) => (
              <div key={m.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {m.category}
                </span>
                <p className="text-xs text-slate-200 line-clamp-3">"{m.content}"</p>
                <span className="text-[10px] text-slate-500 block truncate">Source: {m.source}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">No recent memories recorded.</p>
        )}
      </div>
    </div>
  );
};
