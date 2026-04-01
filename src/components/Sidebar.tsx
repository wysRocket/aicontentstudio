import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import {
  X,
  HelpCircle,
  Settings,
  Shield,
  PenSquare,
  ScanText,
  AudioLines,
  Languages,
  ImageIcon,
  FileText,
  Layers,
} from "lucide-react";
import {
  WORKSPACE_TOOL_CONFIG,
  WORKSPACE_TOOL_MODES,
  getWorkspaceToolHref,
  normalizeWorkspaceToolMode,
  type WorkspaceToolMode,
} from "../lib/workspace";

const mainNavItems = [
  { icon: PenSquare, mode: "write_rewrite" },
  { icon: ScanText, mode: "summarize" },
  { icon: AudioLines, mode: "transcribe" },
  { icon: Languages, mode: "translate" },
  { icon: ImageIcon, mode: "generate_image" },
  { icon: FileText, mode: "create_document" },
  { icon: Layers, mode: "create_presentation" },
] satisfies Array<{ icon: typeof PenSquare; mode: WorkspaceToolMode }>;

const bottomNavItems = [
  { icon: Shield, label: "Admin", href: "/dashboard/admin", color: "text-amber-400" },
  { icon: HelpCircle, label: "Help", href: "/dashboard/help", color: "text-rose-500" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings", color: "text-blue-500" },
];

type SidebarProps = {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isDesktopExpanded?: boolean;
  onDesktopExpandedChange?: (expanded: boolean) => void;
};

function SidebarNav({
  isExpanded,
  onNavigate,
}: {
  isExpanded: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeTool = normalizeWorkspaceToolMode(searchParams.get("tool"));

  return (
    <>
      <Link
        to="/"
        onClick={onNavigate}
        className={cn(
          "mb-3 mt-1 flex shrink-0 items-center text-white transition-colors hover:text-[#c4b5fd]",
          isExpanded ? "w-full justify-start px-4" : "justify-center",
        )}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          height="24"
          viewBox="0 0 1306 1306"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 text-white"
        >
          <path d="M1161 653c0-114-38-220-101-305-29 22-69 19-95-6-26-26-28-67-7-95-85-64-190-102-305-102-140 0-267 57-359 149-92 92-149 219-149 359 0 140 57 267 149 359 92 92 219 149 359 149 140 0 267-57 359-149 92-92 149-219 149-359zm-100-510l73-73c28-29 74-29 103 0 28 28 28 74 0 102l-74 73c90 112 143 254 143 408 0 180-73 344-191 462-118 118-282 191-462 191-180 0-343-73-462-191-118-118-191-282-191-462 0-180 73-343 191-462 119-118 282-191 462-191 154 0 296 53 408 143zm-214 510c0-107-87-193-194-193-107 0-193 86-193 193 0 107 86 194 193 194 107 0 194-87 194-194z" fill="currentColor"></path>
        </svg>
        {isExpanded && (
          <span className="ml-3 whitespace-nowrap text-base font-semibold leading-none text-white">
            AI Content Studio
          </span>
        )}
      </Link>

      {/* Scrollable tools + sticky bottom — wrapped so justify-between works cleanly */}
      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden space-y-0.5">
          {isExpanded && (
            <div className="px-4 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Tools
              </p>
            </div>
          )}
          {mainNavItems.map((item) => {
            const href = getWorkspaceToolHref(item.mode);
            const isActive =
              location.pathname === "/dashboard" && activeTool === item.mode;
            const label = WORKSPACE_TOOL_CONFIG[item.mode].label;
            return (
              <Link
                key={item.mode}
                to={href}
                onClick={onNavigate}
                title={!isExpanded ? label : undefined}
                className={cn(
                  "group relative flex w-full items-center rounded-lg p-2 transition-colors",
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-white/62 hover:bg-white/8 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    isActive ? "text-[#a78bfa]" : "text-white/42 group-hover:text-white/72",
                    isExpanded ? "mr-2.5" : "mx-auto",
                  )}
                />
                {isExpanded && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-white/10 pt-2 mt-2">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                title={!isExpanded ? item.label : undefined}
                className={cn(
                  "group relative flex w-full items-center rounded-lg p-2 transition-colors",
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-white/62 hover:bg-white/8 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    item.color || (isActive ? "text-[#a78bfa]" : "text-white/42 group-hover:text-white/72"),
                    isExpanded ? "mr-2.5" : "mx-auto",
                  )}
                />
                {isExpanded && (
                  <span className={cn("text-sm font-medium whitespace-nowrap", item.color)}>{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
  isDesktopExpanded = false,
  onDesktopExpandedChange,
}: SidebarProps) {
  useEffect(() => {
    if (!isMobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileOpen]);

  return (
    <>
      <div
        className={cn(
          "fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-white/10 bg-[#17131d] py-4 transition-all duration-300 lg:flex",
          isDesktopExpanded ? "w-64 items-start px-4" : "w-16 items-center",
        )}
        onMouseEnter={() => onDesktopExpandedChange?.(true)}
        onMouseLeave={() => onDesktopExpandedChange?.(false)}
      >
        <SidebarNav isExpanded={isDesktopExpanded} />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-[65] bg-slate-950/35 backdrop-blur-[2px] transition lg:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onMobileClose}
        aria-hidden={!isMobileOpen}
      >
        <aside
          className={cn(
            "flex h-full min-h-0 w-[min(84vw,320px)] flex-col border-r border-white/10 bg-[#17131d] px-4 py-4 text-white shadow-2xl transition-transform duration-300",
            isMobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Navigation
            </p>
            <button
              type="button"
              onClick={onMobileClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 shadow-sm ring-1 ring-white/10"
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidebarNav isExpanded onNavigate={onMobileClose} />
        </aside>
      </div>
    </>
  );
}
