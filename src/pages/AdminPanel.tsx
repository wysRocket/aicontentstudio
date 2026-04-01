import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  collectionGroup,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { db } from "../firebase";
import { addCredits } from "../lib/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRecord {
  uid: string;
  email: string;
  displayName: string | null;
  role: "admin" | "user";
  credits: number;
  createdAt: Timestamp | null;
}

interface TxRecord {
  id: string;
  uid: string; // parent user uid (extracted from doc path)
  amount: number;
  kind: "top_up" | "grant" | "usage" | "adjustment";
  status: "completed" | "pending";
  description: string;
  source: string;
  createdAt: Timestamp | null;
}

interface GrantModal {
  uid: string;
  email: string;
  displayName: string | null;
  currentCredits: number;
}

// ─── Chart helpers ─────────────────────────────────────────────────────────────

function buildSparkPoints(values: number[], w = 520, h = 140): string {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? w / (values.length - 1) : w;
  return values
    .map((v, i) => `${i * stepX},${h - (v / max) * (h - 8)}`)
    .join(" ");
}

const DONUT_R = 40;
const DONUT_C = 2 * Math.PI * DONUT_R;

function DonutRing({ inflow, outflow }: { inflow: number; outflow: number }) {
  const total = Math.max(inflow + outflow, 1);
  const inDash = (inflow / total) * DONUT_C;
  const outDash = (outflow / total) * DONUT_C;
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full">
      <circle
        cx="60"
        cy="60"
        r={DONUT_R}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="14"
      />
      <circle
        cx="60"
        cy="60"
        r={DONUT_R}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="14"
        strokeDasharray={`${outDash} ${DONUT_C}`}
        strokeDashoffset={-inDash}
        transform="rotate(-90 60 60)"
      />
      <circle
        cx="60"
        cy="60"
        r={DONUT_R}
        fill="none"
        stroke="#10b981"
        strokeWidth="14"
        strokeDasharray={`${inDash} ${DONUT_C}`}
        strokeDashoffset={0}
        transform="rotate(-90 60 60)"
      />
    </svg>
  );
}

function AcquisitionChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  if (!data.length) return <div className="h-28 rounded-xl bg-white/5" />;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = 18;
  const gap = 4;
  const w = data.length * (barW + gap) - gap;
  const h = 90;
  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} className="h-28 w-full">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barH = Math.max((d.count / max) * h, d.count > 0 ? 3 : 1);
        const x = i * (barW + gap);
        return (
          <g key={d.month}>
            <rect
              x={x}
              y={h - barH}
              width={barW}
              height={barH}
              rx="3"
              fill={d.count > 0 ? "url(#barGrad)" : "rgba(255,255,255,0.05)"}
            />
            <text
              x={x + barW / 2}
              y={h + 12}
              textAnchor="middle"
              fontSize="8"
              fill="rgba(255,255,255,0.3)"
            >
              {d.month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
] as const;
type DateRange = (typeof DATE_RANGES)[number]["value"];

const TX_PAGE_SIZE = 10;

const isCredit = (kind: TxRecord["kind"]) =>
  kind === "top_up" || kind === "grant";

function tsToIso(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  try {
    return (
      typeof ts.toDate === "function"
        ? ts.toDate()
        : new Date(ts.seconds * 1000)
    ).toISOString();
  } catch {
    return "";
  }
}

function fmtDate(ts: Timestamp | null | undefined): string {
  const iso = tsToIso(ts);
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [transactions, setTransactions] = useState<TxRecord[]>([]);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<"all" | "credit" | "debit">(
    "all",
  );
  const [txPage, setTxPage] = useState(0);

  // Grant modal
  const [grantModal, setGrantModal] = useState<GrantModal | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [grantConfirm, setGrantConfirm] = useState(false);
  const [grantState, setGrantState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [grantError, setGrantError] = useState<string | null>(null);

  // ─── Load data ───────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersSnap, txSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(100),
          ),
        ),
        getDocs(
          query(
            collectionGroup(db, "creditTransactions"),
            orderBy("createdAt", "desc"),
            limit(300),
          ),
        ),
      ]);

      const loadedUsers: UserRecord[] = usersSnap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          email: data.email ?? "",
          displayName: data.displayName ?? null,
          role: data.role === "admin" ? "admin" : "user",
          credits: typeof data.credits === "number" ? data.credits : 0,
          createdAt: data.createdAt ?? null,
        };
      });

      const loadedTx: TxRecord[] = txSnap.docs.map((d) => {
        const data = d.data();
        const parentUid = d.ref.parent.parent?.id ?? "";
        return {
          id: d.id,
          uid: parentUid,
          amount: typeof data.amount === "number" ? data.amount : 0,
          kind: (["top_up", "grant", "usage", "adjustment"].includes(data.kind)
            ? data.kind
            : "adjustment") as TxRecord["kind"],
          status: data.status === "completed" ? "completed" : "pending",
          description: data.description ?? "",
          source: data.source ?? "",
          createdAt: data.createdAt ?? null,
        };
      });

      setUsers(loadedUsers);
      setTransactions(loadedTx);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load backoffice data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ─── Date cutoff ──────────────────────────────────────────────────────────────

  const dateCutoff = useMemo(() => {
    if (dateRange === "all") return null;
    const d = new Date();
    if (dateRange === "24h") d.setHours(d.getHours() - 24);
    else if (dateRange === "7d") d.setDate(d.getDate() - 7);
    else if (dateRange === "30d") d.setDate(d.getDate() - 30);
    else if (dateRange === "90d") d.setDate(d.getDate() - 90);
    return d.toISOString();
  }, [dateRange]);

  const rangeTransactions = useMemo(
    () =>
      !dateCutoff
        ? transactions
        : transactions.filter((tx) => tsToIso(tx.createdAt) >= dateCutoff),
    [transactions, dateCutoff],
  );

  // ─── KPIs ─────────────────────────────────────────────────────────────────────

  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === "admin").length;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const creditsIn = rangeTransactions
    .filter((tx) => isCredit(tx.kind))
    .reduce((s, tx) => s + tx.amount, 0);
  const creditsOut = rangeTransactions
    .filter((tx) => !isCredit(tx.kind))
    .reduce((s, tx) => s + tx.amount, 0);
  const netCredits = creditsIn - creditsOut;
  const monthlyBurn = transactions
    .filter(
      (tx) =>
        !isCredit(tx.kind) && tsToIso(tx.createdAt).startsWith(currentMonth),
    )
    .reduce((s, tx) => s + tx.amount, 0);
  const riskFlags = transactions.filter(
    (tx) => tx.status !== "completed",
  ).length;

  // ─── Cashflow series (6 months) ──────────────────────────────────────────────

  const cashflowSeries = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });
    return months.map((month) => {
      const inTotal = transactions
        .filter(
          (tx) => isCredit(tx.kind) && tsToIso(tx.createdAt).startsWith(month),
        )
        .reduce((s, tx) => s + tx.amount, 0);
      const outTotal = transactions
        .filter(
          (tx) => !isCredit(tx.kind) && tsToIso(tx.createdAt).startsWith(month),
        )
        .reduce((s, tx) => s + tx.amount, 0);
      return { month, inTotal, outTotal, net: inTotal - outTotal };
    });
  }, [transactions]);

  const inflowPoints = buildSparkPoints(cashflowSeries.map((p) => p.inTotal));
  const outflowPoints = buildSparkPoints(cashflowSeries.map((p) => p.outTotal));

  // ─── User Acquisition (12 months) ────────────────────────────────────────────

  const userCohorts = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return d.toISOString().slice(0, 7);
    });
    return months.map((month) => ({
      month,
      count: users.filter((u) => tsToIso(u.createdAt).startsWith(month)).length,
    }));
  }, [users]);

  // ─── Top Spenders ────────────────────────────────────────────────────────────

  const topSpenders = useMemo(() => {
    const map = new Map<string, number>();
    rangeTransactions
      .filter((tx) => !isCredit(tx.kind))
      .forEach((tx) => map.set(tx.uid, (map.get(tx.uid) ?? 0) + tx.amount));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uid, total]) => ({
        uid,
        total,
        email: users.find((u) => u.uid === uid)?.email ?? `${uid.slice(0, 8)}…`,
      }));
  }, [rangeTransactions, users]);

  // ─── Transaction filtering + pagination ──────────────────────────────────────

  const filteredTx = useMemo(() => {
    const q = txSearch.toLowerCase();
    return rangeTransactions.filter((tx) => {
      const matchesType =
        txTypeFilter === "all" ||
        (txTypeFilter === "credit" && isCredit(tx.kind)) ||
        (txTypeFilter === "debit" && !isCredit(tx.kind));
      const matchesSearch =
        !q ||
        tx.description.toLowerCase().includes(q) ||
        tx.uid.toLowerCase().includes(q) ||
        (users.find((u) => u.uid === tx.uid)?.email ?? "")
          .toLowerCase()
          .includes(q);
      return matchesType && matchesSearch;
    });
  }, [rangeTransactions, txTypeFilter, txSearch, users]);

  const txPageCount = Math.ceil(filteredTx.length / TX_PAGE_SIZE);
  const paginatedTx = filteredTx.slice(
    txPage * TX_PAGE_SIZE,
    (txPage + 1) * TX_PAGE_SIZE,
  );

  const recentUsers = users.slice(0, 8);

  // ─── Grant handlers ───────────────────────────────────────────────────────────

  const openGrant = (u: UserRecord) => {
    setGrantModal({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      currentCredits: u.credits,
    });
    setGrantAmount("");
    setGrantNote("");
    setGrantConfirm(false);
    setGrantState("idle");
    setGrantError(null);
  };

  const closeGrant = () => {
    setGrantModal(null);
    setGrantConfirm(false);
    setGrantState("idle");
    setGrantError(null);
  };

  const handleGrant = async () => {
    if (!grantModal) return;
    const amount = parseInt(grantAmount, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      setGrantError("Enter a positive whole number of credits.");
      return;
    }
    setGrantState("loading");
    setGrantError(null);
    try {
      await addCredits(grantModal.uid, amount, grantNote.trim() || undefined);
      setGrantState("success");
      setGrantConfirm(false);
      // Refresh data to reflect new balance
      void loadData();
    } catch (err) {
      setGrantError(
        err instanceof Error ? err.message : "Failed to grant credits.",
      );
      setGrantState("error");
      setGrantConfirm(false);
    }
  };

  // ─── Loading / Error guards ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-500" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#0b1220] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/70">
              Backoffice / Observability
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">
              FinOps Command Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55 md:text-base">
              Unified signal for users, role posture, and credit cashflow
              health.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setDateRange(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition ${
                    dateRange === r.value
                      ? "bg-cyan-600 text-white"
                      : "bg-white/5 text-white/45 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Link
              to="/dashboard"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              User View
            </Link>
            <button
              type="button"
              onClick={loadData}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: "Total Users",
            value: totalUsers,
            sub: `${adminUsers} admin${adminUsers !== 1 ? "s" : ""}`,
            tone: "text-white",
          },
          {
            label: "Credits Inflow",
            value: creditsIn,
            sub: dateRange === "all" ? "All time" : `Last ${dateRange}`,
            tone: "text-emerald-300",
          },
          {
            label: "Credits Outflow",
            value: creditsOut,
            sub: `${monthlyBurn.toLocaleString()} this month`,
            tone: "text-amber-300",
          },
          {
            label: "Net Position",
            value: netCredits,
            sub: netCredits >= 0 ? "Positive balance" : "Deficit",
            tone: netCredits >= 0 ? "text-emerald-300" : "text-red-400",
          },
          {
            label: "Risk Flags",
            value: riskFlags,
            sub: "Non-completed tx",
            tone: riskFlags > 0 ? "text-red-400" : "text-white/40",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-[20px] border border-white/10 bg-[#0d1527] p-4${i === 4 ? " col-span-2 lg:col-span-1" : ""}`}
          >
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {card.label}
            </p>
            <p className={`text-2xl font-bold ${card.tone}`}>
              {card.value.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-white/30">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Cashflow + Distribution ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Dual sparklines */}
        <div className="rounded-[20px] border border-white/10 bg-[#0d1527] p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-white">
                Cashflow Signal (6 months)
              </h2>
              <p className="text-xs text-white/35">
                Inflow vs outflow credit trend
              </p>
            </div>
            <div className="flex gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 rounded bg-emerald-400" />{" "}
                Inflow
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 rounded bg-amber-400" />{" "}
                Outflow
              </span>
            </div>
          </div>
          <div className="h-40 rounded-xl border border-white/5 bg-[#0b1220] p-3">
            <svg viewBox="0 0 520 140" className="h-full w-full">
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              {outflowPoints && (
                <polyline
                  fill="none"
                  stroke="url(#outflowGrad)"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  points={outflowPoints}
                />
              )}
              {inflowPoints && (
                <polyline
                  fill="none"
                  stroke="url(#inflowGrad)"
                  strokeWidth="3"
                  points={inflowPoints}
                />
              )}
            </svg>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 sm:grid-cols-6">
            {cashflowSeries.map((pt) => (
              <div
                key={pt.month}
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-center"
              >
                <p className="text-[10px] text-white/30">{pt.month.slice(5)}</p>
                <p
                  className={`text-xs font-semibold ${pt.net >= 0 ? "text-emerald-300" : "text-red-400"}`}
                >
                  {pt.net >= 0 ? "+" : "-"}
                  {Math.abs(pt.net).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div className="rounded-[20px] border border-white/10 bg-[#0d1527] p-5">
          <h2 className="font-bold text-lg text-white">Credit Distribution</h2>
          <p className="mb-4 text-xs text-white/35">
            Inflow vs outflow breakdown
          </p>
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0">
              <DonutRing inflow={creditsIn} outflow={creditsOut} />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[10px] leading-none text-white/35">Net</p>
                  <p
                    className={`text-sm font-bold leading-tight ${netCredits >= 0 ? "text-emerald-300" : "text-red-400"}`}
                  >
                    {netCredits >= 0 ? "+" : ""}
                    {netCredits.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {[
                {
                  label: "Inflow",
                  value: creditsIn,
                  color: "bg-emerald-500",
                  tone: "text-emerald-300",
                  dot: "bg-emerald-400",
                },
                {
                  label: "Outflow",
                  value: creditsOut,
                  color: "bg-amber-500",
                  tone: "text-amber-300",
                  dot: "bg-amber-400",
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className={`flex items-center gap-1 ${row.tone}`}>
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${row.dot}`}
                      />{" "}
                      {row.label}
                    </span>
                    <span className="text-white/55">
                      {row.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${row.color}`}
                      style={{
                        width: `${creditsIn + creditsOut > 0 ? (row.value / (creditsIn + creditsOut)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="border-t border-white/5 pt-2">
                <p className="text-[11px] text-white/35">Monthly Burn</p>
                <p className="font-semibold text-sm text-amber-300">
                  {monthlyBurn.toLocaleString()} credits
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── User Acquisition + Top Spenders ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[20px] border border-white/10 bg-[#0d1527] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-white">User Acquisition</h2>
              <p className="text-xs text-white/35">
                New signups per month (12 months)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {totalUsers.toLocaleString()}
              </p>
              <p className="text-[11px] text-white/35">total users</p>
            </div>
          </div>
          <AcquisitionChart data={userCohorts} />
        </div>

        <div className="rounded-[20px] border border-white/10 bg-[#0d1527] p-5">
          <div className="mb-4">
            <h2 className="font-bold text-lg text-white">Top Spenders</h2>
            <p className="mt-0.5 text-xs text-white/35">
              Highest credit consumption
              {dateRange !== "all" ? ` · last ${dateRange}` : ""}
            </p>
          </div>
          {topSpenders.length === 0 ? (
            <p className="text-sm text-white/35">
              No debit activity in this period.
            </p>
          ) : (
            <div className="space-y-3">
              {topSpenders.map((s, rank) => {
                const maxSpend = topSpenders[0]?.total ?? 1;
                return (
                  <div key={s.uid} className="flex items-center gap-3">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        rank === 0
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-white/5 text-white/35"
                      }`}
                    >
                      {rank + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="truncate text-white/55">
                          {s.email}
                        </span>
                        <span className="ml-2 shrink-0 font-semibold text-amber-300">
                          {s.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-amber-500/60 transition-all duration-500"
                          style={{ width: `${(s.total / maxSpend) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Role Distribution + Recent Users ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[20px] border border-white/10 bg-[#0d1527] p-5">
          <h2 className="mb-4 font-bold text-lg text-white">
            Role Distribution
          </h2>
          <div className="space-y-3">
            {[
              { name: "Admin", count: adminUsers, color: "bg-cyan-500" },
              {
                name: "Standard",
                count: Math.max(totalUsers - adminUsers, 0),
                color: "bg-white/40",
              },
            ].map((row) => {
              const pct = totalUsers ? (row.count / totalUsers) * 100 : 0;
              return (
                <div key={row.name}>
                  <div className="mb-1 flex justify-between text-xs text-white/40">
                    <span>{row.name}</span>
                    <span>
                      {row.count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full ${row.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-white/35">Risk Flags</p>
            <p className="mt-1 text-lg font-bold text-white">{riskFlags}</p>
            <p className="text-xs text-white/35">Non-completed transactions</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#0d1527] xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 p-4">
            <h2 className="font-bold text-white">Recent Users</h2>
            <span className="text-xs text-white/35">{totalUsers} total</span>
          </div>
          <div className="divide-y divide-white/5">
            {recentUsers.length === 0 && (
              <div className="p-6 text-sm text-white/35">No users yet.</div>
            )}
            {recentUsers.map((u) => (
              <div
                key={u.uid}
                className="flex items-center gap-3 p-3 transition hover:bg-white/[0.02]"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    u.role === "admin"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  {(u.email?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    {u.email || "No email"}
                  </p>
                  <p className="truncate font-mono text-xs text-white/30">
                    {u.uid}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-white/35">
                      {fmtDate(u.createdAt)}
                    </p>
                    <span
                      className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        u.role === "admin"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-white/5 text-white/35"
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openGrant(u)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/55 transition hover:bg-[#7c5cff]/20 hover:text-[#a78bfa] hover:border-[#7c5cff]/30"
                  >
                    <Coins className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Financial Events ── */}
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#0d1527]">
        <div className="border-b border-white/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-white">Financial Events</h2>
              <p className="mt-0.5 text-xs text-white/35">
                {filteredTx.length} transactions
                {dateRange !== "all" ? ` · last ${dateRange}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex overflow-hidden rounded-lg border border-white/10">
                {[
                  ["all", "All"],
                  ["credit", "Inflow"],
                  ["debit", "Outflow"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setTxTypeFilter(val as typeof txTypeFilter);
                      setTxPage(0);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition ${
                      txTypeFilter === val
                        ? "bg-cyan-600 text-white"
                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search description or user ID…"
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(0);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none transition focus:border-cyan-500/50 sm:w-52"
              />
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden grid-cols-[1fr_1fr_80px_72px_100px] gap-4 border-b border-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/25 sm:grid">
          <span>Description</span>
          <span>User</span>
          <span className="text-right">Amount</span>
          <span className="text-center">Type</span>
          <span className="text-right">Date</span>
        </div>

        <div className="divide-y divide-white/5">
          {paginatedTx.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/35">
              {txSearch || txTypeFilter !== "all"
                ? "No matching transactions."
                : "No transactions found."}
            </div>
          ) : (
            paginatedTx.map((tx) => {
              const credit = isCredit(tx.kind);
              const userEmail =
                users.find((u) => u.uid === tx.uid)?.email ?? tx.uid;
              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-1 gap-1 px-4 py-3 transition hover:bg-white/[0.02] sm:grid-cols-[1fr_1fr_80px_72px_100px] sm:items-center sm:gap-4"
                >
                  <p className="truncate text-sm text-white">
                    {tx.description || tx.source || "—"}
                  </p>
                  <p className="truncate font-mono text-xs text-white/40">
                    {userEmail}
                  </p>
                  <p
                    className={`text-sm font-semibold sm:text-right ${credit ? "text-emerald-300" : "text-amber-300"}`}
                  >
                    {credit ? "+" : "−"}
                    {tx.amount.toLocaleString()}
                  </p>
                  <div className="sm:text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        credit
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {tx.kind}
                    </span>
                  </div>
                  <p className="text-xs text-white/35 sm:text-right">
                    {fmtDate(tx.createdAt)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {txPageCount > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 p-4">
            <p className="text-xs text-white/35">
              Page {txPage + 1} of {txPageCount} · {filteredTx.length} results
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTxPage((p) => Math.max(p - 1, 0))}
                disabled={txPage === 0}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(txPageCount, 5) }, (_, i) => {
                const start = Math.max(
                  0,
                  Math.min(txPage - 2, txPageCount - 5),
                );
                const page = start + i;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setTxPage(page)}
                    className={`h-8 w-8 rounded-lg border text-xs font-medium transition ${
                      txPage === page
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                        : "border-white/10 text-white/40 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {page + 1}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setTxPage((p) => Math.min(p + 1, txPageCount - 1))
                }
                disabled={txPage >= txPageCount - 1}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Grant Credits Modal ── */}
      {grantModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close grant modal"
            onClick={closeGrant}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-sm rounded-[24px] border border-white/10 bg-[#0d1527] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                  Admin action
                </p>
                <h3 className="mt-1 text-lg font-bold text-white">
                  Grant Credits
                </h3>
                <p className="mt-1 truncate text-sm text-white/45">
                  {grantModal.displayName || grantModal.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeGrant}
                className="rounded-full border border-white/10 p-1.5 text-white/40 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {grantState === "success" ? (
              <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/50 px-4 py-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p className="font-semibold text-emerald-300 text-sm">
                    Credits granted successfully
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeGrant}
                  className="mt-3 text-xs font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3 py-2">
                  <span className="text-xs text-white/45">Current balance</span>
                  <span className="font-bold text-white">
                    {grantModal.currentCredits.toLocaleString()}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/45">
                    Credits to add
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={grantAmount}
                    onChange={(e) => {
                      setGrantAmount(e.target.value);
                      setGrantConfirm(false);
                      setGrantError(null);
                    }}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/45">
                    Internal note (optional)
                  </label>
                  <input
                    type="text"
                    value={grantNote}
                    onChange={(e) => setGrantNote(e.target.value)}
                    placeholder="Reason for grant"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/50"
                  />
                </div>

                {grantError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{" "}
                    {grantError}
                  </p>
                )}

                {grantConfirm ? (
                  <div className="rounded-xl border border-amber-700/40 bg-amber-950/50 p-3">
                    <p className="text-xs font-semibold text-amber-300">
                      Grant {parseInt(grantAmount, 10).toLocaleString()}{" "}
                      credits?
                    </p>
                    <p className="mt-0.5 text-xs text-amber-400/70">
                      New balance:{" "}
                      <strong>
                        {(
                          grantModal.currentCredits + parseInt(grantAmount, 10)
                        ).toLocaleString()}
                      </strong>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleGrant}
                        disabled={grantState === "loading"}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                      >
                        {grantState === "loading" && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantConfirm(false)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!grantAmount}
                    onClick={() => {
                      const n = parseInt(grantAmount, 10);
                      if (!Number.isInteger(n) || n <= 0) {
                        setGrantError("Enter a positive whole number.");
                        return;
                      }
                      setGrantError(null);
                      setGrantConfirm(true);
                    }}
                    className="w-full rounded-xl bg-[#7c5cff] py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f50f0] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Grant credits
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
