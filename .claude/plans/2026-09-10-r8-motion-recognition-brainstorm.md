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

**Build decision (Bean, 2026-09-10):** build the "these siblings are shape-alike" pre-filter as its own small, standalone module when building Tier 3 — NOT embedded inside Tier 3's own code — so the BEM-recognition doc's Q2 work can import it later instead of reimplementing it. Bean's reasoning: low risk, and building shared from day 1 is faster than building twice. Scope is narrow and deliberately limited to what rater C confirmed is genuinely reusable (the shape-alike comparison only) — the timing-offset/delta-pattern logic stays Tier-3-private, since Q2 doesn't need it and building it into the shared module would be exactly the premature-abstraction risk this project avoids elsewhere.

**Tier 4 — heavy-tier detection via genuine, checkable source evidence — SPLIT 2026-09-10 (`/qc-council`) into two sub-tiers with materially different cost, feasibility, and legality.**

The first two drafts treated "detect GSAP/Lenis/WebGL usage and map it onto the corresponding already-built SGS tier" as one moderate-cost tier. The council found this wrong on two independent grounds — a real spec conflict for the WebGL case, and a real feasibility gap for everything except the cheapest signal. Split accordingly:

**Tier 4a — DOM-runtime-signal detection (GSAP, Lenis, Three.js/WebGL PRESENCE) — feasibility upgraded 2026-09-10 (`/research-buddies`).**
The council's original worry (rater B) was that detecting real library USAGE, not just a script tag, would need JS-bundle parsing that doesn't exist and wouldn't work reliably against minified code anyway. Research found a materially better answer: **don't parse the bundle at all — read the DOM signals the libraries themselves leave behind as a side effect of normal operation**, all of which survive minification by construction and are visible in a plain scrape the pipeline likely already captures:
- **Lenis**: applies `.lenis`/`.lenis-smooth`/`.lenis-scrolling` classes to `<html>`/`<body>` at runtime — reliable, zero extra cost.
- **GSAP ScrollTrigger (pinning specifically)**: injects a literal `.pin-spacer`/`.pin-spacer-*` wrapper div into the rendered DOM when `pin: true` is used — confirms not just "GSAP loaded" but "pinning is actively used," zero extra cost.
- **Three.js/WebGL**: Three.js (r95+) self-tags its own canvas with `data-engine="three.js r<version>"` — one DOM attribute confirms both "Three.js" and "genuinely rendering," zero extra cost.
- This is the same class of evidence Wappalyzer (the industry reference tool) actually uses — confirmed by reading its public detection rules directly: it doesn't parse bundles either, it reads runtime state.
- *Cost:* low — these three signals need zero new capability if the pipeline's existing DOM scrape already captures element classes/attributes (verify this at build time); a small DB-seeded signature table (mirroring `slot_synonyms`) holds the class/attribute patterns, never a hardcoded dict.
- *Risk:* the noise risk the council flagged is now smaller but not zero — a `.pin-spacer` confirms ACTIVE pinning (stronger than mere script presence), but still doesn't confirm the pin is doing something Tier V genuinely can't. Still feeds the standard per-clone human review as a flag, never an auto-trigger, per the council's original finding.
- *Value:* materially more reliable than the original script-tag-only proposal, at similar cost, using infrastructure the pipeline already has.

**Tier 4b (WebGL content-cloning) — still NOT RECOMMENDED for auto-clone, direct spec conflict — but presence-detection reframes it, not resolves it (2026-09-10, both `/qc-council` and `/research-buddies` input, plus Bean's own point).**
`.claude/specs/38-SGS-MOTION-SYSTEM.md` §1.2b states, verbatim: *"Cloning: permanently unclonable, stated plainly. The pipeline reads computed CSS; a shader has none... It is DECLARED via a BEM signal resolved to a block attribute, never inferred, and its fidelity is Bean's eye alone with no numeric score behind it."* Checked directly against git history: this line was deliberately reaffirmed on 2026-08-25, the SAME commit that recorded `flowing-gradient` (SGS's own modular, palette-customisable Tier W effect) as shipped, and explicitly named `flowing-gradient` as covered by this ban — so the ban is not outdated relative to the modular system; it was written with it directly in view.

What the Tier 4a upgrade above DOES change: detecting Three.js's `data-engine` attribute is cheap and reliable now — so the pipeline CAN cheaply and honestly know "this section has genuine WebGL rendering" as a PRESENCE fact. What it still cannot do, and what Spec 38's ban is actually about, is know WHAT the shader draws — the attribute proves activity, not content. So presence-detection doesn't unblock auto-cloning; it upgrades the QUALITY of the flag handed to the human review step. This is close to Bean's own instinct (recognise the visual CHARACTER of a rich background treatment and approximate it with SGS's own parameterised system + a matched colour palette, rather than literally reading the source's shader) — but that's a genuinely different mechanism (style-matching + operator-confirmed approximation) from what this menu covers, and it still needs its own dedicated design-gate conversation with Bean citing Spec 38 §1.2b directly, not a quiet resolution inside this broader motion-recognition menu. **Recommendation: ship Tier 4a's Three.js/WebGL presence-detection as a cheap, honest flag into the operator-review flow; treat "approximate the style with our own modular Tier W system" as a separate, not-yet-designed idea for its own conversation.**

**Tier 4c — WebGL visual-style approximation via screenshot classification (Bean-directed, 2026-09-10) — a separate mechanism from Tier 4b, NOT a reopening of the Spec 38 ban.**

Real academic support this is a working technique, not a novel guess: [arXiv 2501.09236](https://arxiv.org/pdf/2501.09236) — vision-language models analysing `<canvas>`-rendered content is a studied, working capability.

**Ground truth check that changes this tier's real scope:** SGS's two current Tier W effects do NOT cover arbitrary WebGL use. `surface-treatment` applies a grain/halftone/duotone TREATMENT to an image a block already has (it needs a source photo). `flowing-gradient` is a standalone generative mesh gradient. Checked against the TAG Heuer test case specifically: its actual effect is an interactive 3D product viewer — neither shipped Tier W member does this, so even perfect recognition cannot approximate that specific page's WebGL section today. This tier only helps sources whose WebGL is a background-texture or flowing-gradient style treatment; a genuinely different WebGL use case (3D object viewers, particle scenes, etc.) stays a flagged gap regardless.

**Mechanism, gated on Tier 4a's presence-detection (never fires standalone):**
1. Once Tier 4a confirms genuine WebGL rendering (the `data-engine` attribute or the draw-call probe), screenshot the canvas region — the pipeline already does comparable captures for other QA.
2. Classify the screenshot's visual CHARACTER (grain/halftone/duotone-style treatment vs. flowing organic gradient vs. neither) via a vision-capable read — reading pixels only, never the shader/GPU code, so this does not touch what Spec 38 §1.2b actually forbids ("the pipeline reads computed CSS; a shader has none").
3. Sample dominant colours from the same screenshot to pre-fill the matching effect's palette control.
4. **Present as a suggestion the operator confirms via the SAME BEM-signal declaration mechanism Spec 38 already requires — never an auto-apply.** This keeps the letter of "declared via a BEM signal... never inferred... Bean's eye alone" intact: the pipeline does the matching legwork, Bean still makes the actual declaration.
5. When the visual character matches neither shipped effect, say so plainly and flag it as a gap — never force a bad fit onto the closed list.

- *Cost:* moderate — reuses existing screenshot/Playwright infrastructure; the classification step is a vision-model call, not new parsing capability.
- *Risk:* low, by construction — gated on Tier 4a's confirmed-WebGL-presence signal, never fires from a guess, and the human confirmation step is the same one every Tier W declaration already requires. The only way this goes wrong is a bad suggested match, which costs Bean a rejected suggestion, not a wrongly-shipped clone.
- *Value:* saves Bean the manual "which of my two effects looks like this" search on the cases where a real match exists, while staying honest about the (currently large) set of WebGL styles neither effect covers.
- *Scope note:* this is NOT a reversal of the Tier 4b ruling — it operates entirely on rendered pixels (legal under Spec 38's own reasoning), suggests rather than infers-and-applies, and requires the operator's own declaration exactly as the spec already mandates.

**Tier 5 — semantic classification for whatever Tiers 1-4a can't structurally match.**
For CSS motion that doesn't cleanly match any known Tier V shape and carries no Tier 4a-style script-reference evidence either, use a higher-cost classification step (an LLM-assisted read of the raw CSS + a description of what changes) to propose the closest matching preset, or to flag it as a genuinely new capability gap worth adding to the preset catalogue.
- *Cost:* highest — per-draft inference cost.
- *Risk:* the one tier here that's genuinely a best-guess rather than a read of concrete evidence — verify its output against the live clone the same way any AI-assisted classification in this pipeline gets checked, same discipline, no new process invented for this specifically.
- *Value:* speculative until Tiers 1-4a are shipped and measured — the same "don't build the expensive tier on a hunch" discipline as the BEM-recognition brainstorm's own Tier 3.

### Real-world test case (Bean-directed, 2026-09-10)

**TAG Heuer Eyewear's collection page** — `https://www.tagheuer.com/fr/en/eyewear/collection-eyewear.html`, Awwwards Site-of-the-Day recognised, scored 8.40/10 on Awwwards' own "Animations/Transitions" criterion. Still the right test case, with its role sharpened by the Tier 4 split above: the page's blur-text intro and scrolling carousel are Tier V-shaped (Tier 1/2 territory) — good coverage evidence. Its WebGL 3D product interaction is now explicitly OUT of this menu's automatic-detection scope per Tier 4b's finding above — on a real clone of this page, that portion should surface as a flagged gap for Bean to decide whether to hand-author via Spec 38's own BEM-signal declaration, not something the pipeline silently reproduces or silently drops. A correct outcome on this test case is therefore: Tiers 1/2/3 recover the CSS-shaped motion faithfully, AND the WebGL section is honestly reported as needing a human decision — not attempted.

### Recommendation (revised 2026-09-10 — `/qc-council` rater D)

Build Tiers 1, 2, 3, and 4a together as **one phase-plan** (matches Bean's "not longer than a phase plan" framing and his "clone everything, don't gate me on cautious slices" instruction) — but with an INTERNAL measurement checkpoint inside that phase, not a fully unmeasured bundle: ship and measure Tier 1+2 against the TAG Heuer page (and a couple of others) first, confirm real coverage, THEN build Tier 3/4a within the same phase. This is the same discipline R-31-5 ("phases never ship as single commits") already asks for, just applied as a checkpoint rather than a separate phase — it honours full-coverage intent without abandoning this project's own measure-before-escalating habit (visible in this doc's earlier tiers and the sibling BEM doc's explicit tiered gating). **Tier 4c (WebGL style-approximation) is a fast-follow, not part of this base phase** — it depends on Tier 4a's presence-detection existing first, and is small/separable enough to be its own follow-on step once the base phase ships and Tier 4a is proven live. Tier 4b (WebGL content-cloning) is not part of any build — see above. Tier 5 (semantic fallback) stays deferred until 1-4a are shipped and measured.

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
4. **Building a JS-BUNDLE-content parser (reading minified/bundled source to find call sites).** Superseded 2026-09-10 by `/research-buddies` — this was never actually needed; the industry-standard approach (and now this menu's Tier 4a) reads DOM-runtime signals instead, which are cheaper and more reliable. The one piece still genuinely needing new capability is a small Playwright execution probe for non-Three.js WebGL draw-call confirmation (monkey-patch `WebGLRenderingContext.prototype.drawArrays`) — real, but small and precedented (the pipeline already runs Playwright sessions for other verification), not the large uncosted subsystem the original council pass flagged.
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

## `/research-buddies` follow-up, 2026-09-10 (Bean-directed, streamlined 2-agent pass)

Dispatched after Bean questioned whether the WebGL ban predated the modular Tier W system (checked directly — it doesn't; see Tier 4b above) and asked for real research on the JS-parsing/minified-code problem rater B flagged, explicitly naming `/gh-research`.

- **Verified the rater B feasibility gap was more solvable than it looked.** GSAP, Lenis, and Three.js all leave durable DOM-runtime signals (body classes, a pin-spacer wrapper div, a `data-engine` canvas attribute) that survive minification by construction, because they're side effects of the libraries' own normal operation, not something designed to be fingerprintable. This is the same technique Wappalyzer (the industry reference tool) actually uses — confirmed by reading its live public detection rules. Reclassified Tier 4a from "moderate cost, no existing capability" to "low cost, reuses the pipeline's existing DOM scrape."
- **Genuine bonus finding (lateral application, unprompted):** the same DOM/runtime-signal technique is the missing piece for a DIFFERENT already-documented gap — `lingua_franca.py`'s `_SHADCN` rule declares a `data_slot_attrs: True` flag (per the BEM-recognition brainstorm's ground-truth read) that's never actually consulted, because shadcn/Radix components are identified by runtime `data-slot`/`data-radix-*` attributes, not stable class names — structurally the same problem this research just solved for motion libraries. Flagged in `.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` as a candidate for a shared probe, not built here.
- Full findings + sources: `C:\Users\Bean\.claude\memory\research\2026-09-10-detecting-motion-libraries-in-bundled-js.md`.
- **Process note:** this was a streamlined 2-agent version (Nerd + Practical, joint conclusion synthesised inline) rather than the full 5-stage round-trip process, disclosed to Bean at dispatch time given the async harness's per-round-trip cost.

---

## Open questions for Bean

1. ~~Ship Tier 1 alone first and measure, or bundle Tier 1+2 together?~~ **Resolved: Tiers 1/2/3/4a as one phase-plan with an internal measurement checkpoint after Tier 1+2 (see Recommendation above).**
2. ~~Reference site for testing?~~ **Resolved: TAG Heuer Eyewear collection page, see above.**
3. ~~`/qc-council` after this revision?~~ **Done — 4 raters, findings incorporated above (see "`/qc-council` findings" section).**
4. ~~Should Tier 3's sibling-repetition detector be a shared component from day one?~~ **Resolved (Bean, 2026-09-10): yes — build the shape-alike pre-filter as its own standalone module from day 1, scoped narrowly to what's genuinely reusable (see Tier 3 above).**
5. ~~Is Tier 4b's exclusion acceptable as a standing answer, or worth a dedicated conversation?~~ **Partially addressed: Tier 4c (style-approximation via screenshot) gives a real path for sources whose WebGL matches SGS's existing 2 effects. The bigger question — should Tier W ever grow a NEW admitted effect (e.g. a 3D-object-viewer type) to cover sources like TAG Heuer's that neither existing effect approximates — is confirmed OUT of scope for now (Bean, 2026-09-10): "system can wait for later."**

---

## Plan-format recommendation: `/phase-planner`, not `/strategic-plan`

Bean's own read matches the evidence: the design work is the bulk of this (now settled by this brainstorm, its first revision, and the `/qc-council` pass above), and the build+test surface is bounded — Tiers 1/2/3/4a feeding into an already-built, already-working attribute-lift and runtime, with Tier 4b explicitly out of scope and Tier 5 explicitly deferred. This is **one extension to one stage of an existing pipeline**, not a multi-phase programme with its own architecture decisions still open. `/strategic-plan` is the right tool for a whole project or multi-month roadmap with several independent phases; `/phase-planner` is the right tool for a single named phase of scoped work, with the internal measurement checkpoint (Tier 1+2 measured before Tier 3/4a) as an explicit step within that one phase. Recommend `/phase-planner` now that the council pass is clear.
