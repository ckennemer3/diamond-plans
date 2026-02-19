"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const supabase = createClient();

  // Magic link state
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicFailed, setMagicFailed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sendingMagic, setSendingMagic] = useState(false);

  // Password login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Error from URL (e.g. ?error=auth)
  const [urlError, setUrlError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "auth") {
        setUrlError(true);
      }
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSendMagicLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!magicEmail || cooldown > 0 || sendingMagic) return;

      setSendingMagic(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: magicEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setMagicFailed(true);
          toast.error(error.message ?? "Failed to send magic link.");
        } else {
          setMagicSent(true);
          setMagicFailed(false);
          setCooldown(COOLDOWN_SECONDS);
          toast.success("Magic link sent!");
        }
      } finally {
        setSendingMagic(false);
      }
    },
    [magicEmail, cooldown, sendingMagic, supabase]
  );

  const handleResendMagicLink = useCallback(async () => {
    if (cooldown > 0 || sendingMagic) return;

    setSendingMagic(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMagicFailed(true);
        toast.error(error.message ?? "Failed to resend magic link.");
      } else {
        setMagicFailed(false);
        setCooldown(COOLDOWN_SECONDS);
        toast.success("Magic link resent!");
      }
    } finally {
      setSendingMagic(false);
    }
  }, [magicEmail, cooldown, sendingMagic, supabase]);

  const handlePasswordSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password || signingIn) return;

      setSigningIn(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message ?? "Sign in failed. Please try again.");
        } else {
          window.location.href = "/dashboard";
        }
      } finally {
        setSigningIn(false);
      }
    },
    [email, password, signingIn, supabase]
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* Header */}
      <div className="w-full max-w-sm mb-8 text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {/* Baseball diamond icon */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="16"
              y="3"
              width="18"
              height="18"
              rx="2"
              transform="rotate(45 16 3)"
              fill="#f97316"
            />
          </svg>
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--primary)" }}
        >
          Diamond Plans
        </h1>
        <p className="mt-1 text-base" style={{ color: "#6b7280" }}>
          Baseball practice management
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-sm border"
        style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
      >
        {urlError && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}
          >
            Authentication failed. Please try again.
          </div>
        )}

        {/* ---- Magic Link Section ---- */}
        {!magicSent ? (
          <form onSubmit={handleSendMagicLink} noValidate>
            <label
              htmlFor="magic-email"
              className="block text-sm font-semibold mb-1"
              style={{ color: "var(--primary)" }}
            >
              Email address
            </label>
            <input
              id="magic-email"
              type="email"
              autoComplete="email"
              required
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              placeholder="coach@team.com"
              className="w-full rounded-xl border px-4 text-base outline-none transition focus:ring-2"
              style={{
                borderColor: "#d1d5db",
                color: "var(--foreground)",
                minHeight: "48px",
              }}
            />
            <button
              type="submit"
              disabled={!magicEmail || sendingMagic}
              className="mt-3 w-full rounded-xl font-semibold text-base text-white transition active:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent)",
                minHeight: "48px",
              }}
            >
              {sendingMagic ? "Sending…" : "Send Magic Link"}
            </button>
          </form>
        ) : (
          <div>
            <div
              className="rounded-xl p-4 text-sm mb-3"
              style={{ backgroundColor: "#f0fdf4", color: "#166534" }}
            >
              <p className="font-semibold mb-1">Check your inbox!</p>
              <p>
                We sent a link to{" "}
                <span className="font-medium">{magicEmail}</span>. Check your
                email including your spam folder. The link expires in 1 hour.
              </p>
            </div>

            {magicFailed && (
              <p className="text-sm mb-3" style={{ color: "#6b7280" }}>
                If it still doesn&apos;t work, use the password login instead.
              </p>
            )}

            <button
              type="button"
              onClick={handleResendMagicLink}
              disabled={cooldown > 0 || sendingMagic}
              className="w-full rounded-xl border font-medium text-sm transition disabled:opacity-50"
              style={{
                borderColor: "#d1d5db",
                color: "var(--primary)",
                minHeight: "48px",
              }}
            >
              {cooldown > 0
                ? `Resend magic link (${cooldown}s)`
                : sendingMagic
                  ? "Sending…"
                  : "Resend magic link"}
            </button>
          </div>
        )}

        {/* ---- Divider ---- */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "#e5e7eb" }} />
          <span className="text-xs font-medium uppercase" style={{ color: "#9ca3af" }}>
            or
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#e5e7eb" }} />
        </div>

        {/* ---- Password Login Section ---- */}
        <form onSubmit={handlePasswordSignIn} noValidate>
          <div className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="pw-email"
                className="block text-sm font-semibold mb-1"
                style={{ color: "var(--primary)" }}
              >
                Email address
              </label>
              <input
                id="pw-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@team.com"
                className="w-full rounded-xl border px-4 text-base outline-none transition focus:ring-2"
                style={{
                  borderColor: "#d1d5db",
                  color: "var(--foreground)",
                  minHeight: "48px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="pw-password"
                className="block text-sm font-semibold mb-1"
                style={{ color: "var(--primary)" }}
              >
                Password
              </label>
              <input
                id="pw-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border px-4 text-base outline-none transition focus:ring-2"
                style={{
                  borderColor: "#d1d5db",
                  color: "var(--foreground)",
                  minHeight: "48px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!email || !password || signingIn}
              className="w-full rounded-xl font-semibold text-base text-white transition active:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: "var(--primary)",
                minHeight: "48px",
              }}
            >
              {signingIn ? "Signing in…" : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
