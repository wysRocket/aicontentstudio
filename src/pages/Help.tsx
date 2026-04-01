import {
  BookOpen,
  LifeBuoy,
  Lightbulb,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Help() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Help</h1>
        <p className="text-white/50 mt-2">
          Quick entry points for the restored workflow: prompt library,
          inspiration, post generation, and account setup.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            title: "Build your prompt library",
            body: "Start by saving reusable prompt templates so your post generator uses consistent structures.",
            icon: MessageSquare,
            href: "/dashboard/prompts",
          },
          {
            title: "Save inspiration examples",
            body: "Use Inspiration as your swipe file, then remix good patterns into Create Post.",
            icon: Lightbulb,
            href: "/dashboard/inspiration",
          },
          {
            title: "Generate and track drafts",
            body: "Create Post now saves real content records, and Calendar/Published/Failed work from that same data.",
            icon: Sparkles,
            href: "/dashboard/create",
          },
          {
            title: "Connect channels",
            body: "Twitter, LinkedIn, and YouTube connections live in Settings so your workspace knows which endpoints are available.",
            icon: LifeBuoy,
            href: "/dashboard/settings?tab=accounts",
          },
        ].map((item) => (
          <Link
            key={item.title}
            to={item.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:-translate-y-0.5 transition-transform"
          >
            <item.icon className="w-6 h-6 text-[#7c5cff]" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-white/60 leading-6">{item.body}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-[#7c5cff]/30 bg-[#7c5cff]/10 p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-[#a78bfa] mt-0.5" />
          <div>
            <p className="font-semibold text-white">Current product scope</p>
            <p className="text-sm text-white/60 mt-1">
              The restored sections are now functional workspace tools. Billing
              automation, team collaboration, and social scheduling are still
              roadmap work rather than live end-to-end systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
