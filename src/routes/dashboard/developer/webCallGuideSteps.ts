/**
 * What a developer does with the token from `POST /api/web-call/get-token`.
 *
 * The HTTP snippets stop at the token, which is one step short of a working call. These samples
 * carry on from there: connect to the room, play the agent, type to it, and render the transcript.
 *
 * They are transcriptions of the code this app itself runs (`Assistant.tsx`, `AssistantChat.tsx`,
 * `useChatTranscriptions.ts`), so a fix in one belongs in the other.
 */

/**
 * The agent publishes its own words on this topic.
 *
 * `api_livekit/docs/api/calls/web-call.md` says replies arrive on `lk.chat`. They do not. The agent
 * registers `lk.chat` to *receive* what the user types and writes its own text to `lk.transcription`
 * (livekit-agents `voice/room_io/_output.py`). Listening on `lk.chat` gives an empty transcript with
 * no error, so this constant exists to keep the samples from drifting back to the wrong one.
 */
export const AGENT_TEXT_TOPIC = "lk.transcription";

/** The topic the user's typed messages go out on. */
export const USER_TEXT_TOPIC = "lk.chat";

/** The URL the samples connect to. Blank env renders a placeholder rather than a broken host. */
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://<your-livekit-server>";

export interface ClientGuideStep {
  id: string;
  label: string;
  /** One line on what this sample gets you. */
  summary: string;
  code: string;
}

const REACT_VOICE = `// npm i livekit-client @livekit/components-react @livekit/components-styles

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useRoomContext,
} from "@livekit/components-react";
import type { TextStreamReader } from "livekit-client";
import "@livekit/components-styles";

// Your LiveKit server URL. The token endpoint does NOT return it — hold it yourself.
const LIVEKIT_URL = "${LIVEKIT_URL}";
const BACKEND_URL = "https://your-backend";

// Your VoiceKit API key is a credential. In production mint the token on your server and return
// only the token to the browser.
async function getToken() {
  const res = await fetch(BACKEND_URL + "/api/web-call/get-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer $VOICEKIT_API_KEY",
    },
    body: JSON.stringify({
      assistant_id: "<assistant_id>",
      metadata: { customer: { name: "John Doe" } },
    }),
  });
  // Read the body once, as text: a proxy can answer 502 with HTML, and res.json() would then
  // throw a SyntaxError over the top of the real failure.
  const body = await res.text();
  if (!res.ok) throw new Error(body || res.statusText);
  const json = JSON.parse(body);
  return json.data.token as string; // data also carries room_name and agent_dispatch
}

type Line = { id: string; speaker: "you" | "agent"; text: string };

export function VoiceCall() {
  const [token, setToken] = useState<string>();

  if (!token) {
    return <button onClick={() => getToken().then(setToken)}>Start call</button>;
  }

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect
      audio          // publish the microphone
      video={false}
      onDisconnected={() => setToken(undefined)}
    >
      <RoomAudioRenderer />        {/* plays the agent's voice */}
      <VoiceAssistantControlBar /> {/* mute and hang up */}
      <Transcript />
    </LiveKitRoom>
  );
}

// Both sides of the conversation stream in on ${AGENT_TEXT_TOPIC}, a chunk at a time.
function Transcript() {
  const room = useRoomContext();
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!room) return;

    const handler = async (reader: TextStreamReader, from: { identity: string }) => {
      const id = reader.info.id; // one id per utterance — later chunks replace, not append
      const speaker = from.identity === room.localParticipant.identity ? "you" : "agent";

      let text = "";
      for await (const chunk of reader) {
        text += chunk;
        setLines((prev) => upsert(prev, { id, speaker, text }));
      }
    };

    room.registerTextStreamHandler("${AGENT_TEXT_TOPIC}", handler);
    return () => room.unregisterTextStreamHandler("${AGENT_TEXT_TOPIC}");
  }, [room]);

  return (
    <div>
      {lines.map((line) => (
        <p key={line.id}>
          <strong>{line.speaker}:</strong> {line.text}
        </p>
      ))}
    </div>
  );
}

function upsert(prev: Line[], line: Line): Line[] {
  const i = prev.findIndex((l) => l.id === line.id);
  if (i === -1) return [...prev, line];
  const next = [...prev];
  next[i] = line;
  return next;
}
`;

const REACT_TEXT = `// npm i livekit-client @livekit/components-react

// Same room, no microphone and no speaker: ask for the token with text_only: true and the
// assistant answers in text instead of voice. Realtime assistants reject text_only with a 400.

import { useEffect, useState } from "react";
import { LiveKitRoom, useChat, useRoomContext } from "@livekit/components-react";
import type { TextStreamReader } from "livekit-client";

const LIVEKIT_URL = "${LIVEKIT_URL}"; // not returned by the token endpoint
const BACKEND_URL = "https://your-backend";

async function getChatToken() {
  const res = await fetch(BACKEND_URL + "/api/web-call/get-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer $VOICEKIT_API_KEY",
    },
    body: JSON.stringify({
      assistant_id: "<assistant_id>",
      text_only: true,
      metadata: { customer: { name: "John Doe" } },
    }),
  });
  const body = await res.text();
  // A realtime assistant rejects text_only with a 400, and json.data is then undefined.
  if (!res.ok) throw new Error(body || res.statusText);
  return JSON.parse(body).data.token as string;
}

type Line = { id: string; speaker: "you" | "agent"; text: string };

export function TextChat() {
  const [token, setToken] = useState<string>();

  if (!token) {
    return <button onClick={() => getChatToken().then(setToken)}>Start chat</button>;
  }

  return (
    <LiveKitRoom serverUrl={LIVEKIT_URL} token={token} connect audio={false} video={false}>
      <ChatPanel />
    </LiveKitRoom>
  );
}

function ChatPanel() {
  const room = useRoomContext();
  const { send } = useChat(); // publishes on ${USER_TEXT_TOPIC}, which the agent listens on
  const [draft, setDraft] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  // The agent's reply comes back on ${AGENT_TEXT_TOPIC} — the same topic a voice call uses.
  useEffect(() => {
    if (!room) return;

    // Only the agent's side arrives here. What you type is never streamed back, so the sender
    // has to add its own line — this is what AssistantChat does by merging useChat().chatMessages.
    const handler = async (reader: TextStreamReader, from: { identity: string }) => {
      const id = reader.info.id;
      const speaker = from.identity === room.localParticipant.identity ? "you" : "agent";

      let text = "";
      for await (const chunk of reader) {
        text += chunk;
        setLines((prev) => {
          const i = prev.findIndex((l) => l.id === id);
          const line: Line = { id, speaker, text };
          if (i === -1) return [...prev, line];
          const next = [...prev];
          next[i] = line;
          return next;
        });
      }
    };

    room.registerTextStreamHandler("${AGENT_TEXT_TOPIC}", handler);
    return () => room.unregisterTextStreamHandler("${AGENT_TEXT_TOPIC}");
  }, [room]);

  return (
    <div>
      {lines.map((line) => (
        <p key={line.id}>
          <strong>{line.speaker}:</strong> {line.text}
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          send(draft);
          setLines((prev) => [...prev, { id: crypto.randomUUID(), speaker: "you", text: draft }]);
          setDraft("");
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} />
      </form>
    </div>
  );
}
`;

const VANILLA = `// npm i livekit-client
// No React: the same call with the plain client SDK.

import { Room, RoomEvent, Track } from "livekit-client";

const LIVEKIT_URL = "${LIVEKIT_URL}"; // not returned by the token endpoint
const BACKEND_URL = "https://your-backend";

const res = await fetch(BACKEND_URL + "/api/web-call/get-token", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer $VOICEKIT_API_KEY",
  },
  body: JSON.stringify({
    assistant_id: "<assistant_id>",
    metadata: { customer: { name: "John Doe" } },
  }),
});
const body = await res.text();
// 400 on text_only against a realtime assistant, 404 unknown assistant, 503 at capacity — the
// body carries the reason, and data is undefined in every one of those cases.
if (!res.ok) throw new Error(body || res.statusText);
const { data } = JSON.parse(body); // { token, room_name, agent_dispatch }

const room = new Room();

// Play the agent. Browsers block autoplay until a user gesture, so connect from a click.
room.on(RoomEvent.TrackSubscribed, (track) => {
  if (track.kind === Track.Kind.Audio) {
    document.body.appendChild(track.attach());
  }
});

// Live transcript, both sides, streamed a chunk at a time.
room.registerTextStreamHandler("${AGENT_TEXT_TOPIC}", async (reader, from) => {
  const id = reader.info.id;
  const speaker = from.identity === room.localParticipant.identity ? "you" : "agent";

  let text = "";
  for await (const chunk of reader) {
    text += chunk;
    render(id, speaker, text); // same id updates the same line
  }
});

await room.connect(LIVEKIT_URL, data.token);
await room.localParticipant.setMicrophoneEnabled(true); // skip this one line for text_only

// Type to the assistant. This is the one direction that uses ${USER_TEXT_TOPIC}.
async function say(message) {
  await room.localParticipant.sendText(message, { topic: "${USER_TEXT_TOPIC}" });
}

// Hang up.
// await room.disconnect();
`;

export const WEB_CALL_CLIENT_STEPS: ClientGuideStep[] = [
  {
    id: "react-voice",
    label: "React — voice",
    summary: "Talk to the assistant and watch the transcript fill in as it speaks.",
    code: REACT_VOICE,
  },
  {
    id: "react-text",
    label: "React — text chat",
    summary: "The same room with text_only, for a chat window instead of a call.",
    code: REACT_TEXT,
  },
  {
    id: "vanilla",
    label: "Vanilla JS",
    summary: "The plain livekit-client SDK, for anything that is not React.",
    code: VANILLA,
  },
];
