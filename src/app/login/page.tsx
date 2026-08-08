"use client";

import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { isValidEmail, isValidPassword } from "@/lib/validation";
import { sendPasswordReset } from "@/firebase/auth";

function LoginField({ label, icon, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; icon: ReactNode; error?: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</span><span className="relative block"><span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">{icon}</span><input {...props} className={`w-full rounded-xl border px-4 py-3 pl-11 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-500/15 ${error ? "border-[var(--danger)]" : "border-[var(--border)]"}`} style={{ backgroundColor: "var(--card-secondary, var(--card-bg))", color: "var(--foreground)" }} /></span>{error && <span className="mt-1.5 block text-xs font-medium text-[var(--danger)]">{error}</span>}</label>;
}

export default function LoginPage() {
  const { user, loading, login, googleLogin, demoMode, demoLogin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>(); const [passwordError, setPasswordError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false); const [googleSubmitting, setGoogleSubmitting] = useState(false); const [resetSending, setResetSending] = useState(false); const [demoSubmitting, setDemoSubmitting] = useState(false);

  useEffect(() => { document.title = "Sign in | UrbanSafe"; if (!loading && user) router.replace("/dashboard"); }, [user, loading, router]);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim(); const nextEmailError = isValidEmail(normalizedEmail) ? undefined : "Please enter a valid email address."; const nextPasswordError = isValidPassword(password) ? undefined : "Password must be at least 6 characters.";
    setEmailError(nextEmailError); setPasswordError(nextPasswordError); if (nextEmailError || nextPasswordError) return;
    setSubmitting(true); try { await login(normalizedEmail, password); router.replace("/dashboard"); } catch (error) { toast.error(getAuthErrorMessage(error)); } finally { setSubmitting(false); }
  };
  const handleGoogleLogin = async () => { setGoogleSubmitting(true); try { await googleLogin(); router.replace("/dashboard"); } catch (error) { toast.error(getAuthErrorMessage(error)); } finally { setGoogleSubmitting(false); } };
  const handleDemoLogin = async () => { setDemoSubmitting(true); try { await demoLogin(email.trim() || "demo-a@urbansafe.test"); router.replace("/dashboard"); } catch (error) { toast.error(getAuthErrorMessage(error)); } finally { setDemoSubmitting(false); } };
  const handleForgotPassword = async () => { const normalizedEmail = email.trim(); if (!isValidEmail(normalizedEmail)) { toast.error("Enter your email above first."); return; } setResetSending(true); try { await sendPasswordReset(normalizedEmail); toast.success("Password reset link sent. Check your inbox."); } catch (error) { toast.error(getAuthErrorMessage(error)); } finally { setResetSending(false); } };

  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10 sm:px-6">
    <section className="w-full max-w-[460px]">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm sm:p-8">
        <header className="mb-7 text-center"><Link href="/" className="mb-4 inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--foreground)]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)] text-white"><ShieldCheck size={23} /></span>UrbanSafe</Link><h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Sign in to UrbanSafe</h1><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Sign in to access your UrbanSafe safety dashboard.</p></header>
        {loading ? <div className="flex min-h-52 items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" aria-label="Loading" /></div> : <><form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <LoginField label="Email" icon={<Mail size={18} />} type="email" placeholder="Enter your email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} error={emailError} />
          <LoginField label="Password" icon={<Lock size={18} />} type="password" placeholder="Enter your password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} error={passwordError} />
          <div className="flex justify-end"><button type="button" onClick={handleForgotPassword} disabled={resetSending} className="text-sm font-medium text-[var(--primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-60">{resetSending ? "Sending…" : "Forgot password?"}</button></div>
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Signing in…" : "Sign In"}</button>
        </form>
        <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-[var(--border)]" /><span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">or</span><span className="h-px flex-1 bg-[var(--border)]" /></div>
        <button type="button" onClick={handleGoogleLogin} disabled={googleSubmitting} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-blue-300 hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-60">{googleSubmitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />Connecting…</> : <><GoogleMark />Continue with Google</>}</button>
        {demoMode && <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-secondary,var(--card-bg))] p-4">
          <p className="mb-3 text-xs font-medium leading-5 text-[var(--text-muted)]">Demo mode — Firebase is not configured. Use demo accounts to try the app (for example <b className="text-[var(--foreground)]">demo-a@urbansafe.test</b> or <b className="text-[var(--foreground)]">demo-b@urbansafe.test</b>). Open two tabs with different demo users to test community SOS.</p>
          <button type="button" onClick={handleDemoLogin} disabled={demoSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">{demoSubmitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Starting demo…</> : <><ShieldCheck size={16} />Continue as demo user</>}</button>
        </div>}
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">Don&apos;t have an account? <Link href="/signup" className="font-semibold text-[var(--primary)] hover:underline">Sign up</Link></p></>}
      </div>
    </section>
  </main>;
}

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.27 14.29A7.18 7.18 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" /><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" /></svg>;
}
