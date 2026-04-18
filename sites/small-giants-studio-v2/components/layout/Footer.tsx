import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const navigation = {
  services: [
    { name: "Digital Transformation", href: "/services#digital-transformation" },
    { name: "Marketing Strategy", href: "/services#marketing-strategy" },
    { name: "Website Development", href: "/services#website-development" },
    { name: "CRM & Operations", href: "/services#crm-operations" },
    { name: "AI & Automation", href: "/services#ai-automation" },
    { name: "SEO & Digital Marketing", href: "/services#seo-marketing" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Sustainability", href: "/sustainability" },
    { name: "Insights", href: "/insights" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ],
  social: [
    {
      name: "Ibraheem on LinkedIn",
      href: "https://www.linkedin.com/in/ibraheem-mustafa",
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "Small Giants Studio on LinkedIn",
      href: "https://www.linkedin.com/company/small-giants-studio",
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t"
      style={{
        backgroundColor: "var(--color-surface-dark)",
        borderColor: "var(--color-surface-dark-alt)",
      }}
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Brand column */}
          <div className="space-y-6">
            <Logo variant="light" className="h-12 w-auto" />
            <p
              className="max-w-xs text-sm"
              style={{ color: "var(--color-ink-on-dark-secondary)" }}
            >
              Helping human-led businesses compete with the giants. Enterprise-level marketing,
              automation, and tech — at budgets that actually work.
            </p>
            <div className="flex gap-5">
              {navigation.social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded transition-colors focus:outline-none focus:ring-2"
                  style={{ color: "var(--color-ink-on-dark-secondary)" }}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium">
                    {item.name === "Ibraheem on LinkedIn" ? "Ibraheem" : "Company"}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          <div className="mt-12 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3
                  className="text-sm font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-on-dark)" }}
                >
                  Services
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {navigation.services.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="rounded text-sm transition-colors focus:outline-none focus:ring-2"
                        style={{ color: "var(--color-ink-on-dark-secondary)" }}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3
                  className="text-sm font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-on-dark)" }}
                >
                  Company
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {navigation.company.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="rounded text-sm transition-colors focus:outline-none focus:ring-2"
                        style={{ color: "var(--color-ink-on-dark-secondary)" }}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <div>
                <h3
                  className="text-sm font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-on-dark)" }}
                >
                  Get in Touch
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  <li>
                    <a
                      href="mailto:hello@smallgiantsstudio.co.uk"
                      className="rounded text-sm transition-colors focus:outline-none focus:ring-2"
                      style={{ color: "var(--color-ink-on-dark-secondary)" }}
                    >
                      hello@smallgiantsstudio.co.uk
                    </a>
                  </li>
                  <li>
                    <a
                      href="tel:+447424449555"
                      className="rounded text-sm transition-colors focus:outline-none focus:ring-2"
                      style={{ color: "var(--color-ink-on-dark-secondary)" }}
                    >
                      07424 449555
                    </a>
                  </li>
                  <li
                    className="text-sm"
                    style={{ color: "var(--color-ink-on-dark-secondary)" }}
                  >
                    Birmingham, UK
                  </li>
                </ul>
              </div>
              <div className="mt-10">
                <h3
                  className="text-sm font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-on-dark)" }}
                >
                  Legal
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {navigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="rounded text-sm transition-colors focus:outline-none focus:ring-2"
                        style={{ color: "var(--color-ink-on-dark-secondary)" }}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div
          className="mt-12 border-t pt-8"
          style={{ borderColor: "var(--color-surface-dark-alt)" }}
        >
          <p
            className="text-center text-xs"
            style={{ color: "var(--color-ink-on-dark-secondary)" }}
          >
            &copy; {currentYear} Small Giants Studio Ltd. All rights reserved. Company registered in
            England and Wales (16959564).
          </p>
        </div>
      </div>
    </footer>
  );
}
