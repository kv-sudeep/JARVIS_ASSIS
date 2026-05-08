import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export interface Message {
  id: string;
  role: "user" | "jarvis";
  text: string;
  timestamp: Date;
  type?: string;
}

interface UseVoiceAssistantReturn {
  state: VoiceState;
  messages: Message[];
  transcript: string;
  interimTranscript: string;
  amplitude: number[];
  error: string | null;
  isOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  startListening: () => void;
  stopListening: () => void;
  sendText: (text: string) => Promise<void>;
  clearMessages: () => void;
  isSpeaking: boolean;
  isListening: boolean;
}

const BACKEND = "http://127.0.0.1:5000";

export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "jarvis",
      text: "Good day, Sir. All systems are online. How may I assist you?",
      timestamp: new Date(),
      type: "greeting",
    },
  ]);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [amplitude, setAmplitude] = useState<number[]>(Array(40).fill(0));
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Amplitude animation from microphone ──────────────────────────────────────
  const startMicVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const draw = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const bars = Array.from({ length: 40 }, (_, i) => {
          const idx = Math.floor((i / 40) * data.length);
          return data[idx] / 255;
        });
        setAmplitude(bars);
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      // Fallback to fake animation if mic denied
      let t = 0;
      const fakeDraw = () => {
        t += 0.1;
        const bars = Array.from({ length: 40 }, (_, i) =>
          Math.abs(Math.sin(i * 0.4 + t) * Math.cos(i * 0.2 + t * 0.5)) * 0.8,
        );
        setAmplitude(bars);
        animFrameRef.current = requestAnimationFrame(fakeDraw);
      };
      fakeDraw();
    }
  }, []);

  const stopMicVisualization = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    micStreamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    setAmplitude(Array(40).fill(0));
  }, []);

  // ── Fake waveform for speaking ────────────────────────────────────────────────
  const startSpeakingWave = useCallback(() => {
    let t = 0;
    const draw = () => {
      t += 0.15;
      const bars = Array.from({ length: 40 }, (_, i) =>
        Math.abs(Math.sin(i * 0.5 + t) * 0.7 + Math.sin(i * 0.2 + t * 0.8) * 0.3),
      );
      setAmplitude(bars);
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  // ── Text-To-Speech ────────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        // Pick a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.toLowerCase().includes("male") ||
              v.name.toLowerCase().includes("david") ||
              v.name.toLowerCase().includes("google uk english male") ||
              v.name.toLowerCase().includes("mark") ||
              v.name.toLowerCase().includes("james")),
        );
        if (preferred) utterance.voice = preferred;
        utterance.rate = 1.0;
        utterance.pitch = 0.9;
        utterance.volume = 1.0;

        utterance.onstart = () => {
          setIsSpeaking(true);
          setState("speaking");
          cancelAnimationFrame(animFrameRef.current);
          startSpeakingWave();
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setState("idle");
          cancelAnimationFrame(animFrameRef.current);
          setAmplitude(Array(40).fill(0));
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setState("idle");
          resolve();
        };

        window.speechSynthesis.speak(utterance);
        synthRef.current = window.speechSynthesis;
      });
    },
    [startSpeakingWave],
  );

  // ── Send message to backend ───────────────────────────────────────────────────
  const sendToBackend = useCallback(
    async (text: string) => {
      setState("processing");
      cancelAnimationFrame(animFrameRef.current);
      setAmplitude(Array(40).fill(0));

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch(`${BACKEND}/api/jarvis/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        let reply = "I'm having trouble reaching my core systems. Please check the backend server.";
        let type = "error";

        if (res.ok) {
          const data = await res.json();
          reply = data.reply || reply;
          type = data.type || "ai";
        }

        const jarvisMsg: Message = {
          id: `j-${Date.now()}`,
          role: "jarvis",
          text: reply,
          timestamp: new Date(),
          type,
        };
        setMessages((prev) => [...prev, jarvisMsg]);
        await speak(reply);
      } catch {
        const offlineReply = getOfflineReply(text);
        const jarvisMsg: Message = {
          id: `j-${Date.now()}`,
          role: "jarvis",
          text: offlineReply,
          timestamp: new Date(),
          type: "offline",
        };
        setMessages((prev) => [...prev, jarvisMsg]);
        await speak(offlineReply);
      }
    },
    [speak],
  );

  // ── Speech Recognition ────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (isListening) return;

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setError("Speech recognition is not supported in this browser. Please use Chrome.");
      setState("error");
      return;
    }

    const recognition = new SpeechRec();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState("listening");
      setIsListening(true);
      setTranscript("");
      setInterimTranscript("");
      setError(null);
      startMicVisualization();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        setInterimTranscript("");
      }
    };

    recognition.onend = async () => {
      setIsListening(false);
      stopMicVisualization();
      const finalText = transcript || interimTranscript;
      if (finalText.trim()) {
        await sendToBackend(finalText.trim());
      } else {
        setState("idle");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      stopMicVisualization();
      if (event.error === "no-speech") {
        setState("idle");
      } else if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone permissions.");
        setState("error");
      } else {
        setState("idle");
      }
    };

    recognition.start();
  }, [isListening, transcript, interimTranscript, startMicVisualization, stopMicVisualization, sendToBackend]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    stopMicVisualization();
  }, [stopMicVisualization]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setTranscript(text);
      await sendToBackend(text.trim());
    },
    [sendToBackend],
  );

  const openAssistant = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
    stopListening();
    window.speechSynthesis.cancel();
    cancelAnimationFrame(animFrameRef.current);
    setAmplitude(Array(40).fill(0));
    setState("idle");
    setIsSpeaking(false);
  }, [stopListening]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "jarvis",
        text: "Systems reset. How may I assist you, Sir?",
        timestamp: new Date(),
        type: "greeting",
      },
    ]);
  }, []);

  // Keyboard shortcut: Space = listen, Esc = close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.code === "Escape") closeAssistant();
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        if (isListening) stopListening();
        else startListening();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isListening, startListening, stopListening, closeAssistant]);

  // Voices load async in some browsers
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopMicVisualization();
      window.speechSynthesis.cancel();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [stopMicVisualization]);

  return {
    state,
    messages,
    transcript,
    interimTranscript,
    amplitude,
    error,
    isOpen,
    openAssistant,
    closeAssistant,
    startListening,
    stopListening,
    sendText,
    clearMessages,
    isSpeaking,
    isListening,
  };
}

// ── Offline fallback responses ─────────────────────────────────────────────────
function getOfflineReply(msg: string): string {
  const m = msg.toLowerCase();
  const now = new Date();
  if (m.includes("time")) return `The time is ${now.toLocaleTimeString("en-US", { hour12: true })}, Sir.`;
  if (m.includes("date")) return `Today is ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}, Sir.`;
  if (m.includes("hello") || m.includes("hi") || m.includes("hey"))
    return "Good day, Sir. I'm currently in limited offline mode. Please start the backend server for full functionality.";
  return "I'm unable to reach my core systems, Sir. Please ensure the backend server is running at http://127.0.0.1:5000";
}
