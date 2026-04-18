"use client";

import Image from "next/image";
import Link from "next/link";
import { useScrollReveal } from "@/components/hooks/useScrollReveal";

export function CTA() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{
        backgroundColor: "var(--color-surface-dark)",
        padding: "clamp(8rem, 15vh, 14rem) 0",
      }}
      aria-labelledby="cta-heading"
    >
      {/* Background texture */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ opacity: 0.07, mixBlendMode: "screen" }}
      >
        <Image
          src="/images/generated/cta-texture.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="cta-heading"
            className="scroll-reveal"
            style={{ color: "var(--color-ink-on-dark)" }}
          >
            The world doesn&apos;t need more Goliaths.
            <span
              className="mt-2 block"
              style={{ color: "var(--color-accent-light)" }}
            >
              It needs more BFGs.
            </span>
          </h2>

          <p
            className="scroll-reveal mx-auto mt-8 max-w-[50ch] text-lg"
            style={{ color: "var(--color-ink-on-dark-secondary)" }}
          >
            Big Friendly Giants who actually care about their customers. If you&apos;re a small
            business, charity, or social enterprise doing meaningful work — I&apos;d love to help
            you compete with the giants in your industry.
          </p>

          <p
            className="scroll-reveal mt-4 text-base"
            style={{ color: "var(--color-ink-on-dark-secondary)", opacity: 0.7 }}
          >
            Let&apos;s have a chat. No hard sell — just an honest conversation about
            what&apos;s holding you back and whether I can help.
          </p>

          <div className="scroll-reveal mt-10">
            <Link
              href="/contact"
              className="inline-flex min-h-[48px] items-center justify-center px-10 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: "var(--color-accent-warm)",
                borderRadius: "999px",
              }}
            >
              Let&apos;s Talk
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
