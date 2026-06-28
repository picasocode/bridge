export type AppMode = "personal" | "business" | "livevoice";

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  voiceLangCode: string; // Used for Web Speech API TTS
}

export interface CallSession {
  id: string;
  contactName: string;
  contactAvatar: string;
  mode: AppMode;
  status: "idle" | "dialing" | "connected" | "ended";
  duration: number; // in seconds
  transcripts: TranscriptItem[];
}

export interface TranscriptItem {
  id: string;
  sender: "user" | "remote";
  originalText: string;
  translatedText: string;
  timestamp: Date;
  isPlaying?: boolean;
}

export interface AppSettings {
  primaryLanguage: Language;
  targetLanguage: Language;
  speechSynthesisEnabled: boolean;
  voiceGender: "male" | "female" | "neutral";
  speechRate: number; // 0.5 to 2
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  company?: string;
  avatar: string;
  phoneNumber: string;
  preferredLanguage: string;
  recentTranslation?: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", voiceLangCode: "en-US" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", voiceLangCode: "es-ES" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", voiceLangCode: "fr-FR" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", voiceLangCode: "de-DE" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", voiceLangCode: "zh-CN" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", voiceLangCode: "ja-JP" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", voiceLangCode: "ar-SA" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷", voiceLangCode: "pt-BR" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", voiceLangCode: "hi-IN" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", voiceLangCode: "it-IT" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", voiceLangCode: "ko-KR" },
];
