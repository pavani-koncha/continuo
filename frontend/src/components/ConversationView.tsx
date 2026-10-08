import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  BrainCircuit, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  Bot, 
  User, 
  Info,
  ShieldAlert,
  Flame,
  Zap,
  CornerDownLeft,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Customer, Conversation, Message } from '../types';
import { api } from '../services/api';

interface ConversationViewProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer) => void;
  initialConversationId?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  initialConversationId
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      loadConversations(selectedCustomer.id);
    } else {
      setConversations([]);
      setActiveConversation(null);
    }
  }, [selectedCustomer?.id]);

  const loadConversations = async (customerId: string) => {
    setIsLoadingConversations(true);
    setErrorMessage(null);
    try {
      const list = await api.getConversations(customerId);
      setConversations(list);
      
      if (initialConversationId) {
        const found = list.find(c => c.id === initialConversationId);
        if (found) {
          setActiveConversation(found);
          return;
        }
      }
      
      if (list.length > 0) {
        setActiveConversation(list[0]);
      } else {
        // Automatically create a clean new conversation thread if none exist
        handleCreateNewConversation(customerId);
      }
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      setErrorMessage('Failed to connect to backend service. Please check server status.');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isSending]);

  // Create GENUINELY new conversation thread
  const handleCreateNewConversation = async (customerId?: string) => {
    const targetCustId = customerId || selectedCustomer?.id;
    if (!targetCustId) return;

    try {
      const newThread = await api.createConversation(targetCustId);
      setConversations(prev => [newThread, ...prev]);
      setActiveConversation(newThread);
      setInputMessage('');
      setErrorMessage(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: any) {
      console.error('Failed to create new conversation:', err);
      setErrorMessage('Could not initialize a new conversation thread.');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputMessage).trim();
    if (!messageText || !activeConversation || !selectedCustomer || isSending) return;

    setInputMessage('');
    setErrorMessage(null);
    setIsSending(true);

    // Optimistically append the customer message to the chat view immediately!
    const optimisticMessage: Message = {
      id: 'temp-' + Date.now(),
      conversationId: activeConversation.id,
      customerId: selectedCustomer.id,
      sender: 'customer',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    setActiveConversation(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, optimisticMessage]
      };
    });

    try {
      // Backend receives message, retrieves Hindsight memory, calls Groq, formulates Next Action, and writes back
      const res = await api.sendMessage(activeConversation.id, messageText);
      
      // Update with full authoritative conversation returned from backend
      setActiveConversation(res.conversation);
      
      // Update the thread in conversation list
      setConversations(prev => 
        prev.map(c => c.id === res.conversation.id ? res.conversation : c)
      );

      // Refresh customer status in background to update health badges
      api.getCustomer(selectedCustomer.id).then(updatedCust => {
        onSelectCustomer(updatedCust);
      }).catch(() => {});
    } catch (err: any) {
      console.error('Error sending message:', err);
      setErrorMessage(err.message || 'Failed to dispatch message to AI engine.');
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Demo presets for easy testing (both general knowledge & customer-specific)
  const demoPrompts = [
    { label: '1. Security Review Context', text: 'We need a security review before signing the contract.' },
    { label: '2. Contract Signing Query', text: 'Can we sign the contract today?' },
    { label: '3. General: Cloud Computing', text: 'What is cloud computing?' },
    { label: '4. General: Anger Control', text: 'How to control anger?' },
    { label: '5. General: Password Reset', text: 'How do I reset my password?' },
    { label: '6. AWS Infrastructure', text: 'Our production environment is running on AWS.' }
  ];

  if (!selectedCustomer) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <Bot className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Select a customer to view conversations</h2>
        <p className="text-xs text-slate-400">
          Continuo manages customer-isolated conversations with persistent Hindsight memory. Choose a customer from the directory or dropdown.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Sidebar: Customer Context & Conversation Threads */}
      <div className="w-80 border-r border-slate-800 bg-[#0c1220] flex flex-col shrink-0">
        {/* Customer Context Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Customer</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              selectedCustomer.health === 'Healthy'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : selectedCustomer.health === 'Needs Attention'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              ● {selectedCustomer.health}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white truncate">{selectedCustomer.name}</h3>
            <p className="text-xs text-slate-400 truncate">{selectedCustomer.company} · {selectedCustomer.product}</p>
          </div>
          
          {/* New Conversation Button */}
          <button
            onClick={() => handleCreateNewConversation()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all active:scale-[0.98]"
            title="Start a genuinely new conversation thread (clears chat, retains persistent Hindsight memory)"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Conversation</span>
          </button>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="px-1 text-[10px] uppercase font-bold text-slate-500">
            Threads ({conversations.length})
          </div>
          {conversations.map((conv, idx) => {
            const isActive = activeConversation?.id === conv.id;
            const lastMsg = conv.messages[conv.messages.length - 1];
            return (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConversation(conv);
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-slate-850 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold truncate ${isActive ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {conv.title}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {lastMsg ? lastMsg.text : 'Fresh thread — start conversation'}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                  <span>{conv.messages.length} messages</span>
                  {isActive && <span className="text-emerald-400 font-medium">Active Thread</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-[#090d16] overflow-hidden">
        {/* Thread Header with Prominent New Conversation Button */}
        <div className="h-16 px-6 border-b border-slate-800 bg-[#0f172a]/60 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white">{activeConversation?.title || 'Support Conversation'}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  Thread #{conversations.findIndex(c => c.id === activeConversation?.id) + 1 || 1}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Connected to Hindsight Persistent Memory · Customer-Isolated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCreateNewConversation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
              title="Start a new thread for this customer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Conversation</span>
            </button>
          </div>
        </div>

        {/* Error Banner (if any) */}
        {errorMessage && (
          <div className="bg-rose-950/40 border-b border-rose-900/50 px-6 py-2.5 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-semibold text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeConversation?.messages && activeConversation.messages.length > 0 ? (
            activeConversation.messages.map((msg, idx) => {
              const isContinuo = msg.sender === 'continuo';
              return (
                <div key={msg.id || idx} className={`flex gap-3 max-w-3xl ${isContinuo ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-md ${
                    isContinuo 
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20' 
                      : 'bg-slate-700 shadow-slate-900'
                  }`}>
                    {isContinuo ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Bubble Container */}
                  <div className={`space-y-2 max-w-2xl ${isContinuo ? '' : 'items-end'}`}>
                    
                    {/* EXPLAINABILITY: Recalled Memory Badge (shown above Continuo response) */}
                    {isContinuo && msg.recalledMemories && msg.recalledMemories.length > 0 && (
                      <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/40 text-xs text-indigo-200 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px] uppercase tracking-wider">
                          <BrainCircuit className="w-3.5 h-3.5" />
                          <span>Based on Previous Customer Memory</span>
                        </div>
                        {msg.recalledMemories.map(rm => (
                          <div key={rm.id} className="pl-3 border-l-2 border-indigo-500/60 text-xs">
                            <p className="font-semibold text-white">"{rm.content}"</p>
                            <p className="text-[10px] text-indigo-300/80">Source: {rm.source} ({rm.category})</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Main Message Bubble */}
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isContinuo 
                        ? 'bg-[#111c33] border border-slate-700/70 text-slate-100 shadow-md' 
                        : 'bg-emerald-600 text-white shadow-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* DIFFERENTIATING FEATURE: RECOMMENDED NEXT ACTION CARD */}
                    {isContinuo && msg.recommendedNextAction && (
                      <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-xs space-y-1 shadow-sm">
                        <div className="flex items-center justify-between text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Recommended Next Action</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            {msg.recommendedNextAction.urgency} urgency
                          </span>
                        </div>
                        <p className="font-semibold text-slate-100">
                          {msg.recommendedNextAction.action}
                        </p>
                        <p className="text-[11px] text-amber-200/80">
                          Rationale: {msg.recommendedNextAction.reason}
                        </p>
                      </div>
                    )}

                    {/* EXTRACTED & RETAINED MEMORY BADGE */}
                    {isContinuo && msg.extractedMemories && msg.extractedMemories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {msg.extractedMemories.map(em => (
                          <span key={em.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                            <BrainCircuit className="w-3 h-3 text-emerald-400" />
                            <span>Retained to Hindsight: {em.content}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-500 block px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3 py-16">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Fresh Conversation Thread</h4>
              <p className="text-xs text-slate-400">
                Continuo remembers all persistent requirements from previous conversations for <strong>{selectedCustomer.name}</strong>, even though this chat thread is completely fresh.
              </p>
            </div>
          )}
          
          {/* Live Typing & Memory Retrieval Indicator */}
          {isSending && (
            <div className="flex items-center gap-3 text-xs text-emerald-400 pl-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-[#111c33] border border-slate-700/70 text-slate-300 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-medium">Continuo is retrieving Hindsight memories & formulating next action...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Demo Fast-Action Presets */}
        <div className="px-6 py-2.5 bg-[#0c1220] border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Demo Prompts:</span>
          {demoPrompts.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(preset.text)}
              disabled={isSending}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 whitespace-nowrap transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Chat Box Input Bar */}
        <div className="p-4 bg-[#0c1220] border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-3"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={2}
                placeholder={`Type customer message as ${selectedCustomer.name}... (Press Enter to send, Shift+Enter for newline)`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                className="w-full resize-none bg-slate-900 border border-slate-800 text-xs text-slate-100 p-3 pr-12 rounded-xl focus:outline-none focus:border-emerald-500 disabled:opacity-50 leading-relaxed"
              />
              <span className="absolute right-3 bottom-3 text-[10px] text-slate-500 hidden sm:block">
                Enter ↵
              </span>
            </div>

            <button
              type="submit"
              disabled={isSending || !inputMessage.trim()}
              className="h-[52px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
