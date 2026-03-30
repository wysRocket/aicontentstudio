import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  FileAudio,
  Languages,
  Loader2,
  PenSquare,
  Plus,
  Save,
  ScanText,
  Sparkles,
  Wand2,
  AlertTriangle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { GoogleGenAI } from "@google/genai";
import { useFirebase } from "../contexts/FirebaseContext";
import {
  deductCredits,
  ensureWorkspaceSeedData,
  saveWorkspaceRun,
  subscribeToUserCredits,
  subscribeToWorkspaceRuns,
} from "../lib/firestore";
import {
  WORKSPACE_TOOL_CONFIG,
  buildWorkspacePrompt,
  createWorkspaceRunDraft,
  getDefaultWorkspaceRunTitle,
  normalizeWorkspaceToolMode,
  type WorkspaceRunInput,
  type WorkspaceRunRecord,
  type WorkspaceToolMode,
} from "../lib/workspace";

const MODE_ICONS = {
  write_rewrite: PenSquare,
  summarize: ScanText,
  transcribe: AudioLines,
  translate: Languages,
} satisfies Record<WorkspaceToolMode, typeof PenSquare>;

const MODE_ACCENTS = {
  write_rewrite:
    "border-[#d9c8e8] bg-[linear-gradient(180deg,#fff8ff_0%,#fffdf7_100%)] text-[#5b3c6e]",
  summarize:
    "border-[#d9dfef] bg-[linear-gradient(180deg,#f8fbff_0%,#fffdf9_100%)] text-[#41546d]",
  transcribe:
    "border-[#d8e6db] bg-[linear-gradient(180deg,#f5fff6_0%,#fffdf8_100%)] text-[#365947]",
  translate:
    "border-[#ead8c7] bg-[linear-gradient(180deg,#fffaf2_0%,#fffdf7_100%)] text-[#8a5a34]",
} satisfies Record<WorkspaceToolMode, string>;

const OUTPUT_PANEL_ACCENTS = {
  write_rewrite: "from-[#1f1630] via-[#32204a] to-[#71435f]",
  summarize: "from-[#172236] via-[#253755] to-[#526d86]",
  transcribe: "from-[#14241c] via-[#1f3b30] to-[#53735f]",
  translate: "from-[#2b1d12] via-[#5a3316] to-[#8b5a27]",
} satisfies Record<WorkspaceToolMode, string>;

const TOOL_ORDER: WorkspaceToolMode[] = [
  "write_rewrite",
  "summarize",
  "transcribe",
  "translate",
];

function createEmptyDraftsByMode() {
  return {
    write_rewrite: createWorkspaceRunDraft("write_rewrite"),
    summarize: createWorkspaceRunDraft("summarize"),
    transcribe: createWorkspaceRunDraft("transcribe"),
    translate: createWorkspaceRunDraft("translate"),
  } satisfies Record<WorkspaceToolMode, WorkspaceRunInput>;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function getGeminiApiKey() {
  return (
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    (typeof process !== "undefined" ? process.env.GEMINI_API_KEY : undefined)
  );
}

function formatUpdatedAt(run: WorkspaceRunRecord) {
  const date = run.updatedAt?.toDate();
  return date ? dateFormatter.format(date) : "Unsaved";
}

function formatStatus(status: string) {
  if (status === "completed") return "Done";
  if (status === "failed") return "Failed";
  return "Draft";
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to encode the selected audio file."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () =>
      reject(new Error("Failed to read the selected audio file."));
  });
}

function toEditableRun(run: WorkspaceRunRecord): WorkspaceRunInput {
  return createWorkspaceRunDraft(run.mode, {
    title: run.title,
    sourceText: run.sourceText,
    instructions: run.instructions,
    outputText: run.outputText,
    targetLanguage: run.targetLanguage,
    status: run.status,
    creditCost: run.creditCost,
    sourceFileName: run.sourceFileName,
    sourceMimeType: run.sourceMimeType,
    lastError: run.lastError,
  });
}

function hasEditorContent(run: WorkspaceRunInput) {
  return Boolean(
    run.title.trim() ||
    run.sourceText.trim() ||
    run.instructions.trim() ||
    run.outputText.trim() ||
    run.targetLanguage.trim() ||
    run.sourceFileName.trim() ||
    run.lastError.trim(),
  );
}

function getRunValidationMessage(
  mode: WorkspaceToolMode,
  run: WorkspaceRunInput,
  selectedFile: File | null,
) {
  if (mode === "transcribe") {
    if (!selectedFile) {
      return "Upload an audio file to transcribe. Saved transcripts keep the output, but audio files are not stored in Firestore.";
    }
    return null;
  }

  if (!run.sourceText.trim()) {
    return "Add source text before running this tool.";
  }

  if (mode === "translate" && !run.targetLanguage.trim()) {
    return "Choose a target language before generating a translation.";
  }

  return null;
}

export default function Dashboard() {
  const { user, isAuthReady } = useFirebase();
  const [searchParams, setSearchParams] = useSearchParams();
  const [runs, setRuns] = useState<WorkspaceRunRecord[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [editor, setEditor] = useState<WorkspaceRunInput>(
    createWorkspaceRunDraft("write_rewrite"),
  );
  const [draftsByMode, setDraftsByMode] = useState<
    Record<WorkspaceToolMode, WorkspaceRunInput>
  >(() => createEmptyDraftsByMode());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [showAllRuns, setShowAllRuns] = useState(false);
  const autosaveHashRef = useRef("");
  const activeMode = normalizeWorkspaceToolMode(searchParams.get("tool"));

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady) {
        setRuns([]);
        setCredits(0);
        setSelectedRunId("");
        setEditor(createWorkspaceRunDraft("write_rewrite"));
        setDraftsByMode(createEmptyDraftsByMode());
        setLastSavedAt(null);
        setIsLoading(false);
      }
      return;
    }

    let isMounted = true;
    let unsubscribeRuns = () => {};
    let unsubscribeCredits = () => {};

    setIsLoading(true);
    setError(null);

    ensureWorkspaceSeedData(user.uid)
      .then(() => {
        if (!isMounted) return;

        unsubscribeRuns = subscribeToWorkspaceRuns(user.uid, (records) => {
          if (!isMounted) return;
          setRuns(records);
          setIsLoading(false);
        });

        unsubscribeCredits = subscribeToUserCredits(user.uid, (nextCredits) => {
          if (!isMounted) return;
          setCredits(nextCredits);
        });
      })
      .catch((err) => {
        console.error("Failed to initialize workspace", err);
        if (!isMounted) return;
        setError("We couldn't load the shared workspace right now.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      unsubscribeRuns();
      unsubscribeCredits();
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!runs.length) {
      if (!selectedRunId) {
        const draft = draftsByMode[activeMode];
        setEditor(draft);
      }
      return;
    }

    const selectedRun = runs.find((run) => run.id === selectedRunId);
    if (selectedRun) return;

    const nextRun = runs.find((run) => run.mode === activeMode) ?? runs[0];
    if (!nextRun) return;

    const editableRun = toEditableRun(nextRun);
    setSelectedRunId(nextRun.id);
    setEditor(editableRun);
    setDraftsByMode((current) => ({
      ...current,
      [nextRun.mode]: editableRun,
    }));
  }, [activeMode, draftsByMode, runs, selectedRunId]);

  const activeRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  const modeRuns = useMemo(
    () => runs.filter((run) => run.mode === activeMode),
    [activeMode, runs],
  );

  const displayedRuns = showAllRuns ? runs : modeRuns;

  const modeMeta = WORKSPACE_TOOL_CONFIG[activeMode];
  const ModeIcon = MODE_ICONS[activeMode];

  const isDirty = useMemo(() => {
    if (!activeRun) {
      return hasEditorContent(editor) || Boolean(selectedFile);
    }

    return (
      activeRun.title !== editor.title ||
      activeRun.sourceText !== editor.sourceText ||
      activeRun.instructions !== editor.instructions ||
      activeRun.outputText !== editor.outputText ||
      activeRun.targetLanguage !== editor.targetLanguage ||
      activeRun.status !== editor.status ||
      activeRun.creditCost !== editor.creditCost ||
      activeRun.sourceFileName !== editor.sourceFileName ||
      activeRun.sourceMimeType !== editor.sourceMimeType ||
      activeRun.lastError !== editor.lastError ||
      Boolean(selectedFile)
    );
  }, [activeRun, editor, selectedFile]);

  const generationValidationMessage = useMemo(
    () => getRunValidationMessage(activeMode, editor, selectedFile),
    [activeMode, editor, selectedFile],
  );

  const selectRun = (run: WorkspaceRunRecord) => {
    setSearchParams({ tool: run.mode });
    setSelectedRunId(run.id);
    const editableRun = toEditableRun(run);
    setEditor(editableRun);
    setDraftsByMode((current) => ({
      ...current,
      [run.mode]: editableRun,
    }));
    setSelectedFile(null);
    setError(null);
    setSuccessMessage(null);
  };

  const startNewRun = (mode: WorkspaceToolMode = activeMode) => {
    setSearchParams({ tool: mode });
    setSelectedRunId("");
    const draft = createWorkspaceRunDraft(mode);
    setEditor(draft);
    setDraftsByMode((current) => ({
      ...current,
      [mode]: draft,
    }));
    setSelectedFile(null);
    setError(null);
    setSuccessMessage(null);
  };

  const switchMode = (mode: WorkspaceToolMode) => {
    setSearchParams({ tool: mode });
    const runForMode = runs.find((run) => run.mode === mode);

    if (runForMode) {
      const editableRun = toEditableRun(runForMode);
      setSelectedRunId(runForMode.id);
      setEditor(editableRun);
      setDraftsByMode((current) => ({
        ...current,
        [mode]: editableRun,
      }));
    } else {
      setSelectedRunId("");
      setEditor(draftsByMode[mode]);
    }

    setSelectedFile(null);
    setError(null);
    setSuccessMessage(null);
  };

  const updateEditor = (patch: Partial<WorkspaceRunInput>) => {
    setEditor((current) => {
      const next = { ...current, ...patch };
      setDraftsByMode((drafts) => ({
        ...drafts,
        [activeMode]: next,
      }));
      return next;
    });
  };

  const persistRun = useCallback(
    async (overrides: Partial<WorkspaceRunInput> = {}) => {
      if (!user) return null;

      const nextMode = overrides.mode ?? activeMode;
      const sourceText = overrides.sourceText ?? editor.sourceText;
      const title =
        (overrides.title ?? editor.title).trim() ||
        getDefaultWorkspaceRunTitle(nextMode, sourceText);

      const payload: WorkspaceRunInput = {
        mode: nextMode,
        title,
        sourceText,
        instructions: overrides.instructions ?? editor.instructions,
        outputText: overrides.outputText ?? editor.outputText,
        targetLanguage: overrides.targetLanguage ?? editor.targetLanguage,
        status: overrides.status ?? editor.status,
        creditCost:
          overrides.creditCost ??
          editor.creditCost ??
          WORKSPACE_TOOL_CONFIG[nextMode].cost,
        sourceFileName: overrides.sourceFileName ?? editor.sourceFileName,
        sourceMimeType: overrides.sourceMimeType ?? editor.sourceMimeType,
        lastError: overrides.lastError ?? editor.lastError,
      };

      const runId = await saveWorkspaceRun(user.uid, {
        id: selectedRunId || undefined,
        ...payload,
      });

      setSelectedRunId(runId);
      setEditor(payload);
      setDraftsByMode((current) => ({
        ...current,
        [nextMode]: payload,
      }));
      setLastSavedAt(new Date());
      return runId;
    },
    [activeMode, editor, selectedRunId, user],
  );

  useEffect(() => {
    if (!user || !isAuthReady || isSaving || isGenerating || !isDirty) return;

    const sourceFileName = selectedFile?.name || editor.sourceFileName;
    const sourceMimeType = selectedFile?.type || editor.sourceMimeType;
    const nextAutosaveHash = JSON.stringify({
      activeMode,
      selectedRunId,
      title: editor.title,
      sourceText: editor.sourceText,
      instructions: editor.instructions,
      outputText: editor.outputText,
      targetLanguage: editor.targetLanguage,
      status: editor.status,
      creditCost: editor.creditCost,
      sourceFileName,
      sourceMimeType,
      lastError: editor.lastError,
    });

    if (autosaveHashRef.current === nextAutosaveHash) return;

    const timeoutId = window.setTimeout(() => {
      persistRun({ sourceFileName, sourceMimeType })
        .then(() => {
          autosaveHashRef.current = nextAutosaveHash;
        })
        .catch((autosaveError) => {
          console.error("Autosave failed", autosaveError);
        });
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeMode,
    editor,
    isAuthReady,
    isDirty,
    isGenerating,
    isSaving,
    selectedFile,
    selectedRunId,
    user,
    persistRun,
  ]);

  const inlineSourceValidation =
    activeMode !== "transcribe" && !editor.sourceText.trim()
      ? "Add source text to run this tool."
      : null;
  const inlineTranscribeValidation =
    activeMode === "transcribe" && !selectedFile
      ? "Select an audio file to transcribe."
      : null;
  const inlineTargetLanguageValidation =
    activeMode === "translate" && !editor.targetLanguage.trim()
      ? "Pick a target language before running translation."
      : null;

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await persistRun({
        sourceFileName: selectedFile?.name || editor.sourceFileName,
        sourceMimeType: selectedFile?.type || editor.sourceMimeType,
      });
      setSuccessMessage("Run saved to your workspace history.");
    } catch (err) {
      console.error("Failed to save workspace run", err);
      setError("We couldn't save this run right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyOutput = async () => {
    if (!editor.outputText.trim()) return;
    await navigator.clipboard.writeText(editor.outputText);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleGenerate = async () => {
    if (!user) return;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setError(
        "No Gemini API key found. Add VITE_GEMINI_API_KEY before running the shared workspace tools.",
      );
      return;
    }

    if (generationValidationMessage) {
      setError(generationValidationMessage);
      return;
    }

    if ((credits ?? 0) < modeMeta.cost) {
      setError(
        `You need at least ${modeMeta.cost} credits for ${modeMeta.label.toLowerCase()}. Use the Add credits control in the header or visit Billing.`,
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      let outputText = "";

      if (activeMode === "transcribe") {
        const file = selectedFile;
        if (!file) {
          throw new Error(
            "Upload an audio file before requesting a transcript.",
          );
        }

        const base64Audio = await readFileAsBase64(file);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Audio,
                },
              },
              {
                text: buildWorkspacePrompt({
                  mode: activeMode,
                  sourceText: editor.sourceText,
                  instructions: editor.instructions,
                  sourceFileName: file.name,
                }),
              },
            ],
          },
        });
        outputText = (response.text || "").trim();
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildWorkspacePrompt({
                    mode: activeMode,
                    sourceText: editor.sourceText,
                    instructions: editor.instructions,
                    targetLanguage: editor.targetLanguage,
                  }),
                },
              ],
            },
          ],
        });
        outputText = (response.text || "").trim();
      }

      if (!outputText) {
        throw new Error("The model returned an empty result.");
      }

      await persistRun({
        outputText,
        status: "completed",
        lastError: "",
        creditCost: modeMeta.cost,
        sourceFileName: selectedFile?.name || editor.sourceFileName,
        sourceMimeType: selectedFile?.type || editor.sourceMimeType,
      });

      await deductCredits(user.uid, modeMeta.cost, {
        description: `${modeMeta.label} run`,
        source: `workspace:${activeMode}`,
      });

      setSuccessMessage(`${modeMeta.label} finished and was saved to history.`);
    } catch (err) {
      console.error(`Failed to run ${activeMode}`, err);
      const message =
        err instanceof Error ? err.message : "We couldn't complete that run.";
      setError(message);

      try {
        await persistRun({
          status: "failed",
          lastError: message,
          sourceFileName: selectedFile?.name || editor.sourceFileName,
          sourceMimeType: selectedFile?.type || editor.sourceMimeType,
        });
      } catch (saveError) {
        console.error("Failed to save errored run state", saveError);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f4ede4] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1480px] space-y-4">
        {/* Compact hero */}
        <section className="overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(135deg,#1a1623_0%,#2b2036_35%,#8a5d74_100%)] px-5 py-4 text-white shadow-[0_20px_60px_rgba(23,19,29,0.18)] sm:px-7 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f8dce6]">
                <Sparkles className="h-3 w-3" />
                Workspace
              </div>
              <h2 className="text-base font-semibold tracking-[-0.02em] text-white/90">
                AI Content Studio
              </h2>
            </div>

            <div className="flex gap-2.5">
              <div className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Credits
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-[#f8dce6]" />
                  <p className="text-sm font-semibold">
                    {credits === null ? "..." : credits}
                  </p>
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  This run
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <ModeIcon className="h-3.5 w-3.5 text-[#f8dce6]" />
                  <p className="text-sm font-semibold">
                    {modeMeta.cost} credits
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mode tab switcher */}
        <div className="flex gap-1.5 rounded-[22px] border border-black/8 bg-white p-1.5 shadow-sm">
          {TOOL_ORDER.map((mode) => {
            const Icon = MODE_ICONS[mode];
            const meta = WORKSPACE_TOOL_CONFIG[mode];
            const isActive = mode === activeMode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => switchMode(mode)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[18px] px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? `border shadow-sm ${MODE_ACCENTS[mode]}`
                    : "text-[#6e5e58] hover:bg-[#f9f6f2] hover:text-[#17131d]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Banners */}
        {error && (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        {/* Main workspace grid */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.14fr)_minmax(360px,0.86fr)]">
          {/* Left column: tool header + input form */}
          <div className="space-y-4">
            {/* Tool header with action buttons */}
            <section
              className={`rounded-[30px] border p-5 shadow-sm ${MODE_ACCENTS[activeMode]}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/75">
                    {modeMeta.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#17131d]">
                    {modeMeta.label}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#6e5e58]">
                    {modeMeta.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-xs text-[#6e5e58] lg:w-auto lg:pr-2 lg:pt-3">
                    {lastSavedAt
                      ? `Last saved ${lastSavedAt.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}`
                      : "Autosave keeps this run updated while you edit"}
                  </p>
                  <button
                    type="button"
                    onClick={() => startNewRun(activeMode)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-[#fff4f6] px-4 py-3 text-sm font-semibold text-[#8c3857] transition hover:bg-[#fdebef]"
                  >
                    <Plus className="h-4 w-4" />
                    New run
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isGenerating || !isDirty}
                    className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#17131d] transition hover:border-[#8c5f74]/20 hover:bg-[#fffaf7] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save run
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={
                      isGenerating ||
                      isSaving ||
                      Boolean(generationValidationMessage)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#17131d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2b2238] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Run tool
                  </button>
                </div>
              </div>
            </section>

            {/* Input form */}
            <section className="rounded-[30px] border border-black/8 bg-white p-5 shadow-sm">
              <div className="grid gap-5">
                <div>
                  <label
                    htmlFor="workspace-run-title"
                    className="mb-2 block text-sm font-semibold text-[#17131d]"
                  >
                    Run title
                  </label>
                  <input
                    id="workspace-run-title"
                    value={editor.title}
                    onChange={(e) => updateEditor({ title: e.target.value })}
                    placeholder={getDefaultWorkspaceRunTitle(activeMode)}
                    className="w-full rounded-2xl border border-black/10 bg-[#fcfaf7] px-4 py-3 text-sm text-[#17131d] outline-none transition focus:border-[#8c5f74] focus:bg-white"
                  />
                </div>

                {activeMode === "translate" && (
                  <div>
                    <label
                      htmlFor="workspace-target-language"
                      className="mb-2 block text-sm font-semibold text-[#17131d]"
                    >
                      Target language
                    </label>
                    <input
                      id="workspace-target-language"
                      value={editor.targetLanguage}
                      onChange={(e) =>
                        updateEditor({ targetLanguage: e.target.value })
                      }
                      placeholder="Spanish, German, Ukrainian, French..."
                      className="w-full rounded-2xl border border-black/10 bg-[#fcfaf7] px-4 py-3 text-sm text-[#17131d] outline-none transition focus:border-[#8c5f74] focus:bg-white"
                    />
                    {inlineTargetLanguageValidation && (
                      <p className="mt-2 text-xs font-medium text-rose-700">
                        {inlineTargetLanguageValidation}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="workspace-source-input"
                      className="block text-sm font-semibold text-[#17131d]"
                    >
                      {modeMeta.inputLabel}
                    </label>
                    {activeMode !== "transcribe" && (
                      <span className="text-xs text-[#8d7d74]">
                        {editor.sourceText.trim()
                          ? `${wordCount(editor.sourceText).toLocaleString()} words`
                          : "Saved with every run"}
                      </span>
                    )}
                  </div>

                  {activeMode === "transcribe" ? (
                    <div className="space-y-3">
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-black/12 bg-[#fcfaf7] px-5 py-10 text-center transition hover:border-[#8c5f74]/35 hover:bg-white">
                        <div className="rounded-full bg-[#17131d] p-4 text-white">
                          <FileAudio className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#17131d]">
                            Upload an audio file
                          </p>
                          <p className="mt-1 text-sm text-[#6e5e58]">
                            MP3, WAV, M4A, or another browser-supported audio
                            format.
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </label>

                      {(selectedFile || editor.sourceFileName) && (
                        <div className="rounded-[24px] border border-black/8 bg-[#fcfaf7] px-4 py-3 text-sm text-[#17131d]">
                          <p className="font-semibold">
                            {selectedFile?.name || editor.sourceFileName}
                          </p>
                          <p className="mt-1 text-[#6e5e58]">
                            {selectedFile
                              ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                              : "Saved file metadata from a previous run"}
                          </p>
                        </div>
                      )}

                      <textarea
                        id="workspace-source-input"
                        value={editor.sourceText}
                        onChange={(e) =>
                          updateEditor({ sourceText: e.target.value })
                        }
                        placeholder={modeMeta.inputPlaceholder}
                        className="min-h-[140px] w-full rounded-[28px] border border-black/10 bg-[#fcfaf7] px-4 py-4 text-sm leading-6 text-[#17131d] outline-none transition focus:border-[#8c5f74] focus:bg-white"
                      />
                      {inlineTranscribeValidation && (
                        <p className="text-xs font-medium text-rose-700">
                          {inlineTranscribeValidation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <textarea
                        id="workspace-source-input"
                        value={editor.sourceText}
                        onChange={(e) =>
                          updateEditor({ sourceText: e.target.value })
                        }
                        placeholder={modeMeta.inputPlaceholder}
                        className="min-h-[260px] w-full rounded-[28px] border border-black/10 bg-[#fcfaf7] px-4 py-4 text-sm leading-6 text-[#17131d] outline-none transition focus:border-[#8c5f74] focus:bg-white"
                      />
                      {inlineSourceValidation && (
                        <p className="mt-2 text-xs font-medium text-rose-700">
                          {inlineSourceValidation}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="workspace-instructions-input"
                    className="mb-2 block text-sm font-semibold text-[#17131d]"
                  >
                    {modeMeta.instructionsLabel}
                  </label>
                  <textarea
                    id="workspace-instructions-input"
                    value={editor.instructions}
                    onChange={(e) =>
                      updateEditor({ instructions: e.target.value })
                    }
                    placeholder={modeMeta.instructionsPlaceholder}
                    className="min-h-[140px] w-full rounded-[28px] border border-black/10 bg-[#fcfaf7] px-4 py-4 text-sm leading-6 text-[#17131d] outline-none transition focus:border-[#8c5f74] focus:bg-white"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right column: output + history */}
          <div className="space-y-4 xl:sticky xl:top-[7.25rem] xl:self-start">
            {/* Output panel */}
            <section className="overflow-hidden rounded-[30px] border border-black/8 bg-white shadow-sm">
              <div
                className={`bg-gradient-to-br px-5 py-5 text-white ${OUTPUT_PANEL_ACCENTS[activeMode]}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                      Output
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                      {modeMeta.outputLabel}
                    </h3>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
                    {formatStatus(editor.status)}
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-black/6 bg-[#fcfaf7] px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[#17131d]">
                      {editor.title.trim() ||
                        getDefaultWorkspaceRunTitle(activeMode)}
                    </p>
                    <p className="mt-1 text-sm text-[#6e5e58]">
                      {activeRun
                        ? `Updated ${formatUpdatedAt(activeRun)}`
                        : "Not saved yet"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-[#6e5e58]">
                      <Coins className="h-3.5 w-3.5 text-[#8c5f74]" />
                      {modeMeta.cost} credits
                    </span>
                    {editor.status === "completed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </span>
                    )}
                    {editor.status === "failed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="min-h-[420px] overflow-hidden rounded-[28px] border border-black/8 bg-[#fffdf9]">
                  {isGenerating ? (
                    <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-5 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-[#8c5f74]" />
                      <p className="mt-4 text-base font-semibold text-[#17131d]">
                        Running {modeMeta.label.toLowerCase()}...
                      </p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-[#6e5e58]">
                        The result will be saved into your workspace history as
                        soon as the model responds.
                      </p>
                    </div>
                  ) : editor.outputText.trim() ? (
                    <>
                      <div className="flex items-center justify-between gap-3 border-b border-black/6 px-5 py-3">
                        <span className="text-xs text-[#8d7d74]">
                          {wordCount(editor.outputText).toLocaleString()} words
                          &middot; {editor.outputText.length.toLocaleString()}{" "}
                          chars
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyOutput}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#17131d] transition hover:bg-[#f9f6f2]"
                        >
                          {copiedOutput ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedOutput ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <textarea
                        value={editor.outputText}
                        onChange={(e) =>
                          updateEditor({ outputText: e.target.value })
                        }
                        className="min-h-[360px] w-full resize-none bg-transparent p-5 font-sans text-sm leading-7 text-[#17131d] outline-none"
                      />
                    </>
                  ) : (
                    <div className="flex h-full min-h-[420px] flex-col items-start justify-center p-5">
                      <p className="text-sm font-semibold text-[#17131d]">
                        No output yet
                      </p>
                      <p className="mt-2 max-w-md text-sm leading-6 text-[#6e5e58]">
                        Fill the editor, run the tool, and the generated result
                        will appear here and stay connected to this saved run.
                      </p>
                    </div>
                  )}
                </div>

                {editor.lastError && (
                  <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
                    Last saved error: {editor.lastError}
                  </div>
                )}
              </div>
            </section>

            {/* History panel */}
            <section className="rounded-[30px] border border-black/8 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c5f74]">
                    Saved history
                  </p>
                  <p className="mt-2 text-sm text-[#6e5e58]">
                    {displayedRuns.length}{" "}
                    {displayedRuns.length === 1 ? "run" : "runs"}
                    {showAllRuns
                      ? " across all tools"
                      : ` in ${modeMeta.label.toLowerCase()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAllRuns((v) => !v)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      showAllRuns
                        ? "border-[#8c5f74]/25 bg-[#fff4f6] text-[#8c3857]"
                        : "border-black/10 bg-[#fcfaf7] text-[#6e5e58] hover:bg-white hover:text-[#17131d]"
                    }`}
                  >
                    {showAllRuns ? "This tool" : "All tools"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startNewRun(activeMode)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-[#17131d] text-white transition hover:bg-[#2c2438]"
                    aria-label={`Start a new ${modeMeta.label.toLowerCase()} run`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {displayedRuns.map((run) => {
                  const Icon = MODE_ICONS[run.mode];
                  const isSelected = run.id === selectedRunId;

                  return (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => selectRun(run)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        isSelected
                          ? `${MODE_ACCENTS[run.mode]} shadow-sm`
                          : "border-black/8 bg-[#fcfaf7] hover:border-[#8c5f74]/20 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="rounded-2xl bg-white/80 p-2 text-current shadow-sm">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#17131d]">
                              {run.title}
                            </p>
                            <p className="mt-1 text-xs text-[#6e5e58]">
                              {formatUpdatedAt(run)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                            run.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : run.status === "failed"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {formatStatus(run.status)}
                        </span>
                      </div>

                      {(run.outputText || run.sourceText || run.lastError) && (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6e5e58]">
                          {run.outputText || run.sourceText || run.lastError}
                        </p>
                      )}
                    </button>
                  );
                })}

                {!displayedRuns.length && !isLoading && (
                  <div className="rounded-[24px] border border-dashed border-black/10 bg-[#fcfaf7] px-4 py-6 text-sm text-[#6e5e58]">
                    {showAllRuns
                      ? "No saved runs yet. Start a new run and the history will fill automatically."
                      : "No saved runs for this tool yet. Start a new run and the history panel will fill automatically."}
                  </div>
                )}

                {isLoading && (
                  <div className="rounded-[24px] border border-dashed border-black/10 bg-[#fcfaf7] px-4 py-6 text-center text-sm text-[#6e5e58]">
                    <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#8c5f74]" />
                    Loading workspace history...
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
