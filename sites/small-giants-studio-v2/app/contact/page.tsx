import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/sections/ContactForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Contact Ibraheem | Digital Transformation Consultant Birmingham",
  description:
    "Get in touch with Ibraheem Mustafa at Small Giants Studio. Digital transformation, marketing, and AI automation for UK SMEs and charities. Based in Birmingham — no hard sell, just an honest chat.",
  openGraph: {
    title: "Contact Ibraheem | Digital Transformation Consultant Birmingham",
    description:
      "Get in touch with Ibraheem Mustafa at Small Giants Studio. Digital transformation, marketing, and AI automation for UK SMEs and charities.",
  },
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      {/* Hero Section */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-dark)" }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 style={{ color: "var(--color-ink-on-dark)" }}>
              Let&apos;s have a chat about your business
            </h1>
            <p
              className="mt-8 text-xl"
              style={{ color: "var(--color-ink-on-dark-secondary)" }}
            >
              No hard sell. Just an honest conversation about what&apos;s holding you back and
              whether I can help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-light)" }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-2">
            {/* Contact Form */}
            <div>
              <h2 style={{ color: "var(--color-ink-primary)" }}>Send a message</h2>
              <p
                className="mt-3"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                Fill in the form and I&apos;ll get back to you within 24 hours.
              </p>
              <div className="mt-10">
                <ContactForm />
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h2 style={{ color: "var(--color-ink-primary)" }}>Or get in touch directly</h2>
              <p
                className="mt-3"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                Prefer to talk? Give me a call or send an email.
              </p>

              <div className="mt-10 space-y-8">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3
                      className="font-medium"
                      style={{
                        fontFamily: "var(--font-display, serif)",
                        fontWeight: 400,
                        color: "var(--color-ink-primary)",
                      }}
                    >
                      Email
                    </h3>
                    <a
                      href="mailto:hello@smallgiantsstudio.co.uk"
                      className="editorial-link mt-1"
                      style={{ color: "var(--color-accent)" }}
                    >
                      hello@smallgiantsstudio.co.uk
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3
                      className="font-medium"
                      style={{
                        fontFamily: "var(--font-display, serif)",
                        fontWeight: 400,
                        color: "var(--color-ink-primary)",
                      }}
                    >
                      Phone
                    </h3>
                    <a
                      href="tel:+447424449555"
                      className="editorial-link mt-1"
                      style={{ color: "var(--color-accent)" }}
                    >
                      07424 449555
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
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
                  </div>
                  <div>
                    <h3
                      className="font-medium"
                      style={{
                        fontFamily: "var(--font-display, serif)",
                        fontWeight: 400,
                        color: "var(--color-ink-primary)",
                      }}
                    >
                      Location
                    </h3>
                    <p className="mt-1" style={{ color: "var(--color-ink-secondary)" }}>Birmingham, UK</p>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      UK-focused — but happy to help anyone doing meaningful work
                    </p>
                  </div>
                </div>

                {/* LinkedIn */}
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <div>
                    <h3
                      className="font-medium"
                      style={{
                        fontFamily: "var(--font-display, serif)",
                        fontWeight: 400,
                        color: "var(--color-ink-primary)",
                      }}
                    >
                      LinkedIn
                    </h3>
                    <a
                      href="https://www.linkedin.com/in/ibraheem-mustafa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="editorial-link mt-1 block"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Connect with Ibraheem
                    </a>
                    <a
                      href="https://www.linkedin.com/company/small-giants-studio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="editorial-link mt-1 block"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Follow Small Giants Studio
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section
        className="border-t py-12"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface-light-alt)",
        }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <p
            className="text-center text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Not sure what you need yet? Check out my{" "}
            <Link href="/services" className="editorial-link font-medium" style={{ color: "var(--color-accent)" }}>
              services
            </Link>
            {" "}or read{" "}
            <Link href="/about" className="editorial-link font-medium" style={{ color: "var(--color-accent)" }}>
              more about me
            </Link>.
          </p>
        </div>
      </section>
    </>
  );
}
