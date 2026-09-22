import {
  Bot,
  Phone,
  Blocks,
  PhoneCall,
  Wrench,
  List,
  PhoneIncoming,
  Webhook,
  BarChart3,
  Music,
  Terminal,
  Database,
} from "lucide-react";

export interface NavItem {
  label: string;
  helper: string;
  keywords: string;
  icon: typeof Bot;
  path: string;
  section: string;
}

export const navItems: NavItem[] = [
  { label: "Make a Call", helper: "Call someone now with an assistant", keywords: "outbound call phone dial agent", icon: PhoneCall, path: "/dashboard/make-call", section: "Get started" },
  { label: "Assistants", helper: "Create and edit your voice assistants", keywords: "assistant agent bot voice ai configure", icon: Bot, path: "/dashboard/assistant", section: "Get started" },
  { label: "Tools", helper: "Actions your assistant can use", keywords: "tools functions actions webhook", icon: Wrench, path: "/dashboard/tools", section: "Build" },
  { label: "Audio Library", helper: "Upload hold music and messages", keywords: "audio music mp3 upload library", icon: Music, path: "/dashboard/audio-library", section: "Build" },
  { label: "Phone Numbers", helper: "Numbers people call to reach you", keywords: "phone number trunk sip did", icon: Phone, path: "/dashboard/phone-number", section: "Phone" },
  { label: "Inbound Routes", helper: "Send each incoming call to the right assistant", keywords: "inbound route incoming routing number", icon: PhoneIncoming, path: "/dashboard/inbound", section: "Phone" },
  { label: "Inbound Rules", helper: "Look up caller details first (advanced)", keywords: "inbound context headers rules advanced", icon: Webhook, path: "/dashboard/inbound-context", section: "Phone" },
  { label: "Call Logs", helper: "Every call, recording and cost", keywords: "call logs history recordings cost", icon: List, path: "/dashboard/call-logs", section: "History" },
  { label: "Analytics", helper: "Minutes, usage and trends", keywords: "analytics metrics charts usage minutes", icon: BarChart3, path: "/dashboard/analytics", section: "History" },
  { label: "Passthrough Calls", helper: "Calls where a person, not an assistant, spoke to the caller", keywords: "passthrough direct sip no assistant records", icon: Database, path: "/dashboard/passthrough-call-records", section: "History" },
  { label: "Your API key", helper: "The key your own code sends", keywords: "api key user id account id credential developer token livekit", icon: Terminal, path: "/dashboard/developer", section: "Developers" },
  { label: "Provider Keys", helper: "Keys for voice and model providers", keywords: "integration provider openai gemini elevenlabs cartesia sarvam deepgram mistral key", icon: Blocks, path: "/dashboard/integration", section: "Developers" },
];
