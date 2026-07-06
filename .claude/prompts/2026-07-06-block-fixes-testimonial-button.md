---
doc_type: next-session-prompt
project: small-giants-wp
thread: BLOCK-SIDE FIXES — testimonial-slider layer-model reframe + button full-width audit
generated: 2026-07-06
status: ALTERNATE SESSION PROMPT (distinct from the container L1-L4 cascade deep-dive in next-session-prompt.md — pick THIS one for the two block-side fixes)
primary_goal: "Two focused block-side fixes, root-cause-first. (1) Testimonial-slider/testimonial: remove the two-card-layer flaw — the grid-item wrapper carries the card's visual styling (shadow/bg/radius) so the shadow wraps the whole grid area, not each review. Reframe so visual card styling lives on the INNER review card; the slide wrapper is a grid-item positioning layer (gap/padding only). (2) Button: full-width (widthType='full') setting is not landing — full audit of the button width system (a lot of prior work: Spec 11 architecture, presets, per-device width, colour attrs) and fix."
---

# ALTERNATE NEXT SESSION — block-side fixes: testimonial layer-model + button full-width audit

Invoke /autopilot first. **This is a distinct session from the container L1-L4 cascade deep-dive** (that lives in `next-session-prompt.md`). Pick THIS prompt when the goal is the two block fixes below. Root-cause-first (systematic-debugging) — prove each cause on the live DOM before fixing; LANDED on page 8 + Bean's eye before commit.

**Agent identity.** SGS block developer-diagnostician: root-cause each defect against the live DOM + block source + DB, fix the block (render.php/style.css/edit.js/block.json) as a SYSTEM (shared components, the cascade, the spec), LANDED-verify, /qc before commit. Prove the premise on the real element (STOP-43); the LANDED live computed-style is the arbiter, never emit-green.

**State recap (plain English).** D282 closed the page-8 QC batch (D2 no longer deployed → honest page; parity content 96 / CSS 70-71-71). Two block-side items surfaced that are NOT container-cascade work: (a) the D282 #9 testimonial fix (slide bg → transparent) EXPOSED a layer-model flaw Bean flagged; (b) the button full-width setting isn't landing and the block has had a lot of work (this session ungated its colour attrs + fixed `sgs_colour_value` var() passthrough) so it needs a full audit. Baselines: main; D-ceiling was D282 (verify); 872 tests; cheat-gate 33 baselined 0 NEW.

## Mandatory READING (tick each; read WHOLE docs; verify vs ground truth)
1. [ ] `.claude/specs/11-*` (button architecture — the FULL width/preset/colour model) + `.claude/specs/02-*` (blocks reference: testimonial + testimonial-slider entries).
2. [ ] `.claude/handoff.md` top entry (D282) + `.claude/decisions.md` D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`).
3. [ ] `plugins/sgs-blocks/CLAUDE.md` — Block Customisation Standard + the HC2 "parent owns LAYOUT, child owns TYPOGRAPHY" rule + the shared-component mandate (TypographyControls, DesignTokenPicker, ResponsiveControl).
4. [ ] The live page 8 (creds `.claude/secrets/sandybrown.env`) — inspect the actual testimonial + button DOM before theorising.

## Pre-flight ritual (answer in your first message)
1. Branch + D-ceiling verified? Working tree clean?
2. For each fix: root cause PROVEN on the live element (computed style + the painting selector) BEFORE the fix; LANDED (deploy → re-check live) AFTER?
3. Shared surface? The button is used EVERYWHERE (every block's CTAs) — a button render/style change is high blast radius → design-gate + Bean approval before a structural change (Rule 7). The testimonial-slider `__slide` wrapper is shared across all testimonial variants.
4. Bump the block version on EVERY CSS change or the CDN serves stale (STOP-57). Deploy before measure (STOP-21).

## ⛔ Carry-forward STOP rules (the load-bearing ones for block work)
- **STOP-21 / STOP-4 — WRITTEN ≠ LANDED.** Deploy the genuine build to page 8 + read computed-style; emit/editor-preview is never the gate.
- **STOP-43 — prove the premise on the real element**, not code inference (this session two "obvious" causes were disproven live).
- **STOP-44 — a schema-valid emitted attr can be a RENDER no-op** — verify the class/style PAINTS on the live element.
- **STOP-56 — a D228 hardcoded default can hide behind another attr's override** — when removing/moving a default, check what it was masking.
- **STOP-57 — bump block version on CSS change** (CDN caches per `?ver`).
- **STOP-59 — a block.json-META-only change uses `git commit --no-verify`** (visual-diff gate's own guidance); a CSS/render change needs `reports/visual-diff/<block>-YYYY-MM-DD.md` (PASS + first_paint_capture_passed:true).
- **HC2 (blocks CLAUDE.md) — parent owns LAYOUT, child owns TYPOGRAPHY.** A parent control duplicating a child capability is a dead control by specificity. Relevant to the testimonial two-layer reframe.

---

## Task 1 — Testimonial-slider layer-model reframe (Bean's insight 3)

**The defect (Bean, D282).** The testimonial slider shows shadow (and previously a cream background) around the WHOLE grid item, not around each review. Root: there are TWO card layers — the grid-item wrapper `.sgs-testimonial-slider__slide--card` (carries `box-shadow: shadow-md` + `border-radius` + `padding`, `testimonial-slider/style.css:45-55`) AND the inner review card `.sgs-testimonial` (its own bg/border/radius/padding). The wrapper's shadow wraps the whole grid area.

**Bean's reframe (the target architecture).** The area OUTSIDE the review card should NOT be its own visually-styled layer that each card nests in. Each card IS a grid item. The ONLY things that legitimately style the outside-the-card (grid-item) area are **gap + padding** (positioning). Everything visual — **background, shadow, border, radius** — belongs INSIDE the card: routed by **L3** if it's parent-dictated / uniform across all items, or **L4** per grid item individually.

**What:** remove the visual card styling (shadow/bg/radius) from the `__slide--card` grid-item WRAPPER; the review card's visual styling lives on the inner `.sgs-testimonial`. The slide wrapper becomes a positioning layer (the grid gap + any grid-item padding only). Confirm the inner `.sgs-testimonial` (classic-card variant) carries the intended card look; if the "card" cardStyle was providing the visual via the wrapper, move that intent to the inner card (or make the inner card the card and drop the redundant wrapper styling).

**Root-cause-first (do NOT skip):** on the LIVE page 8, walk from the review text OUTWARD — identify every element with a background/shadow/border and its painting selector. Confirm the two-layer duplication (wrapper card + inner card) before editing. Decide with Bean: is the review's card the inner `.sgs-testimonial` (so the wrapper de-styles), or should the slide wrapper BE the card (so the inner de-styles)? This is a `/brainstorming` design decision — Bean agrees the model before you change CSS.

**Orchestration:** inline (main-session) — it's a shared testimonial-slider style.css change (blast radius across all testimonial variants). `/brainstorming` the layer model → agree → edit `testimonial-slider/style.css` (+ the inner `testimonial` block if the visual moves there) → bump version → build → deploy → LANDED (shadow is around each REVIEW, not the grid area, at 375/768/1440 + Bean's eye) → `reports/visual-diff/testimonial-slider-<date>.md` → commit.
**Acceptance:** the shadow/background/border render around each individual review card, not the whole grid item; the outside-the-card area shows only gap/padding; LANDED + Bean eye.

## Task 2 — Button full-width setting audit + fix

**The defect (Bean).** The button full-width setting isn't working. A LOT of work has been done on the button (Spec 11 architecture, presets, per-device width, the D282 colour-attr ungate + `sgs_colour_value` var() passthrough) — so this needs a FULL audit, not a spot-fix.

**What:** audit the whole button width system + fix the full-width path.
- **Width model:** `widthType` enum (fit / custom / full) + `customWidth`/`customWidthUnit` + per-device `widthTypeTablet/Mobile` + `customWidthTablet/Mobile` (`button/render.php:47-59`; the width `<style>` emit is around render.php:490-540, gated `if ( $has_width_tier || 'custom' === $width_type || 'full' === $width_type )`). Trace why `widthType='full'` does NOT produce `width:100%` on the live `<a>` — is the attr set in the editor? emitted? does the render branch fire? does the emitted rule PAINT (specificity vs `.sgs-button` base `display:inline-flex`)? A full-width inline-flex button needs `width:100%` AND the parent to allow it (a flex/grid parent may constrain it).
- **Editor control:** does edit.js expose the full-width option + does picking it set `widthType='full'`?
- **Full audit scope (a lot of prior work — check for regressions):** the preset system (inheritStyle primary/secondary/outline), the D282 colour-attr ungate (colourText/Background/Border now paint whenever set — confirm no preset regressions), the per-device typography (shared TypographyControls), the border/radius/box-shadow controls, hover states. Look for dead controls (HC2), duplicate settings, and any attr the editor exposes that render.php doesn't paint (STOP-44).

**Root-cause-first:** on the LIVE page (or a test button set to full-width in the editor), read the computed `width` + the painting selector + whether the width `<style>` block emitted. Prove why 'full' doesn't land BEFORE fixing. Use a test page / the editor with the sandybrown creds — set a button to full-width, save, inspect.

**Orchestration:** the button is the highest-blast-radius block (every CTA everywhere). Design-gate any structural change (Rule 7). `/qc-council` (or 2-rater) pre-commit. Inline or ONE solo coding subagent. Bump version → build → deploy → LANDED (a full-width button computes `width:100%` and spans its container) → visual-diff report → commit.
**Acceptance:** `widthType='full'` renders a full-width button on the live DOM (computed `width` = container width) at all tiers; the audit surfaces + fixes any dead/duplicate/unpainted width or related controls; no preset/colour regression from the D282 changes.

## Skills to Invoke
| Skill | When |
|-------|------|
| /autopilot | FIRST |
| /systematic-debugging | root-cause each defect on the live DOM before fixing |
| /brainstorming | the testimonial layer-model reframe (Task 1) is a design decision — agree with Bean |
| /sgs-wp-engine | SGS block work (GROUND-TRUTH line before edits; shared-component mandate) |
| /wp-block-development | render.php / edit.js / block.json changes |
| /qc-council | pre-commit on the button (shared, high blast radius) |
| /gap-analysis | grade the fixes before delivery |
| /sgs-db /wp-blocks | button + testimonial attr/supports ground truth |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## Tool bindings
| Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED computed-style + painting-selector walk on page 8 / editor |
| `python ~/.claude/hooks/wp-blocks.py schema sgs/button` (+ testimonial-slider) | attr/supports ground truth |
| PowerShell `npm run build` → `build-deploy.py --target sandybrown --skip-build --allow-dirty` | deploy (bump block version — STOP-57) |
| editor login (creds `.claude/secrets/sandybrown.env`) | set a button to full-width + inspect |

## Agents to Delegate To
| Agent | When |
|-------|------|
| wp-sgs-developer | the button audit + testimonial reframe (block-side build) |
| design-reviewer | visual QA of both fixes at 375/768/1440 |
| Explore / general-purpose (read-only) | the button full-audit sweep (dead controls / duplicates / unpainted attrs) |

## Methodology guardrails
- Root cause PROVEN on the live element before any fix (STOP-43); LANDED after (STOP-21/4).
- Bump block version on every CSS change (STOP-57); deploy before measure.
- Button = highest blast radius → design-gate structural changes + /qc-council pre-commit.
- Visual change → `reports/visual-diff/<block>-<date>.md` (PASS + first_paint_capture_passed:true); block.json-meta-only → `--no-verify` (STOP-59).
- Tests from cwd `plugins/sgs-blocks/scripts` green (872 baseline); branch main; verify D-ceiling before a new D; commits path-scoped; push after every green fix.