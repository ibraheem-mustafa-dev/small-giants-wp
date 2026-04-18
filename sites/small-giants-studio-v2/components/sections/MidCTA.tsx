import { Button } from "@/components/ui/Button";

export function MidCTA() {
  return (
    <section
      className="py-12 sm:py-16"
      style={{ backgroundColor: "var(--color-surface-dark)" }}
    >
      <div className="mx-auto max-w-4xl px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p
              className="text-xl font-medium sm:text-2xl"
              style={{
                fontFamily: "var(--font-display, serif)",
                color: "var(--color-ink-on-dark)",
                fontWeight: 400,
              }}
            >
              Sound like your business?
            </p>
            <p
              className="mt-2"
              style={{ color: "var(--color-ink-on-dark-secondary)" }}
            >
              Let&apos;s figure out whether it&apos;s the tank or the food that needs fixing first.
            </p>
          </div>
          <div className="shrink-0">
            <Button href="/contact" variant="white" size="lg">
              Let&apos;s Chat
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
