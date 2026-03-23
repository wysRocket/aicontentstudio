import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Copy,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  BookOpen,
  Loader2,
} from "lucide-react";
import { useFirebase } from "../contexts/FirebaseContext";
import {
  deletePrompt,
  ensureWorkspaceSeedData,
  restoreDefaultPromptLibrary,
  savePrompt,
  subscribeToPrompts,
  type PromptRecord,
  type PromptType,
} from "../lib/firestore";

type SortField = "title" | "description" | "content" | "type";
type SortDirection = "asc" | "desc";
type EditablePrompt = Omit<PromptRecord, "createdAt" | "updatedAt">;

const emptyPrompt: EditablePrompt = {
  id: "",
  title: "",
  description: "",
  content: "",
  type: "TEXT",
};

export default function Prompts() {
  const { user, isAuthReady } = useFirebase();
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<EditablePrompt | null>(null);
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) {
      if (isAuthReady) {
        setPrompts([]);
        setIsLoading(false);
      }
      return;
    }

    let isMounted = true;
    let cleanup = () => {};
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    ensureWorkspaceSeedData(user.uid)
      .then(() => {
        if (!isMounted) return;
        cleanup = subscribeToPrompts(user.uid, (records) => {
          if (!isMounted) return;
          setPrompts(records);
          setIsLoading(false);
        });
      })
      .catch((err) => {
        console.error("Failed to load prompts", err);
        if (isMounted) {
          setError("We couldn't load your prompt library right now.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [isAuthReady, user]);

  const filteredPrompts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return prompts;

    return prompts.filter((prompt) =>
      [prompt.title, prompt.description, prompt.content, prompt.type]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [prompts, searchQuery]);

  const sortedPrompts = useMemo(() => {
    return [...filteredPrompts].sort((a, b) => {
      const aValue = a[sortField].toLowerCase();
      const bValue = b[sortField].toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredPrompts, sortDirection, sortField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  };

  const handleEdit = (prompt: PromptRecord) => {
    setEditingPrompt({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      type: prompt.type,
    });
    setIsModalOpen(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleNew = () => {
    setEditingPrompt({ ...emptyPrompt });
    setIsModalOpen(true);
    setError(null);
    setSuccessMessage(null);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingPrompt(null);
  };

  const handleSave = async () => {
    if (!user || !editingPrompt) return;

    if (!editingPrompt.title.trim() || !editingPrompt.content.trim()) {
      setError("Title and prompt content are required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await savePrompt(user.uid, {
        id: editingPrompt.id || undefined,
        title: editingPrompt.title,
        description: editingPrompt.description,
        content: editingPrompt.content,
        type: editingPrompt.type as PromptType,
      });
      setSuccessMessage(
        editingPrompt.id ? "Prompt updated." : "Prompt saved to your library.",
      );
      closeModal();
    } catch (err) {
      console.error("Failed to save prompt", err);
      setError("We couldn't save this prompt. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deletePrompt(user.uid, id);
      setSuccessMessage("Prompt deleted.");
    } catch (err) {
      console.error("Failed to delete prompt", err);
      setError("We couldn't delete that prompt.");
    }
  };

  const handleDuplicate = async (prompt: PromptRecord) => {
    if (!user) return;
    try {
      await savePrompt(user.uid, {
        title: `${prompt.title} (Copy)`,
        description: prompt.description,
        content: prompt.content,
        type: prompt.type,
      });
      setSuccessMessage("Prompt duplicated.");
    } catch (err) {
      console.error("Failed to duplicate prompt", err);
      setError("We couldn't duplicate that prompt.");
    }
  };

  const handleCopyContent = async (
    content: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setSuccessMessage("Prompt copied.");
  };

  const handleRestoreLibrary = async () => {
    if (!user) return;
    setIsRestoring(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const restoredCount = await restoreDefaultPromptLibrary(user.uid);
      setSuccessMessage(
        restoredCount > 0
          ? `Restored ${restoredCount} default prompts.`
          : "Your default prompt library is already fully restored.",
      );
    } catch (err) {
      console.error("Failed to restore default library", err);
      setError("We couldn't restore the default prompt library.");
    } finally {
      setIsRestoring(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 text-violet-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-violet-600" />
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Prompts</h1>
            <span className="text-sm font-medium text-gray-400">
              {prompts.length} prompts
            </span>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          New Prompt
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a href="#" className="text-violet-600 hover:underline text-sm inline-block">
          How do I customize prompts for my voice?
        </a>
        <button
          onClick={handleRestoreLibrary}
          disabled={isRestoring}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-70"
        >
          {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Restore Default Library
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search prompts by title, description, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4 md:hidden">
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-500 shadow-sm">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-violet-500" />
            Loading your prompt library...
          </div>
        ) : sortedPrompts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-400 shadow-sm">
            <Search className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="font-medium">No prompts found</p>
            <p className="mt-1 text-sm">Try a different search term or add a new prompt.</p>
          </div>
        ) : (
          sortedPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900">{prompt.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{prompt.description}</p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-fuchsia-700">
                  {prompt.type}
                </span>
              </div>
              <p className="mt-3 line-clamp-5 text-sm leading-6 text-gray-600">
                {prompt.content}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={(e) => handleCopyContent(prompt.content, e)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  onClick={() => handleDuplicate(prompt)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <Plus className="h-4 w-4" />
                  Duplicate
                </button>
                <button
                  onClick={() => handleEdit(prompt)}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(prompt.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700 w-[22%]">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-violet-600 transition-colors select-none"
                  onClick={() => handleSort("title")}
                >
                  Title <SortIcon field="title" />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 w-[18%]">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-violet-600 transition-colors select-none"
                  onClick={() => handleSort("description")}
                >
                  Source <SortIcon field="description" />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 w-[44%]">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-violet-600 transition-colors select-none"
                  onClick={() => handleSort("content")}
                >
                  Content Preview <SortIcon field="content" />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 w-[8%]">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-violet-600 transition-colors select-none"
                  onClick={() => handleSort("type")}
                >
                  Type <SortIcon field="type" />
                </div>
              </th>
              <th className="px-4 py-3 w-[8%]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-violet-500" />
                  Loading your prompt library...
                </td>
              </tr>
            ) : sortedPrompts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No prompts found</p>
                  <p className="text-sm mt-1">
                    Try a different search term or add a new prompt.
                  </p>
                </td>
              </tr>
            ) : (
              sortedPrompts.map((prompt) => (
                <tr
                  key={prompt.id}
                  className="hover:bg-violet-50/40 group cursor-pointer transition-colors"
                  onClick={() => handleEdit(prompt)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 line-clamp-2">
                      {prompt.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {prompt.description}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <span className="line-clamp-2 leading-relaxed">
                      {prompt.content}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-fuchsia-100 text-fuchsia-700 uppercase tracking-wide">
                      {prompt.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleCopyContent(prompt.content, e)}
                        title="Copy content"
                        className="p-1.5 bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700 rounded-lg transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(prompt)}
                        title="Duplicate"
                        className="p-1.5 bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        title="Delete"
                        className="p-1.5 bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {searchQuery && (
        <p className="text-sm text-gray-400 mt-3 text-center">
          Showing {sortedPrompts.length} of {prompts.length} prompts
        </p>
      )}

      {isModalOpen && editingPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingPrompt.id ? "Edit Prompt" : "New Prompt"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={editingPrompt.title}
                  onChange={(e) =>
                    setEditingPrompt({ ...editingPrompt, title: e.target.value })
                  }
                  placeholder="Enter prompt title..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Description / Source
                </label>
                <input
                  type="text"
                  value={editingPrompt.description}
                  onChange={(e) =>
                    setEditingPrompt({
                      ...editingPrompt,
                      description: e.target.value,
                    })
                  }
                  placeholder="e.g. Product launch library"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Type
                </label>
                <div className="relative">
                  <select
                    value={editingPrompt.type}
                    onChange={(e) =>
                      setEditingPrompt({
                        ...editingPrompt,
                        type: e.target.value as PromptType,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-800">
                    Prompt Content
                  </label>
                  <button
                    onClick={() => navigator.clipboard.writeText(editingPrompt.content)}
                    className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <textarea
                  value={editingPrompt.content}
                  onChange={(e) =>
                    setEditingPrompt({
                      ...editingPrompt,
                      content: e.target.value,
                    })
                  }
                  placeholder="Enter your prompt here..."
                  className="w-full min-h-[320px] px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y font-mono leading-relaxed bg-gray-50"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-70"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Prompt"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
