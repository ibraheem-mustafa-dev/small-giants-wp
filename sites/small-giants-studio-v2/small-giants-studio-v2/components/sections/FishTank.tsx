"use client";

import { useScrollReveal } from "@/components/hooks/useScrollReveal";

export function FishTank() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      id="approach"
      className="relative py-24 sm:py-32"
      style={{ backgroundColor: "var(--color-surface-light-alt)" }}
      aria-labelledby="fishtank-heading"
    >
      <style>{`
        @keyframes swim-right {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(30px, -8px); }
          50% { transform: translate(60px, 5px); }
          75% { transform: translate(30px, 10px); }
        }
        @keyframes swim-left {
          0%, 100% { transform: translate(0, 0) scaleX(-1); }
          25% { transform: translate(-25px, 6px) scaleX(-1); }
          50% { transform: translate(-50px, -4px) scaleX(-1); }
          75% { transform: translate(-25px, -10px) scaleX(-1); }
        }
        @keyframes rise {
          0% { transform: translateY(0); opacity: 0.4; }
          100% { transform: translateY(-80px); opacity: 0; }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.35; }
        }
        @keyframes food-drop {
          0% { transform: translateY(0); opacity: 0.9; }
          100% { transform: translateY(40px); opacity: 0; }
        }
        @media (max-width: 639px) {
          .tank-label { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fish-swim, .bubble-rise, .seaweed-sway, .water-shimmer, .food-float {
            animation: none !important;
          }
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Illustration */}
          <div className="scroll-reveal relative">
            <div
              className="aspect-square p-8"
              style={{
                backgroundColor: "var(--color-surface-light)",
                borderRadius: "0",
              }}
            >
              <svg
                viewBox="0 0 400 400"
                className="h-full w-full"
                role="img"
                aria-label="Fish tank metaphor: marketing feeds your business, operations is the tank that lets it grow"
              >
                {/* Tank */}
                <rect
                  x="50"
                  y="80"
                  width="300"
                  height="250"
                  rx="10"
                  fill="none"
                  style={{ stroke: "var(--color-ink-primary)" }}
                  strokeWidth="4"
                />
                {/* Water with shimmer */}
                <rect
                  x="54"
                  y="100"
                  width="292"
                  height="226"
                  rx="6"
                  className="water-shimmer"
                  style={{ fill: "var(--color-accent)", animation: "shimmer 4s ease-in-out infinite" }}
                />

                {/* Seaweed */}
                <g className="seaweed-sway" style={{ animation: "sway 3s ease-in-out infinite", transformOrigin: "100px 326px" }}>
                  <path d="M100 326 Q95 290 105 260 Q95 230 100 200" fill="none" style={{ stroke: "var(--color-accent-dark)" }} strokeWidth="4" strokeLinecap="round" />
                  <ellipse cx="105" cy="260" rx="8" ry="14" style={{ fill: "var(--color-accent-dark)" }} opacity="0.6" />
                  <ellipse cx="95" cy="230" rx="7" ry="12" style={{ fill: "var(--color-accent)" }} opacity="0.5" />
                </g>
                <g className="seaweed-sway" style={{ animation: "sway 3.5s ease-in-out infinite 0.5s", transformOrigin: "300px 326px" }}>
                  <path d="M300 326 Q305 295 295 265 Q305 235 300 210" fill="none" style={{ stroke: "var(--color-accent-dark)" }} strokeWidth="3" strokeLinecap="round" />
                  <ellipse cx="295" cy="265" rx="7" ry="12" style={{ fill: "var(--color-accent-dark)" }} opacity="0.5" />
                </g>
                <g className="seaweed-sway" style={{ animation: "sway 2.8s ease-in-out infinite 1s", transformOrigin: "180px 326px" }}>
                  <path d="M180 326 Q175 300 185 275" fill="none" style={{ stroke: "var(--color-accent)" }} strokeWidth="3" strokeLinecap="round" />
                  <ellipse cx="185" cy="275" rx="6" ry="10" style={{ fill: "var(--color-accent)" }} opacity="0.4" />
                </g>

                {/* Fish 1 — swimming right */}
                <g className="fish-swim" style={{ animation: "swim-right 6s ease-in-out infinite" }}>
                  <g transform="translate(140, 180)">
                    <ellipse cx="0" cy="0" rx="40" ry="25" style={{ fill: "var(--color-ink-primary)" }} />
                    <polygon points="35,0 55,-15 55,15" style={{ fill: "var(--color-ink-primary)" }} />
                    <circle cx="-20" cy="-5" r="5" fill="white" />
                    <circle cx="-18" cy="-5" r="3" style={{ fill: "var(--color-accent-dark)" }} />
                    <path d="M5 -20 Q15 -30 25 -18" fill="none" style={{ stroke: "var(--color-surface-dark-alt)" }} strokeWidth="2" />
                  </g>
                </g>

                {/* Fish 2 — swimming left */}
                <g className="fish-swim" style={{ animation: "swim-left 7s ease-in-out infinite 1s" }}>
                  <g transform="translate(280, 240)">
                    <ellipse cx="0" cy="0" rx="30" ry="18" style={{ fill: "var(--color-ink-primary)" }} opacity="0.8" />
                    <polygon points="25,0 40,-10 40,10" style={{ fill: "var(--color-ink-primary)" }} opacity="0.8" />
                    <circle cx="-15" cy="-3" r="4" fill="white" />
                    <circle cx="-13" cy="-3" r="2.5" style={{ fill: "var(--color-accent-dark)" }} />
                  </g>
                </g>

                {/* Fish 3 — small background fish */}
                <g className="fish-swim" style={{ animation: "swim-right 8s ease-in-out infinite 2s" }}>
                  <g transform="translate(200, 280)">
                    <ellipse cx="0" cy="0" rx="18" ry="10" style={{ fill: "var(--color-ink-secondary)" }} opacity="0.5" />
                    <polygon points="15,0 25,-7 25,7" style={{ fill: "var(--color-ink-secondary)" }} opacity="0.5" />
                  </g>
                </g>

                {/* Bubbles */}
                <circle cx="200" cy="200" r="6" fill="white" opacity="0.3" className="bubble-rise" style={{ animation: "rise 3s ease-out infinite" }} />
                <circle cx="220" cy="220" r="4" fill="white" opacity="0.2" className="bubble-rise" style={{ animation: "rise 3.5s ease-out infinite 0.8s" }} />
                <circle cx="180" cy="210" r="5" fill="white" opacity="0.25" className="bubble-rise" style={{ animation: "rise 4s ease-out infinite 1.5s" }} />
                <circle cx="160" cy="190" r="3" fill="white" opacity="0.2" className="bubble-rise" style={{ animation: "rise 3.2s ease-out infinite 2.2s" }} />
                <circle cx="240" cy="250" r="4" fill="white" opacity="0.2" className="bubble-rise" style={{ animation: "rise 3.8s ease-out infinite 0.5s" }} />

                {/* Food dropping */}
                <g className="food-float" style={{ animation: "food-drop 3s ease-in infinite" }}>
                  <circle cx="180" cy="105" r="3" style={{ fill: "var(--color-ink-primary)" }} />
                  <circle cx="200" cy="108" r="2.5" style={{ fill: "var(--color-ink-primary)" }} />
                  <circle cx="220" cy="103" r="3" style={{ fill: "var(--color-ink-primary)" }} />
                </g>
                <g className="food-float" style={{ animation: "food-drop 3s ease-in infinite 1.5s" }}>
                  <circle cx="160" cy="107" r="2" style={{ fill: "var(--color-ink-secondary)" }} />
                  <circle cx="240" cy="104" r="2.5" style={{ fill: "var(--color-ink-secondary)" }} />
                </g>

                {/* Labels */}
                <text x="200" y="50" textAnchor="middle" className="tank-label text-sm font-medium" style={{ fill: "var(--color-ink-primary)" }}>
                  Marketing = The Food
                </text>
                <text x="200" y="360" textAnchor="middle" className="tank-label text-sm font-medium" style={{ fill: "var(--color-ink-primary)" }}>
                  Operations = The Tank
                </text>
              </svg>
            </div>
          </div>

          {/* Content */}
          <div>
            <h2
              id="fishtank-heading"
              className="scroll-reveal"
              style={{ color: "var(--color-ink-primary)" }}
            >
              Think of it like fish in a tank.
            </h2>
            <div
              className="scroll-reveal mt-8 space-y-4 text-lg"
              style={{ color: "var(--color-ink-secondary)" }}
            >
              <p>
                You can feed them all you want, but if the tank&apos;s too small, they&apos;ll
                stunt, deform, or die. Once they move to a bigger tank, they can grow even larger
                and thrive.
              </p>
              <p>
                <strong style={{ color: "var(--color-ink-primary)" }}>Marketing is the food</strong> — it gets
                people to find you.
              </p>
              <p>
                <strong style={{ color: "var(--color-ink-primary)" }}>Operations is the tank</strong> — it lets
                you handle them when they arrive.
              </p>
              <p>
                Most businesses have one or the other. Giants have both working together as one
                connected system.
              </p>
            </div>
            <div
              className="scroll-reveal mt-10 border p-8"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-light)",
                borderRadius: "0",
              }}
            >
              <p
                className="text-lg"
                style={{
                  fontFamily: "var(--font-display, serif)",
                  fontWeight: 400,
                  color: "var(--color-ink-primary)",
                }}
              >
                Which area is your limiting factor?
              </p>
              <p
                className="mt-2"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                I build both as one connected system — not a Frankenstein of tools that don&apos;t
                talk to each other.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
