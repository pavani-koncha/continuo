import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Database, 
  Server, 
  Layers, 
  ShieldCheck, 
  RefreshCw,
  ExternalLink,
  Code
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsView: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await api.getSystemStatus();
      setStatus(res);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Settings & Engine Architecture</h2>
          <p className="text-xs text-slate-400 mt-1">Configure environment connections, Hindsight persistent memory, and Groq inference</p>
        </div>
        <button
          onClick={checkStatus}
          disabled={isChecking}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>Test Connections</span>
        </button>
      </div>

      {/* Engine Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Groq Card */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/95 border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Groq AI Inference Engine</h3>
                <p className="text-xs text-slate-400">High-speed LPU inference layer</p>
              </div>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${
              status?.groq?.configured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {status?.groq?.status || 'Active'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300 bg-slate-900/80 p-4 rounded-xl border border-slate-800 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Model:</span>
              <span className="text-emerald-400 font-bold">{status?.groq?.model || 'llama-3.3-70b-versatile'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Env Var:</span>
              <span className="text-slate-300">GROQ_API_KEY</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Structured Output:</span>
              <span className="text-slate-300">JSON schema with Next Best Action</span>
            </div>
          </div>
        </div>

        {/* Hindsight Card */}
        <div className="p-6 rounded-2xl bg-[#0f172a]/95 border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hindsight Persistent Memory</h3>
                <p className="text-xs text-slate-400">Long-term customer memory layer</p>
              </div>
            </div>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${
              status?.hindsight?.configured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {status?.hindsight?.status || 'Active'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300 bg-slate-900/80 p-4 rounded-xl border border-slate-800 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Endpoint:</span>
              <span className="text-indigo-400 truncate max-w-[240px]">{status?.hindsight?.endpoint || 'https://api.hindsight.vectorize.io'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Env Var:</span>
              <span className="text-slate-300">HINDSIGHT_API_KEY</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer Isolation:</span>
              <span className="text-emerald-400 font-bold">Strict Tenant Isolation Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="p-6 rounded-2xl bg-[#0f172a]/95 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Continuo Core System Architecture</span>
        </h3>
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed space-y-2">
          <p className="text-slate-400 font-bold">// INCOMING INTERACTION FLOW</p>
          <p className="text-emerald-400">Customer Message → Continuous Identification</p>
          <p className="text-indigo-400 pl-4">↳ Hindsight Vector Memory Retrieval (Filtered by Customer ID)</p>
          <p className="text-cyan-400 pl-8">↳ Context Augmentation (Profile + Relevant Memories + Thread History)</p>
          <p className="text-amber-400 pl-12">↳ Groq LLM Inference (Reasoning + Next Action Formulation)</p>
          <p className="text-purple-400 pl-16">↳ Memory Extraction & Write-back to Hindsight</p>
          <p className="text-white pl-20">↳ Output: Explainable Response + Recalled Memory + Next Best Action</p>
        </div>
      </div>

      {/* Deployment Reference */}
      <div className="p-6 rounded-2xl bg-[#0f172a]/95 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          <span>Deployment Topology (Vercel + Render)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Frontend (Vercel)</span>
            <p className="text-slate-400">Deploy root folder <code>frontend/</code> to Vercel. Set build command to <code>npm run build</code> and output to <code>dist</code>.</p>
            <p className="text-emerald-400 font-mono">Environment: VITE_API_URL=&lt;Render Backend URL&gt;</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Backend (Render)</span>
            <p className="text-slate-400">Deploy root folder <code>backend/</code> as a Node Web Service on Render. Build command: <code>npm install && npm run build</code>, Start: <code>npm start</code>.</p>
            <p className="text-emerald-400 font-mono">Environment: HINDSIGHT_API_KEY, GROQ_API_KEY, FRONTEND_URL</p>
          </div>
        </div>
      </div>
    </div>
  );
};
