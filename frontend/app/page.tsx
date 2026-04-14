"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeRecTab, setActiveRecTab] = useState<"critical" | "important" | "optional">("critical");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaAuditing, setCtaAuditing] = useState(false);
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const [barsAnimated, setBarsAnimated] = useState(false);

  // Navbar shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animate score bars on scroll into view
  useEffect(() => {
    if (!scoreCardRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setBarsAnimated(true);
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(scoreCardRef.current);
    return () => obs.disconnect();
  }, []);

  // Card entrance animations
  useEffect(() => {
    const cards = document.querySelectorAll(".lp-feat-card, .lp-problem-card, .lp-testi-card");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.1 }
    );
    cards.forEach((c) => {
      const el = c as HTMLElement;
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      el.style.transition = "opacity .45s ease, transform .45s ease, box-shadow .2s, border-color .2s";
      obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const handleRunAudit = useCallback(() => {
    router.push("/signup");
  }, [router]);

  const handleCtaAudit = useCallback(() => {
    if (!ctaUrl.trim()) return;
    setCtaAuditing(true);
    setTimeout(() => {
      setCtaAuditing(false);
      router.push("/signup");
    }, 1500);
  }, [ctaUrl, router]);

  const toggleFaq = useCallback((index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? -1 : index));
  }, []);

  return (
    <>
      <style>{landingStyles}</style>

      {/* NAV */}
      <nav className={`lp-nav${navScrolled ? " scrolled" : ""}`}>
        <a href="#" className="lp-nav-logo" onClick={(e) => e.preventDefault()}>
          <div className="lp-logo-icon">&#129302;</div>
          <span>AI SEO Tool</span>
        </a>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#score">GEO Score</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/login" style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--lp-mid)", textDecoration: "none" }}>
            Sign In
          </Link>
          <Link href="/signup" className="lp-nav-cta">
            Free Audit &rarr;
          </Link>
        </div>
      </nav>

      {/* TICKER */}
      <div className="lp-ticker-wrap">
        <div className="lp-ticker">
          <span>&#129302; ChatGPT Citation Readiness</span>
          <span>&#128309; Claude AI Visibility</span>
          <span>&#128995; Perplexity Ranking</span>
          <span>&#128994; Gemini Search Signals</span>
          <span>&#9889; Grok Authority Score</span>
          <span>&#128375;&#65039; Full-Site BFS Crawl</span>
          <span>&#128202; 8-Dimension GEO Score</span>
          <span>&#127942; E-E-A-T Analysis</span>
          <span>&#128269; Technical SEO Audit</span>
          <span>&#128197; Scheduled Re-Audits</span>
          {/* duplicate for seamless loop */}
          <span>&#129302; ChatGPT Citation Readiness</span>
          <span>&#128309; Claude AI Visibility</span>
          <span>&#128995; Perplexity Ranking</span>
          <span>&#128994; Gemini Search Signals</span>
          <span>&#9889; Grok Authority Score</span>
          <span>&#128375;&#65039; Full-Site BFS Crawl</span>
          <span>&#128202; 8-Dimension GEO Score</span>
          <span>&#127942; E-E-A-T Analysis</span>
          <span>&#128269; Technical SEO Audit</span>
          <span>&#128197; Scheduled Re-Audits</span>
        </div>
      </div>

      {/* HERO */}
      <section className="lp-hero" id="audit" style={{ position: "relative" }}>
        <div className="lp-hero-badge">
          <div className="lp-dot" />
          The #1 AI Citation Readiness Platform
        </div>
        <h1>
          Is Your Website <span className="lp-gradient-text">Visible to AI</span>
          <br />
          or Being Ignored?
        </h1>
        <p className="lp-hero-sub">
          Crawl every page. Score your GEO readiness. Get ranked by ChatGPT, Claude, Perplexity, Gemini &amp; Grok
          &mdash; before your competitors do.
        </p>

        <div className="lp-url-input-wrap">
          <a
            href="/signup"
            className="lp-nav-cta"
            style={{
              display: "inline-block",
              padding: "16px 40px",
              fontSize: "1.05rem",
              boxShadow: "0 4px 20px rgba(13,148,136,.35)",
            }}
          >
            Start GEO Audit &rarr;
          </a>
        </div>

        <div className="lp-engines-strip">
          <span>Scores visibility on:</span>
          <div className="lp-engine-pill">
            <span className="lp-ei">&#129302;</span> ChatGPT
          </div>
          <div className="lp-engine-pill">
            <span className="lp-ei">&#128309;</span> Claude
          </div>
          <div className="lp-engine-pill">
            <span className="lp-ei">&#128995;</span> Perplexity
          </div>
          <div className="lp-engine-pill">
            <span className="lp-ei">&#128994;</span> Gemini
          </div>
          <div className="lp-engine-pill">
            <span className="lp-ei">&#9889;</span> Grok
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div className="lp-social-proof">
        <div className="lp-sp-item">
          <div>
            <div className="lp-sp-number">12,400+</div>
            <div className="lp-sp-label">Sites Audited</div>
          </div>
        </div>
        <div className="lp-sp-divider" />
        <div className="lp-sp-item">
          <div>
            <div className="lp-sp-number">8 Dimensions</div>
            <div className="lp-sp-label">GEO Scoring Criteria</div>
          </div>
        </div>
        <div className="lp-sp-divider" />
        <div className="lp-sp-item">
          <div>
            <div className="lp-sp-number">5 AI Engines</div>
            <div className="lp-sp-label">Coverage per Audit</div>
          </div>
        </div>
        <div className="lp-sp-divider" />
        <div className="lp-sp-item">
          <div>
            <div className="lp-sp-number">50 Pages</div>
            <div className="lp-sp-label">Concurrent Crawl</div>
          </div>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="lp-problem">
        <div className="lp-section-label">THE PROBLEM</div>
        <h2 style={{ maxWidth: 600 }}>
          Traditional SEO no longer
          <br />
          guarantees AI visibility
        </h2>
        <p className="lp-section-sub">
          Google rankings &ne; AI citation. A site scoring 90 on Google PageSpeed can score 20 for AI citation
          readiness. These are fundamentally different problems.
        </p>
        <div className="lp-problem-grid">
          {[
            { icon: "\uD83D\uDD26", title: "AI Engines Can't Find You", desc: "Missing structured data, poor schema markup, and blocked crawlers mean AI engines simply skip your content \u2014 no matter how good it is." },
            { icon: "\uD83C\uDFAF", title: "Content Isn't Citation-Ready", desc: "AI engines prefer factual density, clear authorship, and E-E-A-T signals. Most sites fail on at least 4 of the 8 GEO dimensions." },
            { icon: "\uD83D\uDCC9", title: "Zero-Click Traffic is Rising", desc: "As AI answers replace blue links, only sites that AI cites retain visibility. Sites not in the AI index lose traffic silently." },
            { icon: "\uD83D\uDD75\uFE0F", title: "No Diagnostic Tool Exists", desc: "Until now. Traditional SEO tools don't measure GEO readiness, E-E-A-T depth, or per-engine citation probability." },
          ].map((item, i) => (
            <div className="lp-problem-card" key={i}>
              <div className="lp-problem-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-how" id="how">
        <div className="lp-section-label">HOW IT WORKS</div>
        <h2>
          From URL to a complete
          <br />
          AI audit in seconds
        </h2>
        <p className="lp-section-sub">
          Our BFS crawler, GEO pipeline, and AI probe engine do all the work. You just read the report.
        </p>
        <div className="lp-steps">
          <div className="lp-step">
            <div className="lp-step-num">1</div>
            <h3>Enter Your URL</h3>
            <p>Paste any website URL. Our crawler maps every page using smart sitemap sampling with 50 concurrent threads.</p>
          </div>
          <div className="lp-step-arrow">&rarr;</div>
          <div className="lp-step">
            <div className="lp-step-num">2</div>
            <h3>Deep Crawl &amp; Analysis</h3>
            <p>Technical SEO, structured data, E-E-A-T signals, content quality, and NLP analysis run simultaneously per page.</p>
          </div>
          <div className="lp-step-arrow">&rarr;</div>
          <div className="lp-step">
            <div className="lp-step-num">3</div>
            <h3>GEO Score + Fixes</h3>
            <p>Get your A&ndash;F grade per AI engine, per page, and a prioritized fix list: Critical &rarr; Important &rarr; Optional.</p>
          </div>
          <div className="lp-step-arrow">&rarr;</div>
          <div className="lp-step">
            <div className="lp-step-num">4</div>
            <h3>Track Over Time</h3>
            <p>Schedule daily, weekly, or monthly re-audits. Watch your GEO score trend up as you implement fixes.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-features" id="features">
        <div className="lp-section-label">FEATURES</div>
        <h2>
          Everything AI search demands.
          <br />
          All in one audit.
        </h2>
        <p className="lp-section-sub">7-tab dashboard covering every dimension that matters for AI citation in 2026 and beyond.</p>
        <div className="lp-features-grid">
          {[
            { icon: "\uD83D\uDD77\uFE0F", title: "Full-Site BFS Crawler", desc: "Breadth-first crawl with smart sitemap sampling, 50 concurrent threads streaming to Redis. No page left behind.", tag: "Spider Tab" },
            { icon: "\uD83D\uDCD0", title: "Technical SEO Audit", desc: "HTTPS, sitemap, PageSpeed, broken links, canonicals, security headers, AI crawler access signals \u2014 all scored.", tag: "Technical Tab" },
            { icon: "\uD83C\uDFC6", title: "8-Dimension GEO Score", desc: "Citation readiness across content quality, E-E-A-T, entity authority, schema, NLP intent, and snippet readiness.", tag: "GEO Tab" },
            { icon: "\uD83E\uDD16", title: "Multi-Engine AI Probe", desc: "Simulates 5 AI engine personas \u2014 ChatGPT, Claude, Perplexity, Gemini, Grok \u2014 to predict citation probability per page.", tag: "GEO Tab" },
            { icon: "\uD83D\uDCC8", title: "Competitor Tracking", desc: "Track up to 10 competitors' GEO scores side-by-side. See how your AI citation readiness compares and where you're falling behind.", tag: "Competitors Tab" },
            { icon: "\uD83D\uDCC5", title: "Scheduled Re-Audits", desc: "Set daily, weekly, or monthly re-crawls via Celery Beat. Trend charts show GEO score improvement over time.", tag: "Schedules Tab" },
            { icon: "\uD83D\uDCCA", title: "History & Comparison", desc: "Persistent audit history with side-by-side comparison. See exactly what changed between two audit runs.", tag: "History Tab" },
            { icon: "\uD83D\uDD2C", title: "NLP Content Analysis", desc: "Claude-powered intent detection, query pattern mapping, snippet readiness scoring, and factual density analysis.", tag: "Insights Tab" },
          ].map((item, i) => (
            <div className="lp-feat-card" key={i}>
              <div className="lp-feat-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <span className="lp-feat-tag">{item.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SCORE PREVIEW */}
      <section className="lp-score-preview" id="score">
        <div className="lp-section-label">LIVE REPORT PREVIEW</div>
        <h2>
          Your GEO score. Broken down
          <br />
          engine by engine.
        </h2>
        <p className="lp-section-sub">
          Every audit produces a full-site GEO grade, per-page scores, engine breakdowns, and a fix list sorted by
          impact.
        </p>
        <div className="lp-score-layout">
          <div className="lp-score-card" ref={scoreCardRef}>
            <div className="lp-score-header">
              <div>
                <div className="lp-score-site">example-site.com</div>
                <div style={{ fontSize: ".75rem", color: "var(--lp-soft)" }}>Audited just now &middot; 142 pages</div>
              </div>
              <div className="lp-score-grade">B+</div>
            </div>
            <div className="lp-score-bars">
              {[
                { label: "Content Quality", score: 82 },
                { label: "E-E-A-T Signals", score: 71 },
                { label: "Structured Data", score: 55 },
                { label: "Entity Authority", score: 90 },
                { label: "Technical Health", score: 76 },
              ].map((bar, i) => (
                <div className="lp-score-row" key={i}>
                  <div className="lp-score-row-top">
                    <span>{bar.label}</span>
                    <span style={{ color: "var(--lp-teal)" }}>
                      {bar.score}/100
                    </span>
                  </div>
                  <div className="lp-score-bar-bg">
                    <div
                      className="lp-score-bar-fill"
                      style={{ width: barsAnimated ? `${bar.score}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-engine-scores">
              {[
                { icon: "\uD83E\uDD16", name: "ChatGPT", grade: "B" },
                { icon: "\uD83D\uDD35", name: "Claude", grade: "B+" },
                { icon: "\uD83D\uDFE3", name: "Perplexity", grade: "A\u2212" },
                { icon: "\uD83D\uDFE2", name: "Gemini", grade: "C+" },
                { icon: "\u26A1", name: "Grok", grade: "B\u2212" },
              ].map((eng, i) => (
                <div className="lp-eng-badge" key={i}>
                  <span className="lp-eng-name">
                    {eng.icon} {eng.name}
                  </span>
                  <span className="lp-eng-score">{eng.grade}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-score-copy">
            <h3>Understand exactly where you stand with every AI engine</h3>
            <p>
              Our 8-dimension GEO pipeline doesn&apos;t just give you a score &mdash; it tells you precisely what&apos;s
              holding each AI engine back from citing your content, ranked by impact.
            </p>
            <div className="lp-check-list">
              {[
                "Per-page A\u2013F grades across 5 scoring categories",
                "Engine-specific citation probability breakdowns",
                "Prioritized fix list: Critical \u2192 Important \u2192 Optional",
                "Trend charts for GEO score improvement over time",
                "Side-by-side audit comparisons in History tab",
                "CSV export of all per-page scores",
              ].map((item, i) => (
                <div className="lp-check-item" key={i}>
                  <span className="lp-check">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPETITOR TRACKING */}
      <section className="lp-competitor-section">
        <div className="lp-section-label">COMPETITOR TRACKING</div>
        <h2>
          Know exactly where you stand
          <br />
          against your competitors
        </h2>
        <p className="lp-section-sub">
          Track up to 10 competitors and compare GEO scores across every AI engine. Spot gaps, steal strategies, and
          stay ahead.
        </p>
        <div className="lp-competitor-layout">
          <div className="lp-competitor-copy">
            <h3>Benchmark your AI visibility against the competition</h3>
            <p>
              Traditional SEO tools show you keyword overlap. AI SEO Tool shows you who AI engines are actually citing
              &mdash; and why they&apos;re choosing your competitors over you.
            </p>
            <p>
              Compare scores across all 8 GEO dimensions, track competitor improvements over time, and get specific
              recommendations on what to fix to overtake them in AI search results.
            </p>
            <div className="lp-check-list">
              {[
                "Side-by-side GEO score comparison across all 5 AI engines",
                "Per-dimension breakdown showing where competitors outperform you",
                "Automated alerts when a competitor's GEO score changes",
                "Actionable recommendations to close the gap",
              ].map((item, i) => (
                <div className="lp-check-item" key={i}>
                  <span className="lp-check">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-competitor-demo">
            <div style={{ fontSize: ".78rem", color: "var(--lp-soft)", fontWeight: 600, marginBottom: 16 }}>
              GEO SCORE COMPARISON
            </div>
            {[
              { site: "yoursite.com", width: "72%", grade: "B+", color: "var(--lp-teal)" },
              { site: "competitor1.com", width: "85%", grade: "A\u2212", color: "var(--lp-green)" },
              { site: "competitor2.com", width: "58%", grade: "C+", color: "#f59e0b" },
              { site: "competitor3.com", width: "44%", grade: "D", color: "#ef4444" },
            ].map((row, i) => (
              <div className="lp-comp-row" key={i}>
                <span className="lp-comp-site">{row.site}</span>
                <div className="lp-comp-bar-bg">
                  <div className="lp-comp-bar-fill" style={{ width: row.width }} />
                </div>
                <span className="lp-comp-score" style={{ color: row.color }}>
                  {row.grade}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECOMMENDATIONS */}
      <section className="lp-recs">
        <div className="lp-section-label">PRIORITIZED FIXES</div>
        <h2>
          Not just scores &mdash; actionable
          <br />
          fixes ranked by impact
        </h2>
        <p className="lp-section-sub">Every audit ends with a ranked fix list. Start with Critical, work down to Optional.</p>
        <div className="lp-recs-tabs">
          <button
            className={`lp-rec-tab critical${activeRecTab === "critical" ? " active" : ""}`}
            onClick={() => setActiveRecTab("critical")}
          >
            &#128308; Critical
          </button>
          <button
            className={`lp-rec-tab important${activeRecTab === "important" ? " active" : ""}`}
            onClick={() => setActiveRecTab("important")}
          >
            &#128993; Important
          </button>
          <button
            className={`lp-rec-tab optional${activeRecTab === "optional" ? " active" : ""}`}
            onClick={() => setActiveRecTab("optional")}
          >
            &#128994; Optional
          </button>
        </div>

        <div className={`lp-recs-panel${activeRecTab === "critical" ? " active" : ""}`}>
          {[
            { title: "Add JSON-LD Organization Schema to homepage", desc: "No structured schema detected. AI engines require machine-readable identity signals to confidently cite your brand. Estimated GEO impact: +18 pts." },
            { title: "Block lifted: allow GPTBot and ClaudeBot in robots.txt", desc: "AI crawlers are currently blocked from 34 pages. This is the single biggest reason ChatGPT and Claude won't cite your content. Estimated GEO impact: +22 pts." },
            { title: "Add author bylines + credentials to 12 key pages", desc: "E-E-A-T analysis detected no author information on your top-traffic pages. Perplexity and Gemini heavily weight authorship signals." },
          ].map((item, i) => (
            <div className="lp-rec-item" key={i}>
              <div className="lp-rec-badge badge-critical">Critical</div>
              <div className="lp-rec-text">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`lp-recs-panel${activeRecTab === "important" ? " active" : ""}`}>
          {[
            { title: "Add FAQ schema to 8 long-form articles", desc: "Snippet readiness is low. FAQ structured data increases AI snippet extraction probability by ~40% for question-based queries." },
            { title: "Improve factual density on 5 thin pages", desc: "Pages under 400 words with no statistics, citations, or named entities are routinely skipped by AI citation pipelines." },
            { title: "Fix 3 broken canonical tags", desc: "Duplicate content signals from broken canonicals confuse AI crawlers about which version of a page to cite." },
          ].map((item, i) => (
            <div className="lp-rec-item" key={i}>
              <div className="lp-rec-badge badge-important">Important</div>
              <div className="lp-rec-text">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`lp-recs-panel${activeRecTab === "optional" ? " active" : ""}`}>
          {[
            { title: "Add sameAs links to Wikipedia and Wikidata", desc: "Entity authority signals via sameAs schema improve Gemini and Grok citation probability for brand-name queries." },
            { title: "Enable HSTS and Content-Security-Policy headers", desc: "Security headers contribute to technical trust signals scored by AI engines, particularly Perplexity's domain authority model." },
            { title: "Schedule weekly re-audits to track GEO trend", desc: "Sites that monitor GEO score weekly improve 2.3\u00d7 faster than those who audit once and stop. Set up automation in the Schedules tab." },
          ].map((item, i) => (
            <div className="lp-rec-item" key={i}>
              <div className="lp-rec-badge badge-optional">Optional</div>
              <div className="lp-rec-text">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="lp-testimonials">
        <div className="lp-section-label">WHAT USERS SAY</div>
        <h2>
          Real results from real
          <br />
          website owners
        </h2>
        <div className="lp-testi-grid">
          {[
            {
              text: "\u201CWithin 2 weeks of fixing the Critical items flagged by AI SEO Tool, we started appearing in Perplexity answers for our core keywords. This is not your typical SEO tool.\u201D",
              initials: "SR",
              name: "Sarah R.",
              role: "Head of Content, B2B SaaS",
            },
            {
              text: "\u201CThe per-engine breakdown is a game changer. Knowing that Claude scores our site differently than ChatGPT lets us prioritize exactly where to fix for each audience.\u201D",
              initials: "DK",
              name: "Daniel K.",
              role: "Founder, Digital Agency",
            },
            {
              text: "\u201CI discovered GPTBot was blocked on 40 pages \u2014 something no traditional SEO tool caught. Fixed in 10 minutes. Traffic from AI-referred sessions up 60% in 30 days.\u201D",
              initials: "MP",
              name: "Maya P.",
              role: "SEO Consultant",
            },
          ].map((t, i) => (
            <div className="lp-testi-card" key={i}>
              <div className="lp-testi-stars">★★★★★</div>
              <p className="lp-testi-text">{t.text}</p>
              <div className="lp-testi-author">
                <div className="lp-testi-avatar">{t.initials}</div>
                <div>
                  <div className="lp-testi-name">{t.name}</div>
                  <div className="lp-testi-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-pricing" id="pricing">
        <div style={{ textAlign: "center" }}>
          <div className="lp-section-label">PRICING</div>
          <h2>
            Simple plans that scale
            <br />
            with your needs
          </h2>
          <p className="lp-section-sub" style={{ margin: "0 auto" }}>
            Start free. Upgrade when you need more audits, competitor tracking, and white-label reports.
          </p>
        </div>
        <div className="lp-pricing-grid">
          <div className="lp-price-card">
            <div className="lp-price-name">Free</div>
            <div className="lp-price-cost">$0<span>/month</span></div>
            <div className="lp-price-amount">1 audit / month</div>
            <ul className="lp-price-list">
              <li><span className="lp-pi">✓</span><span>Top-level GEO score</span></li>
              <li><span className="lp-pi">✓</span><span>Technical SEO summary</span></li>
              <li><span className="lp-pi">✓</span><span>No scheduled re-audits</span></li>
              <li className="disabled"><span className="lp-pi">✗</span><span>No per-page breakdown</span></li>
              <li className="disabled"><span className="lp-pi">✗</span><span>No competitor tracking</span></li>
            </ul>
            <Link href="/signup" className="lp-price-btn">Get Started Free</Link>
          </div>
          <div className="lp-price-card featured">
            <div className="lp-price-name">Pro</div>
            <div className="lp-price-cost">$29<span>/month</span></div>
            <div className="lp-price-amount">10 audits / month</div>
            <ul className="lp-price-list">
              <li><span className="lp-pi">✓</span><span>Full per-page GEO score</span></li>
              <li><span className="lp-pi">✓</span><span>Technical SEO summary</span></li>
              <li><span className="lp-pi">✓</span><span>Actionable suggestions</span></li>
              <li><span className="lp-pi">✓</span><span>Scheduled re-audits</span></li>
              <li><span className="lp-pi">✓</span><span>Track up to 3 competitors</span></li>
            </ul>
            <Link href="/signup" className="lp-price-btn primary">Upgrade to Pro</Link>
          </div>
          <div className="lp-price-card">
            <div className="lp-price-name">Agency</div>
            <div className="lp-price-cost">$99<span>/month</span></div>
            <div className="lp-price-amount">Unlimited audits</div>
            <ul className="lp-price-list">
              <li><span className="lp-pi">✓</span><span>Full per-page GEO scores</span></li>
              <li><span className="lp-pi">✓</span><span>Actionable suggestions</span></li>
              <li><span className="lp-pi">✓</span><span>Scheduled re-audits</span></li>
              <li><span className="lp-pi">✓</span><span>Track up to 10 competitors</span></li>
              <li><span className="lp-pi">✓</span><span>White-label PDF + CSV reports</span></li>
            </ul>
            <Link href="/signup" className="lp-price-btn">Contact Sales</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq" id="faq">
        <div style={{ textAlign: "center" }}>
          <div className="lp-section-label">FAQ</div>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="lp-faq-wrap">
          {[
            {
              q: "What is a GEO score?",
              a: "GEO (Generative Engine Optimization) score measures how likely AI-powered search engines are to find, understand, and cite your website in their responses. It\u2019s different from traditional SEO \u2014 a site can rank #1 on Google while scoring an F for AI citation readiness.",
            },
            {
              q: "Which AI engines do you cover?",
              a: "Every audit scores citation readiness for ChatGPT, Claude, Perplexity AI, Google Gemini, and Grok. Each engine has different weighting for factors like schema, E-E-A-T, content density, and crawler access.",
            },
            {
              q: "How deep does the crawler go?",
              a: "We use a breadth-first crawl with smart sitemap sampling. The crawler runs 50 concurrent threads and streams results to Redis in real time, covering every public-facing page on your site regardless of size.",
            },
            {
              q: "Is my data stored or shared?",
              a: "Audit results are stored persistently in a private SQLite database so you can view history and trends. Your data is never shared with third parties. You can export or delete your audit history at any time.",
            },
            {
              q: "Can I schedule recurring audits?",
              a: "Yes. The Schedules tab lets you set up daily, weekly, or monthly re-audits using Celery Beat. You\u2019ll get trend charts showing how your GEO score evolves as you implement fixes \u2014 so improvement is measurable and ongoing.",
            },
          ].map((item, i) => (
            <div className={`lp-faq-item${openFaqIndex === i ? " open" : ""}`} key={i}>
              <button className="lp-faq-q" onClick={() => toggleFaq(i)}>
                {item.q} <span className="lp-faq-icon">+</span>
              </button>
              <div className="lp-faq-a">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#0d9488,#16a34a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                &#129302;
              </div>
              <span style={{ fontWeight: 800, fontSize: ".97rem", color: "#fff" }}>AI SEO Tool</span>
            </div>
            <p>The only platform that tells you exactly why AI engines aren&apos;t citing your site &mdash; and how to fix it.</p>
          </div>
          <div className="lp-footer-col">
            <h4>Product</h4>
            <a href="#">GEO Score</a>
            <a href="#">Technical Audit</a>
            <a href="#">E-E-A-T Analysis</a>
            <a href="#">Competitor Tracking</a>
            <a href="#">Scheduled Audits</a>
          </div>
          <div className="lp-footer-col">
            <h4>Resources</h4>
            <a href="#">GEO Guide 2026</a>
            <a href="#">AI SEO Blog</a>
            <a href="#">Schema Templates</a>
            <a href="#">Changelog</a>
          </div>
          <div className="lp-footer-col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact</a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>&copy; 2026 AI SEO Tool. Built for the AI-first web.</span>
          <span>GEO &middot; Generative Engine Optimization</span>
        </div>
      </footer>
    </>
  );
}

/* ─── ALL CSS (prefixed with lp- to avoid collisions with app globals) ─── */
const landingStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');

  :root {
    --lp-teal:       #0d9488;
    --lp-teal-light: #14b8a6;
    --lp-teal-pale:  #ccfbf1;
    --lp-teal-mid:   #5eead4;
    --lp-green:      #16a34a;
    --lp-green-light:#22c55e;
    --lp-dark:       #0f172a;
    --lp-dark-2:     #1e293b;
    --lp-mid:        #475569;
    --lp-soft:       #94a3b8;
    --lp-bg:         #f8fafc;
    --lp-white:      #ffffff;
    --lp-border:     #e2e8f0;
    --lp-radius:     14px;
    --lp-shadow-sm:  0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
    --lp-shadow-md:  0 4px 16px rgba(0,0,0,.08);
    --lp-shadow-lg:  0 20px 60px rgba(0,0,0,.12);
  }

  /* Reset body for landing page */
  body {
    font-family: 'Inter', sans-serif !important;
    background: var(--lp-bg) !important;
    color: var(--lp-dark) !important;
    line-height: 1.6;
    overflow-x: hidden;
    margin: 0; padding: 0;
  }
  html { scroll-behavior: smooth; }

  /* ── NAV ── */
  .lp-nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 5%; height: 68px;
    background: rgba(255,255,255,.85);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--lp-border);
    transition: box-shadow .2s;
  }
  .lp-nav.scrolled { box-shadow: var(--lp-shadow-md); }
  .lp-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .lp-logo-icon {
    width: 36px; height: 36px; border-radius: 9px;
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green));
    display: flex; align-items: center; justify-content: center; font-size: 18px;
  }
  .lp-nav-logo span { font-weight: 800; font-size: 1.05rem; color: var(--lp-dark); letter-spacing: -.3px; }
  .lp-nav-links { display: flex; align-items: center; gap: 28px; }
  .lp-nav-links a { font-size: .88rem; font-weight: 500; color: var(--lp-mid); text-decoration: none; transition: color .15s; }
  .lp-nav-links a:hover { color: var(--lp-teal); }
  .lp-nav-cta {
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green));
    color: #fff !important; padding: 9px 22px; border-radius: 50px;
    font-size: .88rem; font-weight: 600; text-decoration: none;
    transition: transform .15s, box-shadow .15s;
    box-shadow: 0 2px 10px rgba(13,148,136,.3);
  }
  .lp-nav-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(13,148,136,.4); }

  /* ── TICKER ── */
  .lp-ticker-wrap { overflow: hidden; background: linear-gradient(90deg, var(--lp-teal), var(--lp-green)); padding: 11px 0; }
  .lp-ticker { display: flex; gap: 0; white-space: nowrap; animation: lp-ticker 28s linear infinite; }
  .lp-ticker span { color: rgba(255,255,255,.9); font-size: .8rem; font-weight: 600; padding: 0 32px; border-right: 1px solid rgba(255,255,255,.2); }
  @keyframes lp-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }

  /* ── HERO ── */
  .lp-hero {
    padding: 110px 5% 90px;
    text-align: center;
    background: linear-gradient(180deg, #ecfdf5 0%, var(--lp-bg) 100%);
    position: relative; overflow: hidden;
  }
  .lp-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--lp-teal-pale); color: var(--lp-teal); border: 1px solid #99f6e4;
    padding: 6px 16px; border-radius: 50px; font-size: .82rem; font-weight: 600;
    margin-bottom: 28px; animation: lp-fadeUp .5s ease both;
  }
  .lp-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lp-teal-light); animation: lp-pulse 2s infinite; }
  @keyframes lp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
  @keyframes lp-fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  .lp-hero h1 {
    font-size: clamp(2.2rem, 5vw, 3.6rem);
    font-weight: 900; line-height: 1.1; letter-spacing: -1.5px;
    color: var(--lp-dark); margin-bottom: 22px;
    animation: lp-fadeUp .55s .1s ease both;
  }
  .lp-gradient-text {
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green-light));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .lp-hero-sub {
    font-size: 1.15rem; color: var(--lp-mid); max-width: 620px; margin: 0 auto 44px;
    font-weight: 400; animation: lp-fadeUp .55s .2s ease both;
  }
  .lp-url-input-wrap {
    max-width: 600px; margin: 0 auto 18px;
    animation: lp-fadeUp .55s .3s ease both;
  }

  /* Engines strip */
  .lp-engines-strip {
    display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px;
    margin-top: 50px; animation: lp-fadeUp .55s .5s ease both;
  }
  .lp-engines-strip > span { font-size: .78rem; color: var(--lp-soft); font-weight: 500; margin-right: 6px; }
  .lp-engine-pill {
    display: flex; align-items: center; gap: 6px;
    background: #fff; border: 1px solid var(--lp-border); border-radius: 50px;
    padding: 7px 14px; font-size: .8rem; font-weight: 600; color: var(--lp-mid);
    box-shadow: var(--lp-shadow-sm);
  }
  .lp-ei { font-size: 16px; }

  /* ── SOCIAL PROOF ── */
  .lp-social-proof {
    background: #fff; border-top: 1px solid var(--lp-border); border-bottom: 1px solid var(--lp-border);
    padding: 20px 5%; display: flex; align-items: center; justify-content: center;
    flex-wrap: wrap; gap: 40px;
  }
  .lp-sp-item { display: flex; align-items: center; gap: 10px; }
  .lp-sp-number { font-size: 1.5rem; font-weight: 800; color: var(--lp-dark); }
  .lp-sp-label { font-size: .8rem; color: var(--lp-mid); font-weight: 500; }
  .lp-sp-divider { width: 1px; height: 32px; background: var(--lp-border); }

  /* ── SECTIONS ── */
  .lp-problem, .lp-how, .lp-features, .lp-score-preview, .lp-competitor-section,
  .lp-recs, .lp-testimonials, .lp-pricing, .lp-faq, .lp-cta-banner { padding: 96px 5%; }

  .lp-section-label {
    display: inline-block;
    background: var(--lp-teal-pale); color: var(--lp-teal);
    font-size: .75rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    padding: 5px 14px; border-radius: 50px; margin-bottom: 14px;
  }
  .lp-problem h2, .lp-how h2, .lp-features h2, .lp-score-preview h2,
  .lp-competitor-section h2, .lp-recs h2, .lp-testimonials h2, .lp-pricing h2, .lp-faq h2 {
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 800; letter-spacing: -1px; line-height: 1.15; margin-bottom: 16px;
  }
  .lp-section-sub { font-size: 1.05rem; color: var(--lp-mid); max-width: 560px; }

  /* ── PROBLEM ── */
  .lp-problem { background: var(--lp-dark); color: #fff; }
  .lp-problem h2 { color: #fff; }
  .lp-problem .lp-section-label { background: rgba(255,255,255,.08); color: var(--lp-teal-mid); border: 1px solid rgba(94,234,212,.2); }
  .lp-problem .lp-section-sub { color: #94a3b8; }
  .lp-problem-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px; margin-top: 52px;
  }
  .lp-problem-card {
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
    border-radius: var(--lp-radius); padding: 28px 24px;
    transition: background .2s, transform .2s;
  }
  .lp-problem-card:hover { background: rgba(255,255,255,.07); transform: translateY(-2px); }
  .lp-problem-icon { font-size: 28px; margin-bottom: 14px; }
  .lp-problem-card h3 { font-size: 1rem; font-weight: 700; color: #e2e8f0; margin-bottom: 8px; }
  .lp-problem-card p { font-size: .87rem; color: #64748b; line-height: 1.65; }

  /* ── HOW IT WORKS ── */
  .lp-how { background: var(--lp-bg); text-align: center; }
  .lp-how h2, .lp-how .lp-section-sub { margin-left: auto; margin-right: auto; }
  .lp-how .lp-section-sub { margin-bottom: 60px; }
  .lp-steps { display: flex; align-items: flex-start; justify-content: center; flex-wrap: wrap; gap: 0; }
  .lp-step { flex: 1; min-width: 200px; max-width: 260px; padding: 20px; position: relative; }
  .lp-step-num {
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green));
    color: #fff; font-weight: 800; font-size: 1.1rem;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 18px; box-shadow: 0 4px 16px rgba(13,148,136,.3);
  }
  .lp-step h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
  .lp-step p { font-size: .86rem; color: var(--lp-mid); }
  .lp-step-arrow { display: flex; align-items: center; padding-top: 26px; color: var(--lp-teal-mid); font-size: 1.4rem; }

  /* ── FEATURES ── */
  .lp-features { background: #fff; }
  .lp-features-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 22px; margin-top: 56px;
  }
  .lp-feat-card {
    border: 1px solid var(--lp-border); border-radius: var(--lp-radius);
    padding: 28px 26px; transition: box-shadow .2s, border-color .2s, transform .2s;
    cursor: default;
  }
  .lp-feat-card:hover {
    box-shadow: 0 8px 32px rgba(13,148,136,.1);
    border-color: #99f6e4; transform: translateY(-3px);
  }
  .lp-feat-icon {
    width: 46px; height: 46px; border-radius: 11px;
    background: var(--lp-teal-pale); display: flex; align-items: center;
    justify-content: center; font-size: 22px; margin-bottom: 16px;
  }
  .lp-feat-card h3 { font-size: .97rem; font-weight: 700; margin-bottom: 8px; }
  .lp-feat-card p { font-size: .86rem; color: var(--lp-mid); line-height: 1.65; }
  .lp-feat-tag {
    display: inline-block; margin-top: 14px;
    background: var(--lp-teal-pale); color: var(--lp-teal);
    font-size: .72rem; font-weight: 600; padding: 3px 10px; border-radius: 50px;
  }

  /* ── SCORE PREVIEW ── */
  .lp-score-preview { background: linear-gradient(160deg, #ecfdf5, #f0fdf4); }
  .lp-score-layout {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 60px; align-items: center; margin-top: 56px;
  }
  @media(max-width:768px){ .lp-score-layout { grid-template-columns: 1fr; } }
  .lp-score-card {
    background: #fff; border: 1px solid var(--lp-border);
    border-radius: 20px; padding: 36px; box-shadow: var(--lp-shadow-lg);
  }
  .lp-score-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
  .lp-score-site { font-size: .8rem; color: var(--lp-mid); font-family: 'JetBrains Mono', monospace; }
  .lp-score-grade {
    font-size: 3.5rem; font-weight: 900; line-height: 1;
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .lp-score-bars { display: flex; flex-direction: column; gap: 14px; }
  .lp-score-row { display: flex; flex-direction: column; gap: 6px; }
  .lp-score-row-top { display: flex; justify-content: space-between; font-size: .83rem; font-weight: 600; }
  .lp-score-bar-bg { background: var(--lp-border); border-radius: 50px; height: 8px; overflow: hidden; }
  .lp-score-bar-fill {
    height: 100%; border-radius: 50px;
    background: linear-gradient(90deg, var(--lp-teal), var(--lp-green));
    transition: width 1.2s cubic-bezier(.4,0,.2,1);
  }
  .lp-engine-scores { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .lp-eng-badge {
    background: var(--lp-bg); border: 1px solid var(--lp-border);
    border-radius: 10px; padding: 10px 14px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .lp-eng-name { font-size: .78rem; font-weight: 600; color: var(--lp-mid); }
  .lp-eng-score { font-size: .9rem; font-weight: 800; color: var(--lp-teal); }
  .lp-score-copy h3 { font-size: 1.4rem; font-weight: 800; margin-bottom: 14px; }
  .lp-score-copy p { color: var(--lp-mid); margin-bottom: 20px; font-size: .95rem; }
  .lp-check-list { display: flex; flex-direction: column; gap: 10px; }
  .lp-check-item { display: flex; align-items: flex-start; gap: 10px; font-size: .88rem; color: var(--lp-mid); }
  .lp-check { color: var(--lp-teal); font-size: 1rem; margin-top: 1px; flex-shrink: 0; }

  /* ── COMPETITOR ── */
  .lp-competitor-section { background: #fff; }
  .lp-competitor-layout {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 60px; align-items: center; margin-top: 56px;
  }
  @media(max-width:768px){ .lp-competitor-layout { grid-template-columns: 1fr; } }
  .lp-competitor-copy h3 { font-size: 1.4rem; font-weight: 800; margin-bottom: 14px; }
  .lp-competitor-copy p { color: var(--lp-mid); margin-bottom: 20px; font-size: .95rem; line-height: 1.7; }
  .lp-competitor-demo {
    background: var(--lp-bg); border: 1px solid var(--lp-border); border-radius: 20px;
    padding: 28px; box-shadow: var(--lp-shadow-md);
  }
  .lp-comp-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0; border-bottom: 1px solid var(--lp-border);
  }
  .lp-comp-row:last-child { border-bottom: none; }
  .lp-comp-site { font-size: .85rem; font-weight: 600; color: var(--lp-dark); }
  .lp-comp-score { font-size: .9rem; font-weight: 800; }
  .lp-comp-bar-bg { flex: 1; margin: 0 16px; background: var(--lp-border); border-radius: 50px; height: 6px; overflow: hidden; }
  .lp-comp-bar-fill { height: 100%; border-radius: 50px; background: linear-gradient(90deg, var(--lp-teal), var(--lp-green)); }

  /* ── RECOMMENDATIONS ── */
  .lp-recs { background: #fff; }
  .lp-recs-tabs {
    display: flex; gap: 8px; margin-top: 44px; margin-bottom: 32px; flex-wrap: wrap;
  }
  .lp-rec-tab {
    padding: 8px 20px; border-radius: 50px; font-size: .84rem; font-weight: 600;
    cursor: pointer; border: 2px solid var(--lp-border); background: #fff; color: var(--lp-mid);
    transition: all .15s; font-family: 'Inter', sans-serif;
  }
  .lp-rec-tab.active { border-color: var(--lp-teal); background: var(--lp-teal-pale); color: var(--lp-teal); }
  .lp-rec-tab.critical.active { border-color: #ef4444; background: #fef2f2; color: #ef4444; }
  .lp-rec-tab.important.active { border-color: #f59e0b; background: #fffbeb; color: #d97706; }
  .lp-rec-tab.optional.active { border-color: var(--lp-teal); background: var(--lp-teal-pale); color: var(--lp-teal); }
  .lp-recs-panel { display: none; flex-direction: column; gap: 14px; }
  .lp-recs-panel.active { display: flex; }
  .lp-rec-item {
    display: flex; align-items: flex-start; gap: 14px;
    border: 1px solid var(--lp-border); border-radius: 12px; padding: 18px 20px;
    transition: box-shadow .15s;
  }
  .lp-rec-item:hover { box-shadow: var(--lp-shadow-md); }
  .lp-rec-badge {
    flex-shrink: 0; padding: 4px 10px; border-radius: 50px; font-size: .72rem; font-weight: 700;
  }
  .badge-critical { background: #fef2f2; color: #ef4444; }
  .badge-important { background: #fffbeb; color: #d97706; }
  .badge-optional { background: var(--lp-teal-pale); color: var(--lp-teal); }
  .lp-rec-text h4 { font-size: .9rem; font-weight: 700; margin-bottom: 4px; }
  .lp-rec-text p { font-size: .82rem; color: var(--lp-mid); }

  /* ── TESTIMONIALS ── */
  .lp-testimonials { background: var(--lp-bg); }
  .lp-testi-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px; margin-top: 52px;
  }
  .lp-testi-card {
    background: #fff; border: 1px solid var(--lp-border); border-radius: var(--lp-radius);
    padding: 28px; transition: box-shadow .2s;
  }
  .lp-testi-card:hover { box-shadow: var(--lp-shadow-md); }
  .lp-testi-stars { color: #f59e0b; font-size: .9rem; margin-bottom: 14px; letter-spacing: 2px; }
  .lp-testi-text { font-size: .9rem; color: var(--lp-dark); line-height: 1.7; margin-bottom: 18px; font-style: italic; }
  .lp-testi-author { display: flex; align-items: center; gap: 12px; }
  .lp-testi-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green));
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; color: #fff; font-size: .9rem;
  }
  .lp-testi-name { font-size: .85rem; font-weight: 700; color: var(--lp-dark); }
  .lp-testi-role { font-size: .76rem; color: var(--lp-soft); }

  /* ── PRICING ── */
  .lp-pricing { background: var(--lp-bg); }
  .lp-pricing-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px; margin-top: 56px; max-width: 960px; margin-left: auto; margin-right: auto;
  }
  .lp-price-card {
    background: #fff; border: 1px solid var(--lp-border); border-radius: var(--lp-radius);
    padding: 36px 30px; transition: box-shadow .2s, transform .2s;
  }
  .lp-price-card:hover { box-shadow: var(--lp-shadow-md); transform: translateY(-3px); }
  .lp-price-card.featured {
    border-color: var(--lp-teal); position: relative;
    box-shadow: 0 8px 32px rgba(13,148,136,.15);
  }
  .lp-price-card.featured::before {
    content: 'Most Popular'; position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green)); color: #fff;
    font-size: .72rem; font-weight: 700; padding: 4px 16px; border-radius: 50px;
  }
  .lp-price-name { font-size: 1.1rem; font-weight: 800; margin-bottom: 4px; }
  .lp-price-cost { font-size: 2.2rem; font-weight: 900; color: var(--lp-text); line-height: 1; margin: 8px 0 2px; }
  .lp-price-cost span { font-size: .95rem; font-weight: 500; color: var(--lp-mid); }
  .lp-price-amount { font-size: .95rem; color: var(--lp-teal); font-weight: 700; margin-bottom: 20px; }
  .lp-price-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; padding: 0; }
  .lp-price-list li { font-size: .86rem; color: var(--lp-mid); display: flex; align-items: flex-start; gap: 8px; }
  .lp-pi { color: var(--lp-teal); flex-shrink: 0; }
  .lp-price-list li.disabled { color: var(--lp-soft); }
  .lp-price-list li.disabled .lp-pi { color: var(--lp-soft); }
  .lp-price-btn {
    display: block; width: 100%; text-align: center; padding: 12px; border-radius: 50px;
    font-size: .9rem; font-weight: 700; text-decoration: none; transition: all .15s;
    border: 2px solid var(--lp-teal); color: var(--lp-teal); background: #fff;
  }
  .lp-price-btn:hover { background: var(--lp-teal-pale); }
  .lp-price-btn.primary {
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green)); color: #fff; border-color: transparent;
    box-shadow: 0 2px 10px rgba(13,148,136,.3);
  }
  .lp-price-btn.primary:hover { opacity: .9; transform: translateY(-1px); }

  /* ── FAQ ── */
  .lp-faq { background: #fff; }
  .lp-faq-wrap { max-width: 720px; margin: 52px auto 0; }
  .lp-faq-item { border-bottom: 1px solid var(--lp-border); }
  .lp-faq-q {
    width: 100%; background: none; border: none; cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 0; text-align: left;
    font-family: 'Inter', sans-serif; font-size: .95rem; font-weight: 600; color: var(--lp-dark);
  }
  .lp-faq-icon { font-size: 1.2rem; color: var(--lp-teal); transition: transform .2s; flex-shrink: 0; }
  .lp-faq-item.open .lp-faq-icon { transform: rotate(45deg); }
  .lp-faq-a {
    overflow: hidden; max-height: 0; transition: max-height .3s ease;
    font-size: .88rem; color: var(--lp-mid); line-height: 1.7;
  }
  .lp-faq-a p { padding-bottom: 18px; }
  .lp-faq-item.open .lp-faq-a { max-height: 200px; }

  /* ── CTA BANNER ── */
  .lp-cta-banner {
    background: linear-gradient(135deg, var(--lp-dark) 0%, #0d2d26 100%);
    padding: 96px 5%; text-align: center; position: relative; overflow: hidden;
  }
  .lp-cta-banner::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 60% at 50% 0%, rgba(13,148,136,.25), transparent);
  }
  .lp-cta-banner h2 { color: #fff; position: relative;
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 800; letter-spacing: -1px; line-height: 1.15; margin-bottom: 16px;
  }
  .lp-cta-banner .lp-section-sub { color: #94a3b8; margin: 14px auto 44px; position: relative; }
  .lp-cta-url-wrap { max-width: 560px; margin: 0 auto; position: relative; }
  .lp-cta-url-row {
    display: flex; background: rgba(255,255,255,.07);
    border: 2px solid rgba(255,255,255,.12);
    border-radius: 60px; overflow: hidden;
  }
  .lp-cta-url-row:focus-within { border-color: var(--lp-teal-mid); }
  .lp-cta-url-row input {
    flex: 1; border: none; outline: none; padding: 16px 22px;
    font-size: .95rem; font-family: 'Inter', sans-serif;
    color: #fff; background: transparent;
  }
  .lp-cta-url-row input::placeholder { color: rgba(255,255,255,.35); }
  .lp-cta-url-row button {
    background: linear-gradient(135deg, var(--lp-teal), var(--lp-green));
    color: #fff; border: none; padding: 0 28px;
    font-size: .93rem; font-weight: 700; cursor: pointer;
    transition: opacity .15s; white-space: nowrap;
  }
  .lp-cta-url-row button:hover { opacity: .9; }
  .lp-cta-note { font-size: .78rem; color: rgba(255,255,255,.35); margin-top: 12px; position: relative; }

  /* ── FOOTER ── */
  .lp-footer {
    background: var(--lp-dark); color: #64748b;
    padding: 52px 5% 32px;
  }
  .lp-footer-top { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 40px; margin-bottom: 48px; }
  .lp-footer-brand p { font-size: .84rem; margin-top: 12px; max-width: 240px; line-height: 1.65; }
  .lp-footer-col h4 { font-size: .82rem; font-weight: 700; color: #e2e8f0; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 16px; }
  .lp-footer-col a { display: block; font-size: .84rem; color: #64748b; text-decoration: none; margin-bottom: 9px; transition: color .15s; }
  .lp-footer-col a:hover { color: var(--lp-teal-mid); }
  .lp-footer-bottom { border-top: 1px solid rgba(255,255,255,.06); padding-top: 24px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: .78rem; }

  /* ── RESPONSIVE ── */
  @media(max-width:700px){
    .lp-nav-links { display: none; }
    .lp-steps { flex-direction: column; align-items: center; }
    .lp-step-arrow { display: none; }
    .lp-footer-top { flex-direction: column; }
  }
`;
