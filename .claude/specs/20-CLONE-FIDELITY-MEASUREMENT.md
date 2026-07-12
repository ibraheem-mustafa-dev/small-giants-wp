---
doc_type: spec
spec_id: 20
spec_version: 1.1.0
title: Clone Fidelity Measurement (computed-parity)
project: small-giants-wp
status: shipped
authors:
  - Claude Code (with Bean / Small Giants Studio)
session_date: 2026-07-03
last_verified: 2026-07-12
status_history:
  - 2026-07-03 — v1.0.0 SHIPPED (D259). Replaces the retired Spec 20 (log surfacing) + Spec 21 (artefact inventory); both archived to memory/specs-archive/.
  - 2026-07-12 — v1.1.0 (D314). Bean-directed scope broadening: the tool must match tags + classes + elements + content + CSS, universally, with pinpoint accuracy Bean can trust (no page-8 over-fit). Adds FR-20-9 (tag + element-structure as scored dimensions), FR-20-10 (class names captured as INFORMATIONAL context only, never scored — the Rule-1 CONVERT-don't-mirror decision), FR-20-11 (force-load lazy/below-fold content before measuring — a proven Task-1 D314 false-negative guard), and extends FR-20-4 (unmatched surfacing) to all dimensions. Validation basis is the independent hand-built ledger reports/visual-diff/page8-dom-ledger-2026-07-12.md, NOT the tool's own self-report.
references:
  - 31-UNIVERSAL-CLONING-PIPELINE.md (the pipeline this measures; §7b closing gate)
  - ../cloning-pipeline-stages.md (Stage 11.6)
  - ../cloning-pipeline-flow.md (Stage 11.6 row)
  - ../../CLAUDE.md (root-cause methodology rule 4a / STOP-42)
  - ../../plugins/sgs-blocks/scripts/parity/computed-parity.js (the tool)
  - ../../plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py (Stage 11.6 wiring)
absorbs:
  - 20-STRUCTURED-PIPELINE-LOG-SURFACING.md (SUPERSEDED — input-side log surfacing; the logs it surfaces are debug-only, not the fidelity signal, per FR-20-7)
  - 21-PIPELINE-STATE-ARTEFACTS.md (SUPERSEDED — the artefact inventory + the pixel-diff/leftover-buckets diagnostic sequence are demoted to debug-only, per FR-20-7)
absorbed_by: none
lock_reason: none
---

# Spec 20 — Clone Fidelity Measurement (computed-parity)

> **Supersession note (2026-07-03, D259).** This spec REPLACES the old Spec 20 (Structured
> pipeline log surfacing) and Spec 21 (Pipeline-state artefact inventory + the "read
> trace.jsonl / leftover-buckets.json / stage-11 pixel-diff to diagnose" sequence). Both
> represented the **input-side, unreliable** approach to judging clone fidelity. They are
> archived at `.claude/memory/specs-archive/`. The pipeline-state artefacts still exist and
> are useful for **debugging the converter's intent**, but they are NOT the fidelity signal
> (FR-20-7). Revision review triggers: a new rendering channel the tool cannot read (e.g.
> canvas/shadow-DOM content), or a change to the SGS device-tier model that alters matching.

## Problem

The cloning pipeline (Spec 31) converts a draft mockup into native SGS blocks. Judging *how
faithfully* a clone reproduces its draft was **not dependable**, and Bean could not trust the
scores. Every prior method had a structural blind spot, proven on the Mama's Munches clone
2026-07-03:

1. **Pixel-diff** (old Stage 11) — an EMPTY section scores a false WIN (matches the background);
   a REFLOWED-to-correct section scores a false LOSS. Measures pixels, not per-property intent.
2. **Class-keyed parity** (`mockup-parity-validator.js` / `clone-parity.js`) — keys elements by
   BEM class, so it compares the draft's raw `<section>` against the clone's block **wrapper**
   (which adds its own flex/padding/gap) → drowns real diffs in wrapper-vs-raw false positives.
3. **Source-declaration-diff** — comparing the draft's authored CSS rules to the clone's `<style>`
   blocks is **blind to INHERITED values**: it missed a brand-quote `16px → 18px` base-font drop
   because that `<p>` has no explicit `font-size` (it inherits the base; the clone's theme base
   lives in a global stylesheet not in any block-scoped source).
4. **Input-side logs** (old Spec 20 + 21) — `attribute_gap_candidates` (a **cumulative** ledger,
   ~2,380 rows across all runs) and `leftover-buckets.json` measure what the **converter could
   not route** (its INTENT), NOT the rendered outcome. A value can be "emitted" per the logs yet
   render wrong (inherited base font, line-height, a variant default overriding it). Their counts
   are not a per-clone rendered-fidelity signal.

The two swings this caused (over-claiming "systemic 16→18 everywhere", then under-claiming
"typography 99% faithful") are the canonical failure this spec exists to prevent.

## Solution overview

**Compare the EFFECTIVE (computed) value on the actual rendered element, matched by its CONTENT.**
Render BOTH the source draft and the live clone in the same headless browser at each device tier;
read `getComputedStyle` on every rendered element; key each by its normalised text content (an
element's own text, or a container's `innerText`, or an image's `alt`); compare. This catches
inherited AND explicit values, and content-matching (not class-matching) compares the same painted
node — killing the wrapper-vs-raw false positives.

Implemented as `plugins/sgs-blocks/scripts/parity/computed-parity.js` (Node/Playwright), run
automatically as pipeline **Stage 11.6** (`sgs-clone-orchestrator.py`, post-deploy). This is the
concrete realisation of the CLAUDE.md root-cause methodology **rule 4a** (a project extension of
the global `measurement-vs-eye` rule) and **STOP-42**.

**v1.1.0 dimension set (Bean-directed, D314).** On top of the content-matched computed-CSS core, the
tool scores **tag + element-structure + content + computed-CSS** per matched pair (FR-20-9), and
captures **class names as informational context only** (FR-20-10 — never scored, because Rule 1 means
the clone deliberately uses different class names; computed CSS is the proof the styling transferred).
It force-loads lazy/below-fold content before measuring (FR-20-11). Each dimension is reported and
counted SEPARATELY so a divergence in one (a `button→span` tag swap) never dilutes or is diluted by
another (identical CSS). The number still never closes alone — it PAIRS with Bean's eye + the
independent per-section ledger (R-31-13 / §7b); trustworthiness = the tool's verdict AGREEING with an
independent hand-built ledger, never its own self-report.

**Out of scope (the NOT list):**
- NOT a replacement for Bean's co-authoritative visual sign-off (R-31-13) — the number pairs with
  the eye; neither closes alone.
- NOT a build gate — it is **soft-fail** observability, never blocks the pipeline.
- NOT a converter-internal check — it measures the RENDERED clone vs the RENDERED draft, not the
  converter's intermediate artefacts (that is the debug role the old Spec 21 artefacts still play).
- Does NOT compare exact rendered `width`/`height` px (container-dependent), or SVG internals
  (`fill`/`stroke`) — documented limits (FR-20-6).

## Functional requirements

### FR-20-1 — Effective-value, content-matched comparison (the method)
The tool MUST compare the COMPUTED value (`getComputedStyle`) of each rendered element, and MUST
match a draft element to a clone element by **normalised text content** (element own-text for text
leaves; `innerText` for containers, outermost per anchor; `alt` for images), NEVER by CSS class and
NEVER by diffing authored source declarations. Chrome (header/footer/nav/template-part) is excluded.
**Done when:** running the tool on a draft whose clone renders an inherited-base-font difference
(e.g. a paragraph with no explicit `font-size`, draft base 16px vs clone 18px) reports that element
as a `font-size 16px→18px` mismatch (the case declaration-diff and class-keying both miss).

### FR-20-2 — Universal, draft-agnostic property capture
The tool MUST capture EVERY computed CSS property (not a hand-picked allowlist), minus a **documented
blocklist**. The blocklist MUST be verified to exclude nothing the converter can transfer — i.e. no
property in `property_suffixes` is blocklisted except rendered geometry (`width`/`height`), which is
a documented limit (FR-20-6). The blocklist may only contain: rendered geometry (container-dependent);
WP-block-model artefacts (`position`/`inset`/`z-index`/`text-wrap` — WordPress wrapper defaults, not
fidelity); colour-mirror props (`outline-color`/border-colours/`text-decoration-color` — all inherit
`color`); logical-property duplicates (`*-block-*`/`*-inline-*`/`inset-*`/`*-start-*`/`*-end-*` mirror
physical longhands); and interaction/animation/vendor props.
**Done when:** a draft using a property absent from the tool's original test draft (e.g. `object-fit`,
`order`, `aspect-ratio`, `opacity`, `letter-spacing`) has that property compared without a code change;
AND every `property_suffixes.css_property` except `width`/`height` passes the "not in the blocklist"
check.

### FR-20-3 — Three-tier coverage + meaningful-only scoring
The tool MUST report three tiers: (1) CONTENT presence — every draft text run + image `alt` + link
`href` checked for presence in the clone; (2) TYPOGRAPHY + colour on text elements; (3) BOX/LAYOUT on
structural elements + images. A property MUST count toward the score only when it is **meaningful** —
it DIFFERS between draft and clone, OR is non-default on the draft (vs a bare same-tag reference
element) — so boring `draft==clone==initial` defaults do not inflate the score, while a differing
DEFAULT (base font 16 vs 18) is still counted. `grid-template-columns` MUST compare TRACK COUNT (not
container-dependent px); `url()`/gradient MUST compare PRESENCE (draft local url ≠ clone WP url).
**Done when:** the JSON report contains, per viewport, `content.pct`, `css.pct`, `css.meaningful_props`,
`css.match`, `css.mismatches[]`, and `css.unmatched_elements[]`, plus a top-level `overall_css_pct`.

**FR-20-3a — the number must track VISIBLE fidelity, not computed-representation drift (added v1.1.0,
D314; the STOP-48/49 over-count is broader than font-family).** On page 8 the v1.0.0 tool reported
76% CSS while the VISIBLE fidelity was ~94–95% (Bean's eye + the independent D314 ledger). The gap
was NOT one bug — it was a whole class of over-counts the "meaningful" filter still let through:
- **font-family fallback-stack** (`Inter, sans-serif` vs `Inter, system-ui, …` — identical PRIMARY
  font; 37% of all mismatches) → compare the **primary family only**.
- **clone-only / UA-reset props** (`interactivity`, `appearance`) → blocklist.
- **computed-representation twins that render identically** — `line-height` px representation on a
  single-line label (`19px→14px`, the single biggest residual bucket), spacing **absorbed by a
  flex/grid `gap`** (`margin-bottom 6px→0px` where the parent gap replaces it), `display:flex↔block`
  with no visual change, `align-items:normal↔stretch`, `flex-grow 0↔1`, `column/row-gap:normal↔Npx`.
These MUST NOT count as full mismatches — they are invisible. The rebuilt tool MUST either
threshold/normalise each class or route it to a separate `sub_visible[]` bucket that does not drag
the headline number, so the reported % tracks what Bean's eye sees. The genuine visible gaps on
page 8 were exactly two (C description colour, E CTA padding) + the accepted A/B — the number must
reflect that, not 76%.
**Done when:** on the page-8 pair the tool reports a CSS % within a few points of the independent
D314 ledger's visible-fidelity verdict (~94–95%), with font-family compared primary-only, the
clone-only/UA props blocklisted, and the representational-twin classes above excluded or bucketed.

### FR-20-4 — Unmatched elements surfaced (completeness) — EXTENDED to all dimensions (v1.1.0)
A draft element with NO content-matched clone element (dropped or restructured so its content differs)
MUST be **reported** as `unmatched_elements`, per tier — never silently excluded from the denominator
without visibility. **v1.1.0:** this surfacing extends to EVERY scored dimension (FR-20-9 tag +
element-structure, in addition to content + CSS): a draft element that pairs on content but has NO
tag match, or whose structural position has no clone equivalent, is reported per-dimension — never
silently excluded. Each dimension carries its own unmatched list so a divergence in one dimension
(e.g. tag `button→span`) is visible even when content + CSS matched.
**Done when:** the report lists unmatched draft elements per viewport AND per dimension, and the
printed summary states each dimension's unmatched count.

### FR-20-5 — Draft-agnostic invocation (path or URL)
`--draft` and `--clone` MUST each accept EITHER an `http(s)` URL OR a local file path (auto-converted
to `file://`, which standalone Playwright loads). No client/page is hardcoded.
**Done when:** `node computed-parity.js --draft sites/<any-client>/mockups/<page>/index.html --clone
<live-url>` runs and scores without editing the tool.

### FR-20-6 — Documented limits (not silent gaps)
The tool MUST document, in-code, exactly what it does NOT compare and why: exact `width`/`height` px
(container-dependent — a `%` width differs by viewport); SVG internals `fill`/`stroke` (SVG skipped;
icon-fill is a client-facing block control, not a fidelity-score item); interaction/reset/CSS-var
definitions (non-visual).
**Done when:** the source file's header comment names each excluded property class with its reason,
and no excluded class is a silent omission.

### FR-20-7 — Supersedes the input-side diagnostic approach
The pipeline-state artefacts (`trace.jsonl`, `leftover-buckets.json`, `attribute_gap_candidates`,
`stage-11-pixel-diff.json`) and the structured-log surfacing (old Spec 20) are DEBUG aids for the
converter's INTENT — they MUST NOT be treated as the per-clone rendered-fidelity signal. This spec's
computed-parity (Stage 11.6) + Bean's visual sign-off (R-31-13) are the canonical fidelity signal.
`attribute_gap_candidates` is explicitly a **cumulative** ledger (not per-run).
**Done when:** CLAUDE.md rule 4a states "don't trust the input-side drop-logs as a fidelity signal";
Spec 31 §7b references this spec as the fidelity instrument; and the retired Spec 20/21 files are
archived (not live).

### FR-20-8 — Pipeline integration (Stage 11.6, soft-fail, opt-out)
`sgs-clone-orchestrator.py` MUST run the tool as **Stage 11.6**, inline after a successful Stage 10
deploy, passing this run's `--mockup` as the draft and the Stage 10 `link=` URL as the clone, at
viewports 375/768/1440, writing `pipeline-state/<run>/computed-parity.json` and printing a per-viewport
`content% / css%` summary. It MUST be **soft-fail** (never blocks the autonomy chain) and opt-outable
via `--no-computed-parity` (and skip cleanly when `node` is unavailable).
**Done when:** a `/sgs-clone --deploy-target page:<id>` run prints `[stage-11.6] computed-parity … OVERALL
CSS N%` and writes `computed-parity.json`; and `--no-computed-parity` skips it without error.

### FR-20-9 — Tag + element-structure matching (the added scored dimensions, v1.1.0)
Bean's scope broadening ("match tags + classes + elements + content + CSS") extends the tool beyond
computed-CSS. For each content-matched draft↔clone pair, the tool MUST compare and report, as
SCORED dimensions alongside content + CSS:
- **Tag:** the draft element's tag vs the clone element's tag (`button` vs `span`, `p` vs `div`,
  `section` vs `div`). A tag mismatch is reported per pair (`tag_mismatches[]`) with both tags.
- **Element-structure:** the element's structural role/position — is the draft element's content
  present at an equivalent nesting position in the clone (a paired element exists at all), and does
  the local element-tree shape correspond. A draft element whose content has no structurally-paired
  clone element is an `unmatched_element` (FR-20-4). This surfaces convert-divergences (a draft
  `<button>` pill rendered as a clone `<span>`, a draft `<p>` as a clone `<div>`) that computed-CSS
  alone would not name.

These dimensions are **reported and counted separately** from CSS (each gets its own pct + list) —
a tag/structure divergence must NEVER dilute or be diluted by the CSS score, and vice versa.
**Rule-1 caveat (see FR-20-10):** many tag differences (`section↔div`) are EXPECTED convert-
divergence, not fidelity gaps — the tool REPORTS them; judging which matter is Bean's eye +
per-section review (R-31-13), not an automatic fail.
**Done when:** the JSON report contains, per viewport, `tag.match`/`tag.mismatches[]` and a
structural-pairing account; running on page 8 reproduces the tag divergences the independent D314
ledger recorded (e.g. the pack-pill `button→span`, the description `p→div`) — no false tag matches,
no missed tag divergences.

### FR-20-10 — Class names captured as INFORMATIONAL context, never scored (the Rule-1 lock, v1.1.0)
The clone DELIBERATELY does not reuse the draft's BEM class names — Rule 1 (CONVERT, don't mirror):
the draft's `sgs-hero__title` becomes the native `wp-block-sgs-heading`. Therefore class-name
equality is **architecturally wrong to score** (it would contradict the framework and re-introduce
the wrapper-vs-raw class-keying false positives this spec was built to kill — see Problem §2). The
tool MUST:
- **Capture** both sides' class lists per matched pair and include them in the report as
  `classes: {draft:[…], clone:[…]}` for human/debugging context.
- **NEVER** count a class-name difference as a mismatch or let it affect any score.
The computed CSS (FR-20-1/2/3) is the proof the STYLING transferred; class names are context only.
**Done when:** the report includes per-pair `classes` context; and no code path adds a class-name
comparison to any pct/match/mismatch count (asserted by a grep + a fixture where draft and clone
share zero class names but identical computed CSS → 100% CSS, 0 class-driven mismatches).

### FR-20-11 — Force-load lazy / below-fold content before measuring (the D314 false-negative guard, v1.1.0)
A below-fold `loading="lazy"` image (or any deferred content) may be present in the DOM but not yet
painted/sized when a headless capture fires — proven live in the D314 Task-1 investigation, where a
full-page screenshot false-flagged the brand-story image as "missing" (it renders correctly once
scrolled into view). The tool MUST, before capturing computed values, **force all deferred content
to load and lay out** — e.g. scroll the full document height (or set `img[loading]='eager'` +
await `decode()`) and await network idle + a settle delay — so a below-fold element is measured at
its real rendered size, never as absent or zero-size. This composes with the §7b empty-section
guard (`innerText.length > 0` + element-present FIRST) and the coincidental-default guard.
**Done when:** running on a draft/clone whose below-fold image only paints after scroll reports that
image as PRESENT at its real dimensions, not dropped; and the guard is documented in the source
header alongside the FR-20-6 limits.

## Test strategy (holistic, per the pipeline)

| FR | Static / structural | Behavioural (real run) | Cross-check | Regression guard |
|----|---------------------|------------------------|-------------|------------------|
| FR-20-1 | grep the tool for `getComputedStyle` + content-key; no class-keyed match | run on a known inherited-base-font case → the diff appears | vs Bean's eye on the same element | a fixture pair with a base-font delta |
| FR-20-2 | assert no `property_suffixes` prop (≠ width/height) is in the blocklist | a draft with `object-fit`/`order` scores those props | diff the blocklist vs `property_suffixes` in CI | fail if the blocklist grows to include a converter property |
| FR-20-3/4 | JSON schema keys present | run → tiers + unmatched populated | — | keys asserted in a smoke test |
| FR-20-5 | `--draft` accepts a path | run with a file-path draft | run with an http draft | — |
| FR-20-8 | grep orchestrator for the Stage 11.6 block + flag | a real deploy prints the stage line + writes the JSON | vs parity2 output for the same run | orchestrator `ast.parse` in CI |
| FR-20-9 | JSON has `tag.*` + structural-pairing keys separate from `css.*` | run on page 8 → the D314 ledger's tag divergences (pill `button→span`, desc `p→div`) appear, no false tag matches | vs the independent D314 hand-built ledger | a fixture pair with a known tag swap |
| FR-20-10 | grep: no class-name comparison feeds any score | fixture: draft+clone share 0 class names, identical computed CSS → 100% CSS, 0 class mismatches; `classes` context still present | vs Rule 1 (clone uses `wp-block-sgs-*`) | fail if a class diff ever affects a pct |
| FR-20-11 | source header documents the lazy-load force + settle | a below-fold lazy image paints only after scroll → reported PRESENT at real size, not dropped | vs the D314 story-image false-negative | a fixture with a below-fold `loading=lazy` image |

## Open questions

None. (Future: a `fill`/`stroke` SVG tier and a raw-band F-ii passthrough check could extend coverage,
but both are deliberately out of scope — see FR-20-6.) **v1.1.0 closes Bean's D314 broadening**
(tag/class/element/content/CSS) via FR-20-9/10/11 + the extended FR-20-4; the acceptance basis is
agreement with the independent D314 hand-built ledger, not the tool's self-report.
