---
doc_type: design-gate
project: small-giants-wp
title: Header + Footer + Navigation SYSTEM (sgs/site-header, sgs/site-footer, adaptive nav, off-canvas drawer)
date: 2026-07-13
status: APPROVED (Bean sign-off 2026-07-13, all recommended defaults) — build in progress: P0 (drawer fix) SHIPPED + live-verified
supersedes: .claude/plans/2026-07-13-header-footer-container-design-gate.md (container-only; folded in here)
governing_specs:
  - specs/17-HEADER-FOOTER-ARCHITECTURE.md (template-part + CPT + rules architecture)
  - specs/31-UNIVERSAL-CLONING-PIPELINE.md §13.6 (composite-mirror), R-31-1 (DB-first)
  - specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no-inline / token contract)
enforced_constraint_being_evolved: .claude/hooks/no-header-footer-block.py + memory header-footer-are-template-parts-not-blocks
research_basis: 5 documented systems (Bricks, Elementor, Blocksy, Material 3, GOV.UK) + Indus Foods live reference + research-council (per-breakpoint model) + SGS nav code analysis + live drawer-bug root-cause
---

# Design-gate — Header + Footer + Navigation system

## 1. Plain-English summary

We are building the SGS **header, footer, and navigation** as a proper, best-in-class **system** — not a monolithic "header block" (still forbidden), but a set of **specialised container blocks + an adaptive nav + an accessible drawer**, all living inside the existing template-part architecture. It fixes a live WCAG overflow bug and a live unclickable-drawer bug, and makes header/footer/nav fully responsive and client-editable per device.

Grounded in a holistic study of how the leading systems actually work (read from their real docs, per Bean's steer): **Bricks, Elementor, Blocksy** (WP builders), **Material 3 + GOV.UK** (design-system rigour), plus the **Indus Foods** live reference and a **research-council** on the responsive model.

## 2. Rule evolution (conscious, Bean-directed)

`no-header-footer-block.py` + the `header-footer-are-template-parts-not-blocks` memory forbid header/footer as blocks. **Bean's clarification:** these are **specialised CONTAINER blocks** (equivalent to `sgs/card-grid`/`sgs/feature-grid`), used *inside* the template parts — NOT a monolithic header block that replaces the FSE/CPT/rules system. The rule evolves to:

> Header/footer remain WordPress template parts (Spec 17: parts + patterns + `sgs_header`/`sgs_footer` CPT + rules engine + Site Info bindings). A specialised header/footer/nav **container** block used *inside* the template part is PERMITTED (like card-grid). A block that subsumes the template-part/Site-Info/rules system is still FORBIDDEN.

**Actions (part of build):** update the `header-footer-are-template-parts-not-blocks` memory + Spec 17 + CLAUDE.md to record the evolved rule. **NOTE (fact-checked 2026-07-13):** `no-header-footer-block.py` needs **no code change** — its regex matches only the exact segments `header`/`footer`/`nav`, so `site-header`/`site-footer`/`adaptive-nav`/`mobile-nav` are already permitted; the hook still blocks the real anti-pattern (bare `header`/`footer`/`nav` dirs). This is a conscious owner decision recorded in the human-readable rule, not a regex dodge.

## 3. The blocks (specialised containers, modelled on feature-grid)

| Block | Role | KIND | Renders via |
|---|---|---|---|
| `sgs/site-header` | Header shell: 3 optional rows of typed elements | section | `SGS_Container_Wrapper` |
| `sgs/site-footer` | Footer shell: rows + up-to-N columns | section | `SGS_Container_Wrapper` |
| `sgs/adaptive-nav` | ONE menu that collapses nav-bar → burger at a set tier; opens the drawer | layout | `SGS_Container_Wrapper` + nav logic |
| (reuse) `sgs/mobile-nav` (off-canvas drawer) | The accessible mobile panel — **fixed** (bug) + hardened | — | existing, reworked |

Each: 5-file pattern (`block.json`+`render.php`+`edit.js`+`save.js`+`index.js`), auto-registered by the `build/blocks` scandir loop, delegates outer rendering to `SGS_Container_Wrapper::render($attrs,$block,$inner,KIND,opts)` (verbatim `$attrs` — the uid hash depends on it). No new registration wiring.

## 4. Structure — 3 fixed named rows (Blocksy/Kadence-validated)

**Header** = 3 optional named rows, each an independently-configurable cluster; empty row = **zero output** (no wrapper, no padding — this is the fix for the empty-slot padding-bleed the council found):
- **Top row** — thin utility strip: contact (phone/email), search, social, ecom icons.
- **Middle row** (primary) — logo + nav + primary CTA/cart.
- **Bottom row** — message / selling point / overflow / business info.

**Footer** = named rows; the columns row splits into up to N columns (Blocksy: 6 max), collapsing to 1 below the mobile tier:
- **Top row** — CTA / newsletter.
- **Middle row** — columns (logo, about, links, business info, map link, social).
- **Bottom bar** — trademark, company name, terms/policy, attribution link.

**Typed element palette** (not freeform — better for non-coder clients, per Blocksy): logo, adaptive-nav, search, cart, account, button/CTA, contact, social, HTML, widget-area. Elements come from Site Info bindings where applicable (no hardcoded client data — Spec 17 §S4; GOV.UK's "brand chrome vs client nav" split).

## 4b. Global defaults + Site Info access (Bean requirement 2026-07-13)

Every element/setting in **both** `sgs/site-header` and `sgs/site-footer` (and `sgs/adaptive-nav`) MUST have access to, and default from, two shared sources — so the same data is consistent across header AND footer with no duplication:

1. **Global style defaults** — the site's `theme.json` / `wp_global_styles` tokens (colours, typography, spacing) and, for cloned sites, the Spec 33 draft-extracted `theme-snapshot.json`. Header/footer elements inherit these as their defaults (a client never re-enters brand colours/fonts per block); per-instance overrides remain available (§8). No hardcoded values (R-31-1).
2. **SGS Site Info store** (Spec 17 §S4 — `sgs_site_info` `wp_options` via the `sgs/site-info` block-bindings source) — logo, phone, email, address, opening hours, socials, copyright, attribution link. Both header and footer bind to the **same** store, so updating Site Info once updates every header/footer instance everywhere. Empty bindings render friendly hints with deep-links (Spec 17 M10).

**Acceptance:** a contact/logo/social value set once in Site Info renders identically in header and footer without re-entry; brand colours/fonts come from global styles, not per-block literals; verified on ≥2 clients. This is the GOV.UK "brand-chrome data is centralised" principle applied to SGS.

## 5. Navigation — combined adaptive nav (Bean's idea, validated by Bricks+Elementor)

- **ONE menu source** that renders a desktop nav bar and collapses to a burger at a breakpoint set across **4 tiers: Desktop / Tablet / Mobile / custom px** (Elementor + Bricks both do custom px; the tier is a per-nav setting).
- **Default = one-tree-restyled**; **escape hatch = independent mobile tree** via the off-canvas drawer (Bricks' explicit named choice). Document the **dropdown `position:absolute`→`static` gotcha** inside the drawer (Bricks dependency finding).
- **Mega-menu:** per-item nestable content (columns, a Content-Block for rich content), full-width or element-targeted. On mobile → **drill-down multilevel + auto back-link** (Bricks — scales to depth; better than a flat accordion), with **AJAX lazy-load** for heavy content (Blocksy).
- **Desktop overflow safety:** items that don't fit auto-collapse into a "more" menu (Blocksy) — the intrinsic never-overflow guarantee.

## 6. The off-canvas drawer — fix the live bug + make it the a11y benchmark

**Bug (root-caused + re-verified live):** `view.js` sets `inert` on `.wp-site-blocks` when the drawer opens, but the drawer (`#sgs-mobile-nav`) is a **descendant** of `.wp-site-blocks` → it freezes itself. The Popover top-layer paints it (looks open) but `inert` follows the DOM tree. A/B proven: remove `inert` → links clickable.

**Fix:** move the drawer to be a **direct child of `<body>`** (sibling of `.wp-site-blocks`) before `showPopover()`, OR `inert` only the *other* children of `.wp-site-blocks`. Then implement the full a11y contract below.

**A11y contract (from GOV.UK — the only rigorous public spec of the 5; commercial builders under-document this = our differentiator):**
- Progressive enhancement: nav is plain HTML; the toggle + `aria-controls`/`aria-expanded` only activate once JS confirms.
- Real **focus trap** while open, **ESC-to-close**, **backdrop click-to-dismiss**, **body-scroll-lock**, background made inert/`aria-hidden` **without** trapping the drawer.
- Redundant state signalling: class + `aria-current="true"` + a no-CSS fallback.
- Configurable screen-reader labels (`menuButtonLabel`/`navigationLabel`), not hardcoded English.
- Keyboard contract published (Tab / Space-Enter / ESC; focus lands on the first interactive element — Material's rule). 44px touch targets.

## 7. Per-device content adaptation (Indus ground-truth + Blocksy)

No system has a magic "swap content per device" primitive — all use **place element + toggle per device**. So:
- **Every element:** per-tier **visibility** toggle (show desktop / hide mobile, etc.).
- **Nav/CTA/contact elements:** a `showLabel` / `iconOnly` boolean (Blocksy's Trigger pattern) — e.g. email text → email icon with `mailto:`.
- **Move-to-drawer:** the drawer is a separate drop-zone; items placed there render only in the drawer.
- **Indus real pattern (reference):** at ≤1024 both header rows merge to a slim bar (logo + one "Call" **button** — text→button, not icon); email/social **drop from the header into the drawer**; footer columns 3→1 at 768. This is the template: one clean tier flips header+footer to mobile; secondary items move to the drawer; a primary contact becomes a button.

## 8. Per-breakpoint responsive override model (research-council decided, Bean-adjusted)

- **Data model:** each responsive property = `{desktop:<val>, tablet:<val|null>, mobile:<val|null>}`; `null` = inherit from the tier above; `desktop` always concrete. **Only on the new blocks** (no migration of existing blocks — avoids Gutenberg invalid-content errors + honours the no-deprecations rule).
- **Wider surface (Bean's choice):** EVERY property overridable per breakpoint per row — with the intrinsic layout (Cluster + `clamp()`) as the default so clients never *have* to touch it.
- **Cascade:** mobile-first-up, fixed direction (not reassignable — Bricks shipped bugs from making it configurable). Emit a tier's rule only where it diverges. **Per-side inheritance** for box props (`mobile.top ?? tablet.top ?? desktop.top`). **Canonicalise attribute key order before the `uid` md5** (else CSS churn) + a golden "re-save = same uid" test.
- **Breakpoints:** 768/1024 default + a **custom-px 4th tier**; a single shared source (R-31-1 — like GOV.UK's shared breakpoint map), never a per-block hardcode.
- **Container queries + media queries (Bean's choice):** `container-type:inline-size` on the block's *legitimate* container wrapper (no D293 violation — it's a container, not a bare element), so the block also adapts to its own width when reused; media-query fallback alongside.
- **Editor UX:** device switcher (proper tab semantics, 44px, keyboard) + inherited-value shown greyed **with an icon + `aria-label`** (not colour-only — WCAG 1.4.1) + a **keyboard-reachable reset-to-inherited** button (not right-click-only). SGS-owned components (don't depend on WP's `__experimental` one). Since intrinsic defaults cover most cases, the per-tier UI is only reached when a client wants it.

## 9. Never-overflow layout (the original emergency, solved intrinsically)

Base layout = **Cluster** (`display:flex; flex-wrap:wrap; gap` + `min-width:0` on children + `flex-shrink:0` on the logo) + **fluid `clamp()`** spacing + the container-query tiers. This makes the header/footer **never overflow at any width down to 320px** with no per-element hacks — the account/cart overflow disappears by construction. `interpolate-size:allow-keywords` (JS-free drawer height animation) + `@property` (smooth `--sgs-header-height`) as free enhancements.

## 10. Sticky / transparent / scroll

- Per-**row-combination** sticky (Blocksy: All / Main / Top+Main / …), via the existing SGS body-class behaviour layer (`class-sgs-header-behaviours.php`) + the `--sgs-header-height` ResizeObserver + scroll-padding-top anchor fix (WCAG 2.4.11) — all **preserved**.
- **Transparent-at-rest → solid-on-scroll** as a **no-code toggle** (beat Elementor, which requires hand-written CSS). Material's 3 scroll behaviours (pinned / enter-always / exit-until-collapsed) as the options.
- State→token, never hardcoded inline (Material's discipline + Spec 32).

## 11. Integration + plumbing

- **Spec 17:** the `framework-header-default` / footer patterns + the `sgs_header`/`sgs_footer` CPT template. **Fact-checked 2026-07-13:** `class-sgs-block-cpts.php` currently sets **no `template` key** (FR-S3-4's `[['core/group']]` was never implemented — pre-existing drift), so this is an **ADD** (seed `[['sgs/site-header']]` / `[['sgs/site-footer']]`), not a swap. **Done now** (Bean). `parts/header.html` + `patterns/framework-header-default.php` update together (byte-identical duplicates).
- **DB reseed (`/sgs-update`):** `blocks` + `block_supports` + `block_attributes` auto; `block_composition.wraps_block='sgs/container'` + `container_kind` via `sync-container-wrapping-blocks.py`; `composition_role` via `seed-composition-roles.py`; `variant_slots` + `blocks.variant_attr` if the blocks declare layout/nav variants. Verify every new row.
- **Cloning pipeline Part 2** (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER`): the walker maps a draft's header/footer rows onto the named slots by BEM role (Spec 31 R-31-2/R-31-8), fewer rows → empty slots logged (R-31-4, no silent skip), more → gap-candidate not truncation.
- **Doc updates:** Spec 17 (new FRs), Spec 32 (nav/drawer no-inline), CLAUDE.md, decisions.md, the hook + memory (rule evolution), the responsive-override model doc.

## 12. S-TIER QC + GAP REGIME (no phase closes until all pass, live, on the real page)

Deploy → OPcache + `wp litespeed-purge all` + Hostinger CDN clear + version bump BEFORE measuring (STOP-21 / STOP-CSS-VER-CACHE-BUST).
- **A. Reflow:** live Playwright 320/360/375/414/768/1024/1280/1440 — `scrollWidth ≤ innerWidth`, no element past the edge, cart+burger ≥44px. Graceful 300/280.
- **B. Drawer:** open at 375 — every link/button **reachable** (`elementFromPoint` returns the link, not BODY — the exact test that caught the bug); focus trap works; ESC closes; background inert but drawer live; mega-menu drill-down + back works.
- **C. WCAG 2.2 AA:** axe-core; keyboard-only full traversal (nav → drawer → mega-menu → close); `aria-current`/`aria-expanded` correct; 3:1 non-text contrast; published keyboard contract honoured; screen-reader labels present.
- **D. No-inline:** wrapper carries no inline `style=""`; values in the scoped `<style id="uid">`; computed values match the defaults per tier.
- **E. Per-device:** each breakpoint's overrides apply; inherited-vs-overridden indicators correct; reset resumes inheritance; uid stable on re-save.
- **F. Universality (R-31-9):** verified on **mamas-munches AND indus-foods** (+ the Indus per-breakpoint pattern reproduced); no hardcoded client value (grep clean).
- **G. Behaviour-layer non-regression:** sticky/transparent/scroll + `--sgs-header-height` + anchor-offset intact; dark mode ok.
- **H. Editor/operator:** blocks show inspector controls; no "Invalid block"; Site Editor Replace still lists patterns; a **3-5 person usability sanity-check** on the per-device indicator UI (council's ask).
- **Gate tooling:** `/visual-qa` + `/qc` + `/a11y-audit` + `/gap-analysis` (grade vs WCAG + this spec) + a pre-build `/adversarial-council`. Visual-diff report at `reports/visual-diff/` per changed block (STOP-67).

## 13. Phasing (post sign-off — NOT started)

1. **P0 — drawer bug fix** (smallest, highest-value: the unclickable drawer) + the drawer a11y contract. Ships the fix + the a11y benchmark.
2. **P1 — `sgs/site-header`** (3 rows, typed palette, Cluster layout, per-breakpoint override, never-overflow) → swap pattern + CPT → live QC 320→1440. Fixes the WCAG overflow.
3. **P2 — `sgs/adaptive-nav`** (one-tree collapse, 4 tiers, mega-menu drill-down) integrated with the drawer.
4. **P3 — `sgs/site-footer`** (rows + columns).
5. **P4 — per-device content adaptation** polish (iconOnly/showLabel, move-to-drawer) + transparent-on-scroll no-code toggle.
6. **P5 — pipeline Part 2** (draft header/footer → the new blocks).
Each phase: DB reseed + doc updates + the §12 QC gate.

## 14. Guardrails
Composite-mirror (no divergent path). No hardcoded client values (Site Info + tokens). No block version bumps / deprecations pre-production (D293 — re-clone, not deprecate). Universal, no carve-outs (R-31-9). STOP-21 / CSS-VER / CDN / LiteSpeed on every live check. Path-scoped commits, branch `main`, verify D-ceiling, no co-author.

## 15. OPEN DECISIONS for Bean (sign-off resolves)
1. **Block naming** — `sgs/site-header` / `sgs/site-footer` / `sgs/adaptive-nav`? (vs `sgs/header-container` etc.)
2. **Rewrite the drawer vs rework `sgs/mobile-nav`** — the drawer block exists + is capable (7 zones); rework it (recommended) vs fold into a new nav-drawer? 
3. **One-tree default with off-canvas escape hatch** (recommended) vs always-separate mobile tree (SGS's current model)?
4. **Do all of P0-P5**, or ship P0 (drawer fix) + P1 (header, fixes WCAG) first and gate the rest?
5. **Footer columns** — up to 6 (Blocksy) or a fixed 4?

## 16. This session's end-state
This document, for Bean's design-gate sign-off. Open decisions §15 resolved by Bean. No code, no deploy. On approval → fold FRs into Spec 17, evolve the hook/memory, then execute P0.
