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
- **Code first, render confirms** (Spec 48 R-47-4): values and intent come from the draft's code, read through the runtime (never by regex over `.dc.html`, which cannot see runtime-built structure); the render at 375/768/1440 confirms every written value and is the source only for values the draft never states (browser defaults, inheritance). On disagreement the render wins and is reported, except a listed draft defect.
- **Elements pair by draft element ID** (the runtime's `data-dc-tpl` identity, its import hosts and `sc-for` loop membership), never by wrapper-class keying. Word matching only cross-checks an identity pair and never removes one (Spec 48 FR-48-10). Pixel-diff misleads: an empty section scores a false win.
- **Closing:** numbers alone never close fidelity and neither does Bean's eye alone (FP-4, FP-13). Accepted differences live in the client's divergence ledger.
- **Responsive values go in block attributes, never inline CSS:** inline beats `@media` and kills responsiveness (the no-inline-style rule is in the root `CLAUDE.md`).
- **Breakpoints** (Spec 48 FR-48-50, Spec 32 FR-32-13): the device-tier system (`…Mobile` / `…Tablet` attrs) is fixed at 768/1024. A draft threshold within 5% of a tier snaps to it (1060 becomes 1024) and is recorded automatically in the divergence ledger as a `breakpoint-snap` entry with its distance. Otherwise use the block's own breakpoint setting, else the block's `sgsCustomCss` residual as a bounded, scoped media query listed in the surface report (the channel scopes every rule to its instance; the route labels each in `sgsCustomCssNote`, Spec 32 FR-32-20). Never coerce a threshold into a tier.
- **A composite with a built-in wrapper** offers the `sgs/container` panels it needs, opt-in per block (Spec 02 "Composite wrapper rule"). A hardcoded default the wrapper injects over transferred CSS is a defect to remove, not a blocker. Universality (FP-9) and no server-side legacy fallback in a migrated composite (FP-14) apply here too.
- **Calibrate on a local mirror** (`--site local-<client>`, `.claude/dev-setup.md` "Local WordPress mirrors"), never on a Hostinger test site (its edge blocks calibration bursts with 403s).
- **The clone owns its test site:** it owns every site-wide setting it builds there, the active header, footer and drawer included, and a pointer goes to the clone's post whichever post it named (Spec 48 R-48-2, FR-48-55 step 7). No route step, push or calibration writes to `eye-care-test` (root `CLAUDE.md` Sites).
- **Design-gate shared-mechanism changes** (wrapper, walker, solver) and get Bean's approval before building.
