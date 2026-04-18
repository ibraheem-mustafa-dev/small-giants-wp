import Image from "next/image";

const partners = [
  {
    name: "Evertreen",
    description: "Every client I work with plants trees through Evertreen. It's not greenwashing — it's just the right thing to do.",
    logo: "/images/partners/evertreen-logo.svg",
    url: "https://evertreen.com",
  },
  {
    name: "Muslims in Construction",
    description: "I built their website — and I couldn't be prouder of the work they do connecting Muslim professionals in construction across the UK.",
    logo: "/images/partners/mic-logo.png",
    url: "https://muslimsincontruction.co.uk",
  },
  {
    name: "Association of Muslim Engineers",
    description: "I help with their events because community matters. MashaAllah, the work they do supporting Muslim engineers is inspiring.",
    logo: "/images/partners/ame-logo.png",
    url: "https://ame.org.uk",
  },
];

export function Community() {
  return (
    <section
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--color-surface-dark-teal)" }}
      aria-labelledby="community-heading"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="community-heading"
            style={{ color: "var(--color-ink-on-dark)" }}
          >
            Community isn&apos;t a marketing strategy.
            <span
              className="mt-1 block"
              style={{ color: "var(--color-accent)" }}
            >
              It&apos;s who I am.
            </span>
          </h2>
          <p
            className="mt-6 text-lg"
            style={{ color: "var(--color-ink-on-dark-secondary)" }}
          >
            Not networking for what you can extract — but investing in something that lifts the
            whole community. Alhamdulillah, I get to work with people who genuinely care.
          </p>
        </div>

        {/* Partner cards — sharp edges */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {partners.map((partner) => (
            <a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col border p-8 transition-all hover:shadow-lg"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: "0",
              }}
            >
              <div className="flex h-16 items-center justify-center">
                <Image
                  src={partner.logo}
                  alt={`${partner.name} — Small Giants Studio community partner`}
                  width={160}
                  height={64}
                  sizes="(max-width: 640px) 120px, 160px"
                  className="h-12 w-auto object-contain transition-all group-hover:scale-110"
                />
              </div>
              <h3
                className="mt-6 text-center text-lg"
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontWeight: 400,
                  color: "var(--color-ink-on-dark)",
                }}
              >
                {partner.name}
              </h3>
              <p
                className="mt-3 flex-1 text-center text-sm leading-relaxed"
                style={{ color: "var(--color-ink-on-dark-secondary)" }}
              >
                {partner.description}
              </p>
              <div
                className="mt-6 flex items-center justify-center text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: "var(--color-accent)" }}
              >
                Visit website
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        {/* Evertreen Forest Embed */}
        <div className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h3
              style={{
                fontFamily: "var(--font-display, serif)",
                fontWeight: 400,
                color: "var(--color-ink-on-dark)",
              }}
            >
              Our Growing Forest
            </h3>
            <p
              className="mt-3"
              style={{ color: "var(--color-ink-on-dark-secondary)" }}
            >
              Every project I complete plants real trees. It&apos;s a small thing — but it adds up.
            </p>
          </div>
          <div
            className="mt-8 overflow-hidden border"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              borderRadius: "0",
            }}
          >
            <iframe
              width="100%"
              height="500"
              style={{ border: "none" }}
              src="https://www.evertreen.com/forest/697950af3dc86?iframe=1"
              title="Small Giants Studio Evertreen Forest"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
