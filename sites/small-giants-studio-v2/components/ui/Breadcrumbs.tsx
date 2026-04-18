import Link from "next/link";
import { JsonLd } from "@/components/ui/JsonLd";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const schemaItems = items.map((item, index) => ({
    "@type": "ListItem" as const,
    position: index + 1,
    name: item.label,
    ...(item.href ? { item: `https://smallgiantsstudio.co.uk${item.href}` } : {}),
  }));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: schemaItems,
        }}
      />
      <nav
        aria-label="Breadcrumb"
        className="border-b"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface-light)",
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-3 sm:px-8 lg:px-12">
          <ol
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <svg
                    className="h-4 w-4"
                    style={{ color: "var(--color-text-muted)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="editorial-link rounded transition-colors focus:outline-none focus:ring-2"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="font-medium"
                    style={{ color: "var(--color-ink-secondary)" }}
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
