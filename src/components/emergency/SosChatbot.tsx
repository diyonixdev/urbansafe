"use client";

import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Loader2, Send, Bot, User, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  appendAdvice,
  captureQuestion,
  createEmergencyState,
  updateEmergencyState
} from "@/services/emergencyAI";
import type { EmergencyState } from "@/services/emergencyAI";
import type { ThreatAssessment } from "@/services/threatAssessment";
import { useEmergency } from "./EmergencyProvider";

interface Message {
  role: "user" | "assistant";
  content: string;
  /** Assistant turn that is an image-analysis result (labeled "Alex's assessment"). */
  assessment?: boolean;
  /** Unified AI threat assessment (TEXT/PHOTO). VOICE never produces one. */
  threat?: ThreatAssessment;
}

interface SelectedImage {
  file: File;
  url: string;
}

interface RecordedAudio {
  blob: Blob;
  url: string;
  durationSeconds: number;
}

/** Only the most recent messages are sent to the AI (longer-term facts live in memory). */
const MAX_API_HISTORY = 20;

/** Allowed photo upload types (no video in this phase). */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Voice recording limits (local only — nothing is uploaded in this phase). */
const MAX_RECORDING_SECONDS = 300; // 5 min

function getPreferredRecorderMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function SosChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I'm Alex, your UrbanSafe emergency assistant. I'll help you one step at a time. Tell me what's happening." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<EmergencyState>(createEmergencyState());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { activateEmergency } = useEmergency();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, analyzing, selectedImage, recordedAudio, recording]);

  useEffect(() => {
    return () => {
      if (selectedImage) URL.revokeObjectURL(selectedImage.url);
    };
  }, [selectedImage]);

  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedAudio) URL.revokeObjectURL(recordedAudio.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setAudioPlaying(false);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [recordedAudio]);

  const stopMediaTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !recordedAudio) return;
    if (audio.paused) {
      audio.play().catch(() => setAudioPlaying(false));
      setAudioPlaying(true);
    } else {
      audio.pause();
      setAudioPlaying(false);
    }
  };

  const REQUEST_TIMEOUT_MS = 120_000;

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image is too large. Please upload an image under 10 MB.");
      return;
    }
    setSelectedImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };

  const clearSelectedImage = () => {
    setSelectedImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const startRecording = async () => {
    if (recording) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const err = error as { name?: string };
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        toast.error("Microphone access was denied. Please allow microphone access to record.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        toast.error("No microphone was found on this device.");
      } else {
        toast.error("Couldn't start recording. Please try again.");
      }
      return;
    }

    try {
      const mimeType = getPreferredRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        stopMediaTracks();
        stopTimer();
        setRecording(false);
        setRecordedAudio((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return { blob, url: URL.createObjectURL(blob), durationSeconds: recordingSeconds };
        });
        // VOICE → DIRECT shared mock emergency: no AI, no speech-to-text,
        // no upload. The recording stays local; the voice recording itself
        // is the user's emergency activation action.
        activateEmergency("VOICE_TRIGGER");
      };
      recorder.onerror = () => {
        stopTimer();
        stopMediaTracks();
        setRecording(false);
        toast.error("Recording failed. Please try again.");
      };
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      stopMediaTracks();
      toast.error("Recording isn't supported in this browser. Please try a different browser.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  };

  useEffect(() => {
    if (recording && recordingSeconds >= MAX_RECORDING_SECONDS) {
      stopRecording();
    }
  }, [recording, recordingSeconds]);

  const deleteRecording = () => {
    setAudioPlaying(false);
    setRecordedAudio((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const analyzeImage = async () => {
    if (!selectedImage || analyzing) return;

    setAnalyzing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const formData = new FormData();
      formData.append("image", selectedImage.file);

      const response = await fetch("/api/alex/analyze-image", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });

      // A development-server error overlay can be HTML rather than the API's
      // normal JSON response. Treat it as a recoverable API failure instead
      // of throwing a second client-side console error/overlay.
      const rawBody = await response.text();
      let parsed: unknown = null;
      if (rawBody) {
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          // The assistant message below gives the user a safe fallback. The
          // server-side route retains the diagnostic details for debugging.
        }
      }

      const data = (parsed ?? {}) as { analysis?: string; threat?: ThreatAssessment; error?: string };
      const analysis = typeof data.analysis === "string" ? data.analysis.trim() : "";
      if (response.ok && analysis.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: analysis,
            assessment: true,
            threat: data.threat
          }
        ]);
        clearSelectedImage();
        return;
      }

      const fallback = data.error || "Alex couldn't analyze this image right now. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Image analysis timed out. Please try again." }
        ]);
      } else {
        if (process.env.NODE_ENV === "development") {
          console.error("[SosChatbot] image analysis network error", { error });
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Alex couldn't analyze this image right now. Please try again." }
        ]);
      }
    } finally {
      clearTimeout(timeoutId);
      setAnalyzing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    stateRef.current = updateEmergencyState(stateRef.current, userMessage);
    const currentState = stateRef.current;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const postError = (code: string, fallback: string) => {
      if (process.env.NODE_ENV === "development") {
        console.error(`[SosChatbot] AI chat failed (${code})`, { code });
      }
      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.slice(-MAX_API_HISTORY), state: currentState }),
        signal: controller.signal
      });

      let parsed: unknown = null;
      try {
        parsed = await response.json();
      } catch {
        if (process.env.NODE_ENV === "development") {
          console.error(`[SosChatbot] AI chat failed (http_${response.status}): non-JSON response body`);
        }
      }

      if (response.ok && parsed && typeof parsed === "object") {
        const data = parsed as { response?: string; threat?: ThreatAssessment };
        const aiReply = data.response?.trim() || "Sorry, I couldn't process that. Please try again.";
        stateRef.current = appendAdvice(captureQuestion(stateRef.current, aiReply), aiReply);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: aiReply, threat: data.threat }
        ]);
        return;
      }

      const errorBody =
        !response.ok && parsed && typeof parsed === "object"
          ? (parsed as { error?: string; status?: number })
          : null;
      const serverMessage = errorBody?.error;
      if (process.env.NODE_ENV === "development") {
        console.error(`[SosChatbot] AI chat failed (http_${response.status})`, {
          serverMessage: serverMessage ?? "no error message in response body"
        });
      }

      const isConfigError =
        response.status >= 500 &&
        (serverMessage?.includes("OPENROUTER_API_KEY") || serverMessage?.includes("not configured"));
      const fallback = isConfigError
        ? "AI service is not configured yet. Please try again later."
        : response.status === 401 || response.status === 403
          ? "The AI service rejected this request. Please try again later."
          : response.status === 429
            ? "The AI service is busy right now. Please try again in a moment."
            : response.status === 400
              ? "Your message could not be processed. Please rephrase and try again."
              : response.status === 502 || response.status === 503
                ? "The AI service is having issues right now. Please try again."
                : serverMessage || "Error connecting to AI service. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        postError("timeout", "The AI service took too long to respond. Please try again.");
      } else {
        postError("network", "Unable to reach the AI service. Please check your connection and try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="em-chatbot-container">
      <div className="em-chatbot-header">
        <Bot size={18} />
        <h4>AI Emergency Guidance</h4>
      </div>
      
      <div className="em-chatbot-warning">
        <AlertTriangle size={14} />
        <span>Do not replace professional emergency services with AI. Call 100/108 in critical situations.</span>
      </div>

      <div className="em-chatbot-messages" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`em-chatbot-msg ${msg.role === "user" ? "user-msg" : "ai-msg"}`}>
            <div className="msg-icon">
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="msg-content">
              {msg.role === "assistant" && msg.assessment && (
                <div className="em-chatbot-assessment-label">Alex&apos;s assessment</div>
              )}
              {msg.content}
              {msg.role === "assistant" && msg.threat && msg.threat.detected && (
                <div className="em-chatbot-danger">
                  <div className="em-chatbot-danger-text em-threat-heading">⚠️ Potential Emergency Detected</div>
                  <div className="em-threat-line">Alex detected a possible safety threat.</div>
                  <div className="em-threat-line">
                    Risk: <b>{msg.threat.riskLevel}</b>
                  </div>
                  {msg.threat.reason && (
                    <div className="em-threat-line">Reason: {msg.threat.reason}</div>
                  )}
                  <button
                    type="button"
                    className="em-chatbot-danger-btn"
                    onClick={() => activateEmergency("AI_THREAT_DETECTION")}
                  >
                    🚨 ACTIVATE MOCK EMERGENCY
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="em-chatbot-msg ai-msg">
            <div className="msg-icon"><Bot size={14} /></div>
            <div className="msg-content"><Loader2 size={14} className="em-spin" /></div>
          </div>
        )}
        {analyzing && (
          <div className="em-chatbot-msg ai-msg">
            <div className="msg-icon"><Bot size={14} /></div>
            <div className="msg-content em-chatbot-analyzing">
              <Loader2 size={14} className="em-spin" />
              <span>Alex is analyzing the image...</span>
            </div>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="em-chatbot-preview">
          <img src={selectedImage.url} alt="Selected photo" className="em-chatbot-preview-img" />
          <div className="em-chatbot-preview-meta">{selectedImage.file.name}</div>
          <div className="em-chatbot-preview-actions">
            <label className={`em-chatbot-secondary-btn${analyzing ? " em-disabled" : ""}`}>
              Change Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                disabled={analyzing}
                hidden
              />
            </label>
            <button
              type="button"
              className="em-chatbot-analyze-btn"
              onClick={analyzeImage}
              disabled={analyzing}
            >
              {analyzing ? "Analyzing..." : "Analyze with Alex"}
            </button>
            <button
              type="button"
              className="em-chatbot-remove-btn"
              onClick={clearSelectedImage}
              disabled={analyzing}
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {recording && (
        <div className="em-chatbot-preview em-chatbot-recording">
          <div className="em-chatbot-record-indicator" aria-hidden="true" />
          <span className="em-chatbot-record-label">🔴 Recording... {formatDuration(recordingSeconds)}</span>
          <button type="button" className="em-chatbot-stop-btn" onClick={stopRecording}>
            Stop Recording
          </button>
        </div>
      )}

      {recordedAudio && !recording && (
        <div className="em-chatbot-preview">
          <audio ref={audioRef} src={recordedAudio.url} preload="metadata" />
          <div className="em-chatbot-preview-meta">
            🎤 Voice recording · {formatDuration(recordedAudio.durationSeconds)}
          </div>
          <div className="em-chatbot-preview-actions">
            <button
              type="button"
              className="em-chatbot-secondary-btn"
              onClick={togglePlayback}
            >
              {audioPlaying ? "⏸ Pause Recording" : "▶ Play Recording"}
            </button>
            <button
              type="button"
              className="em-chatbot-secondary-btn"
              onClick={deleteRecording}
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}

      <div className="em-chatbot-input">
        <label className={`em-chatbot-photo-btn${analyzing ? " em-disabled" : ""}`} title="Upload photo">
          <span>📷 Upload Photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={analyzing}
            hidden
          />
        </label>
        <button
          type="button"
          className={`em-chatbot-voice-btn${recording ? " em-recording" : ""}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={analyzing}
          title={recording ? "Stop recording" : "Record voice"}
        >
          {recording ? "🔴 Stop" : "🎤 Record Voice"}
        </button>
        <input 
          type="text" 
          placeholder="Type your emergency query..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <button type="button" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
