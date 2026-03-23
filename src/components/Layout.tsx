import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { cn } from "../lib/utils";

const mobileRouteTitles: Record<string, string> = {
  "/dashboard/create": "Create Post",
  "/dashboard/inspiration": "Inspiration",
  "/dashboard/prompts": "Prompts",
  "/dashboard/sources": "Sources",
  "/dashboard/calendar": "Calendar",
  "/dashboard/published": "Published",
  "/dashboard/failed": "Failed",
  "/dashboard/videos": "Videos",
  "/dashboard/video-generation": "Video Generator",
  "/dashboard/api-dashboard": "API Dashboard",
  "/dashboard/coach": "Viral AI Coach",
  "/dashboard/help": "Help",
  "/dashboard/settings": "Settings",
};

export function Layout() {
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isDashboardHome = location.pathname === "/dashboard";
  const mobileTitle = mobileRouteTitles[location.pathname] ?? "Workspace";

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      {isDashboardHome ? (
        <button
          type="button"
          onClick={() => setIsMobileNavOpen((current) => !current)}
          className="fixed left-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white/95 text-gray-700 shadow-lg backdrop-blur lg:hidden"
          aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      ) : null}

      <main className="min-w-0 flex-1 lg:ml-16">
        <div className="mx-auto h-full max-w-7xl p-4 sm:p-6 lg:p-10">
          {!isDashboardHome ? (
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen((current) => !current)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm"
                aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              >
                {isMobileNavOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Internal workspace
                </p>
                <p className="truncate text-lg font-semibold text-gray-900">
                  {mobileTitle}
                </p>
              </div>
            </div>
          ) : null}

          <div className={cn("h-full", isDashboardHome ? "-mx-4 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-10 lg:-my-10" : "")}>
          <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
