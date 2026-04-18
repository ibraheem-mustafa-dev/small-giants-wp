import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/ui/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Digital Transformation Services for UK SMEs & Charities",
  description:
    "Digital transformation, marketing, AI automation, and CRM services for UK SMEs and charities. Based in Birmingham, serving businesses across the UK — at budgets that actually work.",
  openGraph: {
    title: "Digital Transformation Services for UK SMEs & Charities",
    description:
      "Digital transformation, marketing, AI automation, and CRM services for UK SMEs and charities. Based in Birmingham, serving across the UK.",
  },
  alternates: {
    canonical: "/services",
  },
};

const services = [
  {
    id: "digital-transformation",
    title: "Digital Transformation",
    outcome: "Get your whole digital setup working together",
    illustration: "/images/generated/service-digital-transformation.png",
    illustrationAlt: "Digital transformation illustration",
    problem: "Your tools don't talk to each other. You're manually copying data between systems. Things fall through the cracks because nothing's connected. (I see this every single time.)",
    solution: "I audit your whole digital setup and rebuild it as one connected system. Marketing, operations, CRM — all talking to each other instead of living in separate tabs you forgot about.",
    includes: [
      "Full digital audit and strategy",
      "System architecture design",
      "Tool selection and implementation",
      "Data migration and integration",
      "Team training and documentation",
      "Ongoing support and optimisation",
    ],
  },
  {
    id: "marketing-strategy",
    title: "Marketing Strategy",
    outcome: "Get found by the right people",
    illustration: "/images/generated/service-marketing.png",
    illustrationAlt: "Marketing strategy illustration",
    problem: "You're spending money on marketing but can't point to what's actually working. Your competitors seem to be everywhere while you're invisible. Sound familiar?",
    solution: "Strategy that actually brings in the right people — not vanity metrics that look good in a report but don't pay the bills.",
    includes: [
      "Target audience research",
      "Competitor analysis",
      "Channel strategy and prioritisation",
      "Content strategy",
      "Campaign planning",
      "Performance tracking setup",
    ],
  },
  {
    id: "website-development",
    title: "Website Design & Development",
    outcome: "A website that actually generates leads",
    illustration: "/images/generated/service-web-dev.png",
    illustrationAlt: "Website development illustration",
    problem: "Your website looks outdated. It doesn't work on mobile. Visitors come but never get in touch. You can't update it yourself without breaking something.",
    solution: "Fast, accessible websites that convert visitors into customers. Not a digital brochure that sits there looking pretty and doing nothing.",
    includes: [
      "Custom design tailored to your brand",
      "Mobile-first responsive development",
      "SEO foundation built in",
      "Contact forms and lead capture",
      "Content management training",
      "Ongoing maintenance options",
    ],
  },
  {
    id: "crm-operations",
    title: "CRM & Operations",
    outcome: "Stop things falling through the cracks",
    illustration: "/images/generated/service-crm.png",
    illustrationAlt: "CRM and operations illustration",
    problem: "You're tracking customers in spreadsheets — or worse, your head. Follow-ups get forgotten. You don't know where leads are in your pipeline. Important stuff slips because there's no system.",
    solution: "Systems that track every lead, every follow-up, every task — so nothing falls through the cracks. No more 'I'm sure I emailed them back' moments.",
    includes: [
      "CRM selection and setup",
      "Pipeline and workflow design",
      "Automation of repetitive tasks",
      "Email integration",
      "Reporting dashboards",
      "Team training",
    ],
  },
  {
    id: "ai-automation",
    title: "AI & Automation",
    outcome: "Free up your time for actual work",
    illustration: "/images/generated/service-automation.png",
    illustrationAlt: "AI and automation illustration",
    problem: "You're spending hours on repetitive tasks you know could be automated. You've heard about AI but don't know where to start — and honestly, most of what you've seen feels like hype.",
    solution: "Practical AI that actually saves you time. No hype, no 'AI will replace everyone' nonsense — just automation for the stuff you're tired of doing manually.",
    includes: [
      "AI opportunity assessment",
      "Custom automation development",
      "AI-powered content tools",
      "Chatbot and customer service AI",
      "Process automation",
      "Training and documentation",
    ],
  },
  {
    id: "seo-marketing",
    title: "SEO, GEO & Digital Marketing",
    outcome: "Show up where your customers are looking — including AI",
    illustration: "/images/generated/service-seo.png",
    illustrationAlt: "SEO and digital marketing illustration",
    problem: "Your website doesn't appear on Google. You're invisible on ChatGPT, Gemini, and Copilot when people ask for recommendations. Competitors rank higher even though you've been around longer.",
    solution: "Be found on Google, ChatGPT, and everywhere else your customers search. Most businesses aren't even thinking about AI search yet — which is exactly why you should be.",
    includes: [
      "SEO audit and strategy",
      "GEO (Generative Engine Optimisation) for AI discoverability",
      "On-page and technical optimisation",
      "Content optimised for both Google and AI chatbots",
      "Google Ads management",
      "Social media advertising",
      "Monthly reporting and analysis",
    ],
  },
];

const faqs = [
  {
    question: "What does digital transformation actually mean?",
    answer: "It means getting your marketing, operations, and tech working as one connected system instead of a mess of disconnected tools. Most small businesses have separate email, CRM, accounting, and marketing platforms that don't talk to each other. I integrate them so nothing falls through the cracks.",
  },
  {
    question: "How much does this cost?",
    answer: "It depends on scope. Smaller projects like marketing strategy or CRM setup start around a few thousand pounds. Bigger transformations covering multiple systems run higher, but I'm always upfront about costs and I work within your budget. No hidden fees, no inflated software licences.",
  },
  {
    question: "How long does a typical project take?",
    answer: "Most projects take 3-6 months from discovery to launch. Quick wins like email automation or a basic CRM setup can happen in weeks. Full system overhauls take longer. I prioritise getting you value quickly while building the long-term system.",
  },
  {
    question: "Do you work with charities and social enterprises?",
    answer: "Absolutely — they're some of my favourite clients. Charities often have the tightest budgets and smallest teams, which means the systems I build have to work harder. I offer flexible pricing for registered charities and social enterprises.",
  },
  {
    question: "What makes you different from other consultants?",
    answer: "Two things. First, I don't just do marketing or just do operations — I connect both into one system. Most consultants pick a lane; I build the whole road. Second, I actually stay involved until it works. No hand-off-and-disappear.",
  },
  {
    question: "Can you help with AI and automation?",
    answer: "Yes — it's one of my core strengths. I help with AI content workflows, customer service automation, data analysis, and operational automation. The goal isn't replacing people — it's freeing you up to do the work that actually matters.",
  },
];

const serviceSchemas = services.map((service) => ({
  "@type": "Service",
  "@id": `https://smallgiantsstudio.co.uk/services#${service.id}`,
  name: service.title,
  description: service.solution,
  provider: {
    "@type": "LocalBusiness",
    "@id": "https://smallgiantsstudio.co.uk",
  },
  areaServed: {
    "@type": "Country",
    name: "United Kingdom",
  },
}));

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            ...serviceSchemas,
            {
              "@type": "FAQPage",
              mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            },
          ],
        }}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Services" }]} />

      {/* Hero Section */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-dark)" }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 style={{ color: "var(--color-ink-on-dark)" }}>
              What I can help with
            </h1>
            <p
              className="mt-8 text-xl"
              style={{ color: "var(--color-ink-on-dark-secondary)" }}
            >
              I don&apos;t build until I understand your business. Strategy first. Tools chosen
              for how you work, not what&apos;s popular.
            </p>
            <p
              className="mt-4"
              style={{ color: "var(--color-ink-on-dark-secondary)", opacity: 0.7 }}
            >
              Every engagement starts with understanding where you are, where you want to be, and
              what&apos;s blocking your growth. And I&apos;m resourceful with your budget — if
              expensive software isn&apos;t realistic right now, I build smart with affordable
              tools and automation that punches well above its weight.
            </p>
          </div>
        </div>
      </section>

      {/* Services List */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-light)" }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="space-y-32">
            {services.map((service, index) => (
              <div
                key={service.id}
                id={service.id}
                className="grid gap-16 lg:grid-cols-2 lg:items-start"
              >
                {/* Content */}
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  {/* Service illustration */}
                  <div className="mb-6" style={{ width: "64px", height: "64px" }}>
                    <Image
                      src={service.illustration}
                      alt={service.illustrationAlt}
                      width={64}
                      height={64}
                      sizes="64px"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <p
                    className="text-sm font-semibold uppercase tracking-widest"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {service.outcome}
                  </p>
                  <h2
                    className="mt-3"
                    style={{ color: "var(--color-ink-primary)" }}
                  >
                    {service.title}
                  </h2>

                  <div className="mt-8 space-y-6">
                    <div>
                      <h3
                        style={{
                          fontFamily: "var(--font-display, serif)",
                          fontWeight: 400,
                          color: "var(--color-ink-primary)",
                        }}
                      >
                        The problem
                      </h3>
                      <p
                        className="mt-3"
                        style={{ color: "var(--color-ink-secondary)" }}
                      >
                        {service.problem}
                      </p>
                    </div>

                    <div>
                      <h3
                        style={{
                          fontFamily: "var(--font-display, serif)",
                          fontWeight: 400,
                          color: "var(--color-ink-primary)",
                        }}
                      >
                        How I help
                      </h3>
                      <p
                        className="mt-3"
                        style={{ color: "var(--color-ink-secondary)" }}
                      >
                        {service.solution}
                      </p>
                    </div>
                  </div>

                  <div className="mt-10">
                    <Button href="/contact">Let&apos;s discuss your {service.title.toLowerCase()}</Button>
                  </div>
                </div>

                {/* What's included — sharp card */}
                <div
                  className={`border p-8 sm:p-10 ${
                    index % 2 === 1 ? "lg:order-1" : ""
                  }`}
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
                    What&apos;s included
                  </h3>
                  <ul className="mt-6 space-y-4">
                    {service.includes.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <svg
                          className="mt-1 h-5 w-5 flex-shrink-0"
                          style={{ color: "var(--color-accent)" }}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                        <span style={{ color: "var(--color-ink-secondary)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approach Section */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-light-alt)" }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8 lg:px-12">
          <h2 style={{ color: "var(--color-ink-primary)" }}>How I work</h2>
          <div
            className="mt-8 space-y-6 text-lg"
            style={{ color: "var(--color-ink-secondary)" }}
          >
            <p>
              I&apos;m not a vendor who builds what you ask for and disappears. I&apos;m a partner
              who helps you figure out what you actually need. There&apos;s a difference (and if
              you&apos;ve been burned by consultants before, you know exactly what I mean).
            </p>
            <p>
              Every engagement starts with understanding your business, your customers, and your
              goals. Then we build the right solution — not the most expensive one, not the
              trendiest one, the right one. You pay for expertise, not inflated software licences.
            </p>
            <p>
              I stay involved until it works. If something needs adjusting, we adjust it. If you
              need training, I train you. The goal is a system that serves your business for
              years, not a project that gets delivered and forgotten.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Signals Section */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-light)" }}
        aria-labelledby="pricing-heading"
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="pricing-heading"
              style={{ color: "var(--color-ink-primary)" }}
            >
              Honest pricing. No surprises.
            </h2>
            <p
              className="mt-6 text-lg"
              style={{ color: "var(--color-ink-secondary)" }}
            >
              I know small businesses worry about consultant fees. Here&apos;s how I keep things fair.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            <div
              className="border p-8 text-center"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "0",
              }}
            >
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center"
                style={{ color: "var(--color-accent)" }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <h3
                className="mt-4 text-lg"
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontWeight: 400,
                  color: "var(--color-ink-primary)",
                }}
              >
                Fixed-price projects
              </h3>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                You know exactly what you&apos;re paying before we start. No hourly surprises, no scope creep charges.
              </p>
            </div>
            <div
              className="border p-8 text-center"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "0",
              }}
            >
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center"
                style={{ color: "var(--color-accent)" }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                </svg>
              </div>
              <h3
                className="mt-4 text-lg"
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontWeight: 400,
                  color: "var(--color-ink-primary)",
                }}
              >
                Scaled to your budget
              </h3>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                I work with what you&apos;ve got. Charities and social enterprises get flexible pricing. No one gets priced out.
              </p>
            </div>
            <div
              className="border p-8 text-center"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "0",
              }}
            >
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center"
                style={{ color: "var(--color-accent)" }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3
                className="mt-4 text-lg"
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontWeight: 400,
                  color: "var(--color-ink-primary)",
                }}
              >
                No inflated licences
              </h3>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                I recommend tools that fit your budget — not the ones that earn me the biggest commission. Most of what I use is free or affordable.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <p style={{ color: "var(--color-ink-secondary)" }}>
              Most projects start from a few thousand pounds. Let&apos;s talk about what you need — I&apos;ll be upfront about what it costs.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--color-surface-light-alt)" }}
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12">
          <h2
            id="faq-heading"
            style={{ color: "var(--color-ink-primary)" }}
          >
            Questions I get asked a lot
          </h2>
          <div
            className="mt-10 divide-y"
            style={{ borderColor: "var(--color-border)" }}
          >
            {faqs.map((faq, index) => (
              <details key={index} className="group py-8">
                <summary
                  className="flex cursor-pointer items-center justify-between text-lg font-medium transition-colors"
                  style={{
                    fontFamily: "var(--font-display, serif)",
                    fontWeight: 400,
                    color: "var(--color-ink-primary)",
                  }}
                >
                  {faq.question}
                  <svg
                    className="ml-4 h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
                    style={{ color: "var(--color-text-muted)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <p
                  className="mt-4"
                  style={{ color: "var(--color-ink-secondary)" }}
                >
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          backgroundColor: "var(--color-surface-dark)",
          padding: "clamp(6rem, 12vh, 10rem) 0",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8 lg:px-12">
          <h2 style={{ color: "var(--color-ink-on-dark)" }}>
            Not sure where to start?
          </h2>
          <p
            className="mt-6 text-lg"
            style={{ color: "var(--color-ink-on-dark-secondary)" }}
          >
            Let&apos;s have a chat about your business. No hard sell — just an honest conversation
            about what&apos;s holding you back and whether I can help.
          </p>
          <div className="mt-10">
            <Button
              href="/contact"
              variant="primary"
              size="lg"
            >
              Let&apos;s Talk
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
