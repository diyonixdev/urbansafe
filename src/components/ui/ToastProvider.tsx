"use client";

import { Toaster } from "react-hot-toast";

const TOAST_STYLE: React.CSSProperties = {
  background: "#0f1418",
  color: "#e0e3e5",
  border: "1px solid rgba(0, 245, 255, 0.2)",
  boxShadow: "0 0 20px rgba(0, 245, 255, 0.08)",
  borderRadius: "12px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12px",
  letterSpacing: "0.02em",
  padding: "12px 16px",
};

/** Global toast host styled for the Aegis AI visual language. */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: TOAST_STYLE,
        duration: 3500,
        success: {
          iconTheme: { primary: "#00F5FF", secondary: "#02060A" },
        },
        error: {
          iconTheme: { primary: "#ff4d67", secondary: "#02060A" },
          style: { border: "1px solid rgba(255, 77, 103, 0.35)" },
        },
      }}
    />
  );
}
