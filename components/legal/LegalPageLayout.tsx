"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Additional paragraphs rendered after the bullet list */
  paragraphsAfter?: string[];
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  /** Optional highlighted callout shown after the intro (e.g. a key disclaimer) */
  highlight?: { title?: string; text: string; color?: string };
  /** Optional closing note shown in a card at the bottom of the page */
  footerNote?: ReactNode;
}

function SectionBlock({ section, index }: { section: LegalSection; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2">{section.title}</h2>
      {section.paragraphs?.map((p, i) => (
        <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2 last:mb-0">
          {p}
        </p>
      ))}
      {section.bullets && section.bullets.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
              <span
                className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "#7C3AED" }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {section.paragraphsAfter?.map((p, i) => (
        <p key={`after-${i}`} className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
          {p}
        </p>
      ))}
    </motion.div>
  );
}

export default function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  sections,
  highlight,
  footerNote,
}: LegalPageLayoutProps) {
  return (
    <AppShell hideNav>
      <PageHeader title={title} back />
      <div className="px-4 py-4 pb-10 space-y-5">
        <p className="text-xs text-[var(--text-muted)]">Last updated: {lastUpdated}</p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{intro}</p>

        {highlight && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: `${highlight.color ?? "#7C3AED"}14`,
              border: `1px solid ${highlight.color ?? "#7C3AED"}40`,
            }}
          >
            {highlight.title && (
              <p className="text-xs font-bold mb-1" style={{ color: highlight.color ?? "#A855F7" }}>
                {highlight.title}
              </p>
            )}
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{highlight.text}</p>
          </div>
        )}

        {sections.map((section, i) => (
          <SectionBlock key={section.title} section={section} index={i} />
        ))}

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
          {footerNote ?? (
            <p className="text-xs text-[var(--text-muted)] text-center">
              Questions about this policy? Visit the Legal Center or contact us via the Support page.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
