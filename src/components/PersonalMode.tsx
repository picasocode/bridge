import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Language, TranscriptItem, Contact } from "../types";
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, 
  Send, Users, Globe, ArrowLeft, Play, Sparkles, RefreshCw
} from "lucide-react";

interface PersonalModeProps {
  primaryLanguage: Language;
  targetLanguage: Language;
  contacts: Contact[];
  onBackToModeSelect: () => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function PersonalMode({ 
  primaryLanguage, 
  targetLanguage, 
  contacts, 
  onBackToModeSelect 
}: PersonalModeProps) {
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "dialing" | "connected">("idle");
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);
  const [customText, setCustomText] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showDialpad, setShowDialpad] = useState<boolean>(false);
  const [dialNumber, setDialNumber] = useState<string>("");

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = primaryLanguage.voiceLangCode;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          handleUserSpeech(text);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [primaryLanguage]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  useEffect(() => {
    if (callStatus === "connected" && transcripts.length === 0 && activeContact) {
      const timeout = setTimeout(() => {
        const greetings: Record<string, string> = {
          "es": "Hola, gracias por llamarme. ¿Cómo estás hoy?",
          "fr": "Bonjour, merci de m'appeler. Comment ça va aujourd'hui ?",
          "ja": "こんにちは、お電話ありがとうございます。お元気ですか？",
          "de": "Hallo, danke für deinen Anruf. Wie geht es dir heute?",
          "it": "Ciao, grazie per avermi chiamato. Come stai oggi?",
          "ar": "مرحباً، شكراً على اتصالك بي. كيف حالك اليوم؟",
          "zh": "你好，谢谢给我打电话。今天过得怎么样？",
        };

        const targetCode = targetLanguage.code;
        const greetText = greetings[targetCode] || `Hello, glad we could connect!`;
        simulateRemoteSpeech(greetText);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [callStatus, activeContact]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input not supported in this browser viewport.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const speakText = (text: string, langCode: string) => {
    if (!isTtsEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS failed:", e);
    }
  };

  const handleTranslateRequest = async (text: string, from: string, to: string, sender: "user" | "remote") => {
    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang: from,
          targetLang: to,
          mode: "personal"
        })
      });
      const data = await response.json();
      
      const newTranscript: TranscriptItem = {
        id: Math.random().toString(36).substring(7),
        sender,
        originalText: text,
        translatedText: data.translation || text,
        timestamp: new Date()
      };

      setTranscripts(prev => [...prev, newTranscript]);

      if (sender === "user") {
        speakText(newTranscript.translatedText, targetLanguage.voiceLangCode);
      } else {
        speakText(newTranscript.translatedText, primaryLanguage.voiceLangCode);
      }

    } catch (err) {
      console.error(err);
      setTranscripts(prev => [...prev, {
        id: Math.random().toString(),
        sender,
        originalText: text,
        translatedText: `[Translation failed]: ${text}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleUserSpeech = (text: string) => {
    if (!text.trim()) return;
    handleTranslateRequest(text, primaryLanguage.name, targetLanguage.name, "user");
    setCustomText("");
  };

  const simulateRemoteSpeech = (nativeText: string) => {
    handleTranslateRequest(nativeText, targetLanguage.name, primaryLanguage.name, "remote");
  };

  const startCall = (contact: Contact) => {
    setActiveContact(contact);
    setCallStatus("dialing");
    setTranscripts([]);
    
    setTimeout(() => {
      setCallStatus("connected");
    }, 1500);
  };

  const endCall = () => {
    setCallStatus("idle");
    setActiveContact(null);
    window.speechSynthesis.cancel();
  };

  const handleCustomSend = () => {
    if (customText.trim()) {
      handleUserSpeech(customText);
    }
  };

  const handlePresetSelect = (text: string) => {
    handleUserSpeech(text);
  };

  const handleDialpadPress = (num: string) => {
    setDialNumber(prev => prev + num);
  };

  const handleDial = () => {
    if (!dialNumber) return;
    const tempContact: Contact = {
      id: "dialed",
      name: dialNumber,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      phoneNumber: dialNumber,
      preferredLanguage: targetLanguage.name,
      role: "Dialed Connection"
    };
    startCall(tempContact);
    setDialNumber("");
    setShowDialpad(false);
  };

  const englishDialogStarters = [
    "Hello! How have you been?",
    "I am calling to discuss our timeline.",
    "Did you receive the documents?",
    "Can you suggest a convenient time?",
    "Thank you for taking my call."
  ];

  const remoteStarters: Record<string, string[]> = {
    "es": [
      "¡Hola! Todo muy bien por aquí.",
      "Sí, revisemos los detalles hoy.",
      "¡Recibido! Lo leo ahora mismo.",
      "Cualquier hora por la tarde me va bien.",
      "Un placer hablar contigo hoy."
    ],
    "fr": [
      "Bonjour ! Tout va bien pour moi.",
      "Oui, discutons des détails aujourd'hui.",
      "Bien reçu ! Je le consulte à l'instant.",
      "L'après-midi me convient parfaitement.",
      "Ravi de pouvoir échanger avec vous."
    ]
  };

  const activeRemoteStarters = remoteStarters[targetLanguage.code] || [
    "Yes, everything is on track!",
    "Let us confirm those dates soon.",
    "Thank you for dialing in today.",
    "That sounds perfectly clear."
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 font-sans relative">
      {callStatus === "idle" ? (
        <div className="flex flex-col h-full bg-slate-50">
          {/* Top Header info */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200/80 bg-white">
            <button 
              onClick={onBackToModeSelect}
              className="flex items-center gap-1 text-slate-500 hover:text-purple-600 transition-colors text-xs font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>SETUP</span>
            </button>
            <div className="text-center">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded">
                Personal Call Style
              </span>
            </div>
            <div className="w-12"></div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-5 scrollbar-none">
            {/* Language Banner */}
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-purple-50 p-2 rounded-xl text-purple-600">
                  <Globe className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Language Bridge</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Me {primaryLanguage.flag} ({primaryLanguage.name}) ⇄ Contact {targetLanguage.flag} ({targetLanguage.name})
                  </p>
                </div>
              </div>
            </div>

            {/* Dialpad toggler */}
            {showDialpad ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manual Call Dial</span>
                  <button onClick={() => setShowDialpad(false)} className="text-xs font-bold text-purple-600 hover:text-purple-700">
                    Close
                  </button>
                </div>
                
                <div className="text-center text-lg font-bold py-1.5 bg-slate-50 rounded-xl text-slate-800 border border-slate-100 font-mono tracking-wider">
                  {dialNumber || "Enter Number..."}
                </div>

                <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(val => (
                    <button
                      key={val}
                      onClick={() => handleDialpadPress(val)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold py-1.5 rounded-xl transition-colors font-mono text-sm border border-slate-200/50"
                    >
                      {val}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setDialNumber("")}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs py-2 rounded-xl font-bold transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleDial}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 rounded-xl font-extrabold tracking-wide transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-purple-600/10"
                  >
                    <Phone className="w-3.5 h-3.5" /> Connect
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowDialpad(true)}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-center gap-2 text-slate-700 font-bold transition-all text-xs shadow-sm shadow-slate-100"
              >
                <Phone className="w-3.5 h-3.5 text-purple-600" />
                Dial Custom Phone Number
              </button>
            )}

            {/* Contacts Container */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-500" /> Professional Contacts
                </h4>
                <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-100">
                  {contacts.length} Connected
                </span>
              </div>

              <div className="space-y-2">
                {contacts.map(contact => (
                  <div
                    key={contact.id}
                    className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{contact.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {contact.phoneNumber} • <span className="text-purple-600 font-bold">{contact.preferredLanguage}</span>
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => startCall(contact)}
                      className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-md shadow-purple-600/10 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Call Interface */
        <div className="flex flex-col h-full bg-slate-50">
          {/* Header */}
          <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={activeContact?.avatar}
                  alt={activeContact?.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-none">{activeContact?.name}</h3>
                <span className="text-[9px] text-purple-600 font-medium">
                  {callStatus === "dialing" ? "Connecting line..." : `Call Connected • ${formatDuration(callDuration)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
              <span className="text-[10px]">{primaryLanguage.flag}</span>
              <span className="text-[10px] text-slate-400">⇄</span>
              <span className="text-[10px]">{targetLanguage.flag}</span>
              <span className="text-[9px] text-purple-700 font-bold uppercase">{targetLanguage.code}</span>
            </div>
          </div>

          {/* Transcript Panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                {callStatus === "dialing" ? (
                  <div className="space-y-3">
                    <div className="relative flex items-center justify-center w-20 h-20 mx-auto">
                      <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-ping" />
                      <div className="absolute inset-2 bg-purple-500/5 rounded-full animate-pulse" />
                      <img
                        src={activeContact?.avatar}
                        alt="Calling"
                        className="w-14 h-14 rounded-full object-cover border border-purple-600"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium animate-pulse">Contacting translation server...</p>
                  </div>
                ) : (
                  <div className="space-y-4 w-full max-w-xs">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center space-y-1.5 shadow-sm">
                      <Sparkles className="w-5 h-5 text-purple-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-800">Voice translation is active</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Say something in {primaryLanguage.name} using the mic button, or tap a preset query below to trigger direct audio translation.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left w-full">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">Meeting Call Starters</span>
                      <div className="grid grid-cols-1 gap-1">
                        {englishDialogStarters.map((starter, i) => (
                          <button
                            key={i}
                            onClick={() => handlePresetSelect(starter)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-xl text-[10px] text-slate-700 text-left transition-colors truncate shadow-sm"
                          >
                            💬 {starter}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {transcripts.map(t => (
                  <div
                    key={t.id}
                    className={`flex flex-col max-w-[85%] space-y-1 p-2.5 rounded-2xl shadow-sm ${
                      t.sender === "user"
                        ? "bg-purple-600 text-white ml-auto rounded-tr-none"
                        : "bg-white border border-slate-200 text-slate-800 mr-auto rounded-tl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${
                        t.sender === "user" ? "text-purple-200" : "text-slate-400"
                      }`}>
                        {t.sender === "user" ? "You" : activeContact?.name}
                      </span>
                      <button
                        onClick={() => speakText(t.translatedText, t.sender === "user" ? targetLanguage.voiceLangCode : primaryLanguage.voiceLangCode)}
                        className={`p-1 rounded ${
                          t.sender === "user" ? "hover:bg-purple-700 text-purple-100" : "hover:bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>

                    <p className={`text-[10px] opacity-75 line-through italic leading-none`}>
                      {t.originalText}
                    </p>
                    <p className="text-xs font-bold leading-normal">
                      {t.translatedText}
                    </p>
                  </div>
                ))}
                
                {/* Simulated partner replies during conversations */}
                {transcripts.length > 0 && transcripts[transcripts.length - 1].sender === "user" && (
                  <div className="pt-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Simulate Partner Reply</span>
                    <div className="flex gap-1 overflow-x-auto py-1 scrollbar-none justify-start">
                      {activeRemoteStarters.map((starter, i) => (
                        <button
                          key={i}
                          onClick={() => simulateRemoteSpeech(starter)}
                          className="bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] text-purple-600 font-bold shrink-0 shadow-sm"
                        >
                          🗣️ {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>
            )}
          </div>

          {/* Translation Spinner overlay */}
          {isTranslating && (
            <div className="px-4 py-2 bg-purple-50 border-t border-purple-100 flex items-center justify-between text-xs text-purple-700">
              <span className="flex items-center gap-1.5 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                Gemini Translating Voice Audio...
              </span>
              <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded font-black tracking-wider uppercase">
                AI ACTIVE
              </span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2.5 shadow-lg">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Type in ${primaryLanguage.name}...`}
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCustomSend()}
                className="flex-1 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleCustomSend}
                disabled={!customText.trim()}
                className="bg-purple-600 text-white p-2 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-40 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-around">
              {/* Voice TTS synthesis toggle */}
              <button
                onClick={() => setIsTtsEnabled(prev => !prev)}
                className={`p-2.5 rounded-full border transition-all ${
                  isTtsEnabled 
                    ? "bg-purple-50 border-purple-200 text-purple-600" 
                    : "bg-red-50 border-red-100 text-red-500"
                }`}
                title="Synthesize translation voices"
              >
                {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Mic trigger */}
              <button
                onClick={toggleListening}
                className={`p-3.5 rounded-full transition-all flex items-center justify-center relative ${
                  isListening
                    ? "bg-red-500 text-white shadow-lg animate-pulse"
                    : "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/15"
                }`}
              >
                {isListening ? (
                  <>
                    <span className="absolute -inset-1 rounded-full border-2 border-red-500 animate-ping opacity-70" />
                    <Mic className="w-4.5 h-4.5" />
                  </>
                ) : (
                  <Mic className="w-4.5 h-4.5" />
                )}
              </button>

              {/* Leave Call */}
              <button
                onClick={endCall}
                className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-md shadow-red-500/10 transition-colors"
                title="Disconnect"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
