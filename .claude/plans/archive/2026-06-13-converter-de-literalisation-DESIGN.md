---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Converter de-literalisation — DESIGN PASS (per-literal verdicts + mechanism + waves), feeds /adversarial-council"
created: 2026-06-13
status: ARCHIVED/SUPERSEDED 2026-06-23 (doc audit) — the entire method (edit convert.py's per-block `if slug==` literals) is dead: D229 (D-MODULAR) FROZE convert.py for a clean modular rebuild. The goal (no per-block literals, DB-first) is inherited by the rebuild (Spec 31 §12) — new resolver files carry no per-block literals by construction. The per-literal verdicts here are reference intel for the rebuild architect. Parking P-CONVERTER-DE-LITERALISATION closed (→ memory/parking-archive.md, SUPERSEDED by D229). ORIGINAL: SCOPE LOCKED (Bean chose Option 1 — verify-dead + clean + register, 2026-06-13). NOT yet council-GO'd. NO code until /adversarial-council returns GO (Rule 7).
parent: .claude/plans/2026-06-13-converter-de-literalisation-audit.md (the register)
template: align-router D222 (commit c5ecb4eb) — find the universal DB primitive that already exists, route the literal through it, prove byte-identical via roster parity + conformance, keep a SMALL DOCUMENTED exception set.
---

# Converter de-literalisation — DESIGN PASS

## Plain-English summary (for Bean)

**Problem.** `convert.py` (the script that turns a mockup into WordPress blocks) has ~13 hand-written `if this is the "trust-bar" block do X` branches. Bean's rule (FR-22-3) is that per-block behaviour should come from the **database**, not from special-case code. So the goal is to remove those branches where a DB-driven path can do the same job.

**What I found after reading the actual code + the FULL DB (not assuming) — revised after Bean's challenge to use the full table range.** It is **not** a clean "rip out 13", but the reducible surface is **bigger** than my first pass — because most literals are **DB-classification compensators**: the branch only exists because the block's attrs are mis-classified or unclassified in the DB, so the existing universal mechanism can't pick them up. Complete the classification → the universal mechanism takes over → the branch goes. This is the **exact align-router (D222) pattern** (add the `property_suffixes`/`role` row, remove the fork). The honest split:
- **1 branch cleanly removable** — `sgs/text`: the universal fallback already does its exact job.
- **3 reducible via DB classification** — `iconCircleBackground` (role=None today → set `role=color`+selector → colour routing covers it), `testimonial` typography (5 attrs mis-roled → fix roles+selectors → CSS routing covers them), `notice-banner` background (Background suffix already maps to colour role).
- **3 partly removable** — `sgs/heading`, `sgs/button`, `sgs/quote`: the *text* part goes to the DB path, but each keeps one transform the DB path can't do (`level` from tag, secure `url`, array-wrap).
- **~6 legitimate exceptions** — `sgs/media` (image/video extraction), `sgs/option-picker` + `sgs/icon-list` (complex arrays), `sgs/icon` (emoji detection), `sgs/trust-bar` badge-array, `core/*` (the lift is `sgs/*`-only; core attr shapes differ). These do real work the DB model genuinely doesn't cover. Forcing them universal would be the *over-broad-universality* break Rule 3 warns against.

**The one spec trap (FR-22-2.4, line 144).** 51% of attrs are "correctly NULL by design" (styling/identity attrs) and forcing `canonical_slot` onto them corrupts the role-exclusion guarantee. So every "reduce-via-classification" fix above classifies for the **CSS-routing** mechanism (`role=color`/`typography` + `derived_selector`) — it must **never** add `canonical_slot` (content-routing) to a styling attr. The council verifies this boundary per wave.

**Effect.** The valuable, low-risk outcome is **not** maximum deletion. It is: remove the 1 clean + the verified-dead ones, reduce the partials' text-portion to the DB path, and **convert the rest into a documented, permitted-exception register** — so every literal is either (a) DB-driven, or (b) an explicitly-justified exception under R-22-3's atomic-tag-swap allowance. That satisfies FR-22-3 ("per-block behaviour = DB rows, not code branches") in spirit without risking every clone on a forced rewrite.

**Solution.** Phased waves below, each council-gated and conformance-locked. The align-router (D222) is the template: route through the primitive that already exists, prove byte-identical, keep a small documented exception set.

---

## Architecture ground-truth (verified this session, evidence-first)

Two functions, two paths:

| Path | Call site | What runs | `allow_text_fallback` |
|------|-----------|-----------|----------------------|
| **Leaf / atomic-tag-swap** | `emit_atomic` (2834), walk (3818), final emit (5019) | `_atomic_attrs_for` only — reads content from the **node itself** (`_rich_text_content(node)`) | `True` (default) |
| **G3-attrs** (content-block, `has_inner_blocks=0`) | walk (4201–4211) | `_atomic_attrs_for` (explicit handlers, **fallback off**) **+** `_lift_scalar_attrs_by_selector` (universal). Merge: selector-lift first, atomic **wins** | `False` |

Key facts that drive the verdicts:
1. **`_lift_scalar_attrs_by_selector` matches CHILD elements** (`node.find(class_=derived_selector)`). Leaf content lives **on the node** (`<h1 class="sgs-hero__title">`), so the universal lift does **not** reach leaf content — the leaf path's `_rich_text_content(node)` does.
2. **The graceful fallback (3365–3382)** already does a DB-driven leaf lift: query `block_attrs(slug)`, find the first `content`/`text-content` **string** attr, lift `_rich_text_content(node)` into it. It is `sgs/*`-only and string-only (skips arrays). **This is the universal leaf primitive that the explicit handlers duplicate.**
3. **Only `sgs/testimonial` + `sgs/team-member` hold the `scalar-content-lift` capability** — the universal selector-lift is currently opt-in to those two only.
4. **`core/*` blocks are DB-catalogued** but the lift mechanism gates `slug.startswith("sgs/")`, and core attr shapes differ (`level` int, `value`, `content`). The DB does not drive core extraction today.

---

## Per-literal verdict register (grounded in code + DB this session)

Line numbers re-verified against `convert.py` @ commit `c5ecb4eb` (file is 5677 lines; `_atomic_attrs_for` @ 2914, `_lift_scalar_attrs_by_selector` @ 3385).

| # | Line | Literal | Verdict | Mechanism / reason |
|---|------|---------|---------|--------------------|
| 1 | 2945 | `sgs/text` (p/span/div)→`{text}` | **REDUCE (clean)** | Graceful fallback (3365) already lifts node text into `text` (its only content-string attr). Remove the branch; fallback covers it. Roster-parity must prove byte-identical incl. the tag-gate semantic (fallback has no tag gate — confirm no regression on non-p/span/div nodes resolving to sgs/text). |
| 2 | 2936 | `sgs/heading` (h1–h6)→`{content, level}` | **PARTIAL** | `content` → fallback covers. `level=tag` is a **tag-shape transform** — not content. Options: (a) keep a minimal `level`-only branch; (b) add a generic "heading-level from tag" rule keyed by a DB role (`heading-level`). Lean (a) — smallest, documented exception. |
| 3 | 3001 | `sgs/button` (a/button)→`{label, url}` | **PARTIAL** | `label` → fallback covers. `url` = `_safe_href(href)` — **security-bearing href extraction**, no content role. Keep a `url`-only branch (security MUST stay in code). Document as exception. |
| 4 | 3011 | `sgs/quote` (blockquote)→`{body:[text]}` | **PARTIAL** | `body` is an **array** of rich-text; fallback skips arrays (string-only). Either extend the fallback to wrap into a single-item array when the content attr is `array` type (universal), or keep. Lean: extend fallback (`attr_type=='array'` → `[text]`) — turns 1 literal into a universal rule that could also serve future array-content leaves. Council to weigh. |
| 5 | 2956 | `sgs/media` (img)→imageUrl/imageAlt/maxHeight/objectFit | **KEEP (exception)** | Genuine media extraction: `src`/`alt` + CSS `height`→`maxHeight`+unit + `object-fit`. Not text. `_lift_scalar_media_from_img` exists but the height/objectFit CSS lift is media-specific. Document as atomic-media exception. |
| 6 | 2978 | `sgs/media` (video/iframe)→mediaType/videoUrl | **KEEP (exception)** | Media-type-specific embed extraction. Document. |
| 7 | 3019 | `sgs/icon-list` (ul/ol)→`{items:[{icon,text}]}` | **KEEP (exception)** | List→array extraction with per-item `{icon:"check", text}`. Complex array. Document. |
| 8 | 3035 | `sgs/option-picker` (div/fieldset/…)→optionItems[] | **KEEP (exception)** | Complex pill-array extraction + `defaultSelected` + `typeKey` from aria-label. Genuine. Already cited as the precedent for an explicit handler. Document. |
| 9 | 3091 | `sgs/icon`→emoji-vs-slug routing | **ASSESS → likely KEEP** | Content-TYPE routing (emoji char vs lucide slug). Could be a DB `icon-identity` role, but specialised. Lean keep+document; council to test reducibility. |
| 10 | 3111 | `sgs/testimonial` (css_rules)→typography attrs | **REDUCE via classification (align-router pattern)** | **DB evidence:** the 5 attrs have **miscategorised roles** (`nameFontWeight`→`content`, `ratingSize`→`content`, `quoteStyle`→`behaviour`) and **no granular `derived_selector`** to the named child elements. That mis-classification is *why* the universal CSS-routing (`property_suffixes`-driven) can't pick them up — so the literal compensates. **Fix:** correct the roles (`typography`/`color`) + add granular `derived_selector`s (`.sgs-testimonial__text`/`__stars`/`__author`) via a dated migration + `ATTR_CLASSIFICATION_OVERRIDES`; the existing CSS-routing then covers them; remove the branch. **Constraint (FR-22-2.4):** classify for CSS-routing (`role`) ONLY — do NOT add `canonical_slot` to these styling attrs (would corrupt the FR-22-2.2 role-exclusion). |
| 11 | 3158 | `sgs/notice-banner` (css_rules)→background | **REDUCE / likely-redundant** | `property_suffixes` already maps `Background`/`Bg`→`role=color`→`background-color`. The colour-CSS routing primitive exists; this hand-read is a "no-op guard". Empirically confirm on page-8 that `route_node_css` already lifts the disclaimer background; if so → remove. If a gap remains, close it via the same classification fix, not the literal. |
| 12 | 3191–3334 | `sgs/trust-bar` badge-array + badgeStyle + grid | **KEEP (exception)** | Badge-array extraction + `icon_resolver` + variant `badgeStyle` + name-free grid (already routes via `_detect_grid_container_from_css`, 3318 — NOT a literal). Genuine composite extraction. `badgeStyle` could route via `variant_slots` (assess). Document the array core. |
| 13 | 3335–3350 | `sgs/trust-bar` `iconCircleBackground` hand-read | **REDUCE via classification (resolves the contradiction)** | **DB evidence:** `iconCircleBackground` has `role=None`, `canonical_slot=None` — totally unclassified. THAT is why it needs a hand-read. **Fix:** set `role=color` + `derived_selector=.sgs-trust-bar__icon` (via dated migration / override) → it flows through the existing colour-CSS routing exactly like every other colour attr; remove the hand-read. This resolves the register-vs-decisions.md contradiction **in the register's favour** — it IS reducible to a DB mapping. The prior council's "keep typed" was scoped to the align-router work, not a colour-routing ruling. **Constraint (FR-22-2.4):** add `role=color` for CSS-routing, NOT `canonical_slot`. Council confirms byte-identical via roster parity. |
| 14 | 2744/4219 | multi-button grouping | **ALREADY DB-DRIVEN** | `_group_loose_buttons` gated by `db.block_for_slot_token("button-group")` (4219) — already DB-driven, literal is a fallback safety-net. NOT a target (register row 2744 is stale — the live grouping path is DB-driven). |
| — | core/* (2940, 2948, 2986, 3004, 3014, 3354) | core block handlers | **KEEP (exception)** | DB lift is `sgs/*`-only; core attr shapes differ (level int, value, content). Making core DB-driven is a separate, larger change with its own risk. Document as "core-not-DB-modelled" exceptions. |

**Tally:** 1 clean reduce · 3 partial (text→DB, keep transform) · 2 verify-redundant · ~7 documented exceptions · 1 contested (council) · multi-button already-DB.

---

## The reduction mechanism (for the REDUCE + PARTIAL rows)

Reductions route through the **graceful fallback** (the existing universal leaf primitive), extended minimally and DB-backed:

1. **Clean text leaves** (sgs/text): remove the branch; the fallback's first-content-string-attr lift handles it. No DB change needed (role/derived_selector already present).
2. **Array-content leaves** (sgs/quote): extend the fallback — when the first content attr is `attr_type=='array'`, emit `[_rich_text_content(node)]`. Universal rule, not a per-slug branch. Backed by existing `role`/`attr_type` DB columns.
3. **Transform-bearing leaves** (heading `level`, button `url`): keep a **minimal, documented** branch for ONLY the non-content transform (level from tag; secure href). The content portion routes through the fallback. This shrinks each literal to its irreducible core.

**DB changes (if any) follow the canonical path:** dated `migrations/*.py` for new property/seed rows; `ATTR_CLASSIFICATION_OVERRIDES`/`HAS_INNER_BLOCKS_OVERRIDES` for per-attr/composition; reproduced by a **full `/sgs-update` reseed** — never a manual DB edit or module-load side-effect ([[db-changes-reproducible-via-migration-not-manual-or-moduleload]]).

---

## LOCKED SCOPE — Option 1 (Bean, 2026-06-13)

In scope: **Wave 0** (verify-dead: testimonial-typo 3111 + notice-banner-bg 3158 — remove only what's proven dead / reduce via classification), **Wave 1** (clean reduce: sgs/text 2945), **Wave 4** (iconCircleBackground reduce-via-classification), **Wave 5** (exception register for media/icon-list/option-picker/icon/trust-bar-array/core/*).
OUT of scope (deferred, NOT this programme): **Wave 2** (array-fallback extension) + **Wave 3** (heading/button partial-shrink) — the marginal-gain, higher-churn partials. Parked in this doc for a future pass.

## Phased waves (council-gated, conformance-locked, sequential on shared convert.py)

Each wave: sonnet subagent implements (NO commit authority) → `/qc-council` (cross-family raters) → roster-parity 0-mismatch + **BOTH** conformance suites green (Gate A golden harness `scripts/tests/test_converter_conformance.py` 43 + `converter_v2/tests/` 26) → re-clone + live page-8 verify → main-agent commits by explicit path.

- **Wave 0 — VERIFY-REDUNDANT (lowest risk, highest clarity).** Empirically test on page-8 whether testimonial-typography (3111) + notice-banner-bg (3158) are already covered by `_lift_typography_to_block_attrs` / `route_node_css`. Remove only what is proven dead. *(Do this first — it's measurement, not rewrite, and de-risks the premise.)*
- **Wave 1 — CLEAN REDUCE.** Remove sgs/text (2945) branch; prove fallback byte-identical via roster parity.
- **Wave 2 — ARRAY-FALLBACK EXTENSION.** Extend graceful fallback to array-content; remove sgs/quote (3011) branch.
- **Wave 3 — PARTIAL SHRINK.** Reduce heading (2936) + button (3001) to transform-only branches; route content via fallback.
- **Wave 4 — CONTESTED.** trust-bar `iconCircleBackground` per the council's verdict (reduce to colour-role DB mapping OR document as exception).
- **Wave 5 — EXCEPTION REGISTER.** Document every KEEP literal (media, icon-list, option-picker, icon, trust-bar array, core/*) in a new `convert.py` module docstring + Spec 22 §FR-22-3 exception list, each with its R-22-3 justification. This is the deliverable that makes FR-22-3 *true*: every literal is now DB-driven OR explicitly-permitted.

---

## Open questions for the /adversarial-council (the Rule-7 gate)

1. **iconCircleBackground (row 13):** reduce-to-DB or documented-exception? Resolve the register-vs-decisions.md contradiction with fresh eyes + the actual code.
2. **Array-fallback extension (Wave 2):** is universalising the fallback to arrays a real simplification, or does it risk dumping text into array attrs on blocks that shouldn't receive it (the same trap `allow_text_fallback=False` was added to prevent)?
3. **Partial-shrink value (Wave 3):** is a `level`-only / `url`-only minimal branch genuinely cleaner than the current `{content, level}` branch, or is it churn that adds a fallback dependency for marginal literal-count reduction?
4. **Exception register sufficiency:** does documenting the KEEP literals actually satisfy FR-22-3, or does FR-22-3 demand they ALL become DB-driven (in which case the programme is far larger and riskier)?
5. **Is the whole programme worth the blast risk?** convert.py touches every clone. The honest reducible surface is small (1 clean + a few partials). Does the FR-22-3 cleanup justify the per-wave council+conformance cost, or should it be deprioritised behind the ~14 OPEN clone-fix ledger rows?

---

## /adversarial-council VERDICT — NO-GO as written (2026-06-13, 6 personas)

**Convergent headline (5 of 6 personas, independently): the core mechanism is factually wrong for 2 of 4 waves.** The design assumed "give the attr `role=color`/`typography` + a `derived_selector` and the existing universal CSS-routing takes over." Tracing the actual code refutes this:
- `_lift_scalar_attrs_by_selector` (3385) — the ONLY routine that reads `derived_selector` to reach a CHILD element — hard-filters to `role in {text-content, content, rating, image-object}` (3443-3452). It **skips `color`/`typography`**. Adding `role=color` routes through NOTHING.
- `_lift_typography_to_block_attrs` / `route_node_css` (the colour/typography lift) reads CSS from **`node` itself** (the block root), name-keyed (`background-color → backgroundColour`), gated by `attr_name in block_attr_map`. It does NOT read `role`/`derived_selector` at all and does NOT do `node.find(class_=...)`.
- **Therefore no universal mechanism today consumes a `color`-role child-selector attr.** The hand-reads at 3111 (testimonial typo) + 3335 (iconCircleBackground) exist *because* they reach into named CHILD elements — which nothing universal does. Deleting them with only a DB-classification change **silently drops** the testimonial typography + trust-bar icon-circle background on every clone = a regression, NOT byte-identical. Making them work needs a NEW child-selector colour/typography mechanism (high-blast, its OWN design-gate) that would over-fire across 8 sibling `role=color + derived_selector` attrs (cta-section.buttonBackground, hero.contentBackground, …) unless opt-in-gated — the exact testimonial-over-fire precedent repeating.

**Other convergent must-fixes:**
- **FR-22-2.4 trap is ALREADY in the data:** `nameFontWeight`/`ratingSize`/`quoteStyle` already carry `canonical_slot='quote'`. And `assign-canonical.py` only processes `canonical_slot IS NULL` rows → a `property_suffixes` migration won't touch them; the ONLY durable path is `ATTR_CLASSIFICATION_OVERRIDES`. The doc's "dated migration" framing was wrong for these.
- **iconCircleBackground: D216 (2026-06-12, WS-C) is a real prior 6-persona council ruling** — "iconCircleBackground stays typed", NOT scoped to align-router. The design's adjudication ("prior council scoped to align-router") is unsupported editorial assertion (R-22-7 violation). Keep typed unless re-opened with the prior reasoning + new evidence before a council.
- **"Byte-identical via roster parity" is theatre for styling attrs** — clone-parity pairs by BEM class; native output doesn't carry them, so a styling delta (ratingSize=16 vs absent) passes parity. Need a direct emitted-attrs JSON diff + computed-style probes.
- **"Live page-8 verify" has no computed-style probes specified** — for styling waves the gate must be before/after `getComputedStyle` on the actual painted child elements (probe spec supplied by the live-verify persona), not emit/JSON parity.
- **MISSING — enforcement guard:** nothing stops a future session adding a 14th `if slug==`. A lint (sibling of `check-dead-controls.js`) grepping `_atomic_attrs_for` for `slug ==` literals not in a documented exception allow-list is what makes FR-22-3 STRUCTURALLY true. (Highest-value, zero-blast.)
- **MISSING — FR-22-3 scope ambiguity:** FR-22-3's PASS test counts slug literals in the WALKER `walk()` (which has 0) — the literals live in `_atomic_attrs_for`, called FROM walk. Strictly, the codebase may already pass the literal test. Resolve whether `_atomic_attrs_for` is in FR-22-3 scope before claiming the programme is needed.

**Grades:** Cynic C+ · Ship-PM B-/D(ROI) · Regression D · Spec-Lawyer C+ · DB-Realist B- · Live-Verify D.

**Honest reducible surface after the council: essentially ONE branch — `sgs/text` (Wave 1)** — and even that needs a corpus check that no sgs/text node arrives with a tag outside p/span/div (the fallback has no tag gate). `notice-banner` (3158) MAY be genuinely dead for the ROOT element (notice-banner declares `color.background` support → `_lift_root_supports_to_style` writes `style.color.background`) — needs the call-order + computed-style check. Testimonial + iconCircleBackground = KEEP/document (need a mechanism that doesn't exist). **Ship-PM verdict: DEFER the whole programme behind the ~14 OPEN customer-visible ledger rows; it moves zero pixels.**

**STATUS: NO-GO as designed. Re-decision required (see handoff to Bean).**

## Acceptance (Task 1)

A council-GO'd, phased build plan where each literal has a verdict (reduce → which DB rows/migration; or keep → documented R-22-3 justification), with the 5 open questions resolved by the council.
