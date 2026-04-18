"use client";

import { useScrollReveal } from "@/components/hooks/useScrollReveal";

const testimonials = [
  {
    quote:
      "Every conversation leaves me feeling fully informed, with no lingering questions or concerns, just confidence that the work is being done to a standard beyond excellence.",
    name: "Feldon Haynes",
    role: "Founder — Growing Businesses from the Inside Out",
  },
  {
    quote:
      "Ibraheem doesn\u2019t just build you a website \u2014 he builds you a system. Everything connects, everything works together. It\u2019s like having an enterprise IT department but it\u2019s just one bloke from Birmingham.",
    name: "Tajinder Sherwal",
    role: "Director — Indus Foods & TGS Wholesale",
  },
  {
    quote:
      "What impressed me most was how he actually listened. Not just to what I said, but to what I meant. The result was exactly what I needed, not what I asked for \u2014 which turned out to be better.",
    name: "Luke Loveridge",
    role: "Founder — Loveridge Digital",
  },
];

export function Testimonials() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{
        backgroundColor: "var(--color-surface-dark)",
        padding: "clamp(6rem, 12vh, 12rem) 0",
      }}
      aria-labelledby="testimonials-heading"
    >
      <h2 id="testimonials-heading" className="sr-only">
        What clients say
      </h2>

      {/* Large decorative quotation mark */}
      <div
        className="pointer-events-none absolute left-6 top-12 select-none sm:left-12 lg:left-20"
        style={{
          fontSize: "clamp(12rem, 20vw, 24rem)",
          lineHeight: 1,
          fontFamily: "var(--font-display, serif)",
          color: "var(--color-ink-on-dark)",
          opacity: 0.06,
        }}
        aria-hidden="true"
      >
        &ldquo;
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        {/* Featured testimonial — large display treatment */}
        <blockquote className="scroll-reveal-scale">
          <p
            className="max-w-[18ch]"
            style={{
              fontFamily: "var(--font-display, serif)",
              fontSize: "clamp(2rem, 5vw, 4.5rem)",
              lineHeight: 1.15,
              fontWeight: 300,
              fontStyle: "italic",
              color: "var(--color-ink-on-dark)",
              letterSpacing: "-0.02em",
            }}
          >
            {testimonials[0].quote}
          </p>
        </blockquote>

        {/* Featured attribution */}
        <div className="scroll-reveal mt-10 sm:mt-14">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-accent-light)" }}
          >
            {testimonials[0].name}
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-ink-on-dark-secondary)" }}
          >
            {testimonials[0].role}
          </p>
        </div>

        {/* Divider */}
        <hr
          className="my-16 sm:my-20"
          style={{
            border: "none",
            height: "1px",
            backgroundColor: "var(--color-dark-border)",
          }}
          aria-hidden="true"
        />

        {/* Secondary testimonials — 2-column grid */}
        <div className="stagger-children grid gap-10 sm:grid-cols-2 sm:gap-12">
          {testimonials.slice(1).map((testimonial) => (
            <blockquote key={testimonial.name} className="scroll-reveal">
              <p
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
                  lineHeight: 1.35,
                  fontWeight: 300,
                  fontStyle: "italic",
                  color: "var(--color-ink-on-dark)",
                  letterSpacing: "-0.01em",
                }}
              >
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <footer className="mt-6">
                <p
                  className="text-sm font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-accent-warm-light)" }}
                >
                  {testimonial.name}
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--color-ink-on-dark-secondary)" }}
                >
                  {testimonial.role}
                </p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
