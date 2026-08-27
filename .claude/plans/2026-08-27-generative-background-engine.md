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

**Phase 1 below is still OPEN.** The shortlist Bean picked from chose the six shipped STYLES; it did
not choose this rebuild's reference. Do not treat it as satisfied.

## Phase 1 — Pick the reference, before any code

⛔ **This step has never been done, and skipping it is what wasted every prior round.** D781 recorded
the rule in capitals after three Aurora attempts and a full Tier W build were made against a
reference nobody had looked at: **"VERIFY THE REFERENCE, NOT JUST THE IMPLEMENTATION."**

Every round since has steered *away from what Bean rejected* without ever steering *toward* a defined
target. "Blurry random shapes" is the honest description of what that process produces.

**Deliverable:** one Artifact page placing candidate treatments side by side with the current
FR-38-31 on canary page 2740, so Bean compares like-for-like and points at one. Not a wall of links.

Candidates gathered 2026-08-27:

- [Aceternity aurora](https://ui.aceternity.com/components/aurora-background) — CSS gradients, dark ground
- [shadcn aurora](https://www.shadcn.io/background/aurora) — CSS, emerald/teal
- [Lightswind aurora shader](https://lightswind.com/components/aurora-shader) — WebGL, pointer-reactive
- [21st.dev aurora-blur](https://21st.dev/@unlumen/components/aurora-blur) — WebGL drift
- [Superdesign Aurora UI](https://superdesign.dev/styles/aurora) — the style definition + canonical palette

**Canonical aurora recipe** (from the style reference, for whatever gets built): near-black base
(~`#05010f`); soft flowing bands from layered radial/conic gradients blurred together; **3–4 hues
maximum** (indigo / teal / pink / violet — beyond four it muddies to brown); slow cycle (~18s in the
CSS form). Known failure modes: body text over the raw gradient can drop below 4.5:1 as colours
move; it fails behind tables, forms and long-form reading; needs a reduced-motion fallback.

⛔ **GATE: Bean names a reference. Nothing below starts until he has.**

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

## Phase 3 — Build

Deliberately not planned in detail: its content depends entirely on Phases 1–2, and planning it now
would be inventing requirements — the exact failure this whole track exists to end.

---

## Carried decision — KJC-4: legal framing in the technique spec

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
