import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { PenLine, FileText, Mic, Languages, Coins, Loader2, Sparkles, Plus } from 'lucide-react';
import PurchaseCreditsModal from '../components/PurchaseCreditsModal';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Tool = 'write' | 'summarize' | 'transcribe' | 'translate';

export default function Dashboard() {
  const [activeTool, setActiveTool] = useState<Tool>('write');
  const [credits, setCredits] = useState(1000);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (searchParams.get('buy') === 'true') {
      setIsPurchaseModalOpen(true);
      // Clean up the URL
      searchParams.delete('buy');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleProcess = async () => {
    if (!input.trim() && !file) return;
    if (credits < 10) {
      setIsPurchaseModalOpen(true);
      return;
    }

    setIsProcessing(true);
    setError('');
    setOutput('');

    try {
      let prompt = '';
      let parts: any[] = [];

      if (file) {
        // Convert file to base64
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      }

      switch (activeTool) {
        case 'write':
          prompt = `Write or rewrite the following content professionally:\n\n${input}`;
          break;
        case 'summarize':
          prompt = `Provide a structured summary, key points, and action items for the following text:\n\n${input}`;
          break;
        case 'transcribe':
          prompt = `Please transcribe or process the following text/audio-notes:\n\n${input}`;
          break;
        case 'translate':
          prompt = `Translate the following content to English (if it's not) or to Spanish/French (if it is English), maintaining professional tone:\n\n${input}`;
          break;
      }

      if (prompt) {
        parts.push({ text: prompt });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      setOutput(response.text || 'No output generated.');
      setCredits(prev => prev - 10);
    } catch (err: any) {
      setError(err.message || 'An error occurred during processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const tools = [
    { id: 'write', name: 'Write & Rewrite', icon: PenLine },
    { id: 'summarize', name: 'Summarize', icon: FileText },
    { id: 'transcribe', name: 'Transcribe', icon: Mic },
    { id: 'translate', name: 'Translate', icon: Languages },
  ] as const;

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      <nav className="sticky top-0 z-50 bg-bg-nav/90 backdrop-blur-md border-b border-border-nav">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-text-main hover:text-primary transition-colors font-semibold text-lg">
            <svg aria-hidden="true" focusable="false" height="24" viewBox="0 0 1306 1306" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M1161 653c0-114-38-220-101-305-29 22-69 19-95-6-26-26-28-67-7-95-85-64-190-102-305-102-140 0-267 57-359 149-92 92-149 219-149 359 0 140 57 267 149 359 92 92 219 149 359 149 140 0 267-57 359-149 92-92 149-219 149-359zm-100-510l73-73c28-29 74-29 103 0 28 28 28 74 0 102l-74 73c90 112 143 254 143 408 0 180-73 344-191 462-118 118-282 191-462 191-180 0-343-73-462-191-118-118-191-282-191-462 0-180 73-343 191-462 119-118 282-191 462-191 154 0 296 53 408 143zm-214 510c0-107-87-193-194-193-107 0-193 86-193 193 0 107 86 194 193 194 107 0 194-87 194-194z" fill="currentColor"></path>
            </svg>
            <span>AI Content Studio</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-bg-card border border-border-main px-3 py-1.5 rounded-lg">
              <Coins className="w-4 h-4 text-primary" />
              <span className="font-medium">{credits} credits</span>
            </div>
            <button 
              onClick={() => setIsPurchaseModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Buy credits
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold ml-2">
              U
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full flex gap-6 p-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 flex flex-col gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setInput('');
                setOutput('');
                setFile(null);
                setError('');
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                activeTool === tool.id
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:bg-bg-card-hover hover:text-white'
              }`}
            >
              <tool.icon className="w-5 h-5" />
              <span className="font-medium">{tool.name}</span>
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-6 h-[calc(100vh-120px)]">
          <div className="bg-bg-card-solid border border-border-main rounded-2xl p-6 shadow-xl flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {tools.find(t => t.id === activeTool)?.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-text-muted bg-bg-alert px-3 py-1.5 rounded-lg border border-border-main">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Powered by Gemini 3.1 Pro (Thinking Mode)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
              <div className="flex flex-col gap-4 h-full">
                <label className="text-sm font-medium text-text-muted uppercase tracking-wider">INPUT</label>
                {activeTool === 'transcribe' && (
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors"
                    />
                    {file && (
                      <button
                        onClick={() => setFile(null)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeTool === 'transcribe' ? "Enter your content here or upload an audio file above..." : "Enter your content here..."}
                  className="flex-1 bg-bg-main border border-border-main rounded-xl p-4 text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-primary resize-none shadow-inner"
                />
                <button
                  onClick={handleProcess}
                  disabled={isProcessing || (!input.trim() && !file)}
                  className="w-full py-3.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate (10 credits)
                    </>
                  )}
                </button>
                {error && (
                  <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 h-full">
                <label className="text-sm font-medium text-text-muted uppercase tracking-wider">OUTPUT</label>
                <div className="flex-1 bg-bg-main border border-border-main rounded-xl p-4 text-text-main overflow-y-auto whitespace-pre-wrap shadow-inner">
                  {output || (
                    <span className="text-text-muted/50 italic flex items-center justify-center h-full">
                      Generated content will appear here...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <PurchaseCreditsModal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
        onPurchase={(amount) => setCredits(prev => prev + amount)} 
      />
    </div>
  );
}
