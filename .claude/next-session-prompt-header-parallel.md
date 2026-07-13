---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-13
thread: PARALLEL header-builder track (Track B) — runs ALONGSIDE the sgs/adaptive-nav build (Track A). Disjoint files only.
pairs_with: .claude/next-session-prompt.md (Track A = sgs/adaptive-nav)
---

# NEXT SESSION — HEADER BUILDER, PARALLEL TRACK (Track B)

You are the SGS WordPress block + frontend developer. This runs **in parallel** with the `sgs/adaptive-nav` build (Track A, `.claude/next-session-prompt.md`). P1 (`sgs/site-header` + `sgs/site-header-row`) is SHIPPED + live; the header overflow is fixed. This track builds the remaining header-builder work that is **file-disjoint from Track A**, so the two sessions do not collide. Invoke `/autopilot` first.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. **`.claude/plans/2026-07-13-header-builder-remaining-work.md`** — the full remaining-work roadmap (this track executes §5's parallel-safe items + §6 SGS-first audit).
2. **`.claude/handoff.md`** (D324) — what shipped + the proven WooCommerce Block-Hooks finding.
3. **`.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 (FR-S9-3 footer, FR-S9-8, FR-S9-9, FR-S9-10) + Spec 17 IN FULL** (Bean-locked: read the governing spec end-to-end each session).
4. **`.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` §6.1** (box-object / no-inline) — for the footer + divider work.
5. **The DRAFT (design ground truth):** `sites/mamas-munches/mockups/Claude App Design - Responsive Homepage and Product Page/mamas-munches-mockup.html` — read the `.mm-footer` (and `.mm-header`) sections for the exact per-breakpoint design.

## ⛔ FILE-OWNERSHIP BOUNDARY (prevents merge collisions with Track A)
**Track A (adaptive-nav) OWNS — do NOT edit in this track:**
- `theme/sgs-theme/parts/header.html`
- `theme/sgs-theme/patterns/framework-header-default.php`
- `plugins/sgs-blocks/src/blocks/site-header/**` (esp. `style.css` — Track A removes the nav-visibility hack)
- anything replacing `core/navigation`

**Track B (this) OWNS:** `src/blocks/site-footer/**` (NEW), `theme/sgs-theme/parts/footer.html`, `patterns/framework-footer-default.php`, `src/blocks/cart/**`, `src/blocks/responsive-logo/**`, new design-gate docs. `sgs/site-header-row/**` is SHARED — coordinate (Track B extends it for footer columns; keep edits additive + rebase before commit).

**Merge discipline:** both tracks land on `main`. `git pull --rebase` before each commit; path-scoped commits only (`git commit -F <msg> -- <paths>`, never `git add -A`). If a shared-file (`site-header-row`) conflict appears, stop and reconcile — do not force.

## Tasks (all parallel-safe; do the footer first — highest value)

### Task 1 — P3 `sgs/site-footer` (FR-S9-3) — the main parallel build
**What:** the footer sibling of `sgs/site-header` — section KIND, rows + a columns row (up to 6 columns collapsing to 1 below the mobile tier) + a bottom bar. **Reuses `sgs/site-header-row`** for its rows.
**Why:** completes the header/footer pair; reuses the built row block; independent of the nav.
**Model:** Opus (architecture) + Sonnet scaffold via `/delegate`.
**Brief:** model on `sgs/site-header` (section KIND, delegates to `SGS_Container_Wrapper`, empty-row zero-output). Add a columns capability to the row (or a small `sgs/site-footer-column` unit) for the up-to-6-columns→1 collapse. Bottom bar binds trademark/company/terms/attribution from the Site Info store (FR-S9-10, `sgs/site-info` bindings — already built) — NO hardcoded client copyright. Wire into `parts/footer.html` + `patterns/framework-footer-default.php`; add the `sgs_footer` CPT `template => [['sgs/site-footer']]` (currently absent, same as the header was). DB reseed via `/sgs-update` + verify rows.
**Acceptance:** live-verified on sandybrown — 6-col desktop → 1-col mobile at 768; Site Info round-trip (set once, renders in footer); FR-S4-5 personal-data linter clean; no inline `style=""`; visual-diff report at `reports/visual-diff/site-footer-<date>.md` (STOP-67). Match the draft `.mm-footer`.
**Depends on:** none (row block already built). **Parallel with:** Track A.

### Task 2 — Site-Editor "dedicated header section" design-gate (FR-S9-6/8)
**What:** DESIGN (not build) the guided header-building UX in the Site Editor per Bean's vision — header-type presets in the Replace picker, an overflow→drawer drop-zone, a device switcher, sticky/transparent presets. Produce a design-gate doc for Bean sign-off.
**Why:** the "dedicated section" experience Bean asked for; pure design, zero code conflict with Track A.
**Model:** Opus (design) + `/brainstorming` + `/research` (competitor builders — Astra/Kadence/Blocksy/Spectra builder UX, block-native equivalents).
**Acceptance:** a design-gate doc at `.claude/plans/<date>-header-builder-editor-ux-design-gate.md` with Bean's open decisions listed. No code.
**Depends on:** none. **Parallel with:** everything.

### Task 3 — `sgs/cart` "hide when empty" toggle (Bean)
**What:** extend `sgs/cart` so it can be set to NOT render/load unless the cart has items — a toggleable per-instance setting (it already has `showZero` for the badge; add a full hide-when-empty option). Also confirm whether the framework-default header should ship cart-free for non-ecommerce clients.
**Why:** Bean's explicit ask; `sgs/cart`-only files (disjoint from Track A).
**Model:** Sonnet.
**Acceptance:** live-verified — cart hidden when empty with the toggle on, visible with items; `/qc` on the block; dead-control gate green.
**Depends on:** none. **Parallel with:** everything.

### Task 4 — `sgs/responsive-logo` per-breakpoint images (if assets available)
**What:** wire the desktop/tablet/mobile logo images for Mama's into `sgs/responsive-logo` (currently falls back to the site `custom_logo`). Blocked only if the per-breakpoint assets don't exist yet — if so, log it and skip.
**Model:** Sonnet. **Depends on:** logo assets. **Parallel with:** everything.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — footer architecture + editor-UX design |
| `/gap-analysis` | ALWAYS — grade the footer vs WCAG + FR-S9-3 |
| `/lifecycle` | ALWAYS — before any skill/agent change |
| `/research` | ALWAYS — competitor footer/builder patterns |
| `/strategic-plan` | ALWAYS — order the footer build |
| `/sgs-wp-engine` + `/sgs-update` | SGS block dev + DB register |
| `/wp-hooks` | validate any hook before wiring |
| `/qc` · `/visual-qa` · `/a11y-audit` | live verify + axe |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools MCP | live footer 6-col→1-col + cart-empty verification |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before live measure (user `u945238940`) + `wp litespeed-purge all` + OPcache |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | scaffold the footer block from `sgs/site-header`; deploy/verify mechanics |
| wp-sgs-developer | heavy footer build (if registered) |
| design-reviewer | footer + editor-UX visual/UX sign-off |

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-FILE-OWNERSHIP-BOUNDARY (D324, parallel-track)** — Track B must NOT edit the header.html / framework-header-default.php / `sgs/site-header` files Track A owns. `git pull --rebase` before every commit. Reconcile `sgs/site-header-row` (shared) additively.
- **STOP-READ-TRUTH-NOT-ASSUME (D324, Bean)** — read the theme files + plugin/WC source + the SPEC for ground truth BEFORE theorising. Prove the cause in the source.
- **STOP-DRAFT-IS-DESIGN-GROUND-TRUTH (D324, Bean)** — the mamas-munches mockup specifies the footer + header design at EVERY breakpoint. Match it; don't guess.
- **STOP-HEADER-IS-SITE-EDITOR-BLOCK-BASED (D323/D324)** — block-based in the Site Editor, NOT a Customiser builder. Specialised container blocks inside the template part are permitted; a monolithic footer block is forbidden.
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322)** — a `style.css`/theme-CSS-only change needs a `theme/sgs-theme/style.css` Version bump; a block CSS change bumps that block.json version.
- **STOP-VERIFY-CACHE-LAYER (D312/D322)** — LiteSpeed v7.8.1 active; `wp litespeed-purge all` + OPcache + CDN before ANY live measure.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + LiteSpeed + CDN + live computed-value.
- **STOP-static-vs-live (D304/D305)** — use the LIVE DOM for "does it render/apply?", never static parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report (`verdict: PASS` + `first_paint_capture_passed: true`).
- **STOP-16** — subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself. Node/npm via PowerShell.
- **Composite-mirror (R-31-9 / D294)** — delegate outer render to `SGS_Container_Wrapper`; no divergent path. No inline `style=""` (Spec 32). No block version bumps as deprecations (D270/D293). No hardcoded client values — Site Info + tokens only (R-31-1 / FR-S4-5).
- **Path-scoped commits** on `main`, no co-author, verify branch + D-ceiling before commit.

## Methodology guardrails
- **Read the truth first** (theme files + WC source + spec) → diagnose → fix. **Deploy before measure** (STOP-21). **Root cause before instance fix.** **Outcome vs completion** — a footer that's built but not live-verified against the draft is NOT done. **/qc + /visual-qa + /a11y-audit BEFORE declaring done.** The DRAFT is the design ground truth at every breakpoint. **Rebase before every commit** (parallel track).
