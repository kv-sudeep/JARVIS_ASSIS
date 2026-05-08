import React, { useEffect, useRef, useState } from "react";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { Mic, MicOff, Send, Terminal } from "lucide-react";
import { Panel } from "./Panel";

export function AssistantPanel() {
  const {
    state,
    messages,
    transcript,
    interimTranscript,
    amplitude,
    error,
    startListening,
    stopListening,
    sendText,
    isListening,
    isSpeaking,
  } = useVoiceAssistant();

  const [inputText, setInputText] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript, interimTranscript]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    sendText(inputText.trim());
    setInputText("");
  };

  const getStatusText = () => {
    if (error) return "ERROR";
    if (isListening) return "LISTENING . . .";
    if (isSpeaking) return "SPEAKING . . .";
    if (state === "processing") return "PROCESSING . . .";
    return "ONLINE";
  };

  return (
    <Panel className="w-full max-w-xl flex flex-col h-full max-h-[400px]">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-hud-cyan/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-[10px] tracking-[0.4em] text-hud-cyan">▸ JARVIS CORE</span>
          <span
            className={`text-[9px] tracking-[0.3em] ${
              error ? "text-red-400" : isListening || isSpeaking ? "text-hud-cyan animate-flicker" : "text-muted-foreground"
            }`}
          >
            {getStatusText()}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
              isListening
                ? "border-hud-cyan bg-hud-cyan/20 text-hud-cyan shadow-[0_0_10px_var(--hud-cyan)]"
                : "border-hud-cyan/40 text-hud-cyan/60 hover:border-hud-cyan hover:text-hud-cyan"
            }`}
          >
            {isListening ? <Mic className="h-3 w-3 animate-pulse" /> : <MicOff className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 hud-scrollbar font-display">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div className="text-[8px] tracking-[0.3em] text-muted-foreground mb-1">
              {msg.role === "user" ? "USER" : "JARVIS"} // {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false })}
            </div>
            <div
              className={`max-w-[85%] rounded border p-2 text-sm tracking-wider ${
                msg.role === "user"
                  ? "border-hud-blue/50 bg-hud-blue/10 text-hud-blue"
                  : msg.type === "error"
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-hud-cyan/40 bg-hud-cyan/10 text-hud-cyan hud-text-glow"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Live Transcript Bubble */}
        {(transcript || interimTranscript) && (
          <div className="flex flex-col items-end">
             <div className="text-[8px] tracking-[0.3em] text-muted-foreground mb-1">
              USER // LIVE
            </div>
            <div className="max-w-[85%] rounded border border-hud-blue/50 bg-hud-blue/10 p-2 text-sm tracking-wider text-hud-blue opacity-70">
              {transcript}
              <span className="text-hud-blue/50">{interimTranscript}</span>
              <span className="animate-pulse">_</span>
            </div>
          </div>
        )}

        <div ref={endOfMessagesRef} />
      </div>

      {/* Real-time Waveform (Bottom of chat area) */}
      {(isListening || isSpeaking || state === "processing") && (
        <div className="mt-3 flex h-8 items-end gap-[2px] opacity-70 px-2 justify-center">
          {amplitude.slice(0, 32).map((val, i) => (
            <div
              key={i}
              className={`w-1 rounded-t-sm transition-all duration-75 ${
                isListening ? "bg-hud-blue" : "bg-hud-cyan"
              }`}
              style={{
                height: `${Math.max(4, val * 32)}px`,
                boxShadow: `0 0 8px ${isListening ? "var(--hud-blue)" : "var(--hud-cyan)"}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-hud-cyan/20 pt-3">
        <div className="relative flex-1">
          <Terminal className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-hud-cyan/50" />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ENTER COMMAND..."
            className="w-full rounded border border-hud-cyan/40 bg-transparent py-1.5 pl-7 pr-3 font-display text-xs tracking-widest text-hud-cyan placeholder:text-hud-cyan/30 focus:border-hud-cyan focus:outline-none focus:shadow-[0_0_10px_var(--hud-cyan)]"
          />
        </div>
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="flex items-center justify-center rounded border border-hud-cyan/40 px-3 transition-colors hover:border-hud-cyan hover:bg-hud-cyan/10 disabled:opacity-30 text-hud-cyan"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </Panel>
  );
}
