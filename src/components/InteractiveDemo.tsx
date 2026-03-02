import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function InteractiveDemo() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setResult('');
    
    // Simulate API call
    setTimeout(() => {
      setResult(`Here is a generated sample based on your prompt: "${prompt}".\n\nAI Content Studio makes it incredibly easy to generate high-quality text for your marketing campaigns, blog posts, and social media. With just a few words, our advanced models can expand your ideas into fully fleshed-out content that engages your audience and drives conversions.`);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-emerald-500 opacity-20 blur-3xl"></div>
      </div>
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Try it yourself</h2>
          <p className="mt-4 text-lg text-slate-400">Enter a prompt below to see how AI Content Studio can transform your ideas.</p>
        </div>
        
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <form onSubmit={handleGenerate} className="flex gap-4">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Write a catchy tagline for a new coffee shop..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" /> Generate</>}
              </button>
            </form>
          </div>
          
          <div className="p-8 min-h-[200px] flex flex-col items-center justify-center bg-slate-900/50">
            {isGenerating ? (
              <div className="flex flex-col items-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                <p>Generating your content...</p>
              </div>
            ) : result ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full text-left text-slate-300 leading-relaxed whitespace-pre-wrap"
              >
                {result}
              </motion.div>
            ) : (
              <div className="text-slate-500 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Your generated content will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
