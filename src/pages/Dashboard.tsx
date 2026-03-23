import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Coins, Loader2, Sparkles, Plus, ArrowLeft, ChevronUp, ChevronDown, PlusCircle, FileText, Lightbulb, MessageSquare, CheckCircle2, AlertTriangle, CalendarDays } from 'lucide-react';
import PurchaseCreditsModal from '../components/PurchaseCreditsModal';
import { getUserCredits, deductCredits, ensureWorkspaceSeedData, getWorkspaceStats, type WorkspaceStats } from '../lib/firestore';
import { useFirebase } from '../contexts/FirebaseContext';

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
  const { user, isAuthReady } = useFirebase();
  const [credits, setCredits] = useState<number | null>(null);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const purchaseDisabledMessage = 'Self-serve checkout is still being hardened server-side. Email support to top up your balance manually for now.';

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

  // Wait for auth to be ready before loading credits to avoid reading
  // stale/null uid during Firebase initialization.
  useEffect(() => {
    if (!isAuthReady || !user) return;
    getUserCredits(user.uid).then(setCredits).catch(() => setCredits(0));
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    ensureWorkspaceSeedData(user.uid)
      .then(() => getWorkspaceStats(user.uid))
      .then(setWorkspaceStats)
      .catch((err) => {
        console.error('Failed to load workspace stats:', err);
        setWorkspaceStats({
          promptCount: 0,
          inspirationCount: 0,
          draftCount: 0,
          readyCount: 0,
          approvedCount: 0,
          scheduledCount: 0,
          publishedCount: 0,
          failedCount: 0,
        });
      });
  }, [isAuthReady, user]);

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
    if (!user) return;
    setIsProcessing(true);
    try {
      await deductCredits(user.uid, 10);
      setCredits(prev => (prev ?? 0) - 10);
    } catch (err) {
      if (err instanceof Error && err.message === 'insufficient_credits') {
        try {
          const freshCredits = await getUserCredits(user.uid);
          setCredits(freshCredits);
        } catch (refreshError) {
          console.error('Failed to refresh credits after insufficient_credits:', refreshError);
          setCredits(0);
        }
        setIsPurchaseModalOpen(true);
      } else {
        console.error('Failed to deduct credits:', err);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async (amount: number) => {
    console.warn(purchaseDisabledMessage);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-x-hidden">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-end">
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
              <Coins className="w-4 h-4 text-[#D81B60]" />
              {credits === null
                ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                : <span className="font-medium text-sm text-gray-700">{credits} credits</span>
              }
            </div>
            <button 
              type="button"
              onClick={() => setIsPurchaseModalOpen(true)}
              className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-medium text-[#D81B60] transition-colors hover:bg-pink-100 sm:min-h-0 sm:flex-none sm:justify-start sm:py-1.5"
            >
              <Plus className="w-4 h-4" />
              Top up credits
            </button>
            <Link to="/dashboard/settings?tab=profile" className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#D81B60] to-purple-500 text-white font-bold shadow-sm transition-opacity hover:opacity-90 sm:ml-2 sm:h-8 sm:w-8">
              U
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-[1400px] w-full mx-auto flex flex-col min-h-0 bg-white shadow-none border-none">
        
        {/* Engaging Hero Section */}
        <div className="relative mx-4 mb-2 mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#D81B60] to-purple-700 p-5 shadow-lg shrink-0 sm:mx-6 sm:mt-6 sm:p-8 lg:mx-8">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-50 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard overview
            </div>
            <h1 className="mb-3 text-[28px] font-bold leading-[1.05] text-white tracking-tight sm:mb-4 sm:text-3xl">
              Supercharge Your Video Workflow
            </h1>
            <p className="mb-5 max-w-2xl text-[14px] font-medium leading-relaxed text-pink-100 sm:mb-6 sm:text-[15px]">
              Welcome to AI Content Studio! Seamlessly combine clips, apply edits, and generate stunning video content. Powered by Google's state-of-the-art <b>Gemini 3.1 Pro</b> model with Advanced Thinking, our platform understands context deeper and creates professional, high-quality results in seconds. Just input your prompt and let the AI do the heavy lifting.
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#D81B60] shadow-sm sm:rounded-lg sm:py-1.5 sm:text-[13px]">
                <Sparkles className="w-4 h-4 text-[#D81B60]" /> Lightning Fast
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#D81B60] shadow-sm sm:rounded-lg sm:py-1.5 sm:text-[13px]">
                <Sparkles className="w-4 h-4 text-[#D81B60]" /> Deep Context Awareness
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#D81B60] shadow-sm sm:rounded-lg sm:py-1.5 sm:text-[13px]">
                <Sparkles className="w-4 h-4 text-[#D81B60]" /> Advanced Video Edits
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl sm:h-96 sm:w-96" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-black/10 blur-2xl sm:h-64 sm:w-64" />
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-2 sm:gap-4 sm:px-6 lg:px-8 xl:grid-cols-4">
          {[
            {
              label: 'Prompt Library',
              value: workspaceStats?.promptCount,
              icon: MessageSquare,
              href: '/dashboard/prompts',
              tone: 'bg-violet-50 text-violet-700 border-violet-100',
            },
            {
              label: 'Inspiration Saved',
              value: workspaceStats?.inspirationCount,
              icon: Lightbulb,
              href: '/dashboard/inspiration',
              tone: 'bg-amber-50 text-amber-700 border-amber-100',
            },
            {
              label: 'Draft Posts',
              value: workspaceStats?.draftCount,
              icon: FileText,
              href: '/dashboard/create',
              tone: 'bg-blue-50 text-blue-700 border-blue-100',
            },
            {
              label: 'Ready For Review',
              value: workspaceStats?.readyCount,
              icon: Sparkles,
              href: '/dashboard/create',
              tone: 'bg-violet-50 text-violet-700 border-violet-100',
            },
            {
              label: 'Approved Queue',
              value: workspaceStats?.approvedCount,
              icon: CheckCircle2,
              href: '/dashboard/calendar',
              tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            },
            {
              label: 'Scheduled',
              value: workspaceStats?.scheduledCount,
              icon: CalendarDays,
              href: '/dashboard/calendar',
              tone: 'bg-sky-50 text-sky-700 border-sky-100',
            },
            {
              label: 'Published',
              value: workspaceStats?.publishedCount,
              icon: CheckCircle2,
              href: '/dashboard/published',
              tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            },
            {
              label: 'Failed',
              value: workspaceStats?.failedCount,
              icon: AlertTriangle,
              href: '/dashboard/failed',
              tone: 'bg-rose-50 text-rose-700 border-rose-100',
            },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${item.tone}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-bold sm:text-[30px]">
                  {workspaceStats ? item.value : '...'}
                </span>
              </div>
              <p className="text-sm font-semibold mt-4">{item.label}</p>
              <p className="text-xs mt-1 opacity-80">Open workspace</p>
            </Link>
          ))}
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-4 px-4 pt-6 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Review Queue</p>
            <p className="mt-3 text-3xl font-bold text-violet-950">
              {workspaceStats ? workspaceStats.readyCount + workspaceStats.approvedCount : '...'}
            </p>
            <p className="mt-2 text-sm text-violet-900">
              {workspaceStats?.readyCount || 0} ready drafts and {workspaceStats?.approvedCount || 0} approved drafts are waiting in the copy pipeline.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link to="/dashboard/create" className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-100">
                Review drafts
              </Link>
              <Link to="/dashboard/calendar" className="rounded-lg border border-violet-200 px-3 py-2 text-center text-sm font-semibold text-violet-700 hover:bg-white">
                Open calendar
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Scheduling Signal</p>
            <p className="mt-3 text-3xl font-bold text-sky-950">
              {workspaceStats?.scheduledCount ?? '...'}
            </p>
            <p className="mt-2 text-sm text-sky-900">
              Approved posts only move into the scheduled queue, so this number now reflects truly schedule-ready work.
            </p>
            <div className="mt-4">
              <Link to="/dashboard/calendar" className="inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-100">
                Manage schedule
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Source Engine</p>
            <p className="mt-3 text-3xl font-bold text-amber-950">
              {workspaceStats?.inspirationCount ?? '...'}
            </p>
            <p className="mt-2 text-sm text-amber-900">
              Keep feeding the top of the funnel: sources become hooks, hooks become drafts, and strong drafts move through approval.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link to="/dashboard/sources" className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-amber-700 shadow-sm hover:bg-amber-100">
                Open sources
              </Link>
              <Link to="/dashboard/inspiration" className="rounded-lg border border-amber-200 px-3 py-2 text-center text-sm font-semibold text-amber-700 hover:bg-white">
                Inspiration
              </Link>
            </div>
          </div>
        </div>

        {/* Header Title Area */}
        <div className="flex shrink-0 items-start gap-3 px-4 pb-4 pt-6 sm:gap-4 sm:px-6 sm:py-6 lg:px-8">
          <button type="button" className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-purple-100 bg-white text-purple-600 transition-colors hover:bg-purple-50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-500">Video builder</p>
            <h1 id="dashboard-title" className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-gray-900 sm:text-[22px]">Combine Clips and Apply Basic Edits</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-gray-500">Assemble clips, review the preview, and fine-tune settings without losing momentum on mobile.</p>
          </div>
        </div>

        {/* Content Split Layout */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
          
          {/* Left Media Player (Sticky or fixed height taking available space) */}
          <div className="w-full shrink-0 lg:sticky lg:top-[104px] lg:w-[45%] lg:self-start">
            <div className="relative overflow-hidden rounded-[24px] border border-gray-200 bg-gray-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)] aspect-[4/5] sm:aspect-[9/14] lg:aspect-[9/16]">
              <video 
                src="/images/dash-vid.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Preview-first workflow</p>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">Keep the video visible while adjusting prompt details so small-screen edits feel anchored and less cramped.</p>
            </div>
          </div>

          {/* Right Configuration Form */}
          <div className="flex-1 flex flex-col pb-2 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-2 lg:pb-10">
            <div className="w-full flex flex-col gap-5 sm:gap-6">
              
              {/* Prompt Area */}
              <div className="flex flex-col gap-2 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <label htmlFor="prompt-input" className="text-[13px] font-semibold text-gray-900">Prompt</label>
                <textarea 
                  id="prompt-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your video idea..."
                  className="h-[132px] w-full rounded-xl border border-gray-200 px-4 py-4 text-[14px] text-gray-800 placeholder:text-gray-400 transition-shadow resize-none focus:border-[#D81B60] focus:outline-none focus:ring-2 focus:ring-[#D81B60]/20"
                />
              </div>

              {/* Brand Kit Toggle */}
              <div className="flex items-start gap-3 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
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
                className="sticky bottom-4 z-10 mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c2185b] px-4 py-[15px] text-[15px] font-semibold text-white shadow-[0_16px_40px_rgba(194,24,91,0.28)] transition-colors hover:bg-[#ad1457] disabled:opacity-70 lg:static lg:shadow-sm"
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
                <div className="flex flex-col gap-8 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                
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
        purchasesDisabled
        disabledReason={purchaseDisabledMessage}
        currentCredits={credits}
      />
    </div>
  );
}
