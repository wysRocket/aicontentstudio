import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Coins, Loader2, Sparkles, Plus, ArrowLeft, ChevronUp, ChevronDown, PlusCircle } from 'lucide-react';
import PurchaseCreditsModal from '../components/PurchaseCreditsModal';
import { auth } from '../firebase';
import { getUserCredits, deductCredits, addCredits } from '../lib/firestore';

const Toggle = ({ checked, onChange, id }: { checked?: boolean, onChange?: () => void, id?: string }) => (
  <button 
    id={id}
    type="button"
    onClick={onChange}
    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${checked ? 'bg-[#D81B60]' : 'bg-gray-200'}`}
  >
    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const SelectInput = ({ label, placeholder, disabled, options = [] }: { label: string, placeholder?: string, disabled?: boolean, options?: string[] }) => {
  const id = `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-gray-900">{label}</label>
      <div className="relative">
        <select 
          id={id}
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D81B60]/20 focus:border-[#D81B60] appearance-none bg-white text-gray-700 disabled:bg-gray-50 disabled:text-gray-500"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
          <ChevronUp className="w-3 h-3 -mb-1" />
          <ChevronDown className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [credits, setCredits] = useState<number | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Form State
  const [prompt, setPrompt] = useState('');
  const [useBrandKit, setUseBrandKit] = useState(false);
  const [trimSilence, setTrimSilence] = useState(false);
  const [enableTitle, setEnableTitle] = useState(false);
  const [enableCaptions, setEnableCaptions] = useState(false);
  const [enableBgm, setEnableBgm] = useState(false);
  const [enableVoiceover, setEnableVoiceover] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      getUserCredits(uid).then(setCredits).catch(() => setCredits(0));
    }
  }, []);

  useEffect(() => {
    if (searchParams.get('buy') === 'true') {
      setIsPurchaseModalOpen(true);
      searchParams.delete('buy');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleProcess = async () => {
    if (!prompt.trim()) return;
    if (credits === null || credits < 10) {
      setIsPurchaseModalOpen(true);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setIsProcessing(true);
    try {
      await deductCredits(uid, 10);
      setCredits(prev => (prev ?? 0) - 10);
    } catch (err) {
      if (err instanceof Error && err.message === 'insufficient_credits') {
        setIsPurchaseModalOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async (amount: number) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await addCredits(uid, amount);
    setCredits(prev => (prev ?? 0) + amount);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-end">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              <Coins className="w-4 h-4 text-[#D81B60]" />
              {credits === null
                ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                : <span className="font-medium text-sm text-gray-700">{credits} credits</span>
              }
            </div>
            <button 
              type="button"
              onClick={() => setIsPurchaseModalOpen(true)}
              className="flex items-center gap-1.5 bg-pink-50 text-[#D81B60] hover:bg-pink-100 border border-pink-200 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Buy credits
            </button>
            <Link to="/dashboard/settings?tab=profile" className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D81B60] to-purple-500 flex items-center justify-center text-white font-bold ml-2 shadow-sm hover:opacity-90 transition-opacity">
              U
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-[1400px] w-full mx-auto flex flex-col min-h-0 bg-white shadow-none border-none">
        
        {/* Engaging Hero Section */}
        <div className="mx-6 lg:mx-8 mt-6 mb-2 bg-gradient-to-br from-[#D81B60] to-purple-700 rounded-2xl overflow-hidden shadow-lg p-8 relative shrink-0">
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
              Supercharge Your Video Workflow
            </h1>
            <p className="text-pink-100 text-[15px] leading-relaxed mb-6 font-medium">
              Welcome to AI Content Studio! Seamlessly combine clips, apply edits, and generate stunning video content. Powered by Google's state-of-the-art <b>Gemini 3.1 Pro</b> model with Advanced Thinking, our platform understands context deeper and creates professional, high-quality results in seconds. Just input your prompt and let the AI do the heavy lifting.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#D81B60] bg-white px-3 py-1.5 rounded-lg shadow-sm">
                <Sparkles className="w-4 h-4 text-[#D81B60]" /> Lightning Fast
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#D81B60] bg-white px-3 py-1.5 rounded-lg shadow-sm">
                <Sparkles className="w-4 h-4 text-[#D81B60]" /> Deep Context Awareness
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#D81B60] bg-white px-3 py-1.5 rounded-lg shadow-sm">
                <Sparkles className="w-4 h-4 text-[#D81B60]" /> Advanced Video Edits
              </div>
            </div>
          </div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 blur-2xl rounded-full pointer-events-none" />
        </div>

        {/* Header Title Area */}
        <div className="px-6 py-6 pb-4 flex items-start gap-4 shrink-0">
          <button type="button" className="mt-1 flex items-center justify-center text-purple-600 hover:bg-purple-50 p-1.5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 id="dashboard-title" className="text-[22px] font-bold text-gray-900 tracking-[-0.02em]">Combine Clips and Apply Basic Edits</h1>
            <p className="text-[13px] text-gray-500 mt-1">Combine Clips and Apply Basic Edits</p>
          </div>
        </div>

        {/* Content Split Layout */}
        <div className="flex-1 flex flex-col lg:flex-row px-6 lg:px-8 pb-8 gap-10 lg:gap-8 min-h-0">
          
          {/* Left Media Player (Sticky or fixed height taking available space) */}
          <div className="w-full lg:w-[45%] shrink-0">
            <div className="w-full aspect-[9/16] rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 bg-gray-900 relative">
              <video 
                src="/images/dash-vid.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Configuration Form */}
          <div className="flex-1 flex flex-col overflow-y-auto pr-2 pb-10">
            <div className="w-full flex flex-col gap-6">
              
              {/* Prompt Area */}
              <div className="flex flex-col gap-2">
                <label htmlFor="prompt-input" className="text-[13px] font-semibold text-gray-900">Prompt</label>
                <textarea 
                  id="prompt-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your video idea..."
                  className="w-full h-[120px] px-4 py-4 rounded-xl border border-gray-200 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D81B60]/20 focus:border-[#D81B60] resize-none transition-shadow"
                />
              </div>

              {/* Brand Kit Toggle */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Toggle id="brand-kit-toggle" checked={useBrandKit} onChange={() => setUseBrandKit(!useBrandKit)} />
                </div>
                <div>
                  <label htmlFor="brand-kit-toggle" className="block text-[13px] font-semibold text-gray-900">Use brand kit</label>
                  <p className="text-[13px] text-gray-500 mt-0.5 leading-snug">Apply your brand colors, tone, and style. Only works if you have a brand kit set up.</p>
                </div>
              </div>

              {/* Generate Button */}
              <button 
                type="button"
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full py-[14px] rounded-xl bg-[#c2185b] hover:bg-[#ad1457] text-white font-semibold flex items-center justify-center gap-2 text-[15px] shadow-sm transition-colors mt-1 disabled:opacity-70"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isProcessing ? 'Generating...' : 'Generate Video'}
              </button>

              {/* Accordion Divider */}
              <button 
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full text-left pt-6 pb-2 border-t border-gray-100 text-[13px] text-gray-500 flex items-center justify-between hover:text-gray-800 transition-colors mt-2"
              >
                Need more customization? Click to see advanced options
                {isAdvancedOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Advanced Options Content */}
              {isAdvancedOpen && (
                <div className="flex flex-col gap-8 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                
                {/* Video Clips */}
                <div className="flex flex-col gap-3">
                  <label className="block text-[13px] font-semibold text-gray-900">Video Clips</label>
                  <button 
                    type="button"
                    className="w-full py-3 rounded-lg border border-purple-300 text-purple-600 font-semibold flex items-center justify-center gap-2 text-sm hover:bg-purple-50 transition-colors bg-white"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Video Clip
                  </button>
                </div>

                {/* Trim Silence Toggle */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Toggle checked={trimSilence} onChange={() => setTrimSilence(!trimSilence)} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-900">Trim Silence</label>
                    <p className="text-[13px] text-gray-500 mt-0.5 leading-snug">Automatically trim silence at beginning and end of video</p>
                  </div>
                </div>

                {/* Title Configuration */}
                <div className="flex flex-col gap-5 pt-1">
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-900">Title Configuration</h3>
                    <p className="text-[13px] text-gray-500 mt-0.5">Optional title overlay configuration</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Toggle checked={enableTitle} onChange={() => setEnableTitle(!enableTitle)} />
                    <label className="text-[13px] font-medium text-gray-900">Enable Title</label>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="title-text" className="block text-[13px] font-semibold text-gray-900">Title Text</label>
                      <input 
                        id="title-text"
                        type="text" 
                        placeholder="Your Title Here" 
                        disabled={!enableTitle}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D81B60]/20 focus:border-[#D81B60] disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-400" 
                      />
                    </div>
                    
                    <SelectInput 
                      label="Title Position" 
                      disabled={!enableTitle} 
                      options={['Top Left', 'Top Center', 'Top Right', 'Middle Left', 'Middle Center', 'Middle Right', 'Bottom Left', 'Bottom Center', 'Bottom Right']}
                    />

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="title-duration" className="block text-[13px] font-semibold text-gray-900">Title Duration (seconds)</label>
                      <p className="text-[12px] text-gray-500 -mt-1 mb-0.5">How long the title should appear</p>
                      <div className="relative">
                        <input 
                          id="title-duration"
                          type="number" 
                          defaultValue="0" 
                          disabled={!enableTitle}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D81B60]/20 focus:border-[#D81B60] appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:bg-gray-50 disabled:text-gray-500 m-0" 
                        />
                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex flex-col pointer-events-none ${!enableTitle ? 'text-gray-300' : 'text-gray-400'}`}>
                          <ChevronUp className="w-3 h-3 -mb-1" />
                          <ChevronDown className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    <SelectInput 
                      label="Title Style" 
                      disabled={!enableTitle} 
                      options={['Classic', 'Modern', 'Bold', 'Minimalist', 'Neon', 'Outline']}
                    />
                  </div>
                </div>

                {/* Captions Configuration */}
                <div className="flex flex-col gap-5 pt-1">
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-900">Captions Configuration</h3>
                    <p className="text-[13px] text-gray-500 mt-0.5">Optional captions/subtitles configuration</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Toggle checked={enableCaptions} onChange={() => setEnableCaptions(!enableCaptions)} />
                    <label className="text-[13px] font-medium text-gray-900">Enable Captions</label>
                  </div>

                  <div className="flex flex-col gap-5">
                    <SelectInput 
                      label="Caption Style" 
                      disabled={!enableCaptions} 
                      options={['Standard', 'Subrip', 'Yellow Box', 'Dynamic', 'Karaoke']}
                    />
                    <SelectInput 
                      label="Caption Position" 
                      disabled={!enableCaptions} 
                      options={['Top', 'Middle', 'Bottom']}
                    />
                  </div>
                </div>

                {/* Output Format */}
                <div className="flex flex-col gap-5 pt-1 border-t border-gray-100 mt-2">
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-900 mt-4">Video Output Format</h3>
                    <p className="text-[13px] text-gray-500 mt-0.5">Choose your desired dimensions and quality</p>
                  </div>
                  <div className="flex flex-col gap-5">
                    <SelectInput 
                      label="Aspect Ratio" 
                      placeholder="Select aspect ratio" 
                      options={['16:9 (Landscape)', '9:16 (Portrait)', '1:1 (Square)', '4:3 (SD)', '21:9 (Ultrawide)']}
                    />
                    <SelectInput 
                      label="Resolution" 
                      placeholder="Select resolution" 
                      options={['720p (HD)', '1080p (FHD)', '1440p (QHD)', '4K (UHD)']}
                    />
                  </div>
                </div>

                {/* Background Music Configuration */}
                <div className="flex flex-col gap-5 pt-1 border-t border-gray-100 mt-2">
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-900 mt-4">Background Music</h3>
                    <p className="text-[13px] text-gray-500 mt-0.5">Add an atmospheric soundtrack</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Toggle checked={enableBgm} onChange={() => setEnableBgm(!enableBgm)} />
                    <label className="text-[13px] font-medium text-gray-900">Enable Background Music</label>
                  </div>

                  <div className="flex flex-col gap-5 bg-transparent">
                    <SelectInput 
                      label="Music Genre" 
                      disabled={!enableBgm} 
                      placeholder="Select genre" 
                      options={['Cinematic', 'Epic', 'Lo-Fi', 'Happy', 'Corporate', 'Upbeat', 'Intense', 'Minimalist']}
                    />
                    <SelectInput 
                      label="Volume Level" 
                      disabled={!enableBgm} 
                      placeholder="Select volume" 
                      options={['Very Low (10%)', 'Low (25%)', 'Medium (50%)', 'High (75%)', 'Full (100%)']}
                    />
                  </div>
                </div>

                {/* AI Voiceover Configuration */}
                <div className="flex flex-col gap-5 pt-1 border-t border-gray-100 mt-2 mb-2">
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-900 mt-4">AI Voiceover</h3>
                    <p className="text-[13px] text-gray-500 mt-0.5">Generate a professional voiceover from your script</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Toggle checked={enableVoiceover} onChange={() => setEnableVoiceover(!enableVoiceover)} />
                    <label className="text-[13px] font-medium text-gray-900">Enable AI Voiceover</label>
                  </div>

                  <div className="flex flex-col gap-5 bg-transparent">
                    <SelectInput 
                      label="Voice Style" 
                      disabled={!enableVoiceover} 
                      placeholder="Select voice" 
                      options={['Professional Male (US)', 'Professional Female (US)', 'Friendly Male (UK)', 'Narrator Female (UK)', 'Deep Male', 'Soft Female']}
                    />
                    <SelectInput 
                      label="Pacing" 
                      disabled={!enableVoiceover} 
                      placeholder="Select pacing" 
                      options={['Slow', 'Normal Speed', 'Fast Speed', 'Dynamic']}
                    />
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PurchaseCreditsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onPurchase={handlePurchase}
      />
    </div>
  );
}
