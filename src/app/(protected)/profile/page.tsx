"use client";

import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { user, profile } = useAuth();

  const fields = [
    { label: "UID", value: user?.uid ?? "…" },
    { label: "Name", value: profile?.name ?? user?.displayName ?? "…" },
    { label: "Username", value: profile?.username ?? "…" },
    { label: "Email", value: profile?.email ?? user?.email ?? "…" },
    { label: "Bio", value: profile?.bio ?? "" },
    { label: "Plan", value: profile?.plan ?? "Free" },
    { label: "Verified", value: profile?.verified ? "Yes" : "No" },
    {
      label: "Joined",
      value: profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString()
        : "…",
    },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <p className="font-code-sm text-neon-cyan uppercase tracking-[0.3em] text-glow text-xs flex items-center gap-3">
          <span className="w-8 h-[1px] bg-neon-cyan inline-block"></span>
          Operator Profile
        </p>
        <h1 className="font-display-lg-mobile text-3xl md:text-4xl font-bold text-white tracking-tight mt-2">
          Profile
        </h1>
      </div>

      <div className="glass-panel rounded-2xl p-8 relative overflow-hidden flex flex-col gap-6">
        <span className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />

        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-electric-blue to-neon-cyan p-[1.5px] shrink-0">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-2xl font-bold text-neon-cyan">
              {(profile?.name ?? user?.displayName ?? "O").charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <p className="font-headline-md text-xl text-white tracking-tight">
              {profile?.name ?? user?.displayName ?? "Operator"}
            </p>
            <p className="font-code-sm text-on-surface-variant/60 text-xs uppercase tracking-widest mt-1">
              @{profile?.username ?? "…"} · {profile?.plan ?? "Free"} plan
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          {fields.map((field) => (
            <div key={field.label} className="flex flex-col gap-1">
              <dt className="font-code-sm text-on-surface-variant/60 uppercase tracking-[0.2em] text-[10px]">
                {field.label}
              </dt>
              <dd className="font-body-md text-white text-sm break-all">
                {field.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
