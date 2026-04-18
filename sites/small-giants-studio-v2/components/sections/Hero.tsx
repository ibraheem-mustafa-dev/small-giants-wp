"use client";

import Image from "next/image";
import Link from "next/link";
import { useScrollReveal } from "@/components/hooks/useScrollReveal";

export function Hero() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden"
      style={{ backgroundColor: "var(--color-surface-light)" }}
      aria-labelledby="hero-heading"
    >
      {/* Background illustration — subtle, behind all content */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ opacity: 0.12, mixBlendMode: "multiply" }}
      >
        <Image
          src="/images/generated/hero-v2.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Content anchored to bottom */}
      <div className="relative mx-auto w-full max-w-7xl px-6 pb-16 pt-32 sm:px-8 sm:pb-24 lg:px-12 lg:pb-32">
        {/* Main heading — massive editorial typography */}
        <h1
          id="hero-heading"
          className="scroll-reveal max-w-[18ch]"
          style={{
            fontSize: "clamp(3.5rem, 10vw, 10rem)",
            lineHeight: 0.92,
            fontWeight: 300,
            letterSpacing: "-0.04em",
            color: "var(--color-ink-primary)",
          }}
        >
          Helping human-led businesses{" "}
          <em
            className="not-italic"
            style={{ color: "var(--color-accent-warm)" }}
          >
            compete with the giants
          </em>
        </h1>

        {/* Thin editorial rule */}
        <hr
          className="editorial-rule scroll-reveal mt-8 sm:mt-10"
          style={{ maxWidth: "120px" }}
          aria-hidden="true"
        />

        {/* Subtitle — narrow measure */}
        <p
          className="scroll-reveal mt-8 max-w-[35ch] text-lg sm:text-xl"
          style={{ color: "var(--color-ink-secondary)" }}
        >
          Enterprise-level marketing, automation, and tech — at budgets that actually work.
        </p>

        <p
          className="scroll-reveal mt-4 max-w-[40ch] text-base"
          style={{ color: "var(--color-text-muted)" }}
        >
          For UK SMEs, charities, and social enterprises who genuinely care about their
          customers.
        </p>

        {/* CTAs — pill primary, text-link secondary */}
        <div className="scroll-reveal mt-10 flex flex-wrap items-center gap-6">
          <Link
            href="/contact"
            className="inline-flex min-h-[48px] items-center justify-center px-8 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: "var(--color-accent)",
              borderRadius: "999px",
            }}
          >
            Let&apos;s Have a Chat About Your Business
          </Link>

          <Link
            href="#approach"
            className="editorial-link inline-flex items-center gap-2 text-base font-medium transition-colors"
            style={{ color: "var(--color-ink-primary)" }}
          >
            See How I Work
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Location */}
        <p
          className="scroll-reveal mt-12 flex items-center gap-2 text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          Based in Birmingham. UK-focused — but happy to help anyone doing meaningful work.
        </p>
      </div>
    </section>
  );
}
