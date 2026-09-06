---
doc_type: plan
plan_id: generative-background-engine
phase_name: Generative background engine — our own configurable Tier W background
project: small-giants-wp
created: 2026-08-27
spec_ref: 38
supersedes_scope_of: ".claude/plans/archive/2026-08-26-fr3831-look-gate.md (its old Phases 2 + 3, lifted and renumbered from 1)"
---

# Generative background engine — the POC rebuild

## ⛔ What this is, and what it is NOT

**This IS:** building **our own** configurable generative-background tool, derived from the Stripe
hero **anatomy study** (`.claude/reports/2026-08-25-stripe-hero-anatomy.md`), using **none of
Stripe's assets**. The study rig was always a means to this end — its Q7 is literally *"What could
we reproduce with our own assets?"*

**This is NOT:** tuning `FR-38-31`, the shipped `flowing-gradient` fx effect. That is a separate,
finished, modest effect with its own record. Its plan is closed at
[`archive/2026-08-26-fr3831-look-gate.md`](archive/2026-08-26-fr3831-look-gate.md).

⛔ **Never merge these two tracks again, and never share a phase number between them.** One file
holding both is exactly what cost a full session on 2026-08-27: a single numbered sequence spanning
two products, where "Phase 3" read as *"more FR-38-31 work"* to one reader and *"the spec for our own
tool"* to another. Both readings were defensible from the text.

## The product goal (Bean, 2026-08-27)

One effect **engine**, remappable by the client from the block editor — **multiple colours, effect
shapes, sizes, positions**, speed — rather than one fixed hero look awaiting approval. This is what
the framework's own rules already demand: *"every customisable property must be exposed as an
inspector control"*; *"if a setting requires touching code, it is not done."*

⭐ **The differentiator, already identified and still unbuilt:** the effect recolours itself from the
same per-client theme tokens the rest of the site uses. No forked-shader competitor can match that.

## ⛔ The technique spec is a BUILD SPEC — stop calling it a document rewrite

`.claude/reports/2026-08-25-generative-background-engine-technique-spec.md` is titled *"technique —
**implementation reference**"* and carries a licence position, **seven named build mechanisms**,
reference calibration values, *"Notes for a Tier W implementation"*, and cost expectations.

**D794's NO-GO was about COMPLETENESS, not purpose.** Every finding was *"this is missing"* — no
animation section, no camera or coordinate space, no acceptance criteria, no statement of which file
the code lands in, evidence pointers into a since-deleted tree. Exactly one finding was directional:
a **re-ranking** — mechanism §1 (the CPU-folded ribbon) plausibly *deepens* the "rendered 3D" quality
that was rejected, while §5 and §6 are free and highest-yield but ranked last. None of it says the
goal is wrong.

## ⚠ The ground conflict, and its resolution

The spec's §6 currently commits to *"Ground — bright colour on white, not saturated colour on
near-black"*. The aurora look Bean has been describing requires the **opposite**: the style is
defined as needing a near-black base (*"Aurora over a light background dies"*).

**§6 answers its own problem:** *"This is an attribute default, not a mechanism."* **Ground is a
control, not a fork in the road.** The engine carries both looks as presets. Resolve it that way in
the spec rather than picking a side.

## Licence position (researched 2026-08-27 — do not redo)

Verified by reading actual LICENSE files via `gh api repos/OWNER/REPO/license`. GitHub's
`licenseInfo` API field reported "NONE" for the first two and was **wrong both times** — never trust
that field.

| Source | Licence | Verdict |
|---|---|---|
| nimitz "Auroras" (Shadertoy) | CC BY-NC-SA | ⛔ NON-COMMERCIAL. Excluded at D794. **Most aurora shaders in the wild descend from it** — check every new find against this before reading it. |
| [paper-design/shaders](https://github.com/paper-design/shaders) 3.4k★, pushed 2026-08-24 | Apache-2.0 | 30 shaders, **no aurora**. Nearest: `god-rays`, `warp`, `swirl`, `grain-gradient`. |
| [tengbao/vanta](https://github.com/tengbao/vanta) 6.9k★ | MIT | Stale (2024-03); requires three.js — fails the motion doctrine's bundle discipline. |
| [leisurelyleon/aurora](https://github.com/leisurelyleon/aurora) 1★ | MIT | Raw WebGL2 + FBM noise + animated colour ramps. Too small to depend on; usable as a **readable reference**. |
| `sa3dany/wave-gradient` | MIT | Already attributed in `wave-gradient.js:59-62`. ⛔ Do not delete that attribution — the licence the shipped effect depends on requires it (KJC-4 below). |

⭐ **An aurora must be WRITTEN, not borrowed.** Even a well-funded 30-shader library ships none.
⚠ **WebGL is not a given.** The mainstream "aurora background" components (Aceternity, shadcn) are
layered **CSS gradients** at 60fps, not WebGL. Weigh that path in Phase 2 rather than assuming Tier W.

---

## ⚠ What the SIX-STYLE VARIANT work established (2026-08-27, D852) — read before Phase 1

A separate, nearer-term piece of work shipped six background styles on the existing
`fx-wave-gradient` effect. It is NOT this rebuild, but it settled several questions this plan would
otherwise have to answer from scratch:

- **Bean's aesthetic target is now known.** He rejected dark saturated aurora attempts and approved a
  mid-luminance pastel field measured from a live reference (mean luminance 157, hue-adjacent
  lavender -> blue-grey -> mint -> violet). That is §5 (hue adjacency) and §6 (bright ground) of the
  technique spec — the two mechanisms the council ranked FREE and HIGHEST-YIELD and which had been
  sitting at the bottom of the list. They are now empirically confirmed rather than argued.
- **CSS has a hard ceiling for filamentary work.** Three CSS aurora attempts failed three different
  ways. Anything needing per-pixel noise or domain warping is WebGL, full stop. This plan should not
  re-litigate that.
- **One shader can carry two looks.** Measuring the base colour and crossfading between additive and
  darkening compositing turns the same shader into an aurora on dark and drifting pigment on light.
  Ground is genuinely a CONTROL, which is what §6 already said — now demonstrated.
- **The palette has no violet.** Measured across all 21 presets. A token-only aurora cannot reach its
  signature colour; curated per-style defaults are how that was solved without touching the palette.
- ⛔ **The theme-token differentiator is THIS plan's, not the variant work's** (Bean, 2026-08-27).
  The shipped variants use curated per-style defaults with client override; the token-following
  behaviour is what this rebuild is for.

## Phase 1 — Pick the reference: ✅ SATISFIED 2026-08-28 (Bean's call)

**Its CONDITION is met — it was not skipped, and it must not be re-run as ceremony.**

The step existed for one reason: three Aurora attempts and a full Tier W build were made against a
reference nobody had looked at, so every round steered *away from what Bean rejected* without ever
steering *toward* a defined target. D781 recorded the rule in capitals: **"VERIFY THE REFERENCE,
NOT JUST THE IMPLEMENTATION."**

That failure condition no longer exists. Bean picked from a live side-by-side shortlist (D852), six
styles shipped, and he approved them. **The reference is now our own live output** — canary pages
**2740** (single `pastel`) and **3037** (all six variants). It is looked-at, approved, running, and
measurable. D781's rule is satisfied by construction: you cannot build against an unexamined
reference when the reference is the thing you shipped and verified.

⛔ **Do NOT reopen this as "pick a look".** Bean, 2026-08-28: the step was there because we were
failing to reach the goal; the goal is reached. Re-running it would be ceremony, and ceremony is
what this plan exists to end.

⭐ **What this rebuild is actually for is a MECHANISM, not a look.** The shipped engine uses curated
per-style defaults with client override. This rebuild's differentiator — *the background recolours
itself from per-client theme tokens* — is the genuinely unbuilt part. The look is settled; the
question is how a generative field derives its palette from a site's own tokens and still stays
legible.

**Carried forward from the candidate gathering, still useful as technique input** (not as a choice
to make): the canonical aurora recipe — near-black base (~`#05010f`); soft flowing bands from
layered radial/conic gradients blurred together; **3–4 hues maximum** (indigo / teal / pink /
violet — beyond four it muddies to brown); slow cycle (~18s in the CSS form). Known failure modes
the engine must still answer: body text over the raw gradient can drop below 4.5:1 as colours move;
it fails behind tables, forms and long-form reading; it needs a reduced-motion fallback.

## Phase 2 — Complete the technique spec so it is buildable

Only after Phase 1. Absorb D794's must-fix register into
`.claude/reports/2026-08-25-generative-background-engine-technique-spec.md`:

1. The **animation** section — "Twist"/"Displacement" are currently orphaned table rows.
2. **Camera, projection and coordinate space** — absent entirely.
3. The **assembly order** of the seven mechanisms.
4. **Acceptance criteria** — there are none of any kind.
5. **Which file the code lands in.**
6. The **OKLab correction** — §2 (canvas gradient) contradicts §5, because canvas 2D interpolates in sRGB.
7. The **corrected legal framing** (KJC-4 below) and a binding divergence clause.
8. Promote the `perf/` tooling out of `scratch/`.
9. **Re-rank the mechanisms** per the council: §5 and §6 are free and highest-yield; §1 is suspect.
10. Repair the **CSS fallback contract**, currently asserted-unchanged and comprehensively broken.
11. Re-point every **evidence pointer** — they resolve into a tree Gate E deleted.
12. Resolve **§6's ground** as a CONTROL carrying both presets, not a fixed choice.
13. Add the **configurability axes** Bean asked for: colours, shapes, sizes, positions, speed.

**Gate:** the completed spec goes through `/adversarial-council` again. D794 said NO-GO on the thin
version; the rewrite must earn a GO before any build.

## Phase 3 — Build: ENGINE SHIPPED 2026-08-29. Fidelity gap CLOSED (D925-D927). Speed fixed (D930/D932). Colour vibrancy OPEN.

**Read D886, D887 and D888 before touching this track.** They supersede the technique spec's
Animation section and record two claims that were asserted and withdrawn.

**Shipped and live on the canary.** All three layers of the fold mechanism: the CPU fold and the
static object transform live in `webgl/generative-background-transform.js`, verified against
matrices extracted from the running reference rig; layer 3 was already correct. A missing depth
buffer — `depth: false`, `DEPTH_TEST` never enabled — was the stair-step artefact, fixed. Frame
cost 0.240ms against a 0.300ms ceiling.

**The fidelity instrument.** `npm run fidelity:compare` re-derives every figure;
`fidelity-baseline.json` and `reference-matrices.json` are tracked and survive the rig's deletion.

**The measured gap was real and is now CLOSED, via `/systematic-debugging` (D925-D927).** Not
geometry — layers 1-3 match the rig's coverage within 0.4pt average. The real cause: several
fragment-shader constants (glow amount, grading, fine-noise) were tuned by eye instead of read off
the reference — one was ~20x too large — plus one whole effect (a line-texture pattern) ported
from the reference's DARK theme into a build only ever compared against the light one. Corrected
every constant against the reference's actual measured values; deleted the wrongly-borrowed
effect. **3 of 3 sampled phases now pass** (2.81% / 2.35% / 2.73%, was 5.29% / 4.71% / 5.63%, 2 of
3 failing). Full account: D925, D926, D927.

**Live playback speed fixed (D930/D932).** Bean, testing on a real page: "ours is super fast
compared to the original." The reference scales its time input before animating; the shipped
engine had no equivalent scaling at all, running ~25x too fast. Fixed with a reference-derived
constant. The static-phase fidelity numbers above are unaffected (that instrument samples fixed
moments, not real playback speed).

✅ **Colour vibrancy FIXED (D939, corrected D941, 2026-09-03).** Root cause was hue range, not
saturation/lightness — three of the four demo colours sat in a 15° pink band plus one orange
outlier, a near-monochrome gradient with no internal colour contrast. **D939's first fix was
itself wrong** — it picked stops whose OKLCH interpolation path passed through green/yellow/cyan,
producing a literal rainbow the reference does not have (Bean caught it: "check the colours of
the actual original, it is not a rainbow"). **D941 corrected it**: sampled the reference's real
screenshot pixels directly (not a cached texture file) and found its hues cluster in exactly
three families — blue-violet (~244-270°), pink-magenta (~289-325°), orange (~18-36°), never
green/yellow/cyan. New palette (`#533AFD`/`#FE86E9`/`#FE8D2C`/`#9E5FE5`) chosen so every
adjacent-pair interpolation path stays on the warm/cool side and never crosses green — verified by
simulating the actual interpolation code in Python BEFORE shipping, not just eyeballing the four
endpoint hues. Applied to the demo page — no shader or engine code change either time.
Screenshot-verified against the fresh reference; `npm run fidelity:compare` re-run twice,
unaffected both times (3/3, unchanged numbers — that instrument measures shape, not colour).
Full account: D939 + D941 (read together).

✅ **1D gradient texture replaced with an alpha-composited organic field (D944, 2026-09-03).**
Bean pushed past the colour fix to a real architectural gap he spotted by eye: their palette
varies in BOTH directions (the reference shader samples `texture2D(u_paletteTexture, uv.x, uv.y)`
— confirmed by reading their fragment shader directly), while `buildGradientImageData()` painted
one row and copied it down every `y`. A second, sharper correction mid-build: a NORMALISED
weighted blend (candidate fix, built first) can never show true white or true single-colour
purity because every pixel is forced to sum to 100% colour — measured against the reference's own
palette-a.png (0.8% near-white / 2.4% near-pure / std 0.168) it scored 0%/0%/std 0.06. The real
mechanism is alpha-COMPOSITED paint over white, not an averaged blend. `buildFieldImageData()`
(procedural noise-warped blobs, alpha-over in linear sRGB, no dependency on the reference's asset)
measures mean 0.477/near-white 5.6%/std 0.156 — same category, verified at the TEXTURE level
(generated canvas vs their PNG, apples-to-apples) per Bean's own methodological correction that a
live-page comparison is too confounded by geometry/shader/content to be the primary gate. Geometry
untouched; `fidelity-compare.mjs` unaffected by construction (it uses the reference's own texture
on both sides). Full account: D944.

✅ **Bean's NAMED visual sign-off — GIVEN 2026-09-04.** An `/adversarial-council` review (six
personas) then found six further real gaps: a dark-ground opaque-alpha bug, light-theme-only
grading applied unconditionally under a dark ground, a striation-killing midline blackout, no
regression fixture, no narrow-hue-palette client warning, and a stale help string. All six
diagnosed via seven parallel investigation subagents (fact-checked against the live source before
use), then implemented. Two process incidents surfaced and fixed along the way: **D947** — an
implementer subagent's report described three fixes in convincing detail that were never actually
in the commit (caught by `git show` + a real runtime test on the specific code path the fix
claimed to touch, not by trusting the report); and a build-breaking typo in an unrelated
concurrent commit's `postbuild` script (fixed since it blocked every Windows build, not just this
one). Bean viewed the live canary after all fixes shipped: **"Looks good."** This closes Phase 3 —
no more open items on this plan. Full account: D939-D948.

**PHASE 3 CLOSED.** The generative-background engine is shipped, sign-off given, no known open
defects. Any further work here (dark-preset periodic-line texture, per-instance colour/shape/size/
position client controls beyond colour, a proper regression gate promoted from advisory) is new
scope, not a continuation of this plan — see `.claude/parking.md` if any of it gets parked.

---

## ✅ SETTLED 2026-08-28 — KJC-4 legal position (Bean)

**Bean's ruling, research already done: we are clear provided none of their source files ship in
the final product.** That is the operative constraint, and it is the right one — the licence risk
(nimitz's "Auroras" is CC BY-NC-SA, NON-COMMERCIAL) attaches to using or deriving from their CODE.
A shader we write ourselves does not inherit it.

**The two operational rules that follow, and they are the whole of it:**
1. ⛔ **Ship none of their files** — no shader source, no palette PNG, no asset, in the plugin, the
   theme, or any client build.
2. ⛔ **Keep no copies in this repo.** The narrow point the spec raised that survives Bean's ruling
   is that s.50BA permits *studying*, not *retaining copies*, and the palette PNG is an artistic
   work rather than a computer program, so the software exception does not reach it at all. Study
   it, write our own, keep nothing.

Write the aurora from scratch. That was already the conclusion; this settles the paperwork.

*(Superseded detail below, kept for the reasoning only — do NOT re-open it as an action. The three
overstatements it names should be corrected in the technique spec during Phase 2 as a
doc-accuracy fix, not treated as a blocker or escalated for advice.)*

## Carried decision (SUPERSEDED — reasoning only) — KJC-4: legal framing in the technique spec

**Decision:** correct three overstatements before that document is relied on. Carried from the
archived plan because it belongs to this spec, not to FR-38-31.

**Why:** s.50BA permits *studying*, not making and keeping copies; it covers **computer programs**,
not the palette PNG (an artistic work — and s.29 research fair dealing is non-commercial only, so
unavailable to a commercial business); and the citation currently reads as though the CJEU decision
went to the Court of Appeal. The spec also cites only the half of *SAS* that helps — it also holds
that reproducing described elements can infringe where they are the author's own intellectual
creation.

**Cost of wrong choice:** a tracked document that overstates a legal position is worse than one that
states a reasoned position honestly, because future sessions will rely on it.

**Who decides:** Bean. ⚠ **Not legal advice.** The council seat's recommendation — an hour of a UK IP
solicitor's time on (a) whether a site visitor is a "lawful user" for s.50BA and (b) SGS's standard
client IP warranty/indemnity — is worth taking. The indemnity is where the real money risk sits:
**the client publishes the site**, and small-agency IP indemnities are often uncapped.

## References

| File | What it gives you |
|---|---|
| `.claude/reports/2026-08-25-generative-background-engine-technique-spec.md` | The build spec (incomplete — Phase 2 finishes it) |
| `.claude/reports/2026-08-25-stripe-hero-anatomy.md` | The study rig's findings, incl. Q6 cost and Q7 "with our own assets" |
| `.claude/plans/archive/2026-08-26-fr3831-look-gate.md` | The CLOSED FR-38-31 plan — context only, not work |
| `.claude/specs/38-SGS-MOTION-SYSTEM.md` §1, §1.2a/b | The four-tier motion doctrine and Tier W's admission test |
| D781 · D790 · D791 · D794 | Reference-verification rule, Gate E, frame cost, the NO-GO |
