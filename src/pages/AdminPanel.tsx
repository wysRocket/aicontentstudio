import { useState } from "react";
import { CheckCircle2, Coins, Loader2, ShieldCheck, User } from "lucide-react";
import { getUserByEmail, addCredits } from "../lib/firestore";

interface GrantState {
  email: string;
  amount: string;
  note: string;
}

interface ResolvedUser {
  uid: string;
  email: string;
  credits: number;
  displayName: string | null;
}

interface GrantLogEntry {
  email: string;
  displayName: string | null;
  amount: number;
  note: string;
  newBalance: number;
  timestamp: Date;
}

export default function AdminPanel() {
  const [grant, setGrant] = useState<GrantState>({ email: "", amount: "", note: "" });
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [grantState, setGrantState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [grantError, setGrantError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [sessionLog, setSessionLog] = useState<GrantLogEntry[]>([]);

  const resetGrantForm = (keepEmail = false) => {
    setGrant((prev) => ({ email: keepEmail ? prev.email : "", amount: "", note: "" }));
    setConfirmPending(false);
  };

  const updateGrant = (patch: Partial<GrantState>) => {
    setGrant((prev) => ({ ...prev, ...patch }));
    setConfirmPending(false);
  };

  const handleLookup = async () => {
    if (!grant.email.trim()) return;
    setLookupState("loading");
    setResolvedUser(null);
    setGrantState("idle");
    setGrantError(null);
    setConfirmPending(false);
    try {
      const user = await getUserByEmail(grant.email.trim());
      if (user) {
        setResolvedUser(user);
        setLookupState("found");
      } else {
        setLookupState("not_found");
      }
    } catch {
      setLookupState("not_found");
    }
  };

  const handleGrant = async () => {
    if (!resolvedUser) return;
    const amount = parseInt(grant.amount, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      setGrantError("Enter a positive whole number of credits.");
      return;
    }
    setGrantState("loading");
    setGrantError(null);
    try {
      await addCredits(resolvedUser.uid, amount, grant.note.trim() || undefined);
      const newBalance = resolvedUser.credits + amount;
      setSessionLog((prev) => [
        {
          email: resolvedUser.email,
          displayName: resolvedUser.displayName,
          amount,
          note: grant.note.trim(),
          newBalance,
          timestamp: new Date(),
        },
        ...prev,
      ]);
      setResolvedUser((prev) => prev ? { ...prev, credits: newBalance } : prev);
      setGrantState("success");
      setConfirmPending(false);
      resetGrantForm(true);
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : "Failed to grant credits.");
      setGrantState("error");
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLookup();
  };

  const handleGrantAnother = () => {
    setGrant({ email: "", amount: "", note: "" });
    setResolvedUser(null);
    setLookupState("idle");
    setGrantState("idle");
    setGrantError(null);
    setConfirmPending(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(135deg,#17131d_0%,#251c35_42%,#7c5cff_100%)] px-6 py-7 text-white shadow-[0_24px_80px_rgba(23,19,29,0.22)] sm:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin panel
          </div>
          <h2 className="mt-4 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[34px]">
            Operational controls for the platform.
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70 sm:text-[15px]">
            Use this panel to look up accounts and manage credit balances directly.
            Every action is logged and applied immediately.
          </p>
        </div>
      </section>

      {/* Main content: grant tool + session log */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Credit grant tool */}
        <section className="rounded-[28px] border border-black/8 bg-white shadow-sm">
          <div className="border-b border-black/6 px-6 py-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c5cff]">
              <Coins className="h-4 w-4" />
              Credit grant
            </div>
            <h3 className="mt-2 text-lg font-semibold text-[#17131d]">
              Add credits to an account
            </h3>
            <p className="mt-1 text-sm text-[#6e5e58]">
              Look up an account by email address, then add credits to their
              balance. The change applies immediately and cannot be reversed.
            </p>
          </div>

          <div className="space-y-5 p-6">
            {/* Step 1: Email lookup */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#17131d]">
                Step 1 — Find account
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={grant.email}
                  onChange={(e) => {
                    updateGrant({ email: e.target.value });
                    setLookupState("idle");
                    setResolvedUser(null);
                    setGrantState("idle");
                    setGrantError(null);
                  }}
                  onKeyDown={handleEmailKeyDown}
                  placeholder="user@example.com"
                  className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[#fcfaf7] px-4 py-2.5 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={!grant.email.trim() || lookupState === "loading"}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#17131d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#251c35] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {lookupState === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Look up"
                  )}
                </button>
              </div>

              {lookupState === "not_found" && (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  No account found for that email address.
                </p>
              )}
            </div>

            {/* Resolved user card */}
            {resolvedUser && lookupState === "found" && (
              <div className="flex items-center gap-3 rounded-2xl border border-[#7c5cff]/20 bg-[#f6efff] px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7c5cff]/15 text-[#7c5cff]">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#17131d]">
                    {resolvedUser.displayName || resolvedUser.email}
                  </p>
                  {resolvedUser.displayName && (
                    <p className="text-xs text-[#6e5e58]">{resolvedUser.email}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8c5f74]">Balance</p>
                  <p className="text-sm font-bold text-[#17131d]">
                    {resolvedUser.credits.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Grant amount — only after user found */}
            {resolvedUser && lookupState === "found" && grantState !== "success" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#17131d]">
                    Step 2 — Set amount
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={grant.amount}
                      onChange={(e) => updateGrant({ amount: e.target.value })}
                      placeholder="Credits to add, e.g. 500"
                      className="w-full rounded-xl border border-black/10 bg-[#fcfaf7] px-4 py-2.5 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
                    />
                    <input
                      type="text"
                      value={grant.note}
                      onChange={(e) => updateGrant({ note: e.target.value })}
                      placeholder="Internal note (optional)"
                      className="w-full rounded-xl border border-black/10 bg-[#fcfaf7] px-4 py-2.5 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
                    />
                  </div>
                </div>

                {grantError && (
                  <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
                    {grantError}
                  </p>
                )}

                {/* Confirm step */}
                {confirmPending ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-900">
                      Grant {parseInt(grant.amount, 10).toLocaleString()} credits to{" "}
                      {resolvedUser.displayName || resolvedUser.email}?
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      New balance will be{" "}
                      <strong>
                        {(resolvedUser.credits + parseInt(grant.amount, 10)).toLocaleString()}
                      </strong>{" "}
                      credits. This cannot be reversed.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleGrant}
                        disabled={grantState === "loading"}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {grantState === "loading" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Confirm grant
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmPending(false)}
                        className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#17131d] transition hover:bg-[#fcfaf7]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const amount = parseInt(grant.amount, 10);
                        if (!Number.isInteger(amount) || amount <= 0) {
                          setGrantError("Enter a positive whole number of credits.");
                          return;
                        }
                        setGrantError(null);
                        setConfirmPending(true);
                      }}
                      disabled={!grant.amount || grantState === "loading"}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#7c5cff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b3fc5] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Grant credits
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Success state */}
            {grantState === "success" && resolvedUser && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-800">Credits granted</p>
                </div>
                <p className="mt-1 text-sm text-emerald-700">
                  {resolvedUser.email} now has{" "}
                  <strong>{resolvedUser.credits.toLocaleString()} credits</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleGrantAnother}
                  className="mt-3 text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                >
                  Grant to another account
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Session log */}
        <aside className="rounded-[28px] border border-black/8 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c5f74]">
            <Coins className="h-4 w-4" />
            Session log
          </div>
          <h3 className="mt-3 text-base font-semibold tracking-[-0.02em] text-[#17131d]">
            Grants this session
          </h3>

          {sessionLog.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center">
              <p className="text-sm text-[#8d7d74]">
                No grants yet this session.
              </p>
              <p className="mt-1 text-xs text-[#b0a09a]">
                Completed grants will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {sessionLog.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-black/6 bg-[#fcfaf7] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#17131d]">
                        {entry.displayName || entry.email}
                      </p>
                      {entry.displayName && (
                        <p className="truncate text-xs text-[#8d7d74]">{entry.email}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      +{entry.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-[#8d7d74]">
                      New balance:{" "}
                      <span className="font-semibold text-[#17131d]">
                        {entry.newBalance.toLocaleString()}
                      </span>
                    </p>
                    <p className="text-xs text-[#b0a09a]">
                      {entry.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {entry.note && (
                    <p className="mt-1.5 text-xs italic text-[#8d7d74]">{entry.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
