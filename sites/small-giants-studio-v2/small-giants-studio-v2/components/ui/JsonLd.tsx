interface JsonLdProps {
  data: Record<string, unknown>;
}

// Safe usage: data is always hardcoded structured data, never user input
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
