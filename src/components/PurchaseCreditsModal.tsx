import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  Coins,
  Sparkles,
  X,
} from "lucide-react";

interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (amount: number) => void;
  purchasesDisabled?: boolean;
  disabledReason?: string;
  currentCredits?: number | null;
}

const supportEmail = "support@aicontentstudio.net";

const packages = [
  {
    credits: 100,
    price: 5,
    label: "Starter",
    description: "For quick tests and one-off runs.",
    usage: "~10 premium generations",
    highlight: "Quick refill",
  },
  {
    credits: 500,
    price: 20,
    label: "Growth",
    description: "The strongest fit for steady weekly production.",
    usage: "~50 premium generations",
    highlight: "Best balance",
  },
  {
    credits: 2000,
    price: 50,
    label: "Studio",
    description: "For teams, launches, and heavier publishing windows.",
    usage: "~200 premium generations",
    highlight: "Best value",
  },
] as const;

const creditsFormatter = new Intl.NumberFormat("en-US");

export default function PurchaseCreditsModal({
  isOpen,
  onClose,
  onPurchase,
  purchasesDisabled = false,
  disabledReason,
  currentCredits = null,
}: PurchaseCreditsModalProps) {
  const [selectedCredits, setSelectedCredits] = useState<number>(500);

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

  const selectedPackage =
    packages.find((pkg) => pkg.credits === selectedCredits) ?? packages[1];
  const projectedBalance =
    currentCredits === null ? null : currentCredits + selectedPackage.credits;
  const supportSubject = `Credit Top Up Request - ${selectedPackage.label} (${selectedPackage.credits} credits)`;
  const supportBody = [
    "Hi AI Content Studio team,",
    "",
    `I want to top up my account with the ${selectedPackage.label} package.`,
    `Package: ${selectedPackage.credits} credits for $${selectedPackage.price}`,
    `Current balance: ${
      currentCredits === null ? "Unknown" : `${currentCredits} credits`
    }`,
    "",
    "Please let me know the next step.",
  ].join("\n");
  const supportHref = `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-credits-title"
        className="relative max-h-[90vh] w-full max-w-[1080px] overflow-y-auto rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,#fffaf8_0%,#ffffff_55%,#fff7fb_100%)] shadow-[0_30px_120px_rgba(15,23,42,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
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
                  Top up credits without slowing your workflow down.
                </h2>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
                  Pick a package, preview your balance after the top-up, and
                  request it in one clean step.
                </p>
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
                        : creditsFormatter.format(currentCredits)}
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
                      : creditsFormatter.format(projectedBalance)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    with the {selectedPackage.label} package
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
                      <BadgeDollarSign className="h-4 w-4" />
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
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-950"
                  >
                    Email support
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              {packages.map((pkg) => {
                const isSelected = selectedCredits === pkg.credits;
                const projectedCardBalance =
                  currentCredits === null ? null : currentCredits + pkg.credits;

                return (
                  <button
                    key={pkg.credits}
                    type="button"
                    onClick={() => setSelectedCredits(pkg.credits)}
                    className={`group relative flex h-full flex-col rounded-[30px] border p-6 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-pink-400 bg-white shadow-[0_20px_50px_rgba(216,27,96,0.16)]"
                        : "border-slate-200/80 bg-white/80 hover:-translate-y-0.5 hover:border-pink-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {pkg.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {pkg.description}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          isSelected
                            ? "bg-pink-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {pkg.highlight}
                      </span>
                    </div>

                    <div className="mt-7 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[3rem] font-semibold leading-none tracking-[-0.08em] text-slate-950">
                          {creditsFormatter.format(pkg.credits)}
                        </div>
                        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Credits
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">
                          ${pkg.price}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          ${(pkg.price / pkg.credits * 100).toFixed(2)} / 100 credits
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 rounded-[24px] bg-slate-50/90 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Typical output
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          {pkg.usage}
                        </span>
                      </div>

                      <div className="h-px bg-slate-200" />

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Balance after
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          {projectedCardBalance === null
                            ? "..."
                            : `${creditsFormatter.format(projectedCardBalance)} credits`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? "border-pink-600 bg-pink-600 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {isSelected ? "Selected" : "Select package"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-[30px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Selected package
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    {selectedPackage.label}: {creditsFormatter.format(selectedPackage.credits)} credits for ${selectedPackage.price}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {projectedBalance === null
                      ? "Your projected balance will appear as soon as current credits load."
                      : `Your balance will become ${creditsFormatter.format(projectedBalance)} credits after this top-up.`}
                  </p>
                </div>

                {purchasesDisabled ? (
                  <a
                    href={supportHref}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-600 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-pink-700"
                  >
                    Request {selectedPackage.label} top-up
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onPurchase(selectedPackage.credits);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-600 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-pink-700"
                  >
                    Buy {creditsFormatter.format(selectedPackage.credits)} credits
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
