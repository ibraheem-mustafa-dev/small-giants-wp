import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { LinkedInFeed } from "@/components/sections/LinkedInFeed";

export const metadata: Metadata = {
  title: "Digital Transformation Blog: AI, Marketing & Automation for SMEs",
  description:
    "Practical guides on digital transformation, marketing automation, AI implementation, and building sustainable business systems for UK SMEs without burning out.",
  openGraph: {
    title: "Digital Transformation Blog: AI, Marketing & Automation for SMEs",
    description:
      "Practical guides on digital transformation, marketing automation, AI implementation, and building sustainable business systems for UK SMEs.",
  },
  alternates: {
    canonical: "/insights",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function InsightsPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Insights" }]} />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Insights
            </h1>
            <p className="mt-6 text-xl text-primary-100">
              Thoughts on digital transformation, marketing, automation, and building businesses
              that work for you.
            </p>
          </div>
        </div>
      </section>

      {/* LinkedIn Feed */}
      <section className="bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
              Latest from LinkedIn
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              What I&apos;m learning, building, and thinking about — no filter, no performance.
            </p>
          </div>

          <LinkedInFeed />

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://www.linkedin.com/in/ibraheem-mustafa"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Follow Ibraheem
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/company/small-giants-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-primary-700 px-6 py-3 text-base font-semibold text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-900/30"
            >
              Follow the Company
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Articles coming soon */}
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-surface p-8 text-center sm:p-12">
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
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-text-primary">Written articles coming soon</h2>
            <p className="mt-4 text-lg text-text-secondary">
              I&apos;m working on practical guides for digital transformation, automation, and
              running a small business without burning out. Watch this space.
            </p>
          </div>
          <p className="mt-6 text-center text-sm text-text-muted">
            In the meantime, see what I can help with on my{" "}
            <Link href="/services" className="rounded font-medium text-primary-700 dark:text-primary-300 underline hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500">
              services page
            </Link>
            {" "}or{" "}
            <Link href="/contact" className="rounded font-medium text-primary-700 dark:text-primary-300 underline hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500">
              get in touch
            </Link>.
          </p>
        </div>
      </section>
    </>
  );
}
