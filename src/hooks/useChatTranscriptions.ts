import { useState, useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, DataPacket_Kind } from 'livekit-client';
 
interface ChatMessage {
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
}
 
export function useChatTranscriptions(): ChatMessage[] {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
 
  useEffect(() => {
    if (!room) return;
 
    const handleData = (
      payload: Uint8Array,
      participant: any,
      _kind: DataPacket_Kind,
      topic?: string
    ) => {
      // Only process lk.chat topic messages
      if (topic !== 'lk.chat') return;
 
      try {
        const text = new TextDecoder().decode(payload);
        const parsed = JSON.parse(text);
 
        // LiveKit chat messages come as { message: string } or { text: string }
        const messageText = parsed.message || parsed.text || text;
        if (!messageText?.trim()) return;
 
        // If participant is undefined or is the local participant, it's from the user
        // Agent messages come from remote participants
        const isAgent = participant && participant.identity !== room.localParticipant.identity;
 
        setMessages(prev => [...prev, {
          sender: isAgent ? 'agent' : 'user',
          text: messageText,
          timestamp: Date.now(),
        }]);
      } catch {
        // Not JSON — treat raw string as message text
        const text = new TextDecoder().decode(payload);
        if (text?.trim()) {
          setMessages(prev => [...prev, {
            sender: 'agent',
            text,
            timestamp: Date.now(),
          }]);
        }
      }
    };
 
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room]);
 
  return messages;
}