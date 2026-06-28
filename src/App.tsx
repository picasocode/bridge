import React, { useState } from "react";
import { AppMode, Language, LANGUAGES, Contact } from "./types";
import Onboarding from "./components/Onboarding";
import PersonalMode from "./components/PersonalMode";
import BusinessMode from "./components/BusinessMode";
import LiveVoiceMode from "./components/LiveVoiceMode";
import { 
  Globe, Smartphone, Sparkles, Battery, Wifi, ShieldAlert,
  Settings, Users, Info, HelpCircle, CheckCircle, RefreshCw, Layers, Mic
} from "lucide-react";

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean>(false);
  const [currentMode, setCurrentMode] = useState<AppMode>("livevoice");
  const [primaryLang, setPrimaryLang] = useState<Language>(LANGUAGES[0]); // English
  const [targetLang, setTargetLang] = useState<Language>(LANGUAGES[1]); // Spanish

  // Sidebar Switches / Settings
  const [liveTranslationEnabled, setLiveTranslationEnabled] = useState<boolean>(true);
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState<boolean>(false);
  const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Default mock contacts list for multilingual phone calls
  const [contacts] = useState<Contact[]>([
    {
      id: "c1",
      name: "Mateo Silva",
      role: "Lead Developer",
      company: "Innovatech",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      phoneNumber: "+34 612 894 122",
      preferredLanguage: "Spanish (ES)"
    },
    {
      id: "c2",
      name: "Chloé Dubois",
      role: "Business Partner",
      company: "Dubois & Fils",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
      phoneNumber: "+33 699 123 456",
      preferredLanguage: "French (FR)"
    },
    {
      id: "c3",
      name: "Kenji Sato",
      role: "Quality Assurance",
      company: "Tokyo Tech Ltd",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
      phoneNumber: "+81 90 1234 5678",
      preferredLanguage: "Japanese (JA)"
    },
    {
      id: "c4",
      name: "Sophia Müller",
      role: "Operations Manager",
      company: "Berlin Logistics",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
      phoneNumber: "+49 176 1234567",
      preferredLanguage: "German (DE)"
    }
  ]);

  const handleOnboardingComplete = (primary: Language, target: Language) => {
    setPrimaryLang(primary);
    setTargetLang(target);
    setOnboarded(true);
  };

  return (
    <div id="app-root-container" className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-0 sm:p-4 font-sans overflow-hidden select-none">
      
      {/* Outer container supporting mobile framing for professional presentation */}
      <div className="w-full max-w-md h-screen sm:h-[840px] bg-white sm:rounded-[40px] sm:shadow-2xl sm:border-[10px] sm:border-purple-600 flex flex-col relative overflow-hidden">
        
        {/* Simulated Mobile Status Bar (Pure Professional Detail) */}
        <div className="bg-white px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-bold text-slate-700 shrink-0 select-none">
          <span>12:30 PM</span>
          {/* Simulated speaker capsule */}
          <div className="hidden sm:block w-20 h-4.5 bg-slate-800 rounded-full absolute left-1/2 -translate-x-1/2 top-2.5 z-50"></div>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-slate-700" />
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded">5G</span>
            <Battery className="w-3.5 h-3.5 text-slate-700" />
          </div>
        </div>

        {/* Dynamic Header */}
        <header className="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-md shadow-purple-600/10">
              N
            </div>
            <div>
              <h1 className="text-xs font-black text-slate-900 tracking-tight leading-none">NeuTTS</h1>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">Mobile PWA</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick settings drawer trigger */}
            <button
              onClick={() => setShowSettingsDrawer(prev => !prev)}
              className={`p-1.5 rounded-lg border transition-all ${
                showSettingsDrawer 
                  ? "bg-purple-50 border-purple-200 text-purple-600" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Settings Drawer Slideover */}
        {showSettingsDrawer && (
          <div className="absolute inset-x-0 top-[52px] bg-white border-b border-slate-200 shadow-lg z-50 p-4 space-y-4 animate-in slide-in-from-top duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">PWA Quick Settings</h3>
              <button 
                onClick={() => setShowSettingsDrawer(false)} 
                className="text-xs font-bold text-purple-600 hover:text-purple-700"
              >
                Done
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80">
                <span className="text-xs font-bold text-slate-700">Live Translations</span>
                <input 
                  type="checkbox" 
                  checked={liveTranslationEnabled} 
                  onChange={() => setLiveTranslationEnabled(!liveTranslationEnabled)}
                  className="w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80">
                <span className="text-xs font-bold text-slate-700">Ambient Noise Cancellation</span>
                <input 
                  type="checkbox" 
                  checked={noiseSuppressionEnabled} 
                  onChange={() => setNoiseSuppressionEnabled(!noiseSuppressionEnabled)}
                  className="w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80">
                <span className="text-xs font-bold text-slate-700">Auto Save Meeting Logs</span>
                <input 
                  type="checkbox" 
                  checked={autoRecordEnabled} 
                  onChange={() => setAutoRecordEnabled(!autoRecordEnabled)}
                  className="w-4 h-4 text-purple-600 accent-purple-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
              <h4 className="text-[10px] font-black uppercase text-purple-700 tracking-wider flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-purple-600" /> PWA Installed Offline Ready
              </h4>
              <p className="text-[10px] text-indigo-900 leading-relaxed">
                Your credentials and settings are safely persisted locally on this device. Fully functional without heavy external services.
              </p>
            </div>
          </div>
        )}

        {/* Mode Selector Navigation (Meet vs Call vs Voice) */}
        {onboarded && (
          <div className="bg-slate-50 border-b border-slate-100 p-2 flex gap-1 shrink-0">
            <button 
              onClick={() => setCurrentMode("livevoice")}
              className={`flex-1 py-2 text-[10px] font-black rounded-xl tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                currentMode === "livevoice" 
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Live Voice
            </button>
            <button 
              onClick={() => setCurrentMode("business")}
              className={`flex-1 py-2 text-[10px] font-black rounded-xl tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                currentMode === "business" 
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Meet Style
            </button>
            <button 
              onClick={() => setCurrentMode("personal")}
              className={`flex-1 py-2 text-[10px] font-black rounded-xl tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                currentMode === "personal" 
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/15" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Call Style
            </button>
          </div>
        )}

        {/* App Main Viewport */}
        <div className="flex-1 overflow-hidden relative bg-white">
          {!onboarded ? (
            <Onboarding onComplete={handleOnboardingComplete} />
          ) : currentMode === "livevoice" ? (
            <LiveVoiceMode 
              primaryLanguage={primaryLang} 
              targetLanguage={targetLang} 
              onLanguageChange={(primary, target) => {
                setPrimaryLang(primary);
                setTargetLang(target);
              }}
              onBackToModeSelect={() => setOnboarded(false)}
            />
          ) : currentMode === "business" ? (
            <BusinessMode 
              primaryLanguage={primaryLang} 
              targetLanguage={targetLang} 
              onBackToModeSelect={() => setOnboarded(false)}
            />
          ) : (
            <PersonalMode 
              primaryLanguage={primaryLang} 
              targetLanguage={targetLang} 
              contacts={contacts}
              onBackToModeSelect={() => setOnboarded(false)}
            />
          )}
        </div>

        {/* PWA Soft Footer */}
        <div className="bg-white border-t border-slate-100 p-3 text-center shrink-0">
          <p className="text-[10px] text-slate-400 font-medium">
            © NeuTTS Global PWA • Secure Live Speech Translation
          </p>
        </div>
      </div>
    </div>
  );
}
