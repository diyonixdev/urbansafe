"use client";

import { useEffect, useRef, useState } from "react";
import { AlertOctagon, Loader2, MapPin, Mic, Pause, Play, ShieldAlert, Square, Trash2 } from "lucide-react";
import { useEmergency, type SosSection } from "./EmergencyProvider";
import { PressHoldButton } from "./PressHoldButton";
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
 * Location is attached automatically when permission is granted; the
 * reporter is asked for permission otherwise (never recorded silently).
 */
export function EmergencyPanel({ embedded = false, initialSection = "quick" }: EmergencyPanelProps) {
  const { activeEvent, location, sending, refreshLocation, sendSos, cancelEmergency } = useEmergency();

  const [type, setType] = useState<EmergencyTypeId>("general");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [locationBanner, setLocationBanner] = useState(false);
  const [resolvedShown, setResolvedShown] = useState(false);

  /* Voice recording state */
  const [recStatus, setRecStatus] = useState<"idle" | "recording" | "recorded">("idle");
  const [recDuration, setRecDuration] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const locationShared = location !== null && (location.permission === "granted" || location.permission === "demo");

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
  /* Quick SOS: hold -> countdown -> send                        */
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
          void handleSend(null);
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
  /* Sending                                                     */
  /* ---------------------------------------------------------- */

  const handleSend = async (audio: Blob | null) => {
    setLocationBanner(false);
    cancelCountdown();
    try {
      await sendSos({ type, message: message.trim() || null, audio });
    } catch (error) {
      if (String(error instanceof Error ? error.message : error).includes("LOCATION_REQUIRED")) {
        setLocationBanner(true);
      } else {
        setLocationBanner(true);
      }
    }
  };

  const handleCancelEmergency = async () => {
    await cancelEmergency();
    setResolvedShown(true);
    window.setTimeout(() => setResolvedShown(false), 5000);
  };

  /* ---------------------------------------------------------- */
  /* Voice recording                                             */
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
        audioBlobRef.current = blob;
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
    audioBlobRef.current = null;
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
      {resolvedShown && (
        <div className="em-resolved" role="status">
          <ShieldAlert size={16} />
          Emergency resolved
        </div>
      )}

      {locationBanner && !resolvedShown && (
        <div className="em-location-banner" role="alert">
          <MapPin size={15} />
          <div>
            <b>Location access is needed to share your emergency location.</b>
            <span>Nearby users can only be notified when your approximate location is available.</span>
          </div>
          <button type="button" onClick={() => void refreshLocation().then(() => setLocationBanner(false))}>
            Enable location
          </button>
        </div>
      )}

      {activeEvent && !resolvedShown ? (
        <div className="em-active" role="status">
          <div className="em-active-head">
            <span className="em-active-pulse"><AlertOctagon size={20} /></span>
            <div>
              <h3>SOS ACTIVE</h3>
              <p>Emergency alert sent.</p>
            </div>
          </div>
          <ul>
            <li><span className="em-check">✓</span>Emergency alert sent.</li>
            <li><span className="em-check">✓</span>Nearby UrbanSafe users have been notified.</li>
            <li>
              <span className="em-check">✓</span>
              Location shared: <b>{locationShared ? "Yes" : "No"}</b>
            </li>
          </ul>
          <button type="button" className="em-cancel-btn" onClick={() => void handleCancelEmergency()}>
            Cancel Emergency
          </button>
          <p className="em-active-note">In a serious emergency, also call local emergency services (Police 100 · Ambulance 108).</p>
        </div>
      ) : (
        <>
          {/* OPTION C — QUICK SOS */}
          <section className="em-section" id="em-quick">
            <h3>🚨 SEND SOS</h3>
            <p>Send an emergency alert to nearby UrbanSafe users without typing or recording.</p>

            {countdown !== null ? (
              <div className="em-countdown" role="alert">
                <div className="em-countdown-label">Sending emergency alert in {countdown}…</div>
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
                disabled={sending}
              />
            )}
            {sending && (
              <div className="em-sending"><Loader2 size={15} className="em-spin" />Sending emergency alert…</div>
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
            <p>Add a short description so nearby users know how to help.</p>
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
              disabled={!message.trim() || sending}
              onClick={() => void handleSend(null)}
            >
              {sending ? <Loader2 size={15} className="em-spin" /> : <AlertOctagon size={15} />}
              Send Emergency Alert
            </button>
          </section>

          {/* OPTION B — VOICE */}
          <section className="em-section" id="em-voice">
            <h3>Record your situation</h3>
            <p>Your recording stays private to you and your emergency record.</p>

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
                  <button
                    type="button"
                    className="em-send-btn em-send-voice"
                    disabled={sending}
                    onClick={() => void handleSend(audioBlobRef.current)}
                  >
                    {sending ? <Loader2 size={15} className="em-spin" /> : <AlertOctagon size={15} />}
                    Send Emergency Alert
                  </button>
                </div>
              </div>
            )}

            {recError && (
              <p className="em-rec-error">
                <Trash2 size={14} /> {recError}
              </p>
            )}
          </section>

          {/* FOOTER NOTE */}
          <div className="em-note">
            <p>
              <b>Nearby UrbanSafe users have been notified</b> when you send an SOS. Your identity and exact location are never shared publicly.
            </p>
            <p>
              UrbanSafe does not automatically contact police, ambulance or other emergency services. In an emergency, call them directly:
              <b> Police 100</b> · <b>Ambulance 108</b>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
