import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Case Studies | Digital Transformation Projects for UK SMEs",
  description:
    "Real digital transformation case studies for UK SMEs and charities. Clients you can speak to directly. Based in Birmingham, serving businesses across the UK.",
  openGraph: {
    title: "Case Studies | Digital Transformation Projects for UK SMEs",
    description:
      "Real digital transformation case studies for UK SMEs and charities. Clients you can speak to directly.",
  },
  alternates: {
    canonical: "/work",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function WorkPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Work" }]} />
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Work
            </h1>
            <p className="mt-6 text-xl text-primary-100">
              Real projects. Real clients you can call up and ask about me.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-background p-8 sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <svg
                className="h-8 w-8 text-primary-700 dark:text-primary-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-text-primary">
              Case studies coming soon
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              I&apos;m putting together case studies from completed projects —
              with client permission, of course. In the meantime, get in touch
              and I&apos;ll walk you through what I&apos;ve done.
            </p>
            <div className="mt-8">
              <Button href="/contact" size="lg">
                Let&apos;s Chat
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
