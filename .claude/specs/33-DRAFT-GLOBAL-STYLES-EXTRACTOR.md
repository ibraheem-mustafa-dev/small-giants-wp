---
doc_type: spec
spec_id: 33
spec_version: "1.5"
project: small-giants-wp
thread: header-footer-setup-pipeline (Part 1 of 2)
title: "Universal Draft Global-Styles / Token Extractor"
created: 2026-07-13
last_verified: 2026-09-20
status: complete
references:
  - 26-SGS-GLOBAL-STYLES-AND-THEMING.md (the theming MODEL this FEEDS; FR-26-C derived-globals = a FORWARD CONTRACT, inert until Spec 26 Phase 3)
  - 37-HEADER-FOOTER-BUILDER.md (Part 2 sibling — the header/footer converter; reserves the header/footer token namespace, FR-33-13)
  - .claude/plans/archive/2026-07-13-header-footer-nav-system-design-gate.md (names Part 2's concrete emit target, `sgs/nav-bar-menu`+`sgs/nav-drawer-menu`+`sgs/nav-drawer`, and makes those blocks a consumer of this spec's `theme-snapshot.json` for global-style defaults, §4b)
  - 31-UNIVERSAL-CLONING-PIPELINE.md (the block pipeline; §3.A token-snap ΔE reused; the converter reads the snapshot this generates → bootstrap ordering FR-33-12)
  - ../parking.md P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE (the parked continuation: the other-5-client rollout behind per-client reclone, FR-33-11)
  - ../parking.md P-DRAFT-CSSVAR-COLOUR-RESOLUTION + P-DRAFT-CSSVAR-SEED-READD (consume this extractor's token map, FR-33-13)
corpus_basis: sites/{mamas-munches,indus-foods,_dogfood} authored draft mockups (8 files, 3 design systems) — full union inventory in §Appendix A
absorbs: null
absorbed_by: null
---

# Spec 33 — Universal Draft Global-Styles / Token Extractor

> **Part 1 of the 2-part header/footer setup pipeline.** Part 1 (this spec) = extract the draft's GLOBAL
> design tokens + base styles into the site's theme so every block inherits the correct base BY
> CONSTRUCTION. Part 2 (Spec 37) = clone the draft header/footer into SGS template parts. Part 1 is the
> prerequisite for Part 2 AND for every body clone (the converter reads the snapshot this generates —
> FR-33-12), prevents the base-inheritance drift class described under Problem, and feeds two colour-var
> consumers.
>
> **Part 2's emit target:** Part 2 clones a draft's header/footer rows onto the specialised container
> blocks `sgs/site-header`, `sgs/site-footer`, and `sgs/nav-bar-menu`+`sgs/nav-drawer-menu`+`sgs/nav-drawer`
> (`.claude/plans/archive/2026-07-13-header-footer-nav-system-design-gate.md`) — not `core/group`. Those
> blocks are also a downstream CONSUMER of this spec's output: every element/setting on them defaults its
> colours/typography/spacing from the `theme-snapshot.json` Part 1 generates (the design-gate's §4b
> "global defaults + Site Info access" requirement), so a client's brand tokens flow through Part 1 into
> header/footer/nav with no re-entry. Part 1 still only produces the token source; it is read by the
> `push-theme-snapshot.py` deploy path and by the new blocks' default-resolution at render time.

> **⛔ THE ONE RULE THAT MAKES THIS WORK (read before any FR).** This spec exists to stop a block
> inheriting the WRONG base because something trusted a DECLARED value over the RENDERED one.
> So the iron law here is: **the emitted VALUE is always the COMPUTED value on a real rendered node,
> never a raw source declaration** (the project `measurement-vs-eye` rule). A source `:root`/base
> declaration is only ever used for the token's NAME/ROLE vocabulary, never as the value to ship.
> Any FR that emits a declared value without computed-validation breaks this rule.

## Problem

Without this extractor a clone run READS a hand-maintained `theme-snapshot.json` that nothing GENERATES
from the draft — the drift source. A hand-maintained snapshot carries values no draft ever declared (a
fabricated `h1: 1.15` line-height + `-0.022em`/`-0.015em` letter-spacing, where the real Mama's draft says
`h1,h2,h3{line-height:1.2}` and has zero letter-spacing). Because the theme base ≠ the draft base, every
cloned block inherits the wrong base — e.g. the brand quote renders 16→18px (a `<p>` with no explicit
font-size inherits the theme base 18px, not the draft base 16px).

## Solution overview

A **universal, draft-agnostic extractor** reads a draft and emits a **generated `theme-snapshot.json`**
(structured theme.json v3 slots — NOT a raw-CSS blob), which the EXISTING `push-theme-snapshot.py`
deploys to `theme.json` + `wp_global_styles`. It runs once per site, as the opening step of the
header/footer setup pipeline AND as a hard prerequisite of any body clone (FR-33-12).

**The complete spine — one build, all value types, tiered by TRUST (not split by value type).** v1
extracts EVERY value type the draft declares (colour, typography, type-scale, spacing, radius, shadow,
buttons, layout) — breadth is cheap once the `<head>` is parsed. The trust boundary is provenance, not
value type:

- **DECLARED (Pass A):** parse the draft's `<head>` `:root` + base/preset rules (via `tinycss2`, not
  regex) → resolve each token's ROLE + VALUE, **validate the value against the COMPUTED value on a
  real rendered node**, then auto-apply. Trustworthy. Serves all 3 corpus design systems.
- **DERIVED (Pass B):** for values the draft does NOT declare (recover a palette/spacing scale by
  usage-context clustering) → emit as **PROVISIONAL/advisory**, confidence-scored, **never
  auto-pushed to a live theme** without human confirmation (FR-33-5). A draft with nothing usable →
  the framework baseline UNCHANGED + a loud logged skip (never a silent guessed theme).

**Classification is by ROLE inferred from USAGE-CONTEXT (which CSS property, on which selector role),
never by token NAME and never by raw frequency** — the corpus proves names are unreliable (same hex
`#2E7D4F` is `--success` and `--green`), and raw frequency INVERTS a palette (the most frequent colour
is body-text/border-grey, not the brand primary). Frequency ranks only WITHIN a role bucket.

**Output maps onto slots the SGS theme already has** (§Appendix B). Colours dedupe at **ΔE≤1
(CIEDE2000, sRGB→Lab), alpha as a separate axis**. Fluid `clamp()` is preserved **verbatim as the
size value** (never recomputed via WP's fluid formula — that changes the curve). `rem` is resolved
against the draft's **actual computed `documentElement` font-size**, never a hardcoded 16px.

**Out of scope (the NOT list):**
- NOT the header/footer converter (Part 2 / Spec 37) — but reserves its token namespace now (FR-33-13).
  Part 2's concrete emit target (`sgs/site-header`/`sgs/site-footer`/`sgs/nav-bar-menu`+`sgs/nav-drawer-menu`+`sgs/nav-drawer`, per the
  header/footer/nav design-gate) is named here for cross-reference only; building those
  blocks, and deciding whether their header-specific settings live in the reserved
  `settings.custom.header`/`.footer` namespace or a Customiser/JS-var channel, is a Part 2 decision
  (Spec 37 FR-37-15/16), not this spec's.
- NOT the Spec 26 FR-26-C derived-globals post-pass — that is a FORWARD CONTRACT, inert until Spec 26
  Phase 3 (FR-33-13); this spec must not build a half-merge against unbuilt code.
- NOT a new theming/deploy channel — feeds the EXISTING `theme-snapshot.json` → `push-theme-snapshot.py`.
- NOT a per-client special case — one universal extractor, no `if client==` branch (blub.db 269 / R-31-9).

## Functional requirements

### FR-33-1 — Provenance-tiered extraction; COMPUTED value wins, declared wins only the name
Every emitted token MUST carry a `_source` provenance (`declared` | `derived`). The emitted VALUE MUST
be the COMPUTED value read on a representative rendered node, NEVER a raw source declaration — a
`:root`/base declaration supplies only the token's NAME/ROLE vocabulary. Where a declared value and
the computed value disagree beyond ΔE≤1 (or a length delta), the computed value wins and the
divergence is written to the reconciliation log. A `:root` token that is declared but has ZERO
computed usage (a dead token) MUST be gap-logged, NOT emitted. `declared` tokens (validated) auto-apply;
`derived` tokens are advisory (FR-33-5).
**Done when:** a fixture where `:root{--primary:#c00}` but the rendered CTA computes `#b00` emits
`#b00` (computed) + logs the delta; a declared-but-unused `:root` token is gap-logged, not in the
palette; every emitted token has a `_source` field.

### FR-33-2 — Role by usage-context (a defined rule table), + ΔE dedup fully specified
Colour/token ROLE MUST be inferred by a **priority-ordered rule table keyed on (CSS property × selector
role × within-role frequency)**, never by token name and never by cross-role raw frequency. Minimum
table (extend in build, but this is the contract):
| Signal | Candidate role |
|---|---|
| `background`/`background-color` on `body`/`html`/`:root`/`*` (a BASE selector) | `surface` |
| `background`/`background-color` on a content-selector (a card/panel/section, NOT the base) | `surface-alt` — **deliberately low-confidence (0.70, below the 0.85 identity-claim floor) so it never overwrites a client's own named draft token; see the `_synthesise_surface_alt` fallback below for the no-evidence case** |
| `color` on body text / `p` / base, low L* | `text` / `text-muted` |
| high-chroma value on `.btn`/`.cta`/`a`/`a:hover` `background` | `primary` / `accent` |
| `border-color` / thin-border usage | `border-subtle` |
| value on a `.success`/`.error`/status selector | `success` / `error` |
| **no confident (≥ threshold) role match** | **raw-hex `custom-<name>` — NEVER force a slug** |
Each mapping carries a **confidence score**; below the floor → `custom` (conservation, FR-33-9), never a
mis-slugged guess. Colours dedupe at **ΔE≤1 (CIEDE2000, sRGB→Lab); ALPHA is a separate axis (never
dedup across alpha)**; on a merge the **`declared` token beats `derived`; among equals, first
source-order wins**; the loser's name is logged as an ALIAS (not silently vanished). **`surface-alt` fallback:** if no real draft evidence or name-tiebreak already claimed `surface-alt`, `palette.py::_synthesise_surface_alt()` (runs AFTER both assignment passes) derives one from the resolved `surface` colour, tinted 6% toward black (light surface) or white (dark surface), tagged `_source:"derived"`. The content-bg signal stays at 0.70 confidence because raising it to claim the slug directly would silently rename a client's own named large-surface token (e.g. `--surface-pink`) to the generic slug.
**Done when:** Mama's role-named + Indus literal-colour-named + dogfood tokens each map to correct
roles via the table (not names); `success=#2E7D4F` lands `success` whether named `--success` or
`--green`; a colour used as BOTH border and heading resolves by the higher-priority property or falls
to `custom` with a logged ambiguity; `rgba(x,1)` and `rgba(x,0.1)` do NOT dedup.

### FR-33-3 — Base body/heading typography from COMPUTED nodes (the drift-killer)
The theme base (`styles.typography` + `styles.color`) MUST be the COMPUTED font-family/size/
line-height/colour/background read on a **representative rendered `<p>` in the main content flow** —
the cascade result of `html` + `body` + any content wrapper — NOT the `body{}` selector's declared
value (reading `body{}` when a wrapper overrides it re-creates the wrong-base drift). `rem` values MUST resolve against
the draft's actual computed `documentElement` font-size (never assume 16px). Font FAMILIES: `body` ←
the base rule; `heading` ← `h1`→`h2`→`h3` (first present); `display` ← an explicit `--font-display`
token or the heading family, else omitted (never synthesised from nothing). Emit the FULL fallback
STACK (`Fraunces, Georgia, serif`) AND ensure the primary family is actually loaded — deploy the
`@font-face`/Google-fonts link into the theme (an extracted-but-unloaded family renders as fallback).
A value the draft NEVER declared (e.g. the fabricated `1.15`/letter-spacing) MUST NOT be synthesised
into the output.
**Done when:** re-cloning Mama's with the generated snapshot renders the brand quote at the draft base
**16px** (the 18px inheritance drift gone), heading line-height **1.2** (not 1.15), letter-spacing absent; a fixture with
`html{font-size:62.5%}` resolves rem correctly (not ×1.6 wrong); the heading font actually loads.

### FR-33-4 — Complete DECLARED value-type coverage (the full spine, all in v1)
Pass A MUST extract EVERY value type the draft DECLARES, into its theme slot (§Appendix B): colour
palette (FR-33-2); typography families + sizes + weights + line-heights + letter-spacing
(`fontFamilies`/`fontSizes`/`styles.elements.{h1..h6,link}`); spacing tokens →
`settings.spacing.spacingSizes`; radius → `settings.custom.borderRadius`; shadow →
`settings.shadow.presets`; buttons → `settings.custom.buttonPresets.{primary,secondary,outline}`;
`contentSize`/`wideSize` from `.container`/`.section` `max-width` OR a `--content-width`/`--measure`
token (scan BEYOND `:root`). A `clamp()`/`calc()`/`min()` value is emitted **verbatim as the size
string** (theme.json accepts it), never recomputed. Button presets are an **OPEN property bag** — the
DIFF between rest-state and `:hover`-state declarations, verbatim (NOT an "idiom A vs B" enum), so a
hover that changes colour AND transform is captured whole; `!important` stripped, value kept.
**Done when:** dogfood spacing tokens + Mama's `.container` contentSize + button `border-radius:10px`
+ both hover shapes (Mama's colour-invert, Indus transform-lift) each land in the correct slot with
no `!important`; a declared `clamp()` size is emitted verbatim.

### FR-33-5 — Pass B derivation is PROVISIONAL/advisory (never auto-live); token-less → baseline+skip
For values the draft does NOT declare, Pass B MAY derive them (usage-context role clustering per
FR-33-2, computed-value read) BUT its output MUST be tagged `_source: derived` + a confidence score
and MUST NOT be pushed to the live `wp_global_styles` without explicit human confirmation (the
snapshot marks derived slots `advisory`; `push-theme-snapshot.py` gates them). Because Pass B is
advisory, its promotion thresholds are NOT a precision-critical calibration — use a **relative share
within a role bucket** (not an absolute count, which is authoring-density-dependent) and hold the
token-less Spectra scrape as VALIDATION, not calibration data. A draft where BOTH passes recover
nothing usable MUST emit the framework baseline UNCHANGED + a loud logged skip — NEVER a silent
guessed theme, NEVER a partial-deploy. Parser failure / malformed CSS → HALT with a clear error, do
not proceed to deploy.
Pass B counts only RESTING selectors: rules that paint browser chrome or an interaction state
(`roles.py::_SEL_NON_RESTING`: scrollbar, selection, placeholder, marker, hover, focus, active, visited)
never vote for a role, the same rule Pass A applies. Pass B also OVERLAYS the base palette instead of
replacing it: an advisory entry for a base slug replaces that entry in place and carries `_baseline_color`
(the base hex), so a push restores it rather than deleting it. A guessed palette can never leave a live
site with fewer slugs than the framework.
**Done when:** a token-less synthetic draft's derived palette is marked `advisory` + does not deploy
to live without confirmation; a draft with nothing usable emits the baseline + a logged skip (not an
empty/guessed theme); Pass B never inverts a palette (role from context, FR-33-2).

### FR-33-6 — Dark-theme / preview-shell safety (never silent-discard a real background)
The theme background MUST be taken from the COMPUTED background of the **widest block-level ancestor
that actually CONTAINS the main content flow** (the common ancestor of the headings/paragraphs), NOT
from `<body>` blindly. A dark `<body>` background is NEVER auto-discarded by darkness alone — a
preview shell is identified only by a POSITIVE structural signal (a `.viewport-switcher`/`.device-frame`
/ known review-harness DOM class or marker); if the signal is ambiguous, the background is
gap-logged for one-glance confirmation, never silently dropped (a legit dark-branded site must survive).
**Done when:** the Claude-App-Design dark preview shell (`body{background:#2a2a2a}` + a review-harness
wrapper) is ignored via the positive signal; a synthetic legit dark-theme draft (`body` dark, no
harness wrapper) KEEPS its dark background (not discarded).

> **Related, not the same mechanism:** this FR governs which background
> COUNTS as the theme's `surface`. It does NOT govern whether a distinct `surface-alt` gets derived —
> that is FR-33-2's role table + the `_synthesise_surface_alt` fallback in `palette.py`. FR-33-2 is the sole owner of that mechanism.

### FR-33-7 — Provenance trace + golden fixtures + schema validation ("correct" = a diff, not an opinion)
The extractor MUST emit a `theme-extract-trace.json`: one row per emitted token — `_source` pass,
source selector + property, role-inference reason, ΔE-snap target + distance, confidence. Every FR
"Done when" that says "correct" MUST be a DIFF against a checked-in `expected/<draft>.snapshot.json`
golden per corpus draft (not an adjective). The emitted `theme-snapshot.json` MUST be validated against
theme.json v3's schema BEFORE handoff to `push-theme-snapshot.py` (a malformed emit must fail here,
not at the REST push).
**Done when:** running on any corpus draft produces a trace explaining every token's origin; each
corpus draft has an `expected/*.snapshot.json` the output is diffed against; a deliberately malformed
emit is caught by the schema check pre-deploy.

### FR-33-8 — Determinism / idempotence (re-run → byte-identical)
Re-running the extractor on an UNCHANGED draft MUST produce a BYTE-IDENTICAL snapshot. All clustering/
promotion/dedup MUST use a total deterministic order (sort by `frequency-within-role desc`,
`first-appearance byte-offset asc`, `canonical-hex asc`; ΔE-cluster canonical = lowest first-offset).
Without this, git diffs + the FR-33-11 diff-approve review are meaningless and drift is reintroduced by
the very tool built to kill it.
**Done when:** the extractor runs twice on an unchanged draft → byte-identical output (a hard test).

### FR-33-9 — Conservation (extract-to-slot OR gap-log; no silent drops; picker not flooded)
Every global declaration MUST be extracted-to-a-slot OR logged as a gap-candidate — never silently
dropped (mirrors the block pipeline's `attribute_gap_candidates`). Intra-palette ΔE merges log the
loser as an alias (FR-33-2). Role-bearing/named colours → the palette; sub-threshold DECORATIVE
one-offs (a shadow-rgba used once) → the trace/gap-log, NOT the client's colour picker (don't flood
the palette with 30 junk swatches). Dead `:root` tokens → gap-log (FR-33-1).
**Done when:** every draft `:root`/base declaration appears in the snapshot OR the gap-log; a
once-used decorative rgba is in the trace, not the palette; a grep finds no client literal.

### FR-33-10 — Reuse by COMPOSITION, not by widening the live helper
The extractor MUST add a NEW `build_draft_root_token_map()` (hex + non-hex + `var()`-chain resolution +
fallback handling). The EXISTING `converter/services/styling_helpers.py::build_draft_root_colour_map`
(hex-only, feeding the LIVE converter's exact-hex snap + the `_theme_palette_slugs()` guard) MUST
stay BYTE-IDENTICAL — widening its return would feed the converter unresolvable entries and risk
re-opening the ghost-border bug. A golden asserts the hex-only map's output is unchanged for
the Mama's draft.
**Done when:** `build_draft_root_colour_map`'s output is byte-identical for Mama's (golden guard); the
extractor consumes the new composed token map; no converter regression.

### FR-33-11 — Deploy safety: prove on Mama's; backup + rollback; diff-approve; drift-detect
v1 proves on **Mama's ONLY** (it carries the wrong-base drift + is the canary). The other 5 client snapshots
are DEFERRED, each behind its own re-clone + a per-client visual/computed-parity (Stage 11.6) pass —
NO snapshot-only push of a regenerated palette to a client whose pages aren't re-cloned in the same
change. Before every `wp_global_styles` push, the pusher MUST fetch-and-back-up the CURRENT live
payload to a timestamped file + document a one-command `--rollback`. Before overwrite, it MUST diff the
live payload against the LAST-DEPLOYED snapshot and WARN if the live layer was hand-edited in the Site
Editor since (else silent clobber of an operator tweak). Each client push is `--dry-run` diff → human
go/no-go → `--yes` (SAFE_TARGETS enforced).
`drift_warning()` performs a VALUE-LEVEL diff and reports both ORPHANED keys and CLOBBERED keys (live-vs-incoming
value) — a key-set diff would miss a client changing a VALUE on a key that already exists (the commonest
edit — nudging a brand colour) and silently overwrite it. A failed live fetch is LOUD, not silent; a failed
backup ABORTS the push (`--force-no-backup` overrides; a genuinely fresh target still proceeds).
Stripping an advisory palette entry (`push-theme-snapshot.py::apply_advisory_policy`) RESTORES its base colour
(`_baseline_color`, or the framework `theme.json` value when none was saved) and deletes only a slug the framework
does not have, so no push can empty the palette. A site with a `theme.json` but no `wp_global_styles` post yet is a
fresh site: nothing to back up in that layer, the push proceeds and exits 0. A failed read of either layer (network or
SSH error) is NOT a fresh site and aborts unless `--force-no-backup` is given. REST credentials for any site come
from the `.claude/secrets/*.env` file whose `WP_URL_*` host matches the target, with the two earlier hard-coded
sites as fallback.
**Done when:** Mama's regenerates + passes the FR-33-3 reclone + Bean's eye BEFORE any other client;
a `--rollback` restores the prior live payload; a hand-edited live layer triggers a warning pre-push.

### FR-33-12 — Bootstrap ordering (extractor is a hard prerequisite of ANY block clone)
Because the converter token-snaps draft colours against the theme palette this extractor GENERATES
(`styling_helpers._load_theme_palette_map` → `configure_colour_resolution_from_run`, Spec 31 §3.A),
the extractor MUST run + validate for the current draft BEFORE any block conversion for that client.
The `/sgs-clone` orchestrator MUST fail-closed if `theme-snapshot.json` was not produced/validated by
the extractor for the current draft hash (reuse the existing `(client_slug, hash(css))` key as the
freshness check). This changes the whole-pipeline run order — state it.
`_sgsExtractor.draft_css_sha256` hashes only `<style>` blocks, which cannot see a Claude Design draft change:
such a draft keeps its design in inline `style` and `style-hover` attributes, its script and a README beside it.
For that kind of draft the snapshot also embeds `_sgsExtractor.draft_source_sha256`
(`shared_utils.py::draft_source_sha256`), a hash of the style blocks, every inline and hover style value, the script
and the README, with line endings normalised. `sgs-clone-orchestrator.py::_freshness_gate` halts when a Claude Design
draft's snapshot lacks the key or it no longer matches. Static drafts carry no second key, so their snapshots and
gate behaviour are unchanged.
The extractor also records the draft it ran on as `_sgsExtractor.source_draft` (the file name). Spec 33 runs on a
client's source draft only: `shared_utils.py::is_part_draft` is true when a snapshot records a source draft and the draft
passed is a different file. `_freshness_gate` then lets that draft inherit the saved snapshot without the hash check (the
snapshot must still carry the extractor key), and `extract.py` refuses to overwrite a snapshot recorded from a different
draft unless `--replace-source` is given. A snapshot with no recorded source (made before the key existed) is checked
against every draft as before.
**Done when:** a `/sgs-clone` run with a stale/absent generated snapshot fails-closed with a clear
message; a run after a fresh extraction proceeds.

### FR-33-13 — Forward contracts (Spec 26 acyclicity + Part 2 namespace + colour-var reuse)
- **Spec 26 merge = FORWARD CONTRACT, inert until Spec 26 Phase 3.** This spec MUST NOT build a
  half-merge. Acyclicity is fixed NOW: Spec 33 OWNS declared `settings.*` tokens (write-once per
  draft); Spec 26 FR-26-C, WHEN built, may only FILL slots absent from Part 1's output and writes to
  the variation DELTA layer (`styles.elements.*`/`buttonPresets.*`), NEVER back into Part 1's snapshot
  nor into the palette the converter snaps against (prevents the theme→converter→theme oscillation).
- **Part 2 namespace reserved NOW:** Part 1 owns GLOBAL/base + generic presets only; header/footer
  COMPONENT tokens (sticky/scrolled header bg, header height, logo max-height, nav-link hover,
  burger breakpoint) are Part 2's, in a reserved `settings.custom.header`/`.footer` namespace —
  declared now so Part 2 does not force a Part 1 re-spec.
  Part 2's owner is `sgs/site-header`/`sgs/site-footer`/
  `sgs/nav-bar-menu`+`sgs/nav-drawer-menu`+`sgs/nav-drawer` (header/footer/nav design-gate). Those blocks' GLOBAL defaults (brand colour/
  typography/spacing) come from Part 1's `theme-snapshot.json` output directly — that linkage needs
  no namespace decision, it is the existing global-styles consumption every block already gets.
  The blocks' HEADER-SPECIFIC settings (sticky bg, header height, etc.) are scoped `#uid` CSS + block
  attributes, not a Customiser/JS-var channel or body-class — see Spec 37 FR-37-15/16.
- The new `build_draft_root_token_map()` is exposed as a service the parked `P-DRAFT-CSSVAR-*` entries
  consume (stop re-parsing `:root`).
**Done when:** the snapshot reserves the header/footer namespace; FR-33-10's token map is a callable
service; a note re-points the colour-var parking entries.

### FR-33-14 — Business-data auto-fill companion (Tier 1) — BUILT + LIVE

**Behaviour:** alongside the global-STYLES extraction+push this spec owns, Part 1 also auto-fills the
site's **business DATA** (the `Sgs_Site_Info` store — email/phone/socials/copyright/…) from the draft,
so a cloned site's header/footer render real contact details with no manual re-entry. Runs
AUTOMATICALLY as part of the Part-1 pipeline at the same deploy moment as the theme-snapshot push
(`scripts/orchestrator/upload_and_patch.py`, gated by `--client` + the same `--push-theme-snapshot`
opt-in), via `scripts/sync-business-info.py`. NON-FATAL by design (business data is nice-to-have; a
failure never blocks a deploy).

**Tier boundary (the trust line, mirrors FR-33-1's declared-vs-derived split):**
- **Tier 1 (BUILT, auto-applied):** ONLY high-confidence machine-signal fields — email (`mailto:`),
  phone (`tel:`), socials (an `<a href>` to a known social domain; `#` placeholders skipped),
  copyright (the `©` line). Extracted by regex on the raw draft (the fields survive as literal text
  even inside JS template strings). Written **fill-if-empty** (never overwrites an operator's value).
  A Claude Design draft adds two sources (`business_info/` package; `sync-business-info.py` is a thin
  command-line wrapper): the script's runtime data object (keys such as phone, address, Instagram, Google
  link, matched through a vocabulary table) and labelled page text (an element reading Phone, Email, Address
  or Hours followed by its value). Values are validated by shape: a value containing a template binding is
  never stored, a social link needs an http or https scheme on a known host, and an hours range
  (`Mon–Sat 9.30–17.30`) expands to the per-day keys. Labels inside a form, dialog, review summary or modal
  are ignored. Precedence: script data object, then labelled text, then literal links.
- **Tier 2 (DEFERRED, review-not-auto-write):** free-text guesses (a tagline, or an address or hours found
  by guessing rather than by a declaration) are NOT auto-written; they need an operator-confirm flow
  (parallels FR-33-5's advisory Pass B). OPEN. An address or opening hours a Claude Design draft DECLARES (in
  its data object or beside an explicit label) is Tier 1.

**Write channel:** the NEW capability-gated `POST /wp-json/sgs/v1/site-info`
(`includes/class-sgs-site-info-rest.php`, `edit_theme_options`) — key-allowlisted to
`Sgs_Site_Info::known_keys()`, per-key sanitised via `Sgs_Site_Info::set()`, fill-if-empty default;
dispositions written/unchanged/skipped_existing/skipped_invalid/skipped_empty/failed. This is the ONLY
remote write path into the Site Info store (reads stay server-side + escaped). Consumed on the render
side by the `sgs/business-info` block (per-type inserter variations) + `Org_Website_Schema`
(`sameAs`/`contactPoint`).

**Acceptance (met live on sandybrown):** the Mama's draft yields email + copyright (socials are `#`
placeholders → skipped; phone/hours/address absent → not touched); fill-if-empty skips an existing
value; a forced write persists the full copyright string. The standalone script is proven end-to-end; the
`upload_and_patch` wiring is statically verified (the draft glob resolves the Mama's mockup); a full-pipeline
integration run is PARTIAL — pending a real `/sgs-clone` run.
**Acceptance (met live on the Eye Care test site):** 13 settings written and read back from `sgs_site_info`
(phone, email, address, copyright, WhatsApp, Instagram, Google link, Monday to Saturday hours); a map link, which has
no Site Info key, is reported as unmapped. Phone is stored as the display form (`0121 729 8233`);
`Sgs_Site_Info_Binding::prefix_url_for_key` strips everything but digits and a leading `+` for the `tel:` link, as the
`sgs/business-info` block already did.
**Runs for any draft location and target site:** `upload_and_patch.py --draft` (the orchestrator passes the ORIGINAL
draft path) and the site named by `SGS_DEPLOY_SITE` (host from that site's `WP_URL_*`); the canary is the default only
when no site is named. Credentials come from the matching secrets file. The pipeline never sends `overwrite`.
**Placeholder map:** `--map-out` writes `sites/<client>/site-info-placeholder-map.json`, mapping each template binding
that resolves to a saved setting (`{{ phone }}` to `phone` as text, `{{ phoneHref }}` to `phone` as a `tel:` link).
The pipeline inserting the saved values in place of the bindings is NOT built (Spec 31, Stage 2 runtime bindings).
**Depends on:** FR-33-11 (push moment / creds), Spec 37 FR-37-10 + FR-37-11 (business-info block consumer), Spec 36 (Site Info store).

### FR-33-15 — Declared design outside `<style>` (Claude Design drafts) — BUILT

**Behaviour.** A Claude Design draft declares its design system in three places: a README token table beside the draft, the script (accent sets chosen by a `data-props` enum, and a runtime data object) and inline `style` and `style-hover` attributes. FR-33-15 reads all three, cross-checks against the rendered page, and builds the snapshot from them. It is additive: it runs only when Pass A found no palette AND the draft has a readable README colour table or a variant set (`extract.py::_declared_design`). Every other draft takes the earlier path unchanged.

**Rules.**
- README (`declared_sources.py::read_readme_tokens`): a colour table is any table containing hex colours, whatever its column wording; role words come from the row's other cells. A table that cannot be read, and any row without a hex, is gap-logged in the trace (FR-33-9), never dropped silently.
- Variant sets (`variant_sets.py`): an enum prop in `data-props` plus a script object keyed by its options. Inner key names are matched through a data table; an option counts if it maps an accent role. The rendered custom property (`facts["customProps"]`) says which option is active; when no rendered value confirms it, the accent entries are advisory.
- Usage (`usage_census.py`, `usage_js.py`): colours are counted in inline styles, hover styles, style blocks and JS values that flow into a style attribute through a template binding. Content data (product swatches, reviewer colours) is not styling and is not counted. A declared colour is promoted when used in a family its role allows; an undeclared one only with at least 25 uses and 90% in one family.
- The rendered value wins (FR-33-1): `surface` and `text` are checked against the rendered body (`declared_reconcile.py`); `primary` and `primary-text` come from the measured primary button, not from a README word (`presets.py`, `measure.js`).
- A row's Use text can fill a second slot (`palette_vocab.py::EXTRA_SLUG_TABLE`): a row naming a background and the footer ("Page background: body, header, footer") also fills `footer-bg`, and a row named "Footer background" fills it directly. The usage check stays a guard on the phrase table: a row such as "Card border" matches the surface phrase by its wording alone, and only the usage count (border, not background) stops it taking a background slot.
- A role the phrase table cannot place gets an ADVISORY proposal from usage rank (`usage_roles.py`), never a firm entry.
- Vocabulary (role words, column words, variant key names) lives in data tables (`palette_vocab.py`, `declared_sources.py`, `variant_sets.py`). Extending one is a one-line change; a role missing from every table is proposed from usage or logged, not lost.

**Done when (met on the Eye Care test site).** All 22 palette custom properties on the live page equal the snapshot at 1440px and 375px; no element paints the framework's old teal or amber; a README with different column and role wording yields a usable overlay (three wordings tested); Mama's Munches and Indus snapshots are byte-identical.

### FR-33-16 — Site palette overlay — BUILT

**Behaviour.** The palette is the base SGS palette (21 slugs, base order), overridden in place by declared and validated colours, plus a role-named addition only where no base slug fits (`text-label`, the small-label grey). It is never replaced or emptied, and it is generated once per site from the whole draft, never per page clone. Not palette: placeholder-tier README roles (faint, placeholder, disabled), third-party widget colours, and colours that drift between elements. They stay literal hex on the blocks that use them. Alternative accent sets are saved under `settings.custom.accentSets` (CSS variables, not picker swatches); the active set fills `accent`, `accent-text` and `accent-light`. `primary-dark` is derived from the final `primary`. Global defaults only: corner radius (square `0`, or an explicit pixel value into `borderRadius.medium`), `contentSize` and `wideSize` (wide never narrower than content), the measured heading weight (`heading_weight.py`), and button presets from measured buttons, including buttons that carry only runtime-generated classes (`GENERATED_CLASS_RE` in `measure.js`).

**Done when (met).** The Eye Care snapshot has the 21 base slugs plus `text-label`; none of the placeholder or drifting greys appears in it; nothing per element appears in it.

### FR-33-17 — Variable-font faces — BUILT

**Behaviour.** A self-hosted variable font declares a weight RANGE and uses the latin subset (`font_weights.py`). The weight probe tries `100..900`, then the range the draft's own font link requests, then `400..900`, then `300..700`; the family is static only if all are refused. The draft's font link is parsed as a URL, so multi-word family names match. An already-bundled face (Mama's Fraunces) is untouched.

**Done when (met).** On the Eye Care test site Outfit loads as `100 900` and Playfair Display as `500 700`; the H1 renders in Playfair Display at weight 500.

## Known limits

- **Saved values are not yet inserted.** The placeholder map is written but the pipeline does not yet replace `{{ phone }}`-style bindings with the saved Site Info values; that is the runtime-binding stage of Spec 31 (FR-31-26.6).
- **Primary hover text.** The button hover diff omits keys equal to the rest state and the merge keeps the framework value, so the primary button's hover text is the framework's `#ffffff`, not the draft's off-white.
- **README versus script.** They can disagree (Eye Care's navy accent); the script is what renders and wins. A README value is cross-checked against the render only for `surface`, `text` and `primary`.
- **`text-label` is a new slug.** No framework block reads it; it serves the converter's colour snap and the colour picker.
- **Vocabulary is data but finite.** A role no table names is proposed from usage (advisory) or logged.
- **Draft-facing gaps outside this spec.** A cloned page still paints its template buttons transparent and shows raw `{{ }}` text; both belong to the cloning pipeline (Spec 31, Spec 44), not to global-styles extraction.
- **File length.** `measure.js` (332 lines) and `extract.py` (over 700) exceed the file-length guide.
- **Other hosts.** `push-theme-snapshot.py --snapshot-ssh-host` defaults to the canary's login, so a non-canary site works only when it shares that Hostinger account.

## Test strategy (holistic)

| FR | Static / structural | Behavioural (real run) | Cross-check | Regression guard |
|----|---------------------|------------------------|-------------|------------------|
| FR-33-1 | every token has `_source`; grep: no raw-declaration emit for values | fixture declared≠computed → computed wins + logged | vs golden | dead-token → gap-log |
| FR-33-2 | role table present; ΔE=CIEDE2000; alpha-axis asserted | 3 systems → roles by table not name | vs the 3 verbatim token sets | rgba alpha not deduped; ambiguous → custom |
| FR-33-3 | rem resolves vs computed root; no fabricated values | reclone Mama's → quote 16px, lh 1.2, font loads | vs live computed-style | 62.5%-root fixture; wrong-base guard |
| FR-33-4 | clamp verbatim; `!important` stripped; hover = open bag | all declared types + both hover shapes land | vs §App A §D | fixture per value type |
| FR-33-5 | derived tagged `advisory`; relative-share threshold | token-less → advisory + no auto-live; nothing usable → baseline+skip | vs Pass-B-inverts-palette | parser-fail → halt |
| FR-33-6 | positive preview signal required | dark shell ignored; legit dark theme KEPT | vs the shell fixture | legit-dark-theme fixture |
| FR-33-7 | trace row per token; schema-validate pre-push | every draft → trace + golden diff | vs `expected/*.json` | malformed emit caught |
| FR-33-8 | deterministic sort keys | run twice → byte-identical | git diff clean | idempotence hard gate |
| FR-33-9 | grep no client literal; decorative→trace | every decl → slot or gap | conservation count | picker-not-flooded fixture |
| FR-33-10 | hex-map byte-identical golden | extractor uses composed map | vs converter output | no converter regression |
| FR-33-11 | backup-before-write + `--rollback`; diff-approve | Mama's only; rollback restores; drift warns | vs live payload | other-5 deferred behind reclone |
| FR-33-12 | orchestrator fail-closed gate | stale snapshot → fail; fresh → proceed; changed inline colour or script accent → fail | vs `(client,hash)` and `draft_source_sha256` | static drafts carry no second key |
| FR-33-13 | header/footer namespace reserved; token map = service | — | vs Spec 26/17 | colour-var entries re-pointed |
| FR-33-15 | vocabulary in data tables; gate `_declared_design`; unreadable table gap-logged | Eye Care live page = snapshot; 3 README wordings | vs the rendered body and primary button | Mama's and Indus byte-identical |
| FR-33-16 | overlay keeps all base slugs; only `text-label` added | placeholder and drifting greys absent | vs live custom properties | base-slug set unchanged |
| FR-33-17 | probe order tested with a faked network | live faces `100 900` and `500 700` | vs Google's declared range | Mama's Fraunces face equals its golden |

## Website-credit recognition (Part 2 — header/footer pipeline)

**Plain English:** when the pipeline clones a draft's footer, the "Website by Small Giants Studio" line must become the `sgs/business-info` `displayType="attribution"` element (Spec 02) — not a generic text block. This section is the recognition contract. It is the FIRST slot-mapping rule written for Part 2; extend the same shape for the remaining header/footer slots.

### Ground truth

Neither draft is recognisable without the classifier. Draft facts:

| Draft | Bottom-bar markup | Credit present? |
|---|---|---|
| Indus (`Indus-Foods-Food-Service-V3-With-Images.html`, `.footer-bottom`) | `<div class="footer-bottom"><p>© …</p><p>Website by Small Giants Studio</p></div>` | Yes — but a **bare `<p>`: no class, and NOT EVEN A LINK** |
| Mama's (`mockups/homepage/index.html`) | `<div class="sgs-footer__bottom"><span>© …</span><span>Made with love for breastfeeding mums 🍪</span></div>` | **NO — the 2nd slot is a TAGLINE** |

So there is nothing to match on, and the two drafts disagree on what the second slot even means. **A positional rule ("2nd child of the bottom bar = attribution") is therefore FORBIDDEN** — it would map Mama's tagline onto the agency backlink.

### The fix is at the DRAFT source, not in the converter

Per the standing rule (memory `fix-a11y-at-draft-source-not-the-clone`): a draft-inherited gap is fixed by editing the draft and re-cloning — **never** a converter carve-out. Two prerequisite draft edits:

1. **Add the classifier** `class="sgs-footer__credit"` to the credit element in every Bean-controlled draft. SGS-BEM per **Spec 00 §3 / §3.1**.
2. **Add the missing credit to the Mama's draft** — it has none. Its existing tagline span stays as a tagline and must map to `business-info displayType="description"`, not to attribution.

### Recognition — two independent recognisers (belt and braces)

| # | Recogniser | Rule | Why both |
|---|---|---|---|
| **R1 — classifier (primary)** | `.sgs-footer__credit` → emit `<!-- wp:sgs/business-info {"displayType":"attribution"} /-->` | Deterministic, BEM-first (R-31-2), zero heuristics. The canonical path for Bean-controlled drafts. |
| **R2 — content match (fallback)** | Element text contains **`by Small Giants Studio`** (case-insensitive) → reroute from a text/paragraph block to the attribution element | Catches scraped drafts and any draft that predates R1. Without it every such draft silently clones the credit as a plain paragraph — losing the element, its hover, and its typography contract. |

**R2 must not match on the URL** — existing Astra sites point the link at Bean's LinkedIn, so a URL match would miss them and an href-rewrite would silently preserve the wrong target. Match the TEXT; the block supplies the correct URL from `SGS_ATTRIBUTION_URL`.

**Content is DISCARDED on match, deliberately.** The attribution element takes no content/URL attrs (Spec 02) — its text and href are framework constants. The draft's credit text and href are recognition signals ONLY. Log the discarded original per R-31-4 (report, never silently skip) so a draft carrying a *different* agency's credit surfaces as a gap candidate rather than being silently rebranded.

### Acceptance

- Both drafts carry `.sgs-footer__credit`; Mama's has a credit at all; Mama's tagline maps to `description`, NOT attribution (the exact false-positive a positional rule would produce).
- A draft with the classifier but no matching text → R1 fires. A draft with the text but no classifier → R2 fires. Neither double-emits.
- The emitted block renders `.sgs-business-attribution` with the framework URL — never the draft's stale LinkedIn href.
- `/ui-ux-pro-max` enforces the classifier on every NEW draft it generates, so R2 stays a fallback rather than the norm.

## Appendix A — Corpus union inventory (the acceptance coverage set)
Full empirical inventory of every global declared default/preset/variable across the real draft corpus
(`sites/{mamas-munches,indus-foods,_dogfood}`, 8 authored mockups, 3 design systems).
The extractor's acceptance = correctly handling every row (via a golden per draft, FR-33-7).
KEY COVERAGE ANCHORS:
- **Colour roles + naming range (two philosophies):** role-named (`--primary`/`--surface-*`/`--text*`,
  Mama's+dogfood) vs literal-colour-named (`--navy`/`--gold`/`--green`/`--white`, Indus). Same role,
  different name (success `#2E7D4F` = `--success`/`--green`). Intra-brand drift (`--border` vs
  `--border-subtle`; `--accent-dark`/`--cookie-brown` present/absent across Mama's 4 files). One-offs
  `--cookie-brown`/`--whatsapp`/`--red`. Value types: 6-hex, `rgba()`, `var()`-ref, `clamp()` token,
  gradient (in rules).
- **Typography:** Fraunces+Inter (Mama's, px), DM Serif Display+DM Sans (Indus, **rem**), system-ui+
  Georgia (dogfood, **clamp**). 7/8 hardcode the family (no `--font` token → synthesise from base
  rules). 0/8 tokenise sizes/lh/tracking (derive from base+heading+preset). Unit variety (px vs rem;
  px vs em tracking). Three font-loading mechanisms (`<link>`, `@import`, system/none).
- **Base elements carrying globals:** `*` (reset, 3 shapes — normalise), `html`, `body`, `h1–h4`, `p`,
  `img`, `a`.
- **Presets:** `.container`/`.section` (contentSize 1200–1280), `.sgs-button--*`/`.btn-*` (2 hover
  shapes — colour-invert vs transform-lift), `.sgs-section-heading__label`/`.section-label` (eyebrow),
  skip-link, focus-visible, reduced-motion.
- **15 edge cases** (FR-33-4/5/6 coverage): two naming philosophies; intra-brand drift (union);
  un-tokenised typography (synthesise); zero type/radius/shadow tokens (derive, advisory); `:root`
  CSS-function value (`clamp()`); three reset shapes (normalise); three font-loading mechanisms; the
  dark PREVIEW-SHELL trap (FR-33-6); unit variety (unit-aware, rem-root-resolved); `!important` (strip);
  ad-hoc per-page colours (union); content-width outside `:root` (scan beyond); token-less Spectra
  scrape (Pass-B advisory or baseline-skip).

## Appendix B — Target theme.json slots (SGS theme baseline) + WP fluid facts
`theme/sgs-theme/theme.json` provides: `settings.color.palette` (16 named slugs, raw hex OK);
`settings.typography.fontFamilies` (body/heading/display/dm-sans + fontFace) + `fontSizes` (6-step,
NON-fluid — `small` 14 / `regular` 16 / `large` 20 / `x-large` 24 / `xx-large` 36 /
`hero` 50, every one `"fluid": false`) + `fluid` (declared but
inert — no preset opts in); `settings.spacing.spacingSizes` (8-step `10`–`80`); `settings.shadow.presets`
(sm/md/lg/glow); `settings.custom.{buttonPresets(primary/secondary/outline — each: background/text/
border/border-width/border-radius/padding/font-size/font-weight/min-height/hover-*), borderRadius
(small/medium/large/pill), transition/duration/easing, focus-ring}`; `settings.layout.{contentSize
1200, wideSize 1400}`; `styles.typography` (base body); `styles.elements.{h1..h6, heading, link,
button}`. **Namespace this spec reserves:** `settings.custom.header`/`.footer` (Part 2, FR-33-13; Part 2's concrete owner is `sgs/site-header`/`sgs/site-footer`/`sgs/nav-bar-menu`+`sgs/nav-drawer-menu`+`sgs/nav-drawer` per the header/footer/nav design-gate — those blocks' GLOBAL colour/typography/spacing defaults read the `settings.color.palette`/`settings.typography.*`/`settings.spacing.*` slots above directly; whether their header-specific settings use this reserved namespace is decided by Spec 37, see FR-33-13).
Deploy: `push-theme-snapshot.py` → disk `theme.json` + `POST /wp/v2/global-styles/{id}` (wp_global_styles;
overwrites the operator layer — FR-33-11 backup/diff/rollback guards this).
**WP fluid typography:** `settings.typography.fluid:true` auto-computes `clamp()` from a size; per-size
`fluid:{min,max}` gives explicit control. **BUT a draft's authored `clamp()` MUST be emitted verbatim as
the `size` string (theme.json accepts it)** — routing it through WP's fluid formula recomputes a
different curve (FR-33-4). Reserve `fluid:{min,max}` only for sizes the draft did NOT already clamp.
