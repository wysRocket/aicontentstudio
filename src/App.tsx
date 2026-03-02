import React, { useState } from 'react';
import { Menu, X, Check, Zap, Shield, CreditCard, Activity, Settings, ArrowRight, Twitter, Github, Linkedin, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InteractiveDemo from './components/InteractiveDemo';
import Testimonials from './components/Testimonials';
import FeatureCarousel from './components/FeatureCarousel';

interface CreditPackage {
  name: string;
  price: string;
  credits: string;
}

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2 font-semibold text-lg tracking-tight text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Zap className="h-5 w-5" />
              </div>
              AI Content Studio
            </a>
            <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
              <a href="#features" className="hover:text-white transition-colors duration-300 ease-in-out">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors duration-300 ease-in-out">How it works</a>
              <a href="#pricing" className="hover:text-white transition-colors duration-300 ease-in-out">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors duration-300 ease-in-out">FAQ</a>
            </nav>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-300 ease-in-out">Sign in</a>
            <a href="#" className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-300 ease-in-out">
              Create account
            </a>
          </div>
          <button 
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors duration-300 ease-in-out"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-4 shadow-lg">
            <nav className="flex flex-col gap-4 text-sm font-medium text-slate-300">
              <a href="#features" className="hover:text-white transition-colors duration-300 ease-in-out" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors duration-300 ease-in-out" onClick={() => setIsMobileMenuOpen(false)}>How it works</a>
              <a href="#pricing" className="hover:text-white transition-colors duration-300 ease-in-out" onClick={() => setIsMobileMenuOpen(false)}>Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors duration-300 ease-in-out" onClick={() => setIsMobileMenuOpen(false)}>FAQ</a>
              <hr className="border-slate-800" />
              <a href="#" className="hover:text-white transition-colors duration-300 ease-in-out">Sign in</a>
              <a href="#" className="inline-flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white text-center transition-all duration-300 ease-in-out">Create account</a>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36 lg:pb-40 bg-slate-900 text-white">
          <div className="absolute inset-0 z-0">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-30"
            >
              <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connection-loop-2740-large.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900"></div>
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-6 text-center lg:text-left"
              >
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
                  AI Content Studio, <br className="hidden lg:block" />
                  <span className="text-indigo-400">powered by credits</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-300 max-w-2xl mx-auto lg:mx-0">
                  Create, rewrite, summarize, and transcribe content with a clear balance, predictable spend, and a complete order history in your account.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <motion.a 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href="#" 
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
                  >
                    Create account
                  </motion.a>
                  <motion.a 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href="#" 
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-slate-800 px-8 py-3.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-slate-700 hover:bg-slate-700 transition-all"
                  >
                    Sign in
                  </motion.a>
                </div>
                <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm font-medium text-slate-400">
                  <a href="#how-it-works" className="hover:text-white flex items-center gap-1 transition-colors">How credits work <ArrowRight className="h-4 w-4" /></a>
                  <a href="#pricing" className="hover:text-white flex items-center gap-1 transition-colors">Pricing <ArrowRight className="h-4 w-4" /></a>
                  <a href="#faq" className="hover:text-white flex items-center gap-1 transition-colors">FAQ <ArrowRight className="h-4 w-4" /></a>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="lg:col-span-6 mt-16 lg:mt-0"
              >
                <div className="relative rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-8 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="pt-12 pb-8 px-6 sm:px-8">
                    <div className="space-y-6">
                      {/* Mockup elements */}
                      <motion.div 
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-900 shadow-sm border border-slate-700 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><CreditCard className="h-6 w-6" /></div>
                          <div>
                            <div className="text-sm font-medium text-white">Current credit balance</div>
                            <div className="text-xs text-slate-400">Available for all tools</div>
                          </div>
                        </div>
                        <div className="text-xl font-bold text-white">2,450</div>
                      </motion.div>
                      
                      <motion.div 
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-900 shadow-sm border border-slate-700 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg group-hover:bg-emerald-500/30 transition-colors"><Zap className="h-6 w-6" /></div>
                          <div>
                            <div className="text-sm font-medium text-white">Fast credit purchase</div>
                            <div className="text-xs text-slate-400">Instant top-up</div>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 transition-colors text-white rounded-md">Buy now</button>
                      </motion.div>

                      <motion.div 
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-900 shadow-sm border border-slate-700 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg group-hover:bg-blue-500/30 transition-colors"><Activity className="h-6 w-6" /></div>
                          <div>
                            <div className="text-sm font-medium text-white">Orders table with totals</div>
                            <div className="text-xs text-slate-400">Full history</div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </motion.div>

                      <motion.div 
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-900 shadow-sm border border-slate-700 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg group-hover:bg-purple-500/30 transition-colors"><Settings className="h-6 w-6" /></div>
                          <div>
                            <div className="text-sm font-medium text-white">Payment methods</div>
                            <div className="text-xs text-slate-400">Manage cards</div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-slate-50 border-y border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Tools designed for real work</h2>
              <p className="mt-4 text-lg text-slate-600">A focused set of AI tools with predictable usage — powered by your credit balance.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6"
                >
                  <Zap className="h-6 w-6" />
                </motion.div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Tools designed for real work</h3>
                <p className="text-slate-600 leading-relaxed">A focused set of AI tools with predictable usage — powered by your credit balance. Create, rewrite, summarize, and transcribe efficiently.</p>
              </div>
              
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.2 }}
                  className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6"
                >
                  <CreditCard className="h-6 w-6" />
                </motion.div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Simple credit-based usage</h3>
                <p className="text-slate-600 leading-relaxed">One balance. Transparent costs. Full control over your spending. Never worry about unexpected subscription charges again.</p>
              </div>
              
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 0.4 }}
                  className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6"
                >
                  <Shield className="h-6 w-6" />
                </motion.div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Reliable by design</h3>
                <p className="text-slate-600 leading-relaxed">Built for stability, transparency, and predictable results. The system is designed to behave consistently today and tomorrow - without hidden mechanics.</p>
              </div>
            </div>

            <FeatureCarousel />
          </div>
        </section>

        <InteractiveDemo />
        <Testimonials />

        {/* Company Logos Section */}
        <section className="py-16 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500 mb-8">
              Trusted by innovative teams worldwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60 grayscale transition-all duration-500 hover:grayscale-0 hover:opacity-100">
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800"><Zap className="h-6 w-6 text-indigo-600"/> Acme Corp</div>
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800"><Shield className="h-6 w-6 text-blue-600"/> Globex</div>
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800"><Activity className="h-6 w-6 text-emerald-600"/> Soylent</div>
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800"><Settings className="h-6 w-6 text-slate-600"/> Initech</div>
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800"><Check className="h-6 w-6 text-purple-600"/> Umbrella</div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-20"
            >
              <source src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-network-of-connections-13000-large.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-slate-900/80"></div>
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Credit packages</h2>
              <p className="mt-4 text-lg text-slate-400">Simple pricing based on prepaid usage credits. Credits are deducted only for completed operations. Unused balance remains available.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Starter */}
              <div className="rounded-3xl border border-slate-700 bg-slate-800 p-8 shadow-sm flex flex-col">
                <h3 className="text-lg font-semibold text-white">Starter</h3>
                <p className="mt-2 text-sm text-slate-400">Perfect for trying out the platform.</p>
                <div className="mt-6 flex items-baseline gap-x-2">
                  <span className="text-4xl font-bold tracking-tight text-white">$10</span>
                  <span className="text-sm font-semibold leading-6 text-slate-400">/ 1,000 credits</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm leading-6 text-slate-300 flex-1">
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> Basic API access</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> Full dashboard visibility</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> No expiration</li>
                </ul>
                <button 
                  onClick={(e) => { e.preventDefault(); setSelectedPackage({ name: 'Starter', price: '$10', credits: '1,000' }); }}
                  className="mt-8 block w-full rounded-full bg-slate-700 px-3 py-3 text-center text-sm font-semibold text-white hover:bg-slate-600 transition-colors"
                >
                  Buy credits
                </button>
              </div>

              {/* Professional */}
              <div className="rounded-3xl border-2 border-indigo-500 bg-slate-800 p-8 shadow-[0_0_30px_rgba(99,102,241,0.3)] flex flex-col relative transform md:-translate-y-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-4 py-1 text-xs font-semibold text-white uppercase tracking-wider shadow-md">Most Popular</div>
                <h3 className="text-lg font-semibold text-white">Professional</h3>
                <p className="mt-2 text-sm text-slate-400">For regular content creators.</p>
                <div className="mt-6 flex items-baseline gap-x-2">
                  <span className="text-4xl font-bold tracking-tight text-white">$45</span>
                  <span className="text-sm font-semibold leading-6 text-slate-400">/ 5,000 credits</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm leading-6 text-slate-300 flex-1">
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> Priority processing</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> Detailed usage history</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> Usage alerts</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> 10% volume discount</li>
                </ul>
                <button 
                  onClick={(e) => { e.preventDefault(); setSelectedPackage({ name: 'Professional', price: '$45', credits: '5,000' }); }}
                  className="mt-8 block w-full rounded-full bg-indigo-600 px-3 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors"
                >
                  Buy credits
                </button>
              </div>

              {/* Enterprise */}
              <div className="rounded-3xl border border-slate-700 bg-slate-800 p-8 shadow-sm flex flex-col">
                <h3 className="text-lg font-semibold text-white">Enterprise</h3>
                <p className="mt-2 text-sm text-slate-400">For teams and high-volume usage.</p>
                <div className="mt-6 flex items-baseline gap-x-2">
                  <span className="text-4xl font-bold tracking-tight text-white">$200</span>
                  <span className="text-sm font-semibold leading-6 text-slate-400">/ 25,000 credits</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm leading-6 text-slate-300 flex-1">
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> Volume discounts</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> Custom limits</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> Dedicated support</li>
                  <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-indigo-400" /> API consulting</li>
                </ul>
                <a href="#" className="mt-8 block rounded-full bg-slate-700 px-3 py-3 text-center text-sm font-semibold text-white hover:bg-slate-600 transition-colors">Contact sales</a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-slate-900 border-t border-slate-800 relative overflow-hidden text-white">
          <div className="absolute inset-0 z-0">
            <img src="/img/credits-1600.webp" alt="" className="w-full h-full object-cover opacity-20" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-slate-900/80"></div>
          </div>
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl" id="how-it-works">How credits work</h2>
              <p className="mt-4 text-lg text-slate-400">Clear rules, transparent usage, no hidden limits.</p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700">
                <h3 className="text-lg font-semibold text-white">What is a credit?</h3>
                <p className="mt-2 text-slate-300">A credit is a prepaid unit consumed when the platform completes an operation. Different actions may require a different number of credits.</p>
              </div>
              
              <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700">
                <h3 className="text-lg font-semibold text-white">When are credits deducted?</h3>
                <p className="mt-2 text-slate-300">Credits are deducted only after a successful operation. Failed or cancelled requests do not consume your balance.</p>
              </div>
              
              <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700">
                <h3 className="text-lg font-semibold text-white">Do credits expire?</h3>
                <p className="mt-2 text-slate-300">No. Purchased credits never expire and remain available until fully used.</p>
              </div>
              
              <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700">
                <h3 className="text-lg font-semibold text-white">Can I track usage?</h3>
                <p className="mt-2 text-slate-300">Yes. The dashboard shows real-time balance, usage history and per-operation statistics.</p>
              </div>
              
              <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700">
                <h3 className="text-lg font-semibold text-white">What happens if I run out of credits?</h3>
                <p className="mt-2 text-slate-300">Requests are paused automatically until you top up your balance. No unexpected charges or over-usage.</p>
              </div>
              
              <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700">
                <h3 className="text-lg font-semibold text-white">Can I upgrade later?</h3>
                <p className="mt-2 text-slate-300">You can purchase additional credit packages at any time. New credits are added to your existing balance.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src="/img/pricing-2.webp" alt="" className="w-full h-full object-cover opacity-20" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-slate-900/80"></div>
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl px-6 py-16 sm:p-16 text-center shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500 opacity-20 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-500 opacity-20 blur-3xl"></div>
              
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl relative z-10">Ready to start creating?</h2>
              <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto relative z-10">Join thousands of creators using AI Content Studio to scale their content production with predictable costs.</p>
              <div className="mt-10 flex justify-center relative z-10">
                <a href="#" className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-10 py-5 text-lg font-bold text-white shadow-xl shadow-indigo-500/25 hover:bg-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 hover:-translate-y-1">
                  Get started with credits
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 py-16 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-2 font-semibold text-xl tracking-tight text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Zap className="h-5 w-5" />
                </div>
                AI Content Studio
              </div>
              <p className="text-sm text-slate-400 max-w-xs text-center md:text-left">
                Empowering creators with predictable, high-quality AI content generation.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 text-sm font-medium text-slate-400">
              <a href="#features" className="hover:text-white transition-colors duration-300 ease-in-out">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors duration-300 ease-in-out">How it works</a>
              <a href="#pricing" className="hover:text-white transition-colors duration-300 ease-in-out">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors duration-300 ease-in-out">FAQ</a>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} AI Content Studio. All rights reserved.
              </div>
              <div className="hidden md:block w-px h-4 bg-slate-700"></div>
              <div className="flex gap-6 text-sm text-slate-500">
                <a href="#" className="hover:text-white transition-colors duration-300 ease-in-out">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors duration-300 ease-in-out">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors duration-300 ease-in-out">Contact Us</a>
              </div>
            </div>
            
            <div className="flex items-center gap-5 text-slate-500">
              <a href="#" className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all duration-300 ease-in-out">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all duration-300 ease-in-out">
                <span className="sr-only">GitHub</span>
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all duration-300 ease-in-out">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Purchase Confirmation Modal */}
      <AnimatePresence>
        {selectedPackage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPackage(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 mb-6">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Confirm Purchase</h3>
                <p className="text-slate-400 mb-6">You are about to purchase the {selectedPackage.name} credit package.</p>
                
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-8">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Package</span>
                    <span className="font-medium text-white">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-700">
                    <span className="text-slate-400">Credits</span>
                    <span className="font-medium text-white">{selectedPackage.credits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Price</span>
                    <span className="text-xl font-bold text-white">{selectedPackage.price}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedPackage(null)}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors border border-slate-700"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      alert(`Successfully purchased ${selectedPackage.name} package!`);
                      setSelectedPackage(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors shadow-sm"
                  >
                    Confirm Pay
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
