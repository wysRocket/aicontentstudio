import { useEffect, useState } from "react";
import { KeyRound, Loader2, Server } from "lucide-react";
import { useFirebase } from "../../contexts/FirebaseContext";
import {
  ensureWorkspaceSeedData,
  getWorkspaceSettings,
  saveWorkspaceSettings,
  type WorkspaceSettings,
} from "../../lib/firestore";

type ApiForm = Pick<
  WorkspaceSettings,
  | "preferredTextModel"
  | "preferredVideoModel"
  | "apiBaseUrl"
  | "webhookUrl"
  | "supportEmail"
>;

function hasGeminiKey() {
  return Boolean(
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    (typeof process !== "undefined" ? process.env.GEMINI_API_KEY : undefined),
  );
}

export function Api() {
  const { user, isAuthReady } = useFirebase();
  const [form, setForm] = useState<ApiForm>({
    preferredTextModel: "",
    preferredVideoModel: "",
    apiBaseUrl: "",
    webhookUrl: "",
    supportEmail: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<ApiForm | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    ensureWorkspaceSeedData(user.uid)
      .then(() => getWorkspaceSettings(user.uid))
      .then((settings) => {
        const nextForm = {
          preferredTextModel: settings.preferredTextModel,
          preferredVideoModel: settings.preferredVideoModel,
          apiBaseUrl: settings.apiBaseUrl,
          webhookUrl: settings.webhookUrl,
          supportEmail: settings.supportEmail,
        };
        setForm(nextForm);
        setInitialForm(nextForm);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [isAuthReady, user]);

  const hasChanges =
    initialForm !== null &&
    JSON.stringify(form) !== JSON.stringify(initialForm);

  const save = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage(null);
    const current = await getWorkspaceSettings(user.uid);
    await saveWorkspaceSettings(user.uid, {
      ...current,
      ...form,
    });
    setInitialForm(form);
    setIsSaving(false);
    setMessage("API settings saved.");
  };

  const reset = () => {
    if (!initialForm) return;
    setForm(initialForm);
    setMessage(null);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#7c5cff]" />
        Loading API settings...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div
          className={`rounded-2xl border p-5 ${hasGeminiKey() ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}
        >
          <KeyRound className="w-5 h-5" />
          <p className="mt-3 text-sm font-semibold">Gemini key</p>
          <p className="mt-1 text-2xl font-bold">
            {hasGeminiKey() ? "Configured" : "Missing"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#7c5cff]/30 bg-[#7c5cff]/10 p-5 text-[#a78bfa]">
          <Server className="w-5 h-5" />
          <p className="mt-3 text-sm font-semibold">Backend</p>
          <p className="mt-1 text-2xl font-bold">server.ts</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">API Preferences</h2>
        <p className="text-sm text-white/60 mt-1">
          Store the non-secret integration preferences your team uses inside the
          workspace.
        </p>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="api-preferred-text-model"
                className="block text-sm font-medium text-white/80 mb-1.5"
              >
                Preferred text model
              </label>
              <input
                id="api-preferred-text-model"
                value={form.preferredTextModel}
                onChange={(e) =>
                  setForm({ ...form, preferredTextModel: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
              />
            </div>
            <div>
              <label
                htmlFor="api-preferred-video-model"
                className="block text-sm font-medium text-white/80 mb-1.5"
              >
                Preferred video model
              </label>
              <input
                id="api-preferred-video-model"
                value={form.preferredVideoModel}
                onChange={(e) =>
                  setForm({ ...form, preferredVideoModel: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="api-base-url"
              className="block text-sm font-medium text-white/80 mb-1.5"
            >
              API base URL
            </label>
            <input
              id="api-base-url"
              value={form.apiBaseUrl}
              onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="api-webhook-url"
                className="block text-sm font-medium text-white/80 mb-1.5"
              >
                Webhook URL
              </label>
              <input
                id="api-webhook-url"
                value={form.webhookUrl}
                onChange={(e) =>
                  setForm({ ...form, webhookUrl: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
              />
            </div>
            <div>
              <label
                htmlFor="api-support-email"
                className="block text-sm font-medium text-white/80 mb-1.5"
              >
                Support email
              </label>
              <input
                id="api-support-email"
                value={form.supportEmail}
                onChange={(e) =>
                  setForm({ ...form, supportEmail: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !hasChanges}
            className="rounded-xl bg-[#7c5cff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6b4ef0] disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save API Settings"}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={!hasChanges || isSaving}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 disabled:opacity-60"
          >
            Reset
          </button>
          {hasChanges && !message && (
            <p className="text-sm text-amber-400">Unsaved changes</p>
          )}
          {message && <p className="text-sm text-emerald-400">{message}</p>}
        </div>
      </div>
    </div>
  );
}
