---
doc_type: session
project: small-giants-wp
date: 2026-08-08
track: 1b (Spec 35 — inspector control contracts)
note: "Swept from LEDGER.md when the enforcement session closed. Filename is deliberately suffixed
  `-track1b-enforcement`: `session-2026-08-08.md` already existed (the ledger-rotate hook's own
  snapshot, untracked) and writing there would have destroyed another session's file."
---

# 2026-08-08 — Track 1b: enforcement starts

## Swept VERBATIM from the LEDGER's "FOR BEAN" section

Kept word-for-word because two of its bullets were **overtaken by this session's work** and the
correction is only legible next to what it corrected. Preserved, not tidied.

> **Where 2026-08-08 left things, in a sentence each:**
> - **You were right that the 27-item checklist was the wrong shape. It has now been replaced** by a
>   **contract per control type** — for colour, links, sizes, hover, media and so on, one fixed way of
>   doing it, with a written list of the wrong-but-similar ways to catch. The old checklist is retired.
> - **Why the old shape kept failing:** each rule was written against the one component its author had
>   in mind, so anything doing the same job under a different name walked past. A gate went "40 → 0",
>   someone wrote "DONE — all raw URL fields migrated", and the two biggest offenders had never been in
>   that gate's field of view at all.
> - **Five safety checks exist and are plugged into nothing** — including the linter you already pay
>   for, which reports 11,932 problems the moment it's run. That's most of Task F's work: wiring, not
>   writing.
> - **53 settings your framework renders that no client can reach.** Declared, painted on the page, no
>   control anywhere. Proven by running the check that's supposed to catch them — it sees none of them.
> - **Two blocks ask a non-technical client to type raw CSS by hand.** One's help text literally says
>   "a raw CSS box-shadow value, e.g. 0 6px 24px rgba(0,0,0,0.15)".
> - **I had the whole thing torn apart by four independent reviewers first, and they were right to.**
>   It would have deleted an accessibility requirement, wiped the only written record of your
>   phone/tablet sizes, and reverted a fix you diagnosed yourself. Eleven of my numbers were wrong.
>   **All of that is now fixed and the replacement is signed off** — every one of the 30 old items is
>   either folded into a control contract or carried over word-for-word, with a table proving it.
> - **Your instinct about the database was correct.** The categorisation every new rule gets aimed with
>   was wrong in four places, and the cause was the *same* bug as the gates: a hardcoded list of
>   component names. **All four are now fixed.** 41 settings were filed under the wrong kind of control
>   (a border width filed as a colour picker); and 36 categories turned out to be **dead labels — no
>   code wrote them, no code read them, for months**. The plan wanted to revive them; instead each
>   block now states the one fact that was actually needed about itself.

**Two of those are now SUPERSEDED by this session — that is why they were swept, not deleted:**
- *"Five safety checks … plugged into nothing"* → **all five are now wired** (`071b7915`), advisory,
  each with a demonstrated failing case. ⚠ The **11,932 ESLint figure remains UNVERIFIED** — nobody
  has re-run it; `lint:js` was deliberately NOT wired (E6 point 9 forbids fail-closed against a
  nonzero backlog).
- *"53 settings … no control anywhere"* → **53 was never the population.** See D530: it sums four
  audited families and counts only `physics-canvas`'s BOX subset, not its 79 unreachable container
  attrs. Live measurement is **280 across 35 of 83 blocks**, containing the 53.

## What this session did

**Task 1 — roster re-measure. EMPTY DIFF.** The load-bearing result: D523/D525 wrote
`inspector_control_type`, and `build-roster.py:91` derives `surfaces.*` from a haystack including
that column. `surfaces.animation` scopes `17-reduced-motion-gate`, a live GATE-mode WCAG 2.3.3 rule,
and a 2026-07-30 regen once flipped 18 blocks and fired 18 false-positive WARNs on it. Nothing moved.
`styling=64 colour=63 link=17 media=30 animation=20` over 83 blocks.

**Task 2 — rule 21 `render-without-control` (D530, `76f44a1d`).** The complement of
`check-dead-controls.js` CHECK 4, which fires only when an attr has no control AND no render, so the
whole fourth quadrant was invisible to it. Advisory; `--check` exits 0; `run.js --self-test` 10/10 +
harness meta-check. Both documented traps closed by ONE mechanism (a literal PascalCase fragment
against a concatenation boundary, applied symmetrically): brand-strip yields exactly its 4 tier
attrs; `fontSizeTablet` does not false-positive.

Three corrections forced by measurement — **826 → 611 → 284 → 280**:
1. shared components ALSO live in block-local dirs (`src/blocks/container/components/ContainerWrapperControls.js`)
2. that 57KB file also EXPORTS the individual panels (`LayoutPanel`, `WidthPanel`, …) — blocks render
   those, never the façade
3. a class file must be invoked as a class; a bare `render(` predicate matched 34 of 84 blocks

Blast radius contained deliberately: widened discovery lives INSIDE rule 21, not `core/components.js`
(read by rules 01/18). Verified unchanged: 01=65, 18=15, 20=23, 03=15.

**Task 3 — five dead gates wired advisory (`071b7915`).** Delegated to Sonnet, verified
independently. The agent CORRECTED the brief: `check-duplicate-controls.js` and
`audit-block-file-consistency.py` also lacked `--self-test`, not just the two named. Live findings:
duplicate-controls 88, file-consistency 25, simple-surface-cap 2/2, uniformity 0, universal-fit 0.

**CO-28 + the sequencing (D531).** Bean raised consistent control ORDER. Recorded as an obligation,
UNENFORCED by design. ⚠ **My first claim that it "existed nowhere" was WRONG** — Cross-cutting A
already carried it as competitor research (~line 980); a grep truncated at 20 hits produced the false
absence. CO-28 is a PROMOTION of that research, not a discovery.

Then Bean asked whether tab standardisation belongs. It does — and it goes FIRST:
**65 of 83 blocks have 2+ panels and no `group` prop**, so everything lands in Settings. Order cannot
be standardised across Settings/Styles while most blocks never split into two tabs. Placement needs
no design gate (12 of 14 contracts carry a `Tab` field; §6 field 4: behaviour → Settings, appearance
→ Styles). Agreed sequence: 6 extension files → the 65 by hand + default-open (23 violate) →
promote `01-tab-group` to gate → THEN CO-28.

## Findings that outlived the tasks

1. **The QC council's raw output was never preserved.** No report file for 2026-08-07/08 anywhere;
   only summaries (findings A–I, D527, the ABSORPTION MAP). That is why the ordering point was lost
   until Bean recalled it. **Future councils: commit verbatim per-rater output before acting.**
2. **ABSORPTION MAP "30/30" is not fully verifiable.** Rows 22, 24, 25, 26 say `CARRIED` and name no
   destination, where every other row cites a CO or §field — the same defect the council caught twice
   inside that very table. Marked UNVERIFIED, not discharged; not repaired, because the repair needs
   to know where each actually went.
3. **A truncated grep manufactures a false absence** (the CO-28 error). `Select-Object -First 20` on a
   search whose hit sits at line ~980 cannot show presence. Sibling of the existing
   `a-greps-blind-spot-is-the-shape-of-the-grep` lesson.
4. **CRLF vs LF nearly produced a 7,679-line spurious diff** in the decisions sweep. Python's default
   text mode rewrites every CRLF to LF; caught because the script's byte count disagreed with the
   gate's by exactly the line count. Fixed with `newline=""` on both read and write.

## Doc-size sweep (same session)

`decisions.md` 1,129,290 → **1,047,198 bytes**; 22 legacy-format entries moved VERBATIM to
`memory/decisions-archive.md`. **Selection was by CITATION, not age** — 116 legacy entries were KEPT
because a live doc cites them (D293, D294, D276, D336, D220 …). Age is not the same as
non-load-bearing, and a blanket "archive everything old" would have moved live binding rules.
