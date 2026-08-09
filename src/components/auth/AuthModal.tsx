"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, EyeOff, Mail, Lock, User, ShieldCheck } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { sendPasswordReset } from "@/firebase/auth";
import toast from "react-hot-toast";

export type AuthMode = "login" | "signup" | "forgot_password";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: AuthMode;
}

export function AuthModal({ isOpen, onClose, defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, signup, googleLogin } = useAuthContext();

  // Reset state when opening/closing or switching modes
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setShowPassword(false);
      setAcceptedTerms(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, defaultMode]);

  useEffect(() => {
    setError(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "forgot_password") {
      if (!email) {
        setError("Please enter your email address.");
        return;
      }
      setIsSubmitting(true);
      try {
        await sendPasswordReset(email);
        toast.success("Password reset email sent! Please check your inbox.");
        setMode("login");
      } catch (err: any) {
        setError(err.message || "Failed to send reset email.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!acceptedTerms) {
        setError("You must accept the Terms & Conditions.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await googleLogin();
      onClose();
    } catch (err: any) {
      setError(err.message || "Google login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2">
              <div className="flex items-center gap-2 text-blue-600">
                <ShieldCheck size={24} />
                <span className="font-bold text-lg text-slate-900 tracking-tight">UrbanSafe</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 pt-4 pb-8 flex-1 overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
                {mode === "login" ? "Welcome back" : mode === "signup" ? "Create an account" : "Reset Password"}
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                {mode === "login" 
                  ? "Enter your details to access your account." 
                  : mode === "signup"
                  ? "Join UrbanSafe to plan safer routes and access emergency features."
                  : "Enter your email address to receive a password reset link."}
              </p>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium flex items-start gap-2">
                  <div className="mt-0.5"><X size={14} className="bg-red-200 text-red-600 rounded-full" /></div>
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === "signup" && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
                    />
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
                  />
                </div>

                {mode !== "forgot_password" && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock size={18} className="text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}

                {mode === "signup" && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock size={18} className="text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
                    />
                  </div>
                )}

                {mode === "login" ? (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" className="peer sr-only" />
                        <div className="w-4 h-4 rounded border border-slate-300 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                        <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                          <path d="M3 8L6 11L11 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"></path>
                        </svg>
                      </div>
                      <span className="text-slate-600 group-hover:text-slate-900 transition-colors font-medium">Remember me</span>
                    </label>
                    <button type="button" onClick={() => setMode("forgot_password")} className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                      Forgot password?
                    </button>
                  </div>
                ) : mode === "signup" ? (
                  <div className="flex items-start gap-2 mt-1">
                    <label className="flex items-start gap-2 cursor-pointer group mt-0.5">
                      <div className="relative flex items-center justify-center shrink-0">
                        <input 
                          type="checkbox" 
                          required
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="peer sr-only" 
                        />
                        <div className="w-4 h-4 rounded border border-slate-300 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                        <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                          <path d="M3 8L6 11L11 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"></path>
                        </svg>
                      </div>
                      <span className="text-slate-600 text-xs font-medium leading-relaxed group-hover:text-slate-900 transition-colors">
                        I agree to the <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                      </span>
                    </label>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-bold shadow-sm shadow-blue-600/20 transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"
                  )}
                </button>
              </form>

              {mode !== "forgot_password" && (
                <>
                  <div className="mt-6 relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative px-4 bg-white text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Or continue with
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="w-full mt-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </button>
                </>
              )}

              <p className="mt-8 text-center text-sm text-slate-500 font-medium">
                {mode === "login" ? "Don't have an account?" : mode === "signup" ? "Already have an account?" : "Remembered your password?"}{" "}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-blue-600 hover:text-blue-700 font-bold hover:underline transition-all"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
