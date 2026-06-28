import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Language, LANGUAGES } from "../types";
import { 
  Mic, Volume2, VolumeX, ArrowLeftRight, Settings, 
  HelpCircle, Sparkles, RefreshCw, AlertCircle, ArrowLeft
} from "lucide-react";

interface LiveVoiceModeProps {
  primaryLanguage: Language;
  targetLanguage: Language;
  onLanguageChange: (primary: Language, target: Language) => void;
  onBackToModeSelect: () => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function LiveVoiceMode({
  primaryLanguage,
  targetLanguage,
  onLanguageChange,
  onBackToModeSelect
}: LiveVoiceModeProps) {
  const [activeSpeaker, setActiveSpeaker] = useState<"none" | "primary" | "target">("none");
  const [statusText, setStatusText] = useState<string>("Tap a microphone below to start speaking");
  const [lastOriginal, setLastOriginal] = useState<string>("");
  const [lastTranslation, setLastTranslation] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isSpeakingOut, setIsSpeakingOut] = useState<boolean>(false);
  const [volumeEnabled, setVolumeEnabled] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const activeLangRef = useRef<Language | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setRecognitionError("Web Speech API is not fully supported in this browser environment. Try using Google Chrome or Microsoft Edge.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setStatusText(`Listening to ${activeLangRef.current?.name}... Speak now!`);
      setRecognitionError(null);
    };

    rec.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      if (text) {
        handleTranscribedSpeech(text);
      }
    };

    rec.onerror = (e: any) => {
      console.error("Speech Recognition Error:", e);
      if (e.error === "not-allowed") {
        setRecognitionError("Microphone access denied. Please allow microphone permissions.");
      } else if (e.error === "no-speech") {
        setRecognitionError("No speech detected. Please try again.");
      } else {
        setRecognitionError(`Recognition error: ${e.error}`);
      }
      resetState();
    };

    rec.onend = () => {
      // If we didn't start translating, return to idle
      if (!isTranslating && !isSpeakingOut) {
        setActiveSpeaker("none");
        setStatusText("Ready. Tap a microphone to talk");
      }
    };

    recognitionRef.current = rec;

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis.cancel();
    };
  }, [isTranslating, isSpeakingOut]);

  const resetState = () => {
    setActiveSpeaker("none");
    setIsTranslating(false);
    setIsSpeakingOut(false);
    setStatusText("Ready. Tap a microphone to talk");
  };

  const startListening = (type: "primary" | "target") => {
    if (!recognitionRef.current) {
      setRecognitionError("Speech Recognition is not available.");
      return;
    }

    // Cancel any active speech synthesis
    window.speechSynthesis.cancel();
    setIsSpeakingOut(false);

    const activeLang = type === "primary" ? primaryLanguage : targetLanguage;
    activeLangRef.current = activeLang;
    setActiveSpeaker(type);
    setLastOriginal("");
    setLastTranslation("");
    setRecognitionError(null);

    try {
      recognitionRef.current.abort(); // stop any active recognition first
      recognitionRef.current.lang = activeLang.voiceLangCode;
      recognitionRef.current.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setRecognitionError("Microphone is busy. Please try again.");
      setActiveSpeaker("none");
    }
  };

  const handleTranscribedSpeech = async (text: string) => {
    if (!text.trim()) {
      resetState();
      return;
    }

    setLastOriginal(text);
    setIsTranslating(true);
    setStatusText("Translating your voice...");

    const sourceLang = activeSpeaker === "primary" ? primaryLanguage : targetLanguage;
    const destLang = activeSpeaker === "primary" ? targetLanguage : primaryLanguage;

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang: sourceLang.name,
          targetLang: destLang.name,
          mode: "personal"
        })
      });

      const data = await response.json();
      const translationResult = data.translation || text;
      
      setLastTranslation(translationResult);
      setIsTranslating(false);

      if (volumeEnabled) {
        speakTranslation(translationResult, destLang.voiceLangCode);
      } else {
        setStatusText("Translation complete (Audio Muted)");
        setActiveSpeaker("none");
      }

    } catch (err) {
      console.error("Voice translation error:", err);
      setRecognitionError("Translation server error. Using fallback.");
      setLastTranslation(text);
      setIsTranslating(false);
      setActiveSpeaker("none");
    }
  };

  const speakTranslation = (text: string, voiceCode: string) => {
    setIsSpeakingOut(true);
    setStatusText("Speaking translation out loud...");

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceCode;
      utterance.rate = speechRate;

      utterance.onend = () => {
        setIsSpeakingOut(false);
        setActiveSpeaker("none");
        setStatusText("Translation finished. Ready for next speaker.");
      };

      utterance.onerror = (e) => {
        console.error("Speech Synthesis Error:", e);
        setIsSpeakingOut(false);
        setActiveSpeaker("none");
        setStatusText("Ready. Tap a microphone to talk");
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis failed:", e);
      setIsSpeakingOut(false);
      setActiveSpeaker("none");
      setStatusText("Ready. Tap a microphone to talk");
    }
  };

  const swapLanguages = () => {
    onLanguageChange(targetLanguage, primaryLanguage);
    setLastOriginal("");
    setLastTranslation("");
    setRecognitionError(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white font-sans p-6 justify-between select-none overflow-y-auto">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <button 
          onClick={onBackToModeSelect}
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs font-black uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4 text-purple-400" />
          <span>Exit</span>
        </button>
        <div className="flex items-center gap-1.5 bg-purple-950/80 border border-purple-500/20 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
            Live Voice Engine
          </span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-xl border transition-all ${
            showSettings 
              ? "bg-purple-900 border-purple-500 text-white" 
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          }`}
          title="Voice Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Voice Settings drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 space-y-3 shrink-0"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
              <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider">Audio playback settings</span>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-[10px] font-bold text-white/50 hover:text-white"
              >
                Hide
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-white/80">
              <div className="flex items-center justify-between">
                <span>Automatic TTS Audio Speech</span>
                <button
                  onClick={() => setVolumeEnabled(!volumeEnabled)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    volumeEnabled 
                      ? "bg-purple-600/30 border-purple-500 text-purple-300" 
                      : "bg-red-950/40 border-red-900/50 text-red-400"
                  }`}
                >
                  {volumeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-white/60">
                  <span>Voice Playback Rate</span>
                  <span className="font-mono text-purple-300 font-bold">{speechRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language Bridge Display */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center justify-between shadow-lg my-3 shrink-0">
        <div className="flex flex-col items-center flex-1">
          <span className="text-3xl filter drop-shadow">{primaryLanguage.flag}</span>
          <span className="text-[11px] font-black uppercase tracking-wider text-white mt-1.5">{primaryLanguage.name}</span>
          <span className="text-[9px] text-white/50 font-mono mt-0.5">{primaryLanguage.nativeName}</span>
        </div>

        <button 
          onClick={swapLanguages}
          className="p-3 bg-purple-600/20 hover:bg-purple-600/40 rounded-full border border-purple-500/20 transition-all hover:scale-110 active:scale-95 text-purple-400 mx-3 shadow-md"
          title="Swap Languages"
        >
          <ArrowLeftRight className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center flex-1">
          <span className="text-3xl filter drop-shadow">{targetLanguage.flag}</span>
          <span className="text-[11px] font-black uppercase tracking-wider text-white mt-1.5">{targetLanguage.name}</span>
          <span className="text-[9px] text-white/50 font-mono mt-0.5">{targetLanguage.nativeName}</span>
        </div>
      </div>

      {/* Central Visual Pulsing Sonic Waves / Feedback Area */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[180px] relative">
        <div className="relative flex items-center justify-center w-40 h-40">
          
          {/* Sonic pulsing rings during listening */}
          {activeSpeaker !== "none" && !isTranslating && !isSpeakingOut && (
            <>
              <div className={`absolute inset-0 rounded-full border-4 border-dashed animate-[spin_8s_linear_infinite] ${
                activeSpeaker === "primary" ? "border-purple-500/20" : "border-pink-500/20"
              }`} />
              <div className={`absolute inset-2 rounded-full animate-ping opacity-30 ${
                activeSpeaker === "primary" ? "bg-purple-500" : "bg-pink-500"
              }`} />
              <div className={`absolute inset-6 rounded-full animate-pulse opacity-40 ${
                activeSpeaker === "primary" ? "bg-purple-500/50" : "bg-pink-500/50"
              }`} />
            </>
          )}

          {/* Sparkly processing ring when translating */}
          {isTranslating && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-b-pink-500 animate-spin" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-purple-600/10 to-pink-600/10 animate-pulse" />
              <RefreshCw className="absolute w-8 h-8 text-purple-400 animate-spin" />
            </>
          )}

          {/* Sound waves when synthesizing audio */}
          {isSpeakingOut && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping" />
              <div className="absolute inset-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-pulse" />
              <div className="absolute inset-10 flex items-center justify-center gap-1">
                <span className="w-1 bg-emerald-400 h-8 rounded-full animate-[bounce_0.8s_infinite_100ms]" />
                <span className="w-1 bg-emerald-400 h-12 rounded-full animate-[bounce_0.8s_infinite_300ms]" />
                <span className="w-1 bg-emerald-400 h-10 rounded-full animate-[bounce_0.8s_infinite_200ms]" />
                <span className="w-1 bg-emerald-400 h-6 rounded-full animate-[bounce_0.8s_infinite_400ms]" />
              </div>
            </>
          )}

          {/* Default idle state */}
          {activeSpeaker === "none" && !isTranslating && !isSpeakingOut && (
            <div className="absolute inset-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
              <Mic className="w-8 h-8 text-white/30" />
            </div>
          )}
        </div>

        {/* Dynamic Status / Instruction Text */}
        <p className="text-center text-xs font-medium text-white/80 mt-6 max-w-xs leading-relaxed tracking-wide">
          {statusText}
        </p>

        {/* Display System Error alerts gracefully */}
        {recognitionError && (
          <div className="mt-3 bg-red-950/60 border border-red-500/30 p-2.5 rounded-xl flex items-center gap-2 max-w-xs mx-auto">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-[10px] text-red-200 leading-tight">{recognitionError}</span>
          </div>
        )}
      </div>

      {/* Real-time Subtitle Captions Overlay (No chat blocks or keyboard inputs) */}
      <div className="h-[120px] flex flex-col justify-center items-center px-4 mb-4 shrink-0">
        <AnimatePresence mode="wait">
          {lastOriginal && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-center space-y-2 w-full max-w-sm"
            >
              <p className="text-[11px] text-white/40 italic truncate max-w-full">
                "{lastOriginal}"
              </p>
              {lastTranslation && (
                <motion.div 
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                  className="bg-white/10 border border-white/10 px-4 py-2 rounded-2xl shadow-md text-sm font-bold text-purple-300 leading-relaxed text-center"
                >
                  {lastTranslation}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Double Microphone Touch Targets (Two-way interpreters, absolutely NO keyboard) */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10 shrink-0">
        
        {/* Speak Primary Language button */}
        <button
          onClick={() => startListening("primary")}
          disabled={activeSpeaker !== "none" || isTranslating || isSpeakingOut}
          className={`flex flex-col items-center justify-center py-4 rounded-3xl transition-all relative overflow-hidden ${
            activeSpeaker === "primary"
              ? "bg-purple-600 text-white shadow-lg scale-95"
              : "bg-purple-950/40 hover:bg-purple-900/30 border border-purple-500/20 text-purple-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          }`}
        >
          {activeSpeaker === "primary" ? (
            <div className="absolute inset-0 bg-purple-700/40 animate-pulse" />
          ) : null}
          <div className="relative z-10 flex flex-col items-center text-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Talk Native</span>
            <span className="text-xs font-bold truncate max-w-[120px]">{primaryLanguage.name} {primaryLanguage.flag}</span>
          </div>
        </button>

        {/* Speak Target Language button */}
        <button
          onClick={() => startListening("target")}
          disabled={activeSpeaker !== "none" || isTranslating || isSpeakingOut}
          className={`flex flex-col items-center justify-center py-4 rounded-3xl transition-all relative overflow-hidden ${
            activeSpeaker === "target"
              ? "bg-pink-600 text-white shadow-lg scale-95"
              : "bg-pink-950/40 hover:bg-pink-900/30 border border-pink-500/20 text-pink-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          }`}
        >
          {activeSpeaker === "target" ? (
            <div className="absolute inset-0 bg-pink-700/40 animate-pulse" />
          ) : null}
          <div className="relative z-10 flex flex-col items-center text-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-pink-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-pink-300">Talk Partner</span>
            <span className="text-xs font-bold truncate max-w-[120px]">{targetLanguage.name} {targetLanguage.flag}</span>
          </div>
        </button>

      </div>
    </div>
  );
}
