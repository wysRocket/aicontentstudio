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
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
        Loading API settings...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div
          className={`rounded-2xl border p-5 ${hasGeminiKey() ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800"}`}
        >
          <KeyRound className="w-5 h-5" />
          <p className="mt-3 text-sm font-semibold">Gemini key</p>
          <p className="mt-1 text-2xl font-bold">
            {hasGeminiKey() ? "Configured" : "Missing"}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 text-violet-800">
          <Server className="w-5 h-5" />
          <p className="mt-3 text-sm font-semibold">Backend</p>
          <p className="mt-1 text-2xl font-bold">server.ts</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">API Preferences</h2>
        <p className="text-sm text-gray-500 mt-1">
          Store the non-secret integration preferences your team uses inside the
          workspace.
        </p>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="api-preferred-text-model"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Preferred text model
              </label>
              <input
                id="api-preferred-text-model"
                value={form.preferredTextModel}
                onChange={(e) =>
                  setForm({ ...form, preferredTextModel: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="api-preferred-video-model"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Preferred video model
              </label>
              <input
                id="api-preferred-video-model"
                value={form.preferredVideoModel}
                onChange={(e) =>
                  setForm({ ...form, preferredVideoModel: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="api-base-url"
              className="block text-sm font-medium text-gray-800 mb-1.5"
            >
              API base URL
            </label>
            <input
              id="api-base-url"
              value={form.apiBaseUrl}
              onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="api-webhook-url"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Webhook URL
              </label>
              <input
                id="api-webhook-url"
                value={form.webhookUrl}
                onChange={(e) =>
                  setForm({ ...form, webhookUrl: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="api-support-email"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Support email
              </label>
              <input
                id="api-support-email"
                value={form.supportEmail}
                onChange={(e) =>
                  setForm({ ...form, supportEmail: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !hasChanges}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save API Settings"}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={!hasChanges || isSaving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Reset
          </button>
          {hasChanges && !message && (
            <p className="text-sm text-amber-700">Unsaved changes</p>
          )}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
        </div>
      </div>
    </div>
  );
}
