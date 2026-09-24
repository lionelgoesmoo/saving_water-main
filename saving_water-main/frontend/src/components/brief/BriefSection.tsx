import React from "react";
import { cn } from "@/lib/utils";

export type SectionAccent = "teal" | "blue" | "amber" | "purple" | "emerald" | "rose" | "slate";

interface BriefSectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
  accent?: SectionAccent;
  className?: string;
}

const ACCENT: Record<SectionAccent, { bar: string; number: string; title: string; bg: string }> = {
  teal:    { bar: "border-teal-500",    number: "text-teal-600",    title: "text-slate-900", bg: "bg-teal-50/50" },
  blue:    { bar: "border-blue-500",    number: "text-blue-600",    title: "text-slate-900", bg: "bg-blue-50/50" },
  amber:   { bar: "border-amber-500",   number: "text-amber-600",   title: "text-slate-900", bg: "bg-amber-50/50" },
  purple:  { bar: "border-purple-500",  number: "text-purple-600",  title: "text-slate-900", bg: "bg-purple-50/50" },
  emerald: { bar: "border-emerald-500", number: "text-emerald-600", title: "text-slate-900", bg: "bg-emerald-50/50" },
  rose:    { bar: "border-rose-500",    number: "text-rose-600",    title: "text-slate-900", bg: "bg-rose-50/50" },
  slate:   { bar: "border-slate-400",   number: "text-slate-500",   title: "text-slate-900", bg: "bg-slate-50/50" },
};

export default function BriefSection({
  number,
  title,
  children,
  accent = "slate",
  className,
}: BriefSectionProps) {
  const a = ACCENT[accent];
  return (
    <section className={cn("py-8 border-b border-slate-100 last:border-0", className)}>
      <div className={cn("print-keep-heading flex items-start gap-3 mb-5 pl-4 border-l-4", a.bar)}>
        <div>
          <span className={cn("text-xs font-bold uppercase tracking-widest block leading-none mb-1", a.number)}>
            {number}
          </span>
          <h2 className={cn("text-xl font-bold", a.title)}>
            {title}
          </h2>
        </div>
      </div>
      <div className="pl-4">{children}</div>
    </section>
  );
}
