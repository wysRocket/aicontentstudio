import React, { useState } from 'react';
import { Plus, Trash2, Lightbulb, Send, Copy, Calendar } from 'lucide-react';

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter', icon: '𝕏', color: 'text-black' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'text-pink-500' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: 'text-blue-600' },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: 'text-blue-500' },
  { id: 'pinterest', name: 'Pinterest', icon: 'P', color: 'text-red-600' },
  { id: 'tiktok', name: 'Tiktok', icon: '♪', color: 'text-black' },
  { id: 'threads', name: 'Threads', icon: '@', color: 'text-black' },
  { id: 'bluesky', name: 'Bluesky', icon: '🦋', color: 'text-blue-400' },
  { id: 'youtube', name: 'YouTube', icon: '▶', color: 'text-red-600' },
  { id: 'blog', name: 'Blog', icon: '🌐', color: 'text-teal-500' },
];

export default function CreatePost() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] -m-10">
      {/* Secondary Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white p-4 flex flex-col">
        <button className="flex items-center justify-center w-full py-2 text-purple-600 font-medium hover:bg-purple-50 rounded-lg transition-colors mb-4">
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </button>
        <button className="flex items-center w-full py-2 px-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Lightbulb className="w-4 h-4 mr-3 text-yellow-500" />
          Find Inspiration
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex items-center space-x-4 mb-8">
            <button className="flex items-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
              <Plus className="w-4 h-4 mr-2" />
              Add Post
            </button>
            <button className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-4 h-4 mr-2" />
              Close All
            </button>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-lg text-gray-900 mb-6">
              Select platforms and specify number of posts to generate. You can generate up to 5 posts at a time.
            </h2>

            <div className="space-y-4 mb-8">
              {PLATFORMS.map((platform) => (
                <label key={platform.id} className="flex items-center cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                    selectedPlatforms.includes(platform.id) 
                      ? 'border-purple-600 bg-purple-600' 
                      : 'border-purple-300 group-hover:border-purple-400'
                  }`}>
                    {selectedPlatforms.includes(platform.id) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-gray-50 border border-gray-100 ${platform.color}`}>
                    <span className="font-bold text-sm">{platform.icon}</span>
                  </div>
                  <span className="text-gray-700 font-medium">{platform.name}</span>
                </label>
              ))}
            </div>

            <button className="flex items-center px-6 py-2.5 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Post
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="p-4 border-t border-gray-200 bg-white flex space-x-4">
          <button className="flex items-center px-4 py-2 text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
            <Send className="w-4 h-4 mr-2" />
            Schedule
          </button>
          <button className="flex items-center px-4 py-2 text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
            <Copy className="w-4 h-4 mr-2" />
            Clone
          </button>
        </div>
      </div>
    </div>
  );
}

function Sparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
