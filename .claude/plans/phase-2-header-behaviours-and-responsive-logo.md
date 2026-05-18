# Phase 2A — Header Behaviours + Responsive Logo

**Generated:** 2026-05-20
**Source:** session 2026-05-20-spec-17-live-verification + 2× research subagents (`reports/research-2026-05-20-header-gold-standard.md`, `reports/research-2026-05-20-responsive-logo.md`)
**Branch:** `feat/phase-2a-header-behaviours-and-responsive-logo` (to be created)

## Goal in plain English

Take Spec 17 from "rules engine works + 3 real patterns + 3 stubs + plain `core/site-logo`" to "operators can apply transparent / sticky / shrink / hide-on-scroll-down behaviours to any header (dev-shipped OR `sgs_header` CPT post) via a single dropdown, AND can swap logos per device with optional SVG animation."

Two market-leading differentiators SGS will own that no competitor (Kadence, Spectra, GenerateBlocks, Astra, Blocksy) currently has:

1. **WCAG 2.4.11 / CLS-safe sticky implementation** — `ResizeObserver` publishes `--sgs-header-height` → `:root { scroll-padding-top: var(--sgs-header-height) }`. Anchor links land below the sticky header. Zero spacer-div CLS.
2. **H / Square / Mark aspect-ratio logo picker** — semantic variants (horizontal / square / mark-only) chosen per device or container size via `<picture>` element. Nobody else does this.

## Architecture (the right framing)

Spec 17 gave us a 3-layer header architecture. Phase 2A operates on each layer cleanly:

| Layer | What lives here | Phase 2A work |
|-------|----------------|---------------|
| **Layer 1 — Template part** (`parts/header.html`) | The `<header class="wp-block-template-part">` wrapper element | NO CHANGES — stable surface |
| **Layer 2 — Block patterns** (PHP in `/patterns/` + auto-generated from `sgs_header` CPT) | Header markup content (logo + nav + drawer + group containers) | Pattern markup unchanged; we ADD a wrapper class via Layer 3 instead |
| **Layer 3 — Conditional rules engine** (Sgs_Header_Rules + sgs_header CPT meta) | Picks WHICH pattern renders + (NEW) attaches behaviour class to wrapper | New `_sgs_header_behaviour` meta on sgs_header CPT + new attribute on each pattern rule |
| **Layer 4 — Behaviour CSS + JS modules** (NEW) | Cross-cutting behaviour styles + scripts: transparent / sticky / shrink / hide-on-scroll-down | New `plugins/sgs-blocks/assets/css/header-behaviours.css` + `plugins/sgs-blocks/src/header-behaviours/view.js` |
| **Layer 5 — Responsive logo block** (NEW) | A dedicated `sgs/responsive-logo` block with 3 logo slots + animation hook | New block in `plugins/sgs-blocks/src/blocks/responsive-logo/` |

Key design decision: **behaviours are a separate axis from patterns.** A pattern is "what content goes in the header" (centred-with-top-bar vs minimal vs default). A behaviour is "how does the header scroll / appear over hero / shrink" (transparent vs sticky vs hide-on-scroll-down). Operators pick BOTH independently. Same pattern can have any behaviour. Same behaviour applies to any pattern.

This also retires the "stub patterns" anti-pattern (where `framework-header-transparent.php` delegated 100% to default). After Phase 2A there's just one canonical default pattern + operators pick a behaviour. The 3 stub PHP files get either:
- (a) Deleted entirely (the conditional rules engine + behaviour meta replaces them)
- (b) Kept as pre-set combinations for the inserter ("here's our default header with sticky behaviour baked in") — operator-friendly starter packs

Decision goes to operator UX research in Phase 2A Step 6.

## Scope — IN

- F1. Header-height publisher (`ResizeObserver` + CSS custom property + `scroll-padding-top`)
- F2. Behaviour CSS + JS modules (transparent, sticky, hide-on-scroll-down)
- F3. `_sgs_header_behaviour` post meta on `sgs_header` CPT + admin UI in block editor + WP-CLI surface (`wp sgs header_rules add --behaviour=<slug>`)
- F4. Wrapper-class injector — reads behaviour from active rule, sets `.sgs-header--<behaviour>` on `<header>` element
- F5. `sgs/responsive-logo` block — 3 logo slots (horizontal / square / mark) + per-breakpoint visibility + optional SVG animation source
- F6. Update existing dev-shipped patterns (`framework-header-default`, `header-centred`, `header-minimal`, `header-full`) to use `sgs/responsive-logo` instead of `core/site-logo` (operators can still revert to core/site-logo if they prefer)
- F7. Customiser integration — global "default header behaviour" setting (applies when no rule matches a more specific behaviour)
- F8. Migration — back-fill `_sgs_header_behaviour` meta for any existing `sgs_header` CPT posts based on the pattern they reference

## Scope — OUT (defer)

- Shrink-on-scroll behaviour (deferred per research finding: defer until sticky is stable; same modules, easy retrofit later)
- Announcement bar block (separate Phase 2B)
- Mega menu (separate Phase 2C — bigger scope, needs its own design pass)
- Per-row sticky (Blocksy's row-level sticky pattern) — defer
- Hide-on-scroll-down ONLY for tablet/mobile (per-device hide-on-scroll trigger) — defer

## Dependencies + sequence

```
F1 (header-height publisher)
  ↓ unblocks safe sticky
F2 (behaviour CSS+JS) — depends on F1
  ↓
F4 (wrapper-class injector) — depends on F2 (needs class names to match)
  ↓
F3 (CPT meta + admin UI + CLI) — depends on F4 (needs the wrapper-class injector to know what to do with the meta value)
  ↓
F8 (migration) — depends on F3 (needs the meta column to exist)
  ↓
F6 (update dev patterns to use sgs/responsive-logo) — depends on F5

F5 (sgs/responsive-logo block) — INDEPENDENT, can run in parallel with F1–F4
F7 (Customiser global default) — depends on F3 (needs meta key registered)
```

Parallel-dispatch shape:
- **Branch 1 (Subagent A):** F1 + F2 + F4 (header-height + behaviours + wrapper injector — tightly coupled, one subagent)
- **Branch 2 (Subagent B):** F5 (responsive-logo block — file-disjoint)
- **Sequential after both:** F3 + F6 + F7 + F8 (main thread)

## Effort estimate

Calibrated to Bean's "default low" rule.

| FR | Est. wall clock | Confidence |
|----|-----------------|-----------|
| F1 | 15 min | High — known technique |
| F2 | 30 min | High — research gave us implementation patterns |
| F3 | 30 min | Med — touches CPT admin + CLI + meta registration |
| F4 | 20 min | High — single filter on pre_render_block downstream of rule resolution |
| F5 | 90 min | Med — new block, 3 image slots, SVG animation source, tests, viewScript |
| F6 | 30 min | Med — touch 4 patterns + tests |
| F7 | 20 min | High — known Customiser pattern |
| F8 | 15 min | High — small data migration |
| **Total** | **~4 hours** wall clock, ~2 hours if parallel-dispatched |

## QC gates

Per Bean's binding rule (blub.db row 255) — multi-rater `/qc` panel before every commit touching SGS block / plugin logic.

- After Subagent A completes F1 + F2 + F4 → `/qc` multi-rater (Sonnet + Haiku + Gemini Flash + Cerebras) on the diff
- After Subagent B completes F5 → `/qc` multi-rater on the new block
- After main-thread F3/F6/F7/F8 → `/qc-inline` (smaller surface)
- Final integration: `/visual-qa` at 375 / 768 / 1440 viewports on sandybrown after deploy

## Verification (outcome-over-completion)

Before any FR is marked done:
1. Deploy to sandybrown via tar method + OPcache reset
2. Curl the live URL + Playwright screenshot at 3 viewports
3. Confirm the behaviour visibly works (transparent overlay actually shows over hero, sticky actually pins, etc.)
4. Confirm WCAG: focus a link, ensure it's NOT hidden behind sticky header
5. Confirm zero CLS via Lighthouse / web vitals snapshot

## Decisions locked (2026-05-20)

- **D1.** Keep dev-shipped framework-header-transparent.php / -sticky.php / -shrink.php as inserter-friendly starter packs. Each will bake the corresponding wrapper class so operators get pre-set combos. Stub markup is replaced with the canonical default content + the behaviour class.
- **D2.** `sgs/responsive-logo` REPLACES `core/site-logo` in all dev-shipped patterns by default. No data migration (existing `sgs_header` CPT posts on live sites keep `core/site-logo` until operator edits them). Operator UX: if only one logo uploaded, all three slots fall back to it — single-logo workflow unchanged.
- **D3.** Skip viewport conditions in the rules engine. The universal `sgsHideOnMobile/Tablet/Desktop` extension already lets operators show/hide content per breakpoint inside one pattern. Adding viewport routing would require client-side resolution + risk FOUC for negligible additional capability.

## Related research artefacts

- `reports/research-2026-05-20-header-gold-standard.md`
- `reports/research-2026-05-20-responsive-logo.md`
- Spec 17: `.claude/specs/17-SGS-HEADER-FOOTER-ARCHITECTURE.md`
- Spec 18: `.claude/specs/18-SGS-FLOATING-UI.md`
- Spec 19: `.claude/specs/19-SGS-CLI-COMMANDS.md`
