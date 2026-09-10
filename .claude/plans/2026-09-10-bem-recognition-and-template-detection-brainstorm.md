---
doc_type: design-brainstorm
project: small-giants-wp
plan_name: 2026-09-10-bem-recognition-and-template-detection-brainstorm
generated: 2026-09-10
status: draft
authors: Claude (brainstorming skill, design mode)
primary_goal: "Give Bean a ranked menu — not a forced choice — for (1) recognising non-BEM draft sources and (2) detecting template-shaped pages, grounded in what the pipeline already does today."
motivation: "R-31-2 (BEM-only recognition) is correct for Bean-controlled drafts. The open question is whether it under-serves scraped/AI-generated/plain-HTML sources, and whether repeating pages are being hand-converted when they don't need to be."
parent_plan: null
---

# BEM recognition + template-shaped-page detection — design brainstorm

**Do not implement from this document.** This is research and a menu of options for Bean to pick from. No code was written or changed to produce it.

## Plain-English summary

**Problem.** The cloning pipeline only recognises a draft element as an SGS block if its class already looks like `.sgs-<block>__<element>--<modifier>`. Bean's own drafts always do. A scraped competitor page, an AI-generated mockup, or plain client HTML usually doesn't — Bootstrap classes, Tailwind utility classes, or no classes at all. Bean asked: is the BEM-only rule too strict for those other sources, and separately, should the pipeline notice when a page is really "one card repeated 40 times" and take a shortcut instead of converting all 40?

**Effect if left as-is.** Every non-Bean-authored source hits a hard stop today (see ground truth below) and has to be hand-remediated one section at a time before `/sgs-clone` can even start. Repeating pages (product grids, category archives) get converted section-by-section with no reuse of the fact that card 2 through 40 are the same shape as card 1 — more converter time, more chances for one card to drift from the others.

**Solution shape.** Two independent ranked menus below. Both start with a free/cheap rung (fix a proven bug, generalise an existing precedent) before any new capability gets built. Bean picks per-question; nothing here is a forced single path.

---

## Ground truth: what `lingua_franca.py` actually does today

Read in full: `plugins/sgs-blocks/scripts/orchestrator/lingua_franca.py`, its caller `plugins/sgs-blocks/scripts/orchestrator/stage1_boundary_hook.py`, the orchestrator wiring in `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`, both self-test files, and the non-BEM-halt test suite (`plugins/sgs-blocks/scripts/tests/test_orchestrator_non_bem_halt.py`).

1. **It is a pure class-name string mapper. It never sees the DOM.** `lingua_franca.py::convert_class` takes one class-name token and regex-matches it against six known "conventions" (SGS-BEM canonical, bare BEM, Bootstrap 5, kebab-semantic, Tailwind utility, shadcn/Radix). It has no access to tag name, sibling structure, or computed style — only the string itself.

2. **Two of the six rules always degrade to `sgs-container`.** `lingua_franca.py::_TAILWIND_UTILITY` and `lingua_franca.py::_SHADCN` both declare `"slot_map": {}`. Their regex patterns match almost anything, but with an empty slot-map every match falls through to `default_block: "container"` — so a Tailwind- or shadcn-styled hero, card, or CTA all become an undifferentiated container regardless of what they actually are. Only the other three rules (bare BEM, Bootstrap 5, kebab-semantic) carry real token→block mappings (`btn`→button, `card`→card-grid, `navbar`→header, `team-grid`→team-member, etc.).

3. **`shadcn`'s documented recovery path is dead code.** The rule's comment says "routing relies on data-* attrs, not class names" and carries a `data_slot_attrs: True` metadata flag, but `lingua_franca.py::_try_rule` never reads that flag or any `data-slot` attribute — it isn't wired to anything. The comment describes an intended fallback that was never built.

4. **Classless elements get zero signal.** If a source element has no `class` attribute at all (common in plain semantic HTML), `class_signature` is an empty list. `stage1_boundary_hook.py::_is_sgs_bem_canonical` returns `False` for an empty list, and `lingua_franca.py::convert_class_signature` returns `primary_sgs_bem: None` — there is nothing here that infers "this is a heading" or "this is a card" from tag shape alone.

5. **The documented classifier dispatch isn't wired.** Both `lingua_franca.py`'s module docstring and `stage1_boundary_hook.py::heuristic_classify`'s own comment say production should dispatch to `/uimax-classify-naming` for higher-confidence convention detection, with the in-file `heuristic_classify` existing only "so the hook is independently runnable in tests." A repo-wide search for `uimax-classify-naming` found it referenced in `orchestrator/README.md` prose and the `uimax-sgs-scrape-pattern` skill only — never called from the orchestrator or the hook's real call site (`sgs-clone-orchestrator.py::stage1_boundary_hook`, which invokes `sbh.enrich_stage1_payload(output)` with no classifier argument). Production always falls back to the cheap in-file regex heuristic.

6. **The one finding that matters most — the conversion is computed and then thrown away.** `lingua_franca.py`'s output (`primary_sgs_bem`, `equivalent_implementations`) is written into `voter.json` as enrichment metadata by `stage1_boundary_hook.py::enrich_boundary`. But the actual gate that decides whether a boundary gets converted, `sgs-clone-orchestrator.py::stage_4_5_6_7_8_extract`, checks `_is_sgs_bem_canonical()` against the boundary's **original, unconverted** `class_signature` — not against `primary_sgs_bem`. Confirmed directly in the halt code path (`sgs-clone-orchestrator.py`, the `_non_bem_warning` block) and in `test_orchestrator_non_bem_halt.py::TestNonBemHalt`, which asserts a non-canonical `class_signature` halts with `status: "unmatched-non-bem-compliant"`, empty `extracted_attributes`, empty `block_markup` — **regardless of what `lingua_franca` computed for it.** The halt warning tells the operator to either hand-reauthor per Spec 13 §8.1 or run `/uimax-sgs-scrape-pattern` — a separate, one-selector-at-a-time, LLM-assisted **manual** harvester (`~/.claude/skills/uimax-sgs-scrape-pattern/SKILL.md`) with an operator-confirm classification step, not a bulk automatic converter.

   **Net effect: `lingua_franca.py` today is a Rosetta-stone label written to a diagnostic file, sitting in front of a hard stop it never influences.** This is a proven, low-risk bug/gap, not a design question — the fix is "make the existing gate read the value the existing module already computed," not a new capability.

7. **Test coverage confirms the above, doesn't contradict it.** `test_lingua_franca.py` (10 self-tests) and `test_stage1_boundary_hook.py` (6 self-tests) both exercise only synthetic, pre-set tokens drawn from the six known conventions — `btn-primary`, `team-grid`, `css-x4j8m2k1`, etc. None of the 16 self-tests exercises classless HTML, a real scraped page, or the interaction between `lingua_franca`'s output and the Stage-4 halt. No test anywhere asserts that a successful `lingua_franca` conversion ever unblocks a clone, because today it never does. A repo-wide search for accuracy/coverage reports on `lingua_franca` turned up only script-reachability/line-count inventories (`.claude/reports/2026-08-24-script-cull-signals.json`) — no report measures real-world conversion accuracy against an actual non-BEM source.

**Assumption flags:** everything above is read directly from the code and its tests (PROVEN), not inferred from prose comments — where a comment claimed a behaviour (the `/uimax-classify-naming` dispatch, the shadcn `data-slot` routing), the claim was checked against the actual call sites and found unwired. Treat those two specific claims in the code's own comments as ASSUMED-FALSE, confirmed by absence of any call site.

---

## Question 1 — recognising genuinely non-BEM drafts

### Rater personas consulted

- **Forensics rater** (grounded in the code above): the module is real and structurally sound for what it does (token-level convention mapping), but its blast radius is far smaller than its docstring implies — two of six rules never differentiate anything, and its output is currently inert.
- **Regression rater** (what would this break for BEM-conformant drafts): the fast path in `stage1_boundary_hook.py::enrich_boundary` already isolates Bean's drafts — `_is_sgs_bem_canonical` short-circuits before any conversion logic runs, so nothing proposed here touches that branch *unless a future option explicitly says so* (flagged where relevant below).
- **Pragmatist** (smallest safe increment): rank by cost, and don't reach for a new capability class until the cheap rungs are shipped and measured against a real non-BEM source.

### Ranked menu

**Tier 0 — wire the existing output into the gate (recommended first step).**
`lingua_franca.py` already computes a usable `primary_sgs_bem` for every Bootstrap-5, bare-BEM, and kebab-semantic class it recognises. Today that computation is discarded at `stage_4_5_6_7_8_extract`'s canonical-check gate. Making the gate consult `primary_sgs_bem` (or an "is convertible" flag derived from it) when the raw `class_signature` fails the canonical check would let already-recognised conventions through without writing a single new recognition rule.
- *Cost:* smallest — no new heuristics, no new data, just reading a value that's already computed.
- *Risk:* provably bounded — it can only affect boundaries that currently hard-halt anyway (`_is_sgs_bem_canonical` is unchanged for the canonical branch), so it cannot regress a boundary that passes today.
- *Value:* immediate, and gives real measurement — running this against one real Bootstrap-ish or bare-BEM source tells you what fraction of non-BEM content the existing three real rules already rescue, before spending anything on Tier 2/3.
- *Not this brainstorm's job:* the wiring fix itself is implementation, not design — flagged here only so it's visible as the obvious first rung, not designed in detail.

**Tier 1 — fill in the two weak rules (still string-only, no new capability class).**
Two concrete, bounded gaps in the existing architecture, each a data addition not a new mechanism:
- Populate `_TAILWIND_UTILITY`'s and `_SHADCN`'s slot-maps with real component-name tokens (Tailwind component libraries and shadcn primitives do carry recognisable names even inside utility soup — `card`, `dialog`, `badge`, etc. — they're just not captured yet).
- Wire the `data_slot_attrs` flag that `_SHADCN` already declares: read `data-slot="..."` attributes (shadcn's real identity signal, per its own convention) instead of relying on class names for that convention alone.
- *Cost:* low — data-table growth plus one small new attribute read, no architectural change.
- *Risk:* none for BEM drafts (same untouched fast path); low elsewhere since it only adds recognition where there is currently none.
- *Value:* directly targets the two conventions AI-builder output and scraped competitor pages are most likely to use.

**Tier 2 — heuristic tag-role inference by DOM shape.**
A genuinely new recognition path: infer block identity from structural signal instead of class name — heading level and position → hero/section-header candidate; `<button>`/anchor-styled-as-button → CTA; N near-identical sibling `<article>`/`<div>` nodes under one parent → card-grid; landmark tags (`<nav>`, `<header>`, `<footer>`) → header/footer, extending the walker's existing `SKIP_TOP_LEVEL_TAGS` precedent (R-31-3's permitted "atomic-tag swap" exception) rather than inventing a fourth kind of exception.
- *Cost:* moderate — new classifier logic, needs its own test suite against real (not synthetic) non-BEM fixtures.
- *Risk:* **must feed the pipeline's existing gap-candidate / operator-review flow** (`leftover-buckets.json`, bucket-c classifier) rather than silently asserting a block identity — a shape guess is lower-confidence than an authored class and should be treated that way. **Hard constraint for whenever this is built:** DOM-shape inference must never be consulted when an element's `class_signature` is already SGS-BEM canonical, even partially — otherwise a Bean draft mixing one authored BEM class with one incidental utility class on the same element could have its role silently overridden by a shape guess instead of respecting the authored identity. This is a design constraint to carry into the eventual build, not something to resolve now.
- *Value:* the only option here that helps genuinely classless plain-HTML sources, which Tier 0/1 cannot touch at all.

**Tier 3 — visual/computed-style clustering.**
Render candidate elements (via Playwright) and cluster by rendered box size, position, and typography to group repeating structures or identify a hero region, independent of markup entirely.
- *Cost:* highest — a real headless-render pass per candidate element, new infrastructure, slow.
- *Risk:* unproven need — nothing measured so far shows Tier 2 is insufficient, because Tier 2 doesn't exist yet to measure against.
- *Value:* speculative until Tier 2 is shipped and shown to still miss real cases.

### Recommendation

Ship Tier 0, then Tier 1, in that order — both are near-free and either could turn out to close most of the real gap once measured against an actual non-BEM source (nobody has measured this yet; that's a finding in itself). Only invest in Tier 2 if, after Tier 0+1 ship and get run against a real scraped page or two, a meaningful fraction of boundaries still hard-halt. Do not start Tier 3 without first shipping and measuring Tier 2 — there is currently zero evidence it's needed.

### Explicit non-choice, for completeness

**Tier 4 — declare arbitrary-HTML recognition out of scope, formally.** This is already what happens today by default (hard halt, manual remediation via `/uimax-sgs-scrape-pattern`) — the only change would be documenting it as a deliberate policy rather than an accidental gap. Listed for completeness, not recommended, since Tier 0 costs almost nothing and already improves on the status quo.

---

## Question 2 — detecting template-shaped pages

### Ground truth / existing precedent

WooCommerce shop archives already avoid per-card cloning: Spec 30 (`​.claude/specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md`, FR-30-3, shipped D213) routes the archive to WordPress's native **Product Collection** block — a real query-loop mechanism — rather than hand-converting each product card. So "genuinely repeating content routes to a native loop instead of N flat conversions" isn't a new idea; it has one shipped instance, scoped to WooCommerce specifically.

### The universal/no-carve-outs constraint (CLAUDE.md Rule 3)

Any detection signal that is itself platform- or client-specific — e.g. "if the URL matches `/shop/` or `/product-category/`" — is exactly the kind of per-case exception Rule 3 forbids: it only fires for one platform and needs a brand-new rule for every future CPT/archive URL shape a client happens to use. The signal has to be structural to be universal.

### Ranked menu

**Tier 1 — structural repeated-sibling detection (recommended).**
Detect, at boundary level, whether a container has N or more near-identical sibling children — same tag shape and near-identical class signature — above a tunable threshold. This reuses the same fingerprinting idea `/uimax-sgs-scrape-pattern` already computes for pattern dedup (`sha256(normalised_html + sorted_css_var_dump)`, per its Stage 3), applied sibling-to-sibling within one boundary instead of pattern-to-library. When it fires, convert **one** representative sibling fully, verify its fidelity, and apply the same converted structure as a loop (a native repeating block — Query Loop/Product Collection-equivalent for CPT archives, a repeated InnerBlocks template for a plain hand-authored card grid) instead of hand-converting every sibling individually.

This also covers the "optional recurring sections" half of the question (e.g. "related products" present on some pages of a template family, absent on others): once a page is recognised as belonging to a repeating template family, diff its boundary set against sibling pages of the same family. A section present in every instance is core; a section present in only some becomes a conditionally-rendered optional slot (matching an existing role from the `roles`/`slot_synonyms` DB tables) instead of being treated as a fresh gap candidate every time it happens to be missing.

This is Rule-3-compliant precisely because the condition is "repeated near-identical structure," not "is this WooCommerce" — the WC archive case simply becomes one instance that already qualifies, and the Spec 30 precedent generalises rather than staying a special case.
- *Cost:* moderate — new structural-diff logic, but it reuses an existing fingerprinting technique rather than inventing one.
- *Risk:* needs a real operator/Bean sign-off step on the ONE representative converted instance before it's stamped across N siblings (per R-31-13, Bean's eye is co-authoritative on fidelity) — never a fully silent bulk-apply.
- *Value:* generalises a proven, shipped precedent to every repeating-content page, not just WooCommerce.

**Tier 2 — explicit operator flag, as a fallback/override only.**
Let Bean force template-mode on or off at clone time for edge cases the structural detector gets wrong — e.g. only 2 cards visible above the fold with more below, or a grid that looks repeating but is deliberately hand-varied per item.
- *Cost:* trivial — one CLI flag.
- *Risk:* none; it's a safety valve, not the detector.
- *Value:* cheap insurance, but adds no automation on its own — per CLAUDE.md's "AI independence" philosophy (get it right first time, need less manual intervention over time), this should sit alongside Tier 1, not replace it.

### Not recommended: WC/CPT archive URL pattern as the *detection* mechanism

Explicitly the Rule-3 violation the question asked to avoid. Flagged so it's visible as the excluded option, not silently dropped: URL-pattern matching is fine as an **output-routing** decision after structural detection has already fired (e.g. "this boundary was independently detected as template-shaped, and it also happens to sit on a WC archive URL, so route its output specifically to Product Collection rather than a generic repeated InnerBlocks template") — but it must never be the trigger that decides "should this get template treatment at all."

---

## NOT recommended now

Collected in one place per the deliverable brief, so nothing here reads as quietly endorsed:

1. **Q1 Tier 3 (visual/computed-style clustering).** Expensive, speculative, no evidence of unmet need until Tier 2 ships and is measured against real sources.
2. **Q2: URL-pattern-keyed template detection as the trigger.** A direct CLAUDE.md Rule 3 violation — explained above, not merely omitted.
3. **Any DOM-shape heuristic (Q1 Tier 2) firing on a boundary that carries any SGS-BEM class, even partially.** Not a rejection of Tier 2 itself — a hard constraint to carry into that build, flagged now so it isn't forgotten later.
4. **Silent bulk-apply of an inferred repeater template (Q2 Tier 1) without a Bean/operator sign-off step on the representative instance first.** R-31-13 already makes Bean's eye co-authoritative on fidelity; a template shortcut is exactly the kind of change that must not skip it.
5. **Treating "not wired to the gate" (the Q1 §6 finding) as something to redesign.** It's a bug in an existing, already-correct mechanism — the fix is mechanical (Tier 0), not a design decision, and shouldn't be scoped alongside genuinely new capability work.

---

## Open questions for Bean

1. Q1: ship Tier 0 alone first and measure, or bundle Tier 0+1 together since both are cheap?
2. Q2: is the sibling-count threshold for "this is a repeating structure" something to tune empirically against a real scraped archive page, or does Bean have a number in mind already (e.g. "3+ near-identical siblings")?
3. Does either menu warrant a `/qc-council` pass before dispatch, given both introduce a new gate behaviour (Q1 Tier 0 changes what unblocks a clone; Q2 Tier 1 changes what gets bulk-applied) — or is a straight `/strategic-plan` sufficient once Bean picks?
