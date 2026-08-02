# Motion + FX — the MASTER GAP REGISTER

> **What this is.** Every gap, weakness, missing category and client-usability shortfall found on
> 2026-08-02/03, in one place, ranked. Consolidates nine reports so the findings are not spread
> across files nobody re-reads.
>
> **The bar throughout is CLIENT-FACING, not code quality.** Bean's clients are tech-illiterate and
> only ever touch the block editor. A capability a client cannot find, configure, or get a
> good-looking result from **does not count as built**.
>
> **Source reports:** `reports/2026-08-02-webgl-adoption-research.md` ·
> `2026-08-02-webgl-github-survey.md` · `2026-08-02-webgl-effect-repos.md` ·
> `2026-08-02-shader-authoring-surface.md` · `2026-08-02-motion-ecosystem-survey.md` ·
> `2026-08-03-motion-survey-gapcheck.md` · `2026-08-03-fx-client-readiness-built.md` ·
> `2026-08-03-fx-client-readiness-partial.md` · `plans/2026-08-03-snooza-configurator-build-plan.md`

---

## ⛔ SECTION 0 — Read this before using any repo

**GSAP is NOT MIT.** SPDX `NONE`; package declares *"Standard 'no charge' license"*. Commercial use
on client sites is explicitly fine. **But the Prohibited Uses clause bans**, verbatim:

> *"any implementation and/or use of GSAP Products in tools that allow users to build visual
> animations without code that … competes with Webflow's visual animation building capabilities."*

- **Client sites Bean builds:** fine, unambiguously.
- **SGS's fx inspector (preset picker + a few params):** probably fine — it is not a timeline
  builder — but it is a judgement call, not a certainty.
- ⚠ **A DISTRIBUTED COMMERCIAL PLUGIN sold partly on visual motion authoring** (the £299/yr
  Configurator Pro in the Snooza proposal) is the exposed case.
- **Escape hatch if ever needed:** Motion (MIT, 33k★, 2.3kb mini) and anime.js v4 (MIT, 71.7k★,
  ships `scrambleText()` built in). Migration, not catastrophe.
- GSAP went free **April 2025** (not 2026 — an agent got this wrong; verified against Webflow's
  own announcement).

**Other licence facts, all API-verified 2026-08-03:**

| Item | Reality | Note |
|---|---|---|
| **LYGIA** | ⛔ `NOASSERTION` / Prosperity — **commercial = 30-day trial** | I wrongly recommended it earlier. Do not vendor. |
| **OGL** | ✅ **Unlicense (public domain)** | Better than "MIT". Strengthens it as the Tier W pick. |
| `gl-transitions` | SPDX `NOASSERTION`; per-file — **124 MIT, 1 BSD-3** | Two reports called it flatly MIT. Check per transition. |
| `PavelDoGreat/WebGL-Fluid-Simulation` | ✅ MIT, ★16.5k | Last push Nov 2024 — fork it, don't depend on it. |
| `curtainsjs` | ✅ MIT, ★1.8k | Author has moved to a WebGPU successor. |
| `model-viewer` | ✅ Apache-2.0, ★8.2k, active | Bundles three.js — heavy. |
| `detect-gpu` | ✅ MIT, pushed 2026-08-02 | The capability gate. |
| `robin-dela/hover-effect` | ✅ MIT | Stale (2023). |
| `naughtyduk/particlesGL` | ⛔ non-permissive custom | Do not touch. |
| Codrops / Tympanus repos | ⚠ mostly **no LICENSE file** = all rights reserved | Learn from; do not copy. |
| `react-lenis` | ⚠ archived, no licence | Use Lenis directly. |

**⚠ Copyright note (Bean asked):** reworking a restrictively-licensed library does **not** make it
yours — a modified version is a derivative work and still bound by the original licence. What IS
legitimate: implementing the **technique or published maths** yourself (most of these trace to public
papers), or buying a commercial licence.

---

## SECTION 1 — WEAKNESSES in what is already built

Ranked by client impact.

| # | Gap | Category | Effort |
|---|---|---|---|
| 1 | **Hover suite covers only 4 blocks** (Info Box, Card Grid, CTA Section, Hero). Project's own docs list the rest as "Phase 2 — Not Started". Scale/shadow/zoom/duration/easing missing everywhere else. | Rollout | Medium |
| 2 | **Audio-reactive has no sensitivity/gain control** — `fftSize`/`smoothingTimeConstant` hardcoded (`audio/view.js:75-76`). A client cannot tune a visualiser that reacts too much or too little. | Control | ~15 min |
| 3 | **Audio-reactive is undiscoverable** — 4 genuinely good analyser-driven visualisers buried in the Audio block's *style* dropdown. Nobody browsing for "effects" finds them. | Discoverability | Small |
| 4 | **`fx-morph` fix unverified live** (D452 moved attrs from `<svg>` to `<path>`; source confirms the fix, no QA note since). | Verification | ~10 min |
| 5 | **D451 motion-path repeat-trigger defect — current status unknown.** | Verification | ~10 min |
| 6 | **No in-editor preview for Lenis smooth scroll** — client must publish and scroll the live site to judge feel. Architectural. | UX | Medium |
| 7 | **"Good by default" never proven** for pin/scrub/scramble/split-reveal — no drop-on-page screenshot test exists. This is the single biggest differentiator vs Kadence/Spectra and it is unmeasured. | Verification | Medium |
| 8 | **Cursor field has no contrast warning** — a client can pick a field colour that clashes or vanishes. | Control | Small |

### Structurally agency-only — should be LABELLED, not "fixed"

These are not defects; they are dev tools miscounted as client capabilities. **Label them in the
editor so the roster is honest:**

- **`sgs/image-sequence`** — needs `ffmpeg` + a Python prep script outside WordPress. The block's own
  UI already says it is hidden from the inserter. A client can edit an agency-built instance; they can
  never create one.
- **`fx-morph`** — requires matched-topology SVG path pairs. No restaurant, wedding planner or law
  firm will ever supply those.
- **`fx-scramble`** — deliberately and honestly scoped as developer-only.

---

## SECTION 2 — MISSING categories

13 verified missing. Top ones by value:

| # | Category | Why it matters | Tier |
|---|---|---|---|
| 1 | **Page transitions / View Transitions API** | Cross-browser at ~88%, same-document; **degrades perfectly with JS off** — matches Bean's constraints better than almost anything else on this list. Spec'd in §3.5, nothing built. | **V** |
| 2 | **Native CSS scroll-driven animations** (`animation-timeline`) | Supported in all three engines as of 2026. Absent from a survey whose own §1 is scroll-driven. Candidate to DEMOTE existing Tier G work to Tier V. | **V** |
| 3 | **Modern CSS entry/exit** — `@starting-style`, `allow-discrete`, Popover, Anchor positioning | Accordions, modals, drawers, tooltips. Cheap, native, huge polish return. | **V** |
| 4 | **Image transitions** — displacement melts, curtain wipes | Core award-tier vocabulary. | **W** |
| 5 | **Generative backgrounds** — noise fields, gradient meshes, flow fields | Applies to every client site, not one hero. | **W** |
| 6 | **Surface treatments** — grain, dither, halftone, ASCII, chromatic aberration | ⭐ **Most undervalued item in this register.** Cheap shaders, very fashionable, makes stock photography look art-directed. High return per byte, applies everywhere. | **W** |
| 7 | **Lottie** | Absent entirely. Designer-authored vector motion, huge ecosystem. | H? |
| 8 | **Scrollytelling** frameworks | Editorial/charity storytelling — a real SME/charity use case. | V/G |
| 9 | **Counters / data-viz motion** | Charities and B2B: animated stats, progress, charts. | V |
| 10 | **Web Audio reactive** (beyond the audio block) | Named in Codrops' write-up of a July 2026 winner. | V/W |
| 11 | **3D / product configurators** | ⭐ **Commercially the strongest** — see Snooza. Clients pay for this. | **W** |
| 12 | **WebGPU / TSL tooling** | Cross-browser Jan 2026, but Apple needs OS 26 (~70% real coverage). Watch, don't adopt. | — |
| 13 | **Form micro-interactions, loading/skeleton choreography** | Unglamorous, universally applicable. | V |

---

## SECTION 3 — HOW to make these usable by clients

The recurring theme across every audit. These are the patterns, not one-off fixes.

1. **Presets before parameters.** A client picks *"Ripple"*, *"Smoke"*, *"Brick reveal"* — not
   `baseFrequency: 0.009`. Named presets map onto the existing **variant** system; raw numbers go
   behind an "Advanced" toggle. **This is the single highest-leverage change in the whole register.**
2. **The uniform-manifest pattern.** Declare each effect's knobs as typed DATA (name, type, range,
   default) — proven by `gl-transitions`. That manifest maps mechanically onto `block_attributes`
   → inspector controls. **No new architecture needed**; it is the existing DB pattern pointed at a
   new attribute family.
3. **Good-by-default is the product.** Dropping an effect with zero configuration must look
   *designed*. Needs a drop-on-page screenshot test that does not currently exist (§1 gap 7).
4. **Discoverability: one "Effects" surface.** Motion is currently scattered across per-block
   panels and dropdowns. A client cannot browse what is available.
5. **Label agency-only tools in the editor** so the capability roster stays honest.
6. **Capability-gate the heavy stuff** — `detect-gpu` (MIT) before loading anything WebGL; serve the
   Tier V equivalent otherwise. Never a blank canvas.
7. **Contrast/legibility warnings** where a client picks colours.
8. **Reduced motion must stay honest per effect** — Spec 38 §10 rows are the contract, and one went
   stale within a day of being written (see the caution below).

---

## SECTION 4 — Tier W (WebGL) — decisions pending Bean

| # | Decision | Recommendation |
|---|---|---|
| D1 | Byte allowance | **120KB JS for Tier W pages only**; 50KB rule untouched elsewhere |
| D2 | Library | **OGL** (Unlicense/public domain, 34KB), wrapped behind our own `init/setUniform/destroy` so it is swappable |
| D3 | No-WebGL visitors (~2-3% + low-power) | Serve the **Tier V version of the same block** |
| D4 | Open capability or closed list | **Closed list**, first entry the fluid cursor field |

**Admission test (5 parts):** Tier V cannot reach it · GSAP cannot reach it either · bounded to one
surface · degrades meaningfully · admitted by a D-numbered decision.

**Three extra house contracts WebGL alone needs:** context-loss recovery (the most-reported WebGL
complaint, iOS especially) · explicit GPU disposal (not garbage-collected) · pause when off-screen
or hidden.

**Cloning:** permanently unclonable — a shader has no computed style. Declared via a BEM signal, and
fidelity is Bean's eye only, with no numbers behind it.

---

## SECTION 5 — Strategic framing

The 2026 award-winning stack is uniformly **GSAP + Three.js + Lenis + Web Audio + custom WebGL** —
and those sites have **largely abandoned performance and accessibility** to get there.

Bean cannot beat them at that game on Tier V. But **"award-tier motion that is also fast and
accessible"** is a different and more sellable pitch for UK SMEs and charities, who face procurement
and accessibility obligations those agencies ignore. For a medical-seating client like Ophir it is
not even close.

---

## ⚠ CAUTION FOR WHOEVER READS THIS NEXT

On 2026-08-03 a client-readiness audit named the `sgs/google-reviews` WCAG 2.5.7 dead-end **"the
single highest-value fix in this whole audit."** It had been fixed hours earlier and proven live at
17/17. The agent was not careless — **it cited Spec 38, and Spec 38 still said the bug was live.**

The code was fixed, the register closed, and the spec never swept.

**Treat every "known defect" in this register as a claim with a date on it. Re-verify against the
code before acting.** A stale doc is not untidiness; it is a trap that fires on the next reader.
