import { useState, useRef } from "react";
import { Upload, FileVideo, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";

export default function Coach() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setAnalysisResult(null);
    
    if (!selectedFile.type.startsWith("video/")) {
      setError("Please upload a valid video file.");
      return;
    }
    
    // 100MB limit
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError("File size exceeds the 100MB limit.");
      return;
    }
    
    setFile(selectedFile);
  };

  const analyzeVideo = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          // Remove the data URL prefix (e.g., "data:video/mp4;base64,")
          const base64String = base64Data.split(",")[1];
          
          // @ts-ignore
          const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
          
          const videoPart = {
            inlineData: {
              mimeType: file.type,
              data: base64String,
            },
          };
          
          const textPart = {
            text: "You are an expert social media viral coach. Analyze this short-form video (TikTok, Reel, or Short). Provide specific, actionable tips on how to make it more viral. Consider the hook, pacing, visuals, audio/music potential, call to action, and overall engagement factor. Format your response in Markdown with clear headings and bullet points.",
          };
          
          const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: { parts: [videoPart, textPart] },
          });
          
          setAnalysisResult(response.text || "No analysis generated.");
        } catch (err: any) {
          console.error("Error analyzing video:", err);
          setError(err.message || "Failed to analyze the video. The file might be too large for inline analysis or the API key is missing.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      
      reader.onerror = () => {
        setError("Failed to read the video file.");
        setIsAnalyzing(false);
      };
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "An unexpected error occurred.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
          <span role="img" aria-label="clapper">🎬</span> Viral AI Coach
        </h1>
        <p className="text-gray-500 text-lg">
          Upload your tiktok, reel, or short to get viral tips!
        </p>
      </div>

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-gray-400 bg-white"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Upload className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Upload a video to analyze</h3>
              <p className="text-sm text-gray-500">Upload a video (max 100MB) to analyze its viral potential</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileVideo className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 truncate max-w-md">{file.name}</h3>
                <p className="text-sm text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setAnalysisResult(null);
                setError(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              disabled={isAnalyzing}
            >
              Change Video
            </button>
          </div>

          {!analysisResult && !isAnalyzing && (
            <button
              onClick={analyzeVideo}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Analyze Viral Potential
            </button>
          )}

          {isAnalyzing && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Analyzing your video...</h3>
              <p className="text-gray-500">Our AI coach is watching your content to generate viral tips.</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>
      )}

      {analysisResult && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Viral Coach Analysis</h2>
          </div>
          <div className="p-6 prose prose-indigo max-w-none">
            <ReactMarkdown>{analysisResult}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
