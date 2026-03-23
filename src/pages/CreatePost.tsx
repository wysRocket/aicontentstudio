import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Lightbulb,
  Sparkles,
  Copy,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FilePenLine,
  Link2,
  BookmarkPlus,
  ArrowRight,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useFirebase } from "../contexts/FirebaseContext";
import {
  ensureWorkspaceSeedData,
  getSource,
  getInspiration,
  saveContentItem,
  setContentWorkflowStatus,
  subscribeToContentItems,
  subscribeToPrompts,
  validateContentDraft,
  updateContentStatus,
  type ContentRecord,
  type InspirationRecord,
  type PromptRecord,
  type SourceRecord,
} from "../lib/firestore";

const PLATFORMS = [
  { id: "twitter", name: "Twitter / X", icon: "𝕏", color: "text-black" },
  { id: "linkedin", name: "LinkedIn", icon: "in", color: "text-blue-600" },
  { id: "instagram", name: "Instagram", icon: "◎", color: "text-pink-500" },
  { id: "facebook", name: "Facebook", icon: "f", color: "text-blue-500" },
  { id: "threads", name: "Threads", icon: "@", color: "text-black" },
  { id: "bluesky", name: "Bluesky", icon: "🦋", color: "text-sky-500" },
  { id: "youtube", name: "YouTube", icon: "▶", color: "text-red-600" },
  { id: "blog", name: "Blog", icon: "✎", color: "text-teal-500" },
];

interface GeneratedDraft {
  title: string;
  body: string;
}

interface ComposerDraft {
  id: string;
  title: string;
  body: string;
  contentId?: string;
  isDirty?: boolean;
}

type DraftQueueFilter =
  | "all"
  | "draft"
  | "ready"
  | "approved"
  | "scheduled"
  | "published"
  | "failed";

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  return fenced ? fenced[1] : text;
}

function getGeminiApiKey() {
  return (
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    (typeof process !== "undefined" ? process.env.GEMINI_API_KEY : undefined)
  );
}

function createEmptyComposerDraft(index: number): ComposerDraft {
  return {
    id: `draft-tab-${Date.now()}-${index}`,
    title: `Post ${index + 1}`,
    body: "",
    isDirty: false,
  };
}

function buildStarterBrief(inspiration: InspirationRecord) {
  const note = inspiration.note.trim()
    ? inspiration.note.trim()
    : "No note saved for why it works.";

  return [
    `Create a social post inspired by this source from ${inspiration.authorName} on ${inspiration.platform}.`,
    "",
    "Source post:",
    inspiration.content,
    "",
    "Why it works:",
    note,
    inspiration.tags.length ? `Keywords: ${inspiration.tags.join(", ")}` : "",
    "",
    "Make the final post feel original to our brand voice, not like a copy.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildStarterDraft(inspiration: InspirationRecord) {
  return [
    `Angle inspired by ${inspiration.authorName}:`,
    "",
    "Open with one clear claim.",
    "Follow it with a concrete observation or mini-story.",
    "End with one practical takeaway or call to action.",
    "",
    inspiration.note
      ? `What to preserve from the source: ${inspiration.note}`
      : "What to preserve from the source: the structure and emotional rhythm.",
  ].join("\n");
}

function buildHookStarterBrief(source: SourceRecord, hook: string) {
  return [
    `Create a social post using this hook from the source brief: ${hook}`,
    "",
    `Source: ${source.title}`,
    source.analysisSummary ? `Summary: ${source.analysisSummary}` : "",
    source.analysisAudience ? `Audience: ${source.analysisAudience}` : "",
    source.analysisCtaIdeas?.length
      ? `CTA ideas: ${source.analysisCtaIdeas.slice(0, 2).join(" | ")}`
      : "",
    "",
    "Keep the hook energy, but make the final post feel original and brand-aligned.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHookStarterDraft(hook: string) {
  return [
    hook,
    "",
    "Support the hook with one concrete example, proof point, or observation.",
    "End with one clear takeaway or CTA.",
  ].join("\n");
}

function getWorkflowTone(status?: ContentRecord["workflowStatus"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700";
    case "scheduled":
      return "bg-blue-50 text-blue-700";
    case "ready":
      return "bg-violet-50 text-violet-700";
    case "failed":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function CreatePost() {
  const { user, isAuthReady } = useFirebase();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inspirationId = searchParams.get("inspiration");
  const sourceId = searchParams.get("source");
  const hook = searchParams.get("hook");

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "linkedin",
  ]);
  const [promptLibrary, setPromptLibrary] = useState<PromptRecord[]>([]);
  const [drafts, setDrafts] = useState<ContentRecord[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [variantCount, setVariantCount] = useState(3);
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState("Clear, practical, and founder-led");
  const [callToAction, setCallToAction] = useState("");
  const [remixMode, setRemixMode] = useState("Keep the angle, rewrite the structure");
  const [inspiration, setInspiration] = useState<InspirationRecord | null>(null);
  const [source, setSource] = useState<SourceRecord | null>(null);
  const [includeReferences, setIncludeReferences] = useState(false);
  const [draftQueueFilter, setDraftQueueFilter] = useState<DraftQueueFilter>("all");
  const [composerDrafts, setComposerDrafts] = useState<ComposerDraft[]>([
    createEmptyComposerDraft(0),
  ]);
  const [activeDraftId, setActiveDraftId] = useState<string>(composerDrafts[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady) {
        setPromptLibrary([]);
        setDrafts([]);
        setComposerDrafts([createEmptyComposerDraft(0)]);
        setIsLoading(false);
      }
      return;
    }

    let isMounted = true;
    const unsubs: Array<() => void> = [];

    setIsLoading(true);
    setError(null);

    ensureWorkspaceSeedData(user.uid)
      .then(async () => {
        if (!isMounted) return;

        unsubs.push(
          subscribeToPrompts(user.uid, (records) => {
            if (!isMounted) return;
            setPromptLibrary(records);
            setSelectedPromptId((current) => current || records[0]?.id || "");
          }),
        );

        unsubs.push(
          subscribeToContentItems(user.uid, (records) => {
            if (!isMounted) return;
            setDrafts(records.filter((record) => record.kind === "post_draft"));
            setIsLoading(false);
          }),
        );

        const [inspirationItem, sourceItem] = await Promise.all([
          inspirationId ? getInspiration(user.uid, inspirationId) : Promise.resolve(null),
          sourceId ? getSource(user.uid, sourceId) : Promise.resolve(null),
        ]);
        if (!isMounted) return;

        setInspiration(inspirationItem);
        setSource(sourceItem);

        if (inspirationItem) {
          setBrief((current) =>
            current.trim() ? current : buildStarterBrief(inspirationItem),
          );
          setComposerDrafts((current) => {
            if (
              current.length === 1 &&
              !current[0].body.trim() &&
              !current[0].contentId
            ) {
              return [
                {
                  ...current[0],
                  title: inspirationItem.authorName
                    ? `${inspirationItem.authorName} Remix`
                    : current[0].title,
                  body: buildStarterDraft(inspirationItem),
                },
              ];
            }
            return current;
          });
        }

        if (sourceItem) {
          setBrief((current) => {
            if (current.trim()) return current;

            if (hook) {
              return buildHookStarterBrief(sourceItem, hook);
            }

            return [
              `Create a social post from this source: ${sourceItem.title}.`,
              "",
              sourceItem.analysisSummary
                ? `Source summary: ${sourceItem.analysisSummary}`
                : "",
              sourceItem.analysisAudience
                ? `Best-fit audience: ${sourceItem.analysisAudience}`
                : "",
              sourceItem.analysisHooks?.length
                ? `Possible hooks: ${sourceItem.analysisHooks.slice(0, 3).join(" | ")}`
                : "",
              sourceItem.analysisCtaIdeas?.length
                ? `CTA ideas: ${sourceItem.analysisCtaIdeas.slice(0, 2).join(" | ")}`
                : "",
              "",
              sourceItem.contentText || sourceItem.description,
            ]
              .filter(Boolean)
              .join("\n");
          });

          if (hook) {
            setComposerDrafts((current) => {
              if (
                current.length === 1 &&
                !current[0].body.trim() &&
                !current[0].contentId
              ) {
                return [
                  {
                    ...current[0],
                    title: "Hook-led Draft",
                    body: buildHookStarterDraft(hook),
                  },
                ];
              }
              return current;
            });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to initialize create post", err);
        if (isMounted) {
          setError("We couldn't load your workspace content.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [hook, inspirationId, isAuthReady, sourceId, user]);

  useEffect(() => {
    if (composerDrafts.some((draft) => draft.id === activeDraftId)) return;
    if (composerDrafts[0]) setActiveDraftId(composerDrafts[0].id);
  }, [activeDraftId, composerDrafts]);

  const selectedPrompt = useMemo(() => {
    return promptLibrary.find((prompt) => prompt.id === selectedPromptId) ?? null;
  }, [promptLibrary, selectedPromptId]);

  const draftQueueCounts = useMemo(() => {
    return {
      all: drafts.length,
      draft: drafts.filter((draft) => draft.workflowStatus === "draft").length,
      ready: drafts.filter((draft) => draft.workflowStatus === "ready").length,
      approved: drafts.filter((draft) => draft.workflowStatus === "approved").length,
      scheduled: drafts.filter((draft) => draft.workflowStatus === "scheduled").length,
      published: drafts.filter((draft) => draft.status === "published").length,
      failed: drafts.filter((draft) => draft.status === "failed").length,
    };
  }, [drafts]);

  const queuedDrafts = useMemo(() => {
    const filtered =
      draftQueueFilter === "all"
        ? drafts
        : draftQueueFilter === "published" || draftQueueFilter === "failed"
          ? drafts.filter((draft) => draft.status === draftQueueFilter)
          : drafts.filter((draft) => draft.workflowStatus === draftQueueFilter);

    return filtered.slice(0, 10);
  }, [draftQueueFilter, drafts]);

  const activeDraft = useMemo(() => {
    return (
      composerDrafts.find((draft) => draft.id === activeDraftId) ??
      composerDrafts[0] ??
      null
    );
  }, [activeDraftId, composerDrafts]);

  const activeSavedDraft = useMemo(() => {
    if (!activeDraft?.contentId) return null;
    return drafts.find((draft) => draft.id === activeDraft.contentId) ?? null;
  }, [activeDraft?.contentId, drafts]);

  const activeValidationIssues = useMemo(() => {
    return validateContentDraft({
      title: activeDraft?.title || "",
      body: activeDraft?.body || "",
      platforms: selectedPlatforms,
    });
  }, [activeDraft?.body, activeDraft?.title, selectedPlatforms]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((current) =>
      current.includes(id)
        ? current.filter((platform) => platform !== id)
        : [...current, id],
    );
  };

  const updateDraft = (draftId: string, patch: Partial<ComposerDraft>) => {
    setComposerDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              ...patch,
              isDirty: patch.isDirty ?? true,
            }
          : draft,
      ),
    );
  };

  const addDraftTab = () => {
    setComposerDrafts((current) => {
      const next = [...current, createEmptyComposerDraft(current.length)];
      setActiveDraftId(next[next.length - 1].id);
      return next;
    });
  };

  const removeDraftTab = (draftId: string) => {
    setComposerDrafts((current) => {
      if (current.length === 1) {
        const [single] = current;
        return [{ ...single, title: "Post 1", body: "", contentId: undefined, isDirty: false }];
      }
      return current.filter((draft) => draft.id !== draftId);
    });
  };

  const closeAllDraftTabs = () => {
    const reset = createEmptyComposerDraft(0);
    setComposerDrafts([reset]);
    setActiveDraftId(reset.id);
    setSuccessMessage(null);
  };

  const saveActiveDraft = async () => {
    if (!user || !activeDraft) return;

    if (!activeDraft.title.trim() || !activeDraft.body.trim()) {
      setError("Add a title and body before saving the draft.");
      return;
    }

    setIsSavingDraft(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const contentId = await saveContentItem(user.uid, {
        id: activeDraft.contentId,
        title: activeDraft.title.trim(),
        body: activeDraft.body,
        platforms: selectedPlatforms,
        status: "draft",
        workflowStatus: validateContentDraft({
          title: activeDraft.title.trim(),
          body: activeDraft.body,
          platforms: selectedPlatforms,
        }).length
          ? "draft"
          : "ready",
        kind: "post_draft",
        sourcePromptId: selectedPromptId || "",
        inspirationId: inspiration?.id || "",
        sourceId: source?.id || "",
        remixMode,
        validationIssues: validateContentDraft({
          title: activeDraft.title.trim(),
          body: activeDraft.body,
          platforms: selectedPlatforms,
        }),
      });

      setComposerDrafts((current) =>
        current.map((draft) =>
          draft.id === activeDraft.id
            ? { ...draft, contentId, isDirty: false }
            : draft,
        ),
      );
      setSuccessMessage("Draft saved to your workspace.");
    } catch (err) {
      console.error("Failed to save draft", err);
      setError("We couldn't save that draft right now.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const generateDrafts = async () => {
    if (!user) return;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setError(
        "No Gemini API key found. Add VITE_GEMINI_API_KEY to your environment before generating drafts.",
      );
      return;
    }

    if (!brief.trim()) {
      setError("Add a post brief so the generator has something concrete to work from.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError("Choose at least one destination platform.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "You are a social media strategist.",
                  `Create ${variantCount} distinct post drafts as a JSON array.`,
                  "Each item must have exactly two string fields: title and body.",
                  `Destination platforms: ${selectedPlatforms.join(", ")}.`,
                  `Tone: ${tone}.`,
                  `Call to action: ${callToAction || "none"}.`,
                  `Remix mode: ${remixMode}.`,
                  includeReferences
                    ? "You may preserve helpful references from the source if they improve authenticity."
                    : "Do not mention the original creator or imply this is a remix of another post.",
                  selectedPrompt
                    ? `Prompt template to respect:\n${selectedPrompt.content}`
                    : "No saved prompt template selected.",
                  inspiration
                    ? `Inspiration example:\n${inspiration.content}\nWhy it works: ${inspiration.note || "No note provided."}\nTags: ${inspiration.tags.join(", ")}`
                    : "No inspiration item attached.",
                  source
                    ? `Source brief:\nSummary: ${source.analysisSummary || "No summary"}\nAudience: ${source.analysisAudience || "Not set"}\nHooks: ${(source.analysisHooks || []).join(" | ")}\nKey points: ${(source.analysisKeyPoints || []).join(" | ")}\nCTA ideas: ${(source.analysisCtaIdeas || []).join(" | ")}\nSource text: ${source.contentText || source.description}`
                    : "No structured source attached.",
                  `User brief:\n${brief}`,
                  "Do not wrap the response in explanations outside the JSON.",
                ].join("\n\n"),
              },
            ],
          },
        ],
      });

      const rawText = response.text || "[]";
      const parsed = JSON.parse(extractJson(rawText)) as GeneratedDraft[];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("The model returned an unexpected draft format.");
      }

      const savedDrafts = await Promise.all(
        parsed.map(async (draft, index) => {
          const title = draft.title?.trim() || `Draft ${index + 1}`;
          const body = draft.body?.trim() || "";
          const contentId = await saveContentItem(user.uid, {
            title,
            body,
            platforms: selectedPlatforms,
            status: "draft",
            workflowStatus: validateContentDraft({
              title,
              body,
              platforms: selectedPlatforms,
            }).length
              ? "draft"
              : "ready",
            kind: "post_draft",
            sourcePromptId: selectedPromptId || "",
            inspirationId: inspiration?.id || "",
            sourceId: source?.id || "",
            remixMode,
            validationIssues: validateContentDraft({
              title,
              body,
              platforms: selectedPlatforms,
            }),
          });

          return {
            id: `generated-tab-${contentId}`,
            title,
            body,
            contentId,
            isDirty: false,
          } satisfies ComposerDraft;
        }),
      );

      setComposerDrafts(savedDrafts);
      setActiveDraftId(savedDrafts[0]?.id ?? "");
      setSuccessMessage(`Saved ${savedDrafts.length} new draft${savedDrafts.length > 1 ? "s" : ""} to your workspace.`);
    } catch (err) {
      console.error("Failed to generate drafts", err);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't generate drafts right now.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusUpdate = async (
    contentId: string,
    status: "published" | "failed" | "draft",
  ) => {
    if (!user) return;
    try {
      await updateContentStatus(user.uid, contentId, status);
    } catch (err) {
      console.error("Failed to update content status", err);
      setError("We couldn't update that draft status.");
    }
  };

  const copyActiveDraft = async () => {
    if (!activeDraft?.body.trim()) return;
    await navigator.clipboard.writeText(activeDraft.body);
    setSuccessMessage("Current draft copied.");
  };

  const handleWorkflowStatusUpdate = async (
    contentId: string,
    workflowStatus: "draft" | "ready" | "approved",
  ) => {
    if (!user) return;
    try {
      await setContentWorkflowStatus(user.uid, contentId, workflowStatus);
      setSuccessMessage(`Draft moved to ${workflowStatus}.`);
      setError(null);
    } catch (err) {
      console.error("Failed to update workflow status", err);
      setError(
        err instanceof Error &&
          err.message.includes("content_not_ready_for_approval")
          ? "Fix validation issues before approving this draft."
          : "We couldn't update that workflow state.",
      );
    }
  };

  const handleActiveDraftWorkflowStatusUpdate = async (
    workflowStatus: "draft" | "ready" | "approved",
  ) => {
    if (!activeSavedDraft?.id) {
      setError("Save the active draft before changing its workflow state.");
      return;
    }
    await handleWorkflowStatusUpdate(activeSavedDraft.id, workflowStatus);
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] -m-10 overflow-hidden bg-[#f3f1ec] text-slate-900">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-black/6 bg-[#f8f6f2]">
        <div className="border-b border-black/6 px-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Remix Studio
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Sources
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIncludeReferences((current) => !current)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                includeReferences ? "bg-[#6f4bff]" : "bg-slate-300"
              }`}
              aria-pressed={includeReferences}
              aria-label="Toggle include references"
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition ${
                  includeReferences ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Choose inspiration first, then draft in the editor with that source
            attached.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Include references? {includeReferences ? "Yes" : "No"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            {inspiration ? (
              <div className="rounded-[28px] border border-black/6 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">
                      {inspiration.authorName}
                    </p>
                    <p className="text-sm text-slate-500">{inspiration.platform}</p>
                  </div>
                  <button
                    onClick={() => navigate("/dashboard/create")}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                    title="Remove source"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {inspiration.content}
                </p>

                {inspiration.note && (
                  <div className="mt-4 rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      Why It Works
                    </p>
                    <p className="mt-2 text-sm leading-6 text-emerald-950">
                      {inspiration.note}
                    </p>
                  </div>
                )}

                {inspiration.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {inspiration.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-5">
                <Lightbulb className="h-8 w-8 text-amber-500" />
                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                  No inspiration selected
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Pick something from the inspiration board and come back here to
                  turn it into a post.
                </p>
                <Link
                  to="/dashboard/inspiration"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6848e4]"
                >
                  Find inspiration
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {source ? (
              <div className="rounded-[28px] border border-black/6 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Source brief
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {source.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 capitalize">
                      {source.type} · {source.status || "raw"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {source.analysisSummary || source.description || "No summary yet."}
                </p>

                {source.analysisHooks && source.analysisHooks.length > 0 && (
                  <div className="mt-4 rounded-[22px] border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                      Hooks
                    </p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-950">
                      {source.analysisHooks.slice(0, 3).map((hook, index) => (
                        <li key={`${source.id}-hook-${index}`}>{hook}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            <Link
              to="/dashboard/inspiration"
              className="flex items-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Find inspiration
            </Link>

            <Link
              to="/dashboard/prompts"
              className="flex items-center gap-2 rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <BookmarkPlus className="h-4 w-4 text-[#6f4bff]" />
              Manage prompts
            </Link>

            <div className="rounded-[28px] border border-black/6 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Workflow Queue
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All"],
                    ["draft", "Draft"],
                    ["ready", "Ready"],
                    ["approved", "Approved"],
                    ["scheduled", "Scheduled"],
                    ["failed", "Failed"],
                  ] as Array<[DraftQueueFilter, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraftQueueFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                      draftQueueFilter === value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label} ({draftQueueCounts[value]})
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {queuedDrafts.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-500">
                    No drafts match this filter.
                  </p>
                ) : (
                  queuedDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="rounded-[22px] border border-slate-200 bg-[#faf8f3] px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                        {draft.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getWorkflowTone(draft.workflowStatus)}`}
                        >
                          {draft.workflowStatus || draft.status}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                          {draft.status}
                        </span>
                      </div>
                      {draft.validationIssues && draft.validationIssues.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-amber-700">
                          {draft.validationIssues.slice(0, 2).map((issue) => (
                            <li key={`${draft.id}-${issue}`}>{issue}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {draft.workflowStatus !== "ready" &&
                          draft.workflowStatus !== "approved" &&
                          draft.status === "draft" &&
                          draft.validationIssues?.length === 0 && (
                            <button
                              onClick={() =>
                                handleWorkflowStatusUpdate(draft.id, "ready")
                              }
                              className="text-xs font-semibold text-violet-700"
                            >
                              Mark ready
                            </button>
                          )}
                        {draft.workflowStatus === "ready" && (
                          <button
                            onClick={() =>
                              handleWorkflowStatusUpdate(draft.id, "approved")
                            }
                            className="text-xs font-semibold text-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                        {draft.workflowStatus === "approved" && (
                          <button
                            onClick={() =>
                              handleWorkflowStatusUpdate(draft.id, "draft")
                            }
                            className="text-xs font-semibold text-slate-700"
                          >
                            Send back to draft
                          </button>
                        )}
                        {draft.status !== "published" && (
                          <button
                            onClick={() => handleStatusUpdate(draft.id, "published")}
                            className="text-xs font-semibold text-emerald-700"
                          >
                            Publish
                          </button>
                        )}
                        {draft.status !== "failed" && (
                          <button
                            onClick={() => handleStatusUpdate(draft.id, "failed")}
                            className="text-xs font-semibold text-red-700"
                          >
                            Fail
                          </button>
                        )}
                        {draft.status !== "draft" && (
                          <button
                            onClick={() => handleStatusUpdate(draft.id, "draft")}
                            className="text-xs font-semibold text-blue-700"
                          >
                            Draft
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-black/6 bg-[#f6f3ec] px-6 py-4">
          {composerDrafts.map((draft, index) => {
            const isActive = draft.id === activeDraftId;

            return (
              <button
                key={draft.id}
                type="button"
                onClick={() => setActiveDraftId(draft.id)}
                className={`group inline-flex items-center gap-2 rounded-t-2xl border px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-black/10 bg-white text-slate-900"
                    : "border-transparent bg-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="max-w-[180px] truncate">
                  {draft.title || `Post ${index + 1}`}
                </span>
                {draft.isDirty && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                )}
                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    removeDraftTab(draft.id);
                  }}
                  className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  role="button"
                  tabIndex={0}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={addDraftTab}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add Post
          </button>

          <button
            type="button"
            onClick={closeAllDraftTabs}
            className="text-sm font-semibold text-red-600 transition hover:text-red-700"
          >
            Close All
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 rounded-[34px] border border-black/6 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
              <div className="border-b border-black/6 px-7 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Draft Canvas
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      Create post after choosing inspiration
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Edit the active post directly, save it as a workspace draft,
                      or generate multiple variations from the attached source.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getWorkflowTone(activeSavedDraft?.workflowStatus)}`}
                      >
                        {activeSavedDraft?.workflowStatus || "unsaved"}
                      </span>
                      {activeSavedDraft?.status && (
                        <span className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          content status: {activeSavedDraft.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={copyActiveDraft}
                      disabled={!activeDraft?.body.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={saveActiveDraft}
                      disabled={isSavingDraft || !activeDraft}
                      className="inline-flex items-center gap-2 rounded-2xl border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingDraft ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FilePenLine className="h-4 w-4" />
                      )}
                      Save Draft
                    </button>
                    {activeSavedDraft && activeSavedDraft.workflowStatus !== "ready" && activeSavedDraft.workflowStatus !== "approved" && activeValidationIssues.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handleActiveDraftWorkflowStatusUpdate("ready")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        Mark Ready
                      </button>
                    )}
                    {activeSavedDraft?.workflowStatus === "ready" && (
                      <button
                        type="button"
                        onClick={() => handleActiveDraftWorkflowStatusUpdate("approved")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Approve
                      </button>
                    )}
                    {activeSavedDraft?.workflowStatus === "approved" && (
                      <button
                        type="button"
                        onClick={() => handleActiveDraftWorkflowStatusUpdate("draft")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Send Back To Draft
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={generateDrafts}
                      disabled={isGenerating || isLoading}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#1f9f55] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#188248] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate Drafts
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {activeDraft ? (
                <div className="space-y-5 px-7 py-6">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Title
                    </span>
                    <input
                      value={activeDraft.title}
                      onChange={(e) =>
                        updateDraft(activeDraft.id, { title: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-[#faf8f3] px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-[#6f4bff]/15"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Post Body
                    </span>
                    <textarea
                      value={activeDraft.body}
                      onChange={(e) =>
                        updateDraft(activeDraft.id, { body: e.target.value })
                      }
                      placeholder="Write the post here or use Generate Drafts to create variations from your inspiration."
                      className="min-h-[520px] w-full resize-none rounded-[30px] border border-slate-200 bg-[#fffdf8] px-5 py-5 text-[18px] leading-9 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#6f4bff]/15"
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                    <div className="flex items-center gap-4">
                      <span>{activeDraft.body.length}/800 characters</span>
                      {activeDraft.contentId && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      {inspiration ? (
                        <span>
                          Connected to {inspiration.authorName} on {inspiration.platform}
                        </span>
                      ) : (
                        <span>No inspiration attached</span>
                      )}
                    </div>
                  </div>

                  {activeValidationIssues.length > 0 && (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                        Needs Fixes Before Approval
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">
                        {activeValidationIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-7 py-10 text-sm text-slate-500">
                  Add a post tab to begin writing.
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-[30px] border border-black/6 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Post Brief
                </p>
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="What should this post say, who is it for, and what action should it drive?"
                  className="mt-3 min-h-[180px] w-full rounded-[24px] border border-slate-200 bg-[#faf8f3] px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-[#6f4bff]/15"
                />
              </div>

              <div className="rounded-[30px] border border-black/6 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Prompt Template
                  </span>
                  <select
                    value={selectedPromptId}
                    onChange={(e) => setSelectedPromptId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#faf8f3] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-[#6f4bff]/15"
                    disabled={isLoading}
                  >
                    {promptLibrary.map((prompt) => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.title}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPrompt && (
                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-[#faf8f3] p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedPrompt.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedPrompt.description}
                    </p>
                    <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {selectedPrompt.content}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[30px] border border-black/6 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Remix Mode
                    </span>
                    <select
                      value={remixMode}
                      onChange={(e) => setRemixMode(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-[#faf8f3] px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-[#6f4bff]/15"
                    >
                      <option>Keep the angle, rewrite the structure</option>
                      <option>Keep the structure, change the angle</option>
                      <option>Make it more educational</option>
                      <option>Make it more contrarian</option>
                      <option>Turn it into a short thread</option>
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Tone
                    </span>
                    <input
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-[#faf8f3] px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-[#6f4bff]/15"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Call To Action
                    </span>
                    <input
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      placeholder="Reply, subscribe, book a demo..."
                      className="w-full rounded-2xl border border-slate-200 bg-[#faf8f3] px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-[#6f4bff]/15"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Variants
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={variantCount}
                      onChange={(e) => setVariantCount(Number(e.target.value))}
                    />
                    <span className="text-sm text-slate-500">
                      Generate {variantCount} draft{variantCount > 1 ? "s" : ""}
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded-[30px] border border-black/6 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Destination Platforms
                </p>
                <div className="mt-4 grid gap-3">
                  {PLATFORMS.map((platform) => {
                    const active = selectedPlatforms.includes(platform.id);
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => togglePlatform(platform.id)}
                        className={`flex items-center justify-between rounded-[22px] border px-4 py-3 text-left transition ${
                          active
                            ? "border-[#6f4bff]/25 bg-[#f5f1ff]"
                            : "border-slate-200 bg-[#faf8f3] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white ${platform.color}`}
                          >
                            <span className="text-sm font-bold">{platform.icon}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {platform.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {active ? "Included" : "Click to include"}
                            </p>
                          </div>
                        </div>
                        {active && <CheckCircle2 className="h-4 w-4 text-[#6f4bff]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[30px] border border-amber-100 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">
                  API requirement
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Draft generation uses Gemini directly from the client. Add
                  `VITE_GEMINI_API_KEY` to your environment before using it.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
