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

const quickAmounts = [100, 300, 500, 1000, 2500, 5000] as const;
const pricingAnchors = [
  { credits: 100, price: 5 },
  { credits: 500, price: 20 },
  { credits: 2000, price: 50 },
  { credits: 5000, price: 110 },
] as const;

const MIN_CREDITS = 100;
const MAX_CREDITS = 5000;
const EUR_TO_GBP_RATE = 0.86;

function getInterpolatedPrice(credits: number) {
  if (credits <= pricingAnchors[0].credits) return pricingAnchors[0].price;

  for (let index = 1; index < pricingAnchors.length; index += 1) {
    const previous = pricingAnchors[index - 1];
    const current = pricingAnchors[index];

    if (credits <= current.credits) {
      const ratio =
        (credits - previous.credits) / (current.credits - previous.credits);
      const price = previous.price + ratio * (current.price - previous.price);
      return Number(price.toFixed(2));
    }
  }

  const last = pricingAnchors[pricingAnchors.length - 1];
  const beforeLast = pricingAnchors[pricingAnchors.length - 2];
  const slope =
    (last.price - beforeLast.price) / (last.credits - beforeLast.credits);
  return Number((last.price + (credits - last.credits) * slope).toFixed(2));
}

function getCreditsForAmount(amount: number) {
  if (amount <= 0) return MIN_CREDITS;

  if (amount <= pricingAnchors[0].price) {
    return Math.max(
      MIN_CREDITS,
      Math.round(
        (amount / pricingAnchors[0].price) * pricingAnchors[0].credits,
      ),
    );
  }

  for (let index = 1; index < pricingAnchors.length; index += 1) {
    const previous = pricingAnchors[index - 1];
    const current = pricingAnchors[index];

    if (amount <= current.price) {
      const ratio =
        (amount - previous.price) / (current.price - previous.price);
      return Math.round(
        previous.credits + ratio * (current.credits - previous.credits),
      );
    }
  }

  const last = pricingAnchors[pricingAnchors.length - 1];
  const beforeLast = pricingAnchors[pricingAnchors.length - 2];
  const creditsPerEuro =
    (last.credits - beforeLast.credits) / (last.price - beforeLast.price);

  return Math.round(last.credits + (amount - last.price) * creditsPerEuro);
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

  const selectedPrice = priceOverride ?? getInterpolatedPrice(selectedCredits);
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
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-credits-title"
        className="relative z-10 max-h-[90vh] w-full max-w-[1080px] overflow-y-auto rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,#fffaf8_0%,#ffffff_55%,#fff7fb_100%)] shadow-[0_30px_120px_rgba(15,23,42,0.24)]"
      >
        {toastMessage && (
          <div className="absolute right-4 top-4 z-30 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
            {toastMessage}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,27,96,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.10),transparent_34%)]" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close purchase credits modal"
          className="absolute right-4 top-4 z-20 rounded-2xl border border-gray-200 bg-white/90 p-2 text-gray-400 transition-colors hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative">
          <div className="border-b border-black/5 px-6 pb-6 pt-6 sm:px-8">
            <div className="grid gap-4 xl:grid-cols-[1.3fr_220px_220px]">
              <div className="pr-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Credit Wallet
                </div>
                <h2
                  id="purchase-credits-title"
                  className="mt-4 max-w-xl text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950"
                >
                  Configure your top-up and send it in one step.
                </h2>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
                  Use the quick buttons for common amounts, fine-tune with the
                  slider, then preview the new balance before requesting it.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                  <Clock3 className="h-3.5 w-3.5 text-pink-600" />
                  Manual requests are usually answered within one business day.
                </div>
              </div>

              <div className="rounded-[26px] border border-white/80 bg-white/85 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Current balance
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-pink-50 p-3 text-pink-600">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                      {currentCredits === null
                        ? "..."
                        : formatCreditAmount(currentCredits)}
                    </p>
                    <p className="text-sm text-slate-500">credits</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-pink-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(255,243,249,0.92)_100%)] p-5 shadow-[0_14px_35px_rgba(216,27,96,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  After top-up
                </p>
                <div className="mt-4">
                  <p className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                    {projectedBalance === null
                      ? "..."
                      : formatCreditAmount(projectedBalance)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    after adding {formatCreditAmount(selectedCredits)} credits
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {purchasesDisabled && (
              <div className="mb-6 rounded-[28px] border border-amber-200/80 bg-[linear-gradient(135deg,#fff9ef_0%,#fff3dc_100%)] p-5 shadow-[0_16px_40px_rgba(245,158,11,0.08)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/70 p-2.5 text-amber-700">
                      <Coins className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-950">
                        Manual top-up is active right now
                      </p>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-900/80">
                        {disabledReason ||
                          "Self-serve checkout is still being hardened server-side. Email support and we’ll apply the selected package manually."}
                      </p>
                    </div>
                  </div>

                  <a
                    href={supportHref}
                    onClick={() => showToast("Opening support email draft...")}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-950"
                  >
                    Email support
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyRequest}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-50"
                  >
                    {copiedRequest ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedRequest ? "Copied" : "Copy request"}
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
              <div className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Credit amount
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-slate-950">
                      {formatCreditAmount(selectedCredits)}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      Use a quick amount, the step buttons, or type exact
                      credits or a EUR amount below.
                    </p>
                  </div>
                  <span className="rounded-full bg-pink-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-700">
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
                            ? "bg-pink-600 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-pink-200 hover:bg-white"
                        }`}
                      >
                        {formatCreditAmount(amount)}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfd_0%,#fff5f9_100%)] px-5 py-5">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                          className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-pink-300"
                        />
                        <span className="text-sm text-slate-500">
                          credits or EUR
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Enter a whole number for credits, or a decimal like
                        985,05 to treat it as a EUR amount.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm font-medium text-slate-600 md:min-w-[280px]">
                      <span>{formatCreditAmount(MIN_CREDITS)} credits</span>
                      <span>{formatCreditAmount(sliderMax)} credits</span>
                    </div>
                  </div>

                  <div className="mt-4 grid items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto]">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => adjustCredits(-10)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustCredits(-1)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
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
                      className="w-full accent-pink-600"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => adjustCredits(1)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustCredits(10)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        +10
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCreditSelection(selectedCredits - 100)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      -100
                    </button>
                    <p className="text-sm text-slate-500">
                      Approx. {Math.floor(selectedCredits / 10)} premium
                      generations at current video pricing.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreditSelection(selectedCredits + 100)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      +100
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-pink-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,243,249,0.96)_100%)] p-6 shadow-[0_20px_50px_rgba(216,27,96,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Selected top-up
                </p>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold tracking-[-0.08em] text-slate-950">
                      {formatCreditAmount(selectedCredits)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">credits</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                      {formatEuroAmount(selectedPrice)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {formatPoundAmount(selectedPriceGbp)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      approx.{" "}
                      {formatEuroRatePerHundredCredits(
                        selectedPrice,
                        selectedCredits,
                      )}{" "}
                      / 100 credits
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatEuroAmount(euroPerCredit)} and{" "}
                      {formatPoundAmount(gbpPerCredit)} per credit
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 rounded-[24px] bg-white/85 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Recommended use
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {getTopUpLabel(selectedCredits)}
                    </span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Balance after
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {projectedBalance === null
                        ? "..."
                        : `${formatCreditAmount(projectedBalance)} credits`}
                    </span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Next step
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      Email confirmation
                    </span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Protection
                    </span>
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Check className="h-4 w-4 text-pink-600" />
                      Successful runs only
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[30px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Selected package
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    {formatCreditAmount(selectedCredits)} credits for
                    approximately {formatEuroAmount(selectedPrice)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Equivalent GBP estimate:{" "}
                    {formatPoundAmount(selectedPriceGbp)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
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
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {copiedRequest ? (
                        <Check className="h-4 w-4 text-emerald-600" />
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
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-600 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-pink-700"
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
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-600 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-pink-700"
                  >
                    Buy {formatCreditAmount(selectedCredits)} credits
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-500">
              Need a custom amount? Email{" "}
              <span className="font-medium text-slate-700">{supportEmail}</span>{" "}
              and we can help arrange it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
