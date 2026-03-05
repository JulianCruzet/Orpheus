"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Search,
  Megaphone,
  Store,
  MessageSquare,
  TrendingUp,
  Zap,
  Package,
  ArrowUpRight,
} from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

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
  const inView = useInView(ref, { once: true, margin: "-100px" });
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

/* ─────────────── Navbar ─────────────── */

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <span
          className="text-[15px] tracking-[-0.01em] text-[#e8e4de]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Shams-E
        </span>

        <div className="hidden items-center gap-8 md:flex">
          {["Features", "Process", "About"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-[13px] font-light tracking-wide text-white/30 transition-colors duration-300 hover:text-[#e8e4de]"
            >
              {item}
            </a>
          ))}
        </div>

        <a
          href="#access"
          className="text-[13px] font-light tracking-wide text-[#5EEAD4] transition-colors duration-300 hover:text-[#e8e4de]"
        >
          Request Access
        </a>
      </div>
    </motion.nav>
  );
}

/* ─────────────── Hero ─────────────── */

function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <ShaderAnimation />
      </div>

      {/* Overlay — just darkness, no fancy gradients */}
      <div className="absolute inset-0 bg-[#050505]/60" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050505] to-transparent" />

      <motion.div
        style={{ opacity }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6"
      >
        {/* Overline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-6 text-[11px] uppercase tracking-[0.35em] text-white/25"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          AI-powered commerce
        </motion.p>

        {/* Title — Instrument Serif, editorial scale */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-4xl text-center text-[clamp(3rem,8vw,7.5rem)] leading-[0.95] tracking-[-0.04em] text-[#e8e4de]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The co-founder
          <br />
          <span className="italic text-[#5EEAD4]">you never hired</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-8 max-w-lg text-center text-[15px] font-light leading-[1.7] text-white/35"
        >
          Describe what you want to sell. Shams-E researches the market, writes
          the listings, and publishes to your Shopify store. One conversation.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-12 flex items-center gap-6"
        >
          <a
            href="#access"
            className="group flex items-center gap-3 border border-white/10 bg-white/[0.03] px-7 py-3.5 text-[13px] font-medium tracking-wide text-[#e8e4de] transition-all duration-300 hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 opacity-40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </a>
          <span className="text-[13px] font-light text-white/20">
            Free during beta
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─────────────── Spline / Agent section ─────────────── */

function AgentSection() {
  return (
    <section className="relative border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
        <div className="relative flex min-h-[520px] flex-col overflow-hidden border border-white/[0.06] bg-[#080808] lg:flex-row">
          <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20"
            fill="rgba(94, 234, 212, 0.4)"
          />

          {/* Left */}
          <div className="relative z-10 flex flex-1 flex-col justify-center px-10 py-16 lg:px-16">
            <Reveal>
              <p
                className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#5EEAD4]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Agent
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <h2
                className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.03em] text-[#e8e4de]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                It doesn&rsquo;t suggest.
                <br />
                <span className="text-white/25">It executes.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-6 max-w-md text-[14px] font-light leading-[1.8] text-white/30">
                Research markets. Generate listings. Set competitive pricing.
                Publish to Shopify. Real actions on your real store, driven by a
                single conversation.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-10 flex flex-col gap-4">
                {[
                  "Creates live Shopify listings",
                  "Scrapes competitor pricing",
                  "Writes SEO-optimized copy",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="h-px w-4 bg-[#5EEAD4]/40" />
                    <span className="text-[13px] font-light text-white/45">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right — 3D scene */}
          <div className="relative flex-1">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="h-full w-full"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#080808] to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Features ─────────────── */

const features = [
  {
    icon: Search,
    label: "Research",
    title: "Market Research",
    description:
      "Validates your niche with competitor data, trend analysis, and pricing intelligence. Real data, not speculation.",
  },
  {
    icon: Package,
    label: "Generate",
    title: "Product Listings",
    description:
      "Titles, descriptions, tags, and SEO metadata — optimized and published. Your catalog, built in minutes.",
  },
  {
    icon: Store,
    label: "Manage",
    title: "Store Operations",
    description:
      "Inventory levels, order tracking, pricing adjustments. Manage your entire store through plain language.",
  },
  {
    icon: Megaphone,
    label: "Launch",
    title: "Marketing",
    description:
      "Email campaigns, social copy, discount codes. Go from new collection to full launch in a single prompt.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
        <Reveal>
          <div className="mb-20 max-w-lg">
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#5EEAD4]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Capabilities
            </p>
            <h2
              className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.03em] text-[#e8e4de]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Four tools.
              <br />
              <span className="text-white/25">One interface.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-px border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="group relative flex h-full flex-col justify-between bg-[#050505] p-8 transition-colors duration-500 hover:bg-[#0a0a0a] lg:p-10">
                {/* Top row */}
                <div>
                  <div className="mb-8 flex items-center justify-between">
                    <f.icon className="h-5 w-5 text-white/20 transition-colors duration-500 group-hover:text-[#5EEAD4]" />
                    <span
                      className="text-[11px] uppercase tracking-[0.2em] text-white/15"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {f.label}
                    </span>
                  </div>
                  <h3 className="mb-3 text-[18px] font-medium tracking-[-0.01em] text-[#e8e4de]">
                    {f.title}
                  </h3>
                  <p className="text-[13px] font-light leading-[1.7] text-white/30">
                    {f.description}
                  </p>
                </div>

                {/* Bottom link */}
                <div className="mt-8">
                  <span className="inline-flex items-center gap-1.5 text-[12px] tracking-wide text-white/15 transition-colors duration-300 group-hover:text-[#5EEAD4]">
                    Learn more
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── How it works ─────────────── */

const steps = [
  {
    n: "01",
    icon: MessageSquare,
    title: "Describe",
    body: "Tell Shams-E what you want to sell. A product, a niche, a half-formed idea. Natural language is all you need.",
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
    title: "Launch",
    body: "Products go live. Marketing assets are generated. Discount codes created. You're selling.",
  },
];

function ProcessSection() {
  return (
    <section id="process" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
        <Reveal>
          <div className="mb-20 max-w-lg">
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.3em] text-[#5EEAD4]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Process
            </p>
            <h2
              className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.03em] text-[#e8e4de]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Idea to revenue.
              <br />
              <span className="text-white/25">Three steps.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-px border border-white/[0.06] bg-white/[0.06] md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <div className="group relative flex h-full flex-col bg-[#050505] p-8 transition-colors duration-500 hover:bg-[#0a0a0a] lg:p-10">
                {/* Number */}
                <span
                  className="mb-10 text-[11px] tracking-[0.2em] text-white/10"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {step.n}
                </span>

                {/* Icon */}
                <step.icon className="mb-6 h-5 w-5 text-white/15 transition-colors duration-500 group-hover:text-[#5EEAD4]" />

                <h3 className="mb-3 text-[18px] font-medium tracking-[-0.01em] text-[#e8e4de]">
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
              Start building
              <br />
              <span className="italic text-[#5EEAD4]">your store</span>
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-8 max-w-md text-[15px] font-light leading-[1.7] text-white/30">
              Join the beta. No credit card. No setup. Just tell Shams-E what
              you want to sell.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-12">
              <button className="group flex items-center gap-3 bg-[#5EEAD4] px-8 py-4 text-[13px] font-medium tracking-wide text-[#050505] transition-all duration-300 hover:bg-[#e8e4de]">
                Request Early Access
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
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
          Shams-E
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

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#050505]">
      <Navbar />
      <HeroSection />
      <AgentSection />
      <FeaturesSection />
      <ProcessSection />
      <CTASection />
      <Footer />
    </main>
  );
}
