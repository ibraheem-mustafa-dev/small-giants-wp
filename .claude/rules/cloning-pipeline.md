---
paths:
  - "scripts/computed-route/**"
  - "scripts/parity/**"
  - "scripts/wp-build-page.js"
  - "sites/*/build/**"
  - "plugins/sgs-blocks/includes/class-sgs-container-wrapper.php"
---

# Cloning rules

Cloning runs on the computed route (Spec 48, `scripts/computed-route/`). The binding principles are in `.claude/rules/framework-principles.md`.

- **Success:** the live page matches the draft, with native block settings written through the framework DB and no cheats. Read the parity walker's output (`scripts/parity/GAP-CHECKLIST.md`) at 1440, 768 and 375.
- **Code first, render confirms** (Spec 48 R-47-4): values and intent come from the draft's code, read through the runtime (never by regex over `.dc.html`); the render at 375/768/1440 confirms every written value and is the source only for values the draft never states (browser defaults, inheritance). On disagreement the render wins and is reported, except a listed draft defect.
- **Elements pair by draft element ID** (the runtime's `data-dc-tpl` identity, its import hosts and `sc-for` loop membership), never by wrapper-class keying. Word matching only cross-checks an identity pair and never removes one (Spec 48 FR-48-10). Pixel-diff misleads: an empty section scores a false win.
- **Numbers alone never close fidelity, and Bean's eye alone never does** (R-31-13). Accepted differences live in the client's divergence ledger.
- **Universal, no carve-outs:** a fix applies to every qualifying block and case (R-31-9), never "except for X block".
- **Responsive values go in block attributes, never inline CSS:** inline beats `@media` and kills responsiveness.
- **Breakpoints** (Spec 48 FR-48-50, Spec 32 FR-32-13): the device-tier system (`…Mobile` / `…Tablet` attrs) is fixed at 768/1024. A draft threshold within 5% of a tier snaps to it (1060 becomes 1024), and each snap is recorded automatically in the divergence ledger as a `breakpoint-snap` entry with its distance. Otherwise the threshold goes in the block's own breakpoint setting, or else the block's `sgsCustomCss` residual as a bounded, scoped media query, listed in the surface report; it is never coerced into a tier. The route writes no media query into `sgsCustomCss` until the channel is hardened or a structured breakpoint override exists (Spec 32 FR-32-20).
- **A composite with a built-in wrapper** offers the `sgs/container` panels it needs, opt-in per block (Spec 02 "Composite wrapper rule"). A hardcoded default the wrapper injects over transferred CSS is a defect to remove, not a blocker.
- **A migrated composite never carries a server-side legacy fallback** in `render.php`; existing posts migrate by WP-CLI batch (R-31-14).
- **Design-gate shared-mechanism changes** (wrapper, walker, solver) and get Bean's approval before building.
