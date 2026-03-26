import { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, DataPacket_Kind, TranscriptionSegment, Participant } from 'livekit-client';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export function useChatTranscriptions(): ChatMessage[] {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!room) return;

    // --- 1. Catch Spoken Transcriptions (Standard AI Agent Behavior) ---
    const handleTranscription = (segments: TranscriptionSegment[], participant?: Participant) => {
      // Identify if the transcription is from the bot/agent
      const isAgent = participant && participant.identity !== room.localParticipant.identity;

      setMessages(prev => {
        const newMessages = [...prev];
        
        segments.forEach(segment => {
          // We only want to capture the final confirmed text of what the bot said
          if (segment.final && segment.text.trim()) {
            // Prevent duplicate segments from being added to the chat array
            if (!newMessages.some(m => m.id === segment.id)) {
              newMessages.push({
                id: segment.id,
                sender: isAgent ? 'agent' : 'user',
                text: segment.text,
                timestamp: Date.now(),
              });
            }
          }
        });

        return newMessages;
      });
    };

    // --- 2. Catch Custom Data Packets (Fallback) ---
    const handleData = (
      payload: Uint8Array,
      participant: Participant | undefined,
      _kind: DataPacket_Kind,
      topic?: string
    ) => {
      // The standard useChat() hook in Assistant.tsx already handles 'lk.chat', 
      // so we explicitly ignore it here to prevent duplicate messages.
      if (topic === 'lk.chat') return; 

      try {
        const text = new TextDecoder().decode(payload);
        const parsed = JSON.parse(text);
        const messageText = parsed.message || parsed.text || text;
        
        if (!messageText?.trim()) return;

        const isAgent = participant && participant.identity !== room.localParticipant.identity;

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: isAgent ? 'agent' : 'user',
          text: messageText,
          timestamp: Date.now(),
        }]);
      } catch {
        // Not JSON — treat raw string as message text
        const text = new TextDecoder().decode(payload);
        if (text?.trim()) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'agent',
            text,
            timestamp: Date.now(),
          }]);
        }
      }
    };

    // Attach Listeners
    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    room.on(RoomEvent.DataReceived, handleData);

    return () => { 
      // Cleanup on unmount
      room.off(RoomEvent.TranscriptionReceived, handleTranscription); 
      room.off(RoomEvent.DataReceived, handleData); 
    };
  }, [room]);

  return messages;
}