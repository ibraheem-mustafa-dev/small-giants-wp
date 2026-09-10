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
When several sibling elements share the same animation shape with incrementally offset `animation-delay` (or JS-driven stagger), recognise this as a single staggered-reveal effect across the group rather than N independent identical animations. This reuses the same "detect near-identical repeated structure" technique flagged for the template-detection problem in today's earlier BEM-recognition brainstorm (Q2) — the same structural-repetition signal answers two different questions (is this a repeating template section? is this a staggered reveal?) from two different call sites.
- *Cost:* moderate — needs the sibling-comparison machinery either way; if Q2 Tier 1 from the BEM doc gets built, this is a direct reuse rather than new infrastructure.
- *Risk:* low — worst case is treating a genuine stagger as N separate simple entrances, which still produces a reasonable (if less polished) result.
- *Value:* staggered reveals are a very common "premium" motion signature on the kind of sites this pipeline is meant to compete with (per Bean's "Awwwards-level" bar) — worth the investment once Tier 1/2 are proven.

**Tier 4 — heavy-tier detection via genuine, checkable source evidence (revised 2026-09-10 — Bean-directed, see below).**
The source page itself declares what it's actually using — a `<script src=".../gsap.min.js">` or `ScrollTrigger.create(...)` call, a `<canvas>` element with a real WebGL context (`getContext('webgl')`/`'webgl2'`), a Lenis instantiation, a genuine pin+scrub structural pattern (a sticky/fixed section whose children's transforms are driven by a scroll listener rather than a CSS `animation`). These are **concrete, checkable facts about the source**, not inferred intent — the same category of evidence Tier 1-3 already use, just reading a different signal (script/library references and canvas usage instead of CSS keyframe shapes). When the evidence is real, map it onto the corresponding ALREADY-BUILT SGS tier (Tier G's pin-scrub/scroll-scrubbed-timeline capability, Tier H's Lenis smooth-scroll, Tier W's surface-treatment/flowing-gradient) rather than treating "the source uses GSAP" as something to guess at or gate behind extra process.
- *Cost:* moderate — script-reference and canvas-context detection is mechanical; mapping a detected pin+scrub pattern onto the SGS pin-scrub preset needs more care but is still evidence-driven, not inference.
- *Risk:* low, PROVIDED it only fires on real, checkable evidence (a script tag, a WebGL context call, a genuine structural scroll-pin pattern) and never on a CSS shape merely *resembling* something heavier. The existing per-clone fidelity review (R-31-13 — Bean's eye is co-authoritative on every clone, already standard practice) is the checkpoint that catches a wrong call here, the same as it catches any other clone-fidelity issue. No separate motion-specific approval gate is needed on top of that.
- *Value:* this is what makes the pipeline able to clone genuinely premium sites — like the TAG Heuer Eyewear collection page below — rather than flattening every heavy-motion source into simple CSS fades.

**Tier 5 — semantic classification for whatever Tiers 1-4 can't structurally match.**
For CSS motion that doesn't cleanly match any known Tier V shape and carries no Tier 4-style library evidence either (complex multi-keyframe sequences, unusual property combinations with no clear library signature), use a higher-cost classification step (an LLM-assisted read of the raw CSS + a description of what changes) to propose the closest matching preset, or to flag it as a genuinely new capability gap worth adding to the preset catalogue.
- *Cost:* highest — per-draft inference cost.
- *Risk:* the one tier here that's genuinely a best-guess rather than a read of concrete evidence — verify its output against the live clone the same way any AI-assisted classification in this pipeline gets checked, same discipline, no new process invented for this specifically.
- *Value:* speculative until Tiers 1-4 are shipped and measured — the same "don't build the expensive tier on a hunch" discipline as the BEM-recognition brainstorm's own Tier 3.

### Real-world test case (Bean-directed, 2026-09-10)

**TAG Heuer Eyewear's collection page** — `https://www.tagheuer.com/fr/en/eyewear/collection-eyewear.html`, Awwwards Site-of-the-Day recognised, scored 8.40/10 on Awwwards' own "Animations/Transitions" criterion. Deliberately chosen because it spans the full range this menu needs to handle correctly in one page: blur-text intro transitions and a scrolling carousel (Tier V-shaped — Tier 1/2 territory), through to an interactive WebGL 3D scroll experience on the product itself (genuinely Tier W-shaped — Tier 4 territory, with real checkable evidence: a canvas element driven by a real WebGL context). A recognition pipeline that correctly triages this ONE page into "these bits are simple CSS, this bit genuinely needs the heavy tooling" is a strong proof that the tiering is working as designed, not just that it's cautious. Use this as the first real-source test once a tier is built.

### Recommendation

Ship Tier 1 first and measure it against a handful of real non-SGS sources (TAG Heuer's page above, plus a couple more) — this alone may close most of the real-world gap, since simple entrance/hover/parallax motion is both the most common kind and the cheapest to recognise. Add Tier 2 as its necessary companion in the same pass (a shape without a correct trigger is incomplete). Tier 3 is worth building once the sibling-comparison machinery exists for the BEM-recognition Q2 work — reuse, don't duplicate. Tier 4 (genuine heavy-tier evidence) is worth building in the same pass as Tiers 1-3 rather than deferred, since it's what makes the pipeline able to fully clone a source like TAG Heuer's rather than only its simpler half — the earlier draft of this doc gated Tier 4 behind an extra confirmation step that wasn't actually warranted; corrected above. Tier 5 (semantic fallback) stays deferred until 1-4 are shipped and measured.

### Explicit non-choice, for completeness

**Tier 6 — declare raw-CSS motion recognition out of scope, formally.** This is already what happens today by default (silent drop, zero recognition) — the only change would be documenting it as a deliberate policy. Listed for completeness, not recommended: R9 measured this as the framework's single biggest capability gap, and Tier 1 alone is cheap enough that "do nothing" is a worse trade than it looks.

---

## The governing principle this menu follows (revised 2026-09-10)

**Emit the tier the source genuinely demonstrates using real, checkable evidence — never a tier inferred from a guess.** Spec 38 §1's admission tests govern whether GSAP/Lenis/WebGL are allowed INTO this framework at all — that question is already answered (they're built and shipped). They do not govern whether the cloning pipeline may use an already-built capability once the source's own code demonstrably needs it (a real library reference, a real WebGL canvas, a real structural scroll-pin) — conflating those two questions was this document's own error in its first draft, corrected here. The standing checkpoint is the same one every clone already gets: **Bean's eye is co-authoritative on fidelity (R-31-13)** — reviewed as part of normal clone verification, not a new motion-specific gate. What every tier in this menu still must not do is emit a heavier tier from an UNCHECKED GUESS (a CSS shape that merely *looks* complex, with no real library/canvas evidence behind it) — that's the actual line, not "heavier tier = forbidden."

---

## NOT recommended now

1. **Tier 5 (semantic/LLM classification) as a starting point.** Expensive, and the cheap tiers haven't been measured yet to know if it's even needed.
2. **Emitting a heavier tier from CSS-shape inference alone, with no real library/canvas/structural evidence.** That's a guess dressed as a detection — the actual line this menu draws (see the governing principle above), not "never emit anything beyond Tier V."
3. **A hardcoded Python dict of keyframe-name-to-preset mappings.** This project has a standing rule against exactly this shape of solution (R-31-1); any shape/trigger lookup table belongs in the DB, mirroring `fx_attr_roster()`'s own pattern.
4. **Building this before R1's remaining 17-attribute conversion or independent of the BEM-recognition Q2 work.** Not a hard blocker, but Tier 3 above directly reuses Q2's sibling-repetition detector — sequencing R8 after (or alongside) that work avoids building the same structural-comparison logic twice.

---

## Open questions for Bean

1. ~~Ship Tier 1 alone first and measure, or bundle Tier 1+2 together?~~ **Resolved (implicit in Bean's feedback — build for full coverage, not a cautious slice): Tiers 1-4 as one build increment, measured together against the TAG Heuer test case.**
2. ~~Reference site for testing?~~ **Resolved: TAG Heuer Eyewear collection page, see above.**
3. `/qc-council` after this revision, then a build plan — see the "Plan-format recommendation" section below for `/strategic-plan` vs `/phase-planner`.
4. Should Tier 3's sibling-repetition detector be built as a genuinely shared component from day one (serving both this and the BEM-recognition Q2 problem), or built once for whichever lands first and generalised afterwards? — still open, low-stakes, can be decided at build time.

---

## Plan-format recommendation: `/phase-planner`, not `/strategic-plan`

Bean's own read matches the evidence: the design work is the bulk of this (now largely settled by this brainstorm + its revision), and the build+test surface is bounded — four tiers of recognition logic feeding into an already-built, already-working attribute-lift and runtime. This is **one extension to one stage of an existing pipeline**, not a multi-phase programme with its own architecture decisions still open. `/strategic-plan` is the right tool for a whole project or multi-month roadmap with several independent phases; `/phase-planner` is the right tool for a single named phase of scoped work — which is what Tiers 1-4, built and tested together, actually are. Recommend `/phase-planner` once the `/qc-council` pass below is clear.
