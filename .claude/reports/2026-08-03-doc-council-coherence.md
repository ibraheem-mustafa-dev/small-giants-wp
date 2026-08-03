---
doc_type: report
title: QC council — Rater B (internal consistency, gaps, usability)
created: 2026-08-03
scope: READ-ONLY. No code or docs changed.
---

# Doc council — Rater B: internal consistency, gaps, usability

Angle: do the 2026-08-02/03 documents contradict each other, and can Bean actually act on them?
Not re-covering factual-accuracy-vs-code (that is another rater's job).

---

## RANKED FIX LIST (do these, in this order)

1. **Fix the Snooza SKU-count contradiction before Track 2 planning starts** (cost: highest — a paid 6-week quote is built on stale numbers).
2. **Resolve the GSAP-free-date three-way conflict and cite one source** (cost: high — it appears in a spec, a register, and is wrong in both).
3. **Add the accessory nested-variant/dependent-option gap to the Snooza plan explicitly** (cost: high — it's a data-model shape the plan doesn't know it needs).
4. **Wire D479 into `decisions.md`** (cost: medium — a spec cites a decision number that doesn't exist anywhere else).
5. **Add the two omitted register findings (WCAG 2.2.2/2.3.1 motion-accessibility gap; MIT-engine alternative as its own line item)** (cost: medium — both are actionable and currently invisible).
6. **Update LEDGER.md** to mention today's three deliverables (cost: low-medium — it's the one place a fresh session is told to look first).
7. **Give the "email GreenSock" recommendation an owner and a line in the register** (cost: low — ten minutes of Bean's time, currently unassigned anywhere).

---

## 1. Contradictions BETWEEN documents

### 1a. Snooza SKU matrix: 24 vs 72 — the build plan is built on a superseded product spec (HIGHEST COST)

`sites/snooza-chair/CLAUDE.md` (2026-08-03, headed **"CORRECTED BY BEAN 2026-08-03. This supersedes
any earlier reading"**) states the product has **three variant axes — Size (4) × Colour (6) ×
Headrest (3) = 72 SKUs** — and that headrest is a customer CHOICE (a variant), not one of the
accessories. It also lists **8** accessories, two of which are explicitly **not simple toggles**:
Medial Thigh Support (its own nested 2-way variant) and Leg Rest (constrained to match chair size).

`.claude/plans/2026-08-03-snooza-configurator-build-plan.md`, written the same day, still says:

- §5: *"Snooza is 6 colours × 4 sizes = 24 combos, well under the 30-variation WC cliff"*
- §6: *"Cross-attribute availability past 30-variation cliff — HAVE, not load-bearing for Snooza (24 combos, under WC's native 30-variation ceiling)"*
- §7: *"SIX material variants... applied to that ONE geometry"* — headrest is absent as a base-model axis
- §5/§6/§9/§11: **"10 accessories"** stated four times, listing Profile Headrest as one of them

The plan's own central risk assessment ("not load-bearing", "24 combos... under WC's native
30-variation ceiling") is **false against the corrected spec**: 72 combos is over WC's own
30-variation cliff, meaning `Product_Manifest`'s cross-attribute-availability mechanism (FR-27-C1),
which the plan calls a "bonus, not load-bearing", is now **load-bearing** and untested at that
scale. The 3D-model spec in §7 (one geometry + six material swaps) has no plan for a third
swappable axis (headrest) or for two accessories that aren't booleans. The plan's own "verified
have/need table" — its central artefact — needs re-running against the corrected spec before
Phase 1 (3D model generation, the single highest-risk week per the plan's own §7) starts.

**Why this matters:** neither document points at the other. The CLAUDE.md correction doesn't say
"this invalidates the build plan's §5-§7,§9,§11." The build plan doesn't carry a "superseded by
CLAUDE.md correction" flag. A fresh session reading the plan first (the more prominent, longer,
`strategic-plan`-typed doc) will build against 24 SKUs and 10 simple-toggle accessories.

### 1b. GSAP's free-commercial date: three different answers, none agreeing with its own cited source

- `2026-08-02-motion-ecosystem-survey.md` (§1, §8, summary table): **2026-04-30**, cited to
  Webflow's own announcement + CSS-Tricks.
- `2026-08-02-webgl-effect-repos.md` (§ GSAP+WebGL pairing): *"the 2024 'GSAP is now 100% free'
  change"*.
- `2026-08-03-motion-survey-gapcheck.md` catches the first two disagreeing (*"the two docs disagree
  on the date... Both cannot be right. Pick one and cite it once"*) but does not itself resolve which
  is correct.
- `.claude/plans/2026-08-03-motion-gap-register.md` §0 then asserts a **third** date — **"April
  2025 (not 2026 — an agent got this wrong; verified against Webflow's own announcement)"** — which
  matches **neither** of the two sources it is adjudicating between, and claims verification against
  the very Webflow announcement the ecosystem survey already cites as saying 2026-04-30.
- `.claude/specs/38-SGS-MOTION-SYSTEM.md` line 30-31 independently says **"April 2025"** too — so
  the register and the spec agree with each other, but neither has re-derived the date from a source
  cited in this doc set; both disagree with the one document that actually names its source.

**Net:** the register's Section 0 claims to be the corrective pass ("an agent got this wrong") but
introduces a fourth data point instead of resolving the conflict with a checked source. Someone
needs to open the Webflow blog post once and write the real date in exactly one place, with the
others pointing at it.

### 1c. `detect-gpu` recommended as infrastructure, with its own byte-budget risk unaddressed in the register

`2026-08-03-motion-survey-gapcheck.md` §3 item 3 flags: *"`detect-gpu` ships a benchmark dataset
that, by default, can be fetched at runtime rather than bundled. Against Bean's absolute
'npm-bundled, never CDN' rule that is a blocking question, not a detail. Verify before adopting."*

The register (Section 3, point 6) still recommends `detect-gpu` unconditionally ("Capability-gate
the heavy stuff — `detect-gpu` (MIT) before loading anything WebGL") and the Snooza build plan §10
also recommends it as settled infrastructure, with no mention of the runtime-fetch risk. This isn't
a contradiction of fact (nobody has verified it either way) — it's a **contradiction of confidence
level**: one document treats it as a blocking open question, two treat it as decided.

---

## 2. Register omissions (highest-value part of this review)

Sampling each of the nine sources against the register's Sections 1-5:

### Present and correctly consolidated
- The GSAP licence carve-out (Section 0) — correctly pulled from gapcheck, with the right quote.
- LYGIA / OGL / gl-transitions per-file licence nuance (Section 0 table) — correctly pulled from
  gapcheck's re-verification table, including the "two reports called it flatly MIT" catch.
- The `sgs/google-reviews` WCAG 2.5.7 dead-end and the `trustpilot-reviews`/`google-reviews`
  hardcoded-`smooth` reduced-motion miss — both correctly carried from `fx-client-readiness-built.md`
  into Section 1 gap 1 territory (though see the caution box, which is itself about this item).
- Audio sensitivity/discoverability, fx-morph verification status, D451 status — all correctly
  pulled from `fx-client-readiness-partial.md`.

### Missing entirely

1. **Motion-accessibility gap beyond `prefers-reduced-motion` — WCAG 2.1 SC 2.2.2 (Pause/Stop/Hide)
   and SC 2.3.1 (Three Flashes).** `2026-08-03-motion-survey-gapcheck.md` §2 item #13 states plainly
   that the ecosystem survey's own recommended CSS marquee and tsParticles background **both need an
   operable pause control**, and the fluid/particle WebGL family needs a flash-rate check — and that
   Bean's own stated WCAG 2.1 AA baseline is not met "as described" by two of the survey's own picks.
   This is not a nice-to-have finding: it is a direct hit against a **non-negotiable rule already in
   this project's CLAUDE.md**. It is absent from the register's Section 1, Section 2, and Section 3
   entirely. This is the single highest-value omission in this review — an accessibility compliance
   gap tied to the project's own hard rule, found by a source report, and dropped.

2. **General-purpose MIT animation engines (Motion 2.3kb, anime.js v4) as their own missing
   category**, not just a licence-escape footnote. Gapcheck's #4 argues these matter "twice over"
   given the GSAP carve-out — they are a real alternative render path for the *distributed plugin's*
   client-facing controls specifically (gapcheck's recommended option 3 for the licence risk). The
   register only mentions them in Section 0 as an "escape hatch if ever needed" one-liner; it does
   not carry forward anime.js v4.5's Three.js adapter (an MIT route to GSAP-style shader-uniform
   driving) or anime.js v4.4's built-in `scrambleText()` (directly undercuts the register's/survey's
   own "hand-roll the scramble effect" recommendation, since a maintained MIT implementation now
   exists).

3. **The self-contradicting FLIP verdict.** Gapcheck §3 item 7 catches the ecosystem survey
   recommending GSAP because "it's now all free" in one section, then dismissing FLIP as "React-only"
   two sections later while ignoring that GSAP's own Flip plugin is vanilla and free. This is exactly
   the kind of "one report contradicted its own headline two sections later" pattern the brief asked
   me to hunt for — found, but not in the register, which never mentions Flip/FLIP at all.

4. **No gzip/shipped-byte figure exists anywhere across all nine reports** (gapcheck §3 item 1) —
   every size in the register's own tables (34KB OGL, 120KB Tier W allowance) traces back to
   unpacked-tarball or bundlephobia estimates, not a real build measurement. The register states the
   120KB allowance as a firm decision (D1) without flagging that no one has actually built and
   measured a Tier W page yet. This is a measurement-vs-assertion gap the project's own rules treat
   as serious (`prove-the-cause-before-fix.md`, `a-file-scoped-search-hides-the-writer` family of
   lessons) and it applies directly to a numeric byte-budget decision Bean is being asked to ratify.

5. **The "email GreenSock for written confirmation" action.** Gapcheck states this plainly as
   *"the recommendation"* — ten minutes, free, addresses the single biggest legal-exposure finding in
   the whole review. It appears nowhere in the register as an action item with an owner or a
   checkable done-when. See §3 below (unactionable entries).

6. **iOS Safari WebGL context-loss** is present in the register (Section 4, "three house contracts")
   but the *severity ranking* from `webgl-github-survey.md` §5 — "the single most-repeated failure
   mode across every library surveyed... Safari/iOS is not an edge case, it's a large chunk of mobile
   traffic" — is flattened into one bullet alongside GPU disposal and pause-when-hidden. The source
   report treats it as the standout risk; the register treats all three as equal.

7. **Rive as a complementary block for authored interaction (not shader) motion.** Present in
   `shader-authoring-surface.md` §3 as a "genuine, complementary route... worth building a
   `sgs/rive-embed` block around", with a concrete licence/bundle story. Absent from the register's
   missing-categories list (item 7 mentions only "Lottie", conflating the two — Lottie and Rive solve
   different problems per the source report, and the register's own item 7 note "H?" suggests the
   Rive/Lottie distinction was not carried through).

---

## 3. Unactionable entries

- **Section 0's `⚠ Copyright note`** ("reworking a restrictively-licensed library does not make it
  yours") — true and useful, but no action, owner, or done-when attached. It reads as a permanent
  caution with nothing to close.
- **Section 4 D1-D4** are framed as "decisions pending Bean" but the register gives no mechanism for
  Bean to answer them (no checkbox, no "reply with A/B/C/D", no linked follow-up doc). Per the user's
  own ADHD-collaboration Rule 9 (negotiated decisions: menu + ranking, Bean picks), these should be
  posed as a numbered menu with one recommendation each, not a bare options table with no next step.
- **"Email GreenSock" (gapcheck's own top recommendation) has no home.** It is the single cheapest,
  highest-leverage action in the entire nine-report set and appears in zero of: the register's
  Section 0, Section 3, Section 4, `LEDGER.md`, or `parking.md`. There is no way for a fresh session
  to know this is outstanding.
- **Section 1's "Structurally agency-only" list** (image-sequence, fx-morph, fx-scramble) says
  "Label them in the editor" but names no file, no attribute, no block to touch first. Compare to the
  rest of Section 1, which has file:line citations throughout — this subsection is the one place that
  drops to prose-only.
- **Section 5 ("Strategic framing")** is pure narrative with no action at all — fine as framing, but
  it sits at the end of the register with nothing telling the reader it is not an action item (every
  other section implies one).

---

## 4. Duplicate / overlapping registers — the authority map

Six documents now describe live-or-pending motion/FX work:

| Doc | What it actually owns | Would a fresh session find it first? |
|---|---|---|
| `.claude/LEDGER.md` | CLAUDE.md's own canonical pointer for "current front" | **Yes, by rule** — but see below, it is silent on all three 2026-08-03 deliverables |
| `.claude/plans/2026-08-03-motion-gap-register.md` | New/missing FX categories, licence corrections, Tier W decisions | Only if told to look — not linked from LEDGER |
| `.claude/plans/2026-07-31-motion-wave-D-client-readiness.md` | The OPEN step list for Spec 38 execution (Steps Z/12/20/R/O/U/21) | Its own header says "if it contradicts this plan, the LEDGER wins" — correct self-deference, but LEDGER doesn't currently carry the contradiction check either |
| `.claude/specs/38-SGS-MOTION-SYSTEM.md` | The spec of record (Tier definitions, FR numbers) | Yes, spec roster is authoritative per `specs/README.md` |
| `sites/snooza-chair/CLAUDE.md` + `.claude/plans/2026-08-03-snooza-configurator-build-plan.md` | Client facts vs. the build plan for them | See §1a — these two actively disagree right now |
| The nine `reports/2026-08-0{2,3}-*.md` | Raw research, meant to be read once and folded into the register | Correctly framed as historical inputs, not registers — no issue here |

**Verdict: this is not yet redundant, but it is one broken link away from being unreachable.**
The two open-register documents (`motion-gap-register.md` and `2026-07-31-motion-wave-D-client-
readiness.md`) have genuinely different scopes (one is "what's missing/wrong", the other is "what's
left to execute") and both explicitly defer to LEDGER as the tie-breaker. That's a workable shape —
**provided LEDGER actually mentions them.** It currently does not (see §5). A fresh session that
opens LEDGER.md first — which the project's own rules say to do — will not learn that the gap
register or the Snooza plan exist at all.

---

## 5. Stale cross-references

- **`.claude/specs/38-SGS-MOTION-SYSTEM.md` line 81 cites "D479"** as the decision that added Tier W,
  "Bean-approved on all four open decisions." `.claude/decisions.md`'s most recent heading is
  **`## D478`** — D479 does not exist anywhere in `decisions.md`. Either the decision was never
  logged, or it was logged somewhere else and not linked. Per this project's own D-ceiling discipline
  (`grep -oE '^## D[0-9]+' .claude/decisions.md | ... | tail -1`), any session checking the D-ceiling
  right now will not find the decision the spec claims exists.
- **`.claude/LEDGER.md`'s `last_updated: 2026-08-02`** frontmatter is one calendar day stale against
  the three 2026-08-03 deliverables (the gap register, the Tier W spec addition/D479, the Snooza
  build plan) — none of which are mentioned anywhere in the file's body either. This is the doc-op
  standard's own D101 rule ("handoff docs carry forward structural defences... never subtract") in
  reverse: it isn't dropping a defence, it's simply not aware three new artefacts exist.
- **No dangling file-path links found** in the six primary targets — every `.claude/reports/...` and
  `.claude/plans/...` path cited by the register resolves to a real file (spot-checked all nine
  source-report filenames against the register's header list — they match exactly, including
  filenames).

---

## 6. Missing context a fresh session would need

- **Which of the two Snooza documents wins** when they disagree (see §1a) is not stated anywhere.
  Absent an explicit ruling, a fresh session has a 50/50 chance of building against the stale 24-SKU
  model.
- **Whether Bean has actually decided D1-D4 in Section 4 of the gap register.** The register presents
  them as "pending"; nothing in this conversation's context or any doc says they were answered. A
  fresh session cannot tell whether Tier W is greenlit or still hypothetical without asking Bean again
  — which defeats the purpose of writing the decisions down.
- **The relationship between the two open registers' step numbering.** `2026-07-31-motion-wave-D-
  client-readiness.md` uses "Step Z/12/20/R/O/U/21"; the new gap register uses numbered table rows
  with no cross-reference to those step IDs. A session working from one has no way to tell if an item
  in the other has already been scheduled.

---

## Where things are genuinely consistent (no manufactured findings)

- The LYGIA/OGL/gl-transitions licence corrections are consistent across `webgl-github-survey.md`,
  `webgl-effect-repos.md`, `motion-survey-gapcheck.md`, and the register — this is the one licence
  question where all four documents agree and the register's Section 0 table is an accurate summary.
- The `sgs/google-reviews` carousel keyboard dead-end is described identically (same root cause, same
  block, same fix direction) in both `fx-client-readiness-built.md` §3 and the register's caution box
  — no drift between them on the facts, only on the register's own meta-point that the caution box
  makes (verify dates, don't trust "known defect" claims).
- The Snooza build plan's own internal sections (§5 through §11) are mutually consistent *with each
  other* — the 24/10 figures repeat identically throughout that one document. The contradiction is
  entirely external, against the same-day CLAUDE.md correction, not an internal inconsistency within
  the plan itself.
- Spec 38's Tier W admission-test wording and the register's Section 4 "Admission test (5 parts)"
  describe the same five-part test with matching substance (not identical wording, but no conflict).
