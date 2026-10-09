---
paths:
  - "scripts/computed-route/**"
  - "scripts/parity/**"
  - "scripts/wp-build-page.js"
  - "sites/*/build/**"
  - "plugins/sgs-blocks/includes/class-sgs-container-wrapper.php"
---

# Cloning rules

Cloning runs on the computed route (Spec 47, `scripts/computed-route/`). The binding principles are in `.claude/rules/framework-principles.md`.

- **Success:** the live page matches the draft on measured rendered values, with native block settings written through the framework DB and no cheats. Read the parity walker's output (`scripts/parity/GAP-CHECKLIST.md`) at 1440, 768 and 375.
- **Fidelity is measured on text and layout rows**, matched by text content, never a source-declaration diff (blind to inherited values) or wrapper-class keying. Pixel-diff misleads: an empty section scores a false win.
- **Numbers alone never close fidelity, and Bean's eye alone never does** (R-31-13). Accepted differences live in the client's divergence ledger.
- **Universal, no carve-outs:** a fix applies to every qualifying block and case (R-31-9), never "except for X block".
- **Responsive values go in block attributes, never inline CSS:** inline beats `@media` and kills responsiveness.
- **Breakpoints:** the device-tier system (`…Mobile` / `…Tablet` attrs) is fixed at 768/1024; a single draft rule at an arbitrary breakpoint (600/640/781) for a design reason is distinct from a device tier and is never coerced into one (Spec 32 FR-32-13). Classify before changing one.
- **A composite with a built-in wrapper** offers the `sgs/container` panels it needs, opt-in per block (Spec 02 "Composite wrapper rule"). A hardcoded default the wrapper injects over transferred CSS is a defect to remove, not a blocker.
- **A migrated composite never carries a server-side legacy fallback** in `render.php`; existing posts migrate by WP-CLI batch (R-31-14).
- **Design-gate shared-mechanism changes** (wrapper, walker, solver) and get Bean's approval before building.
