import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Coins,
  Copy,
  Clock3,
  Sparkles,
  X,
} from "lucide-react";
import {
  formatCreditAmount,
  formatEuroAmount,
  formatPoundAmount,
  formatEuroRatePerHundredCredits,
} from "../lib/formatting";

interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (amount: number) => void;
  purchasesDisabled?: boolean;
  disabledReason?: string;
  currentCredits?: number | null;
}

const supportEmail = "support@aicontentstudio.net";

// Pricing model: 1 credit = €0.01 (1 euro cent). Simple linear rate.
const CREDIT_PRICE_EUR = 0.01;
const quickAmounts = [100, 500, 1000, 2500, 5000, 10000] as const;
const MIN_CREDITS = 100;
const MAX_CREDITS = 10000;
const EUR_TO_GBP_RATE = 0.86;

function getLinearPrice(credits: number) {
  return Number((credits * CREDIT_PRICE_EUR).toFixed(2));
}

function getCreditsForAmount(amount: number) {
  return Math.max(MIN_CREDITS, Math.round(amount / CREDIT_PRICE_EUR));
}

function getTopUpLabel(credits: number) {
  if (credits >= 3000) return "High-volume refill";
  if (credits >= 1200) return "Steady production";
  if (credits >= 500) return "Weekly operating range";
  return "Quick refill";
}

export default function PurchaseCreditsModal({
  isOpen,
  onClose,
  onPurchase,
  purchasesDisabled = false,
  disabledReason,
  currentCredits = null,
}: PurchaseCreditsModalProps) {
  const [selectedCredits, setSelectedCredits] = useState<number>(500);
  const [creditsInputValue, setCreditsInputValue] = useState("500");
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedPrice = priceOverride ?? getLinearPrice(selectedCredits);
  const selectedPriceGbp = Number((selectedPrice * EUR_TO_GBP_RATE).toFixed(2));
  const projectedBalance =
    currentCredits === null ? null : currentCredits + selectedCredits;
  const supportSubject = `Credit Top Up Request - ${formatCreditAmount(selectedCredits)} credits`;
  const supportBody = [
    "Hi AI Content Studio team,",
    "",
    `I want to top up my account with ${formatCreditAmount(selectedCredits)} credits.`,
    `Approximate price: ${formatEuroAmount(selectedPrice)}`,
    `Approximate GBP: ${formatPoundAmount(selectedPriceGbp)}`,
    `Current balance: ${
      currentCredits === null
        ? "Unknown"
        : `${formatCreditAmount(currentCredits)} credits`
    }`,
    "",
    "Please let me know the next step.",
  ].join("\n");
  const requestSummary = [
    `Top-up request: ${formatCreditAmount(selectedCredits)} credits`,
    `Approximate price: ${formatEuroAmount(selectedPrice)}`,
    `Approximate GBP: ${formatPoundAmount(selectedPriceGbp)}`,
    `Current balance: ${
      currentCredits === null
        ? "Unknown"
        : `${formatCreditAmount(currentCredits)} credits`
    }`,
    `Projected balance: ${
      projectedBalance === null
        ? "Unknown"
        : `${formatCreditAmount(projectedBalance)} credits`
    }`,
  ].join("\n");
  const supportHref = `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;

  const setCreditSelection = (nextCredits: number) => {
    const normalizedCredits = Math.max(MIN_CREDITS, Math.round(nextCredits));
    setSelectedCredits(normalizedCredits);
    setCreditsInputValue(String(normalizedCredits));
    setPriceOverride(null);
  };

  const adjustCredits = (delta: number) => {
    setCreditSelection(selectedCredits + delta);
  };

  const handleCreditsInputChange = (value: string) => {
    setCreditsInputValue(value);

    const normalizedValue = value.replace(/\s/g, "").replace(",", ".");
    const numericValue = Number(normalizedValue);
    if (!Number.isFinite(numericValue)) return;

    if (normalizedValue.includes(".")) {
      setSelectedCredits(getCreditsForAmount(numericValue));
      setPriceOverride(Number(numericValue.toFixed(2)));
      return;
    }

    setCreditSelection(numericValue);
  };

  const sliderMax = Math.max(MAX_CREDITS, selectedCredits);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  };

  const handleCopyRequest = async () => {
    await navigator.clipboard.writeText(requestSummary);
    setCopiedRequest(true);
    showToast("Request details copied.");
    window.setTimeout(() => setCopiedRequest(false), 1800);
  };

  const euroPerCredit = selectedPrice / selectedCredits;
  const gbpPerCredit = selectedPriceGbp / selectedCredits;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close purchase credits modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-credits-title"
        className="relative z-10 max-h-[90vh] w-full max-w-[1080px] overflow-y-auto rounded-[32px] border border-white/10 bg-[#0b0f17] shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
      >
        {toastMessage && (
          <div className="absolute right-4 top-4 z-30 rounded-2xl border border-[#7c5cff]/30 bg-[#1a1625] px-4 py-2 text-sm font-medium text-[#c4b5fd] shadow-lg">
            {toastMessage}
          </div>
        )}
        {/* Subtle purple glow at top */}
        <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(124,92,255,0.12),transparent)]" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close purchase credits modal"
          className="absolute right-4 top-4 z-20 rounded-xl border border-white/10 bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative">
          {/* ── Header ── */}
          <div className="border-b border-white/8 px-6 pb-6 pt-6 sm:px-8">
            <div className="grid gap-4 xl:grid-cols-[1.3fr_220px_220px]">
              <div className="pr-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#7c5cff]/30 bg-[#7c5cff]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Credit Wallet
                </div>
                <h2
                  id="purchase-credits-title"
                  className="mt-4 max-w-xl text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white"
                >
                  Configure your top-up and send it in one step.
                </h2>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-white/55">
                  Use the quick buttons for common amounts, fine-tune with the
                  slider, then preview the new balance before requesting it.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/55">
                  <Clock3 className="h-3.5 w-3.5 text-[#7c5cff]" />
                  Manual requests are usually answered within one business day.
                </div>
              </div>

              {/* Current balance card */}
              <div className="rounded-[26px] border border-white/10 bg-white/4 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Current balance
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-[#7c5cff]/15 p-3 text-[#7c5cff]">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-white">
                      {currentCredits === null
                        ? "..."
                        : formatCreditAmount(currentCredits)}
                    </p>
                    <p className="text-sm text-white/45">credits</p>
                  </div>
                </div>
              </div>

              {/* After top-up card */}
              <div className="rounded-[26px] border border-[#7c5cff]/25 bg-[#7c5cff]/8 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  After top-up
                </p>
                <div className="mt-4">
                  <p className="text-3xl font-semibold tracking-[-0.05em] text-white">
                    {projectedBalance === null
                      ? "..."
                      : formatCreditAmount(projectedBalance)}
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    after adding {formatCreditAmount(selectedCredits)} credits
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {purchasesDisabled && (
              <div className="mb-6 rounded-[28px] border border-amber-500/20 bg-amber-500/8 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-500/15 p-2.5 text-amber-400">
                      <Coins className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-300">
                        Manual top-up is active right now
                      </p>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-300/70">
                        {disabledReason ||
                          "Self-serve checkout is still being hardened server-side. Email support and we'll apply the selected package manually."}
                      </p>
                    </div>
                  </div>

                  <a
                    href={supportHref}
                    onClick={() => showToast("Opening support email draft...")}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7c5cff] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6f50f0]"
                  >
                    Email support
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyRequest}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {copiedRequest ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedRequest ? "Copied" : "Copy request"}
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
              {/* ── Left: Amount selector ── */}
              <div className="rounded-[30px] border border-white/8 bg-white/3 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Credit amount
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-white">
                      {formatCreditAmount(selectedCredits)}
                    </p>
                    <p className="mt-3 text-sm text-white/45">
                      Use a quick amount, the step buttons, or type exact
                      credits or a EUR amount below.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#7c5cff]/25 bg-[#7c5cff]/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]">
                    {getTopUpLabel(selectedCredits)}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {quickAmounts.map((amount) => {
                    const isSelected = selectedCredits === amount;
                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setCreditSelection(amount)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? "bg-[#7c5cff] text-white"
                            : "border border-white/10 bg-white/5 text-white/65 hover:border-[#7c5cff]/30 hover:bg-[#7c5cff]/12 hover:text-white"
                        }`}
                      >
                        {formatCreditAmount(amount)}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-[26px] border border-white/8 bg-white/3 px-5 py-5">
                  <div className="flex flex-col gap-4 border-b border-white/8 pb-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Exact top-up value
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <input
                          id="credit-top-up-amount"
                          type="text"
                          inputMode="decimal"
                          value={creditsInputValue}
                          onChange={(event) =>
                            handleCreditsInputChange(event.target.value)
                          }
                          className="w-40 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-[#7c5cff]/50 focus:bg-[#7c5cff]/8"
                        />
                        <span className="text-sm text-white/40">
                          credits or EUR
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/35">
                        Enter a whole number for credits, or a decimal like
                        985,05 to treat it as a EUR amount.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm font-medium text-white/45 md:min-w-[280px]">
                      <span>{formatCreditAmount(MIN_CREDITS)} credits</span>
                      <span>{formatCreditAmount(sliderMax)} credits</span>
                    </div>
                  </div>

                  <div className="mt-4 grid items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto]">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => adjustCredits(-10)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustCredits(-1)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                      >
                        -1
                      </button>
                    </div>

                    <input
                      type="range"
                      min={MIN_CREDITS}
                      max={sliderMax}
                      step={1}
                      value={selectedCredits}
                      onChange={(event) =>
                        setCreditSelection(Number(event.target.value))
                      }
                      className="w-full accent-[#7c5cff]"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => adjustCredits(1)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustCredits(10)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                      >
                        +10
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCreditSelection(selectedCredits - 100)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                    >
                      -100
                    </button>
                    <p className="text-sm text-white/35">
                      1 credit = €0.01 · linear pricing, no volume tiers.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreditSelection(selectedCredits + 100)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                    >
                      +100
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Right: Summary card ── */}
              <div className="rounded-[30px] border border-[#7c5cff]/20 bg-[linear-gradient(160deg,rgba(124,92,255,0.1)_0%,rgba(124,92,255,0.04)_100%)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Selected top-up
                </p>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold tracking-[-0.08em] text-white">
                      {formatCreditAmount(selectedCredits)}
                    </p>
                    <p className="mt-2 text-sm text-white/45">credits</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-white">
                      {formatEuroAmount(selectedPrice)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white/55">
                      {formatPoundAmount(selectedPriceGbp)}
                    </p>
                    <p className="mt-2 text-sm text-white/45">
                      approx.{" "}
                      {formatEuroRatePerHundredCredits(
                        selectedPrice,
                        selectedCredits,
                      )}{" "}
                      / 100 credits
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {formatEuroAmount(euroPerCredit)} and{" "}
                      {formatPoundAmount(gbpPerCredit)} per credit
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 rounded-[24px] border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                      Recommended use
                    </span>
                    <span className="text-sm font-medium text-white/75">
                      {getTopUpLabel(selectedCredits)}
                    </span>
                  </div>
                  <div className="h-px bg-white/8" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                      Balance after
                    </span>
                    <span className="text-sm font-medium text-white/75">
                      {projectedBalance === null
                        ? "..."
                        : `${formatCreditAmount(projectedBalance)} credits`}
                    </span>
                  </div>
                  <div className="h-px bg-white/8" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                      Next step
                    </span>
                    <span className="text-sm font-medium text-white/75">
                      Email confirmation
                    </span>
                  </div>
                  <div className="h-px bg-white/8" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                      Protection
                    </span>
                    <span className="flex items-center gap-2 text-sm font-medium text-white/75">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Successful runs only
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CTA bar ── */}
            <div className="mt-6 rounded-[30px] border border-white/8 bg-white/3 px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Selected package
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {formatCreditAmount(selectedCredits)} credits for
                    approximately {formatEuroAmount(selectedPrice)}
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Equivalent GBP estimate:{" "}
                    {formatPoundAmount(selectedPriceGbp)}
                  </p>
                  <p className="mt-2 text-sm text-white/35">
                    {projectedBalance === null
                      ? "Your projected balance will appear as soon as current credits load."
                      : `Your balance will become ${formatCreditAmount(projectedBalance)} credits after this top-up.`}
                  </p>
                </div>

                {purchasesDisabled ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyRequest}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {copiedRequest ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedRequest
                        ? "Request copied"
                        : "Copy request details"}
                    </button>
                    <a
                      href={supportHref}
                      onClick={() =>
                        showToast("Opening support email draft...")
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7c5cff] px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#6f50f0]"
                    >
                      Request this top-up
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onPurchase(selectedCredits);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7c5cff] px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#6f50f0]"
                  >
                    Buy {formatCreditAmount(selectedCredits)} credits
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-white/35">
              Need a custom amount? Email{" "}
              <span className="font-medium text-white/55">{supportEmail}</span>{" "}
              and we can help arrange it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
