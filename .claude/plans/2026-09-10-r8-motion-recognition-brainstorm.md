---
doc_type: design-brainstorm
project: small-giants-wp
plan_name: 2026-09-10-r8-motion-recognition-brainstorm
generated: 2026-09-10
status: draft
authors: Claude (brainstorming skill, design mode)
primary_goal: "Give Bean a ranked menu — not a forced choice — for recognising motion/animation intent from a non-SGS-authored source's raw CSS, and mapping it onto the existing fx-preset system, grounded in what the pipeline already does today."
motivation: "R9 (2026-09-10 capability-coverage inventory) confirmed motion is the framework's single biggest cloning gap: ~2,880 declared fx attributes, effectively zero converter code recognising motion from raw CSS. The plumbing (attribute lift, DB roster) already exists for SGS-authored drafts — the open problem is recognition from an arbitrary source, which is harder and needs its own design."
parent_plan: .claude/plans/cloning-pipeline-tier-migration-requirements.md (R8)
---

# R8 — motion/animation cloning from raw CSS — design brainstorm

**Do not implement from this document.** This is research and a menu of options for Bean to pick from. No code was written or changed to produce it.

## Plain-English summary

**Problem.** When Bean authors a draft himself using SGS's own motion markers (`data-sgs-fx="scrub"` and friends), the cloning pipeline already recognises and converts it correctly — that part is built and working. But when the source is a scraped competitor site, an AI-design export, or any HTML that wasn't authored with SGS's own vocabulary, the pipeline has **no way at all** to recognise that a CSS `@keyframes` block or `animation`/`transition` declaration represents a fade-in, a hover pulse, a parallax drift, or anything else — it simply doesn't look, so all of it is silently dropped on clone.

**Effect if left as-is.** A cloned page that had genuine motion character on the source site — scroll reveals, staggered entrances, hover feedback — comes out completely static. Given the "Awwwards-level output" bar set for this pipeline, motion is arguably the single highest-value gap: R9 measured it as the framework's largest capability-coverage shortfall of anything checked.

**Solution shape.** A tiered menu, same discipline as the earlier BEM-recognition brainstorm: start from what already exists and is cheap to extend, and only reach for something genuinely new and expensive once a cheaper tier is shipped and proven insufficient. The hard part isn't storage or plumbing — the DB-backed fx-attribute roster and lift mechanism already handle that correctly for SGS-authored motion. The hard part is **recognition**: telling one kind of raw CSS animation apart from another when every site names its keyframes differently and triggers them differently.

---

## Ground truth: what the pipeline actually does today

Read in full: `.claude/specs/38-SGS-MOTION-SYSTEM.md` §1-3.3 (the four-tier motion doctrine + the capability roster), `plugins/sgs-blocks/scripts/converter/db/db_lookup.py::fx_attr_roster` and `::lift_behavioural_attrs`, `.claude/reports/2026-09-10-capability-coverage-inventory.md`.

1. **SGS-authored motion is fully solved, DB-first, no hardcoded dict.** `fx_attr_roster()` builds the complete fx-attribute contract (name → data-attribute → real JS type) by reading two already-maintained, gate-enforced source files (`includes/fx-attributes.php`'s `FX_ATTR_MAP` and the build-generated `extension-attributes.generated.php`) — never a hand-authored duplicate. `lift_behavioural_attrs()` then reads a draft's `data-sgs-fx-*` markers and lifts them straight into the emitted block's attributes. This is the correct architectural pattern to extend, not replace.

2. **The real fx-preset vocabulary is a closed, named list, not ~78 abstract slots.** The actual `data-sgs-fx` values found in the shipped runtime: `cursor-field`, `draggable`, `draw`, `flip`, `generative-background`, `grid-dots`, `horizontal-panel`, `image-sequence`, `magnet`, `morph`, `motion-path`, `particles`, `pin-scrub`, `scramble`, `scrub`, `split-reveal`, `surface-treatment`, `wave-gradient` — plus the large Tier V "existing inventory" (entrance ×16, hover suite, parallax 3-tier, path-draw, scroll-progress, marquee, float utilities) that predates the fx-attribute system and doesn't all route through the same single grammar. **Any recognition layer's real job is mapping raw CSS onto THIS list, not inventing a new one.**

3. **Zero raw-CSS recognition exists anywhere in the converter.** Confirmed live: `git grep -c keyframes -- plugins/sgs-blocks/scripts/converter/` returns 0. The only place `transform` is read from raw CSS is `converter/resolvers/preset_absence.py`, and only as a *preset-absence* signal (detecting that a block ISN'T using a named preset) — never to route motion. There is no code path today that reads `@keyframes`, `animation`, or `transition` off a draft and produces a `data-sgs-fx-*`-equivalent write.

4. **The tier doctrine (Spec 38 §1) is a hard constraint on WHAT any recognition layer may emit, not just how it's built.** Tier V (vanilla/CSS) is the default and the cheapest; Tier G (GSAP) is reserved for what vanilla genuinely cannot do and is conditionally loaded — a page using zero Tier G effects ships zero GSAP bytes; Tier H (Lenis) and Tier W (WebGL) are closed, D-numbered-admission lists that a cloning pipeline has no business populating automatically at all. **A clone must never silently upgrade a source's simple CSS fade into a heavier tier than the source itself used** — the doctrine's own ratchet-toward-cheap principle applies doubly hard to anything auto-generated.

5. **`prefers-reduced-motion` and the house contracts (Spec 38 §1.6) bind every tier identically** — live-checked reduced motion, `init → cleanup`, fail-open no-JS rendering. Whatever recognition layer gets built must produce output that already satisfies this by construction (i.e. by emitting a real fx-attribute that the existing runtime already honours correctly), not by adding a parallel motion-rendering path that would need its own accessibility contract built from scratch.

6. **The DB-first precedent for "map raw signal → block destination" already exists twice over and should be mirrored, not reinvented.** `slot_synonyms`/`roles` do this for element identity; `lingua_franca.py` (researched earlier today for the BEM-recognition problem) does this for class-name conventions. Both are DB/table-driven lookups with a narrow, auditable matching surface — the template this problem should follow, not a hardcoded Python dict of keyframe-name heuristics.

**Assumption flags:** items 1-3 are read directly from code (PROVEN). Item 4 restates Spec 38's own text verbatim, not an inference. No claim here about the DIFFICULTY of raw-CSS motion recognition is treated as proven — that judgement (this is a genuinely hard recognition problem, not a lookup problem) is this document's own framing, stated explicitly as a design premise, not smuggled in as fact.

---

## The core design question

*How should the pipeline recognise that a piece of raw CSS represents a specific motion intent (a fade-in reveal, a hover pulse, a parallax drift, a stagger, …), and map that recognition onto the existing closed fx-preset vocabulary — without ever emitting a heavier motion tier than the source itself demonstrably needed?*

### Rater personas consulted

- **Forensics rater** (grounded in the code above): the plumbing (DB roster, attribute lift, runtime consumption) is solid and reusable; the gap is purely on the INPUT side — nothing reads raw CSS motion syntax at all today.
- **Doctrine-compliance rater** (Spec 38's tier ratchet): any design that could plausibly cause a clone to emit Tier G/H/W without a human ever deciding that's warranted is a real risk, not a hypothetical — this must be designed against from the start, not patched in afterwards.
- **Pragmatist** (smallest safe increment): most real-world motion on scraped/AI-generated sites is very likely to be simple — fades, slides, hovers — which the existing Tier V "entrance ×16 / hover suite / parallax 3-tier" inventory already covers by *shape*. Start there before reaching for anything that needs new infrastructure.

### Ranked menu

**Tier 1 — CSS declaration-shape matching against the existing Tier V preset catalogue (recommended first step).**
For each `@keyframes` block + its `animation`/`transition` usage on a draft element, extract the actual CSS-level facts that are cheap and unambiguous to read: which properties animate (`opacity`, `transform: translateY(...)`, `transform: scale(...)`, etc.), the direction/magnitude of the value change, and the duration/easing. Compare that shape against the **existing Tier V preset catalogue's own known shapes** (entrance types, hover suite, the 3-tier parallax) — the framework already has a name and a control for "fade up on scroll", it just needs a classifier that recognises the CSS shape of one when it sees it, the same way `lingua_franca.py` recognises a Bootstrap class shape without knowing the site's own naming.
- *Cost:* low — this is a structural CSS-value comparison, not a semantic-understanding problem. No new runtime capability, no new DB tables beyond a lookup table mapping known shapes to existing preset slugs (DB-first, per R-31-1 — never a hardcoded dict).
- *Risk:* provably bounded to Tier V — a shape-match against the existing vanilla preset catalogue can only ever emit an existing Tier V preset, so it structurally cannot cause an unwanted Tier G/H/W upgrade.
- *Value:* likely covers the large majority of real-world cases. Most marketing-site motion is simple entrance/hover/parallax — exactly what Tier V's existing 16+ entrance types and hover suite already name.
- *Not this brainstorm's job:* the exact shape-matching heuristics are implementation detail, flagged here only as the recommended first rung.

**Tier 2 — trigger-mechanism classification (scroll vs load vs hover vs autoplay).**
A CSS shape match alone doesn't say WHEN the effect should fire. Classify the trigger by reading the accompanying signal: a CSS `animation-timeline: scroll()` or an `IntersectionObserver` in adjacent JS → scroll-triggered; a `:hover`/`:focus` selector owning the animation → hover-triggered; an unconditional `animation` on page load → load-triggered. This determines which Tier V preset FAMILY applies (the same fade shape means something different as a load animation vs a scroll reveal).
- *Cost:* low-moderate — CSS trigger detection is mechanical; JS trigger detection (spotting an IntersectionObserver pattern) needs a bit more care but is still pattern-matching on well-known, narrow JS shapes, not general code understanding.
- *Risk:* a misclassified trigger produces a working-but-wrong-timing effect, not a broken page — a safe failure mode.
- *Value:* necessary companion to Tier 1; a shape match without a correct trigger is only half the job.

**Tier 3 — stagger/repetition detection across sibling elements.**
When several sibling elements share the same animation shape with incrementally offset `animation-delay` (or JS-driven stagger), recognise this as a single staggered-reveal effect across the group rather than N independent identical animations.

⚠ **Reuse claim corrected 2026-09-10 (`/qc-council` rater C) — was overstated in the first two drafts.** This does NOT directly reuse the BEM-recognition brainstorm's Q2 sibling-repeater detector wholesale. Q2's fingerprint (`sha256(normalised_html + sorted_css_var_dump)`) is an EQUIVALENCE hash — it deliberately normalises instance differences away so identical siblings collapse to one key, for dedup/loop-conversion. Tier 3 needs the OPPOSITE: a DIFFERENCING signal — per-sibling `animation-delay`/timing-offset values, preserved and compared for a consistent stagger pattern. What genuinely reuses is the underlying "these siblings are shape-alike" PRE-FILTER (worth sharing, not duplicating); the timing-offset extraction and delta-pattern matching is separate, additional logic Tier 3 has to build regardless of whether the BEM Q2 work ships first.
- *Cost:* moderate — shares a pre-filter with Q2 if that work exists; still needs its own timing-comparison logic either way.
- *Risk:* low — worst case is treating a genuine stagger as N separate simple entrances, which still produces a reasonable (if less polished) result.
- *Value:* staggered reveals are a very common "premium" motion signature on the kind of sites this pipeline is meant to compete with (per Bean's "Awwwards-level" bar) — worth the investment once Tier 1/2 are proven.

**Tier 4 — heavy-tier detection via genuine, checkable source evidence — SPLIT 2026-09-10 (`/qc-council`) into two sub-tiers with materially different cost, feasibility, and legality.**

The first two drafts treated "detect GSAP/Lenis/WebGL usage and map it onto the corresponding already-built SGS tier" as one moderate-cost tier. The council found this wrong on two independent grounds — a real spec conflict for the WebGL case, and a real feasibility gap for everything except the cheapest signal. Split accordingly:

**Tier 4a — script/library REFERENCE detection (GSAP, Lenis only — NOT WebGL/Tier W).**
Spotting a `<script src=".../gsap.min.js">` or a Lenis library reference is genuinely cheap and reliable — a static HTML attribute, same signal class as Tiers 1-3's CSS-shape detection. `git grep` confirmed zero existing JS-content-parsing capability anywhere in the converter (every `<script>`-related hit found was an XSS-escaping test string, not analysis) — so this sub-tier is scoped to TAG-PRESENCE ONLY, not to confirming what the library is actually doing.
- *Cost:* low — mechanical, no new parsing capability needed.
- *Risk:* real noise risk, confirmed by the council (rater B): a script tag alone doesn't distinguish "this site uses GSAP for one trivial fade Tier V already covers" from "this site genuinely needs Tier G". Tag-presence should be a SIGNAL feeding the standard per-clone review, never a sufficient condition on its own to auto-emit Tier G/H.
- *Value:* a cheap, honest first step — flags "this source may need more than Tier V" for the human review that already happens on every clone, without pretending to know for certain.

**Tier 4b — WebGL/Tier-W usage detection — NOT RECOMMENDED, direct spec conflict (`/qc-council` rater A).**
`.claude/specs/38-SGS-MOTION-SYSTEM.md` §1.2b states, verbatim: *"Cloning: permanently unclonable, stated plainly. The pipeline reads computed CSS; a shader has none... It is DECLARED via a BEM signal resolved to a block attribute, never inferred, and its fidelity is Bean's eye alone with no numeric score behind it."* This directly rules out exactly what the first two drafts proposed — detecting a `<canvas>` + WebGL context on a source page and auto-mapping it onto Tier W. This is an explicit, already-settled ruling in the governing spec, not an open design question this brainstorm gets to resolve by analogy to general clone-fidelity review. **Tier W cloning stays exactly as Spec 38 already specifies: a BEM-signal declaration the operator sets deliberately, never an inference from detected canvas/WebGL usage.** If this is ever worth revisiting, it needs its own design-gate conversation with Bean citing Spec 38 §1.2b directly — not a quiet override inside a broader motion-recognition menu.

Also folded into this split: the council (rater B) found that everything BEYOND script-tag presence in the original Tier 4 proposal — reading `ScrollTrigger.create(...)` calls, detecting a scroll-listener-driven (vs CSS-driven) pin pattern — needs real JavaScript SOURCE parsing that doesn't exist anywhere in the pipeline today, and would be unreliable even if built (real-world GSAP usage is typically bundled/minified, so a literal call-site match is often invisible). That is a materially bigger, differently-shaped task than "script-reference detection" and should not be costed or scheduled as part of this tier at all — it's a separate, uncosted, not-yet-designed capability (draft-JS semantic analysis) that this brainstorm explicitly does NOT recommend starting now.

**Tier 5 — semantic classification for whatever Tiers 1-4a can't structurally match.**
For CSS motion that doesn't cleanly match any known Tier V shape and carries no Tier 4a-style script-reference evidence either, use a higher-cost classification step (an LLM-assisted read of the raw CSS + a description of what changes) to propose the closest matching preset, or to flag it as a genuinely new capability gap worth adding to the preset catalogue.
- *Cost:* highest — per-draft inference cost.
- *Risk:* the one tier here that's genuinely a best-guess rather than a read of concrete evidence — verify its output against the live clone the same way any AI-assisted classification in this pipeline gets checked, same discipline, no new process invented for this specifically.
- *Value:* speculative until Tiers 1-4a are shipped and measured — the same "don't build the expensive tier on a hunch" discipline as the BEM-recognition brainstorm's own Tier 3.

### Real-world test case (Bean-directed, 2026-09-10)

**TAG Heuer Eyewear's collection page** — `https://www.tagheuer.com/fr/en/eyewear/collection-eyewear.html`, Awwwards Site-of-the-Day recognised, scored 8.40/10 on Awwwards' own "Animations/Transitions" criterion. Still the right test case, with its role sharpened by the Tier 4 split above: the page's blur-text intro and scrolling carousel are Tier V-shaped (Tier 1/2 territory) — good coverage evidence. Its WebGL 3D product interaction is now explicitly OUT of this menu's automatic-detection scope per Tier 4b's finding above — on a real clone of this page, that portion should surface as a flagged gap for Bean to decide whether to hand-author via Spec 38's own BEM-signal declaration, not something the pipeline silently reproduces or silently drops. A correct outcome on this test case is therefore: Tiers 1/2/3 recover the CSS-shaped motion faithfully, AND the WebGL section is honestly reported as needing a human decision — not attempted.

### Recommendation (revised 2026-09-10 — `/qc-council` rater D)

Build Tiers 1, 2, 3, and 4a together as **one phase-plan** (matches Bean's "not longer than a phase plan" framing and his "clone everything, don't gate me on cautious slices" instruction) — but with an INTERNAL measurement checkpoint inside that phase, not a fully unmeasured bundle: ship and measure Tier 1+2 against the TAG Heuer page (and a couple of others) first, confirm real coverage, THEN build Tier 3/4a within the same phase. This is the same discipline R-31-5 ("phases never ship as single commits") already asks for, just applied as a checkpoint rather than a separate phase — it honours full-coverage intent without abandoning this project's own measure-before-escalating habit (visible in this doc's earlier tiers and the sibling BEM doc's explicit tiered gating). Tier 4b (WebGL detection) is not part of this build at all — see above. Tier 5 (semantic fallback) stays deferred until 1-4a are shipped and measured.

### Explicit non-choice, for completeness

**Tier 6 — declare raw-CSS motion recognition out of scope, formally.** This is already what happens today by default (silent drop, zero recognition) — the only change would be documenting it as a deliberate policy. Listed for completeness, not recommended: R9 measured this as the framework's single biggest capability gap, and Tier 1 alone is cheap enough that "do nothing" is a worse trade than it looks.

---

## The governing principle this menu follows (revised 2026-09-10, corrected again post-council)

**Emit the tier the source genuinely demonstrates using real, checkable evidence — never a tier inferred from a guess, and never in direct conflict with what the governing spec has already explicitly ruled.** Spec 38 §1's admission tests govern whether GSAP/Lenis/WebGL are allowed INTO this framework at all — that question is already answered for the framework generally (they're built and shipped). For **GSAP (Tier G) and Lenis (Tier H)**, that distinction holds: nothing in Spec 38 bars the cloning pipeline from using an already-admitted capability when the source's own code demonstrably needs it, with the standing per-clone review (R-31-13 — Bean's eye is co-authoritative on fidelity) as the checkpoint, not a new motion-specific gate. **For WebGL (Tier W), Spec 38 §1.2b has already settled the cloning question specifically and explicitly the other way — "permanently unclonable... never inferred... declared via a BEM signal"** — and this document's first two drafts missed that specific clause. Corrected here: the general "admission vs usage" reasoning is right for Tier G/H; it does not override an explicit spec ruling that already exists for Tier W specifically.

---

## NOT recommended now

1. **Tier 5 (semantic/LLM classification) as a starting point.** Expensive, and the cheap tiers haven't been measured yet to know if it's even needed.
2. **Emitting a heavier tier from CSS-shape inference alone, with no real library-reference evidence behind it.** That's a guess dressed as a detection.
3. **Tier 4b — inferring Tier W (WebGL) usage from a source page and auto-mapping it onto SGS's WebGL effects.** Direct conflict with Spec 38 §1.2b's explicit "never inferred" ruling — not a judgement call this brainstorm can make either way.
4. **Building any JS-semantic-parsing capability (real GSAP call-site detection, scroll-listener-vs-CSS distinguishing) as part of this menu's initial build.** The council found this doesn't exist today, would be unreliable against real minified sources even if built, and is a materially bigger, separately-scoped problem than anything else in this menu.
5. **A hardcoded Python dict of keyframe-name-to-preset mappings.** This project has a standing rule against exactly this shape of solution (R-31-1); any shape/trigger lookup table belongs in the DB, mirroring `fx_attr_roster()`'s own pattern.
6. **Building this before R1's remaining 17-attribute conversion.** Not a hard blocker, just a sequencing note — Tier 3's pre-filter is worth sharing with the BEM Q2 work if that lands first, but neither blocks the other.

---

## `/qc-council` findings, 2026-09-10 (4 raters, all findings incorporated above)

- **Rater A (spec-compliance):** UNDERCORRECTED — found the Spec 38 §1.2b WebGL-cloning ban the first two drafts missed. Led to the Tier 4b split above.
- **Rater B (feasibility):** PARTIALLY DETECTABLE — script-tag presence is cheap and real; everything else in the original Tier 4 (GSAP call-site parsing, WebGL context-creation code, scroll-listener detection) needs JS-content parsing that doesn't exist and would be unreliable on real sites. Led to the Tier 4a/4b split and the "not recommended" JS-parsing item above.
- **Rater C (cross-reference):** REUSE CLAIM OVERSTATED — Tier 3's claimed direct reuse of the BEM Q2 detector was only a partial, pre-filter-level reuse; genuinely new timing-comparison logic is still needed. Corrected in Tier 3 above.
- **Rater D (risk/sequencing):** RECOMMEND A MIDDLE GROUND — bundling all tiers unmeasured conflated Bean's end goal with a sequencing decision; recommended one phase-plan with an internal measurement checkpoint. Adopted in the Recommendation above.

No proposal was fully falsified; all four produced real, adopted corrections. This is the `/qc-council` skill working as intended — catching real design gaps before any subagent gets dispatched to build against a plan that would have hit a spec conflict and an undercosted capability mid-build.

---

## Open questions for Bean

1. ~~Ship Tier 1 alone first and measure, or bundle Tier 1+2 together?~~ **Resolved: Tiers 1/2/3/4a as one phase-plan with an internal measurement checkpoint after Tier 1+2 (see Recommendation above).**
2. ~~Reference site for testing?~~ **Resolved: TAG Heuer Eyewear collection page, see above.**
3. ~~`/qc-council` after this revision?~~ **Done — 4 raters, findings incorporated above (see "`/qc-council` findings" section).**
4. Should Tier 3's sibling-repetition detector be built as a genuinely shared component from day one (serving both this and the BEM-recognition Q2 problem), or built once for whichever lands first and generalised afterwards? — still open, low-stakes, can be decided at build time.
5. Tier 4b (WebGL/Tier-W cloning) is ruled out by an explicit spec clause, not a judgement call — is that acceptable as a standing "not now, needs its own design-gate" answer, or is this worth a dedicated conversation given TAG Heuer's WebGL section is exactly the kind of effect the "Awwwards-level" bar is aiming at?

---

## Plan-format recommendation: `/phase-planner`, not `/strategic-plan`

Bean's own read matches the evidence: the design work is the bulk of this (now settled by this brainstorm, its first revision, and the `/qc-council` pass above), and the build+test surface is bounded — Tiers 1/2/3/4a feeding into an already-built, already-working attribute-lift and runtime, with Tier 4b explicitly out of scope and Tier 5 explicitly deferred. This is **one extension to one stage of an existing pipeline**, not a multi-phase programme with its own architecture decisions still open. `/strategic-plan` is the right tool for a whole project or multi-month roadmap with several independent phases; `/phase-planner` is the right tool for a single named phase of scoped work, with the internal measurement checkpoint (Tier 1+2 measured before Tier 3/4a) as an explicit step within that one phase. Recommend `/phase-planner` now that the council pass is clear.
