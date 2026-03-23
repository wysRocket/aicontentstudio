import React, { useState, useMemo } from 'react';
import { Search, Copy, Trash2, Plus, X, ChevronDown, ChevronsUpDown, ChevronUp, BookOpen } from 'lucide-react';
import promptsData from '../prompts_data.json';

interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  type: string;
}

type SortField = 'title' | 'description' | 'content' | 'type';
type SortDirection = 'asc' | 'desc';

const INITIAL_PROMPTS: Prompt[] = promptsData as Prompt[];

export default function Prompts() {
  const [prompts, setPrompts] = useState<Prompt[]>(INITIAL_PROMPTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredPrompts = useMemo(() => {
    return prompts.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [prompts, searchQuery]);

  const sortedPrompts = useMemo(() => {
    return [...filteredPrompts].sort((a, b) => {
      const aValue = a[sortField].toLowerCase();
      const bValue = b[sortField].toLowerCase();
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPrompts, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt({ ...prompt });
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingPrompt({
      id: Date.now().toString(),
      title: '',
      description: '',
      content: '',
      type: 'TEXT'
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingPrompt) {
      const exists = prompts.find(p => p.id === editingPrompt.id);
      if (exists) {
        setPrompts(prompts.map(p => p.id === editingPrompt.id ? editingPrompt : p));
      } else {
        setPrompts([editingPrompt, ...prompts]);
      }
    }
    setIsModalOpen(false);
    setEditingPrompt(null);
  };

  const handleDelete = (id: string) => {
    setPrompts(prompts.filter(p => p.id !== id));
  };

  const handleDuplicate = (prompt: Prompt) => {
    const newPrompt = { ...prompt, id: Date.now().toString(), title: `${prompt.title} (Copy)` };
    setPrompts([newPrompt, ...prompts]);
  };

  const handleCopyContent = (content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 text-violet-600" /> : <ChevronDown className="w-4 h-4 text-violet-600" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Prompts</h1>
          <span className="text-sm text-gray-400 font-medium">{prompts.length} prompts</span>
        </div>
        <button
          onClick={handleNew}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Prompt
        </button>
      </div>

      <a href="#" className="text-violet-600 hover:underline text-sm mb-6 inline-block">
        How do I customize prompts for my voice?
      </a>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search prompts by title, description, or content…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700 w-[22%]">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-violet-600 transition-colors select-none"
                  onClick={() => handleSort('title')}
                >
                  Title <SortIcon field="title" />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 w-[18%]">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-violet-600 transition-colors select-none"
                  onClick={() => handleSort('description')}
                >
                  Source <SortIcon field="description" />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 w-[44%]">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-violet-600 transition-colors select-none"
                  onClick={() => handleSort('content')}
                >
                  Content Preview <SortIcon field="content" />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700 w-[8%]">Type</th>
              <th className="px-4 py-3 w-[8%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedPrompts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No prompts found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
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
                    <span className="font-medium text-gray-900 line-clamp-2">{prompt.title}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{prompt.description}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <span className="line-clamp-2 leading-relaxed">{prompt.content}</span>
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
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(prompt); }}
                        title="Duplicate"
                        className="p-1.5 bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(prompt.id); }}
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

      {/* Footer count */}
      {searchQuery && (
        <p className="text-sm text-gray-400 mt-3 text-center">
          Showing {sortedPrompts.length} of {prompts.length} prompts
        </p>
      )}

      {/* Edit / New Modal */}
      {isModalOpen && editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {prompts.find(p => p.id === editingPrompt.id) ? 'Edit Prompt' : 'New Prompt'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">Title</label>
                <input
                  type="text"
                  value={editingPrompt.title}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, title: e.target.value })}
                  placeholder="Enter prompt title…"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">Description / Source</label>
                <input
                  type="text"
                  value={editingPrompt.description}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                  placeholder="e.g. Created by AIcontentStudio"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">Type</label>
                <div className="relative">
                  <select
                    value={editingPrompt.type}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, type: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-800">Prompt Content</label>
                  <button
                    onClick={() => navigator.clipboard.writeText(editingPrompt.content)}
                    className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <textarea
                  value={editingPrompt.content}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                  placeholder="Enter your prompt here…"
                  className="w-full min-h-[320px] px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y font-mono leading-relaxed bg-gray-50"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm"
              >
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
