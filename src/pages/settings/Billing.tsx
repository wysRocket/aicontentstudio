import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Coins,
  History,
  Loader2,
  Mail,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useFirebase } from "../../contexts/FirebaseContext";
import {
  getRecentCreditTransactions,
  getUserCredits,
  type CreditTransactionRecord,
} from "../../lib/firestore";
import { formatCreditAmount } from "../../lib/formatting";

const supportEmail = "support@aicontentstudio.net";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatTransactionDate(transaction: CreditTransactionRecord) {
  const date = transaction.createdAt?.toDate();
  return date ? dateFormatter.format(date) : "Pending timestamp";
}

function getTransactionTone(kind: CreditTransactionRecord["kind"], amount: number) {
  if (amount > 0) {
    return {
      icon: ArrowUpRight,
      amountClass: "text-emerald-700",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
      label: kind === "grant" ? "Grant" : "Credit added",
    };
  }

  return {
    icon: ArrowDownRight,
    amountClass: "text-rose-700",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-100",
    label: kind === "usage" ? "Usage" : "Debit",
  };
}

export function Billing() {
  const { user, isAuthReady } = useFirebase();
  const [credits, setCredits] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady) {
        setCredits(0);
        setTransactions([]);
        setIsLoadingHistory(false);
      }
      return;
    }

    setIsLoadingHistory(true);

    Promise.all([
      getUserCredits(user.uid),
      getRecentCreditTransactions(user.uid, 25),
    ])
      .then(([nextCredits, nextTransactions]) => {
        setCredits(nextCredits);
        setTransactions(nextTransactions);
      })
      .catch(() => {
        setCredits(0);
        setTransactions([]);
      })
      .finally(() => setIsLoadingHistory(false));
  }, [isAuthReady, user]);

  const stats = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.amount > 0) {
          acc.totalAdded += transaction.amount;
        } else if (transaction.amount < 0) {
          acc.totalSpent += Math.abs(transaction.amount);
        }
        return acc;
      },
      { totalAdded: 0, totalSpent: 0 },
    );
  }, [transactions]);

  const supportHref =
    "mailto:" +
    supportEmail +
    "?subject=" +
    encodeURIComponent("Credit top-up request") +
    "&body=" +
    encodeURIComponent(
      [
        "Hi AI Content Studio team,",
        "",
        "I want to top up my credits.",
        `Current balance: ${
          credits === null
            ? "Still loading in app"
            : `${formatCreditAmount(credits)} credits`
        }`,
        "",
        "Please send me the next step.",
      ].join("\n"),
    );

  return (
    <div className="max-w-6xl space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-pink-100 bg-[linear-gradient(135deg,#fff6fb_0%,#ffffff_48%,#f8f5ff_100%)] shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.95fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-700">
              <Coins className="h-3.5 w-3.5" />
              Billing Ledger
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-gray-950">
              Track your credit balance and recent transaction history
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Credits remain live in Firebase. Every tracked debit and credit
              event now appears here so you can see what changed, when it
              changed, and what your balance became afterward.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={supportHref}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D81B60] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C2185B]"
              >
                <Mail className="h-4 w-4" />
                Request manual top-up
              </a>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Self-serve checkout is still pending server-side billing hardening
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(216,27,96,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Current balance
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-2xl bg-pink-50 p-3 text-pink-600">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-[-0.04em] text-gray-950">
                  {credits === null ? (
                    <span className="inline-flex items-center gap-2 text-lg text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    formatCreditAmount(credits)
                  )}
                </p>
                <p className="text-sm text-gray-500">credits available right now</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Manual top-ups are still reviewed by the team before they are
              applied to your balance.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Available credits</p>
            <Coins className="h-4 w-4 text-pink-600" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-gray-950">
            {credits === null ? "..." : formatCreditAmount(credits)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Credits added</p>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-gray-950">
            {formatCreditAmount(stats.totalAdded)}
          </p>
          <p className="mt-2 text-sm text-gray-500">from grants and top-ups</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Credits spent</p>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-gray-950">
            {formatCreditAmount(stats.totalSpent)}
          </p>
          <p className="mt-2 text-sm text-gray-500">tracked usage deductions</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Tracked events</p>
            <History className="h-4 w-4 text-violet-600" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-gray-950">
            {formatCreditAmount(transactions.length)}
          </p>
          <p className="mt-2 text-sm text-gray-500">most recent ledger entries</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-950">
                Transaction history
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Recent credits added, grants, and usage deductions for this account.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
              <Clock3 className="h-3.5 w-3.5" />
              Showing up to 25 most recent events
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-5">
          {isLoadingHistory ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-gray-500">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading transaction history...
              </span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-pink-600 shadow-sm">
                <History className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-gray-900">
                No tracked transactions yet
              </h4>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
                Recent credit activity will appear here automatically as credits
                are used or applied to your balance.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const tone = getTransactionTone(
                  transaction.kind,
                  transaction.amount,
                );
                const Icon = tone.icon;

                return (
                  <div
                    key={transaction.id}
                    className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-0.5 rounded-2xl border p-2 ${tone.badgeClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {transaction.description}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.badgeClass}`}
                          >
                            {tone.label}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-600">
                            {transaction.status}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                          <span>{formatTransactionDate(transaction)}</span>
                          <span>Source: {transaction.source}</span>
                          <span>
                            Balance after:{" "}
                            {formatCreditAmount(transaction.balanceAfter)} credits
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                      <div
                        className={`text-lg font-semibold ${tone.amountClass}`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {formatCreditAmount(transaction.amount)}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-400">
                        credits
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
