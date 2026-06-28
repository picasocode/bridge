import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Language, TranscriptItem } from "../types";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Globe, Sparkles, Send, 
  Volume2, Download, RefreshCw
} from "lucide-react";

interface BusinessModeProps {
  primaryLanguage: Language;
  targetLanguage: Language;
  onBackToModeSelect: () => void;
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  location: string;
  langCode: string;
  langFlag: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking?: boolean;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function BusinessMode({ 
  primaryLanguage, 
  targetLanguage, 
  onBackToModeSelect 
}: BusinessModeProps) {
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "host",
      name: "Julian V. (Host)",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      location: "Berlin (DE)",
      langCode: "de-DE",
      langFlag: "🇩🇪",
      isMuted: false,
      isVideoOn: true,
      isSpeaking: false
    },
    {
      id: "maki",
      name: "Maki Tanaka",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
      location: "Tokyo (JP)",
      langCode: "ja-JP",
      langFlag: "🇯🇵",
      isMuted: false,
      isVideoOn: true,
      isSpeaking: false
    },
    {
      id: "sarah",
      name: "Sarah Miller",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      location: "London (UK)",
      langCode: "en-US",
      langFlag: "🇬🇧",
      isMuted: true,
      isVideoOn: false,
      isSpeaking: false
    }
  ]);

  const [logs, setLogs] = useState<TranscriptItem[]>([
    {
      id: "log-1",
      sender: "remote",
      originalText: "Hello everyone, thank you for joining the quarterly review.",
      translatedText: "Hello everyone, thank you for joining the quarterly review.",
      timestamp: new Date(Date.now() - 60000 * 5)
    }
  ]);

  const [activeCaption, setActiveCaption] = useState<{
    senderName: string;
    senderLang: string;
    original: string;
    translated: string;
  } | null>({
    senderName: "Julian V.",
    senderLang: "German",
    original: "Hallo zusammen, vielen Dank, dass Sie an der vierteljährlichen Überprüfung teilnehmen.",
    translated: "Hello everyone, thank you for joining the quarterly review."
  });

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [myVideoOn, setMyVideoOn] = useState<boolean>(true);
  const [myMuteOn, setMyMuteOn] = useState<boolean>(false);
  const [meetingDuration, setMeetingDuration] = useState<number>(0);
  const [chatMessage, setChatMessage] = useState<string>("");
  
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logBottomRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = primaryLanguage.voiceLangCode;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = async (event: any) => {
        const text = event.results[event.results.length - 1][0].transcript;
        if (text) {
          handleUserSpeech(text);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech error", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [primaryLanguage]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      simulateParticipantSpeech();
    }, 12000);

    return () => clearInterval(interval);
  }, [targetLanguage]);

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Microphone recognition not supported. Try typing.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Start speech failed:", e);
      }
    }
  };

  const handleUserSpeech = async (text: string) => {
    if (!text.trim()) return;
    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang: primaryLanguage.name,
          targetLang: targetLanguage.name,
          mode: "business"
        })
      });
      const data = await response.json();
      
      const newLog: TranscriptItem = {
        id: Math.random().toString(),
        sender: "user",
        originalText: text,
        translatedText: data.translation || text,
        timestamp: new Date()
      };

      setLogs(prev => [...prev, newLog]);
      setActiveCaption({
        senderName: "You",
        senderLang: primaryLanguage.name,
        original: text,
        translated: data.translation || text
      });

      const utterance = new SpeechSynthesisUtterance(data.translation);
      utterance.lang = targetLanguage.voiceLangCode;
      window.speechSynthesis.speak(utterance);

    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const simulateParticipantSpeech = async () => {
    const pool = participants.filter(p => !p.isMuted);
    if (pool.length === 0) return;
    const speaker = pool[Math.floor(Math.random() * pool.length)];

    setParticipants(prev => prev.map(p => p.id === speaker.id ? { ...p, isSpeaking: true } : p));

    const dialoguePool: Record<string, string[]> = {
      "host": [
        "Wir müssen die Roadmap für das dritte Quartal anpassen.",
        "Können Sie bitte die Zahlen für das Budget bestätigen?",
        "Der Kunde ist mit den aktuellen Fortschritten sehr zufrieden."
      ],
      "maki": [
        "新しいプロジェクトのスケジュールについて、来週の月曜日に最終確認を行いたいと考えています。",
        "このタスクの優先度を上げてもよろしいでしょうか？",
        "デザインのプロトタイプはすでに完成しております。"
      ],
      "sarah": [
        "That is impressive Maki. What about the budget constraints?",
        "We need to focus on delivering the core metrics this week.",
        "Could you clarify the delivery dates for the API integration?"
      ]
    };

    const phrases = dialoguePool[speaker.id] || ["Can we align on this meeting's agenda?"];
    const text = phrases[Math.floor(Math.random() * phrases.length)];

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang: "Auto-detect",
          targetLang: primaryLanguage.name,
          mode: "business"
        })
      });
      const data = await response.json();

      const newLog: TranscriptItem = {
        id: Math.random().toString(),
        sender: "remote",
        originalText: text,
        translatedText: data.translation || text,
        timestamp: new Date()
      };

      setLogs(prev => [...prev, newLog]);
      setActiveCaption({
        senderName: speaker.name,
        senderLang: speaker.id === "host" ? "German" : speaker.id === "maki" ? "Japanese" : "English",
        original: text,
        translated: data.translation || text
      });

    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setParticipants(prev => prev.map(p => p.id === speaker.id ? { ...p, isSpeaking: false } : p));
      }, 3000);
    }
  };

  const handleManualSend = () => {
    if (chatMessage.trim()) {
      handleUserSpeech(chatMessage);
      setChatMessage("");
    }
  };

  const exportLogs = () => {
    const textContent = logs.map(l => {
      const sender = l.sender === "user" ? "YOU" : "PARTICIPANT";
      return `[${l.timestamp.toLocaleTimeString()}] ${sender}:\nOriginal: ${l.originalText}\nTranslation: ${l.translatedText}\n-------------------`;
    }).join("\n");

    const element = document.createElement("a");
    const file = new Blob([textContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `NeuTTS-Meet-Transcript-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-1 bg-slate-50 relative flex-col overflow-hidden h-full">
      {/* Central Video Grid */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto relative h-full">
        {/* Top bar info */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-slate-800">Session: {formatDuration(meetingDuration)}</span>
          </div>
          <div className="flex gap-1.5">
            <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-200 font-bold">
              In: {primaryLanguage.name}
            </span>
            <span className="text-[9px] bg-purple-50 text-purple-700 px-2 py-1 rounded-lg border border-purple-100 font-bold">
              Out: {targetLanguage.name}
            </span>
          </div>
        </div>

        {/* Video stream container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1 min-h-[220px]">
          {/* My Video View */}
          <div className="bg-white rounded-2xl relative overflow-hidden border border-slate-200 flex flex-col items-center justify-center shadow-sm group">
            {myVideoOn ? (
              <div className="absolute inset-0 bg-slate-100/30 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-14 h-14 rounded-full bg-purple-50 border-2 border-purple-600 flex items-center justify-center text-purple-600 font-bold text-sm mb-1.5 shadow-sm">
                    YOU
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Camera Connected</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-1.5 mx-auto">
                  <VideoOff className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400">Video Turned Off</p>
              </div>
            )}
            
            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-white tracking-wide border border-white/5 shadow-sm">
              Alex Chen (You)
            </div>
            
            {isListening && (
              <div className="absolute top-3 right-3 bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                🎙️ Mic Active
              </div>
            )}
          </div>

          {/* Partner Streams */}
          {participants.map(p => (
            <div 
              key={p.id}
              className={`bg-white rounded-2xl relative overflow-hidden flex flex-col items-center justify-center shadow-sm transition-all ${
                p.isSpeaking ? "ring-2 ring-purple-600 border-purple-500/20" : "border border-slate-200"
              }`}
            >
              {p.isVideoOn ? (
                <div className="text-center relative z-10 p-4">
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className={`w-14 h-14 rounded-full object-cover mx-auto mb-2.5 transition-transform ${
                      p.isSpeaking ? "border-2 border-purple-600 scale-105" : "border border-slate-200"
                    }`}
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-slate-800 font-bold text-xs">{p.name}</p>
                  
                  {p.isSpeaking && (
                    <div className="flex justify-center gap-0.5 mt-2">
                      <div className="w-0.5 h-3 bg-purple-600 rounded-full animate-pulse" />
                      <div className="w-0.5 h-3 bg-purple-600 rounded-full animate-pulse delay-75" />
                      <div className="w-0.5 h-3 bg-purple-600 rounded-full animate-pulse delay-150" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-1.5 border border-slate-200">
                    <span className="text-xs font-bold text-slate-500">{p.name.substring(0,2)}</span>
                  </div>
                  <p className="text-slate-800 font-bold text-xs">{p.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Video Disabled</p>
                </div>
              )}

              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-white tracking-wide border border-white/5 shadow-sm flex items-center gap-1.5">
                <span>{p.langFlag}</span>
                <span>{p.location}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Captions Area */}
        <AnimatePresence>
          {activeCaption && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md max-w-xl mx-auto w-full relative space-y-2"
            >
              <button 
                onClick={() => setActiveCaption(null)}
                className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
              
              <div className="flex gap-2.5 items-start">
                <span className="text-slate-500 font-extrabold text-[9px] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                  {activeCaption.senderName}
                </span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {activeCaption.original}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2.5 items-start">
                <span className="text-purple-700 font-extrabold text-[9px] uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-100 shrink-0">
                  Translation
                </span>
                <p className="text-purple-900 font-bold text-xs leading-relaxed italic">
                  "{activeCaption.translated}"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Actions Panel */}
        <div className="h-16 flex items-center justify-center gap-3.5 border-t border-slate-200/80 pt-3 mt-auto">
          <button 
            onClick={toggleListening}
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all shadow-sm ${
              isListening 
                ? "bg-red-500 border-red-500 text-white animate-pulse" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            title="Mic Stream Switch"
          >
            <Mic className="w-4.5 h-4.5" />
          </button>

          <button 
            onClick={() => setMyVideoOn(p => !p)}
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all shadow-sm ${
              myVideoOn 
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50" 
                : "bg-red-50 border-red-200 text-red-500"
            }`}
            title="Video Stream Switch"
          >
            {myVideoOn ? <Video className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
          </button>

          <button 
            onClick={onBackToModeSelect}
            className="px-6 h-11 rounded-full bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs shadow-md shadow-red-500/10 uppercase tracking-wider flex items-center gap-1.5"
          >
            <PhoneOff className="w-4 h-4" /> Disconnect
          </button>

          <button 
            onClick={simulateParticipantSpeech}
            className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white border border-purple-500 shadow-sm"
            title="Simulate Partner Talk"
          >
            <Globe className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Sidebar Logs Section */}
      <aside className="w-full bg-white border-t border-slate-200 flex flex-col h-[220px] shrink-0">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Meeting Logs</h2>
          </div>
          <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-100 uppercase tracking-wider">
            Secured
          </span>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {logs.map(log => (
            <div key={log.id} className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className={`text-[9px] font-black uppercase tracking-wider ${
                  log.sender === "user" ? "text-purple-600" : "text-slate-500"
                }`}>
                  {log.sender === "user" ? "Alex Chen (You)" : "PARTICIPANT"}
                </span>
                <span className="text-[8px] text-slate-400">
                  {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl border border-slate-150 bg-slate-50/50 text-[11px] space-y-1 shadow-sm">
                <p className="text-slate-400 italic text-[8px]">Original</p>
                <p className="text-slate-700 font-medium leading-relaxed">{log.originalText}</p>
                
                <div className="mt-1.5 pt-1.5 border-t border-slate-200/60">
                  <p className="text-slate-400 italic text-[8px]">Translated</p>
                  <p className="text-purple-700 font-bold leading-relaxed">{log.translatedText}</p>
                </div>
              </div>
            </div>
          ))}

          {isTranslating && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs italic py-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-75" />
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-150" />
              <span className="text-[10px]">Real-time translating...</span>
            </div>
          )}

          <div ref={logBottomRef} />
        </div>

        {/* Text translation box inside sidebar */}
        <div className="p-2.5 border-t border-slate-100 bg-slate-50 space-y-2 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Send translated text..."
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleManualSend()}
              className="flex-1 bg-white border border-slate-200 text-[11px] text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 shadow-sm"
            />
            <button
              onClick={handleManualSend}
              disabled={!chatMessage.trim()}
              className="bg-purple-600 text-white p-2 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-40 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <button 
            onClick={exportLogs}
            className="w-full py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-bold text-slate-600 hover:bg-slate-100 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export Logs (TXT)
          </button>
        </div>
      </aside>
    </div>
  );
}
