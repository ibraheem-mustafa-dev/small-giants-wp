"use client";

import Image from "next/image";
import { useScrollReveal } from "@/components/hooks/useScrollReveal";

export function Problem() {
  const sectionRef = useScrollReveal<HTMLElement>();

  const painPoints = [
    {
      stat: "33",
      unit: "hours",
      label: "per week on admin",
      description: "Government research shows small business owners spend a third of their week on paperwork",
      illustration: "/images/generated/pain-time.png",
      illustrationAlt: "Illustration of time lost to administrative tasks",
    },
    {
      stat: "Multiple",
      unit: "hats",
      label: "worn daily",
      description: "Marketing, sales, operations, finance — all on your shoulders",
      illustration: "/images/generated/pain-hats.png",
      illustrationAlt: "Illustration of wearing multiple hats at once",
    },
    {
      stat: "Can't",
      unit: "switch",
      label: "off",
      description: "Your health, hobbies, and family take a back seat to the business",
      illustration: "/images/generated/pain-burnout.png",
      illustrationAlt: "Illustration of burnout from overwork",
    },
  ];

  return (
    <section
      ref={sectionRef}
      style={{
        backgroundColor: "var(--color-surface-dark)",
        padding: "clamp(4rem, 10vh, 8rem) 0",
      }}
      aria-labelledby="problem-heading"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        {/* Opening statement */}
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="problem-heading"
            className="scroll-reveal"
            style={{ color: "var(--color-ink-on-dark)" }}
          >
            You started your business to do work you love.
            <span
              className="mt-2 block"
              style={{ color: "var(--color-ink-on-dark-secondary)" }}
            >
              Instead you&apos;re drowning in admin.
            </span>
          </h2>
          <p
            className="scroll-reveal mt-6 text-lg"
            style={{ color: "var(--color-ink-on-dark-secondary)" }}
          >
            Your bigger competitors have teams, tools, and infrastructure that let them dominate
            online. You&apos;re juggling everything alone.
          </p>
        </div>

        {/* Stats grid — sharp cards (border-radius: 0) */}
        <div className="stagger-children mt-16 grid gap-8 sm:grid-cols-3">
          {painPoints.map((point) => (
            <div
              key={point.label}
              className="scroll-reveal p-8 text-center"
              style={{
                backgroundColor: "var(--color-surface-dark-alt)",
                borderRadius: "0",
              }}
            >
              <div className="mx-auto mb-5 w-16 sm:w-20" style={{ opacity: 0.85 }}>
                <Image
                  src={point.illustration}
                  alt={point.illustrationAlt}
                  width={80}
                  height={80}
                  sizes="80px"
                  className="h-auto w-full"
                />
              </div>
              <div
                className="text-4xl font-light sm:text-5xl"
                style={{
                  fontFamily: "var(--font-display, serif)",
                  color: "var(--color-accent-warm-light)",
                  letterSpacing: "-0.03em",
                }}
              >
                {point.stat}
              </div>
              <div
                className="mt-1 text-lg font-semibold"
                style={{ color: "var(--color-ink-on-dark)" }}
              >
                {point.unit}
              </div>
              <div
                className="mt-1 text-sm"
                style={{ color: "var(--color-ink-on-dark-secondary)" }}
              >
                {point.label}
              </div>
              <p
                className="mt-4 text-sm"
                style={{ color: "var(--color-ink-on-dark-secondary)" }}
              >
                {point.description}
              </p>
            </div>
          ))}
        </div>

        {/* Closing statement */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <p
            className="scroll-reveal text-lg font-medium"
            style={{ color: "var(--color-ink-on-dark)" }}
          >
            Not because you&apos;re doing it wrong —
          </p>
          <p
            className="scroll-reveal mt-2 text-xl"
            style={{
              fontFamily: "var(--font-display, serif)",
              fontWeight: 400,
              color: "var(--color-accent-light)",
            }}
          >
            because you don&apos;t have the systems they have.
          </p>
        </div>
      </div>
    </section>
  );
}
