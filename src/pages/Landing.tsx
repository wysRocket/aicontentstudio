import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';

export default function Landing() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { signInWithGoogle, user } = useFirebase();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to sign in', error);
    }
  };

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.reveal-up');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 bg-bg-nav/90 backdrop-blur-md border-b border-border-nav">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-text-main hover:text-primary transition-colors font-semibold text-lg">
            <svg aria-hidden="true" focusable="false" height="24" viewBox="0 0 1306 1306" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M1161 653c0-114-38-220-101-305-29 22-69 19-95-6-26-26-28-67-7-95-85-64-190-102-305-102-140 0-267 57-359 149-92 92-149 219-149 359 0 140 57 267 149 359 92 92 219 149 359 149 140 0 267-57 359-149 92-92 149-219 149-359zm-100-510l73-73c28-29 74-29 103 0 28 28 28 74 0 102l-74 73c90 112 143 254 143 408 0 180-73 344-191 462-118 118-282 191-462 191-180 0-343-73-462-191-118-118-191-282-191-462 0-180 73-343 191-462 119-118 282-191 462-191 154 0 296 53 408 143zm-214 510c0-107-87-193-194-193-107 0-193 86-193 193 0 107 86 194 193 194 107 0 194-87 194-194z" fill="currentColor"></path>
            </svg>
            <span>AI Content Studio</span>
          </Link>
          <ul className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            <li><a href="#features" className="text-text-muted hover:text-white transition-colors">Features</a></li>
            <li><a href="#how-credits-work" className="text-text-muted hover:text-white transition-colors">How it works</a></li>
            <li><a href="#pricing" className="text-text-muted hover:text-white transition-colors">Pricing</a></li>
            <li><a href="#faq" className="text-text-muted hover:text-white transition-colors">FAQ</a></li>
          </ul>
          <div className="flex items-center gap-3">
            <button onClick={handleSignIn} className="px-4 py-2 rounded-lg text-primary border border-outline-border hover:bg-outline-hover-bg hover:border-outline-hover-border hover:text-white transition-colors text-sm font-medium">Sign in</button>
            <button onClick={handleSignIn} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-sm font-medium">Create account</button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 overflow-hidden min-h-[750px] flex items-center">
          <div className="absolute inset-0 z-0 pointer-events-none hero-art" style={{ backgroundImage: 'url(/images/hero-1600.webp)', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }}></div>
          <div className="absolute inset-0 z-10 pointer-events-none bg-linear-hero"></div>
          <div className="absolute inset-0 z-20 pointer-events-none bg-radial-hero"></div>
          
          <div className="container max-w-6xl mx-auto px-4 relative z-30 hero-content-in">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <h1 className="text-5xl md:text-6xl font-semibold mb-6 tracking-tight leading-tight max-w-[18ch]">
                  <span className="text-primary">AI Content Studio</span>, powered by credits
                </h1>
                <p className="text-xl text-text-muted mb-8 max-w-[62ch] leading-relaxed">
                  Create, rewrite, summarize, and transcribe content with a clear balance, predictable spend, and a complete order history in your account.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <button onClick={handleSignIn} className="px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors font-medium text-lg">Create account</button>
                  <button onClick={handleSignIn} className="px-6 py-3 rounded-xl text-primary border border-outline-border hover:bg-outline-hover-bg hover:border-outline-hover-border hover:text-white transition-colors font-medium text-lg">Sign in</button>
                  <a href="#how-credits-work" className="px-4 py-3 text-primary/85 hover:text-white transition-colors font-medium text-lg">How credits work</a>
                  <a href="#pricing" className="px-4 py-3 text-primary/85 hover:text-white transition-colors font-medium text-lg">Pricing</a>
                  <a href="#faq" className="px-4 py-3 text-primary/85 hover:text-white transition-colors font-medium text-lg">FAQ</a>
                </div>
                <div className="text-sm text-text-muted">Pay as you go. Buy credits only when you need them.</div>
              </div>
              <div className="lg:col-span-4">
                <div className="bg-bg-card border border-border-main rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                  <div className="font-semibold mb-4 text-lg"><span className="text-primary">In your</span> account</div>
                  <ul className="space-y-2 text-text-muted list-disc pl-5 marker:text-primary">
                    <li>Current credit balance</li>
                    <li>Fast credit purchase</li>
                    <li>Orders table with totals</li>
                    <li>Payment methods management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 relative">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="mb-12 reveal-up">
              <h2 className="text-4xl font-semibold mb-4 tracking-tight"><span className="text-primary">Tools</span> designed for real work</h2>
              <p className="text-xl text-text-muted">A focused set of AI tools with predictable usage — powered by your credit balance.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: <> <span className="text-primary">Write</span> &amp; <span className="text-primary">rewrite</span> </>, desc: "Clean drafts, product descriptions, landing copy, and email templates — in your tone.", delay: "0ms" },
                { title: <span className="text-primary">Summarize documents</span>, desc: "Turn long text into structured summaries, key points, and action items.", delay: "110ms" },
                { title: <span className="text-primary">Transcribe audio</span>, desc: "Convert recordings into searchable text, notes, and meeting recaps.", delay: "220ms" },
                { title: <span className="text-primary">Translate content</span>, desc: "Produce consistent multilingual versions for web pages, docs, and product catalogs.", delay: "330ms" }
              ].map((feature, i) => (
                <div key={i} className={`bg-bg-card-hover border border-border-main rounded-2xl p-6 card-hover reveal-up ${i === 0 ? 'outline outline-1 outline-primary outline-offset-[-1px]' : ''}`} style={{ transitionDelay: feature.delay }}>
                  <div className="font-semibold mb-3 text-lg">{feature.title}</div>
                  <div className="text-text-muted leading-relaxed">{feature.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How credits work */}
        <section id="how-credits-work" className="py-20 relative border-y border-border-main">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.65]" style={{ background: 'url(/images/credits-1600.webp) center/contain no-repeat' }}></div>
          <div className="absolute inset-0 z-0 pointer-events-none bg-linear-credits"></div>
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="mb-12 reveal-up">
              <h2 className="text-4xl font-semibold mb-4 tracking-tight"><span className="text-primary">Simple</span> credit-based usage</h2>
              <p className="text-xl text-text-muted">One balance. Transparent costs. Full control over your spending.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { step: "1.", title: "Top up", desc: "Purchase credits in advance and add them to your account balance.", delay: "240ms" },
                { step: "2.", title: "Use tools", desc: "Spend credits when you generate text, summaries, transcripts, or translations.", delay: "120ms" },
                { step: "3.", title: "Track balance", desc: "See usage history and remaining credits in your personal dashboard.", delay: "0ms" }
              ].map((item, i) => (
                <div key={i} className="bg-bg-card-solid border border-border-main rounded-2xl p-6 shadow-xl card-hover reveal-up" style={{ transitionDelay: item.delay }}>
                  <div className="font-semibold mb-3 text-lg"><span className="text-primary">{item.step}</span> {item.title}</div>
                  <div className="text-text-muted leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
            <div className="bg-bg-alert border border-border-main rounded-xl p-5 text-text-alert reveal-up">
              Credits are consumed only for successful operations. No hidden fees or background charges.
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section id="trust" className="py-20 relative overflow-hidden">
          <div className="absolute right-[-120px] top-[90px] w-[500px] h-[450px] pointer-events-none opacity-65 bg-radial-trust z-0"></div>
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="mb-12 reveal-up">
              <h2 className="text-4xl font-semibold mb-4 tracking-tight"><span className="text-primary">Reliable by</span> design</h2>
              <p className="text-xl text-text-muted">Built for stability, transparency, and predictable results.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { title: "Transparent accounting", desc: "Every action has a clear cost in credits. No background usage, no surprises." },
                { title: "Stable infrastructure", desc: "Requests are processed on reliable servers with predictable performance." },
                { title: "Account-level control", desc: "View balance, usage history, and limits directly in your dashboard." }
              ].map((item, i) => (
                <div key={i} className="bg-bg-card-solid border border-border-main rounded-2xl p-6 card-hover reveal-up">
                  <div className="font-semibold mb-3 text-lg"><span className="text-primary">{item.title}</span></div>
                  <div className="text-text-muted leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
            <p className="text-text-muted reveal-up">The system is designed to behave consistently today and tomorrow - without hidden mechanics.</p>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 relative">
          <div className="absolute inset-0 z-0 pointer-events-none pricing-art" style={{ backgroundImage: 'url(/images/pricing-1.webp), url(/images/pricing-2.webp)', backgroundRepeat: 'no-repeat, no-repeat', backgroundPosition: 'left 6% bottom 10%, right 6% top 10%', backgroundSize: '600px auto, 750px auto', opacity: 0.65 }}></div>
          <div className="absolute inset-0 z-0 pointer-events-none bg-radial-pricing opacity-[0.65]"></div>
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="mb-12 reveal-up">
              <h2 className="text-4xl font-semibold mb-4 tracking-tight">Credit packages</h2>
              <p className="text-xl text-text-muted">Simple pricing based on prepaid usage credits.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-bg-card-solid border border-primary rounded-2xl p-8 flex flex-col relative card-hover reveal-up">
                <div className="absolute top-[-10px] right-6 bg-primary text-white text-xs font-bold px-2 py-1 rounded">Most popular</div>
                <h3 className="text-xl font-semibold mb-2">Starter</h3>
                <div className="text-text-muted mb-4">For testing and evaluation</div>
                <div className="text-4xl font-semibold mb-6">1 000 credits</div>
                <ul className="text-text-muted space-y-2 mb-8 flex-1">
                  <li>• Basic API access</li>
                  <li>• Full dashboard visibility</li>
                  <li>• No expiration</li>
                </ul>
                <button onClick={handleSignIn} className="block text-center w-full py-3 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors font-medium">Buy credits</button>
              </div>
              <div className="bg-bg-card-solid border border-border-main rounded-2xl p-8 flex flex-col card-hover reveal-up" style={{ transitionDelay: '120ms' }}>
                <h3 className="text-xl font-semibold mb-2">Professional</h3>
                <div className="text-text-muted mb-4">For production workloads</div>
                <div className="text-4xl font-semibold mb-6">10 000 credits</div>
                <ul className="text-text-muted space-y-2 mb-8 flex-1">
                  <li>• Priority processing</li>
                  <li>• Detailed usage history</li>
                  <li>• Usage alerts</li>
                </ul>
                <button onClick={handleSignIn} className="block text-center w-full py-3 rounded-xl text-primary border border-outline-border hover:bg-outline-hover-bg hover:border-outline-hover-border hover:text-white transition-colors font-medium">Buy credits</button>
              </div>
              <div className="bg-bg-card-solid border border-border-main rounded-2xl p-8 flex flex-col card-hover reveal-up" style={{ transitionDelay: '240ms' }}>
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <div className="text-text-muted mb-4">Custom volumes and limits</div>
                <div className="text-4xl font-semibold mb-6">50 000+ credits</div>
                <ul className="text-text-muted space-y-2 mb-8 flex-1">
                  <li>• Volume discounts</li>
                  <li>• Custom limits</li>
                  <li>• Dedicated support</li>
                </ul>
                <button onClick={handleSignIn} className="block text-center w-full py-3 rounded-xl text-primary border border-outline-border hover:bg-outline-hover-bg hover:border-outline-hover-border hover:text-white transition-colors font-medium">Contact sales</button>
              </div>
            </div>
            <p className="text-text-muted reveal-up">Credits are deducted only for completed operations. Unused balance remains available.</p>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 relative overflow-hidden">
          <div className="absolute left-[-250px] top-[90px] w-[500px] h-[450px] pointer-events-none opacity-75 bg-radial-faq z-0"></div>
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="mb-12 reveal-up">
              <h2 className="text-4xl font-semibold mb-4 tracking-tight"><span className="text-primary">How</span> credits work</h2>
              <p className="text-xl text-text-muted">Clear rules, transparent usage, no hidden limits.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 mb-12">
              <div className="reveal-up">
                <h3 className="text-xl font-semibold mb-3">What is a credit?</h3>
                <p className="text-text-muted leading-relaxed">A credit is a prepaid unit consumed when the platform completes an operation. Different actions may require a different number of credits.</p>
              </div>
              <div className="reveal-up">
                <h3 className="text-xl font-semibold mb-3">Can I track usage?</h3>
                <p className="text-text-muted leading-relaxed">Yes. The dashboard shows real-time balance, usage history and per-operation statistics.</p>
              </div>
              <div className="reveal-up">
                <h3 className="text-xl font-semibold mb-3">When are credits deducted?</h3>
                <p className="text-text-muted leading-relaxed">Credits are deducted only after a successful operation. Failed or cancelled requests do not consume your balance.</p>
              </div>
              <div className="reveal-up">
                <h3 className="text-xl font-semibold mb-3">What happens if I run out of credits?</h3>
                <p className="text-text-muted leading-relaxed">Requests are paused automatically until you top up your balance. No unexpected charges or over-usage.</p>
              </div>
              <div className="reveal-up">
                <h3 className="text-xl font-semibold mb-3">Do credits expire?</h3>
                <p className="text-text-muted leading-relaxed">No. Purchased credits never expire and remain available until fully used.</p>
              </div>
              <div className="reveal-up">
                <h3 className="text-xl font-semibold mb-3">Can I upgrade later?</h3>
                <p className="text-text-muted leading-relaxed">You can purchase additional credit packages at any time. New credits are added to your existing balance.</p>
              </div>
            </div>
            <div className="reveal-up">
              <button onClick={handleSignIn} className="inline-block px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors font-medium text-lg">Get started with credits</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-main py-8">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-text-muted text-sm">© 2026 AI Content Studio</div>
          <div className="flex items-center gap-4">
            <svg height="18" viewBox="0 0 1920 620.07" width="55" xmlns="http://www.w3.org/2000/svg">
              <path d="M728.98,10.95l-251.37,599.74h-164l-123.7-478.62c-7.51-29.48-14.04-40.28-36.88-52.7C115.76,59.14,54.18,40.17,0,28.39L3.68,10.95h263.99c33.65,0,63.9,22.4,71.54,61.15l65.33,347.04L566,10.95h162.98ZM1371.57,414.88c.66-158.29-218.88-167.01-217.37-237.72.47-21.52,20.96-44.4,65.81-50.24,22.23-2.91,83.48-5.13,152.95,26.84l27.25-127.18c-37.33-13.55-85.36-26.59-145.12-26.59-153.35,0-261.27,81.52-262.18,198.25-.99,86.34,77.03,134.52,135.81,163.21,60.47,29.38,80.76,48.26,80.53,74.54-.43,40.23-48.23,57.99-92.9,58.69-77.98,1.2-123.23-21.1-159.3-37.87l-28.12,131.39c36.25,16.63,103.16,31.14,172.53,31.87,162.99,0,269.61-80.51,270.11-205.19M1776.51,610.7h143.49L1794.75,10.95h-132.44c-29.78,0-54.9,17.34-66.02,44l-232.81,555.74h162.91l32.35-89.59h199.05l18.73,89.59ZM1603.4,398.19l81.66-225.18,47,225.18h-128.65ZM950.66,10.95l-128.29,599.74h-155.14L795.57,10.95h155.09Z" fill="#1434cb"></path>
            </svg>
            <svg height="32" viewBox="0 0 152.4 108" width="47" xmlns="http://www.w3.org/2000/svg">
              <g>
                <rect fill="#FF5F00" height="56.6" width="31.5" x="60.4" y="25.7"></rect>
                <path d="M62.4,54c0-11,5.1-21.5,13.7-28.3c-15.6-12.3-38.3-9.6-50.6,6.1C13.3,47.4,16,70,31.7,82.3 c13.1,10.3,31.4,10.3,44.5,0C67.5,75.5,62.4,65,62.4,54z" fill="#EB001B"></path>
                <path d="M134.4,54c0,19.9-16.1,36-36,36c-8.1,0-15.9-2.7-22.2-7.7c15.6-12.3,18.3-34.9,6-50.6c-1.8-2.2-3.8-4.3-6-6 c15.6-12.3,38.3-9.6,50.5,6.1C131.7,38.1,134.4,45.9,134.4,54z" fill="#F79E1B"></path>
              </g>
            </svg>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-text-muted hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-text-muted hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-text-muted hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
