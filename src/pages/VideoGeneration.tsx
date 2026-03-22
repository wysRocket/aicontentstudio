import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Video, Loader2, Sparkles, Play, AlertCircle, Key } from 'lucide-react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function VideoGeneration() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const keySelected = await window.aistudio.hasSelectedApiKey();
        setHasKey(keySelected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessage('Initializing video generation...');

    try {
      if (!hasKey && window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      }

      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      setLoadingMessage('Generating video... This may take a few minutes.');
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: aspectRatio
        }
      });

      let dots = 0;
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        dots = (dots + 1) % 4;
        setLoadingMessage(`Generating video... This may take a few minutes${'.'.repeat(dots)}`);
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!downloadLink) {
        throw new Error('No video URL returned from the API.');
      }

      setLoadingMessage('Fetching video...');
      
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey as string,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);

    } catch (err: any) {
      console.error('Video generation error:', err);
      if (err.message && err.message.includes('Requested entity was not found.')) {
        setHasKey(false);
        setError('API key error. Please select a valid paid API key.');
      } else {
        setError(err.message || 'An error occurred during video generation.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-white rounded-2xl shadow-sm border border-gray-200 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Key className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Paid API Key Required</h2>
        <p className="text-gray-600 mb-6 max-w-md">
          Veo video generation requires a paid Google Cloud API key. Please select your key to continue.
          <br /><br />
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
            Learn more about billing
          </a>
        </p>
        <button
          onClick={handleSelectKey}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center"
        >
          <Key className="w-5 h-5 mr-2" />
          Select API Key
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Generation</h1>
          <p className="text-gray-500">Create stunning videos with Veo 3</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Controls */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A neon hologram of a cat driving at top speed..."
              className="w-full h-32 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAspectRatio('16:9')}
                disabled={isLoading}
                className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                  aspectRatio === '16:9'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <div className="w-8 h-4 border-2 border-current rounded-sm mb-2" />
                <span className="text-sm font-medium">16:9 Landscape</span>
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                disabled={isLoading}
                className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                  aspectRatio === '9:16'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <div className="w-4 h-8 border-2 border-current rounded-sm mb-2" />
                <span className="text-sm font-medium">9:16 Portrait</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Video
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center text-white p-8 text-center z-10">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
              <p className="text-lg font-medium">{loadingMessage}</p>
              <p className="text-sm text-gray-400 mt-2">Veo 3 is crafting your video</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-red-400 p-8 text-center z-10">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">{error}</p>
            </div>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center text-gray-500 z-10">
              <Video className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Your video will appear here</p>
            </div>
          )}
          
          {/* Background pattern when empty */}
          {!videoUrl && !isLoading && !error && (
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          )}
        </div>
      </div>
    </div>
  );
}
