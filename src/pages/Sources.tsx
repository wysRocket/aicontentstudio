import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Link2,
  FileText,
  Trash2,
  PencilLine,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  ScanSearch,
  Quote,
  Lightbulb,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFirebase } from "../contexts/FirebaseContext";
import {
  deleteSource,
  ensureWorkspaceSeedData,
  getWorkspaceSettings,
  saveInspiration,
  saveSource,
  subscribeToSources,
  updateSourceAnalysis,
  type SourceRecord,
  type SourceType,
  type SourceTypeDetail,
  type WorkspaceSettings,
} from "../lib/firestore";

type EditableSource = {
  id: string;
  title: string;
  type: SourceType;
  url: string;
  description: string;
  sourceTypeDetail: SourceTypeDetail;
  contentText: string;
};

type SourceAnalysisResponse = {
  title: string;
  summary: string;
  keyPoints: string[];
  hooks: string[];
  quotes: string[];
  ctaIdeas: string[];
  audience: string;
  risks: string[];
  cleanedText: string;
};

const emptySource: EditableSource = {
  id: "",
  title: "",
  type: "website",
  url: "",
  description: "",
  sourceTypeDetail: "url",
  contentText: "",
};

export default function Sources() {
  const { user, isAuthReady } = useFirebase();
  const navigate = useNavigate();
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [editingSource, setEditingSource] = useState<EditableSource | null>(null);
  const [workspaceSettings, setWorkspaceSettings] =
    useState<WorkspaceSettings | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady) {
        setSources([]);
        setIsLoading(false);
      }
      return;
    }

    let active = true;
    let unsubscribe = () => {};
    setIsLoading(true);
    setError(null);

    ensureWorkspaceSeedData(user.uid)
      .then(async () => {
        if (!active) return;
        const settings = await getWorkspaceSettings(user.uid);
        if (active) setWorkspaceSettings(settings);
        unsubscribe = subscribeToSources(user.uid, (records) => {
          if (!active) return;
          setSources(records);
          setIsLoading(false);
        });
      })
      .catch((err) => {
        console.error("Failed to load sources", err);
        if (active) {
          setError("We couldn't load your source library.");
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isAuthReady, user]);

  const filteredSources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sources;
    return sources.filter((source) =>
      [
        source.title,
        source.description,
        source.url,
        source.type,
        source.analysisSummary,
        source.analysisHooks?.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, sources]);

  const selectedSource = useMemo(() => {
    return (
      filteredSources.find((source) => source.id === selectedSourceId) ??
      filteredSources[0] ??
      null
    );
  }, [filteredSources, selectedSourceId]);

  useEffect(() => {
    if (!filteredSources.length) {
      setSelectedSourceId("");
      return;
    }

    if (!filteredSources.some((source) => source.id === selectedSourceId)) {
      setSelectedSourceId(filteredSources[0].id);
    }
  }, [filteredSources, selectedSourceId]);

  const openModal = (source?: SourceRecord) => {
    setEditingSource(
      source
        ? {
            id: source.id,
            title: source.title,
            type: source.type,
            url: source.url,
            description: source.description,
            sourceTypeDetail: source.sourceTypeDetail || "manual",
            contentText: source.contentText || "",
          }
        : { ...emptySource },
    );
    setIsModalOpen(true);
    setError(null);
    setSuccessMessage(null);
  };

  const closeModal = () => {
    if (isSaving) return;
    setEditingSource(null);
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!user || !editingSource) return;

    if (editingSource.sourceTypeDetail === "url" && !editingSource.url.trim()) {
      setError("Add a URL to save this source.");
      return;
    }

    if (
      editingSource.sourceTypeDetail === "pasted_text" &&
      !editingSource.contentText.trim()
    ) {
      setError("Paste source text before saving.");
      return;
    }

    const fallbackTitle =
      editingSource.sourceTypeDetail === "url"
        ? editingSource.url.trim()
        : "Pasted Source";

    setIsSaving(true);
    setError(null);

    try {
      await saveSource(user.uid, {
        id: editingSource.id || undefined,
        title: editingSource.title.trim() || fallbackTitle,
        type: editingSource.type,
        url: editingSource.url,
        description: editingSource.description,
        sourceTypeDetail: editingSource.sourceTypeDetail,
        contentText: editingSource.contentText,
        status: editingSource.id ? undefined : "raw",
      });
      setSuccessMessage(
        editingSource.id ? "Source updated." : "Source saved to your library.",
      );
      closeModal();
    } catch (err) {
      console.error("Failed to save source", err);
      setError("We couldn't save this source.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!user) return;
    try {
      await deleteSource(user.uid, sourceId);
    } catch (err) {
      console.error("Failed to delete source", err);
      setError("We couldn't delete that source.");
    }
  };

  const analyzeSource = async (source: SourceRecord) => {
    if (!user) return;

    setAnalyzingId(source.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await saveSource(user.uid, {
        id: source.id,
        title: source.title,
        type: source.type,
        url: source.url,
        description: source.description,
        sourceTypeDetail: source.sourceTypeDetail ?? "manual",
        contentText: source.contentText ?? "",
        status: "processing",
      });

      const response = await fetch("/api/sources/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: source.sourceTypeDetail === "pasted_text" ? "pasted_text" : "url",
          url: source.url,
          rawText: source.contentText,
          brandVoice: workspaceSettings?.brandVoice ?? "",
          brandAudience: workspaceSettings?.brandAudience ?? "",
          ctaStyle: workspaceSettings?.ctaStyle ?? "",
          bannedPhrases: workspaceSettings?.bannedPhrases ?? "",
        }),
      });

      const payload = (await response.json()) as
        | SourceAnalysisResponse
        | { error?: string };

      if (
        !response.ok ||
        ("error" in payload && typeof payload.error === "string")
      ) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "source_analysis_failed",
        );
      }

      const analysis = payload as SourceAnalysisResponse;

      await updateSourceAnalysis(user.uid, source.id, {
        title: analysis.title || source.title,
        description: source.description || analysis.summary,
        status: "ready",
        contentText: analysis.cleanedText,
        analysisSummary: analysis.summary,
        analysisKeyPoints: analysis.keyPoints,
        analysisHooks: analysis.hooks,
        analysisQuotes: analysis.quotes,
        analysisCtaIdeas: analysis.ctaIdeas,
        analysisAudience: analysis.audience,
        analysisRisks: analysis.risks,
        lastProcessedAt: null,
      });

      setSuccessMessage(`Analyzed "${analysis.title || source.title}".`);
    } catch (err) {
      console.error("Failed to analyze source", err);
      try {
        await saveSource(user.uid, {
          id: source.id,
          title: source.title,
          type: source.type,
          url: source.url,
          description: source.description,
          sourceTypeDetail: source.sourceTypeDetail ?? "manual",
          contentText: source.contentText ?? "",
          status: "failed",
        });
      } catch (saveErr) {
        console.error("Failed to mark source as failed", saveErr);
      }
      setError(
        err instanceof Error
          ? `We couldn't analyze that source: ${err.message}`
          : "We couldn't analyze that source.",
      );
    } finally {
      setAnalyzingId(null);
    }
  };

  const getSourceStatusTone = (source: SourceRecord) => {
    switch (source.status) {
      case "ready":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "processing":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "failed":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getSourceStatusLabel = (source: SourceRecord) => {
    switch (source.status) {
      case "ready":
        return "brief ready";
      case "processing":
        return "processing";
      case "failed":
        return "needs retry";
      default:
        return "raw source";
    }
  };

  const saveHookToInspiration = async (source: SourceRecord, hook: string) => {
    if (!user) return;
    try {
      await saveInspiration(user.uid, {
        authorName: source.title,
        authorAvatar: "",
        content: hook,
        platform: source.type,
        mediaType: "none",
        mediaUrl: "",
        note: `Extracted hook from source brief: ${source.title}`,
        tags: [
          "source-hook",
          source.type.toLowerCase(),
          ...(source.analysisAudience ? [source.analysisAudience.toLowerCase()] : []),
        ],
      });
      setSuccessMessage(`Saved hook from "${source.title}" to Inspiration.`);
    } catch (err) {
      console.error("Failed to save hook to inspiration", err);
      setError("We couldn't save that hook to Inspiration.");
    }
  };

  const createDraftFromHook = (source: SourceRecord, hook: string) => {
    navigate(
      `/dashboard/create?source=${encodeURIComponent(source.id)}&hook=${encodeURIComponent(hook)}`,
    );
  };

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sources</h1>
          <p className="mt-2 text-gray-500">
            Add URLs or pasted text, extract the best angles, then send the
            source brief straight into Create Post.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Source
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        Phase 1 source intelligence is live for URLs and pasted text. Analyze a
        source to generate hooks, summary points, CTA ideas, and cleaner draft
        context.
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, description, URL, or extracted hooks..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
          Loading sources...
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-semibold text-gray-900">No sources found</p>
          <p className="mt-2 text-sm text-gray-500">
            Save a URL or paste source material here so your workflow has a real
            source library.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Source library
                </p>
                <p className="mt-3 text-3xl font-semibold text-gray-900">
                  {filteredSources.length}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Sources currently match your search.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Ready briefs
                </p>
                <p className="mt-3 text-3xl font-semibold text-gray-900">
                  {filteredSources.filter((source) => source.status === "ready").length}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Sources already analyzed and ready to draft from.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {filteredSources.map((source) => {
                const isSelected = selectedSource?.id === source.id;

                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => setSelectedSourceId(source.id)}
                    className={`w-full rounded-3xl border p-5 text-left shadow-sm transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                              isSelected
                                ? "bg-white/15 text-white"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {source.type}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${isSelected ? "border-white/15 bg-white/10 text-white" : getSourceStatusTone(source)}`}
                          >
                            {getSourceStatusLabel(source)}
                          </span>
                        </div>
                        <h2 className="mt-3 truncate text-lg font-semibold">
                          {source.title}
                        </h2>
                        <p
                          className={`mt-3 text-sm leading-6 ${
                            isSelected ? "text-white/80" : "text-gray-600"
                          }`}
                        >
                          {source.analysisSummary ||
                            source.description ||
                            "No summary yet."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openModal(source);
                          }}
                          className={`rounded-lg p-2 ${isSelected ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
                          title="Edit source"
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(source.id);
                          }}
                          className={`rounded-lg p-2 ${isSelected ? "text-white/70 hover:bg-red-500/15 hover:text-white" : "text-gray-500 hover:bg-red-50 hover:text-red-600"}`}
                          title="Delete source"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                          isSelected
                            ? "bg-white/10 text-white/85"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <ScanSearch className="h-3.5 w-3.5" />
                        {source.analysisKeyPoints?.length || 0} points
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                          isSelected
                            ? "bg-white/10 text-white/85"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        {source.analysisHooks?.length || 0} hooks
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                          isSelected
                            ? "bg-white/10 text-white/85"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Quote className="h-3.5 w-3.5" />
                        {source.analysisQuotes?.length || 0} quotes
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-gray-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
            {selectedSource ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Selected brief
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                      {selectedSource.title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                      {selectedSource.analysisAudience ||
                        "No audience angle extracted yet."}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getSourceStatusTone(selectedSource)}`}
                  >
                    {getSourceStatusLabel(selectedSource)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => analyzeSource(selectedSource)}
                    disabled={analyzingId === selectedSource.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                  >
                    {analyzingId === selectedSource.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {selectedSource.analysisSummary ? "Refresh Brief" : "Analyze Source"}
                  </button>

                  <button
                    onClick={() =>
                      navigate(
                        `/dashboard/create?source=${encodeURIComponent(selectedSource.id)}`,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Create Drafts
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {selectedSource.url && (
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    <Link2 className="h-4 w-4" />
                    Open original source
                  </a>
                )}

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Summary
                  </p>
                  <p className="mt-3 text-sm leading-7 text-gray-700">
                    {selectedSource.analysisSummary ||
                      selectedSource.description ||
                      "Analyze this source to get a structured brief."}
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Lightbulb className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                        Hooks
                      </p>
                    </div>
                    <div className="mt-3 space-y-3">
                      {(selectedSource.analysisHooks || []).slice(0, 4).map((hook, index) => (
                        <div
                          key={`${selectedSource.id}-selected-hook-${index}`}
                          className="rounded-xl border border-amber-100/80 bg-white/70 px-3 py-3"
                        >
                          <p className="text-sm leading-6 text-amber-950">{hook}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => createDraftFromHook(selectedSource, hook)}
                              className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700 transition hover:text-blue-900"
                            >
                              Create draft
                            </button>
                            <button
                              onClick={() => saveHookToInspiration(selectedSource, hook)}
                              className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 transition hover:text-amber-900"
                            >
                              Save to inspiration
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!selectedSource.analysisHooks ||
                        selectedSource.analysisHooks.length === 0) && (
                        <p className="text-sm leading-6 text-amber-950">
                          No hooks extracted yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <ScanSearch className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                        Key Points
                      </p>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                      {(selectedSource.analysisKeyPoints || [])
                        .slice(0, 4)
                        .map((point, index) => (
                          <li key={`${selectedSource.id}-point-${index}`}>{point}</li>
                        ))}
                      {(!selectedSource.analysisKeyPoints ||
                        selectedSource.analysisKeyPoints.length === 0) && (
                        <li>No key points extracted yet.</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      CTA Ideas
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-950">
                      {(selectedSource.analysisCtaIdeas || [])
                        .slice(0, 3)
                        .map((idea, index) => (
                          <li key={`${selectedSource.id}-cta-${index}`}>{idea}</li>
                        ))}
                      {(!selectedSource.analysisCtaIdeas ||
                        selectedSource.analysisCtaIdeas.length === 0) && (
                        <li>No CTA ideas extracted yet.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {selectedSource.analysisRisks &&
                  selectedSource.analysisRisks.length > 0 && (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                        Risks / Caveats
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-rose-950">
                        {selectedSource.analysisRisks.slice(0, 3).map((risk, index) => (
                          <li key={`${selectedSource.id}-risk-${index}`}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Select a source to inspect its extracted brief.
              </div>
            )}
          </aside>
        </div>
      )}

      {isModalOpen && editingSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSource.id ? "Edit Source" : "Add Source"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-800">
                    Intake type
                  </label>
                  <select
                    value={editingSource.sourceTypeDetail}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        sourceTypeDetail: e.target.value as SourceTypeDetail,
                        type:
                          e.target.value === "url"
                            ? "website"
                            : e.target.value === "pasted_text"
                              ? "brief"
                              : editingSource.type,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="url">URL</option>
                    <option value="pasted_text">Pasted text</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-800">
                    Source type
                  </label>
                  <select
                    value={editingSource.type}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        type: e.target.value as SourceType,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="brief">Brief</option>
                    <option value="website">Website</option>
                    <option value="transcript">Transcript</option>
                    <option value="notion">Notion</option>
                    <option value="drive">Drive</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-800">
                  Title
                </label>
                <input
                  value={editingSource.title}
                  onChange={(e) =>
                    setEditingSource({ ...editingSource, title: e.target.value })
                  }
                  placeholder="Leave blank to auto-name from the URL"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editingSource.sourceTypeDetail === "url" ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-800">
                    URL
                  </label>
                  <input
                    value={editingSource.url}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, url: e.target.value })
                    }
                    placeholder="https://example.com/article"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-800">
                    Pasted text
                  </label>
                  <textarea
                    value={editingSource.contentText}
                    onChange={(e) =>
                      setEditingSource({
                        ...editingSource,
                        contentText: e.target.value,
                      })
                    }
                    placeholder="Paste transcript, launch notes, or article text here..."
                    className="min-h-[220px] w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-800">
                  Description
                </label>
                <textarea
                  value={editingSource.description}
                  onChange={(e) =>
                    setEditingSource({
                      ...editingSource,
                      description: e.target.value,
                    })
                  }
                  placeholder="What is this source and why does it matter?"
                  className="min-h-[120px] w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-5">
              <button
                onClick={closeModal}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
