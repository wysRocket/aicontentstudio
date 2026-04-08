import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFirebase } from "../contexts/FirebaseContext";

const heroBackgroundUrl = new URL(
  "../../images/hero-1600.webp",
  import.meta.url,
).href;
const creditsBackgroundUrl = new URL(
  "../../images/credits-1600.webp",
  import.meta.url,
).href;
const pricingBackgroundLeftUrl = new URL(
  "../../images/pricing-1.webp",
  import.meta.url,
).href;
const pricingBackgroundRightUrl = new URL(
  "../../images/pricing-2.webp",
  import.meta.url,
).href;
const featuresBackgroundUrl = new URL(
  "../../images/credits-1600.webp",
  import.meta.url,
).href;

export default function Landing() {
  const { user } = useFirebase();
  const navigate = useNavigate();

  const landingArtStyles = {
    "--landing-hero-url": `url(${heroBackgroundUrl})`,
    "--landing-credits-url": `url(${creditsBackgroundUrl})`,
    "--landing-pricing-left-url": `url(${pricingBackgroundLeftUrl})`,
    "--landing-pricing-right-url": `url(${pricingBackgroundRightUrl})`,
    "--landing-features-url": `url(${featuresBackgroundUrl})`,
  } as React.CSSProperties;

  const goToAuth = (mode: "signin" | "signup") => {
    navigate(`/auth?mode=${mode}`);
  };

  const goToDashboard = () => {
    navigate("/dashboard");
  };

  useEffect(() => {
    // If the user prefers reduced motion, immediately reveal all animated
    // elements and skip the scroll-driven animation controller entirely.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      document.querySelectorAll<HTMLElement>(".landing .reveal-ready").forEach((el) => {
        el.classList.remove("reveal-ready");
        el.classList.add("is-visible", "no-motion");
      });
      // Also trigger background reveal classes so section backgrounds appear
      document
        .querySelectorAll<HTMLElement>(".landing .credits, .landing .pricing")
        .forEach((el) => el.classList.add("bg-reveal-on"));
      return;
    }

    let lastY = window.scrollY || 0;
    let dir: "up" | "down" = "down";
    const timeouts = new Set<number>();

    const queue = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        timeouts.delete(timeoutId);
        callback();
      }, delay);
      timeouts.add(timeoutId);
    };

    const clearAllTimeouts = () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeouts.clear();
    };

    const isDesktop = () =>
      window.matchMedia("(min-width: 992px)").matches;

    const markReady = (element: Element | null) => {
      if (!(element instanceof HTMLElement)) return;
      element.classList.add("reveal-ready");
      element.classList.remove("is-visible", "no-motion");
    };

    const showAnimated = (element: Element | null) => {
      if (!(element instanceof HTMLElement)) return;
      element.classList.remove("no-motion", "reveal-ready");
      element.classList.add("is-visible");
    };

    const showInstant = (element: Element | null) => {
      if (!(element instanceof HTMLElement)) return;
      element.classList.remove("reveal-ready");
      element.classList.add("is-visible", "no-motion");
    };

    const setStaggerDelay = (element: Element | null, ms: number) => {
      if (!(element instanceof HTMLElement)) return;
      element.style.setProperty("--delay", `${Math.max(0, ms)}ms`);
    };

    const topEdgeInView = (element: Element | null, threshold = 0.9) => {
      if (!(element instanceof HTMLElement)) return false;
      const rect = element.getBoundingClientRect();
      return rect.top <= window.innerHeight * threshold;
    };

    const shouldResetBecauseBelowViewport = (section: Element | null) => {
      if (!(section instanceof HTMLElement)) return false;
      return section.getBoundingClientRect().top >= window.innerHeight;
    };

    const bgEarlyInView = (section: Element | null, threshold = 1.06) =>
      topEdgeInView(section, threshold);

    type SectionController = { update: () => void };
    const sections: SectionController[] = [];

    const features = (() => {
      const section = document.querySelector(".landing .features");
      if (!section) return null;

      const h2 = section.querySelector("h2");
      const lead = section.querySelector("p.lead");
      const cards = Array.from(section.querySelectorAll(".card"));
      const state = { played: false, headerShown: false };

      const reset = () => {
        state.played = false;
        state.headerShown = false;
        markReady(h2);
        markReady(lead);
        cards.forEach((card) => {
          markReady(card);
          if (card instanceof HTMLElement) card.style.removeProperty("--delay");
        });
      };

      const playHeaderDown = () => {
        if (state.headerShown) return;
        showAnimated(h2);
        queue(() => showAnimated(lead), 90);
        state.headerShown = true;
      };

      const playCardsDown = () => {
        const step = isDesktop() ? 110 : 140;
        cards.forEach((card, index) => {
          setStaggerDelay(card, index * step);
          queue(() => showAnimated(card), index * step);
        });
      };

      const showUpInstant = () => {
        showInstant(h2);
        showInstant(lead);
        cards.forEach(showInstant);
        state.played = true;
        state.headerShown = true;
      };

      const update = () => {
        if (dir === "up") {
          if (!state.played) {
            const rect = section.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) showUpInstant();
          }
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        if (state.played) {
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        const anchor = lead || cards[0] || h2;
        if (topEdgeInView(anchor, 0.92)) {
          playHeaderDown();
          queue(playCardsDown, 110);
          state.played = true;
        }
      };

      reset();
      return { update };
    })();

    if (features) sections.push(features);

    const credits = (() => {
      const section = document.querySelector(".landing .credits");
      if (!section) return null;

      const h2 = section.querySelector("h2");
      const lead = section.querySelector("p.lead");
      const cards = Array.from(section.querySelectorAll(".card"));
      const alert = section.querySelector(".credits-alert");
      const state = { played: false, headerShown: false, bgPlayed: false };

      const reset = () => {
        state.played = false;
        state.headerShown = false;
        state.bgPlayed = false;
        section.classList.remove("bg-reveal-on");
        markReady(h2);
        markReady(lead);
        cards.forEach((card) => {
          markReady(card);
          if (card instanceof HTMLElement) card.style.removeProperty("--delay");
        });
        markReady(alert);
      };

      const playHeaderDown = () => {
        if (state.headerShown) return;
        showAnimated(h2);
        queue(() => showAnimated(lead), 90);
        state.headerShown = true;
      };

      const playCardsDown = () => {
        // Desktop: left-to-right, faster cascade (cards 0→1→2, 110 ms apart)
        // Mobile: left-to-right, slightly slower for single-column stacking (160 ms apart)
        const order = [...cards].filter(Boolean);
        const step = isDesktop() ? 110 : 160;
        order.forEach((card, index) => {
          setStaggerDelay(card, index * step);
          queue(() => showAnimated(card), index * step);
        });
        if (alert) {
          queue(() => showAnimated(alert), order.length * step + 160);
        }
      };

      const showUpInstant = () => {
        showInstant(h2);
        showInstant(lead);
        cards.forEach(showInstant);
        showInstant(alert);
        state.played = true;
        state.headerShown = true;
      };

      const update = () => {
        if (dir === "up") {
          if (!state.bgPlayed && bgEarlyInView(section, 0.45)) {
            section.classList.add("bg-reveal-on");
            state.bgPlayed = true;
          }
          if (!state.played) {
            const rect = section.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) showUpInstant();
          }
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        if (!state.bgPlayed && bgEarlyInView(section, 0.45)) {
          section.classList.add("bg-reveal-on");
          state.bgPlayed = true;
        }

        if (state.played) {
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        const anchor = cards[0] || h2;
        if (topEdgeInView(anchor, 0.9)) {
          playHeaderDown();
          queue(playCardsDown, 110);
          state.played = true;
        }
      };

      reset();
      return { update };
    })();

    if (credits) sections.push(credits);

    const trust = (() => {
      const section = document.querySelector(".landing .trust");
      if (!section) return null;

      const h2 = section.querySelector("h2");
      const lead = section.querySelector("p.lead");
      const cards = Array.from(section.querySelectorAll(".card"));
      const bottomText = section.querySelector(".trust-tail");
      const state = { played: false, headerShown: false };

      const reset = () => {
        state.played = false;
        state.headerShown = false;
        markReady(h2);
        markReady(lead);
        cards.forEach((card) => {
          markReady(card);
          if (card instanceof HTMLElement) card.style.removeProperty("--delay");
        });
        markReady(bottomText);
      };

      const playHeaderDown = () => {
        if (state.headerShown) return;
        showAnimated(h2);
        queue(() => showAnimated(lead), 90);
        state.headerShown = true;
      };

      const playCardsDown = () => {
        if (isDesktop()) {
          cards.forEach((card) => {
            setStaggerDelay(card, 0);
            showAnimated(card);
          });
          if (bottomText) queue(() => showAnimated(bottomText), 170);
          return;
        }

        const step = 140;
        cards.forEach((card, index) => {
          setStaggerDelay(card, index * step);
          queue(() => showAnimated(card), index * step);
        });
        if (bottomText) queue(() => showAnimated(bottomText), cards.length * step + 170);
      };

      const showUpInstant = () => {
        showInstant(h2);
        showInstant(lead);
        cards.forEach(showInstant);
        showInstant(bottomText);
        state.played = true;
        state.headerShown = true;
      };

      const update = () => {
        if (dir === "up") {
          if (!state.played) {
            const rect = section.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) showUpInstant();
          }
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        if (state.played) {
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        const anchor = cards[0] || h2;
        if (topEdgeInView(anchor, 0.9)) {
          playHeaderDown();
          queue(playCardsDown, 110);
          state.played = true;
        }
      };

      reset();
      return { update };
    })();

    if (trust) sections.push(trust);

    const pricing = (() => {
      const section = document.querySelector(".landing .pricing");
      if (!section) return null;

      const h2 = section.querySelector("h2");
      const lead = section.querySelector("p.lead");
      const cards = Array.from(section.querySelectorAll(".card"));
      const bottomText = section.querySelector(".pricing-tail");
      const state = { played: false, headerShown: false, bgPlayed: false };

      const reset = () => {
        state.played = false;
        state.headerShown = false;
        state.bgPlayed = false;
        section.classList.remove("bg-reveal-on");
        markReady(h2);
        markReady(lead);
        cards.forEach((card) => {
          markReady(card);
          if (card instanceof HTMLElement) card.style.removeProperty("--delay");
        });
        markReady(bottomText);
      };

      const playHeaderDown = () => {
        if (state.headerShown) return;
        showAnimated(h2);
        queue(() => showAnimated(lead), 90);
        state.headerShown = true;
      };

      const playCardsDown = () => {
        const step = isDesktop() ? 120 : 140;
        cards.forEach((card, index) => {
          setStaggerDelay(card, index * step);
          queue(() => showAnimated(card), index * step);
        });
        if (bottomText) queue(() => showAnimated(bottomText), cards.length * step + 170);
      };

      const showUpInstant = () => {
        showInstant(h2);
        showInstant(lead);
        cards.forEach(showInstant);
        showInstant(bottomText);
        state.played = true;
        state.headerShown = true;
      };

      const update = () => {
        if (dir === "up") {
          if (!state.bgPlayed && bgEarlyInView(section, 0.8)) {
            section.classList.add("bg-reveal-on");
            state.bgPlayed = true;
          }
          if (!state.played) {
            const rect = section.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) showUpInstant();
          }
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        if (!state.bgPlayed && bgEarlyInView(section, 0.8)) {
          section.classList.add("bg-reveal-on");
          state.bgPlayed = true;
        }

        if (state.played) {
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        const anchor = cards[0] || h2;
        if (topEdgeInView(anchor, 0.9)) {
          playHeaderDown();
          queue(playCardsDown, 110);
          state.played = true;
        }
      };

      reset();
      return { update };
    })();

    if (pricing) sections.push(pricing);

    const faq = (() => {
      const section = document.querySelector(".landing .faq");
      if (!section) return null;

      const h2 = section.querySelector("h2");
      const lead = section.querySelector("p.lead");
      const items = Array.from(section.querySelectorAll(".faq-item"));
      const button = section.querySelector(".faq-cta");
      const firstQuestion = items[0]?.querySelector("h3") ?? null;
      const state = { played: false, headerShown: false };

      const reset = () => {
        state.played = false;
        state.headerShown = false;
        markReady(h2);
        markReady(lead);
        items.forEach((item) => {
          markReady(item);
          if (item instanceof HTMLElement) item.style.removeProperty("--delay");
        });
        markReady(button);
      };

      const playHeaderDown = () => {
        if (state.headerShown) return;
        showAnimated(h2);
        queue(() => showAnimated(lead), 90);
        state.headerShown = true;
      };

      const playItemsDown = () => {
        const step = isDesktop() ? 90 : 110;
        items.forEach((item, index) => {
          setStaggerDelay(item, index * step);
          queue(() => showAnimated(item), index * step);
        });
        if (button) queue(() => showAnimated(button), items.length * step + 80);
      };

      const showUpInstant = () => {
        showInstant(h2);
        showInstant(lead);
        items.forEach(showInstant);
        showInstant(button);
        state.played = true;
        state.headerShown = true;
      };

      const update = () => {
        if (dir === "up") {
          if (!state.played) {
            const rect = section.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) showUpInstant();
          }
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        if (state.played) {
          if (shouldResetBecauseBelowViewport(section)) reset();
          return;
        }

        const headerAnchor = lead || h2 || section;
        if (!state.headerShown && topEdgeInView(headerAnchor, 0.98)) {
          playHeaderDown();
        }

        const itemsAnchor = firstQuestion || items[0] || h2;
        if (topEdgeInView(itemsAnchor, 0.88)) {
          playHeaderDown();
          queue(playItemsDown, 80);
          state.played = true;
        }
      };

      reset();
      return { update };
    })();

    if (faq) sections.push(faq);

    let rafId = 0;
    const updateAll = () => sections.forEach((section) => section.update());

    const onScrollOrResize = () => {
      const y = window.scrollY || 0;
      dir = y < lastY ? "up" : "down";
      lastY = y;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(updateAll);
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    rafId = window.requestAnimationFrame(updateAll);

    return () => {
      clearAllTimeouts();
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 bg-bg-nav/90 backdrop-blur-md border-b border-border-nav">
        <div className="max-w-6xl mx-auto px-5 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-text-main hover:text-primary transition-colors font-semibold text-base sm:text-lg"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              height="24"
              viewBox="0 0 1306 1306"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1161 653c0-114-38-220-101-305-29 22-69 19-95-6-26-26-28-67-7-95-85-64-190-102-305-102-140 0-267 57-359 149-92 92-149 219-149 359 0 140 57 267 149 359 92 92 219 149 359 149 140 0 267-57 359-149 92-92 149-219 149-359zm-100-510l73-73c28-29 74-29 103 0 28 28 28 74 0 102l-74 73c90 112 143 254 143 408 0 180-73 344-191 462-118 118-282 191-462 191-180 0-343-73-462-191-118-118-191-282-191-462 0-180 73-343 191-462 119-118 282-191 462-191 154 0 296 53 408 143zm-214 510c0-107-87-193-194-193-107 0-193 86-193 193 0 107 86 194 193 194 107 0 194-87 194-194z"
                fill="currentColor"
              ></path>
            </svg>
            <span>AI Content Studio</span>
          </Link>
          <ul className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            <li>
              <a
                href="#features"
                className="text-text-muted hover:text-white transition-colors"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#how-credits-work"
                className="text-text-muted hover:text-white transition-colors"
              >
                How it works
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                className="text-text-muted hover:text-white transition-colors"
              >
                Pricing
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className="text-text-muted hover:text-white transition-colors"
              >
                FAQ
              </a>
            </li>
          </ul>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <button
                onClick={goToDashboard}
                className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-xs sm:text-sm font-medium"
              >
                Open dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => goToAuth("signin")}
                  className="px-3 py-2 rounded-lg text-primary border border-outline-border hover:bg-outline-hover-bg hover:border-outline-hover-border hover:text-white transition-colors text-xs sm:text-sm font-medium"
                >
                  Sign in
                </button>
                <button
                  onClick={() => goToAuth("signup")}
                  className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-xs sm:text-sm font-medium"
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="landing flex-1" style={landingArtStyles}>
        {/* Hero Section */}
        <section className="hero flex items-center">
          <div className="hero__art" aria-hidden="true"></div>

          <div className="container hero__content max-w-6xl mx-auto px-5 sm:px-6">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <h1 className="mb-5 max-w-[18ch] text-[1.85rem] font-semibold leading-[0.95] tracking-[-0.05em] sm:mb-6 sm:text-[2.5rem] lg:text-[2.5rem]">
                  <span className="block text-primary">AI Content Studio,</span>
                  <span className="mt-1 block text-text-main">powered by credits</span>
                </h1>
                <p className="lead mb-7 max-w-[58ch] text-[15px] leading-6 text-text-muted sm:mb-8 sm:text-lg sm:leading-7 md:text-[1.15rem] md:leading-relaxed">
                  Create, rewrite, summarize, and transcribe content with a
                  clear balance, predictable spend, and a complete order history
                  in your account.
                </p>
                <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:flex-wrap">
                  {user ? (
                    <button
                      onClick={goToDashboard}
                      className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:w-auto sm:px-6 sm:text-base"
                    >
                      Open dashboard
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => goToAuth("signup")}
                        className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:w-auto sm:px-6 sm:text-base"
                      >
                        Create account
                      </button>
                      <button
                        onClick={() => goToAuth("signin")}
                        className="w-full rounded-xl border border-outline-border px-5 py-3 text-sm font-medium text-primary transition-colors hover:bg-outline-hover-bg hover:border-outline-hover-border hover:text-white sm:w-auto sm:px-6 sm:text-base"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                  <a
                    href="#how-credits-work"
                    className="hero-link px-1 py-2 transition-colors hover:text-white sm:px-4 sm:py-3"
                  >
                    How credits work
                  </a>
                  <a
                    href="#pricing"
                    className="hero-link px-1 py-2 transition-colors hover:text-white sm:px-4 sm:py-3"
                  >
                    Pricing
                  </a>
                  <a
                    href="#faq"
                    className="hero-link px-1 py-2 transition-colors hover:text-white sm:px-4 sm:py-3"
                  >
                    FAQ
                  </a>
                </div>
                <div className="text-sm text-text-muted">
                  Pay as you go. Buy credits only when you need them.
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="card bg-bg-card border border-border-main rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                  <div className="font-semibold mb-4 text-lg">
                    <span className="text-primary">In your</span> account
                  </div>
                  <ul className="space-y-2 text-white/80 list-disc pl-5 marker:text-primary">
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
        <section id="features" className="features">
          <div className="container max-w-6xl mx-auto px-5 sm:px-6">
            <div className="mb-12">
              <h2 className="text-[1.9rem] font-semibold mb-4 tracking-tight sm:text-4xl">
                <span className="text-primary">Tools</span> designed for real
                work
              </h2>
              <p className="lead text-[15px] text-text-muted sm:text-xl">
                A focused set of AI tools with predictable usage — powered by
                your credit balance.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: (
                    <>
                      {" "}
                      <span className="text-primary">Write</span> &amp;{" "}
                      <span className="text-primary">rewrite</span>{" "}
                    </>
                  ),
                  desc: "Clean drafts, product descriptions, landing copy, and email templates — in your tone.",
                  delay: "0ms",
                },
                {
                  title: (
                    <span className="text-primary">Summarize documents</span>
                  ),
                  desc: "Turn long text into structured summaries, key points, and action items.",
                  delay: "110ms",
                },
                {
                  title: <span className="text-primary">Transcribe audio</span>,
                  desc: "Convert recordings into searchable text, notes, and meeting recaps.",
                  delay: "220ms",
                },
                {
                  title: (
                    <span className="text-primary">Translate content</span>
                  ),
                  desc: "Produce consistent multilingual versions for web pages, docs, and product catalogs.",
                  delay: "330ms",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`card bg-bg-card-hover border border-border-main rounded-2xl p-6 card-hover ${i === 0 ? "outline outline-1 outline-primary outline-offset-[-1px]" : ""}`}
                >
                  <div className="font-semibold mb-3 text-lg">
                    {feature.title}
                  </div>
                  <div className="text-text-muted leading-relaxed">
                    {feature.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How credits work */}
        <section
          id="how-credits-work"
          className="credits border-y border-border-main"
        >
          <div className="container max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
            <div className="mb-12">
              <h2 className="text-[1.9rem] font-semibold mb-4 tracking-tight sm:text-4xl">
                <span className="text-primary">Simple</span> credit-based usage
              </h2>
              <p className="lead text-[15px] text-text-muted sm:text-xl">
                One balance. Transparent costs. Full control over your spending.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                {
                  step: "1.",
                  title: "Top up",
                  desc: "Purchase credits in advance and add them to your account balance.",
                  delay: "240ms",
                },
                {
                  step: "2.",
                  title: "Use tools",
                  desc: "Spend credits when you generate text, summaries, transcripts, or translations.",
                  delay: "120ms",
                },
                {
                  step: "3.",
                  title: "Track balance",
                  desc: "See usage history and remaining credits in your personal dashboard.",
                  delay: "0ms",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`card credits-card rounded-2xl border border-border-main bg-bg-card-solid p-6 shadow-xl card-hover ${
                    i === 0
                      ? "credits-card-left"
                      : i === 1
                        ? "credits-card-center"
                        : "credits-card-right"
                  }`}
                >
                  <div className="font-semibold mb-3 text-lg">
                    <span className="text-primary">{item.step}</span>{" "}
                    {item.title}
                  </div>
                  <div className="text-text-muted leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
            <div className="credits-alert bg-bg-alert border border-border-main rounded-xl p-5 text-text-alert">
              Credits are consumed only for successful operations. No hidden
              fees or background charges.
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section id="trust" className="trust">
          <div className="container max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
            <div className="mb-12">
              <h2 className="text-[1.9rem] font-semibold mb-4 tracking-tight sm:text-4xl">
                <span className="text-primary">Reliable by</span> design
              </h2>
              <p className="lead text-[15px] text-text-muted sm:text-xl">
                Built for stability, transparency, and predictable results.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                {
                  title: "Transparent accounting",
                  desc: "Every action has a clear cost in credits. No background usage, no surprises.",
                },
                {
                  title: "Stable infrastructure",
                  desc: "Requests are processed on reliable servers with predictable performance.",
                },
                {
                  title: "Account-level control",
                  desc: "View balance, usage history, and limits directly in your dashboard.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="card bg-bg-card-solid border border-border-main rounded-2xl p-6 card-hover"
                >
                  <div className="font-semibold mb-3 text-lg">
                    <span className="text-primary">{item.title}</span>
                  </div>
                  <div className="text-text-muted leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
            <p className="trust-tail text-text-muted mb-0">
              The system is designed to behave consistently today and tomorrow -
              without hidden mechanics.
            </p>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="pricing">
          <div className="container max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
            <div className="mb-12">
              <h2 className="text-[1.9rem] font-semibold mb-4 tracking-tight sm:text-4xl">
                Credit packages
              </h2>
              <p className="lead text-[15px] text-text-muted sm:text-xl">
                Simple pricing based on prepaid usage credits.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="card bg-bg-card-solid border border-primary rounded-2xl p-8 flex flex-col relative card-hover">
                <div className="absolute top-[-10px] right-6 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
                  Most popular
                </div>
                <h3 className="text-xl font-semibold mb-2">Starter</h3>
                <div className="text-text-muted mb-4">
                  For testing and evaluation
                </div>
                <div className="text-4xl font-semibold mb-6">1 000 credits</div>
                <ul className="text-text-muted space-y-2 mb-8 flex-1">
                  <li>• Basic API access</li>
                  <li>• Full dashboard visibility</li>
                  <li>• No expiration</li>
                </ul>
                <button
                  onClick={() => goToAuth("signup")}
                  className="block text-center w-full py-3 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors font-medium"
                >
                  Buy credits
                </button>
              </div>
              <div
                className="card bg-bg-card-solid border border-border-main rounded-2xl p-8 flex flex-col card-hover"
              >
                <h3 className="text-xl font-semibold mb-2">Professional</h3>
                <div className="text-text-muted mb-4">
                  For production workloads
                </div>
                <div className="text-4xl font-semibold mb-6">
                  10 000 credits
                </div>
                <ul className="text-text-muted space-y-2 mb-8 flex-1">
                  <li>• Priority processing</li>
                  <li>• Detailed usage history</li>
                  <li>• Usage alerts</li>
                </ul>
                <button
                  onClick={() => goToAuth("signup")}
                  className="block text-center w-full py-3 rounded-xl text-primary border border-outline-border hover:bg-outline-hover-bg hover:border-outline-hover-border hover:text-white transition-colors font-medium"
                >
                  Buy credits
                </button>
              </div>
              <div
                className="card bg-bg-card-solid border border-border-main rounded-2xl p-8 flex flex-col card-hover"
              >
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <div className="text-text-muted mb-4">
                  Custom volumes and limits
                </div>
                <div className="text-4xl font-semibold mb-6">
                  50 000+ credits
                </div>
                <ul className="text-text-muted space-y-2 mb-8 flex-1">
                  <li>• Volume discounts</li>
                  <li>• Custom limits</li>
                  <li>• Dedicated support</li>
                </ul>
                <button
                  onClick={() => goToAuth("signup")}
                  className="block text-center w-full py-3 rounded-xl text-primary border border-outline-border hover:bg-outline-hover-bg hover:border-outline-hover-border hover:text-white transition-colors font-medium"
                >
                  Contact sales
                </button>
              </div>
            </div>
            <p className="pricing-tail text-text-muted mb-0">
              Credits are deducted only for completed operations. Unused balance
              remains available.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="faq">
          <div className="container max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
            <div className="mb-12">
              <h2 className="text-[1.9rem] font-semibold mb-4 tracking-tight sm:text-4xl">
                <span className="text-primary">How</span> credits work
              </h2>
              <p className="lead text-[15px] text-text-muted sm:text-xl">
                Clear rules, transparent usage, no hidden limits.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 mb-12">
              <div className="faq-item faq-item-left">
                <h3 className="text-xl font-semibold mb-3">
                  What is a credit?
                </h3>
                <p className="text-text-muted leading-relaxed">
                  A credit is a prepaid unit consumed when the platform
                  completes an operation. Different actions may require a
                  different number of credits.
                </p>
              </div>
              <div className="faq-item faq-item-right">
                <h3 className="text-xl font-semibold mb-3">
                  Can I track usage?
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Yes. The dashboard shows real-time balance, usage history and
                  per-operation statistics.
                </p>
              </div>
              <div className="faq-item faq-item-left">
                <h3 className="text-xl font-semibold mb-3">
                  When are credits deducted?
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Credits are deducted only after a successful operation. Failed
                  or cancelled requests do not consume your balance.
                </p>
              </div>
              <div className="faq-item faq-item-right">
                <h3 className="text-xl font-semibold mb-3">
                  What happens if I run out of credits?
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Requests are paused automatically until you top up your
                  balance. No unexpected charges or over-usage.
                </p>
              </div>
              <div className="faq-item faq-item-left">
                <h3 className="text-xl font-semibold mb-3">
                  Do credits expire?
                </h3>
                <p className="text-text-muted leading-relaxed">
                  No. Purchased credits never expire and remain available until
                  fully used.
                </p>
              </div>
              <div className="faq-item faq-item-right">
                <h3 className="text-xl font-semibold mb-3">
                  Can I upgrade later?
                </h3>
                <p className="text-text-muted leading-relaxed">
                  You can purchase additional credit packages at any time. New
                  credits are added to your existing balance.
                </p>
              </div>
            </div>
            <div className="faq-cta">
              <button
                onClick={() => goToAuth("signup")}
                className="inline-block px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors font-medium text-lg"
              >
                Get started with credits
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-main py-8">
        <div className="container max-w-6xl mx-auto px-5 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-text-muted text-sm">
            © 2026 AI Content Studio
          </div>
          <div className="flex items-center gap-4">
            <svg
              height="18"
              viewBox="0 0 1920 620.07"
              width="55"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M728.98,10.95l-251.37,599.74h-164l-123.7-478.62c-7.51-29.48-14.04-40.28-36.88-52.7C115.76,59.14,54.18,40.17,0,28.39L3.68,10.95h263.99c33.65,0,63.9,22.4,71.54,61.15l65.33,347.04L566,10.95h162.98ZM1371.57,414.88c.66-158.29-218.88-167.01-217.37-237.72.47-21.52,20.96-44.4,65.81-50.24,22.23-2.91,83.48-5.13,152.95,26.84l27.25-127.18c-37.33-13.55-85.36-26.59-145.12-26.59-153.35,0-261.27,81.52-262.18,198.25-.99,86.34,77.03,134.52,135.81,163.21,60.47,29.38,80.76,48.26,80.53,74.54-.43,40.23-48.23,57.99-92.9,58.69-77.98,1.2-123.23-21.1-159.3-37.87l-28.12,131.39c36.25,16.63,103.16,31.14,172.53,31.87,162.99,0,269.61-80.51,270.11-205.19M1776.51,610.7h143.49L1794.75,10.95h-132.44c-29.78,0-54.9,17.34-66.02,44l-232.81,555.74h162.91l32.35-89.59h199.05l18.73,89.59ZM1603.4,398.19l81.66-225.18,47,225.18h-128.65ZM950.66,10.95l-128.29,599.74h-155.14L795.57,10.95h155.09Z"
                fill="#1434cb"
              ></path>
            </svg>
            <svg
              height="32"
              viewBox="0 0 152.4 108"
              width="47"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <rect
                  fill="#FF5F00"
                  height="56.6"
                  width="31.5"
                  x="60.4"
                  y="25.7"
                ></rect>
                <path
                  d="M62.4,54c0-11,5.1-21.5,13.7-28.3c-15.6-12.3-38.3-9.6-50.6,6.1C13.3,47.4,16,70,31.7,82.3 c13.1,10.3,31.4,10.3,44.5,0C67.5,75.5,62.4,65,62.4,54z"
                  fill="#EB001B"
                ></path>
                <path
                  d="M134.4,54c0,19.9-16.1,36-36,36c-8.1,0-15.9-2.7-22.2-7.7c15.6-12.3,18.3-34.9,6-50.6c-1.8-2.2-3.8-4.3-6-6 c15.6-12.3,38.3-9.6,50.5,6.1C131.7,38.1,134.4,45.9,134.4,54z"
                  fill="#F79E1B"
                ></path>
              </g>
            </svg>
          </div>
          <div className="flex gap-6 text-sm">
            <Link
              to="/privacy"
              className="text-text-muted hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-text-muted hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/contact"
              className="text-text-muted hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
