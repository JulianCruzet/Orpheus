"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Search,
  Megaphone,
  Store,
  Package,
  MessageSquare,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  ShoppingBag,
  Globe,
} from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import ScrollExpandMedia from "@/components/ui/scroll-expansion-hero";

/* ─────────────── Animation helpers ─────────────── */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────── Scroll Expansion Hero ─────────────── */

function ExpansionHero() {
  return (
    <ScrollExpandMedia
      mediaType="image"
      mediaSrc="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1280&auto=format&fit=crop"
      bgImageSrc="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1920&auto=format&fit=crop"
      title="Your AI Co-Founder"
      date="Orpheus"
      scrollToExpand="Scroll to explore"
      textBlend
    >
      {/* Content revealed after expansion */}
      <div className="max-w-4xl mx-auto text-center">
        <p
          className="mb-4 text-[11px] uppercase tracking-[0.35em] text-[#5EEAD4]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          AI-powered commerce
        </p>
        <h2
          className="text-[clamp(2rem,5vw,4rem)] leading-[1] tracking-[-0.03em] text-[#e8e4de] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          From idea to live store.
          <br />
          <span className="italic text-[#5EEAD4]">One conversation.</span>
        </h2>
        <p className="text-[15px] font-light leading-[1.8] text-white/40 max-w-lg mx-auto mb-10">
          Describe what you want to sell. Orpheus researches the market, writes
          the listings, sets pricing, and publishes to your Shopify store — all
          through natural language.
        </p>
        <a
          href="#features"
          className="inline-flex items-center gap-3 border border-white/10 bg-white/[0.03] px-7 py-3.5 text-[13px] font-medium tracking-wide text-[#e8e4de] transition-all duration-300 hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]"
        >
          See how it works
          <ArrowRight className="h-3.5 w-3.5 opacity-40" />
        </a>
      </div>
    </ScrollExpandMedia>
  );
}

/* ─────────────── Stats bar ─────────────── */

function StatsBar() {
  const stats = [
    { value: "10x", label: "Faster store setup" },
    { value: "3min", label: "Idea to listing" },
    { value: "100%", label: "Automated research" },
    { value: "24/7", label: "Always available" },
  ];

  return (
    <section className="border-y border-white/[0.06] bg-[#080808]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06]">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.05}>
              <div className="py-10 px-6 text-center">
                <p
                  className="text-[clamp(1.5rem,3vw,2.5rem)] tracking-[-0.03em] text-[#5EEAD4]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-[12px] font-light tracking-wide text-white/25">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Features — alternating rows ─────────────── */

const featureRows = [
  {
    icon: Search,
    tag: "Research",
    title: "Market intelligence\non autopilot.",
    description:
      "Orpheus scrapes competitor stores, analyzes Google Trends, and pulls pricing data across your niche. You get a full competitive landscape before you list a single product.",
    bullets: [
      "Competitor pricing analysis",
      "Trending product discovery",
      "Demand validation with real data",
    ],
  },
  {
    icon: Package,
    tag: "Generate",
    title: "Listings that\nactually convert.",
    description:
      "Optimized titles, persuasive descriptions, smart tags, and SEO metadata — all generated from a single prompt. Your catalog goes from empty to launch-ready in minutes.",
    bullets: [
      "SEO-optimized product copy",
      "Automatic tag generation",
      "Pricing recommendations",
    ],
  },
  {
    icon: Store,
    tag: "Manage",
    title: "Run your store\nwith plain English.",
    description:
      "Inventory tracking, order management, and pricing adjustments — all through conversation. Ask questions, give commands, get results.",
    bullets: [
      "Natural language commands",
      "Inventory monitoring & alerts",
      "Order tracking & fulfillment",
    ],
  },
  {
    icon: Megaphone,
    tag: "Launch",
    title: "Go from product\nto promotion instantly.",
    description:
      "Email campaigns, social media copy, discount codes, and ad creative — generated and ready to deploy the moment your products go live.",
    bullets: [
      "Email & social campaigns",
      "Discount code automation",
      "Multi-channel ad copy",
    ],
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
        <Reveal>
          <div className="mb-20 text-center">
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#5EEAD4]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Capabilities
            </p>
            <h2
              className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-[#e8e4de]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Everything your store needs.
              <br />
              <span className="text-white/25">Nothing it doesn&rsquo;t.</span>
            </h2>
          </div>
        </Reveal>

        <div className="flex flex-col gap-px bg-white/[0.06]">
          {featureRows.map((f, i) => (
            <Reveal key={f.tag} delay={0.05}>
              <div
                className={`group flex flex-col bg-[#050505] transition-colors duration-500 hover:bg-[#0a0a0a] ${
                  i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                {/* Text side */}
                <div className="flex flex-1 flex-col justify-center p-8 lg:p-14">
                  <div className="mb-6 flex items-center gap-3">
                    <f.icon className="h-4 w-4 text-[#5EEAD4]" />
                    <span
                      className="text-[11px] uppercase tracking-[0.25em] text-[#5EEAD4]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {f.tag}
                    </span>
                  </div>

                  <h3
                    className="text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.1] tracking-[-0.02em] text-[#e8e4de] whitespace-pre-line"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {f.title}
                  </h3>

                  <p className="mt-5 max-w-md text-[14px] font-light leading-[1.8] text-white/30">
                    {f.description}
                  </p>
                </div>

                {/* Bullet side */}
                <div className="flex flex-1 flex-col justify-center border-t border-white/[0.06] p-8 lg:border-t-0 lg:border-l lg:p-14">
                  <div className="flex flex-col gap-5">
                    {f.bullets.map((bullet, j) => (
                      <div key={j} className="flex items-start gap-4">
                        <span className="mt-1.5 h-px w-5 shrink-0 bg-[#5EEAD4]/30" />
                        <span className="text-[14px] font-light leading-[1.6] text-white/45">
                          {bullet}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <span className="inline-flex items-center gap-1.5 text-[12px] tracking-wide text-white/15 transition-colors duration-300 group-hover:text-[#5EEAD4]">
                      Learn more
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Shader accent section — "How it works" ─────────────── */

const steps = [
  {
    n: "01",
    icon: MessageSquare,
    title: "Describe",
    body: "Tell Orpheus what you want to sell. A product, a niche, a half-formed idea. Natural language is all it takes.",
  },
  {
    n: "02",
    icon: TrendingUp,
    title: "Research & Create",
    body: "The agent scrapes competitors, analyzes demand, generates optimized listings, and publishes them to your store.",
  },
  {
    n: "03",
    icon: Zap,
    title: "Launch & Grow",
    body: "Products go live. Marketing assets are generated. Discount codes created. You're selling — in minutes.",
  },
];

function ProcessSection() {
  return (
    <section id="process" className="relative border-t border-white/[0.06] overflow-hidden">
      {/* Shader background */}
      <div className="absolute inset-0 opacity-30">
        <WebGLShader />
      </div>
      <div className="absolute inset-0 bg-[#050505]/80" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
        <Reveal>
          <div className="mb-20 text-center">
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#5EEAD4]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Process
            </p>
            <h2
              className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-[#e8e4de]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Idea to revenue.
              <br />
              <span className="text-white/25">Three steps.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <div className="group relative flex flex-col rounded-lg border border-white/[0.06] bg-[#050505]/60 p-8 backdrop-blur-sm transition-all duration-500 hover:border-[#5EEAD4]/20 hover:bg-[#0a0a0a]/80 lg:p-10">
                {/* Number */}
                <span
                  className="mb-8 text-[40px] font-light tracking-[-0.04em] text-white/[0.04]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.n}
                </span>

                {/* Icon */}
                <step.icon className="mb-5 h-5 w-5 text-white/20 transition-colors duration-500 group-hover:text-[#5EEAD4]" />

                <h3 className="mb-3 text-[20px] font-medium tracking-[-0.01em] text-[#e8e4de]">
                  {step.title}
                </h3>
                <p className="text-[13px] font-light leading-[1.7] text-white/30">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Social proof / trust ─────────────── */

function TrustSection() {
  const items = [
    { icon: Sparkles, text: "Powered by Claude AI" },
    { icon: ShoppingBag, text: "Direct Shopify integration" },
    { icon: Globe, text: "Real-time market data" },
    { icon: BarChart3, text: "Data-driven decisions" },
  ];

  return (
    <section className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <Reveal>
          <div className="flex flex-col items-center gap-10 md:flex-row md:justify-between">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-white/15" />
                <span className="text-[13px] font-light tracking-wide text-white/25">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────── CTA ─────────────── */

function CTASection() {
  return (
    <section id="access" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-6 py-32 lg:py-40">
        <div className="flex flex-col items-center text-center">
          <Reveal>
            <h2
              className="max-w-2xl text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.04em] text-[#e8e4de]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Stop planning.
              <br />
              <span className="italic text-[#5EEAD4]">Start selling.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-8 max-w-md text-[15px] font-light leading-[1.7] text-white/30">
              Join the beta. No credit card. No setup. Just tell Orpheus what
              you want to sell and watch it build your store.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <button className="group flex items-center gap-3 bg-[#5EEAD4] px-8 py-4 text-[13px] font-medium tracking-wide text-[#050505] transition-all duration-300 hover:bg-[#e8e4de]">
                Request Early Access
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <span className="text-[13px] font-light text-white/20">
                Free during beta
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Footer ─────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <span
          className="text-[14px] text-white/20"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Orpheus
        </span>

        <div className="flex gap-6">
          {["Twitter", "GitHub", "Discord"].map((s) => (
            <a
              key={s}
              href="#"
              className="text-[12px] font-light tracking-wide text-white/15 transition-colors duration-300 hover:text-white/40"
            >
              {s}
            </a>
          ))}
        </div>

        <span className="text-[12px] font-light text-white/10">
          &copy; 2026
        </span>
      </div>
    </footer>
  );
}

/* ─────────────── Page ─────────────── */

export default function HomeV2() {
  return (
    <main className="relative min-h-screen bg-[#050505]">
      <ExpansionHero />
      <StatsBar />
      <FeaturesSection />
      <ProcessSection />
      <TrustSection />
      <CTASection />
      <Footer />
    </main>
  );
}
