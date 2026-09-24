"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import PluvialLogo from "@/components/ui/PluvialLogo";

// ── Animation variants ────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUpVariant = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};

function ScrollFade({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{ duration: 0.75, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ScrollStagger({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const funnelSteps = [
  {
    value: "129M",
    label: "Building footprints ingested",
    sub: "Microsoft USBuildingFootprints + Overture Maps — entire continental US",
  },
  {
    value: "~2M",
    label: "Commercial candidates",
    sub: "Filtered by NAICS codes, roof area >100,000 sq ft, non-residential classification",
  },
  {
    value: "50k+",
    label: "Fully scored buildings",
    sub: "After joining precipitation, utility rates, ESG risk, and regulatory layers",
  },
  {
    value: "11,577",
    label: "High-opportunity targets",
    sub: "Top-ranked across 37 states — surfaced on the interactive map",
  },
];

const dataSources = [
  {
    category: "Geometry",
    source: "Microsoft USBuildingFootprints",
    detail: "129M records — polygon area, classification, centroid",
  },
  {
    category: "Industrial signals",
    source: "EPA Facility Registry Service + NAICS",
    detail: "Flags cooling towers: non-potable water demand proxy",
  },
  {
    category: "Climate yield",
    source: "NOAA 30-Year Climatology Normals",
    detail: "Location-specific rainfall to calculate max harvestable gallons/yr",
  },
  {
    category: "Financials",
    source: "EFC Utility Dashboards + Municipal Open Data",
    detail: "Localized water/sewer rates for NPV, payback, ROI",
  },
  {
    category: "ESG & risk",
    source: "WRI Aqueduct Water Risk Atlas + SBTN/GRI",
    detail: "Drought stress index + corporate water-target compliance scores",
  },
  {
    category: "Policy",
    source: "TCEQ + State Tax Codes",
    detail: "Equipment exemptions factored into base and upside financial scenarios",
  },
];

const scoringDimensions = [
  {
    number: "01",
    title: "Physical Viability",
    detail: "Roof polygon area, geometry classification, structural signals from satellite + footprint data.",
  },
  {
    number: "02",
    title: "Financial Return",
    detail: "Three-scenario ROI model: base, conservative, upside. 10-year NPV, payback period, annualized savings.",
  },
  {
    number: "03",
    title: "Regulatory Incentives",
    detail: "State-level equipment tax exemptions, rebate programs, stormwater fee offset calculations.",
  },
  {
    number: "04",
    title: "ESG Alignment",
    detail: "SBTi water target compliance, GRI water reporting relevance, corporate sustainability mandate fit.",
  },
  {
    number: "05",
    title: "Climate Drought Risk",
    detail: "WRI Aqueduct water stress score + SBTN basin criticality — urgency multiplier on ROI.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PresentationPage() {
  return (
    <div
      className="bg-white text-[#1a1a1a] min-h-screen overflow-x-hidden"
      style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/90 backdrop-blur-sm border-b border-[#f0f0f0]"
      >
        <Link href="/" className="flex items-center gap-3">
          <PluvialLogo size={40} />
          <span className="text-[26px] font-bold text-[#1a1a1a] tracking-tight">Pluvial</span>
        </Link>

        <Link
          href="/"
          className="group hidden md:inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5F78] px-6 py-2.5 text-[16px] font-semibold text-white transition-colors duration-500 ease-out hover:bg-[#9FC7D6]"
        >
          <span>View Landing Page</span>
          <span className="transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-0.5">↗</span>
        </Link>
      </motion.header>

      {/* ── Hero / Cover ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden px-6">

        {/* Hackathon chip */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#0F5F78]/25 bg-[#0F5F78]/6 px-6 py-2.5"
        >
          <span className="text-[20px] font-bold uppercase tracking-[0.15em] text-[#0F5F78]">
            HackSMU VII &nbsp;·&nbsp; 2026
          </span>
        </motion.div>

        {/* Big project name */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative z-10 text-center mx-auto max-w-[900px] mb-10"
        >
          <motion.div variants={fadeUpVariant} className="overflow-visible pb-2">
            <span
              className="block text-[96px] sm:text-[128px] md:text-[160px] lg:text-[192px] leading-[0.92] tracking-[-5px] text-[#1a1a1a]"
              style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
            >
              Pluvial
            </span>
          </motion.div>
        </motion.div>

        {/* Info panel box */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: EASE, delay: 0.45 }}
          className="relative z-10 w-full max-w-3xl rounded-3xl border border-[#d4e8ef] bg-white/80 backdrop-blur-sm px-10 py-8 shadow-[0_8px_40px_rgba(15,95,120,0.10)]"
        >
          <p
            className="text-[26px] md:text-[30px] font-semibold text-[#0F5F78] mb-7 leading-snug tracking-[-0.3px]"
            style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
          >
            Automated Water-Reuse Prospecting Engine
          </p>

          <div className="flex flex-col gap-4 text-[20px] md:text-[22px] text-[#444444] leading-snug">
            <div className="flex items-start gap-3">
              <svg className="mt-1 shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F5F78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>April 11, 9:00 AM&nbsp;–&nbsp;April 12, 6:00 PM 2026</span>
            </div>

            <div className="flex items-start gap-3">
              <svg className="mt-1 shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F5F78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Hughes Trigg Student Center&nbsp;·&nbsp;Southern Methodist University&nbsp;·&nbsp;Dallas, TX</span>
            </div>

            <div className="flex items-start gap-3">
              <svg className="mt-1 shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F5F78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>
                Presented by&nbsp;
                <span className="font-semibold text-[#1a1a1a]">Ujjwal Gupta</span>
                &nbsp;·&nbsp;University of Texas Dallas
              </span>
            </div>
          </div>
        </motion.div>

        {/* Teal slab */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.7 }}
          className="absolute bottom-0 left-1/2 h-[22%] w-[96%] max-w-[1440px] -translate-x-1/2 rounded-t-[48px] bg-[#9FC7D6]/30"
        />

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="absolute bottom-8 flex flex-col items-center gap-2 text-[#929292] z-10"
        >
          <span className="text-[16px] uppercase tracking-[0.18em]">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Data Funnel ────────────────────────────────────────────────────── */}
      <section className="px-8 md:px-16 lg:px-24 py-24 md:py-32">
        <ScrollFade>
          <p className="text-[20px] uppercase tracking-[0.16em] text-[#929292] mb-8 font-semibold">
            The Data Pipeline
          </p>
        </ScrollFade>

        <ScrollFade delay={0.08}>
          <h2
            className="text-[52px] md:text-[68px] lg:text-[84px] leading-[1.0] tracking-[-2px] text-[#1a1a1a] mb-6 max-w-4xl"
            style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
          >
            129 million records.
            <br />
            <span className="text-[#0F5F78]">11,577 opportunities.</span>
          </h2>
        </ScrollFade>

        <ScrollFade delay={0.14}>
          <p className="text-[22px] md:text-[24px] text-[#6f6f6f] leading-[1.65] max-w-3xl mb-16">
            The entire continental US building stock — ingested, filtered, joined across six independent
            data authorities, and scored in a single automated pipeline.
          </p>
        </ScrollFade>

        {/* Funnel steps */}
        <ScrollStagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-20">
          {funnelSteps.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeUpVariant}
              className="rounded-2xl border border-[#efefef] bg-[#fafafa] px-8 py-8 relative overflow-hidden"
            >
              {/* step number watermark */}
              <span
                className="absolute top-4 right-6 text-[72px] font-bold text-[#f0f0f0] leading-none select-none"
                style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
              >
                {i + 1}
              </span>
              <div
                className="text-[52px] md:text-[60px] font-semibold text-[#0F5F78] leading-none mb-3 relative z-10"
                style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
              >
                {step.value}
              </div>
              <p className="text-[20px] font-semibold text-[#1a1a1a] mb-2 relative z-10">{step.label}</p>
              <p className="text-[18px] text-[#929292] leading-snug relative z-10">{step.sub}</p>
            </motion.div>
          ))}
        </ScrollStagger>

        {/* Data sources table */}
        <ScrollFade>
          <p className="text-[20px] uppercase tracking-[0.16em] text-[#929292] mb-10 font-semibold">
            Six Data Authorities
          </p>
        </ScrollFade>

        <ScrollStagger>
          {dataSources.map((row, i) => (
            <motion.div
              key={i}
              variants={fadeUpVariant}
              className="grid grid-cols-1 md:grid-cols-[180px_1fr_1fr] py-6 border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors duration-150 items-start gap-3 md:gap-8"
            >
              <p className="text-[18px] font-bold uppercase tracking-[0.1em] text-[#0F5F78]">{row.category}</p>
              <p className="text-[20px] font-semibold text-[#1a1a1a]">{row.source}</p>
              <p className="text-[20px] text-[#6f6f6f] leading-snug">{row.detail}</p>
            </motion.div>
          ))}
        </ScrollStagger>
      </section>

      {/* ── Scoring System ─────────────────────────────────────────────────── */}
      <section className="px-8 py-24 md:px-16 md:py-32 lg:px-24 bg-[#f7fbfc]">
        <ScrollFade>
          <p className="text-[20px] uppercase tracking-[0.16em] text-[#929292] mb-8 font-semibold">
            The Score
          </p>
        </ScrollFade>

        <div className="grid md:grid-cols-2 gap-12 md:gap-20 mb-20">
          <ScrollFade delay={0.05}>
            <h2
              className="text-[52px] md:text-[68px] lg:text-[80px] leading-[1.0] tracking-[-2px] text-[#1a1a1a]"
              style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
            >
              Five dimensions.
              <br />
              One score.
            </h2>
          </ScrollFade>

          <ScrollFade delay={0.15} className="flex flex-col justify-center gap-5">
            <p className="text-[22px] md:text-[24px] leading-[1.7] text-[#444444]">
              Every building in the dataset is ranked by a composite score that merges physical,
              financial, policy, ESG, and climate signals — no single dimension dominates.
            </p>
            <p className="text-[22px] md:text-[24px] leading-[1.7] text-[#444444]">
              The output: a ranked list of the highest-certainty, highest-return targets across
              the country, each paired with a three-scenario financial model and an
              AI-generated investment brief powered by Gemini.
            </p>
          </ScrollFade>
        </div>

        {/* 5 scoring dimensions */}
        <ScrollStagger className="grid gap-6 md:grid-cols-5">
          {scoringDimensions.map((dim) => (
            <motion.div key={dim.number} variants={fadeUpVariant}>
              <div className="border-t-2 border-[#9FC7D6] pt-8">
                <div
                  className="mb-6 text-[64px] leading-none tracking-[-0.04em] text-[#9FC7D6]"
                  style={{ fontFamily: "var(--font-inter-sans), var(--font-dm-sans), system-ui, sans-serif" }}
                >
                  {dim.number}
                </div>
                <h3
                  className="mb-4 text-[24px] md:text-[26px] leading-tight text-[#1a1a1a]"
                  style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
                >
                  {dim.title}
                </h3>
                <p className="text-[18px] md:text-[20px] leading-relaxed text-[#7a7a7a]">
                  {dim.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </ScrollStagger>

        {/* Dashboard mockup */}
        <ScrollFade delay={0.1} className="mt-20">
          <div className="relative mx-auto w-full max-w-5xl">
            <div className="bg-[#1c1c2a] rounded-[18px] p-[10px] shadow-[0_32px_80px_rgba(0,0,0,0.2)]">
              <div className="bg-[#0d1f14] rounded-[10px] overflow-hidden relative" style={{ aspectRatio: "16/9" }}>
                <Image
                  src="/images/div.png"
                  alt="Pluvial prospecting dashboard"
                  fill
                  className="object-cover object-center"
                  sizes="(min-width: 1024px) 1024px, 100vw"
                />
              </div>
              <div className="flex justify-center mt-2">
                <div className="w-10 h-1 bg-white/15 rounded-full" />
              </div>
            </div>
          </div>
        </ScrollFade>
      </section>

      {/* ── Prize ──────────────────────────────────────────────────────────── */}
      <section className="px-8 py-24 md:px-16 md:py-32 lg:px-24">
        <ScrollFade>
          <p className="text-[20px] uppercase tracking-[0.16em] text-[#929292] mb-8 font-semibold">
            Recognition
          </p>
        </ScrollFade>

        <ScrollFade delay={0.1}>
          <h2
            className="mb-16 text-[52px] md:text-[68px] lg:text-[84px] leading-[1.0] tracking-[-2px] text-[#1a1a1a]"
            style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
          >
            Placed at HackSMU VII.
          </h2>
        </ScrollFade>

        {/* Two-panel: award info + photo */}
        <ScrollFade delay={0.15}>
          <div className="grid md:grid-cols-2 gap-8">

            {/* Award info panel */}
            <div className="relative overflow-hidden rounded-3xl border border-[#d4e8ef] bg-gradient-to-br from-[#f0f9fc] via-[#e8f4f8] to-[#dceef5] px-10 py-12 shadow-[0_8px_48px_rgba(15,95,120,0.12)] flex flex-col justify-center">
              <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full border border-[#9FC7D6]/30 opacity-60" />
              <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full border border-[#9FC7D6]/20 opacity-40" />

              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[#0F5F78]/10">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0F5F78" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>

              <h3
                className="text-[56px] md:text-[64px] leading-none tracking-[-2px] text-[#0F5F78] mb-3"
                style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
              >
                3rd Place Overall
              </h3>
              <p className="text-[22px] text-[#4f7990] mb-8">
                Southern Methodist University · Dallas, TX
              </p>

              <div className="h-px w-24 bg-[#9FC7D6]/60 mb-8" />

              <p className="text-[20px] uppercase tracking-[0.14em] text-[#929292] mb-2">Prize Awarded</p>
              <p
                className="text-[36px] text-[#1a1a1a] tracking-[-0.5px]"
                style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
              >
                Apple AirPods
              </p>
            </div>

            {/* Prize photo panel */}
            <div className="rounded-3xl border border-[#e8e8e8] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)] relative min-h-[420px]">
              <Image
                src="/images/prize_image.png"
                alt="Ujjwal Gupta receiving the prize at HackSMU VII"
                fill
                className="object-cover object-center"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </div>

          </div>
        </ScrollFade>

        {/* CTA */}
        <ScrollFade delay={0.2} className="mt-16 text-center">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5F78] px-12 py-5 text-[20px] font-semibold text-white transition-colors duration-500 ease-out hover:bg-[#9FC7D6]"
          >
            <span>View Landing Page</span>
            <span className="transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-0.5">↗</span>
          </Link>
        </ScrollFade>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-8 md:px-16 lg:px-24 py-8 border-t border-[#e5e5e5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="18" height="26" viewBox="0 0 18 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="3" r="2.5" fill="#1a1a1a" />
              <path
                d="M9 7 L6 13 L3.5 13 M9 7 L11 11 M6 13 L5 20.5 M6 13 L11 13 M11 13 L12.5 20.5 M11 11 L13.5 12"
                stroke="#1a1a1a"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[13px] text-[#929292]">© Pluvial 2026</span>
          </div>
          <span className="text-[13px] text-[#929292]">Ujjwal Gupta</span>
        </div>
      </footer>
    </div>
  );
}
