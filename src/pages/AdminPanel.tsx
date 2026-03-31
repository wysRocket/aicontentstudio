import { useState } from "react";
import { BarChart3, Coins, LayoutDashboard, Loader2, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { getUserByEmail, addCredits } from "../lib/firestore";

const adminAreas = [
  {
    icon: Coins,
    title: "Credits and billing",
    description:
      "Review top-up workflows, manual credit requests, and balance-impacting operations.",
    href: "/dashboard/settings?tab=billing",
    cta: "Open billing",
  },
  {
    icon: Users,
    title: "Accounts and access",
    description:
      "Manage connected accounts, review profile settings, and prepare role-based controls.",
    href: "/dashboard/settings?tab=accounts",
    cta: "Open accounts",
  },
  {
    icon: LayoutDashboard,
    title: "Workspace operations",
    description:
      "Monitor the shared tool surfaces, saved runs, and help flows that shape the user experience.",
    href: "/dashboard",
    cta: "Open workspace",
  },
];

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

export default function AdminPanel() {
  const [grant, setGrant] = useState<GrantState>({ email: "", amount: "", note: "" });
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [grantState, setGrantState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [grantError, setGrantError] = useState<string | null>(null);

  const updateGrant = (patch: Partial<GrantState>) => setGrant((prev) => ({ ...prev, ...patch }));

  const handleLookup = async () => {
    if (!grant.email.trim()) return;
    setLookupState("loading");
    setResolvedUser(null);
    setGrantState("idle");
    setGrantError(null);
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
      setResolvedUser((prev) => prev ? { ...prev, credits: prev.credits + amount } : prev);
      setGrantState("success");
      updateGrant({ amount: "", note: "" });
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : "Failed to grant credits.");
      setGrantState("error");
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLookup();
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-black/8 bg-[linear-gradient(135deg,#17131d_0%,#251c35_42%,#7c5cff_100%)] px-6 py-7 text-white shadow-[0_24px_80px_rgba(23,19,29,0.22)] sm:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin panel
          </div>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[38px]">
            A single place to steer credits, access, and workspace operations.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/78 sm:text-[15px]">
            This is the first admin surface for the product. It gives the team a
            clear operational entry point now, while deeper permissions and
            site-wide controls can be expanded in the next pass.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminAreas.map((area) => (
            <Link
              key={area.title}
              to={area.href}
              className="rounded-[28px] border border-black/8 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(23,19,29,0.08)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6efff] text-[#7c5cff]">
                <area.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#17131d]">
                {area.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6e5e58]">
                {area.description}
              </p>
              <span className="mt-5 inline-flex text-sm font-semibold text-[#7c5cff]">
                {area.cta}
              </span>
            </Link>
          ))}
        </div>

        <aside className="rounded-[28px] border border-black/8 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c5f74]">
            <BarChart3 className="h-4 w-4" />
            Scope
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#17131d]">
            What this admin panel covers right now
          </h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[#6e5e58]">
            <p>Operational shortcuts into billing, accounts, and workspace monitoring.</p>
            <p>One visible admin destination in the authenticated shell instead of scattered settings links.</p>
            <p>Room for role-gated controls, site switches, and approval flows in the next phase.</p>
          </div>
        </aside>
      </section>

      {/* Credit grant tool */}
      <section className="rounded-[28px] border border-black/8 bg-white shadow-sm">
        <div className="border-b border-black/6 px-6 py-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c5cff]">
            <Coins className="h-4 w-4" />
            Credit grant
          </div>
          <h3 className="mt-2 text-lg font-semibold text-[#17131d]">
            Grant credits to a user
          </h3>
          <p className="mt-1 text-sm text-[#6e5e58]">
            Look up an account by email, then add credits directly to their balance.
          </p>
        </div>

        <div className="space-y-5 p-6">
          {/* Email lookup */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#17131d]">
              User email
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
            <div className="rounded-2xl border border-[#7c5cff]/20 bg-[#f6efff] px-4 py-4">
              <p className="text-sm font-semibold text-[#17131d]">
                {resolvedUser.displayName || resolvedUser.email}
              </p>
              {resolvedUser.displayName && (
                <p className="text-xs text-[#6e5e58]">{resolvedUser.email}</p>
              )}
              <p className="mt-1.5 text-xs text-[#6e5e58]">
                Current balance:{" "}
                <span className="font-semibold text-[#17131d]">
                  {resolvedUser.credits.toLocaleString()} credits
                </span>
              </p>
            </div>
          )}

          {/* Grant form — only shown when user resolved */}
          {resolvedUser && lookupState === "found" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#17131d]">
                    Credits to add
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={grant.amount}
                    onChange={(e) => updateGrant({ amount: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-black/10 bg-[#fcfaf7] px-4 py-2.5 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#17131d]">
                    Internal note{" "}
                    <span className="font-normal text-[#8d7d74]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={grant.note}
                    onChange={(e) => updateGrant({ note: e.target.value })}
                    placeholder="e.g. Promo, support credit…"
                    className="w-full rounded-xl border border-black/10 bg-[#fcfaf7] px-4 py-2.5 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
                  />
                </div>
              </div>

              {grantError && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
                  {grantError}
                </p>
              )}

              {grantState === "success" && (
                <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
                  Credits granted successfully. New balance:{" "}
                  <span className="font-bold">{resolvedUser.credits.toLocaleString()}</span>
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGrant}
                  disabled={!grant.amount || grantState === "loading"}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7c5cff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b3fc5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {grantState === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Grant credits
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
