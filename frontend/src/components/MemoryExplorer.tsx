import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Search, 
  Filter, 
  Building, 
  Clock, 
  Tag, 
  ShieldCheck, 
  AlertTriangle, 
  Settings, 
  Server, 
  CheckCircle2, 
  Plus,
  RefreshCw
} from 'lucide-react';
import { Customer, MemoryItem, MemoryCategory } from '../types';
import { api } from '../services/api';

interface MemoryExplorerProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer) => void;
}

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Manual memory creation modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('Requirement');
  const [newSource, setNewSource] = useState('Manual Agent Entry');

  const categories = ['All', 'Requirement', 'Issue', 'Preference', 'Technical Context', 'Commitment', 'General Context'];

  useEffect(() => {
    loadMemories();
  }, [selectedCustomer?.id, selectedCategory]);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMemories(
        selectedCustomer?.id,
        selectedCategory !== 'All' ? selectedCategory : undefined
      );
      setMemories(data);
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newContent.trim()) return;

    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          content: newContent.trim(),
          category: newCategory,
          source: newSource
        })
      });
      setShowAddModal(false);
      setNewContent('');
      loadMemories();
    } catch (err) {
      console.error('Failed to add memory:', err);
    }
  };

  const filteredMemories = memories.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Hindsight Memory Explorer</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Explainable AI Layer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audit and inspect what Continuo persistently remembers across customer lifecycles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadMemories()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Refresh memories"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {selectedCustomer && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Memory</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Scope Controls */}
      <div className="p-4 rounded-2xl bg-[#0f172a]/90 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Customer Focus Switcher */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-medium">Customer Scope:</span>
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const c = customers.find(cust => cust.id === e.target.value);
                if (c) onSelectCustomer(c);
              }}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search memory text or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold uppercase">Category:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Grid */}
      {filteredMemories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map(mem => (
            <div
              key={mem.id}
              className="p-5 rounded-2xl bg-[#0f172a]/95 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    mem.category === 'Requirement'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : mem.category === 'Issue'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : mem.category === 'Technical Context'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : mem.category === 'Preference'
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {mem.category}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(mem.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs font-semibold text-white leading-relaxed">
                  "{mem.content}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="truncate max-w-[200px]">Source: {mem.source}</span>
                <span className="text-[10px] text-emerald-400 font-mono">Hindsight Synced</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl bg-[#0f172a]/60 border border-slate-800 space-y-3">
          <BrainCircuit className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No memories found</h3>
          <p className="text-xs text-slate-400">
            {selectedCustomer 
              ? `No memories logged for ${selectedCustomer.name} matching this filter.`
              : 'Select a customer to view their isolated memories.'}
          </p>
        </div>
      )}

      {/* Manual Memory Modal */}
      {showAddModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Record Memory for {selectedCustomer.name}</h3>
            <form onSubmit={handleAddMemory} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Memory Content</label>
                <textarea
                  required
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g., Customer requires SOC2 certification before trial signoff"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Requirement">Requirement</option>
                  <option value="Issue">Issue</option>
                  <option value="Preference">Preference</option>
                  <option value="Technical Context">Technical Context</option>
                  <option value="Commitment">Commitment</option>
                  <option value="General Context">General Context</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Source / Attribution</label>
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                >
                  Save to Hindsight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
