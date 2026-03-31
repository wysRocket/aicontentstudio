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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "react-router-dom";
import { GoogleGenAI } from "@google/genai";
import promptsData from "../prompts_data.json";
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
    "border-[#d9c8e8] bg-[linear-gradient(180deg,#fff8ff_0%,#fffdf7_100%)] text-[#5b3c6e]",
  summarize:
    "border-[#d9dfef] bg-[linear-gradient(180deg,#f8fbff_0%,#fffdf9_100%)] text-[#41546d]",
  transcribe:
    "border-[#d8e6db] bg-[linear-gradient(180deg,#f5fff6_0%,#fffdf8_100%)] text-[#365947]",
  translate:
    "border-[#ead8c7] bg-[linear-gradient(180deg,#fffaf2_0%,#fffdf7_100%)] text-[#8a5a34]",
  generate_image:
    "border-[#c8d8ea] bg-[linear-gradient(180deg,#f4f9ff_0%,#fffdf9_100%)] text-[#244a6a]",
  create_document:
    "border-[#c8e8d4] bg-[linear-gradient(180deg,#f4fff8_0%,#fffef9_100%)] text-[#1f5435]",
  create_presentation:
    "border-[#e0c8ea] bg-[linear-gradient(180deg,#faf4ff_0%,#fffdf9_100%)] text-[#562070]",
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
        pSlide.background = { color: "1a1040" };

        const isTitle = slide.layout === "title";
        const isClosing = slide.layout === "closing";
        const isQuote = slide.layout === "quote";

        pSlide.addText(slide.title, {
          x: 0.5, y: isTitle ? 2.2 : 0.35,
          w: "90%", h: isTitle ? 1.5 : 1.0,
          fontSize: isTitle ? 40 : 26,
          bold: true, color: "FFFFFF",
          fontFace: "Calibri",
          align: isTitle || isClosing ? "center" : "left",
        });

        if (isQuote && slide.content.length > 0) {
          pSlide.addText(`"${slide.content[0]}"`, {
            x: 1.0, y: 2.0, w: "80%", h: 3.0,
            fontSize: 22, italic: true, color: "C4B5FD",
            fontFace: "Calibri", align: "center",
          });
        } else if (!isTitle && !isClosing && slide.content.length > 0) {
          pSlide.addText(
            slide.content.map((c) => ({ text: `${c}\n`, options: {} })),
            { x: 0.5, y: 1.5, w: "90%", h: 5.5, fontSize: 18, color: "E0D8FF", fontFace: "Calibri" },
          );
        }

        if (isClosing && slide.content.length > 0) {
          pSlide.addText(slide.content[0], {
            x: 0.5, y: 3.8, w: "90%", h: 1.0,
            fontSize: 20, color: "A78BFA", fontFace: "Calibri", align: "center",
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
    setError(null);
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
          model: "imagen-3.0-generate-001",
          prompt: imagePrompt,
          config: { numberOfImages: 1, aspectRatio: "1:1" },
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
          tokenCount = response.usageMetadata?.totalTokenCount ?? 0;
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

    const transformInstructionByType = {
      shorten:
        "Make this output around 30-40% shorter while preserving key meaning and action items.",
      expand:
        "Expand this output with practical detail, examples, and clearer structure while preserving the intent.",
      tone: "Improve tone and readability so it sounds confident, practical, and natural without adding hype.",
    } as const;

    try {
      setIsTransformingOutput(true);
      setError(null);
      setSuccessMessage(null);

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "You are editing content inside AI Content Studio.",
                  transformInstructionByType[transform],
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
      setError(
        transformError instanceof Error
          ? transformError.message
          : "We couldn't transform this output right now.",
      );
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
      setError(null);
    } catch (duplicateError) {
      console.error("Failed to duplicate run", duplicateError);
      setError("We couldn't duplicate this run right now.");
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
      setError(null);
      setRenameTargetRun(null);
    } catch (renameError) {
      console.error("Failed to rename run", renameError);
      setError("We couldn't rename this run right now.");
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
      setError(null);
      setDeleteTargetRun(null);
    } catch (deleteError) {
      console.error("Failed to delete run", deleteError);
      setError("We couldn't delete this run right now.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-[#f4ede4] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto max-w-[1480px] space-y-4">
        {/* Compact hero */}
        <section className="overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(135deg,#1a1623_0%,#2b2036_35%,#7c5cff_100%)] px-5 py-4 text-white shadow-[0_20px_60px_rgba(23,19,29,0.18)] sm:px-7 lg:px-8">
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
                    className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-[#f0ecff] px-4 py-3 text-sm font-semibold text-[#5b3fc5] transition hover:bg-[#e8e2ff]"
                  >
                    <Plus className="h-4 w-4" />
                    New run
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isGenerating || !isDirty}
                    className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#17131d] transition hover:border-[#7c5cff]/20 hover:bg-[#fffaf7] disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="w-full rounded-2xl border border-black/10 bg-[#fcfaf7] px-4 py-3 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
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
                      className="w-full rounded-2xl border border-black/10 bg-[#fcfaf7] px-4 py-3 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
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
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-black/12 bg-[#fcfaf7] px-5 py-10 text-center transition hover:border-[#7c5cff]/35 hover:bg-white">
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
                        className="min-h-[140px] w-full rounded-[28px] border border-black/10 bg-[#fcfaf7] px-4 py-4 text-sm leading-6 text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
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
                        className="min-h-[260px] w-full rounded-[28px] border border-black/10 bg-[#fcfaf7] px-4 py-4 text-sm leading-6 text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
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
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="workspace-instructions-input"
                      className="block text-sm font-semibold text-[#17131d]"
                    >
                      {modeMeta.instructionsLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPresetSearch("");
                        setShowPresetPicker(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#7c5cff]/25 bg-[#f6efff] px-3 py-1.5 text-xs font-semibold text-[#7c5cff] transition hover:bg-[#ede8ff]"
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
                    className="min-h-[140px] w-full rounded-[28px] border border-black/10 bg-[#fcfaf7] px-4 py-4 text-sm leading-6 text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
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
                    <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
                      <div className="border-b border-black/6 px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold text-[#17131d]">
                            Choose a preset
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowPresetPicker(false)}
                            className="rounded-xl border border-black/8 p-1.5 text-[#6e5e58] transition hover:bg-[#f9f6f2]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="relative mt-3">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d7d74]" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search presets..."
                            value={presetSearch}
                            onChange={(e) => setPresetSearch(e.target.value)}
                            className="w-full rounded-2xl border border-black/10 bg-[#fcfaf7] py-2.5 pl-9 pr-4 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
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
                              className="w-full rounded-[20px] border border-transparent px-4 py-3 text-left transition hover:border-[#7c5cff]/15 hover:bg-[#f6efff]"
                            >
                              <p className="text-sm font-semibold text-[#17131d]">
                                {preset.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#6e5e58]">
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
                      <Coins className="h-3.5 w-3.5 text-[#7c5cff]" />
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

                <div className="overflow-hidden rounded-[28px] border border-black/8 bg-[#fffdf9]">
                  {isGenerating ? (
                    <div className="flex min-h-[420px] flex-col items-center justify-center p-5 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-[#7c5cff]" />
                      <p className="mt-4 text-base font-semibold text-[#17131d]">
                        Running {modeMeta.label.toLowerCase()}...
                      </p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-[#6e5e58]">
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
                          <p className="text-xs text-[#8d7d74]">
                            Session only — download to keep this image.
                          </p>
                          <button
                            type="button"
                            onClick={handleDownloadImage}
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
                        <p className="mt-4 text-sm font-semibold text-[#17131d]">Image not available</p>
                        <p className="mt-2 max-w-xs text-sm text-[#6e5e58]">
                          Images aren't stored in history. Generate a new one or download immediately after generation.
                        </p>
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] flex-col items-start justify-center p-5">
                        <p className="text-sm font-semibold text-[#17131d]">No image yet</p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-[#6e5e58]">
                          Describe what you want to see, then run the tool. Images are available for download during this session.
                        </p>
                      </div>
                    )

                  ) : activeMode === "create_document" && editor.outputText.trim() ? (
                    /* ── Document output ── */
                    <>
                      <div className="flex items-center justify-between gap-3 border-b border-black/6 px-5 py-3">
                        <span className="text-xs text-[#8d7d74]">
                          {wordCount(editor.outputText).toLocaleString()} words
                          &middot; {editor.outputText.length.toLocaleString()} chars
                          {editor.tokenCount > 0 && <> &middot; {editor.tokenCount.toLocaleString()} tokens</>}
                        </span>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyOutput}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#17131d] transition hover:bg-[#f9f6f2]"
                          >
                            {copiedOutput ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedOutput ? "Copied!" : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadDocx}
                            disabled={docDownloading}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#17131d] transition hover:bg-[#f9f6f2] disabled:opacity-60"
                          >
                            {docDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            DOCX
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={docDownloading}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#17131d] transition hover:bg-[#f9f6f2] disabled:opacity-60"
                          >
                            {docDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            PDF
                          </button>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none p-5 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-[#17131d] [&_h1]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[#17131d] [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#17131d] [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#17131d] [&_ul]:text-sm [&_ul]:leading-7 [&_li]:text-[#17131d] [&_strong]:text-[#17131d]">
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
                          <div className="relative aspect-video overflow-hidden rounded-t-[28px] bg-gradient-to-br from-[#1a1040] via-[#2d1258] to-[#4a1a80]">
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
                          <div className="flex items-center justify-between gap-3 border-b border-black/6 px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCurrentSlideIndex((i) => Math.max(0, i - 1))}
                                disabled={isFirst}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-white transition hover:bg-[#f9f6f2] disabled:opacity-40"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCurrentSlideIndex((i) => Math.min(parsedSlides.length - 1, i + 1))}
                                disabled={isLast}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-white transition hover:bg-[#f9f6f2] disabled:opacity-40"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                              <span className="ml-1 text-xs text-[#8d7d74]">
                                {parsedSlides.length} slides
                                {editor.tokenCount > 0 && <> &middot; {editor.tokenCount.toLocaleString()} tokens</>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setShowSlideNotes((v) => !v)}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${showSlideNotes ? "border-[#7c5cff]/25 bg-[#f0ecff] text-[#5b3fc5]" : "border-black/10 bg-white text-[#6e5e58] hover:bg-[#f9f6f2]"}`}
                              >
                                Notes
                              </button>
                              <button
                                type="button"
                                onClick={handleDownloadPptx}
                                disabled={slideDownloading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#17131d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2c2438] disabled:opacity-60"
                              >
                                {slideDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                PPTX
                              </button>
                            </div>
                          </div>

                          {/* Speaker notes */}
                          {showSlideNotes && slide.notes && (
                            <div className="border-b border-black/6 bg-[#faf8f5] px-5 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8d7d74]">Speaker notes</p>
                              <p className="mt-1.5 text-sm leading-6 text-[#6e5e58]">{slide.notes}</p>
                            </div>
                          )}

                          {/* Slide thumbnails strip */}
                          <div className="flex gap-1.5 overflow-x-auto px-4 py-3">
                            {parsedSlides.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setCurrentSlideIndex(i)}
                                className={`shrink-0 rounded-lg overflow-hidden border-2 transition ${i === currentSlideIndex ? "border-[#7c5cff]" : "border-transparent hover:border-black/15"}`}
                                title={s.title}
                              >
                                <div className="flex h-10 w-16 items-center justify-center bg-gradient-to-br from-[#1a1040] to-[#4a1a80]">
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
                      <div className="flex items-center justify-between gap-3 border-b border-black/6 px-5 py-3">
                        <span className="text-xs text-[#8d7d74]">
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#17131d] transition hover:bg-[#f9f6f2] disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#17131d] transition hover:bg-[#f9f6f2] disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#17131d] transition hover:bg-[#f9f6f2] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                            Improve tone
                          </button>
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
                    <div className="flex min-h-[420px] flex-col items-start justify-center p-5">
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c5cff]">
                    Saved history
                  </p>
                  <p className="mt-2 text-sm text-[#6e5e58]">
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
                        ? "border-[#7c5cff]/25 bg-[#f0ecff] text-[#5b3fc5]"
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

              <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d7d74]" />
                  <input
                    value={historySearchQuery}
                    onChange={(event) =>
                      setHistorySearchQuery(event.target.value)
                    }
                    placeholder="Search titles, source text, or output"
                    className="w-full rounded-xl border border-black/10 bg-[#fcfaf7] py-2.5 pl-9 pr-3 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
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
                  className="rounded-xl border border-black/10 bg-[#fcfaf7] px-3 py-2.5 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
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
                          : "border-black/8 bg-[#fcfaf7] hover:border-[#7c5cff]/20 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => selectRun(run)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
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
                        </button>

                        <div className="flex shrink-0 items-start gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                              run.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : run.status === "failed"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {formatStatus(run.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDuplicateRun(run)}
                            className="rounded-lg border border-black/10 bg-white p-1.5 text-[#6e5e58] transition hover:text-[#17131d]"
                            aria-label={`Duplicate ${run.title}`}
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openRenameDialog(run)}
                            className="rounded-lg border border-black/10 bg-white p-1.5 text-[#6e5e58] transition hover:text-[#17131d]"
                            aria-label={`Rename ${run.title}`}
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(run)}
                            className="rounded-lg border border-black/10 bg-white p-1.5 text-[#6e5e58] transition hover:text-rose-700"
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
                          <p className="line-clamp-3 text-sm leading-6 text-[#6e5e58]">
                            {run.outputText || run.sourceText || run.lastError}
                          </p>
                        </button>
                      )}
                    </div>
                  );
                })}

                {!filteredDisplayedRuns.length && !isLoading && (
                  <div className="rounded-[24px] border border-dashed border-black/10 bg-[#fcfaf7] px-4 py-6 text-sm text-[#6e5e58]">
                    {displayedRuns.length
                      ? "No runs match your current search or status filter."
                      : showAllRuns
                        ? "No saved runs yet. Start a new run and the history will fill automatically."
                        : "No saved runs for this tool yet. Start a new run and the history panel will fill automatically."}
                  </div>
                )}

                {isLoading && (
                  <div className="rounded-[24px] border border-dashed border-black/10 bg-[#fcfaf7] px-4 py-6 text-center text-sm text-[#6e5e58]">
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
            <div className="relative z-10 w-full max-w-md rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_24px_80px_rgba(23,19,29,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c5cff]">
                    Rename run
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#17131d]">
                    Update history label
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRenameTargetRun(null)}
                  className="rounded-full border border-black/10 p-2 text-[#6e5e58] transition hover:text-[#17131d]"
                  aria-label="Close rename dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#6e5e58]">
                Give this run a clearer label so it is easier to find later in
                history.
              </p>

              <label
                htmlFor="rename-run-input"
                className="mt-5 block text-sm font-semibold text-[#17131d]"
              >
                Run title
              </label>
              <input
                id="rename-run-input"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[#fcfaf7] px-4 py-3 text-sm text-[#17131d] outline-none transition focus:border-[#7c5cff] focus:bg-white"
                placeholder="Enter a run title"
              />

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTargetRun(null)}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#17131d] transition hover:bg-[#fcfaf7]"
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
            <div className="relative z-10 w-full max-w-md rounded-[28px] border border-rose-100 bg-white p-6 shadow-[0_24px_80px_rgba(23,19,29,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                      Delete run
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#17131d]">
                      Remove from history
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTargetRun(null)}
                  className="rounded-full border border-black/10 p-2 text-[#6e5e58] transition hover:text-[#17131d]"
                  aria-label="Close delete dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#6e5e58]">
                Delete{" "}
                <span className="font-semibold text-[#17131d]">
                  {deleteTargetRun.title}
                </span>{" "}
                from history. This action cannot be undone.
              </p>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetRun(null)}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#17131d] transition hover:bg-[#fcfaf7]"
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
