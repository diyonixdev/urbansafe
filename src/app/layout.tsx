import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { EmergencyProvider } from "@/components/emergency/EmergencyProvider";

export const metadata: Metadata = {
  title: "Aegis AI - Predict Danger Before It Happens",
  description: "Advanced AI-driven telemetry providing real-time threat detection and secure navigation for the modern metropolis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap" rel="stylesheet"/>
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider><AuthProvider><EmergencyProvider>{children}<ToastProvider /></EmergencyProvider></AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
