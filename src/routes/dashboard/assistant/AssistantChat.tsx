import { useEffect, useState, useRef, useMemo } from "react";
import { X, MessageSquare, Send, PhoneOff } from "lucide-react";
import { useLocalParticipant, useChat } from "@livekit/components-react";
import { cn } from "@/lib/utils";
import { useChatTranscriptions } from "./useChatTranscriptions";

// --- ANIMATED MESSAGE COMPONENT ---
const AnimatedMessage = ({ text, isBot }: { text: string; isBot: boolean }) => {
  const [displayed, setDisplayed] = useState(isBot ? "" : text);

  useEffect(() => {
    if (!isBot) {
      setDisplayed(text);
      return;
    }
    
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        if (prev.length >= text.length) {
          clearInterval(interval);
          return text;
        }
        return text.slice(0, prev.length + 1);
      });
    }, 15); // Adjust speed of typing here (15ms per letter)

    return () => clearInterval(interval);
  }, [text, isBot]);

  return <span>{displayed}</span>;
};

// --- CHAT MODAL COMPONENT ---
export const ChatInner: React.FC<{ assistantName: string; onClose: () => void }> = ({ assistantName, onClose }) => {
  const { localParticipant } = useLocalParticipant();
  const { send, chatMessages } = useChat(); 
  const liveTranscriptions = useChatTranscriptions();
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat-only: disable mic entirely
  useEffect(() => {
    localParticipant?.setMicrophoneEnabled(false);
  }, [localParticipant]);

  const allMessages = useMemo(() => {
    const chats = chatMessages
      .filter((m) => m.from?.identity === localParticipant?.identity)
      .map((m) => ({
        id: m.id || `chat-${m.timestamp}`,
        role: 'user' as const,
        text: m.message,
        timestamp: m.timestamp,
      }));

    const transcribed = liveTranscriptions.map((m: any) => ({
      id: m.id || `trans-${m.timestamp}`,
      role: m.sender === 'user' ? 'user' as const : 'bot' as const,
      text: m.text,
      timestamp: m.timestamp,
    }));

    return [...chats, ...transcribed].sort((a, b) => a.timestamp - b.timestamp);
  }, [chatMessages, liveTranscriptions, localParticipant]);

  // Turn off thinking state when bot replies
  useEffect(() => {
    const lastMsg = allMessages[allMessages.length - 1];
    if (lastMsg && lastMsg.role === 'bot') {
      setIsThinking(false);
    }
  }, [allMessages]);

  // Auto scroll to bottom smoothly
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, isThinking]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !send) return;
    
    setIsThinking(true);
    await send(inputText); 
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[min(600px,90vh)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-foreground font-semibold text-sm">Agent: {assistantName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-muted/20">
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground opacity-70">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              Start chatting below…
            </div>
          ) : (
            allMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={cn(
                    "max-w-[85%] px-4 py-3 text-sm leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "rounded-[14px_14px_2px_14px] bg-primary text-primary-foreground"
                      : "rounded-[14px_14px_14px_2px] bg-card text-foreground border border-border",
                  )}
                >
                  <AnimatedMessage text={msg.text} isBot={msg.role === 'bot'} />
                </div>
              </div>
            ))
          )}

          {/* Thinking Animation Bubble */}
          {isThinking && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
              <div className="px-4 py-3 text-sm leading-relaxed rounded-[14px_14px_14px_2px] bg-card border border-border text-muted-foreground shadow-sm flex items-center gap-1.5 h-[44px]">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex gap-2 p-3 border-t"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm outline-none bg-background text-foreground focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-primary-foreground bg-primary transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </form>

        {/* End button */}
        <div className="p-3 border-t bg-background">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <PhoneOff className="h-4 w-4" />
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};
