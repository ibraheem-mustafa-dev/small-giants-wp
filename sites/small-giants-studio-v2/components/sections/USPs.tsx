"use client";

import { useScrollReveal } from "@/components/hooks/useScrollReveal";

const usps = [
  {
    title: "AI for people, not on people",
    description: "Ethical tech that serves humans, frees up your time, and lets you do the work you actually started your business to do.",
  },
  {
    title: "Enterprise capability, SME budget",
    description: "The kind of infrastructure big companies pay six figures for, delivered at SME pace and pricing.",
  },
  {
    title: "18 months ahead",
    description: "Tools your competitors won't hear about for another year. By the time they're debating it, you've got it working.",
  },
  {
    title: "Values-driven selectivity",
    description: "I only work with businesses that genuinely care about their customers. Led by humans, focused on serving humans.",
  },
  {
    title: "Security baked in",
    description: "Built with data protection from the start, not bolted on after. Your customers' trust matters.",
  },
  {
    title: "Work-life balance is the whole point",
    description: "As someone with ADHD, a new dad, and a long-term carer — I build systems that give you your time back, not ones that demand more of it.",
  },
];

export function USPs() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--color-surface-light-alt)" }}
      aria-labelledby="usps-heading"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="usps-heading"
            className="scroll-reveal"
            style={{ color: "var(--color-ink-primary)" }}
          >
            How we&apos;re different
          </h2>
          <p
            className="scroll-reveal mt-6 text-lg"
            style={{ color: "var(--color-ink-secondary)" }}
          >
            Not another agency. Not another one-thing-at-a-time consultant. A growth partner who
            builds alongside you until it works.
          </p>
        </div>

        {/* Sharp-edged cards, no rounded-xl */}
        <div className="stagger-children mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {usps.map((usp) => (
            <div
              key={usp.title}
              className="scroll-reveal group border p-8 transition-all hover:shadow-lg"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-light)",
                borderRadius: "0",
                borderLeft: "3px solid var(--color-accent)",
              }}
            >
              <h3
                className="text-lg font-medium"
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontWeight: 400,
                  color: "var(--color-ink-primary)",
                }}
              >
                {usp.title}
              </h3>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                {usp.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
