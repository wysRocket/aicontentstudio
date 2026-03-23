import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import {
  PlusCircle,
  Lightbulb,
  MessageSquare,
  FolderOpen,
  Calendar,
  FileText,
  AlertTriangle,
  Video,
  Gauge,
  Sparkles,
  HelpCircle,
  Settings,
} from "lucide-react";

const mainNavItems = [
  { icon: PlusCircle, label: "Create Post", href: "/dashboard/create" },
  { icon: Lightbulb, label: "Inspiration", href: "/dashboard/inspiration" },
  { icon: MessageSquare, label: "Prompts", href: "/dashboard/prompts" },
  { icon: FolderOpen, label: "Sources", href: "/dashboard/sources" },
  { icon: Calendar, label: "Calendar", href: "/dashboard/calendar" },
  { icon: FileText, label: "Published Posts", href: "/dashboard/published" },
  { icon: AlertTriangle, label: "Failed Posts", href: "/dashboard/failed" },
  { icon: Video, label: "Videos", href: "/dashboard/videos" },
  { icon: Gauge, label: "API Dashboard", href: "/dashboard/api-dashboard" },
  { icon: Sparkles, label: "Viral AI Coach", href: "/dashboard/coach" },
];

const bottomNavItems = [
  { icon: HelpCircle, label: "Help", href: "/dashboard/help", color: "text-rose-500" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings", color: "text-blue-500" },
];

export function Sidebar() {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={cn(
        "h-screen bg-[#F9FAFB] border-r border-gray-200 flex flex-col fixed left-0 top-0 items-center py-4 transition-all duration-300 z-50",
        isHovered ? "w-64 items-start px-4" : "w-16 items-center"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Area */}
      <Link to="/" className={cn("mb-8 flex items-center transition-colors text-text-main hover:text-primary mt-2", isHovered ? "w-full justify-start px-4" : "justify-center")}>
        <svg aria-hidden="true" focusable="false" height="26" viewBox="0 0 1306 1306" width="26" xmlns="http://www.w3.org/2000/svg" className="shrink-0 group-hover:text-primary transition-colors text-gray-800">
          <path d="M1161 653c0-114-38-220-101-305-29 22-69 19-95-6-26-26-28-67-7-95-85-64-190-102-305-102-140 0-267 57-359 149-92 92-149 219-149 359 0 140 57 267 149 359 92 92 219 149 359 149 140 0 267-57 359-149 92-92 149-219 149-359zm-100-510l73-73c28-29 74-29 103 0 28 28 28 74 0 102l-74 73c90 112 143 254 143 408 0 180-73 344-191 462-118 118-282 191-462 191-180 0-343-73-462-191-118-118-191-282-191-462 0-180 73-343 191-462 119-118 282-191 462-191 154 0 296 53 408 143zm-214 510c0-107-87-193-194-193-107 0-193 86-193 193 0 107 86 194 193 194 107 0 194-87 194-194z" fill="currentColor"></path>
        </svg>
        {isHovered && (
          <span className="ml-3 font-semibold text-lg whitespace-nowrap text-gray-900 leading-none">AI Content Studio</span>
        )}
      </Link>

      {/* Main Navigation */}
      <nav className="flex-1 w-full flex flex-col space-y-2 overflow-y-auto overflow-x-hidden">
        {mainNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              title={!isHovered ? item.label : undefined}
              className={cn(
                "p-2.5 rounded-lg transition-colors group relative flex items-center w-full",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500",
                  isHovered ? "mr-3" : "mx-auto"
                )}
              />
              {isHovered && (
                <span className="font-medium whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="w-full flex flex-col space-y-2 pt-4 border-t border-gray-200 mt-auto">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              title={!isHovered ? item.label : undefined}
              className={cn(
                "p-2.5 rounded-lg transition-colors group relative flex items-center w-full",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  item.color || (isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500"),
                  isHovered ? "mr-3" : "mx-auto"
                )}
              />
              {isHovered && (
                <span className={cn("font-medium whitespace-nowrap", item.color)}>{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
