import { useEffect, useState } from "react";
import { Loader2, Palette } from "lucide-react";
import { useFirebase } from "../../contexts/FirebaseContext";
import {
  ensureWorkspaceSeedData,
  getWorkspaceSettings,
  saveWorkspaceSettings,
  type WorkspaceSettings,
} from "../../lib/firestore";

type BrandForm = Pick<
  WorkspaceSettings,
  | "brandName"
  | "brandVoice"
  | "brandColors"
  | "brandKeywords"
  | "brandAudience"
  | "ctaStyle"
  | "bannedPhrases"
>;

export function Brand() {
  const { user, isAuthReady } = useFirebase();
  const [form, setForm] = useState<BrandForm>({
    brandName: "",
    brandVoice: "",
    brandColors: "",
    brandKeywords: "",
    brandAudience: "",
    ctaStyle: "",
    bannedPhrases: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<BrandForm | null>(null);

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
          brandName: settings.brandName,
          brandVoice: settings.brandVoice,
          brandColors: settings.brandColors,
          brandKeywords: settings.brandKeywords,
          brandAudience: settings.brandAudience,
          ctaStyle: settings.ctaStyle,
          bannedPhrases: settings.bannedPhrases,
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
    setMessage("Brand settings saved.");
  };

  const reset = () => {
    if (!initialForm) return;
    setForm(initialForm);
    setMessage(null);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-violet-500" />
        Loading brand settings...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-6">
          <Palette className="w-5 h-5 text-violet-600 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">My Brand</h2>
            <p className="text-sm text-gray-500 mt-1">
              These settings shape the tone and positioning used across your
              workspace.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="brand-name"
              className="block text-sm font-medium text-gray-800 mb-1.5"
            >
              Brand name
            </label>
            <input
              id="brand-name"
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label
              htmlFor="brand-voice"
              className="block text-sm font-medium text-gray-800 mb-1.5"
            >
              Brand voice
            </label>
            <textarea
              id="brand-voice"
              value={form.brandVoice}
              onChange={(e) => setForm({ ...form, brandVoice: e.target.value })}
              className="w-full min-h-[140px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="brand-colors"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Brand colors
              </label>
              <input
                id="brand-colors"
                value={form.brandColors}
                onChange={(e) =>
                  setForm({ ...form, brandColors: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label
                htmlFor="brand-keywords"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Brand keywords
              </label>
              <input
                id="brand-keywords"
                value={form.brandKeywords}
                onChange={(e) =>
                  setForm({ ...form, brandKeywords: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="brand-audience"
              className="block text-sm font-medium text-gray-800 mb-1.5"
            >
              Brand audience
            </label>
            <input
              id="brand-audience"
              value={form.brandAudience}
              onChange={(e) =>
                setForm({ ...form, brandAudience: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="brand-cta-style"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                CTA style
              </label>
              <input
                id="brand-cta-style"
                value={form.ctaStyle}
                onChange={(e) => setForm({ ...form, ctaStyle: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label
                htmlFor="brand-banned-phrases"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Banned phrases
              </label>
              <input
                id="brand-banned-phrases"
                value={form.bannedPhrases}
                onChange={(e) =>
                  setForm({ ...form, bannedPhrases: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !hasChanges}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save Brand"}
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
