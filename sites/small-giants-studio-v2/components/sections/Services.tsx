"use client";

import Image from "next/image";
import Link from "next/link";
import { useScrollReveal } from "@/components/hooks/useScrollReveal";

const services = [
  {
    id: "digital-transformation",
    title: "Digital Transformation",
    description: "Complete overhaul of your marketing and operations into one connected system.",
    illustration: "/images/generated/service-digital-transformation.png",
    illustrationAlt: "Digital transformation illustration",
  },
  {
    id: "marketing-strategy",
    title: "Marketing Strategy",
    description: "Strategy that brings in customers who actually need what you offer.",
    illustration: "/images/generated/service-marketing.png",
    illustrationAlt: "Marketing strategy illustration",
  },
  {
    id: "website-development",
    title: "Website Design & Development",
    description: "Fast, accessible websites built to convert visitors into customers.",
    illustration: "/images/generated/service-web-dev.png",
    illustrationAlt: "Website development illustration",
  },
  {
    id: "crm-operations",
    title: "CRM & Operations",
    description: "Systems that track every lead, customer, and task so nothing gets lost.",
    illustration: "/images/generated/service-crm.png",
    illustrationAlt: "CRM and operations illustration",
  },
  {
    id: "ai-automation",
    title: "AI & Automation",
    description: "Smart automation that handles repetitive tasks so you don't have to.",
    illustration: "/images/generated/service-automation.png",
    illustrationAlt: "AI and automation illustration",
  },
  {
    id: "seo-marketing",
    title: "SEO, GEO & Digital Marketing",
    description: "Be found on Google, ChatGPT, and every platform your customers use to search.",
    illustration: "/images/generated/service-seo.png",
    illustrationAlt: "SEO and digital marketing illustration",
  },
];

export function Services() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--color-surface-light)" }}
      aria-labelledby="services-heading"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        {/* Section header */}
        <div className="scroll-reveal max-w-xl">
          <h2
            id="services-heading"
            style={{ color: "var(--color-ink-primary)" }}
          >
            What I can help with
          </h2>
          <p
            className="mt-6 text-lg"
            style={{ color: "var(--color-ink-secondary)" }}
          >
            I don&apos;t build until I understand your business. Strategy first. Tools chosen for
            how you work, not what&apos;s popular.
          </p>
        </div>

        {/* Editorial numbered list */}
        <div className="stagger-children mt-16">
          {services.map((service, index) => (
            <Link
              key={service.id}
              href={`/services#${service.id}`}
              className="scroll-reveal group block"
            >
              {/* Top border line */}
              <div
                className="h-px w-full"
                style={{ backgroundColor: "var(--color-border)" }}
                aria-hidden="true"
              />
              <div className="flex items-start gap-6 py-8 transition-colors sm:gap-10 sm:py-10">
                {/* Large serif number */}
                <span
                  className="shrink-0 text-3xl font-light tabular-nums transition-colors duration-300 sm:text-4xl"
                  style={{
                    fontFamily: "var(--font-display, serif)",
                    color: "var(--color-accent)",
                  }}
                  aria-hidden="true"
                >
                  <span className="group-hover:hidden">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="hidden group-hover:inline"
                    style={{ color: "var(--color-accent-warm)" }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>

                {/* Service illustration — small thumbnail */}
                <div
                  className="hidden shrink-0 opacity-0 transition-opacity group-hover:opacity-100 sm:block"
                  style={{ width: "48px", height: "48px" }}
                >
                  <Image
                    src={service.illustration}
                    alt={service.illustrationAlt}
                    width={48}
                    height={48}
                    sizes="48px"
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Service content */}
                <div className="flex-1">
                  <h3
                    className="text-xl font-medium transition-colors sm:text-2xl"
                    style={{
                      fontFamily: "var(--font-display, serif)",
                      color: "var(--color-ink-primary)",
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {service.title}
                  </h3>
                  <p
                    className="mt-2 max-w-[50ch] text-base"
                    style={{ color: "var(--color-ink-secondary)" }}
                  >
                    {service.description}
                  </p>
                </div>

                {/* Arrow */}
                <span
                  className="mt-1 shrink-0 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                  style={{ color: "var(--color-accent)" }}
                  aria-hidden="true"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
          {/* Bottom border line */}
          <div
            className="h-px w-full"
            style={{ backgroundColor: "var(--color-border)" }}
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
