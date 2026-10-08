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
  Clock,
  PieChart,
  Activity,
  Layers
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

  // 1. Health Distribution calculations for Donut Chart
  const healthData = insights?.healthDistribution || {
    healthy: customers.filter(c => c.health === 'Healthy').length,
    needsAttention: customers.filter(c => c.health === 'Needs Attention').length,
    atRisk: customers.filter(c => c.health === 'At Risk').length,
  };
  const totalHealth = healthData.healthy + healthData.needsAttention + healthData.atRisk;

  // Donut chart SVG segments
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const healthSlices = [
    { label: 'Healthy', count: healthData.healthy, color: '#10b981', bg: 'bg-emerald-500' },
    { label: 'Needs Attention', count: healthData.needsAttention, color: '#f59e0b', bg: 'bg-amber-500' },
    { label: 'At Risk', count: healthData.atRisk, color: '#f43f5e', bg: 'bg-rose-500' }
  ].map(item => {
    const ratio = totalHealth > 0 ? item.count / totalHealth : 0;
    const strokeDasharray = `${ratio * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += ratio;
    const percent = totalHealth > 0 ? Math.round(ratio * 100) : 0;
    return { ...item, strokeDasharray, strokeDashoffset, percent };
  });

  // 2. Issue Severity Breakdown
  const severityData = insights?.issueSeverityDistribution || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  const totalSeverity = severityData.critical + severityData.high + severityData.medium + severityData.low;
  const severityItems = [
    { label: 'Critical', count: severityData.critical, color: 'from-rose-500 to-red-600', text: 'text-rose-400', badge: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'High', count: severityData.high, color: 'from-orange-500 to-amber-600', text: 'text-orange-400', badge: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Medium', count: severityData.medium, color: 'from-amber-400 to-yellow-500', text: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Low', count: severityData.low, color: 'from-sky-400 to-blue-500', text: 'text-sky-400', badge: 'bg-sky-500/10 border-sky-500/20' },
  ];

  // 3. Support Activity Line Chart
  const activityData = insights?.activityOverTime || [
    { date: '', count: 0, label: 'Mon' },
    { date: '', count: 0, label: 'Tue' },
    { date: '', count: 0, label: 'Wed' },
    { date: '', count: 0, label: 'Thu' },
    { date: '', count: 0, label: 'Fri' },
    { date: '', count: 0, label: 'Sat' },
    { date: '', count: 0, label: 'Sun' },
  ];
  const maxActivity = Math.max(...activityData.map(d => d.count), 4);
  const chartWidth = 500;
  const chartHeight = 160;
  const paddingX = 35;
  const paddingY = 25;

  const points = activityData.map((d, i) => {
    const x = paddingX + (i / Math.max(activityData.length - 1, 1)) * (chartWidth - 2 * paddingX);
    const y = chartHeight - paddingY - (d.count / maxActivity) * (chartHeight - 2 * paddingY);
    return { x, y, count: d.count, label: d.label };
  });

  const linePath = points.length > 0
    ? points.reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  // 4. Open vs Resolved Issues Bar Chart
  const openCount = insights?.issuesStatusDistribution?.open ?? (insights?.openIssuesCount ?? 0);
  const resolvedCount = insights?.issuesStatusDistribution?.resolved ?? (insights?.resolvedIssuesCount ?? 0);
  const totalStatusIssues = openCount + resolvedCount;
  const resolutionRate = totalStatusIssues > 0 ? Math.round((resolvedCount / totalStatusIssues) * 100) : 100;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Support Intelligence Insights</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
            Live Application Data
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Dynamic metrics, customer health distributions, issue resolution velocity, and persistent memory analytics
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
            {openCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Active tickets & blockers</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Resolved Incidents</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {resolvedCount}
          </p>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">{resolutionRate}% resolution rate</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Accounts</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {insights?.totalCustomers ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Isolated workspace profiles</p>
        </div>
      </div>

      {/* DYNAMIC CHARTS GRID: 4 Required Real-Data Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Customer Health Pie / Donut Chart */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Customer Health Distribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{totalHealth} Total</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="#1e293b"
                  strokeWidth="14"
                  fill="transparent"
                />
                {totalHealth > 0 ? (
                  healthSlices.map((slice, idx) => (
                    slice.count > 0 && (
                      <circle
                        key={idx}
                        cx="70"
                        cy="70"
                        r={radius}
                        stroke={slice.color}
                        strokeWidth="14"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    )
                  ))
                ) : (
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#334155"
                    strokeWidth="14"
                    strokeDasharray="4 4"
                    fill="transparent"
                  />
                )}
              </svg>
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-white leading-none font-mono">{totalHealth}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Accounts</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-3 w-full sm:w-48">
              {healthSlices.map((slice) => (
                <div key={slice.label} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${slice.bg}`} />
                    <span className="text-xs text-slate-300 font-medium">{slice.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white font-mono">{slice.count}</span>
                    <span className="text-[10px] text-slate-500 ml-1">({slice.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CHART 2: Issue Breakdown Bar Chart */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Issue Breakdown by Severity</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{totalSeverity} Total Tickets</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {severityItems.map((item) => {
              const pct = totalSeverity > 0 ? Math.round((item.count / totalSeverity) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${item.text}`}>{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${item.badge}`}>
                        {item.count}
                      </span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700 ease-out`}
                      style={{ width: `${totalSeverity > 0 ? Math.max(pct, item.count > 0 ? 6 : 0) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 3: Support Activity Line Chart */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Support Activity Over Time</h3>
            </div>
            <span className="text-xs text-slate-400">Last 7 Days</span>
          </div>

          <div className="w-full pt-1">
            <div className="relative w-full aspect-[25/8] min-h-[150px]">
              <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);
                  return (
                    <line
                      key={idx}
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Area under curve */}
                {areaPath && (
                  <path d={areaPath} fill="url(#activityGradient)" />
                )}

                {/* Line */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points & Labels */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="#0f172a"
                      stroke="#a5b4fc"
                      strokeWidth="2"
                    />
                    {p.count > 0 && (
                      <text
                        x={p.x}
                        y={p.y - 8}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {p.count}
                      </text>
                    )}
                    <text
                      x={p.x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                    >
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* CHART 4: Open vs Resolved Issues Bar Chart */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Open vs Resolved Issues</h3>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">{resolutionRate}% Resolved</span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Comparison bar visual */}
            <div className="grid grid-cols-2 gap-4">
              {/* Open Issues Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-rose-900/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Open Issues</span>
                  </span>
                  <span className="text-lg font-bold text-white font-mono">{openCount}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-700 ease-out"
                    style={{ width: `${totalStatusIssues > 0 ? Math.max((openCount / totalStatusIssues) * 100, openCount > 0 ? 8 : 0) : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">
                  {totalStatusIssues > 0 ? Math.round((openCount / totalStatusIssues) * 100) : 0}% of all tickets
                </span>
              </div>

              {/* Resolved Issues Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolved</span>
                  </span>
                  <span className="text-lg font-bold text-white font-mono">{resolvedCount}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 ease-out"
                    style={{ width: `${totalStatusIssues > 0 ? Math.max((resolvedCount / totalStatusIssues) * 100, resolvedCount > 0 ? 8 : 0) : 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">
                  {resolutionRate}% cleared
                </span>
              </div>
            </div>

            {/* Comparative Stacked Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Total Ticket Lifecycle Ratio</span>
                <span className="font-mono">{totalStatusIssues} total tickets</span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-rose-500 transition-all duration-700"
                  style={{ width: `${totalStatusIssues > 0 ? (openCount / totalStatusIssues) * 100 : 0}%` }}
                  title={`Open: ${openCount}`}
                />
                <div
                  className="h-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${totalStatusIssues > 0 ? (resolvedCount / totalStatusIssues) * 100 : 100}%` }}
                  title={`Resolved: ${resolvedCount}`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Open ({openCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Resolved ({resolvedCount})
                </span>
              </div>
            </div>
          </div>
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
              {insights?.customersNeedingAttention.length ?? 0} accounts
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{c.name}</span>
                        <span className="text-[11px] text-slate-400">({c.company})</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          c.health === 'At Risk'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {c.health}
                        </span>
                        {c.priority && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            c.priority === 'Critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            c.priority === 'High' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                            c.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-slate-700/40 text-slate-400'
                          }`}>
                            {c.priority} Priority
                          </span>
                        )}
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
