import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Sustainability | Giving Back Through Every Project",
  description:
    "Every project I complete plants real trees through Evertreen. Sustainability isn't an add-on — it's built into how I work. See our growing forest.",
  openGraph: {
    title: "Sustainability | Giving Back Through Every Project",
    description:
      "Every project I complete plants real trees through Evertreen. Sustainability isn't an add-on — it's built into how I work.",
  },
  alternates: {
    canonical: "/sustainability",
  },
};

export default function SustainabilityPage() {
  return (
    <main>
      <Breadcrumbs
        items={[{ label: "Sustainability" }]}
      />

      {/* Hero */}
      <section className="bg-primary-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              It starts with giving.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-primary-100 sm:text-xl">
              In Islam, we believe we&apos;re stewards of this earth — not owners.
              That shapes everything about how I run this business. The goal was
              never just to build something profitable. It was to build something
              worth building.
            </p>
          </div>
        </div>
      </section>

      {/* Values / Story */}
      <section className="bg-surface py-16 sm:py-24" aria-labelledby="values-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2
              id="values-heading"
              className="text-2xl font-bold text-text-primary sm:text-3xl"
            >
              Why this matters to me
            </h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-text-secondary">
              <p>
                I grew up in a family where giving came first. Before you think about
                what you&apos;re getting, you think about what you&apos;re putting in.
                My mum drilled that into me — and honestly, it stuck.
              </p>
              <p>
                When I started Small Giants Studio, I knew I didn&apos;t want it to
                be one of those businesses that bolts a &ldquo;we care about the planet&rdquo;
                badge on the website and calls it a day. I wanted giving back to be
                part of how the business actually works — not something I do on the side
                when I remember.
              </p>
              <p>
                So every project I complete plants real trees. Not as a marketing thing.
                Just because it&apos;s the right thing to do. Alhamdulillah for the
                opportunity to give back, even in a small way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Evertreen Partnership */}
      <section className="bg-background py-16 sm:py-24" aria-labelledby="evertreen-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-surface p-3">
                <Image
                  src="/images/partners/evertreen-logo.svg"
                  alt="Evertreen — tree planting partner of Small Giants Studio"
                  width={64}
                  height={64}
                  className="h-14 w-auto object-contain"
                />
              </div>
              <div>
                <h2
                  id="evertreen-heading"
                  className="text-2xl font-bold text-text-primary sm:text-3xl"
                >
                  Our partnership with Evertreen
                </h2>
                <div className="mt-4 space-y-4 text-lg leading-relaxed text-text-secondary">
                  <p>
                    <a
                      href="https://evertreen.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 transition-colors hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200"
                    >
                      Evertreen
                    </a>{" "}
                    makes it easy to plant trees through real reforestation projects
                    around the world. I chose them because they&apos;re transparent
                    about where the trees go, and you can actually track them.
                  </p>
                  <p>
                    Every client I work with contributes to our growing forest. It&apos;s
                    a small thing — but it adds up. And honestly, it feels good knowing
                    that every project leaves something behind that&apos;s bigger than
                    a website or a CRM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Evertreen Forest Embed — full width, no box */}
      <section className="bg-background pb-8 sm:pb-16" aria-labelledby="forest-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="forest-heading"
              className="text-2xl font-bold text-text-primary sm:text-3xl"
            >
              Our growing forest
            </h2>
            <p className="mt-3 text-text-secondary">
              This is the real thing — every tree here was planted through a client project.
            </p>
          </div>
        </div>
        <div className="mt-8 w-full">
          <iframe
            src="https://www.evertreen.com/forest/697950af3dc86?iframe=1"
            title="Small Giants Studio Evertreen Forest — live tree planting tracker"
            width="100%"
            height="800"
            loading="lazy"
            className="w-full border-0"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-accent-700 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Want to grow your business and plant some trees while you&apos;re at it?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-accent-100">
            Every project contributes to the forest. Let&apos;s chat about what we
            could build together.
          </p>
          <div className="mt-8">
            <Button href="/contact" variant="white" size="lg">
              Let&apos;s Chat
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
