---
doc_type: spec
spec_id: 33
spec_version: 0.1.0-DRAFT
project: small-giants-wp
thread: header-footer-setup-pipeline (Part 1 of 2)
title: "Universal Draft Global-Styles / Token Extractor"
created: 2026-07-13
status: draft (design-gate + /adversarial-council PENDING before build)
references:
  - 26-SGS-GLOBAL-STYLES-AND-THEMING.md (the theming MODEL this FEEDS; FR-26-C derived-globals is the complementary source)
  - 17-HEADER-FOOTER-ARCHITECTURE.md (Part 2 sibling — the header/footer converter, built AFTER this)
  - 31-UNIVERSAL-CLONING-PIPELINE.md (the block pipeline; §3.A token-snap ΔE≤1 reused here)
  - ../parking.md P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE (the parked idea this spec formalises)
  - ../parking.md P-DRAFT-CSSVAR-COLOUR-RESOLUTION + P-DRAFT-CSSVAR-SEED-READD (consume this extractor's :root map)
corpus_basis: sites/{mamas-munches,indus-foods,_dogfood} authored draft mockups (8 files, 3 design systems) — full union inventory in §Appendix A
supersedes: none
absorbed_by: none
---

# Spec 33 — Universal Draft Global-Styles / Token Extractor

> **This is Part 1 of the 2-part header/footer setup pipeline** (Bean-directed 2026-07-13). Part 1
> (this spec) = extract the draft's GLOBAL design tokens + base styles into the site's theme, so
> every block inherits the correct base BY CONSTRUCTION. Part 2 (Spec 17 work) = clone the draft's
> header/footer into SGS template parts. Part 1 first: it is a prerequisite for Part 2, it fixes a
> whole class of body-clone drift bugs, and it is lower-risk (data into theme settings). It also
> unblocks two parked colour-var bugs (`P-DRAFT-CSSVAR-*`), which need exactly the `:root` map this
> produces.

## Problem

A clone run today READS a hand-maintained per-client `theme-snapshot.json`; nothing GENERATES it
from the draft. That is the source of a proven drift class: all 6 client snapshots carry a
fabricated `h1: 1.15` line-height + `-0.022em`/`-0.015em` letter-spacing that **no draft ever
declared** (the real Mama's draft says `h1,h2,h3{line-height:1.2}` with zero letter-spacing). Because
the theme base ≠ the draft base, every cloned block inherits the wrong base value — the D303
"brand quote renders 16→18px" bug is exactly this (the paragraph has no explicit `font-size`, so it
inherits the theme base 18px instead of the draft base 16px).

The block pipeline (Spec 31) already transfers each block's OWN explicit CSS faithfully. What is
missing is the **global layer**: the draft's `:root` tokens + base-element rules (`body`, `h1–h6`,
`a`) that define the inherited defaults. Extracting them into the theme's global settings closes the
drift at the token layer — far lower blast-radius than the rejected ancestor-walk (which re-emitted
inherited values onto every leaf and re-seeded all conformance goldens, STOP-60).

## Solution overview

A **universal, draft-agnostic extractor** reads a draft mockup and emits a **generated
`theme-snapshot.json`** (structured theme.json v3 slots — NOT a raw-CSS blob), which the EXISTING
`push-theme-snapshot.py` deploys to `theme.json` + `wp_global_styles` (the live layer). It runs as
the opening step of the header/footer setup pipeline, once per site.

**Two passes (the "ready for any possibility" core — grounded in the real corpus, §Appendix A):**
- **Pass A — declared:** parse the draft's `<head>` global `<style>` + font `<link>`/`@import`:
  the `:root` custom properties (resolving `var()` chains) AND the base-element rules
  (`body`/`h1–h6`/`a`/`p`/reset). This is the clean case (Mama's, Indus, dogfood all declare `:root`).
- **Pass B — computed + frequency (universality fallback):** for tokens NOT declared as `:root`
  (the common case — 7/8 drafts hardcode fonts in base rules; 0/8 declare type-size/line-height/
  radius/shadow tokens; the Spectra scrape declares no `:root` at all): read `getComputedStyle` on
  the rendered `body`/`h1–h6`/`a`, and **frequency-cluster the colour + spacing literals across the
  whole stylesheet** to recover a palette + spacing scale even when nothing is named. Computed values
  are ground truth (the project `measurement-vs-eye` rule).

**Classification is by ROLE + VALUE-TYPE, never by token NAME** (the corpus proves names are
unreliable: the SAME role `success=#2E7D4F` is `--success` in one system and `--green` in another;
Mama's uses role-names, Indus uses literal-colour-names). This is the D301 "route by role, not a
hardcoded name list" rule applied to theming.

**Output maps onto theme slots the SGS theme ALREADY has** (§Appendix B): `settings.color.palette`,
`settings.typography.fontFamilies`/`fontSizes` (fluid), `settings.spacing`, `settings.shadow`,
`settings.custom.{borderRadius,buttonPresets}`, `settings.layout`, `styles.typography`,
`styles.elements.{h1..h6,link,button}`. Colours dedupe + snap at **ΔE≤1** (the same threshold the
block pipeline's token-snap uses, Spec 31 §3.A step 6). Fluid `clamp()` values are preserved
verbatim / emitted via theme.json's native fluid typography — never flattened to one viewport.

**Out of scope (the NOT list):**
- NOT the header/footer converter (Part 2 / Spec 17).
- NOT the derived-globals post-pass (Spec 26 FR-26-C reads the CONVERTED BLOCKS' values; this reads
  the draft's DECLARED globals — complementary sources that merge into the same snapshot).
- NOT a new theming/deploy channel — it feeds the EXISTING `theme-snapshot.json` → `push-theme-snapshot.py`.
- NOT a per-client special case — one universal extractor, no `if client==` branch (blub.db 269 / R-31-9).

## Functional requirements

### FR-33-1 — Two-pass universal extraction (declared + computed/frequency)
The extractor MUST run Pass A (parse declared `:root` + base rules via a CSS parser — `tinycss2`,
already a project dep — NOT regex) AND Pass B (computed-style read of rendered base elements +
frequency-cluster of colour/spacing literals) for every draft. A token declared in `:root` takes
precedence; a token only implied by base rules or repeated literals is recovered by Pass B. Neither
pass alone is sufficient (Pass A misses the 7/8 drafts that hardcode fonts; Pass B is the only path
for the token-less Spectra scrape).
**Done when:** on a draft with a full `:root` (Mama's) every declared token is extracted via Pass A;
AND on a synthetic token-less draft (no `:root`, fonts+colours only in base/component rules) the
palette + base typography are still recovered via Pass B.

### FR-33-2 — Colour palette → `settings.color.palette` (role+value-aware, ΔE-deduped, unioned)
Every colour the draft defines (declared `:root` hex/rgba/gradient tokens AND Pass-B frequency-ranked
literals) MUST be extracted and mapped to the theme palette by **role inferred from usage + value**,
never by token name. Near-identical colours dedupe at **ΔE≤1**; the canonical SGS slug vocabulary
(§Appendix B: `primary`/`primary-dark`/`accent`/`surface`/`surface-alt`/`text`/`text-muted`/
`text-inverse`/`border-subtle`/`success`/`error`/`footer-bg` …) is the mapping target, with raw hex
preserved when no slug fits (`customGradient`/`customDuotone` on, Spec 26 FR-26-B1). Where one draft
across multiple pages drifts (Mama's `--border` vs `--border-subtle`, `--red`/`--whatsapp` added
per-page), the extractor UNIONS the low-frequency one-offs, never drops them.
**Done when:** Mama's 13 `:root` colours + Indus's 12 literal-named colours + dogfood's 8 each map to
a palette with no ΔE≤1 duplicates and no dropped one-off (`--red`/`--whatsapp` present); a colour used
only as `rgba(...)` in a rule (not `:root`) is still captured.

### FR-33-3 — Typography families + type scale (synthesised when un-tokenised; fluid-preserving)
Font FAMILIES MUST be extracted whether declared as a `--font-*` token (1/8 drafts) OR hardcoded in
`body`/`h1–h3` rules (7/8) — synthesise a `fontFamilies` entry (body/heading/display) from the base
rules when no token exists, handling all three loading mechanisms (`<link>` google-fonts,
`@import` inside `<style>`, system-font/none). Type SIZES/weights/line-heights/letter-spacing (0/8
declared as `:root` tokens) MUST be DERIVED from the base + heading + preset rules into
`settings.typography.fontSizes` + `styles.elements.{h1..h6,link}` + `styles.typography`. Any
`clamp()`/`calc()`/`min()` value is preserved verbatim or emitted via theme.json's native fluid
typography (`fluid:true` / per-size `fluid:{min,max}`) — NEVER flattened to a single-viewport px
(the responsive-value rule / CLAUDE.md Rule 6). Unit variety (px vs rem type, px vs em letter-spacing)
is normalised unit-aware.
**Done when:** Mama's (Fraunces heading / Inter body, px sizes, `line-height:1.2` headings / `1.6`
body, no letter-spacing) AND Indus (DM Serif Display / DM Sans, rem sizes) AND dogfood (system-ui /
Georgia, a `clamp()` `--pad-block`) each produce correct `fontFamilies` + `styles.elements` + a
type scale with clamp preserved; the emitted heading line-height is the draft's `1.2`, NOT the
fabricated `1.15`.

### FR-33-4 — Base body typography → `styles.typography` (the drift-killer)
The draft's base `body` rule (font-family, font-size, line-height, colour, background) MUST become the
theme's top-level `styles.typography` + `styles.color` so EVERY block inherits the draft base by
construction. A dark PREVIEW-SHELL `body{background:#2a2a2a}` (the Claude App Design review mockup's
viewport-switcher chrome) MUST NOT be mistaken for the theme background — the real background is the
draft's `--surface-*` token; the extractor distinguishes a preview harness from the page (heuristic:
a `body` bg that is a near-black with `min-height:100vh` + no matching `:root` surface token is a
preview shell → ignore, use the surface token).
**Done when:** re-cloning Mama's with the generated snapshot renders the brand quote at the draft
base 16px (not 18px) — the D303 bug is gone; and the Claude-mockup dark shell bg is NOT emitted as
the theme background.

### FR-33-5 — Spacing / radius / shadow / layout (token-or-derived)
Spacing scale MUST be read from spacing tokens when present (dogfood `--gap-section`/`--pad-block`/
`--measure`) OR derived from repeated padding/margin/gap literals (Mama's/Indus hardcode all spacing)
→ `settings.spacing.spacingSizes`. `contentSize`/`wideSize` MUST be discovered from `.container`/
`.section` `max-width` OR a `--content-width`/`--measure` token — scanning BEYOND `:root` (Mama's
declares `--content-width:1280px` inline on `.sgs-header__inner`, not in `:root`). Radius + shadow
(0/8 tokenised) are derived from preset-class values → `settings.custom.borderRadius` +
`settings.shadow.presets`.
**Done when:** dogfood's spacing tokens land as spacingSizes; Mama's `.container` `max-width:1280px`
lands as `contentSize`; button `border-radius:10px` lands as a borderRadius token.

### FR-33-6 — Button presets → `settings.custom.buttonPresets` (both hover idioms, no `!important`)
The draft's global button classes (`.sgs-button--primary/secondary/ghost` BEM OR `.btn-primary/
secondary` plain OR Indus `.nav-cta`) MUST be extracted into `buttonPresets.{primary,secondary,
outline}` — background/text/border/radius/padding/font + the hover state. The two hover IDIOMS the
corpus uses MUST both be captured: colour-invert (Mama's: bg→text colour) and transform-lift (Indus:
`translateY(-2px)` + box-shadow). `!important` (Indus `.nav-cta`) is stripped — the VALUE is captured,
not the important flag.
**Done when:** Mama's 3 button variants + Indus's gold/translucent variants map to buttonPresets with
correct rest + hover; no `!important` survives.

### FR-33-7 — Generated snapshot deployed via the existing channel (ends the drift)
The extractor's output MUST be a `theme-snapshot.json` written to `sites/<client>/` in the STRUCTURED
theme.json v3 slot shape (NOT the current raw-`styles.css`-blob-with-`!important` pattern the
hand-maintained snapshots degraded into — align with Spec 26's intended structured direction), then
deployed by the EXISTING `push-theme-snapshot.py` (disk `theme.json` + `wp_global_styles` REST). The
6 currently-drifted snapshots (mamas-munches, eye-care-ward-end, sgs-construction, sgs-healthcare,
sgs-mosque, + variants) MUST be REGENERATED from their drafts, ending the hand-maintained drift class.
**Done when:** `push-theme-snapshot.py --client <c> --dry-run` on a generated snapshot shows the
structured slots (no degenerate `[{"slug":"px","size":"px"}]`, no fabricated letter-spacing); a full
push + reclone renders the draft base faithfully.

### FR-33-8 — Edge-case coverage (the corpus's 15 varieties)
The extractor MUST handle, without a per-client branch: two token-naming philosophies (role vs
literal-colour); intra-brand token drift (union, not one canonical set); typography with no `--font`
token (synthesise); zero type/radius/shadow tokens (derive); a `:root` value that is a CSS function
(`clamp()` token); three reset shapes (`*,::before,::after` vs `*`, varying order — normalise not
string-match); three font-loading mechanisms; the dark preview-shell bg (ignore); unit-system variety
(unit-aware normalise); `!important` in presets (strip); ad-hoc per-page colours (union); content-width
outside `:root`; and the token-less/Spectra scrape (Pass-B computed fallback OR an explicit
logged-skip — never a silent wrong-guess).
**Done when:** each of the 3 design systems + the token-less synthetic fixture extracts correctly with
ONE code path; the §Appendix A union inventory is the acceptance coverage set.

### FR-33-9 — No silent drops; universal; reuse existing primitives
Every global declaration MUST be either extracted-to-a-slot OR logged as a gap-candidate (conservation,
mirroring the block pipeline's `attribute_gap_candidates` discipline) — never silently dropped. The
extractor MUST reuse (extend, not duplicate) the existing `converter/services/styling_helpers.py
build_draft_root_colour_map` (today hex-only → extend to non-hex tokens + `var()`-chain resolution)
and the ΔE token-snap. No hardcoded per-client dict (R-31-1); no `if client==` branch (blub.db 269).
**Done when:** a grep finds no client literal in the extractor; every draft `:root`/base declaration
appears in the snapshot OR the gap log; `build_draft_root_colour_map` is extended (not re-implemented).

### FR-33-10 — Relationship contracts (Spec 26 + 17 + the parked colour-var bugs)
The extractor is the DECLARED-global source; Spec 26 FR-26-C is the DERIVED-global (from converted
blocks) source — they MUST merge into the same snapshot without conflict (declared wins on an explicit
draft token; derived fills gaps). The `:root` map the extractor builds MUST be consumable by
`P-DRAFT-CSSVAR-COLOUR-RESOLUTION` + `P-DRAFT-CSSVAR-SEED-READD` (they currently re-parse `:root` —
wire them to this map). Part 2 (Spec 17 header/footer converter) runs AFTER this, consuming the
generated theme (so the cloned header/footer inherits the correct tokens).
**Done when:** the extractor's `:root` map is exposed as a reusable service; the two colour-var
parking entries are re-pointed to consume it (or a note records the follow-up).

## Test strategy (holistic)

| FR | Static / structural | Behavioural (real run) | Cross-check | Regression guard |
|----|---------------------|------------------------|-------------|------------------|
| FR-33-1 | grep: tinycss2 parse, no regex `:root` scrape; computed-pass present | run on Mama's (declared) + a token-less synthetic → both recover base | vs the §App A inventory | fixture: token-less draft |
| FR-33-2 | ΔE≤1 dedup asserted; no client literal | 3 systems' colours → palette, no dup, one-offs kept | vs the 3 verbatim token sets (§App A) | fixture: rgba-only-in-rule colour |
| FR-33-3 | clamp preserved (grep no px-flatten) | 3 systems → families+scale; heading lh=1.2 | vs draft rules | fixture: clamp() type + rem units |
| FR-33-4 | preview-shell heuristic documented | reclone Mama's → quote 16px (D303 gone) | vs live computed-style | fixture: dark-shell body bg ignored |
| FR-33-5 | contentSize scans beyond :root | dogfood tokens + Mama's .container both land | vs §App A §D | — |
| FR-33-6 | `!important` stripped | both hover idioms captured | vs §App A §D | fixture: transform-lift + colour-invert |
| FR-33-7 | structured slots, no CSS-blob | dry-run shows structured snapshot; 6 regenerated | vs push-theme-snapshot diff | the fabricated-letter-spacing must not reappear |
| FR-33-8 | one code path, no client branch | all 3 systems + token-less pass | §App A = coverage | each edge case a fixture |
| FR-33-9 | grep no client literal; gap-log present | every decl → slot or gap | conservation count | — |
| FR-33-10 | :root map exposed as service | colour-var entries consume it | vs Spec 26 merge | — |

## Open questions (for the design-gate / `/adversarial-council`)
1. **Snapshot = full theme.json or Spec-26 delta?** Spec 26 FR-26-A1 wants per-client DELTA files (only divergences from a framework baseline). Generating a delta is cleaner long-term but couples this spec to Spec 26's unbuilt variation model. Recommend: generate a FULL structured snapshot now (matches the current deploy path), leave delta-conversion to Spec 26. (Decide at the gate.)
2. **Token-less / Spectra scrape (Class 3):** Pass-B computed fallback vs explicit skip-with-log. Recommend: attempt Pass-B computed extraction (headless render + getComputedStyle + frequency), fall to a logged gap if the render is unusable — never a silent wrong palette.
3. **Palette slug mapping when a draft has MORE colours than the 16 SGS slugs** (Mama's `--cookie-brown`, Indus `--whatsapp`): keep as raw-hex custom entries vs extend the slug vocabulary. Recommend: raw-hex custom palette entries (FR-26-B1 already allows), don't force a slug.
4. **Frequency thresholds for Pass B** (min occurrences to promote a literal to a palette/spacing token; the ΔE cluster radius). Recommend: reuse ΔE≤1 for colour dedup; a ≥3-occurrence + ≥ dominant-share rule for promotion (mirrors Spec 26 FR-26-C2). Empirically calibrate against the corpus at build.

## Appendix A — Corpus union inventory (the acceptance coverage set)
Full empirical inventory of every global declared default/preset/variable across the real draft
corpus (`sites/{mamas-munches,indus-foods,_dogfood}`, 8 authored mockups, 3 design systems) —
captured 2026-07-13. The extractor's acceptance = correctly handling every row here. Verbatim token
sets, the two naming philosophies (role-named vs literal-colour-named), base-element rule matrix, the
4 font families + 3 loading mechanisms, the button/eyebrow/container preset patterns, and the 15
edge cases (intra-brand drift, un-tokenised typography, clamp `:root` values, three reset shapes, the
dark preview-shell trap, unit variety, `!important`, token-less Spectra scrape) are recorded in the
session investigation feeding this spec (D317 handoff). KEY COVERAGE ANCHORS:
- **Colour roles + naming range:** primary/`--navy`, accent/`--gold`, text/`--text-dark`, success/`--green` (same hex #2E7D4F, different name), border/`--border`-vs-`--border-subtle`, plus one-offs `--cookie-brown`/`--whatsapp`/`--red`.
- **Typography:** Fraunces+Inter (Mama's, px), DM Serif Display+DM Sans (Indus, rem), system-ui+Georgia (dogfood, clamp) — 7/8 hardcode the family (no `--font` token); 0/8 tokenise sizes/lh/tracking.
- **Base elements carrying globals:** `*`(reset, 3 shapes), `html`, `body`, `h1–h4`, `p`, `img`, `a`.
- **Presets:** `.container`/`.section` (contentSize 1200–1280), `.sgs-button--*`/`.btn-*` (2 hover idioms), `.sgs-section-heading__label`/`.section-label` (eyebrow), skip-link, focus-visible, reduced-motion.

## Appendix B — Target theme.json slots (the SGS theme baseline, verified)
`theme/sgs-theme/theme.json` provides: `settings.color.palette` (16 named slugs, raw hex OK);
`settings.typography.fontFamilies` (body/heading/display/dm-sans + fontFace) + `fontSizes` (7-step,
fluid) + `fluid`; `settings.spacing.spacingSizes` (8-step `10`–`80`); `settings.shadow.presets`
(sm/md/lg/glow); `settings.custom.{buttonPresets(primary/secondary/outline), borderRadius(small/
medium/large/pill), transition/duration/easing, focus-ring}`; `settings.layout.{contentSize 1200,
wideSize 1400}`; `styles.typography` (base body); `styles.elements.{h1..h6, heading, link, button}`.
Deploy: `push-theme-snapshot.py` → disk `theme.json` + `POST /wp/v2/global-styles/{id}` (wp_global_styles).
WP fluid typography: `settings.typography.fluid:true` auto-computes `clamp()` from a size, OR per-size
`fluid:{min,max}` for explicit control — the extractor emits sizes + fluid config, never hand-writes clamp.
