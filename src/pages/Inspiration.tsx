import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  LayoutTemplate,
  Shuffle,
  Plus,
  X,
  Trash2,
  PencilLine,
  Loader2,
  Lightbulb,
  Eye,
  Image as ImageIcon,
  Video,
  Quote,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFirebase } from "../contexts/FirebaseContext";
import {
  deleteInspiration,
  ensureWorkspaceSeedData,
  saveInspiration,
  subscribeToInspiration,
  type InspirationRecord,
} from "../lib/firestore";

type EditableInspiration = Omit<
  InspirationRecord,
  "createdAt" | "updatedAt" | "tags"
> & {
  tags: string;
};

const emptyInspiration: EditableInspiration = {
  id: "",
  authorName: "",
  authorAvatar: "",
  content: "",
  platform: "LinkedIn",
  mediaType: "none",
  mediaUrl: "",
  note: "",
  tags: "",
};

const mediaTypeOptions = [
  { value: "all", label: "All media" },
  { value: "none", label: "Text" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
] as const;

function shuffleRecords(records: InspirationRecord[]) {
  const next = [...records];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getPlatformPalette(platform: string) {
  const key = platform.trim().toLowerCase();
  if (key.includes("linkedin")) {
    return {
      badge: "bg-sky-100 text-sky-700 border-sky-200",
      accent: "from-sky-500/15 via-white to-white",
      ring: "ring-sky-200",
    };
  }
  if (key.includes("x") || key.includes("twitter")) {
    return {
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      accent: "from-slate-400/12 via-white to-white",
      ring: "ring-slate-200",
    };
  }
  if (key.includes("instagram")) {
    return {
      badge: "bg-pink-100 text-pink-700 border-pink-200",
      accent: "from-pink-400/15 via-white to-white",
      ring: "ring-pink-200",
    };
  }
  return {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    accent: "from-emerald-400/15 via-white to-white",
    ring: "ring-emerald-200",
  };
}

function formatRelativeDensity(count: number) {
  if (count >= 12) return "deep swipe file";
  if (count >= 5) return "healthy collection";
  if (count >= 1) return "early collection";
  return "empty collection";
}

export default function Inspiration() {
  const { user, isAuthReady } = useFirebase();
  const navigate = useNavigate();
  const [records, setRecords] = useState<InspirationRecord[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableInspiration | null>(
    null,
  );

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady) {
        setRecords([]);
        setDisplayOrder([]);
        setSelectedRecordId("");
        setIsLoading(false);
      }
      return;
    }

    let isMounted = true;
    let unsubscribe = () => {};

    setIsLoading(true);
    setError(null);

    ensureWorkspaceSeedData(user.uid)
      .then(() => {
        if (!isMounted) return;
        unsubscribe = subscribeToInspiration(user.uid, (items) => {
          if (!isMounted) return;
          setRecords(items);
          setDisplayOrder((current) => {
            if (current.length === items.length) {
              const known = new Set(items.map((item) => item.id));
              const filtered = current.filter((id) => known.has(id));
              if (filtered.length === items.length) return filtered;
            }
            return items.map((item) => item.id);
          });
          setIsLoading(false);
        });
      })
      .catch((err) => {
        console.error("Failed to load inspiration", err);
        if (isMounted) {
          setError("We couldn't load your inspiration library right now.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isAuthReady, user]);

  const orderedRecords = useMemo(() => {
    const map = new Map(records.map((record) => [record.id, record]));
    const ordered = displayOrder
      .map((id) => map.get(id))
      .filter((record): record is InspirationRecord => Boolean(record));
    const missing = records.filter((record) => !displayOrder.includes(record.id));
    return [...ordered, ...missing];
  }, [displayOrder, records]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orderedRecords.filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.authorName,
          record.content,
          record.note,
          record.platform,
          record.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesPlatform =
        platformFilter === "all" ||
        record.platform.toLowerCase() === platformFilter.toLowerCase();
      const matchesMedia =
        mediaTypeFilter === "all" || record.mediaType === mediaTypeFilter;
      return matchesSearch && matchesPlatform && matchesMedia;
    });
  }, [mediaTypeFilter, orderedRecords, platformFilter, searchQuery]);

  const availablePlatforms = useMemo(() => {
    return Array.from(new Set(records.map((record) => record.platform))).sort();
  }, [records]);

  const availableTags = useMemo(() => {
    return Array.from(new Set(records.flatMap((record) => record.tags)))
      .filter(Boolean)
      .sort()
      .slice(0, 12);
  }, [records]);

  const selectedRecord = useMemo(() => {
    return (
      filteredRecords.find((record) => record.id === selectedRecordId) ??
      filteredRecords[0] ??
      null
    );
  }, [filteredRecords, selectedRecordId]);

  useEffect(() => {
    if (!filteredRecords.length) {
      setSelectedRecordId("");
      return;
    }

    if (!filteredRecords.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedRecordId]);

  const openNewModal = () => {
    setEditingRecord({ ...emptyInspiration });
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = (record: InspirationRecord) => {
    setEditingRecord({
      id: record.id,
      authorName: record.authorName,
      authorAvatar: record.authorAvatar,
      content: record.content,
      platform: record.platform,
      mediaType: record.mediaType,
      mediaUrl: record.mediaUrl,
      note: record.note,
      tags: record.tags.join(", "),
    });
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSave = async () => {
    if (!user || !editingRecord) return;

    if (!editingRecord.authorName.trim() || !editingRecord.content.trim()) {
      setError("Author name and post content are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await saveInspiration(user.uid, {
        id: editingRecord.id || undefined,
        authorName: editingRecord.authorName,
        authorAvatar: editingRecord.authorAvatar,
        content: editingRecord.content,
        platform: editingRecord.platform,
        mediaType: editingRecord.mediaType,
        mediaUrl: editingRecord.mediaUrl,
        note: editingRecord.note,
        tags: editingRecord.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      closeModal();
    } catch (err) {
      console.error("Failed to save inspiration", err);
      setError("We couldn't save this inspiration item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteInspiration(user.uid, id);
    } catch (err) {
      console.error("Failed to delete inspiration", err);
      setError("We couldn't delete that inspiration item.");
    }
  };

  const handleShuffle = () => {
    setDisplayOrder(shuffleRecords(filteredRecords).map((record) => record.id));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setPlatformFilter("all");
    setMediaTypeFilter("all");
    setDisplayOrder(records.map((record) => record.id));
  };

  const openComposer = (recordId?: string) => {
    const targetId = recordId ?? selectedRecord?.id;
    if (!targetId) return;
    navigate(`/dashboard/create?inspiration=${encodeURIComponent(targetId)}`);
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] -m-10 overflow-hidden bg-[#f3f1ec] text-slate-900">
      {showFilters && (
        <aside className="w-[320px] shrink-0 border-r border-black/5 bg-[#f7f6f2]">
          <div className="flex h-full flex-col overflow-y-auto">
            <div className="border-b border-black/6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Swipe File
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    Filters
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Find the post worth remixing, then send it straight into the
                    composer.
                  </p>
                </div>
                <button
                  className="rounded-full bg-white p-2 text-slate-500 shadow-sm ring-1 ring-black/5 transition hover:text-slate-900"
                  onClick={() => setShowFilters(false)}
                  aria-label="Hide filters"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={openNewModal}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f9f55] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#188248]"
              >
                <Plus className="h-4 w-4" />
                Add inspiration
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-[26px] border border-black/5 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search posts, creators, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#faf9f6] py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-[#2bb34f]/15"
                  />
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Platform
                    </span>
                    <div className="relative">
                      <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                      >
                        <option value="all">All platforms</option>
                        {availablePlatforms.map((platform) => (
                          <option key={platform} value={platform}>
                            {platform}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Media Type
                    </span>
                    <div className="relative">
                      <select
                        value={mediaTypeFilter}
                        onChange={(e) => setMediaTypeFilter(e.target.value)}
                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                      >
                        {mediaTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </label>
                </div>
              </div>

              <div className="rounded-[26px] border border-black/5 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Quick Tags
                  </p>
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-[#6848e4] transition hover:text-[#5334c7]"
                  >
                    Reset
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableTags.length === 0 ? (
                    <p className="text-sm text-slate-500">No tags saved yet.</p>
                  ) : (
                    availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSearchQuery(tag)}
                        className="rounded-full border border-slate-200 bg-[#faf9f6] px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                      >
                        #{tag}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#d7ead9] bg-[#edf7ef] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3a7046]">
                  Selected Inspiration
                </p>
                {selectedRecord ? (
                  <>
                    <div className="mt-4 flex items-center gap-3">
                      {selectedRecord.authorAvatar ? (
                        <img
                          src={selectedRecord.authorAvatar}
                          alt={selectedRecord.authorName}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
                          {selectedRecord.authorName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">
                          {selectedRecord.authorName}
                        </p>
                        <p className="text-sm text-slate-600">
                          {selectedRecord.platform}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-5 text-sm leading-6 text-slate-700">
                      {selectedRecord.content}
                    </p>
                    <button
                      onClick={() => openComposer(selectedRecord.id)}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Create Post
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Pick a card from the board to prep it for remixing.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-black/5 bg-[#f4f1ea]/90 px-6 py-5 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {!showFilters && (
                <button
                  onClick={() => setShowFilters(true)}
                  className="mt-1 rounded-full bg-white p-2 text-slate-500 shadow-sm ring-1 ring-black/5 transition hover:text-slate-900"
                  aria-label="Show filters"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Inspiration Board
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                  Choose the post, then remix it into your own.
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Curate the patterns you want to steal structure from, then move
                  straight into the composer with the selected inspiration already
                  attached.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-black/5 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
                {filteredRecords.length} results, {formatRelativeDensity(records.length)}
              </div>
              <button
                onClick={handleShuffle}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-black/12 hover:bg-slate-50"
              >
                <Shuffle className="h-4 w-4" />
                Shuffle
              </button>
              <button
                onClick={() => openComposer()}
                disabled={!selectedRecord}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1f9f55] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#188248] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                Create post
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-500">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#1f9f55]" />
              Loading your inspiration library...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white/70 px-6 text-center">
              <Lightbulb className="mb-3 h-10 w-10 text-slate-300" />
              <h2 className="text-lg font-semibold text-slate-900">
                No inspiration items match your filters
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Reset the filters or save a new example you want to remix later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
              {filteredRecords.map((record) => {
                const palette = getPlatformPalette(record.platform);
                const isSelected = selectedRecord?.id === record.id;

                return (
                  <article
                    key={record.id}
                    className={`group relative flex min-h-[420px] flex-col overflow-hidden rounded-[30px] border bg-[linear-gradient(180deg,#ffffff_0%,#fcfbf7_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1.5 hover:shadow-[0_28px_80px_rgba(15,23,42,0.1)] ${
                      isSelected
                        ? `border-slate-900/70 ring-4 ${palette.ring}`
                        : "border-black/6 hover:border-black/10"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedRecordId(record.id)}
                      className="absolute inset-0 z-0"
                      aria-label={`Select inspiration from ${record.authorName}`}
                    />

                    <div
                      className={`relative z-10 bg-gradient-to-b px-5 pb-5 pt-5 ${palette.accent}`}
                    >
                      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {record.authorAvatar ? (
                            <img
                              src={record.authorAvatar}
                              alt={record.authorName}
                              className="h-11 w-11 rounded-full object-cover ring-1 ring-black/5"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                              {record.authorName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {record.authorName}
                            </p>
                            <p className="text-sm text-slate-500">
                              {record.platform}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${palette.badge}`}
                        >
                          {record.mediaType}
                        </span>
                      </div>

                      <p className="mt-5 line-clamp-6 whitespace-pre-wrap text-[17px] leading-8 tracking-[-0.01em] text-slate-800">
                        {record.content}
                      </p>
                    </div>

                    <div className="relative z-10 flex flex-1 flex-col px-5 pb-5">
                      {record.mediaType === "image" && record.mediaUrl ? (
                        <div className="overflow-hidden rounded-[24px] border border-black/6 bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                          <img
                            src={record.mediaUrl}
                            alt=""
                            className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                      ) : record.mediaType === "video" ? (
                        <div className="flex h-44 items-center justify-center rounded-[24px] border border-black/6 bg-[radial-gradient(circle_at_top,#334155_0%,#0f172a_62%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <div className="text-center">
                            <Video className="mx-auto h-8 w-8 opacity-80" />
                            <p className="mt-3 text-sm font-medium tracking-[0.08em] text-white/80 uppercase">
                              Video reference
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[24px] border border-black/6 bg-[#f8f4ec] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                          <div className="flex items-center justify-between text-slate-400">
                            <Quote className="h-5 w-5" />
                            <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 ring-1 ring-black/5">
                              Text pattern
                            </span>
                          </div>
                          <p className="mt-4 text-sm leading-7 text-slate-700">
                            {record.note ||
                              "Text-only inspiration. Great for structure, hook rhythm, and angle."}
                          </p>
                        </div>
                      )}

                      {record.note && record.mediaType !== "none" && (
                        <div className="mt-4 rounded-[22px] border border-emerald-100/80 bg-emerald-50/80 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                            Why it works
                          </p>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-emerald-950/90">
                            {record.note}
                          </p>
                        </div>
                      )}

                      {record.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {record.tags.map((tag) => (
                            <span
                              key={`${record.id}-${tag}`}
                              className="rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto pt-5">
                        <div className="mb-4 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openComposer(record.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#6f4bff]/10 px-3.5 py-2 text-xs font-semibold text-[#694ae0] transition hover:bg-[#6f4bff]/15"
                            >
                              <LayoutTemplate className="h-3.5 w-3.5" />
                              Remix
                            </button>
                            <button
                              onClick={() => setSelectedRecordId(record.id)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                                isSelected
                                  ? "border-sky-200 bg-sky-50 text-sky-700"
                                  : "border-black/8 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {isSelected ? "Selected" : "Preview"}
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(record)}
                              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                              title="Edit"
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/28 to-transparent" />
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {isModalOpen && editingRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={closeModal}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRecord.id ? "Edit Inspiration" : "Add Inspiration"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-800">
                    Creator / Source
                  </span>
                  <input
                    type="text"
                    value={editingRecord.authorName}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        authorName: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-800">
                    Platform
                  </span>
                  <input
                    type="text"
                    value={editingRecord.platform}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        platform: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                  />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-800">
                  Avatar URL
                </span>
                <input
                  type="text"
                  value={editingRecord.authorAvatar}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      authorAvatar: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-800">
                  Media type
                </span>
                <select
                  value={editingRecord.mediaType}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      mediaType: e.target.value as EditableInspiration["mediaType"],
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                >
                  <option value="none">Text only</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-800">
                  Media URL
                </span>
                <input
                  type="text"
                  value={editingRecord.mediaUrl}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      mediaUrl: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-800">
                  Post content
                </span>
                <textarea
                  value={editingRecord.content}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      content: e.target.value,
                    })
                  }
                  rows={7}
                  className="w-full rounded-[24px] border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-800">
                  Why it works
                </span>
                <textarea
                  value={editingRecord.note}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      note: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full rounded-[24px] border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-800">
                  Tags
                </span>
                <input
                  type="text"
                  value={editingRecord.tags}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      tags: e.target.value,
                    })
                  }
                  placeholder="hook, founder, proof"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-[#2bb34f]/15"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                onClick={closeModal}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1f9f55] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#188248] disabled:opacity-70"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save inspiration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
