import React, { useState } from 'react';
import { X, LayoutTemplate, Sparkles, Calendar, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TEMPLATES = [
  {
    id: 'video-gen',
    title: 'AI Agent Visual Generator',
    description: 'Make on-brand visuals with our AI Agent',
    isCustom: true,
  },
  {
    id: 2,
    title: 'AI Video with AI Voice',
    description: 'AI Video with AI Voice',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2574&auto=format&fit=crop',
    stats: { views: '8.9M', likes: '1000.0M' },
    isNew: true,
    isTrending: true,
  },
  {
    id: 3,
    title: 'Image Slideshow with Prominent Text',
    description: 'Image Slideshow with Prominent Text',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2000&auto=format&fit=crop',
    stats: { views: '3.2M', likes: '3.8K' },
    isNew: false,
    isTrending: false,
  },
  {
    id: 4,
    title: 'Tweet Card Carousel with Minimal Style',
    description: 'Twitter/X style quote cards with minimal style',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2000&auto=format&fit=crop',
    stats: { views: '433.2K', likes: '34.7K' },
    isNew: false,
    isTrending: false,
  },
  {
    id: 5,
    title: 'STUNNING VIRAL AI TECHNOLOGY',
    description: 'Make on-brand visuals with our AI Agent',
    image: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2000&auto=format&fit=crop',
    stats: { views: '11.2K', likes: '1.3K' },
    isNew: false,
    isTrending: false,
  },
  {
    id: 6,
    title: 'HOW TO RUN A DIGITAL MARKETING AGENCY',
    description: 'Learn more at our site - book a consult',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2000&auto=format&fit=crop',
    stats: { views: '1.1M', likes: '1.2K' },
    isNew: false,
    isTrending: false,
  },
  {
    id: 7,
    title: 'GET CLEAR GOALS',
    description: 'START YOUR FIRST AUTOMATION TODAY - TEST, MEASURE, IMPROVE',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2000&auto=format&fit=crop',
    stats: { views: '1.1M', likes: '1.2K' },
    isNew: false,
    isTrending: false,
  },
  {
    id: 8,
    title: 'PSYCHOLOGY OF WINNING',
    description: 'TRAIL MARKER GUIDE',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2000&auto=format&fit=crop',
    stats: { views: '1.1M', likes: '1.2K' },
    isNew: false,
    isTrending: false,
  },
  {
    id: 9,
    title: 'AI AUTOMATION',
    description: 'Tips, Tricks, Workflows, Tools & Shortcuts',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2000&auto=format&fit=crop',
    stats: { views: '1.1M', likes: '1.2K' },
    isNew: false,
    isTrending: false,
  },
];

export default function Videos() {
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen -m-10 p-10 bg-[#F3F4F6]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose a Template</h1>
        <p className="text-gray-500">Select a template to get started with your video or a carousel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {TEMPLATES.map((template) => (
          <div 
            key={template.id} 
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-[400px]"
            onClick={() => {
              if (template.id === 'video-gen') {
                navigate('/dashboard/video-generation');
              }
            }}
          >
            {template.isCustom ? (
              <div className="relative flex-1 bg-[#FFF8F0] flex flex-col items-center justify-center p-6 text-center border-b border-orange-100">
                <Sparkles className="w-10 h-10 text-orange-400 mb-4" />
                <h3 className="font-bold text-gray-900 text-lg mb-2">Create Everything with AI Agent</h3>
                <p className="text-sm text-gray-500">Describe any idea and AI creates it with your Brand Kit</p>
              </div>
            ) : (
              <div className="relative flex-1 bg-gray-100">
                <img 
                  src={template.image} 
                  alt={template.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  {template.isNew && (
                    <span className="px-2 py-1 bg-pink-500 text-white text-xs font-bold rounded">NEW</span>
                  )}
                  {template.isTrending && (
                    <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      TRENDING
                    </span>
                  )}
                  <span className="px-2 py-1 bg-black/75 text-white text-[10px] font-bold rounded uppercase tracking-[0.12em]">
                    Soon
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center text-white text-xs">
                  <span className="flex items-center mr-4">
                    <Eye className="w-4 h-4 mr-1" />
                    {template.stats?.views}
                  </span>
                  <span className="flex items-center">
                    <Heart className="w-4 h-4 mr-1" />
                    {template.stats?.likes}
                  </span>
                </div>
              </div>
            )}
            <div className="p-4 bg-white border-t border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{template.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Welcome Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to AIcontentStudio!</h2>
              <p className="text-gray-500 mb-8">Your brand is set up. Here's what you can do:</p>
              
              <div className="space-y-4 text-left mb-8">
                <div className="flex items-start p-4 border border-gray-200 rounded-xl hover:border-blue-500 transition-colors cursor-pointer">
                  <LayoutTemplate className="w-6 h-6 text-gray-400 mr-4 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900">Make visuals from templates</h3>
                    <p className="text-sm text-gray-500">Template cards are inspiration for the next build phase. The live workflow today is AI generation.</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 border border-gray-200 rounded-xl hover:border-blue-500 transition-colors cursor-pointer">
                  <Sparkles className="w-6 h-6 text-gray-400 mr-4 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900">Create with AI</h3>
                    <p className="text-sm text-gray-500">Describe your idea and use the shipped Veo generator to create a video right now.</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 border border-gray-200 rounded-xl hover:border-blue-500 transition-colors cursor-pointer">
                  <Calendar className="w-6 h-6 text-gray-400 mr-4 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900">Track the roadmap</h3>
                    <p className="text-sm text-gray-500">Scheduling and publishing are not live yet, so this page keeps them clearly in roadmap territory.</p>
                  </div>
                </div>
                
                <div className="flex items-start p-4 border border-gray-200 rounded-xl hover:border-blue-500 transition-colors cursor-pointer">
                  <Code className="w-6 h-6 text-gray-400 mr-4 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900">API integrations later</h3>
                    <p className="text-sm text-gray-500">The API dashboard is still planned, so this launcher now avoids implying an active integration surface.</p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                You can always edit your brand in Settings.
              </p>
              
              <button 
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-[#4B5563] hover:bg-[#374151] text-white font-bold rounded-xl transition-colors"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendingUp(props: React.SVGProps<SVGSVGElement>) {
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
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function Eye(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Heart(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
