"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { isValidEmail, isValidPassword } from "@/lib/validation";
import { sendPasswordReset } from "@/firebase/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";
import { PageLoader } from "@/components/ui/PageLoader";

export default function LoginPage() {
  const { user, loading, login, googleLogin } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) return <PageLoader />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim();
    const nextEmailError = isValidEmail(normalizedEmail)
      ? undefined
      : "Please enter a valid email address.";
    const nextPasswordError = isValidPassword(password)
      ? undefined
      : "Password must be at least 6 characters.";

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;

    setSubmitting(true);
    try {
      await login(normalizedEmail, password);
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleSubmitting(true);
    try {
      await googleLogin();
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      toast.error("Enter your email above first.");
      return;
    }
    setResetSending(true);
    try {
      await sendPasswordReset(normalizedEmail);
      toast.success("Password reset link sent. Check your inbox.");
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setResetSending(false);
    }
  };

  return (
    <AuthShell
      title="Sign In"
      subtitle="Authenticate to access the tactical intelligence network."
      footer={
        <p className="text-center font-body-md text-on-surface-variant/60 text-sm">
          New operator?{" "}
          <Link
            href="/signup"
            className="text-neon-cyan hover:text-white transition-colors font-medium hover-target"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full" noValidate>
        <AuthInput
          label="Email"
          type="email"
          placeholder="operator@aegis.def"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          icon={<span className="material-symbols-outlined">mail</span>}
        />
        <AuthInput
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
          icon={<span className="material-symbols-outlined">lock</span>}
        />

        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetSending}
            className="font-code-sm text-on-surface-variant/60 hover:text-neon-cyan transition-colors text-[11px] uppercase tracking-widest hover-target disabled:opacity-50"
          >
            {resetSending ? "Sending…" : "Forgot password?"}
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="hologram-capsule text-neon-cyan w-full px-8 py-3 font-data-label font-bold tracking-widest text-xs flex items-center justify-center gap-2 hover-target disabled:opacity-60 disabled:pointer-events-none"
        >
          {submitting ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
              AUTHENTICATING…
            </>
          ) : (
            <>
              INITIALIZE SESSION
              <span className="material-symbols-outlined text-sm">login</span>
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-4 w-full">
        <span className="flex-1 h-[1px] bg-white/10" />
        <span className="font-code-sm text-on-surface-variant/50 uppercase tracking-widest text-[10px]">
          or
        </span>
        <span className="flex-1 h-[1px] bg-white/10" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleSubmitting}
        className="w-full glass-panel rounded-lg border border-white/15 hover:bg-white/[0.06] transition-colors px-8 py-3 font-data-label tracking-widest text-xs text-white flex items-center justify-center gap-3 hover-target disabled:opacity-60 disabled:pointer-events-none"
      >
        {googleSubmitting ? (
          <>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            CONNECTING…
          </>
        ) : (
          <>
            <GoogleMark />
            CONTINUE WITH GOOGLE
          </>
        )}
      </button>
    </AuthShell>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.18 7.18 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
