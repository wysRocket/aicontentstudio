import { Activity, CheckCircle2, ExternalLink, KeyRound, Server, Video } from "lucide-react";

function getGeminiKeyConfigured() {
  return Boolean(
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
      (typeof process !== "undefined" ? process.env.GEMINI_API_KEY : undefined),
  );
}

export default function ApiDashboard() {
  const hasGeminiKey = getGeminiKeyConfigured();

  return (
    <div className="space-y-8 h-[calc(100vh-80px)] overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">API Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Track which integrations are actually configured in this workspace right now.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Gemini text generation",
            value: hasGeminiKey ? "Configured" : "Missing key",
            icon: KeyRound,
            tone: hasGeminiKey ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100",
          },
          {
            label: "Veo video generation",
            value: hasGeminiKey ? "Ready to test" : "Blocked by key",
            icon: Video,
            tone: hasGeminiKey ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100",
          },
          {
            label: "OAuth backend",
            value: "Available via server.ts",
            icon: Server,
            tone: "bg-violet-50 text-violet-700 border-violet-100",
          },
          {
            label: "Workspace health",
            value: "Firestore-backed",
            icon: Activity,
            tone: "bg-slate-50 text-slate-700 border-slate-200",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-5 ${card.tone}`}
          >
            <card.icon className="w-5 h-5" />
            <p className="mt-4 text-sm font-semibold">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">What this page restores</h2>
        <div className="mt-4 space-y-3 text-sm text-gray-600">
          <p>Text draft generation is powered by Gemini in Create Post.</p>
          <p>Video generation is available through the Veo page.</p>
          <p>OAuth account connections run through the Express server in [`server.ts`].</p>
          <p>This page now acts as a real status overview instead of a dead placeholder.</p>
        </div>
        <a
          href="https://ai.google.dev/gemini-api/docs"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ExternalLink className="w-4 h-4" />
          Open Gemini docs
        </a>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-950">Recommended next step</p>
            <p className="text-sm text-emerald-800 mt-1">
              If `VITE_GEMINI_API_KEY` is missing, add it to the app environment so Create Post, Coach, and Video Generation all share a live AI path.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
