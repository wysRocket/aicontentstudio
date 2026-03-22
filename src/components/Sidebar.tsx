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
  Bot,
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
      <div className={cn("mb-8 flex items-center", isHovered ? "w-full px-2" : "justify-center")}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white shadow-sm shrink-0">
          <Bot className="w-6 h-6" />
        </div>
        {isHovered && (
          <span className="ml-3 font-bold text-xl text-gray-900">AIcontentStudio</span>
        )}
      </div>

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
