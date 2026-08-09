"use client";

import { useEffect, useRef, useState } from "react";
import { AlertOctagon, Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { useEmergency, type SosSection } from "./EmergencyProvider";
import { PressHoldButton } from "./PressHoldButton";
import { SosChatbot } from "./SosChatbot";
import { EMERGENCY_TYPES } from "@/services/emergency-config";
import type { EmergencyTypeId } from "@/services/emergency-types";

const COUNTDOWN_START = 3;

interface EmergencyPanelProps {
  /** Renders inline on the /emergency page instead of inside a modal. */
  embedded?: boolean;
  /** Initial section to show. */
  initialSection?: SosSection;
}

/**
 * The UrbanSafe emergency interface: three ways to report an emergency.
 *
 *   A) Quick SOS — press and hold (progress fill) then a 3-2-1 countdown
 *      with an explicit cancel. No accidental single tap can send.
 *   B) Type — a short text description.
 *   C) Voice — browser microphone recording with preview.
 *
 * Every path activates the SAME shared mock emergency flow through
 * EmergencyContext (source MANUAL_SOS / VOICE_TRIGGER). This is a demo:
 * Police 100 and Emergency 112 are simulated UI states only — no real
 * emergency service is contacted and voice recordings are never analyzed
 * or uploaded.
 */
export function EmergencyPanel({ embedded = false, initialSection = "quick" }: EmergencyPanelProps) {
  const { activateEmergency } = useEmergency();

  const [type, setType] = useState<EmergencyTypeId>("general");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);

  /* Voice recording state */
  const [recStatus, setRecStatus] = useState<"idle" | "recording" | "recorded">("idle");
  const [recDuration, setRecDuration] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
      if (durationTimerRef.current !== null) window.clearInterval(durationTimerRef.current);
      stopRecorderTracks();
    };
  }, []);

  const stopRecorderTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

  /* ---------------------------------------------------------- */
  /* Quick SOS: hold -> countdown -> shared mock emergency       */
  /* ---------------------------------------------------------- */

  const beginCountdown = () => {
    if (countdown !== null) return;
    setCountdown(COUNTDOWN_START);
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((current) => {
        if (current === null) return null;
        if (current <= 1) {
          if (countdownTimerRef.current !== null) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          activateEmergency("MANUAL_SOS");
          return null;
        }
        return current - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  /* ---------------------------------------------------------- */
  /* Voice recording (local only — direct emergency trigger)     */
  /* ---------------------------------------------------------- */

  const startRecording = async () => {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(url);
        setRecStatus("recorded");
        setRecDuration(0);
        if (durationTimerRef.current !== null) {
          window.clearInterval(durationTimerRef.current);
          durationTimerRef.current = null;
        }
        stopRecorderTracks();
        // VOICE → DIRECT shared mock emergency: no AI, no transcription,
        // no upload. The completed recording itself is the activation.
        activateEmergency("VOICE_TRIGGER");
      };

      recorder.start();
      setRecStatus("recording");
      setRecDuration(0);
      durationTimerRef.current = window.setInterval(() => {
        setRecDuration((current) => current + 1);
      }, 1000);
    } catch {
      setRecError("Microphone access is needed to record your situation.");
      setRecStatus("idle");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const recordAgain = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecStatus("idle");
  };

  const playRecording = () => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    void audio.play();
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  /* ---------------------------------------------------------- */
  /* Render                                                      */
  /* ---------------------------------------------------------- */

  return (
    <div className={`em-panel ${embedded ? "em-panel-embedded" : ""}`}>
      {/* OPTION C — QUICK SOS */}
      <section className="em-section" id="em-quick">
        <h3>🚨 SEND SOS</h3>
        <p>Start the UrbanSafe emergency demo without typing or recording. Police 100 and Emergency 112 are simulated only.</p>

        {countdown !== null ? (
          <div className="em-countdown" role="alert">
            <div className="em-countdown-label">Activating emergency demo in {countdown}…</div>
            <div className="em-countdown-track" aria-hidden="true">
              {Array.from({ length: COUNTDOWN_START }).map((_, index) => (
                <span key={index} className={index < countdown ? "em-countdown-on" : ""} />
              ))}
            </div>
            <button type="button" className="em-countdown-cancel" onClick={cancelCountdown}>
              CANCEL
            </button>
          </div>
        ) : (
          <PressHoldButton
            label="HOLD TO SEND SOS"
            onComplete={beginCountdown}
            onCancel={cancelCountdown}
          />
        )}
      </section>

      {/* OPTIONAL — EMERGENCY TYPE */}
      <section className="em-section">
        <h3>Emergency type</h3>
        <p>Optional — pick what happened.</p>
        <div className="em-types">
          {EMERGENCY_TYPES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={type === option.id ? "em-type-on" : ""}
              onClick={() => setType(option.id)}
              aria-pressed={type === option.id}
            >
              <span>{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* OPTION A — TYPE */}
      <section className="em-section" id="em-text">
        <h3>Describe what happened</h3>
        <p>Add a short description to review before starting the emergency demo.</p>
        <textarea
          className="em-textarea"
          placeholder="Tell us what happened…"
          rows={4}
          maxLength={500}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-label="Describe what happened"
        />
        <button
          type="button"
          className="em-send-btn"
          disabled={!message.trim()}
          onClick={() => activateEmergency("MANUAL_SOS")}
        >
          <AlertOctagon size={15} />
          Send Emergency Alert
        </button>
      </section>

      {/* OPTION B — VOICE */}
      <section className="em-section" id="em-voice">
        <h3>Record your situation</h3>
        <p>Stopping the recording directly activates the emergency demo. Your recording stays on this device — it is never analyzed or uploaded.</p>

        {recStatus === "idle" && (
          <button type="button" className="em-voice-btn" onClick={() => void startRecording()}>
            <Mic size={17} /> 🎙 Record Voice
          </button>
        )}

        {recStatus === "recording" && (
          <div className="em-recording" role="status">
            <span className="em-rec-dot" />
            <b>Recording…</b>
            <span className="em-rec-duration">{formatDuration(recDuration)}</span>
            <button type="button" className="em-stop-btn" onClick={stopRecording}>
              <Square size={13} /> Stop Recording
            </button>
          </div>
        )}

        {recStatus === "recorded" && audioUrl && (
          <div className="em-recorded">
            <span className="em-rec-done">✓ Recording ready · {formatDuration(recDuration)}</span>
            <div className="em-recorded-actions">
              <button type="button" className="em-mini-btn" onClick={playRecording}><Play size={14} /> Play</button>
              <button type="button" className="em-mini-btn" onClick={recordAgain}><Pause size={14} /> Record Again</button>
            </div>
          </div>
        )}

        {recError && (
          <p className="em-rec-error">
            <Trash2 size={14} /> {recError}
          </p>
        )}
      </section>

      {/* OPTION D — CHATBOT */}
      <section className="em-section" id="em-chat">
        <h3>AI Emergency Guidance</h3>
        <p>Chat with our AI assistant for immediate first-aid or safety instructions.</p>
        <SosChatbot />
      </section>

      {/* FOOTER NOTE */}
      <div className="em-note">
        <p>
          <b>This emergency flow is a DEMO.</b> Police 100 and Emergency 112 are simulated UI states only — no real emergency service is contacted and no real alerts are sent to nearby users.
        </p>
        <p>
          UrbanSafe does not automatically contact police, ambulance or other emergency services. In a real emergency, call them directly:
          <b> Police 100</b> · <b>Ambulance 108</b>.
        </p>
      </div>
    </div>
  );
}
