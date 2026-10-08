import React, { useState } from 'react';
import { 
  X, 
  Brain, 
  Send, 
  Sparkles, 
  BrainCircuit, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Customer, RecalledMemory } from '../types';
import { api } from '../services/api';

interface AskContinuoModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const AskContinuoModal: React.FC<AskContinuoModalProps> = ({
  isOpen,
  onClose,
  customer
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [citedMemories, setCitedMemories] = useState<RecalledMemory[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    'What is blocking this customer from signing?',
    'What are this customer\'s biggest concerns?',
    'What issues are still unresolved?',
    'What environment are they using?',
    'What should I do next with this customer?'
  ];

  const handleAsk = async (qToSend?: string) => {
    const q = (qToSend || question).trim();
    if (!q || !customer || isAsking) return;

    setQuestion(q);
    setIsAsking(true);
    setAnswer(null);
    setCitedMemories([]);

    try {
      const res = await api.askContinuo(customer.id, q);
      setAnswer(res.answer);
      setCitedMemories(res.citedMemories || []);
    } catch (err: any) {
      console.error('Ask Continuo error:', err);
      setAnswer(`Error answering query: ${err.message || 'Please verify backend connectivity'}`);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ask Continuo</h2>
              <p className="text-xs text-slate-400">
                Support intelligence query strictly scoped to <strong className="text-indigo-300">{customer?.name}</strong> ({customer?.company})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Question Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Suggested Inquiries:</span>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((qq, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(qq)}
                disabled={isAsking}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 border border-slate-800 transition-all text-left"
              >
                {qq}
              </button>
            ))}
          </div>
        </div>

        {/* Form input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={`Ask anything about ${customer?.name || 'this customer'}...`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isAsking}
            className="flex-1 bg-slate-900 border border-slate-800 text-xs text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>

        {/* Loading state */}
        {isAsking && (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-indigo-400">
            <BrainCircuit className="w-6 h-6 animate-spin" />
            <span className="text-xs font-medium">Synthesizing customer memory and unresolved issues...</span>
          </div>
        )}

        {/* Answer section */}
        {answer && !isAsking && (
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs text-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px] uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Continuo Intelligence Answer</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>

            {/* Cited Memories */}
            {citedMemories && citedMemories.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cited Memory Records:</span>
                <div className="space-y-1">
                  {citedMemories.map(cm => (
                    <div key={cm.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                      <span className="truncate pr-2">"{cm.content}"</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0 font-medium">
                        {cm.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
