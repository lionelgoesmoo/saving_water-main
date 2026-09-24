"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import ToneLogo from "@/components/ui/ToneLogo";

// ── Animation variants ────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUpVariant = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: EASE },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
};

/** Scroll-triggered fade-up wrapper */
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

/** Scroll-triggered stagger container */
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

const stats = [
  { value: "37+", label: "States Analyzed" },
  { value: "50k+", label: "Buildings Scanned" },
  { value: "ROI", label: "Calculations — Real Time" },
  { value: "AI", label: "Assessment Brief" },
];

const tableHeaders = ["Data Variable", "Source Authority", "Impact on Pluvial Engine"];

const tableRows = [
  {
    category: "Geospatial & Physical",
    variable: "Roof Geometry & Classification",
    source: "Open Building Footprints & Overture Maps",
    impact: "Filters continental records to isolate commercial roofs >50,000 sq ft (4,645 m²), removing non-catchment structures.",
  },
  {
    category: "Industrial Signatures",
    variable: "Cooling Tower Presence",
    source: "High-Resolution Satellite CV & Industrial Registry",
    impact: "Spatially identifies facility rooftop cooling towers with heavy non-potable makeup water demands.",
  },
  {
    category: "Climate & Yield",
    variable: "Annual Precipitation",
    source: "WMO & CHIRPS 30-Year Climate Normals",
    impact: "Attaches location-specific African rainfall normals to calculate harvestable gallons and cubic meters.",
  },
  {
    category: "Financial Feasibility",
    variable: "Utility Rates & Effluent Charges",
    source: "Municipal Utility Tariffs (e.g. City of Cape Town, Nairobi Water, Lagos State)",
    impact: "Powers the ROI model to calculate precise municipal water cost offsets, 10-year NPV, and payback periods.",
  },
  {
    category: "ESG & Risk Profiling",
    variable: "Drought Stress & Day Zero Risk",
    source: "WRI Aqueduct Water Risk Atlas & SBTN/GBCSA",
    impact: "Feeds the Gemini AI to generate tailored sales briefs focused on water scarcity resilience and corporate sustainability targets.",
  },
  {
    category: "Policy & Incentives",
    variable: "National Water Frameworks",
    source: "Regional Water Acts (e.g., South Africa NWA, Kenya NEMA, Green Star credits)",
    impact: "Factors water efficiency compliance and corporate resilience incentives into financial models.",
  },
];

const methodologySteps = [
  {
    number: "01",
    title: "Identify Opportunity",
    description:
      "Our engine scans thousands of commercial assets, filtering for optimal roof geometry and high-yield precipitation zones.",
  },
  {
    number: "02",
    title: "Analyze Feasibility",
    description:
      "We overlay 30-year climate data with local utility rates and tax incentives to calculate a precise ROI for every building.",
  },
  {
    number: "03",
    title: "Secure Independence",
    description:
      "Receive an AI-generated Assessment Brief with the exact engineering specs and financial modeling needed to greenlight your project.",
  },
];

const teamMembers = [
  {
    name: "Pranil Lama",
    university: "University of Texas Arlington",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
    email: "member1@example.com",
    image: "",
  },
  {
    name: "Ujjwal Gupta",
    university: "University of Texas Dallas",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
    email: "member2@example.com",
    image: "",
  },
  {
    name: "Kaushik Shivakumar",
    university: "University of Texas Dallas",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
    email: "member3@example.com",
    image: "",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
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
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/90 backdrop-blur-sm"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <PluvialLogo size={46} />
          <span className="text-[30px] font-bold text-[#1a1a1a] tracking-tight">Pluvial</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-[#1a1a1a] font-semibold">
          {["Benefits", "Methodology", "Data Source", "Team"].map((label) => (
            <Link
              key={label}
              href={`#${label.toLowerCase().replace(" ", "-")}`}
              className="hover:text-[#0C7FB0] transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/presentation"
            className="hover:text-[#0C7FB0] transition-colors duration-200 text-[#0F5F78]"
          >
            Presentation
          </Link>
        </nav>

        {/* CTA */}
        <Link
          href="/map"
          className="group hidden md:inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5F78] px-8 py-3 text-base font-semibold text-white transition-colors duration-500 ease-out hover:bg-[#9FC7D6]"
        >
          <span>Get Started</span>
          <span className="transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-0.5">↗</span>
        </Link>
      </motion.header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
        {/* Headline — line-by-line stagger on load */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="px-6 md:px-12 lg:px-16 pt-16 md:pt-20 relative z-10 text-center mx-auto max-w-[980px]"
        >
          {["Prospecting", "for Water", "Independence"].map((line, i) => (
            <motion.div key={i} variants={fadeUpVariant} className="overflow-visible pb-2 md:pb-3">
              <span
                className="block text-[76px] sm:text-[96px] md:text-[112px] lg:text-[128px] xl:text-[140px] leading-[0.98] tracking-[-3px] text-[#1a1a1a]"
                style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
              >
                {line}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Device mockup + background block */}
        <motion.div
          initial={{ opacity: 0, y: 64 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
          className="relative mx-auto mt-10 w-full max-w-[1440px] px-4 md:px-12 flex items-end justify-center"
        >
          {/* Single wide background block — like the reference design */}
          <div className="absolute -bottom-12 left-1/2 h-[20%] w-[98%] max-w-[1440px] -translate-x-1/2 rounded-[56px] bg-[#9FC7D6] md:h-[58%]" />

          {/* Tablet frame */}
          <div className="relative z-10 w-full max-w-3xl mx-auto">
            <div className="bg-[#1c1c2a] rounded-[18px] p-[10px] shadow-[0_32px_80px_rgba(0,0,0,0.3)]">
              {/* Screen */}
              <div className="bg-[#0d1f14] rounded-[10px] overflow-hidden relative" style={{ aspectRatio: "16/9" }}>
                <Image
                  src="/images/div.png"
                  alt="Pluvial ROI dashboard"
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(min-width: 1024px) 768px, 100vw"
                />
              </div>

              {/* Bottom bar (tablet bezel) */}
              <div className="flex justify-center mt-2">
                <div className="w-10 h-1 bg-white/15 rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── We've cracked the code ─────────────────────────────────────────── */}
      <section id="benefits" className="px-8 md:px-16 lg:px-24 py-24 md:py-32">
        <ScrollFade>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#929292] mb-8">
            Benifits.
          </p>
        </ScrollFade>

        <ScrollFade delay={0.1}>
          <h2
            className="text-[44px] md:text-[60px] lg:text-[72px] leading-[1.0] tracking-[-1.5px] text-[#1a1a1a] mb-6 max-w-2xl"
            style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
          >
            We&rsquo;ve cracked the code.
          </h2>
        </ScrollFade>

        <ScrollFade delay={0.15}>
          <p className="text-[#6f6f6f] text-[15px] leading-relaxed max-w-2xl mb-20">
            Identify high-potential commercial buildings for rainwater and non-potable reuse.
            We&rsquo;re leading the charge to make real estate sustainable, mapping the
            intersection of high water costs, ESG mandates, and robust recapture potential.
          </p>
        </ScrollFade>

        {/* Stats */}
        <ScrollStagger className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-24">
          {stats.map((stat, i) => (
            <motion.div key={i} variants={fadeUpVariant}>
              <div
                className="text-[36px] md:text-[44px] font-semibold text-[#1a1a1a] leading-none mb-2"
                style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
              >
                {stat.value}
              </div>
              <div className="text-[#929292] text-[13px]">{stat.label}</div>
            </motion.div>
          ))}
        </ScrollStagger>

        {/* Full-width landscape image */}
        <ScrollFade>
          <div className="w-full rounded-2xl overflow-hidden bg-[#e8e3d8] relative" style={{ aspectRatio: "16/7" }}>
            <Image
              src="/images/nation.png"
              alt="Pluvial national data visualization"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
          </div>
        </ScrollFade>
      </section>

      {/* ── Methodology ─────────────────────────────────────────────────────── */}
      <section id="methodology" className="px-8 py-24 md:px-16 md:py-32 lg:px-24">
        <ScrollFade>
          <div className="mb-16 flex items-start justify-between gap-8">
            <div>
              <p className="mb-6 text-[11px] uppercase tracking-[0.18em] text-[#929292]">
                Methodology
              </p>
              <h2
                className="max-w-3xl text-[44px] leading-[1] tracking-[-1.5px] text-[#1a1a1a] md:text-[60px] lg:text-[72px]"
                style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
              >
                How Pluvial Works
              </h2>
            </div>
          </div>
        </ScrollFade>

        <ScrollStagger className="grid gap-8 md:grid-cols-3 md:gap-7">
          {methodologySteps.map((step) => (
            <motion.div key={step.number} variants={fadeUpVariant} className="pt-8">
              <div className="mb-10 border-t border-[#e6e6e6] pt-12">
                <div
                  className="mb-12 text-[88px] leading-none tracking-[-0.04em] text-[#a3a3a3] md:text-[104px]"
                  style={{ fontFamily: "var(--font-inter-sans), var(--font-dm-sans), system-ui, sans-serif" }}
                >
                  {step.number}
                </div>
                <h3
                  className="mb-5 text-[24px] leading-tight text-[#1a1a1a] md:text-[30px]"
                  style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
                >
                  {step.title}
                </h3>
                <p className="max-w-md text-[16px] leading-relaxed text-[#7a7a7a] md:text-[18px]">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </ScrollStagger>
      </section>

      {/* ── Backed by Data ─────────────────────────────────────────────────── */}
      <section id="data-source" className="px-8 py-24 md:px-16 md:py-32 lg:px-24">
        <ScrollFade>
          <p className="mb-8 text-center text-[11px] uppercase tracking-[0.18em] text-[#929292]">
            Data Source
          </p>
        </ScrollFade>

        <ScrollFade delay={0.1}>
          <h2
            className="mx-auto mb-6 max-w-4xl text-center text-[44px] leading-[1] tracking-[-1.5px] text-[#1a1a1a] md:text-[60px] lg:text-[72px]"
            style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
          >
            Backed by Data
          </h2>
        </ScrollFade>

        <ScrollFade delay={0.15}>
          <p className="mx-auto mb-16 max-w-4xl text-center text-[18px] leading-relaxed text-[#767676] md:text-[19px]">
            Every building we surface is backed by real data — from satellite imagery to climate
            records and economic regression — ensuring decisions you can trust.
          </p>
        </ScrollFade>

        {/* Table */}
        <ScrollFade delay={0.1}>
          <div className="w-full mb-20">
            {/* Headers */}
            <div className="grid grid-cols-3 border-b border-[#e5e5e5] pb-4">
              {tableHeaders.map((h) => (
                <span
                  key={h}
                  className="text-[15px] font-bold uppercase tracking-[0.12em] text-[#555555] md:text-[17px]"
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows — staggered */}
            <ScrollStagger>
              {tableRows.map((row, i) => (
                <motion.div
                  key={i}
                  variants={fadeUpVariant}
                  className="grid grid-cols-3 py-5 border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors duration-150 items-start gap-4"
                >
                  {/* Col 1: category label + variable name */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#929292] mb-1">
                      {row.category}
                    </p>
                    <p className="text-[#1a1a1a] text-[14px] font-medium">{row.variable}</p>
                  </div>
                  {/* Col 2: source */}
                  <p className="text-[#6f6f6f] text-[13px] leading-relaxed">{row.source}</p>
                  {/* Col 3: impact */}
                  <p className="text-[#1a1a1a] text-[13px] leading-relaxed">{row.impact}</p>
                </motion.div>
              ))}
            </ScrollStagger>
          </div>
        </ScrollFade>

        {/* Full-width aerial image */}
        <ScrollFade>
          <div className="w-full rounded-2xl overflow-hidden bg-[#d4ddc8] relative" style={{ aspectRatio: "16/7" }}>
            <Image
              src="/images/Building.png"
              alt="Commercial building overview"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
          </div>
        </ScrollFade>
      </section>

      {/* ── Meet the Team ──────────────────────────────────────────────────── */}
      <section id="team" className="px-8 py-24 md:px-16 md:py-32 lg:px-24">
        <ScrollFade>
          <h2
            className="mx-auto mb-6 max-w-3xl text-center text-[44px] leading-[1.05] tracking-[-1.5px] text-[#1a1a1a] md:text-[60px] lg:text-[80px]"
            style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
          >
            Meet the Team Behind Pluvial
          </h2>
        </ScrollFade>

        <ScrollFade delay={0.1}>
          <p className="text-[#6f6f6f] text-[15px] leading-relaxed max-w-md mx-auto mb-16 text-center">
            Built during HackSMU by a cross-functional team focused on water intelligence and
            resilient infrastructure.
          </p>
        </ScrollFade>

        <ScrollStagger className="grid gap-10 md:grid-cols-3 md:gap-8">
          {teamMembers.map((member) => (
            <motion.div key={member.name} variants={fadeUpVariant} className="text-center">
              <div className="mx-auto mb-6 flex h-44 w-44 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#dceff5_0%,#bddce8_100%)] ring-1 ring-[#d8e7ee]">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={176}
                    height={176}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="text-[52px] tracking-[-0.04em] text-[#4f7990]"
                    style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
                  >
                    {member.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                )}
              </div>
              <h3
                className="mb-2 text-[30px] leading-tight text-[#1a1a1a]"
                style={{ fontFamily: "var(--font-crimson), 'Crimson Text', Georgia, serif" }}
              >
                {member.name}
              </h3>
              <p className="mb-5 text-[15px] text-[#7a7a7a]">{member.university}</p>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px] text-[#0F5F78]">
                <Link href={member.linkedin} className="transition-colors duration-200 hover:text-[#0C7FB0]">
                  LinkedIn
                </Link>
                <Link href={member.github} className="transition-colors duration-200 hover:text-[#0C7FB0]">
                  GitHub
                </Link>
                <a
                  href={`mailto:${member.email}`}
                  className="transition-colors duration-200 hover:text-[#0C7FB0]"
                >
                  Email
                </a>
              </div>
            </motion.div>
          ))}
        </ScrollStagger>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-8 md:px-16 lg:px-24 py-8 border-t border-[#e5e5e5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Walking person icon (matches Figma footer) */}
            <svg
              width="18"
              height="26"
              viewBox="0 0 18 26"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="9" cy="3" r="2.5" fill="#1a1a1a" />
              <path
                d="M9 7 L6 13 L3.5 13 M9 7 L11 11 M6 13 L5 20.5 M6 13 L11 13 M11 13 L12.5 20.5 M11 11 L13.5 12"
                stroke="#1a1a1a"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[13px] text-[#929292]">© Pluvial.&nbsp; 2026</span>
          </div>
          <span className="text-[13px] text-[#929292]">All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
