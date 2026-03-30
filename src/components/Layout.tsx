import { useEffect, useMemo, useState } from "react";
import { Coins, Menu, Plus, X } from "lucide-react";
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import PurchaseCreditsModal from "./PurchaseCreditsModal";
import { cn } from "../lib/utils";
import { useFirebase } from "../contexts/FirebaseContext";
import { subscribeToUserCredits } from "../lib/firestore";
import {
  WORKSPACE_TOOL_CONFIG,
  normalizeWorkspaceToolMode,
} from "../lib/workspace";

const routeMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/dashboard": {
    eyebrow: "Authenticated workspace",
    title: "Workspace",
    description: "Run write, summary, transcription, and translation work from one saved dashboard canvas.",
  },
  "/dashboard/create": {
    eyebrow: "Legacy workflow",
    title: "Create Post",
    description: "This earlier workflow is still available directly, but the main product surface now lives in Workspace.",
  },
  "/dashboard/inspiration": {
    eyebrow: "Legacy workflow",
    title: "Inspiration",
    description: "Saved reference material from the earlier pipeline structure.",
  },
  "/dashboard/prompts": {
    eyebrow: "Library",
    title: "Prompts",
    description: "Reusable prompt references that can still support the authenticated workspace.",
  },
  "/dashboard/sources": {
    eyebrow: "Legacy workflow",
    title: "Sources",
    description: "Source intake from the earlier content pipeline.",
  },
  "/dashboard/calendar": {
    eyebrow: "Legacy workflow",
    title: "Calendar",
    description: "Scheduling surface retained for older draft flows.",
  },
  "/dashboard/published": {
    eyebrow: "Legacy workflow",
    title: "Published Posts",
    description: "Archive of previously published content items.",
  },
  "/dashboard/failed": {
    eyebrow: "Legacy workflow",
    title: "Failed Posts",
    description: "Recovery queue from the earlier pipeline model.",
  },
  "/dashboard/videos": {
    eyebrow: "Legacy workflow",
    title: "Videos",
    description: "Older video entry point retained outside the primary workspace navigation.",
  },
  "/dashboard/video-generation": {
    eyebrow: "Video generation",
    title: "Video Generator",
    description: "Describe the visual you want, generate it, and track the credit cost before you run.",
  },
  "/dashboard/api-dashboard": {
    eyebrow: "Integrations",
    title: "API Dashboard",
    description: "See what is configured in this workspace right now and what still needs setup.",
  },
  "/dashboard/coach": {
    eyebrow: "Analysis",
    title: "Viral AI Coach",
    description: "Upload a short-form video and get actionable feedback on hook, pacing, and engagement.",
  },
  "/dashboard/help": {
    eyebrow: "Support",
    title: "Help",
    description: "Understand what each workspace section does and where to go next.",
  },
  "/dashboard/admin": {
    eyebrow: "Operations",
    title: "Admin Panel",
    description: "Review billing, account access, and workspace operations from one internal control surface.",
  },
  "/dashboard/settings": {
    eyebrow: "Workspace config",
    title: "Settings",
    description: "Manage brand voice, connected accounts, billing, and the preferences that shape output.",
  },
};

export function Layout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthReady } = useFirebase();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const activeTool = normalizeWorkspaceToolMode(searchParams.get("tool"));
  const workspaceHeaderMeta =
    location.pathname === "/dashboard"
      ? {
          eyebrow: "Authenticated workspace",
          title: WORKSPACE_TOOL_CONFIG[activeTool].label,
          description: WORKSPACE_TOOL_CONFIG[activeTool].description,
        }
      : null;
  const headerMeta =
    workspaceHeaderMeta ?? routeMeta[location.pathname] ?? routeMeta["/dashboard"];
  const isCompactCanvas = ["/dashboard/create", "/dashboard/inspiration", "/dashboard/videos"].includes(
    location.pathname,
  );
  const profileInitial = useMemo(
    () => user?.email?.trim()?.charAt(0)?.toUpperCase() || "U",
    [user],
  );

  useEffect(() => {
    if (!isAuthReady || !user) return;
    return subscribeToUserCredits(user.uid, setCredits);
  }, [isAuthReady, user]);

  useEffect(() => {
    if (searchParams.get("buy") !== "true") return;
    setIsPurchaseModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("buy");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex min-h-screen bg-[#f4ede4] font-sans text-[#17131d]">
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
        isDesktopExpanded={isDesktopSidebarExpanded}
        onDesktopExpandedChange={setIsDesktopSidebarExpanded}
      />

      <main
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300",
          isDesktopSidebarExpanded ? "lg:ml-64" : "lg:ml-16",
        )}
      >
        <div className="sticky top-0 z-[55] border-b border-black/6 bg-[#fffaf6]/92 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 lg:px-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen((current) => !current)}
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/8 bg-white text-[#17131d] shadow-sm lg:hidden"
                  aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                >
                  {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8c5f74] sm:text-[11px]">
                    {headerMeta.eyebrow}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <h1 className="truncate text-base font-semibold tracking-[-0.03em] text-[#17131d] sm:text-xl">
                      {headerMeta.title}
                    </h1>
                    <Link
                      to="/"
                      className="hidden rounded-full border border-black/8 bg-white px-3 py-1 text-xs font-medium text-[#6e5e58] transition hover:border-[#8c5f74]/25 hover:text-[#17131d] sm:inline-flex"
                    >
                      View Home
                    </Link>
                  </div>
                  <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-[#6e5e58] md:block">
                    {headerMeta.description}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#6e5e58] shadow-sm">
                  <Coins className="h-4 w-4 text-[#8c5f74]" />
                  <span className="font-medium text-[#17131d]">
                    {credits === null ? "..." : credits}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-[#d7b6c5] bg-[#f8e8ee] px-3 text-sm font-medium text-[#8c3857] transition hover:bg-[#f4dbe5] sm:px-4"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add credits</span>
                  <span className="sm:hidden">Add</span>
                </button>

                <Link
                  to="/dashboard/settings?tab=profile"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17131d] text-sm font-semibold text-white shadow-sm transition hover:bg-[#2a2238]"
                >
                  {profileInitial}
                </Link>
              </div>
            </div>

            <p className="pl-[3.25rem] text-[13px] leading-5 text-[#6e5e58] md:hidden">
              {headerMeta.description}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mx-auto flex min-h-0 w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-10",
            isCompactCanvas && "px-2 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6",
            location.pathname === "/dashboard" && "p-0",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </div>
        </div>
      </main>

      <PurchaseCreditsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onPurchase={(amount) => {
          console.warn(`Requested top-up for ${amount} credits`);
        }}
        purchasesDisabled
        disabledReason="Self-serve checkout is still being finalized, so top-ups are requested manually for now."
        currentCredits={credits}
      />
    </div>
  );
}
