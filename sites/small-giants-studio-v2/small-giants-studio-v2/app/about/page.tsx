import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/ui/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Community } from "@/components/sections/Community";

export const metadata: Metadata = {
  title: "Ibraheem Mustafa | Digital Transformation Consultant | Birmingham",
  description:
    "Meet Ibraheem, digital transformation specialist for UK SMEs and charities. With ADHD and 8+ years' experience, I build connected marketing and operations systems at budgets that actually work.",
  openGraph: {
    title: "Ibraheem Mustafa | Digital Transformation Consultant | Birmingham",
    description:
      "Meet Ibraheem, digital transformation specialist for UK SMEs and charities. Connected marketing and operations systems at budgets that actually work.",
  },
  alternates: {
    canonical: "/about",
  },
};

const values = [
  {
    title: "Led by humans, focused on serving humans",
    description: "Technology should make life better, not more complicated. Every system I build puts people first.",
  },
  {
    title: "AI built for people, not on people",
    description: "I use AI to free up your time, not to replace you. Ethical tech that serves your business and your customers.",
  },
  {
    title: "Partner, not vendor",
    description: "I build alongside you until it works. Not a consultant who drops a report and disappears.",
  },
  {
    title: "Values-driven selectivity",
    description: "I only work with businesses that genuinely care about their customers. Quality over quantity.",
  },
  {
    title: "Security from the start",
    description: "Data protection isn't an afterthought. It's built in from day one.",
  },
  {
    title: "Your business, your way",
    description: "I don't pretend to know your business better than you. I help you find the ideal solution, then build it bespoke. No cookie-cutter templates.",
  },
];

const communityInvolvement = [
  {
    name: "Muslims in Construction",
    role: "Built their website",
    description: "I built the MIC website and I couldn't be more proud of the work they do. MashaAllah, they're connecting Muslim professionals in construction across the UK.",
  },
  {
    name: "Association of Muslim Engineers",
    role: "Events support",
    description: "I help AME with their events — because community matters. The work they do supporting Muslim engineers is inspiring.",
  },
  {
    name: "Evertreen",
    role: "Tree planting partnership",
    description: "Every client I work with plants trees through Evertreen. It's not greenwashing — it's a small thing, but it adds up. Alhamdulillah for the opportunity to give back.",
  },
  {
    name: "Arts Council England",
    role: "SEO & SEM Tech Champion",
    description: "Part-time role helping arts organisations improve their digital presence. It keeps me grounded in real-world problems.",
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          "@id": "https://smallgiantsstudio.co.uk/about#founder",
          name: "Ibraheem Mustafa",
          url: "https://smallgiantsstudio.co.uk/about",
          image: "https://smallgiantsstudio.co.uk/images/ibraheem-headshot.png",
          jobTitle: "Founder & Digital Transformation Consultant",
          description:
            "ADHD entrepreneur and digital transformation specialist helping UK SMEs build enterprise-level systems at sustainable budgets.",
          sameAs: [
            "https://www.linkedin.com/in/ibraheem-mustafa",
            "https://www.linkedin.com/company/small-giants-studio",
          ],
          affiliation: {
            "@type": "Organization",
            "@id": "https://smallgiantsstudio.co.uk",
            name: "Small Giants Studio",
          },
        }}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />

      {/* Hero Section */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-dark)" }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 style={{ color: "var(--color-ink-on-dark)" }}>
                Hi, I&apos;m Ibraheem.
              </h1>
              <p
                className="mt-8 text-xl"
                style={{ color: "var(--color-ink-on-dark-secondary)" }}
              >
                I help small businesses get found and handle the growth — marketing and operations
                as one connected system, powered by AI and automation. I&apos;m a nerd for this
                stuff (my family can confirm).
              </p>
              <p
                className="mt-4"
                style={{ color: "var(--color-ink-on-dark-secondary)", opacity: 0.7 }}
              >
                Founder of Small Giants Studio. Based in Birmingham, UK-focused — but if
                you&apos;re doing meaningful work, I don&apos;t mind where you are.
                ADHD entrepreneur, new dad, long-term carer for my brother. Work-life balance
                isn&apos;t a buzzword for me — it&apos;s the whole point.
              </p>
              <div className="mt-10">
                <Button href="/contact" size="lg">
                  Let&apos;s Have a Chat
                </Button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div
                className="relative h-64 w-64 overflow-hidden shadow-2xl sm:h-80 sm:w-80"
                style={{ borderRadius: "0" }}
              >
                <Image
                  src="/images/ibraheem-headshot.png"
                  alt="Ibraheem Mustafa — Digital Transformation Consultant, Birmingham"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 640px) 256px, 320px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-light)" }}
      >
        <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12">
          <h2 style={{ color: "var(--color-ink-primary)" }}>The story</h2>
          <div
            className="mt-8 space-y-6 text-lg"
            style={{ color: "var(--color-ink-secondary)" }}
          >
            <p>
              I started in marketing. I got clients visibility, leads, sales — then watched them
              struggle to handle the growth. Things falling through cracks. Wearing multiple hats.
              Working around the clock just to keep up. Sound familiar?
            </p>
            <p>
              That&apos;s when I realised: <strong style={{ color: "var(--color-ink-primary)" }}>marketing alone isn&apos;t enough.</strong>
            </p>
            <p>
              Growth only happens when two things work together —{" "}
              <Link href="/services#marketing-strategy" className="editorial-link font-semibold" style={{ color: "var(--color-accent)" }}>marketing</Link>{" "}
              (so people find you) and{" "}
              <Link href="/services#crm-operations" className="editorial-link font-semibold" style={{ color: "var(--color-accent)" }}>operations</Link>{" "}
              (so you can handle them when they do). Corporations have entire teams
              building connected systems. Small businesses? They end up with a Frankenstein of tools
              that don&apos;t talk to each other. Or nothing at all.
            </p>
            <p>
              The world doesn&apos;t need more Goliaths — corporations focused on cost-cutting and
              replacing humans. It needs more BFGs. Big Friendly Giants who actually care about
              their customers.
            </p>
            <p>
              That&apos;s why I built Small Giants Studio. The name says it all — small businesses
              with giant capabilities. You don&apos;t need to become a soulless corporation to
              compete with one. You just need the right systems.
            </p>
            <p>
              I use AI and automation that most agencies won&apos;t touch for another
              18 months — at budgets that actually work. The goal isn&apos;t just growth. It&apos;s
              giving you back your time, your headspace, and the ability to switch off
              when you&apos;re not working.
            </p>
          </div>
        </div>
      </section>

      {/* Personal Context */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-light-alt)" }}
      >
        <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12">
          <h2 style={{ color: "var(--color-ink-primary)" }}>A bit more about me</h2>
          <div
            className="mt-8 space-y-6 text-lg"
            style={{ color: "var(--color-ink-secondary)" }}
          >
            <p>
              I have ADHD. My brain sees connections others miss — but I&apos;m also a regular
              victim of analysis paralysis (ADHDers will know). That&apos;s actually why the
              systems I build are practical, not theoretical. If it doesn&apos;t work for how
              real people operate, it doesn&apos;t work.
            </p>
            <p>
              I&apos;m a new dad, Alhamdulillah. Time is my most precious resource now, and I
              understand it&apos;s yours too.
            </p>
            <p>
              I&apos;m a long-term carer for my brother. That&apos;s taught me patience, empathy,
              and the importance of building things that genuinely help people — not just things
              that look impressive in a pitch deck.
            </p>
            <p>
              My faith guides how I work. Honesty, transparency, and doing right by people
              isn&apos;t just good ethics — it&apos;s good business. I won&apos;t accept a world
              where corporations automate everything while small businesses that actually care get
              priced out of the tools they need.
            </p>
            <p>
              Work-life balance isn&apos;t a marketing message for me. It&apos;s why I do what I
              do. I build systems that give you your time back, not ones that demand more of it.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section — sharp-edged cards */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-light)" }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 style={{ color: "var(--color-ink-primary)" }}>What I believe</h2>
            <p
              className="mt-6 text-lg"
              style={{ color: "var(--color-ink-secondary)" }}
            >
              These aren&apos;t corporate values on a wall. They&apos;re how I actually work.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => (
              <div
                key={value.title}
                className="border p-8"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-surface-light)",
                  borderRadius: "0",
                }}
              >
                <h3
                  className="text-lg"
                  style={{
                    fontFamily: "var(--font-display, serif)",
                    fontWeight: 400,
                    color: "var(--color-ink-primary)",
                  }}
                >
                  {value.title}
                </h3>
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-secondary)" }}
                >
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-dark)" }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 style={{ color: "var(--color-ink-on-dark)" }}>Community matters</h2>
            <p
              className="mt-6 text-lg"
              style={{ color: "var(--color-ink-on-dark-secondary)" }}
            >
              Alhamdulillah, I get to work with communities that genuinely care about lifting each
              other up. Not networking for what you can extract — but investing in something bigger.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {communityInvolvement.map((item) => (
              <div
                key={item.name}
                className="p-8"
                style={{
                  backgroundColor: "var(--color-surface-dark-alt)",
                  borderRadius: "0",
                }}
              >
                <h3
                  className="text-lg"
                  style={{
                    fontFamily: "var(--font-display, serif)",
                    fontWeight: 400,
                    color: "var(--color-ink-on-dark)",
                  }}
                >
                  {item.name}
                </h3>
                <p
                  className="mt-1 text-sm font-medium"
                  style={{ color: "var(--color-accent-light)" }}
                >
                  {item.role}
                </p>
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--color-ink-on-dark-secondary)" }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners & Forest */}
      <Community />

      {/* CTA Section */}
      <section
        style={{
          backgroundColor: "var(--color-surface-dark)",
          padding: "clamp(6rem, 12vh, 10rem) 0",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8 lg:px-12">
          <h2 style={{ color: "var(--color-ink-on-dark)" }}>
            Want to work together?
          </h2>
          <p
            className="mt-6 text-lg"
            style={{ color: "var(--color-ink-on-dark-secondary)" }}
          >
            I only work with values-driven businesses. If you genuinely care about your customers
            and want the systems to compete with the giants in your industry — I&apos;d love to
            connect. When the right audience finds the right business, everybody wins.
          </p>
          <div className="mt-10">
            <Button
              href="/contact"
              variant="primary"
              size="lg"
            >
              Let&apos;s Have a Chat
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
