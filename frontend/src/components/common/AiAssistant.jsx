import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Bot, User as UserIcon, X, RefreshCw, AlertCircle, MessageSquare, Stethoscope } from 'lucide-react';
import { aiApi } from '../../api/aiApi';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errorMessage';
import farmerAvatar from '../../assets/ai_farmer_avatar.jpg';
import doctorAvatar from '../../assets/ai_doctor_avatar.jpg';

/**
 * Lightweight markdown renderer for AI chat messages.
 * Handles: ### headers, **bold**, *italic*, - bullet lists, and newlines.
 */
function MarkdownText({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip empty lines but preserve spacing
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Headers: ### → h3, ## → h2
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-ink-900 mt-1 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-ink-900 mt-2 mb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    // Bullet points: - item or * item
    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, '');
      elements.push(
        <div key={i} className="flex gap-1.5 ml-1 my-0.5">
          <span className="text-pasture-600 shrink-0 mt-0.5">•</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="my-0.5">
        {renderInline(line)}
      </p>
    );
  }

  return <>{elements}</>;
}

/** Renders inline markdown: **bold**, *italic* */
function renderInline(text) {
  if (!text) return text;
  // Split by **bold** and *italic* patterns
  const parts = [];
  // Match **bold** or *italic* segments
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // **bold**
      parts.push(<strong key={match.index} className="font-semibold text-ink-900">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

const LANGUAGE_LABELS = {
  en: 'English',
  kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  mr: 'मराठी',
};

const FARMER_PROMPTS = {
  en: [
    "Summarize this cow's health in simple words",
    "What health problems has this cow had?",
    "Is this cow safe to buy?",
    "What should I check before buying?",
  ],
  kn: [
    'ಈ ಹಸುವಿನ ಆರೋಗ್ಯ ಹೇಗಿದೆ?',
    'ಈ ಹಸುಗೆ ಏನೇನು ರೋಗಗಳು ಬಂದಿದ್ದವು?',
    'ಈ ಹಸುವನ್ನು ಕೊಳ್ಳಬಹುದೇ?',
    'ಲಸಿಕೆ ಹಾಕಿಸಿದ್ದಾರಾ?',
  ],
  ta: [
    'இந்த மாட்டின் ஆரோக்கியம் எப்படி?',
    'என்ன நோய்கள் வந்திருந்தது?',
    'இந்த மாட்டை வாங்கலாமா?',
    'தடுப்பூசி போட்டிருக்காங்களா?',
  ],
  hi: [
    'इस गाय की सेहत कैसी है?',
    'क्या बीमारियां आई हैं इसे?',
    'क्या यह गाय खरीदना सही है?',
    'टीकाकरण हुआ है क्या?',
  ],
  te: [
    'ఈ ఆవు ఆరోగ్యం ఎలా ఉంది?',
    'ఏమి వ్యాధులు వచ్చాయి?',
    'ఈ ఆవును కొనవచ్చా?',
    'టీకాలు వేయించారా?',
  ],
  mr: [
    'या गायीचे आरोग्य कसे आहे?',
    'कोणते आजार आले होते?',
    'ही गाय विकत घ्यायला चालेल का?',
    'लसीकरण झाले आहे का?',
  ],
};

const VET_PROMPTS = [
  'Differential diagnosis for bovine respiratory disease',
  'Treatment & antibiotic protocol for acute mastitis',
  "Summarize patient's previous clinical history",
  'Dosage & withdrawal period recommendations',
];

export default function AiAssistant({
  cattleId = null,
  cattleName = 'Cattle',
  mode = 'farmer',
  requestId = null,
  initialOpen = false,
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [showBubble, setShowBubble] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState(null);
  const chatEndRef = useRef(null);

  const isVet = mode === 'veterinarian' || user?.role === 'VETERINARIAN';
  const userLang = user?.preferredLanguage || 'en';
  const quickPrompts = isVet ? VET_PROMPTS : (FARMER_PROMPTS[userLang] || FARMER_PROMPTS.en);
  const langLabel = LANGUAGE_LABELS[userLang] || 'English';
  const firstName = user?.name ? user.name.split(' ')[0] : isVet ? 'Doctor' : 'Farmer';

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial summary on first open
  const fetchInitialSummary = async () => {
    if (hasInitialized) return;
    setHasInitialized(true);

    if (!cattleId) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: isVet
            ? `Namaste Dr. ${firstName}! I am your Veterinary Clinical Co-Pilot.\n\nI can assist you with evidence-based differential diagnoses, treatment protocols, antibiotic dosages, or reviewing patient cattle history.`
            : `Namaste ${firstName}! I am your CowCare AI Assistant.\n\nYou can ask me about verified cattle health records, vaccination schedules, disease prevention, or what to examine before buying cattle in the marketplace!`,
        },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await aiApi.getCowSummary({
        cattleId,
        question: '',
        mode,
        requestId,
      });

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: res.data.answer,
          isFallback: res.data.isFallback,
        },
      ]);
    } catch {
      setMessages([
        {
          id: 'intro',
          role: 'assistant',
          text: `Namaste ${firstName}! I am reviewing official CowCare records for **${cattleName}** (${cattleId}). What would you like to know about her medical timeline or vaccines?`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setShowBubble(false);
      if (!hasInitialized) fetchInitialSummary();
    }
  };

  const handleSend = async (customPrompt) => {
    const promptToSend = (customPrompt || inputQuery).trim();
    if (!promptToSend || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: promptToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);
    setLastFailedQuery(null);

    try {
      const res = await aiApi.getCowSummary({
        cattleId: cattleId || 'GENERAL_MARKETPLACE',
        question: promptToSend,
        mode,
        requestId,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: res.data.answer,
          isFallback: res.data.isFallback,
        },
      ]);
    } catch (err) {
      setLastFailedQuery(promptToSend);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: "I couldn't generate the summary right now. You can review the medical timeline directly.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside aria-label="CowCare AI Assistant" className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Floating Avatar & Speech Bubble */}
      {!isOpen && (
        <div className="flex items-end gap-3">
          {/* Speech Bubble */}
          {showBubble && (
            <div className="relative bg-white rounded-2xl p-3.5 shadow-xl border border-mist-200 max-w-[230px] space-y-2 animate-in fade-in slide-in-from-right-3 duration-300">
              <button
                onClick={() => setShowBubble(false)}
                className="absolute top-2 right-2 text-ink-400 hover:text-ink-700"
                title="Dismiss bubble"
              >
                <X className="w-3 h-3" />
              </button>
              <div>
                <p className="text-[11px] font-semibold text-ink-900 leading-tight">
                  {isVet ? `Dr. ${firstName}` : `Hi ${firstName}!`}
                </p>
                <p className="text-[11px] text-ink-600 leading-snug mt-0.5">
                  {isVet
                    ? "I'm your Clinical Co-Pilot. Ready for vitals assessment and clinical differentials."
                    : "I'm your CowCare AI Assistant. How can I help you today?"}
                </p>
              </div>
              <button
                onClick={handleToggle}
                className="w-full py-1.5 px-3 rounded-xl bg-pasture-700 hover:bg-pasture-800 text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isVet ? (
                  <>
                    <Stethoscope className="w-3.5 h-3.5 text-serum-100" />
                    <span>Clinical Co-Pilot</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-alert-500" />
                    <span>Ask me anything!</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Circular Trigger Button (Clinical Doctor Avatar for Vet, Farmer photo for Farmer) */}
          <button
            onClick={handleToggle}
            className={`group relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl hover:scale-105 transition-transform overflow-visible ${
              isVet
                ? 'bg-white border-2 border-serum-600'
                : 'bg-white border-2 border-pasture-700'
            }`}
            title={isVet ? 'Open Clinical AI Co-Pilot' : 'Open CowCare AI Assistant'}
          >
            <div className="w-full h-full rounded-full overflow-hidden">
              <img
                src={isVet ? doctorAvatar : farmerAvatar}
                alt={isVet ? 'Clinical Veterinary AI Co-Pilot' : 'CowCare AI Farmer Assistant'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = isVet ? '/ai_doctor_avatar.jpg' : '/ai_farmer_avatar.jpg';
                }}
              />
            </div>
            {/* Stethoscope Badge for Doctor / AI badge */}
            {isVet && (
              <span className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-serum-700 text-white border-2 border-white shadow-sm">
                <Stethoscope className="w-3.5 h-3.5" />
              </span>
            )}
            {/* Red Notification Badge */}
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-vital-600 text-white font-bold text-[10px] border-2 border-white shadow-xs">
              1
            </span>
          </button>
        </div>
      )}

      {/* Expandable Slide-over AI Panel */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[420px] max-h-[85vh] h-[580px] bg-mist-50/98 backdrop-blur-md rounded-3xl shadow-2xl border border-mist-300 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div
            className={`px-4 py-3.5 text-white flex items-center justify-between border-b ${
              isVet
                ? 'bg-gradient-to-r from-serum-900 to-serum-800 border-serum-700'
                : 'bg-pasture-800 border-pasture-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-alert-500/60 shrink-0 flex items-center justify-center">
                <img
                  src={isVet ? doctorAvatar : farmerAvatar}
                  alt={isVet ? 'Clinical AI' : 'CowCare AI'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = isVet ? '/ai_doctor_avatar.jpg' : '/ai_farmer_avatar.jpg';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-display font-bold text-white tracking-tight">
                    {isVet ? 'Clinical AI Co-Pilot' : 'CowCare AI Assistant'}
                  </h2>
                  <span
                    className={`text-[9px] font-sans uppercase font-bold px-1.5 py-0.5 rounded border ${
                      isVet
                        ? 'bg-serum-700 text-serum-100 border-serum-600'
                        : 'bg-pasture-700 text-pasture-100 border-pasture-600'
                    }`}
                  >
                    {isVet ? 'Clinical Mode' : 'Health Interpreter'}
                  </span>
                  {!isVet && userLang !== 'en' && (
                    <span className="text-[9px] font-sans uppercase font-bold px-1.5 py-0.5 rounded border bg-amber-alert-100 text-amber-alert-800 border-amber-alert-200">
                      {langLabel}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-mist-200 font-sans truncate max-w-[220px]">
                  {cattleId ? `${cattleName} (${cattleId})` : isVet ? 'Differential Diagnosis & Treatment Guidance' : 'Livestock Health Intelligence'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setHasInitialized(false);
                  fetchInitialSummary();
                }}
                className="p-1.5 text-pasture-200 hover:text-white hover:bg-pasture-700/50 rounded-xl transition-colors"
                title="Refresh summary"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggle}
                className="p-1.5 text-pasture-200 hover:text-white hover:bg-pasture-700/50 rounded-xl transition-colors"
                title="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Safety & Grounding Disclaimer */}
          <div className="bg-mist-100 px-3.5 py-1.5 border-b border-mist-200 text-[10px] text-ink-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-pasture-700 shrink-0" />
            <p className="leading-tight font-sans">
              Grounded in verified CowCare records. The AI does not prescribe medicines or replace physical vet examination.
            </p>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-pasture-700/40 shrink-0 mt-0.5 flex items-center justify-center">
                      {isVet ? (
                        <div className="w-full h-full bg-serum-700 text-white flex items-center justify-center">
                          <Stethoscope className="w-3.5 h-3.5 text-serum-100" />
                        </div>
                      ) : (
                        <img
                          src={farmerAvatar}
                          alt="AI"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/ai_farmer_avatar.jpg';
                          }}
                        />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed font-sans ${
                      isUser
                        ? 'bg-pasture-700 text-white rounded-br-xs shadow-xs'
                        : msg.isError
                        ? 'bg-vital-50 text-vital-700 border border-vital-200 rounded-bl-xs'
                        : 'bg-white text-ink-800 border border-mist-200 rounded-bl-xs shadow-xs whitespace-pre-line'
                    }`}
                  >
                    <MarkdownText text={msg.text} />

                    {msg.isError && lastFailedQuery && (
                      <button
                        onClick={() => handleSend(lastFailedQuery)}
                        className="mt-2 block px-2.5 py-1 rounded-md bg-vital-600 text-white text-[10px] font-semibold hover:bg-vital-700"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-pasture-100 text-pasture-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      {firstName.charAt(0)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading State per Spec 36 */}
            {isLoading && (
              <div className="flex gap-2.5 items-start text-xs">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-pasture-700/40 shrink-0 animate-pulse flex items-center justify-center">
                  {isVet ? (
                    <div className="w-full h-full bg-serum-700 text-white flex items-center justify-center">
                      <Stethoscope className="w-3.5 h-3.5 text-serum-100" />
                    </div>
                  ) : (
                    <img
                      src={farmerAvatar}
                      alt="AI"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/ai_farmer_avatar.jpg';
                      }}
                    />
                  )}
                </div>
                <div className="bg-white px-4 py-2.5 rounded-2xl border border-mist-200 text-ink-600 flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-pasture-700 animate-ping"></span>
                  <span className="text-[11px] font-medium">Reviewing CowCare records...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested Prompts per Spec 22 */}
          <div className="px-3 py-2 bg-mist-100 border-t border-mist-200 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                disabled={isLoading}
                onClick={() => handleSend(prompt)}
                className="text-[10px] font-sans whitespace-nowrap px-2.5 py-1.5 rounded-full bg-white text-ink-700 border border-mist-300 hover:border-pasture-600 hover:text-pasture-700 transition-colors shrink-0 shadow-xs disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-mist-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={isVet ? 'Ask clinical co-pilot...' : 'Ask about vaccines, mastitis, health...'}
              disabled={isLoading}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-mist-50 border border-mist-300 focus:outline-none focus:ring-1 focus:ring-pasture-600 focus:border-pasture-600 text-ink-900 placeholder:text-ink-400"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="p-2.5 rounded-xl bg-pasture-700 text-white hover:bg-pasture-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
