import React from 'react';
import { X, Check, Sparkles } from 'lucide-react';

interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (amount: number) => void;
}

export default function PurchaseCreditsModal({ isOpen, onClose, onPurchase }: PurchaseCreditsModalProps) {
  if (!isOpen) return null;

  const packages = [
    { credits: 100, price: 5, popular: false },
    { credits: 500, price: 20, popular: true },
    { credits: 2000, price: 50, popular: false },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-card-solid border border-border-main rounded-2xl p-6 w-full max-w-3xl shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors p-1 rounded-lg hover:bg-bg-card-hover"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-8 mt-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Get More Credits</h2>
          <p className="text-text-muted">Choose a package to continue generating high-quality content.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg, idx) => (
            <div 
              key={idx}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                pkg.popular 
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                  : 'border-border-main bg-bg-main hover:border-text-muted/30 transition-colors'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="text-center mb-6">
                <div className="text-4xl font-bold mb-1">{pkg.credits}</div>
                <div className="text-text-muted font-medium uppercase tracking-wider text-xs">Credits</div>
              </div>
              <div className="text-center mb-6 flex-1">
                <div className="text-3xl font-bold">${pkg.price}</div>
              </div>
              <button
                onClick={() => {
                  onPurchase(pkg.credits);
                  onClose();
                }}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  pkg.popular
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/20'
                    : 'bg-bg-card border border-border-main text-white hover:bg-bg-card-hover'
                }`}
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
