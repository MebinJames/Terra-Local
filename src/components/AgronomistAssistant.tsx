import React, { useState } from 'react';
import { Send, BookOpen, Cpu, Sparkles, Search } from 'lucide-react';
import { FieldZone, OFFLINE_KNOWLEDGE_BASE } from '../data/agronomyData';
import { queryLocalAgronomistEngine } from '../services/localAgronomyEngine';

interface AgronomistAssistantProps {
  zones: FieldZone[];
  activeZoneId: string;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  role: 'farmer' | 'agronomist';
  text: string;
  timestamp: string;
  engineLabel: string;
  matchedArticles?: string[];
}

const QUICK_FARMER_QUESTIONS = [
  'Why are lower corn leaves turning yellow in a V-shape and how much nitrogen should I inject?',
  'When should I trigger drip irrigation based on soil tension kPa and VWC?',
  'How do I treat dark concentric ring spots (Early Blight) on Roma tomatoes organically?',
  'Soil EC salinity is rising above 2.3 dS/m — how do I calculate the leaching fraction?',
];

export const AgronomistAssistant: React.FC<AgronomistAssistantProps> = ({
  zones,
  activeZoneId,
  isOnline,
}) => {
  const activeZone = zones.find((z) => z.id === activeZoneId) || zones[0];
  const [questionInput, setQuestionInput] = useState('');
  const [useCloudGemini, setUseCloudGemini] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kbSearch, setKbSearch] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initial = queryLocalAgronomistEngine(
      'Give me an irrigation and nitrogen assessment for my current field zone.',
      zones,
      activeZoneId
    );
    return [
      {
        id: 'msg-init',
        role: 'agronomist',
        text: initial.answer,
        timestamp: 'Ready · Local Edge Core',
        engineLabel: initial.engine,
        matchedArticles: initial.matchedArticles,
      },
    ];
  });

  const handleAskQuestion = async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed) return;

    const farmerMsg: ChatMessage = {
      id: `farmer-${Date.now()}`,
      role: 'farmer',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      engineLabel: `Field Operator · ${activeZone.name}`,
    };

    setMessages((prev) => [...prev, farmerMsg]);
    setQuestionInput('');
    setIsLoading(true);

    // If user explicitly toggled Hybrid Cloud Gemini AND browser is online
    if (useCloudGemini && isOnline) {
      try {
        const res = await fetch('/api/agronomist/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            farmContext: activeZone,
          }),
        });
        const data = await res.json();
        if (res.ok && data.answer) {
          setMessages((prev) => [
            ...prev,
            {
              id: `agro-${Date.now()}`,
              role: 'agronomist',
              text: data.answer,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              engineLabel: data.engine || 'Gemini 3.8 Flash Cloud Synthesis',
            },
          ]);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fallback seamlessly to local engine
      }
    }

    // 100% Offline Local Edge Agronomic Engine
    window.setTimeout(() => {
      const localRes = queryLocalAgronomistEngine(trimmed, zones, activeZone.id);
      setMessages((prev) => [
        ...prev,
        {
          id: `agro-${Date.now()}`,
          role: 'agronomist',
          text: localRes.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          engineLabel: localRes.engine,
          matchedArticles: localRes.matchedArticles,
        },
      ]);
      setIsLoading(false);
    }, 120);
  };

  const filteredKb = OFFLINE_KNOWLEDGE_BASE.filter(
    (art) =>
      art.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
      art.category.toLowerCase().includes(kbSearch.toLowerCase()) ||
      art.keywords.some((k) => k.toLowerCase().includes(kbSearch.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 Columns: Interactive Agronomist Q&A Console */}
      <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between h-[640px]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-100">
              Field Agronomist AI Assistant
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Grounded in live telemetry from {activeZone.name} ({activeZone.crop})
            </p>
          </div>

          {/* Engine Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-slate-800 rounded-md">
            <button
              onClick={() => setUseCloudGemini(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                !useCloudGemini
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Local Edge Engine (Offline)</span>
            </button>
            <button
              onClick={() => setUseCloudGemini(true)}
              disabled={!isOnline}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                useCloudGemini && isOnline
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={!isOnline ? 'Unavailable while in Offline / Air-Gapped Mode' : 'Use Server-Side Gemini 3.8 Flash'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hybrid Cloud Gemini</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg border text-xs leading-relaxed ${
                msg.role === 'farmer'
                  ? 'bg-slate-900/90 border-slate-700 ml-8 text-slate-100'
                  : 'bg-[#0B0F17] border-slate-800 mr-4 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 mb-2 border-b border-slate-800/80">
                <span className={msg.role === 'agronomist' ? 'text-emerald-400 font-semibold' : 'text-cyan-400'}>
                  {msg.engineLabel}
                </span>
                <span>{msg.timestamp}</span>
              </div>
              <div className="whitespace-pre-line space-y-1.5">{msg.text}</div>
            </div>
          ))}
          {isLoading && (
            <div className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-emerald-400">
              Synthesizing soil physics & crop pathology response...
            </div>
          )}
        </div>

        {/* Quick Prompt Bar & Input */}
        <div className="pt-3 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {QUICK_FARMER_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleAskQuestion(q)}
                className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {q.slice(0, 48)}...
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion(questionInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask about crop symptoms, NPK dosing, irrigation kPa thresholds, or organic IPM..."
              className="flex-1 bg-[#0B0F17] border border-slate-800 focus:border-emerald-500 rounded-md px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !questionInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right 5 Columns: Embedded Offline Field Reference Corpus */}
      <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col h-[640px]">
        <div className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-display font-semibold text-slate-100">
                Offline Agronomic Field Manual
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {filteredKb.length} Indexed Protocols
            </span>
          </div>
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={kbSearch}
              onChange={(e) => setKbSearch(e.target.value)}
              placeholder="Filter local corpus by crop, symptom, or chemical (e.g. blight, nitrate, kPa)..."
              className="w-full bg-[#0B0F17] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
          {filteredKb.map((item) => (
            <div
              key={item.id}
              onClick={() => handleAskQuestion(`Explain protocol for: ${item.title}`)}
              className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-emerald-400">{item.category}</span>
                <span>{item.crops.join(' · ')}</span>
              </div>
              <h4 className="text-xs font-semibold text-slate-100 mt-1">{item.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                {item.quantitativeThresholds}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-cyan-400 font-mono">
                Click to synthesize with {activeZone.name} telemetry &rarr;
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
