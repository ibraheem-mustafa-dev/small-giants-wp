# Session 2026-08-01 — Wave D wave 1 review narrative (swept from LEDGER)

Swept 2026-08-01 when the LEDGER exceeded its 24,576-byte cap. This is the REVIEW-session narrative
that preceded Wave D wave 2. Live status lives in LEDGER.md; this is history.

> **QC note (2026-08-01) — the subagent RETURNED and its verdict was INCONSISTENT, now resolved.** I ran the same verification
> myself as a backstop and it caught two real inconsistencies, both since fixed: the step table said
> "NOT STARTED (14)" while listing **15** items, and it used original numbering only while the
> rewritten plan uses **mixed** numbering (letters A–J for steps added today, original numbers kept so
> older references still resolve). Everything else verified against source: 12 pipeline stages, the
> seeder no longer writing `css_property`, 207 override entries with zero `fx:` rows, the build gate
> `--check`-only, `FORCED_PANEL_HOSTS` gone, roster 28 with `decorative-image = [motion-path, scrub]`,
> 19 single-provision blocks (13+6), 144 STOPs, 24 plan steps, D-ceiling D436.
> It found the step-table defect I had also found, but diagnosed it BETTER: the stray `3` was a
> duplicate of the HELD buybox step, so the "(14)" label had been correct and the LIST held one item
> too many. My own fix then re-introduced the same duplication in a new form (buybox listed under both
> HELD and OPEN) and mislabelled 24 items as "(16)". Both are now fixed and the table is rewritten
> plainly. **Everything else the subagent checked came back clean**, including a catch I would have
> missed: `82a08b8a`'s subject line is about float-clearing, but its diff also carries the
> `webpackIgnore` pragma, so its listing under Step 17 is correct rather than a misattribution.

## ⭐ NEXT SESSION IS A REVIEW SESSION — start here

You have been away from your PC across several motion sessions and asked for a plain-English
timeline before we build anything else. This is it.

### The last three motion sessions, in order

**1. Wave C — BUILD (D426).** The motion engine itself. Scroll-scrubbed effects, draggable
carousels, text-scramble, a new before/after comparison slider, a new scroll-scrubbed image
sequence. Shipped and deployed. Nobody had looked at it yet.

**2. Wave C — VERIFY (D427, D430, D431).** Everything got watched moving in a real browser, twice
over — once normally, once with "reduce motion" switched on. That found three faults no build gate
could have seen: the gallery carousel never actually slid sideways, the drag feature could never
have worked, and the before/after slider's editor preview was broken. Then a six-persona review
graded the whole surface and scored **supportability D+** — meaning a client could not operate it.

**3. Wave D — CLIENT-READINESS (D434, D435, D436 — today).** Turning an engine into something a
client can use and a five-site schedule can carry. **20 commits. Eight of the 24 steps closed.**

### What actually got fixed today

- **A clean copy of the code can build again.** Six scripts crashed on a machine without the local
  database — the real cause was one file running database work at import time, before any of the
  "database missing, skip" checks could run.
- **Effects are only offered where they can work.** `morph` was being offered on four blocks that
  are `<div>`s, where it warns and does nothing.
- **The editor console is clean.** Two module errors and two CSS warnings, all traced to real
  causes and fixed.
- **A before/after slider was collapsing to a third of its width** — caused by two floated logos
  earlier on the page, not by a breakpoint as first thought.
- **Motion now exists in five real stock patterns**, so inserting one gives a client tasteful
  motion with zero configuration. Previously motion existed only on test pages.
- **The image-sequence block is honestly scoped agency-only**, with a frame cap and a "verify
  frames" button, because setting one up needs a terminal.
- **The database is now genuinely the single source (D436).** Motion data seeding AND the
  regeneration of the files the live websites load are both stages of `/sgs-update`. Previously a
  separate script wrote some of it at build time, and an unrelated track running the pipeline could
  — and did — wipe motion data out.

### What YOU need to decide (nothing is blocked on me)

1. **Step 7 — a background that follows your mouse.** Three routes, explained in plain English in
   the Wave D plan §6a. Recommend Route A.
2. **FR-38-12 "Flip"** — explained in plain English in the Wave D plan §6b. Its premise turned out
   false; the question is whether a redesign is worth it.
3. **The palette audit** — `border-subtle` is set to a *saturated brand accent* in 7 of 8 client
   snapshots. You ruled this needs a proper audit of every preset slot.
4. **The presets** at `/fx-preset-comparison/` — you said they look great but scramble fires at the
   wrong times. That is now its own step.

### Honest limits

- **Buybox drag is written but NOT shipped.** A gate correctly refused it because it has never been
  seen working on a real render. Its runtime is proven; the emit is not.
- **The scramble preset timing defect you found is real and undiagnosed.** The parameters genuinely
  differ — measured — so it is a trigger/timing bug, not a preset-values bug.
- **Two effects still cannot be measured by our newer browser tooling** — see Measurement limits
  below. The committed Playwright harnesses are the only instrument.

---

