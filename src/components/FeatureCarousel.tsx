import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const features = [
  {
    id: 1,
    title: "Generate Blog Posts",
    description: "Create comprehensive, SEO-optimized blog posts in seconds. Just provide a topic and a few keywords.",
    image: "https://picsum.photos/seed/blog/800/500?blur=2"
  },
  {
    id: 2,
    title: "Rewrite Content",
    description: "Instantly rewrite existing text to improve clarity, change the tone, or adapt it for different platforms.",
    image: "https://picsum.photos/seed/rewrite/800/500?blur=2"
  },
  {
    id: 3,
    title: "Summarize Documents",
    description: "Upload long documents and get concise summaries highlighting the key points and takeaways.",
    image: "https://picsum.photos/seed/summary/800/500?blur=2"
  },
  {
    id: 4,
    title: "Transcribe Audio",
    description: "Convert audio and video files into accurate text transcripts with speaker identification.",
    image: "https://picsum.photos/seed/audio/800/500?blur=2"
  }
];

export default function FeatureCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrentIndex((prev) => (prev + 1) % features.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);

  return (
    <div className="mt-16 relative rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-800">
      <div className="aspect-w-16 aspect-h-9 sm:aspect-h-7 md:aspect-h-6 lg:aspect-h-5 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <img 
              src={features[currentIndex].image} 
              alt={features[currentIndex].title} 
              className="w-full h-full object-cover opacity-60"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">{features[currentIndex].title}</h3>
              <p className="text-slate-300 text-lg max-w-2xl">{features[currentIndex].description}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between pointer-events-none">
        <button 
          onClick={prev}
          className="pointer-events-auto p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button 
          onClick={next}
          className="pointer-events-auto p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {features.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-indigo-500 w-6' : 'bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}
