import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const testimonials = [
  {
    id: 1,
    content: "AI Content Studio has completely transformed our content creation process. The predictability of the credit system means we never have surprise bills at the end of the month.",
    author: "Sarah Jenkins",
    role: "Marketing Director, TechFlow",
    rating: 5
  },
  {
    id: 2,
    content: "The quality of the generated content is outstanding. We use it daily to draft blog posts, social media updates, and email campaigns. Highly recommended!",
    author: "David Chen",
    role: "Founder, GrowthLabs",
    rating: 5
  },
  {
    id: 3,
    content: "Finally, an AI tool that doesn't force you into a subscription you don't need. I buy credits when I need them and use them at my own pace.",
    author: "Emily Rodriguez",
    role: "Freelance Copywriter",
    rating: 4
  }
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-24 bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Loved by creators</h2>
          <p className="mt-4 text-lg text-slate-600">See what our users have to say about AI Content Studio.</p>
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden relative min-h-[300px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-12"
              >
                <div className="flex gap-1 mb-6 text-amber-400">
                  {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 fill-current" />
                  ))}
                </div>
                <blockquote className="text-2xl font-medium text-slate-900 leading-relaxed mb-8">
                  "{testimonials[currentIndex].content}"
                </blockquote>
                <div className="font-semibold text-slate-900">{testimonials[currentIndex].author}</div>
                <div className="text-slate-500">{testimonials[currentIndex].role}</div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none">
            <button 
              onClick={prev}
              className="pointer-events-auto p-2 rounded-full bg-white shadow-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all -ml-4 sm:-ml-12"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button 
              onClick={next}
              className="pointer-events-auto p-2 rounded-full bg-white shadow-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all -mr-4 sm:-mr-12"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-indigo-600 w-6' : 'bg-slate-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
