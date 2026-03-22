import React, { useState, useMemo } from 'react';
import { Search, Copy, Trash2, Plus, X, ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  type: string;
}

type SortField = 'title' | 'description' | 'content' | 'type';
type SortDirection = 'asc' | 'desc';

const INITIAL_PROMPTS: Prompt[] = [
  {
    id: '1',
    title: '3 Limiting Beliefs',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '2',
    title: '3 Listicles',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '3',
    title: '3 Surprising Misconceptions',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '4',
    title: '3 Tips',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '5',
    title: '5 Engaging Questions',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '6',
    title: '5 Lessons Learned',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '7',
    title: 'Brainstorm Tiktok IG Video Hooks',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '8',
    title: 'Extract Wisdom',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '9',
    title: 'Facebook (default)',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '10',
    title: 'Hormozi $100M Offer',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '11',
    title: 'Instagram (default)',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '12',
    title: 'Linkedin (default)',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '13',
    title: 'Misconception vs Reality',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '14',
    title: 'Problem-Agitate-Solve (PAS) framework',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  },
  {
    id: '15',
    title: 'SEO-Optimized Article Outline',
    description: 'Created by AIcontentStudio',
    content: 'Create a comprehensive SEO-optimized article outline and content plan:\nGenerate an extensive list of LSI and NLP keywords related to [TOPIC]. Include synonyms, related terms, and industry-specific jargon.',
    type: 'TEXT'
  },
  {
    id: '16',
    title: 'Structured bullet points',
    description: 'Created by AIcontentStudio',
    content: '# CONTEXT\nInfer the topic from the sources provided.\n# WRITING STYLE\nHere’s how you always write:\n<writing_style>\n- Your writing style is spartan and informative...',
    type: 'TEXT'
  }
];

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
    setEditingPrompt(prompt);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingPrompt({
      id: Date.now().toString(),
      title: '',
      description: '',
      content: '',
      type: 'Text'
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-3xl font-bold text-gray-900">My Prompts</h1>
        <button 
          onClick={handleNew}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Prompt
        </button>
      </div>
      
      <a href="#" className="text-blue-600 hover:underline text-sm mb-6 inline-block">
        How do I customize prompts for my voice?
      </a>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by any field" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-900 w-[20%]">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded"
                  onClick={() => handleSort('title')}
                >
                  Title <SortIcon field="title" />
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-gray-900 w-[20%]">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded"
                  onClick={() => handleSort('description')}
                >
                  Description <SortIcon field="description" />
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-gray-900 w-[40%]">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded"
                  onClick={() => handleSort('content')}
                >
                  Content <SortIcon field="content" />
                </div>
              </th>
              <th className="px-4 py-3 font-medium text-gray-900 w-[10%]">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded"
                  onClick={() => handleSort('type')}
                >
                  Type <SortIcon field="type" />
                </div>
              </th>
              <th className="px-4 py-3 w-[10%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedPrompts.map((prompt) => (
              <tr key={prompt.id} className="hover:bg-gray-50 group cursor-pointer" onClick={() => handleEdit(prompt)}>
                <td className="px-4 py-3 text-gray-900 truncate max-w-0">{prompt.title}</td>
                <td className="px-4 py-3 text-gray-900 truncate max-w-0">{prompt.description}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-0">{prompt.content}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-fuchsia-100 text-fuchsia-700 uppercase tracking-wide">
                    {prompt.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleDuplicate(prompt)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Duplicate
                    </button>
                    <button 
                      onClick={() => handleDelete(prompt.id)}
                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Edit prompt</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
                <input 
                  type="text" 
                  value={editingPrompt.title}
                  onChange={(e) => setEditingPrompt({...editingPrompt, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <input 
                  type="text" 
                  value={editingPrompt.description}
                  onChange={(e) => setEditingPrompt({...editingPrompt, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Type</label>
                <div className="relative">
                  <select 
                    value={editingPrompt.type}
                    onChange={(e) => setEditingPrompt({...editingPrompt, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    <option value="Text">Text</option>
                    <option value="Image">Image</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-900 mb-1">Prompt</label>
                <textarea 
                  value={editingPrompt.content}
                  onChange={(e) => setEditingPrompt({...editingPrompt, content: e.target.value})}
                  className="w-full flex-1 min-h-[300px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y font-mono"
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
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
