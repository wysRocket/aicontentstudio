import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  Download,
  FileText,
  Pencil,
  FileAudio,
  ImageIcon,
  Languages,
  Layers,
  Loader2,
  PenSquare,
  Plus,
  Save,
  ScanText,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
  AlertTriangle,
  WifiOff,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "react-router-dom";
import { GoogleGenAI } from "@google/genai";
import promptsData from "../prompts_data.json";
import {
  GEMINI_TEXT_MODEL,
  GEMINI_IMAGE_MODEL,
  IMAGE_NUMBER_OF_IMAGES,
  IMAGE_ASPECT_RATIO,
  AUTOSAVE_DEBOUNCE_MS,
  PPTX_BG_COLOR,
  PPTX_TITLE_COLOR,
  PPTX_BODY_COLOR,
  PPTX_ACCENT_COLOR,
  PPTX_CLOSING_ACCENT_COLOR,
  PPTX_FONT_FACE,
  OUTPUT_TRANSFORM_INSTRUCTIONS,
  classifyWorkspaceError,
  type WorkspaceErrorKind,
} from "../lib/config";
import { useFirebase } from "../contexts/FirebaseContext";
import {
  deleteWorkspaceRun,
  deductCredits,
  ensureWorkspaceSeedData,
  saveWorkspaceRun,
  subscribeToUserCredits,
  subscribeToWorkspaceRuns,
} from "../lib/firestore";
import {
  WORKSPACE_TOOL_CONFIG,
  buildWorkspacePrompt,
  compressImageToThumbnail,
  createWorkspaceRunDraft,
  getDefaultWorkspaceRunTitle,
  normalizeWorkspaceToolMode,
  type WorkspaceRunInput,
  type WorkspaceRunRecord,
  type WorkspaceToolMode,
} from "../lib/workspace";

interface SlideData {
  title: string;
  content: string[];
  notes: string;
  layout: "title" | "content" | "two-column" | "quote" | "closing";
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  return match ? match[1] : text;
}

const MODE_ICONS = {
  write_rewrite: PenSquare,
  summarize: ScanText,
  transcribe: AudioLines,
  translate: Languages,
  generate_image: ImageIcon,
  create_document: FileText,
  create_presentation: Layers,
} satisfies Record<WorkspaceToolMode, typeof PenSquare>;

const MODE_ACCENTS = {
  write_rewrite:
    "border-purple-700/35 bg-[linear-gradient(135deg,rgba(124,92,255,0.10)_0%,rgba(19,23,31,0.95)_100%)] text-purple-300",
  summarize:
    "border-blue-700/35 bg-[linear-gradient(135deg,rgba(96,165,250,0.10)_0%,rgba(19,23,31,0.95)_100%)] text-blue-300",
  transcribe:
    "border-emerald-700/35 bg-[linear-gradient(135deg,rgba(52,211,153,0.10)_0%,rgba(19,23,31,0.95)_100%)] text-emerald-300",
  translate:
    "border-amber-700/35 bg-[linear-gradient(135deg,rgba(245,158,11,0.10)_0%,rgba(19,23,31,0.95)_100%)] text-amber-300",
  generate_image:
    "border-sky-700/35 bg-[linear-gradient(135deg,rgba(56,189,248,0.10)_0%,rgba(19,23,31,0.95)_100%)] text-sky-300",
  create_document:
    "border-green-700/35 bg-[linear-gradient(135deg,rgba(74,222,128,0.10)_0%,rgba(19,23,31,0.95)_100%)] text-green-300",
  create_presentation:
    "border-fuchsia-700/35 bg-[linear-gradient(135deg,rgba(232,121,249,0.10)_0%,rgba(19,23,31,0.95)_100%)] text-fuchsia-300",
} satisfies Record<WorkspaceToolMode, string>;

const OUTPUT_PANEL_ACCENTS = {
  write_rewrite: "from-[#1f1630] via-[#32204a] to-[#71435f]",
  summarize: "from-[#172236] via-[#253755] to-[#526d86]",
  transcribe: "from-[#14241c] via-[#1f3b30] to-[#53735f]",
  translate: "from-[#2b1d12] via-[#5a3316] to-[#8b5a27]",
  generate_image: "from-[#0d1f35] via-[#183358] to-[#1e5a80]",
  create_document: "from-[#0d2218] via-[#153826] to-[#2a6040]",
  create_presentation: "from-[#1a0d32] via-[#2d1258] to-[#6a1a8a]",
} satisfies Record<WorkspaceToolMode, string>;

const SLIDE_LAYOUT_GRADIENTS: Record<SlideData["layout"], string> = {
  title:        "from-[#0d0a1e] via-[#1a1040] to-[#2d1258]",
  content:      "from-[#1a1040] via-[#2d1258] to-[#4a1a80]",
  "two-column": "from-[#0f1a30] via-[#1a2a50] to-[#2d1258]",
  quote:        "from-[#1a0d20] via-[#2a1040] to-[#1a1040]",
  closing:      "from-[#0d0a1e] via-[#1a0d40] to-[#4a1a80]",
};

const TOOL_ORDER: WorkspaceToolMode[] = [
  "write_rewrite",
  "summarize",
  "transcribe",
  "translate",
  "generate_image",
  "create_document",
  "create_presentation",
];

function createEmptyDraftsByMode() {
  return {
    write_rewrite: createWorkspaceRunDraft("write_rewrite"),
    summarize: createWorkspaceRunDraft("summarize"),
    transcribe: createWorkspaceRunDraft("transcribe"),
    translate: createWorkspaceRunDraft("translate"),
    generate_image: createWorkspaceRunDraft("generate_image"),
    create_document: createWorkspaceRunDraft("create_document"),
    create_presentation: createWorkspaceRunDraft("create_presentation"),
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
  const [isTransformingOutput, setIsTransformingOutput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<WorkspaceErrorKind | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [showAllRuns, setShowAllRuns] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");
  const [sessionImage, setSessionImage] = useState<{ runId: string; dataUrl: string } | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showSlideNotes, setShowSlideNotes] = useState(false);
  const [docDownloading, setDocDownloading] = useState(false);
  const [slideDownloading, setSlideDownloading] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<
    "all" | "draft" | "completed" | "failed"
  >("all");
  const [renameTargetRun, setRenameTargetRun] =
    useState<WorkspaceRunRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTargetRun, setDeleteTargetRun] =
    useState<WorkspaceRunRecord | null>(null);
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
  const filteredDisplayedRuns = useMemo(() => {
    const normalizedQuery = historySearchQuery.trim().toLowerCase();

    return displayedRuns.filter((run) => {
      const matchesStatus =
        historyStatusFilter === "all" || run.status === historyStatusFilter;
      if (!matchesStatus) return false;

      if (!normalizedQuery) return true;

      return [run.title, run.sourceText, run.outputText, run.lastError]
        .join("\n")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [displayedRuns, historySearchQuery, historyStatusFilter]);

  const parsedSlides = useMemo<SlideData[] | null>(() => {
    if (activeMode !== "create_presentation" || !editor.outputText.trim()) return null;
    try {
      const parsed = JSON.parse(extractJson(editor.outputText));
      return Array.isArray(parsed) ? (parsed as SlideData[]) : null;
    } catch {
      return null;
    }
  }, [activeMode, editor.outputText]);

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

  const setClassifiedError = (err: unknown) => {
    const { kind, userMessage } = classifyWorkspaceError(err);
    setError(userMessage);
    setErrorKind(kind);
  };

  const clearError = () => {
    setError(null);
    setErrorKind(null);
  };

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
    clearError();
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
    clearError();
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
    clearError();
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
        tokenCount: overrides.tokenCount ?? editor.tokenCount,
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
    }, AUTOSAVE_DEBOUNCE_MS);

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
    clearError();
    setSuccessMessage(null);

    try {
      await persistRun({
        sourceFileName: selectedFile?.name || editor.sourceFileName,
        sourceMimeType: selectedFile?.type || editor.sourceMimeType,
      });
      setSuccessMessage("Run saved to your workspace history.");
    } catch (err) {
      console.error("Failed to save workspace run", err);
      setClassifiedError(err);
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

  const handleDownloadImage = () => {
    if (!sessionImage) return;
    const a = document.createElement("a");
    a.href = sessionImage.dataUrl;
    a.download = `${editor.title || "image"}.jpg`;
    a.click();
  };

  const handleDownloadDocx = async () => {
    setDocDownloading(true);
    try {
      const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
      const lines = editor.outputText.split("\n");
      const children = lines.map((line) => {
        if (line.startsWith("# ")) return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
        if (line.startsWith("## ")) return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
        if (line.startsWith("### ")) return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
        if (line.startsWith("- ") || line.startsWith("* ")) return new Paragraph({ text: line.slice(2), bullet: { level: 0 } });
        return new Paragraph({ text: line });
      });
      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${editor.title || "document"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX download failed", err);
    } finally {
      setDocDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDocDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const lines = editor.outputText.split("\n");
      let y = 20;
      const pageHeight = 277;

      for (const line of lines) {
        if (y > pageHeight) { pdf.addPage(); y = 20; }
        if (line.startsWith("# ")) {
          pdf.setFontSize(20); pdf.setFont("helvetica", "bold");
          const wrapped = pdf.splitTextToSize(line.slice(2), 180);
          pdf.text(wrapped, 15, y); y += wrapped.length * 9 + 4;
        } else if (line.startsWith("## ")) {
          pdf.setFontSize(15); pdf.setFont("helvetica", "bold");
          const wrapped = pdf.splitTextToSize(line.slice(3), 180);
          pdf.text(wrapped, 15, y); y += wrapped.length * 7 + 3;
        } else if (line.startsWith("### ")) {
          pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
          const wrapped = pdf.splitTextToSize(line.slice(4), 180);
          pdf.text(wrapped, 15, y); y += wrapped.length * 6 + 2;
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
          const wrapped = pdf.splitTextToSize(`\u2022 ${line.slice(2)}`, 172);
          pdf.text(wrapped, 21, y); y += wrapped.length * 6;
        } else if (line.trim()) {
          pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
          const wrapped = pdf.splitTextToSize(line, 180);
          pdf.text(wrapped, 15, y); y += wrapped.length * 6;
        } else {
          y += 4;
        }
      }

      pdf.save(`${editor.title || "document"}.pdf`);
    } catch (err) {
      console.error("PDF download failed", err);
    } finally {
      setDocDownloading(false);
    }
  };

  const handleDownloadPptx = async () => {
    if (!parsedSlides) return;
    setSlideDownloading(true);
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";

      for (const slide of parsedSlides) {
        const pSlide = pptx.addSlide();
        pSlide.background = { color: PPTX_BG_COLOR };

        const isTitle = slide.layout === "title";
        const isClosing = slide.layout === "closing";
        const isQuote = slide.layout === "quote";
        const isTwoCol = slide.layout === "two-column";

        pSlide.addText(slide.title, {
          x: 0.5, y: isTitle ? 2.2 : 0.35,
          w: "90%", h: isTitle ? 1.5 : 1.0,
          fontSize: isTitle ? 40 : 26,
          bold: true, color: PPTX_TITLE_COLOR,
          fontFace: PPTX_FONT_FACE,
          align: isTitle || isClosing ? "center" : "left",
        });

        if (isQuote && slide.content.length > 0) {
          pSlide.addText(`"${slide.content[0]}"`, {
            x: 1.0, y: 2.0, w: "80%", h: 3.0,
            fontSize: 22, italic: true, color: PPTX_ACCENT_COLOR,
            fontFace: PPTX_FONT_FACE, align: "center",
          });
        } else if (isTwoCol && slide.content.length > 0) {
          const mid = Math.ceil(slide.content.length / 2);
          const leftItems = slide.content.slice(0, mid);
          const rightItems = slide.content.slice(mid);
          pSlide.addText(
            leftItems.map((c) => ({ text: `${c}\n`, options: {} })),
            { x: 0.5, y: 1.5, w: "43%", h: 5.5, fontSize: 16, color: PPTX_BODY_COLOR, fontFace: PPTX_FONT_FACE },
          );
          pSlide.addText(
            rightItems.map((c) => ({ text: `${c}\n`, options: {} })),
            { x: 5.2, y: 1.5, w: "43%", h: 5.5, fontSize: 16, color: PPTX_BODY_COLOR, fontFace: PPTX_FONT_FACE },
          );
        } else if (!isTitle && !isClosing && slide.content.length > 0) {
          pSlide.addText(
            slide.content.map((c) => ({ text: `${c}\n`, options: {} })),
            { x: 0.5, y: 1.5, w: "90%", h: 5.5, fontSize: 18, color: PPTX_BODY_COLOR, fontFace: PPTX_FONT_FACE },
          );
        }

        if (isClosing && slide.content.length > 0) {
          pSlide.addText(slide.content[0], {
            x: 0.5, y: 3.8, w: "90%", h: 1.0,
            fontSize: 20, color: PPTX_CLOSING_ACCENT_COLOR, fontFace: PPTX_FONT_FACE, align: "center",
          });
        }
      }

      await pptx.writeFile({ fileName: `${editor.title || "presentation"}.pptx` });
    } catch (err) {
      console.error("PPTX download failed", err);
    } finally {
      setSlideDownloading(false);
    }
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
    clearError();
    setSuccessMessage(null);

    try {
      const ai = new GoogleGenAI({ apiKey });

      if (activeMode === "generate_image") {
        // Build a combined image prompt
        const imagePrompt = [
          editor.sourceText.trim(),
          editor.instructions.trim() ? `Style: ${editor.instructions.trim()}` : "",
        ]
          .filter(Boolean)
          .join(". ");

        const imageResponse = await ai.models.generateImages({
          model: GEMINI_IMAGE_MODEL,
          prompt: imagePrompt,
          config: { numberOfImages: IMAGE_NUMBER_OF_IMAGES, aspectRatio: IMAGE_ASPECT_RATIO },
        });

        const imageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) {
          throw new Error("No image was returned. Try refining your description.");
        }

        const dataUrl = `data:image/jpeg;base64,${imageBytes}`;

        const runId = await persistRun({
          outputText: "[Generated image — download to save locally]",
          status: "completed",
          lastError: "",
          creditCost: modeMeta.cost,
          tokenCount: 0,
          sourceFileName: editor.sourceFileName,
          sourceMimeType: editor.sourceMimeType,
        });

        if (runId) setSessionImage({ runId, dataUrl });

        await deductCredits(user.uid, modeMeta.cost, {
          description: "Image generation run",
          source: "workspace:generate_image",
        });

        setSuccessMessage("Image generated. Download it before leaving this session — images are not stored in history.");
      } else {
        let outputText = "";
        let tokenCount = 0;

        if (activeMode === "transcribe") {
          const file = selectedFile;
          if (!file) {
            throw new Error("Upload an audio file before requesting a transcript.");
          }

          const base64Audio = await readFileAsBase64(file);
          const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
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
          tokenCount = response.usageMetadata?.totalTokenCount ?? 0;
        } else {
          const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
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
          tokenCount = response.usageMetadata?.totalTokenCount ?? 0;
        }

        if (!outputText) {
          throw new Error("The model returned an empty result.");
        }

        // For presentations, reset slide index when new content arrives
        if (activeMode === "create_presentation") {
          setCurrentSlideIndex(0);
        }

        await persistRun({
          outputText,
          status: "completed",
          lastError: "",
          creditCost: modeMeta.cost,
          tokenCount,
          sourceFileName: selectedFile?.name || editor.sourceFileName,
          sourceMimeType: selectedFile?.type || editor.sourceMimeType,
        });

        await deductCredits(user.uid, modeMeta.cost, {
          description: `${modeMeta.label} run`,
          source: `workspace:${activeMode}`,
        });

        setSuccessMessage(`${modeMeta.label} finished and was saved to history.`);
      }
    } catch (err) {
      console.error(`Failed to run ${activeMode}`, err);
      setClassifiedError(err);
      const message =
        err instanceof Error ? err.message : "We couldn't complete that run.";

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

  // ⌘+Enter / Ctrl+Enter — trigger generation from anywhere on the page
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "Enter") return;
      // Don't fire when a modal is open
      if (showPresetPicker || renameTargetRun || deleteTargetRun) return;
      if (isGenerating || isSaving || Boolean(generationValidationMessage)) return;
      e.preventDefault();
      handleGenerate();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    showPresetPicker,
    renameTargetRun,
    deleteTargetRun,
    isGenerating,
    isSaving,
    generationValidationMessage,
    handleGenerate,
  ]);

  const handleOutputTransform = async (
    transform: "shorten" | "expand" | "tone",
  ) => {
    if (!user) return;

    const currentOutput = editor.outputText.trim();
    if (!currentOutput) {
      setError("Generate or add output text before using quick transforms.");
      return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setError(
        "No Gemini API key found. Add VITE_GEMINI_API_KEY before running transforms.",
      );
      return;
    }

    try {
      setIsTransformingOutput(true);
      clearError();
      setSuccessMessage(null);

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "You are editing content inside AI Content Studio.",
                  OUTPUT_TRANSFORM_INSTRUCTIONS[transform],
                  "Return only the transformed output with no extra commentary.",
                  editor.instructions.trim()
                    ? `Current guidance: ${editor.instructions.trim()}`
                    : "",
                  `Current output:\n${currentOutput}`,
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              },
            ],
          },
        ],
      });

      const transformedText = (response.text || "").trim();
      if (!transformedText) {
        throw new Error("The model returned an empty transformed output.");
      }

      await persistRun({
        outputText: transformedText,
        status: "completed",
        lastError: "",
      });

      setSuccessMessage("Output transformed and saved.");
    } catch (transformError) {
      console.error("Failed to transform output", transformError);
      setClassifiedError(transformError);
    } finally {
      setIsTransformingOutput(false);
    }
  };

  const handleDuplicateRun = async (run: WorkspaceRunRecord) => {
    if (!user) return;

    const duplicatedDraft = createWorkspaceRunDraft(run.mode, {
      title: `${run.title} (Copy)`,
      sourceText: run.sourceText,
      instructions: run.instructions,
      outputText: run.outputText,
      targetLanguage: run.targetLanguage,
      status: "draft",
      creditCost: run.creditCost,
      sourceFileName: run.sourceFileName,
      sourceMimeType: run.sourceMimeType,
      lastError: "",
    });

    try {
      setIsSaving(true);
      const duplicateRunId = await saveWorkspaceRun(user.uid, duplicatedDraft);
      setSearchParams({ tool: run.mode });
      setSelectedRunId(duplicateRunId);
      setEditor(duplicatedDraft);
      setDraftsByMode((current) => ({
        ...current,
        [run.mode]: duplicatedDraft,
      }));
      setSuccessMessage("Run duplicated into a new editable draft.");
      clearError();
    } catch (duplicateError) {
      console.error("Failed to duplicate run", duplicateError);
      setClassifiedError(duplicateError);
    } finally {
      setIsSaving(false);
    }
  };

  const openRenameDialog = (run: WorkspaceRunRecord) => {
    setRenameTargetRun(run);
    setRenameValue(run.title);
  };

  const handleRenameRun = async () => {
    if (!user) return;
    if (!renameTargetRun) return;

    const nextTitle = renameValue.trim();
    if (!nextTitle || nextTitle === renameTargetRun.title) {
      setRenameTargetRun(null);
      return;
    }

    try {
      setIsSaving(true);
      await saveWorkspaceRun(user.uid, {
        id: renameTargetRun.id,
        ...toEditableRun(renameTargetRun),
        title: nextTitle,
      });

      if (selectedRunId === renameTargetRun.id) {
        updateEditor({ title: nextTitle });
      }

      setSuccessMessage("Run title updated.");
      clearError();
      setRenameTargetRun(null);
    } catch (renameError) {
      console.error("Failed to rename run", renameError);
      setClassifiedError(renameError);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (run: WorkspaceRunRecord) => {
    setDeleteTargetRun(run);
  };

  const handleDeleteRun = async () => {
    if (!user) return;
    if (!deleteTargetRun) return;

    try {
      setIsSaving(true);
      await deleteWorkspaceRun(user.uid, deleteTargetRun.id);

      if (selectedRunId === deleteTargetRun.id) {
        setSelectedRunId("");
        const fallbackDraft = createWorkspaceRunDraft(activeMode);
        setEditor(fallbackDraft);
      }

      setSuccessMessage("Run deleted from history.");
      clearError();
      setDeleteTargetRun(null);
    } catch (deleteError) {
      console.error("Failed to delete run", deleteError);
      setClassifiedError(deleteError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-full overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1480px] space-y-4">
        {/* Compact hero */}
        <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(135deg,#1a1623_0%,#2b2036_35%,#7c5cff_100%)] px-5 py-4 text-white shadow-[0_20px_60px_rgba(23,19,29,0.18)] sm:px-7 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4c6ff]">
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
                  <Coins className="h-3.5 w-3.5 text-[#d4c6ff]" />
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
                  <ModeIcon className="h-3.5 w-3.5 text-[#d4c6ff]" />
                  <p className="text-sm font-semibold">
                    {modeMeta.cost} credits
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mode tab switcher */}
        <div className="flex gap-1 overflow-x-auto rounded-[22px] border border-white/8 bg-[#13171f] p-1.5 shadow-sm">
          {TOOL_ORDER.map((mode) => {
            const Icon = MODE_ICONS[mode];
            const meta = WORKSPACE_TOOL_CONFIG[mode];
            const isActive = mode === activeMode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => switchMode(mode)}
                className={`flex flex-1 shrink-0 items-center justify-center gap-2 rounded-[18px] px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? `border shadow-sm ${MODE_ACCENTS[mode]}`
                    : "text-white/45 hover:bg-white/6 hover:text-white/80"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Banners */}
        {error && (() => {
          const bannerConfig = {
            credits: {
              border: "border-amber-700/40",
              bg: "bg-amber-950/50",
              text: "text-amber-300",
              Icon: CreditCard,
              iconClass: "text-amber-400",
            },
            quota: {
              border: "border-orange-700/40",
              bg: "bg-orange-950/50",
              text: "text-orange-300",
              Icon: AlertTriangle,
              iconClass: "text-orange-400",
            },
            network: {
              border: "border-slate-600/40",
              bg: "bg-slate-800/60",
              text: "text-slate-300",
              Icon: WifiOff,
              iconClass: "text-slate-400",
            },
            auth: {
              border: "border-purple-700/40",
              bg: "bg-purple-950/50",
              text: "text-purple-300",
              Icon: ShieldAlert,
              iconClass: "text-purple-400",
            },
            validation: {
              border: "border-rose-700/40",
              bg: "bg-rose-950/50",
              text: "text-rose-300",
              Icon: AlertTriangle,
              iconClass: "text-rose-400",
            },
            unknown: {
              border: "border-rose-700/40",
              bg: "bg-rose-950/50",
              text: "text-rose-300",
              Icon: AlertTriangle,
              iconClass: "text-rose-400",
            },
          };
          const cfg = bannerConfig[errorKind ?? "unknown"];
          const { Icon } = cfg;
          return (
            <div
              className={`flex items-start gap-3 rounded-[22px] border ${cfg.border} ${cfg.bg} px-4 py-3 text-sm ${cfg.text}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.iconClass}`} />
              <span>{error}</span>
            </div>
          );
        })()}
        {successMessage && (
          <div className="rounded-[22px] border border-emerald-700/40 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
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
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {modeMeta.label}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    {modeMeta.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-xs text-white/55 lg:w-auto lg:pr-2 lg:pt-3">
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
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#7c5cff]/15 px-4 py-3 text-sm font-semibold text-[#5b3fc5] transition hover:bg-[#e8e2ff]"
                  >
                    <Plus className="h-4 w-4" />
                    New run
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isGenerating || !isDirty}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:border-[#7c5cff]/20 hover:bg-[#0e1219] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save run
                  </button>
                  <div className="flex items-center gap-2">
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
                    <span
                      className="hidden text-xs text-white/40 sm:block"
                      aria-hidden="true"
                    >
                      {typeof navigator !== "undefined" &&
                      navigator.platform.toLowerCase().includes("mac")
                        ? "⌘↵"
                        : "Ctrl+↵"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Input form */}
            <section className="rounded-[30px] border border-white/8 bg-[#13171f] p-5 shadow-sm">
              <div className="grid gap-5">
                <div>
                  <label
                    htmlFor="workspace-run-title"
                    className="mb-2 block text-sm font-semibold text-white"
                  >
                    Run title
                  </label>
                  <input
                    id="workspace-run-title"
                    value={editor.title}
                    onChange={(e) => updateEditor({ title: e.target.value })}
                    placeholder={getDefaultWorkspaceRunTitle(activeMode)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0e1219] px-4 py-3 text-sm text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                  />
                </div>

                {activeMode === "translate" && (
                  <div>
                    <label
                      htmlFor="workspace-target-language"
                      className="mb-2 block text-sm font-semibold text-white"
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
                      className="w-full rounded-2xl border border-white/10 bg-[#0e1219] px-4 py-3 text-sm text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                    />
                    {inlineTargetLanguageValidation && (
                      <p className="mt-2 text-xs font-medium text-rose-400">
                        {inlineTargetLanguageValidation}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="workspace-source-input"
                      className="block text-sm font-semibold text-white"
                    >
                      {modeMeta.inputLabel}
                    </label>
                    {activeMode !== "transcribe" && (
                      <span className="text-xs text-white/40">
                        {editor.sourceText.trim()
                          ? `${wordCount(editor.sourceText).toLocaleString()} words`
                          : "Saved with every run"}
                      </span>
                    )}
                  </div>

                  {activeMode === "transcribe" ? (
                    <div className="space-y-3">
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-white/12 bg-[#0e1219] px-5 py-10 text-center transition hover:border-[#7c5cff]/35 hover:bg-[#1a2030]">
                        <div className="rounded-full bg-[#17131d] p-4 text-white">
                          <FileAudio className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Upload an audio file
                          </p>
                          <p className="mt-1 text-sm text-white/55">
                            MP3, WAV, M4A, or another browser-supported audio
                            format.
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="audio/*"
                          aria-label="Upload audio file for transcription"
                          className="hidden"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </label>

                      {(selectedFile || editor.sourceFileName) && (
                        <div className="rounded-[24px] border border-white/8 bg-[#0e1219] px-4 py-3 text-sm text-white">
                          <p className="font-semibold">
                            {selectedFile?.name || editor.sourceFileName}
                          </p>
                          <p className="mt-1 text-white/55">
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
                        className="min-h-[140px] w-full rounded-[28px] border border-white/10 bg-[#0e1219] px-4 py-4 text-sm leading-6 text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                      />
                      {inlineTranscribeValidation && (
                        <p className="text-xs font-medium text-rose-400">
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
                        className="min-h-[260px] w-full rounded-[28px] border border-white/10 bg-[#0e1219] px-4 py-4 text-sm leading-6 text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                      />
                      {inlineSourceValidation && (
                        <p className="mt-2 text-xs font-medium text-rose-400">
                          {inlineSourceValidation}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="workspace-instructions-input"
                      className="block text-sm font-semibold text-white"
                    >
                      {modeMeta.instructionsLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPresetSearch("");
                        setShowPresetPicker(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#7c5cff]/25 bg-[#7c5cff]/12 px-3 py-1.5 text-xs font-semibold text-[#7c5cff] transition hover:bg-[#7c5cff]/22"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Presets
                    </button>
                  </div>
                  <textarea
                    id="workspace-instructions-input"
                    value={editor.instructions}
                    onChange={(e) =>
                      updateEditor({ instructions: e.target.value })
                    }
                    placeholder={modeMeta.instructionsPlaceholder}
                    className="min-h-[140px] w-full rounded-[28px] border border-white/10 bg-[#0e1219] px-4 py-4 text-sm leading-6 text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                  />
                </div>

                {/* Preset picker overlay */}
                {showPresetPicker && (
                  <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
                    <button
                      type="button"
                      aria-label="Close preset picker"
                      onClick={() => setShowPresetPicker(false)}
                      className="absolute inset-0 bg-black/35 backdrop-blur-sm"
                    />
                    <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/8 bg-[#13171f] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                      <div className="border-b border-white/6 px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold text-white">
                            Choose a preset
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowPresetPicker(false)}
                            className="rounded-xl border border-white/8 p-1.5 text-white/55 transition hover:bg-[#1a2030]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="relative mt-3">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search presets..."
                            value={presetSearch}
                            onChange={(e) => setPresetSearch(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#0e1219] py-2.5 pl-9 pr-4 text-sm text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                          />
                        </div>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto p-3">
                        {(promptsData as Array<{ id: string | number; title: string; description: string; content: string; type: string }>)
                          .filter(
                            (p) =>
                              p.type === "TEXT" &&
                              (presetSearch.trim() === "" ||
                                p.title
                                  .toLowerCase()
                                  .includes(presetSearch.toLowerCase().trim())),
                          )
                          .map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                updateEditor({ instructions: preset.content });
                                setShowPresetPicker(false);
                              }}
                              className="w-full rounded-[20px] border border-transparent px-4 py-3 text-left transition hover:border-[#7c5cff]/15 hover:bg-[#7c5cff]/12"
                            >
                              <p className="text-sm font-semibold text-white">
                                {preset.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/55">
                                {preset.description}
                              </p>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right column: output + history */}
          <div className="space-y-4 xl:sticky xl:top-[7.25rem] xl:self-start">
            {/* Output panel */}
            <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[#13171f] shadow-sm">
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
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/6 bg-[#0e1219] px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {editor.title.trim() ||
                        getDefaultWorkspaceRunTitle(activeMode)}
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      {activeRun
                        ? `Updated ${formatUpdatedAt(activeRun)}`
                        : "Not saved yet"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/55">
                      <Coins className="h-3.5 w-3.5 text-[#7c5cff]" />
                      {modeMeta.cost} credits
                    </span>
                    {editor.status === "completed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </span>
                    )}
                    {editor.status === "failed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-700/40 bg-rose-900/30 px-3 py-1.5 text-xs font-medium text-rose-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[#0e1219]">
                  {isGenerating ? (
                    <div className="flex min-h-[420px] flex-col items-center justify-center p-5 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-[#7c5cff]" />
                      <p className="mt-4 text-base font-semibold text-white">
                        Running {modeMeta.label.toLowerCase()}...
                      </p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">
                        {activeMode === "generate_image"
                          ? "Your image will be ready in a few seconds."
                          : "The result will be saved into your workspace history as soon as the model responds."}
                      </p>
                    </div>

                  ) : activeMode === "generate_image" ? (
                    /* ── Image output ── */
                    sessionImage?.runId === selectedRunId ? (
                      <div>
                        <img
                          src={sessionImage.dataUrl}
                          alt={editor.title || "Generated image"}
                          className="w-full rounded-t-[28px] object-cover"
                        />
                        <div className="flex items-center justify-between gap-3 px-5 py-4">
                          <p className="text-xs text-white/40">
                            Session only — download to keep this image.
                          </p>
                          <button
                            type="button"
                            onClick={handleDownloadImage}
                            aria-label="Download generated image as JPG"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#17131d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2c2438]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download JPG
                          </button>
                        </div>
                      </div>
                    ) : editor.status === "completed" ? (
                      <div className="flex min-h-[420px] flex-col items-center justify-center p-5 text-center">
                        <ImageIcon className="h-10 w-10 text-[#c8d8ea]" />
                        <p className="mt-4 text-sm font-semibold text-white">Image not available</p>
                        <p className="mt-2 max-w-xs text-sm text-white/55">
                          Images aren't stored in history. Generate a new one or download immediately after generation.
                        </p>
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] flex-col items-start justify-center p-5">
                        <p className="text-sm font-semibold text-white">No image yet</p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-white/55">
                          Describe what you want to see, then run the tool. Images are available for download during this session.
                        </p>
                      </div>
                    )

                  ) : activeMode === "create_document" && editor.outputText.trim() ? (
                    /* ── Document output ── */
                    <>
                      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-5 py-3">
                        <span className="text-xs text-white/40">
                          {wordCount(editor.outputText).toLocaleString()} words
                          &middot; {editor.outputText.length.toLocaleString()} chars
                          {editor.tokenCount > 0 && <> &middot; {editor.tokenCount.toLocaleString()} tokens</>}
                        </span>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyOutput}
                            aria-label={copiedOutput ? "Output copied to clipboard" : "Copy document to clipboard"}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2030]"
                          >
                            {copiedOutput ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedOutput ? "Copied!" : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadDocx}
                            disabled={docDownloading}
                            aria-label="Download document as DOCX"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2030] disabled:opacity-60"
                          >
                            {docDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            DOCX
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={docDownloading}
                            aria-label="Download document as PDF"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2030] disabled:opacity-60"
                          >
                            {docDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            PDF
                          </button>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none p-5 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white [&_p]:text-sm [&_p]:leading-7 [&_p]:text-white [&_ul]:text-sm [&_ul]:leading-7 [&_li]:text-white [&_strong]:text-white">
                        <ReactMarkdown>{editor.outputText}</ReactMarkdown>
                      </div>
                    </>

                  ) : activeMode === "create_presentation" && parsedSlides ? (
                    /* ── Presentation slide viewer ── */
                    (() => {
                      const slide = parsedSlides[currentSlideIndex];
                      const isFirst = currentSlideIndex === 0;
                      const isLast = currentSlideIndex === parsedSlides.length - 1;
                      return (
                        <>
                          {/* Slide canvas */}
                          <div className={`relative aspect-video overflow-hidden rounded-t-[28px] bg-gradient-to-br ${SLIDE_LAYOUT_GRADIENTS[slide.layout]}`}>
                            {slide.layout === "title" || slide.layout === "closing" ? (
                              <div className="flex h-full flex-col items-center justify-center px-10 text-center">
                                <p className="text-4xl font-bold leading-tight text-white">{slide.title}</p>
                                {slide.content.length > 0 && (
                                  <p className="mt-4 text-lg text-purple-200">{slide.content[0]}</p>
                                )}
                              </div>
                            ) : slide.layout === "quote" ? (
                              <div className="flex h-full flex-col justify-center px-12">
                                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-purple-400">{slide.title}</p>
                                <p className="text-2xl italic leading-relaxed text-purple-100">
                                  &ldquo;{slide.content[0]}&rdquo;
                                </p>
                              </div>
                            ) : slide.layout === "two-column" ? (
                              <div className="flex h-full flex-col px-10 py-8">
                                <p className="mb-5 text-xl font-bold text-white">{slide.title}</p>
                                <div className="grid flex-1 grid-cols-2 gap-6 overflow-hidden">
                                  {(() => {
                                    const mid = Math.ceil(slide.content.length / 2);
                                    return (
                                      <>
                                        <ul className="space-y-2 overflow-hidden">
                                          {slide.content.slice(0, mid).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-purple-100">
                                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                                              {item}
                                            </li>
                                          ))}
                                        </ul>
                                        <ul className="space-y-2 overflow-hidden border-l border-white/10 pl-6">
                                          {slide.content.slice(mid).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-indigo-200">
                                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                                              {item}
                                            </li>
                                          ))}
                                        </ul>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-full flex-col justify-start px-10 py-8">
                                <p className="mb-5 text-xl font-bold text-white">{slide.title}</p>
                                <ul className="space-y-2.5">
                                  {slide.content.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-purple-100">
                                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {/* Slide number badge */}
                            <div className="absolute bottom-3 right-4 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                              {currentSlideIndex + 1} / {parsedSlides.length}
                            </div>
                          </div>

                          {/* Navigation row */}
                          <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCurrentSlideIndex((i) => Math.max(0, i - 1))}
                                disabled={isFirst}
                                aria-label="Previous slide"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/8 transition hover:bg-[#1a2030] disabled:opacity-40"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCurrentSlideIndex((i) => Math.min(parsedSlides.length - 1, i + 1))}
                                disabled={isLast}
                                aria-label="Next slide"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/8 transition hover:bg-[#1a2030] disabled:opacity-40"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                              <span className="ml-1 text-xs text-white/40">
                                {parsedSlides.length} slides
                                {editor.tokenCount > 0 && <> &middot; {editor.tokenCount.toLocaleString()} tokens</>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setShowSlideNotes((v) => !v)}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${showSlideNotes ? "border-[#7c5cff]/25 bg-[#7c5cff]/15 text-purple-300" : "border-white/10 bg-white/8 text-white/55 hover:bg-[#1a2030]"}`}
                              >
                                Notes
                              </button>
                              <button
                                type="button"
                                onClick={handleDownloadPptx}
                                disabled={slideDownloading}
                                aria-label="Download presentation as PPTX"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#17131d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2c2438] disabled:opacity-60"
                              >
                                {slideDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                PPTX
                              </button>
                            </div>
                          </div>

                          {/* Speaker notes */}
                          {showSlideNotes && slide.notes && (
                            <div className="border-b border-white/6 bg-[#0e1219] px-5 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Speaker notes</p>
                              <p className="mt-1.5 text-sm leading-6 text-white/55">{slide.notes}</p>
                            </div>
                          )}

                          {/* Slide thumbnails strip */}
                          <div className="flex gap-1.5 overflow-x-auto px-4 py-3">
                            {parsedSlides.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setCurrentSlideIndex(i)}
                                aria-label={`Go to slide ${i + 1}: ${s.title}`}
                                aria-current={i === currentSlideIndex ? "true" : undefined}
                                className={`shrink-0 rounded-lg overflow-hidden border-2 transition ${i === currentSlideIndex ? "border-[#7c5cff]" : "border-transparent hover:border-black/15"}`}
                              >
                                <div className={`flex h-10 w-16 items-center justify-center bg-gradient-to-br ${SLIDE_LAYOUT_GRADIENTS[s.layout]}`}>
                                  <span className="truncate px-1 text-[7px] font-semibold text-white/80">{s.title}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      );
                    })()

                  ) : editor.outputText.trim() ? (
                    /* ── Default text output ── */
                    <>
                      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-5 py-3">
                        <span className="text-xs text-white/40">
                          {wordCount(editor.outputText).toLocaleString()} words
                          &middot; {editor.outputText.length.toLocaleString()}{" "}
                          chars
                          {editor.tokenCount > 0 && (
                            <>
                              {" "}&middot;{" "}
                              {editor.tokenCount.toLocaleString()} tokens
                            </>
                          )}
                        </span>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOutputTransform("shorten")}
                            disabled={
                              isGenerating || isSaving || isTransformingOutput
                            }
                            aria-label="Shorten output"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2030] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isTransformingOutput ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Wand2 className="h-3.5 w-3.5" />
                            )}
                            Shorten
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOutputTransform("expand")}
                            disabled={
                              isGenerating || isSaving || isTransformingOutput
                            }
                            aria-label="Expand output with more detail"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2030] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                            Expand
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOutputTransform("tone")}
                            disabled={
                              isGenerating || isSaving || isTransformingOutput
                            }
                            aria-label="Improve tone and readability"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2030] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                            Improve tone
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyOutput}
                            aria-label={copiedOutput ? "Output copied to clipboard" : "Copy output to clipboard"}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a2030]"
                          >
                            {copiedOutput ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedOutput ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={editor.outputText}
                        onChange={(e) =>
                          updateEditor({ outputText: e.target.value })
                        }
                        className="min-h-[360px] w-full resize-none bg-transparent p-5 font-sans text-sm leading-7 text-white outline-none"
                      />
                    </>
                  ) : (
                    <div className="flex min-h-[420px] flex-col items-start justify-center p-5">
                      <p className="text-sm font-semibold text-white">
                        No output yet
                      </p>
                      <p className="mt-2 max-w-md text-sm leading-6 text-white/55">
                        Fill the editor, run the tool, and the generated result
                        will appear here and stay connected to this saved run.
                      </p>
                    </div>
                  )}
                </div>

                {editor.lastError && (
                  <div className="rounded-[24px] border border-rose-700/40 bg-rose-950/50 px-4 py-4 text-sm text-rose-300">
                    Last saved error: {editor.lastError}
                  </div>
                )}
              </div>
            </section>

            {/* History panel */}
            <section className="rounded-[30px] border border-white/8 bg-[#13171f] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-white/6 pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c5cff]">
                    Saved history
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    {filteredDisplayedRuns.length}{" "}
                    {filteredDisplayedRuns.length === 1 ? "run" : "runs"}
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
                        ? "border-[#7c5cff]/25 bg-[#7c5cff]/15 text-[#5b3fc5]"
                        : "border-white/10 bg-[#0e1219] text-white/55 hover:bg-[#1a2030] hover:text-white"
                    }`}
                  >
                    {showAllRuns ? "This tool" : "All tools"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startNewRun(activeMode)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#17131d] text-white transition hover:bg-[#2c2438]"
                    aria-label={`Start a new ${modeMeta.label.toLowerCase()} run`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    value={historySearchQuery}
                    onChange={(event) =>
                      setHistorySearchQuery(event.target.value)
                    }
                    placeholder="Search titles, source text, or output"
                    className="w-full rounded-xl border border-white/10 bg-[#0e1219] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                  />
                </label>

                <select
                  value={historyStatusFilter}
                  onChange={(event) =>
                    setHistoryStatusFilter(
                      event.target.value as
                        | "all"
                        | "draft"
                        | "completed"
                        | "failed",
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[#0e1219] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Done</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="mt-4 space-y-3">
                {filteredDisplayedRuns.map((run) => {
                  const Icon = MODE_ICONS[run.mode];
                  const isSelected = run.id === selectedRunId;

                  return (
                    <div
                      key={run.id}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        isSelected
                          ? `${MODE_ACCENTS[run.mode]} shadow-sm`
                          : "border-white/8 bg-[#0e1219] hover:border-[#7c5cff]/20 hover:bg-[#1a2030]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => selectRun(run)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <div className="rounded-2xl bg-white/10 p-2 text-current shadow-sm">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRenameDialog(run);
                              }}
                              aria-label={`Rename "${run.title}"`}
                              className="group/title flex min-w-0 items-center gap-1 text-left"
                            >
                              <p className="truncate cursor-text text-sm font-semibold text-white">
                                {run.title}
                              </p>
                              <Pencil className="h-3 w-3 shrink-0 text-white/40 opacity-0 transition-opacity group-hover/title:opacity-100" />
                            </button>
                            <p className="mt-1 text-xs text-white/55">
                              {formatUpdatedAt(run)}
                            </p>
                          </div>
                        </button>

                        <div className="flex shrink-0 items-start gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                              run.status === "completed"
                                ? "bg-emerald-900/40 text-emerald-400"
                                : run.status === "failed"
                                  ? "bg-rose-900/40 text-rose-400"
                                  : "bg-slate-800/60 text-slate-400"
                            }`}
                          >
                            {formatStatus(run.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDuplicateRun(run)}
                            className="rounded-lg border border-white/10 bg-white/8 p-1.5 text-white/55 transition hover:text-white"
                            aria-label={`Duplicate ${run.title}`}
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openRenameDialog(run)}
                            className="rounded-lg border border-white/10 bg-white/8 p-1.5 text-white/55 transition hover:text-white"
                            aria-label={`Rename ${run.title}`}
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(run)}
                            className="rounded-lg border border-white/10 bg-white/8 p-1.5 text-white/55 transition hover:text-rose-700"
                            aria-label={`Delete ${run.title}`}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {(run.outputText || run.sourceText || run.lastError) && (
                        <button
                          type="button"
                          onClick={() => selectRun(run)}
                          className="mt-3 block w-full text-left"
                        >
                          <p className="line-clamp-3 text-sm leading-6 text-white/55">
                            {run.outputText || run.sourceText || run.lastError}
                          </p>
                        </button>
                      )}
                    </div>
                  );
                })}

                {!filteredDisplayedRuns.length && !isLoading && (
                  displayedRuns.length ? (
                    /* Filter-no-results state */
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-[#0e1219] px-4 py-6 text-sm text-white/55">
                      No runs match your current search or status filter.
                    </div>
                  ) : (
                    /* True empty state — no runs for this tool yet */
                    <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-white/10 bg-[#0e1219] px-4 py-10 text-center">
                      <div className={`rounded-2xl p-3 ${MODE_ACCENTS[activeMode]}`}>
                        <ModeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          No {modeMeta.label.toLowerCase()} runs yet
                        </p>
                        <p className="mt-1 max-w-[220px] text-xs leading-5 text-white/55">
                          {modeMeta.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startNewRun(activeMode)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#17131d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2c2438]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Start first run
                      </button>
                    </div>
                  )
                )}

                {isLoading && (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-[#0e1219] px-4 py-6 text-center text-sm text-white/55">
                    <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#7c5cff]" />
                    Loading workspace history...
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        {renameTargetRun && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close rename dialog"
              onClick={() => setRenameTargetRun(null)}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/8 bg-[#13171f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c5cff]">
                    Rename run
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                    Update history label
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRenameTargetRun(null)}
                  className="rounded-full border border-white/10 p-2 text-white/55 transition hover:text-white"
                  aria-label="Close rename dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/55">
                Give this run a clearer label so it is easier to find later in
                history.
              </p>

              <label
                htmlFor="rename-run-input"
                className="mt-5 block text-sm font-semibold text-white"
              >
                Run title
              </label>
              <input
                id="rename-run-input"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0e1219] px-4 py-3 text-sm text-white outline-none transition focus:border-[#7c5cff] focus:bg-[#1a2030]"
                placeholder="Enter a run title"
              />

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTargetRun(null)}
                  className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0e1219]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRenameRun}
                  disabled={isSaving || !renameValue.trim()}
                  className="rounded-2xl bg-[#17131d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2b2238] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save title"}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteTargetRun && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close delete dialog"
              onClick={() => setDeleteTargetRun(null)}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            <div className="relative z-10 w-full max-w-md rounded-[28px] border border-rose-900/40 bg-[#13171f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-rose-900/40 p-3 text-rose-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-400">
                      Delete run
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                      Remove from history
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTargetRun(null)}
                  className="rounded-full border border-white/10 p-2 text-white/55 transition hover:text-white"
                  aria-label="Close delete dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/55">
                Delete{" "}
                <span className="font-semibold text-white">
                  {deleteTargetRun.title}
                </span>{" "}
                from history. This action cannot be undone.
              </p>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetRun(null)}
                  className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0e1219]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRun}
                  disabled={isSaving}
                  className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Deleting..." : "Delete run"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
