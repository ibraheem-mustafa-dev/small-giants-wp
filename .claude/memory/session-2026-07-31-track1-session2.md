---
doc_type: session
project: small-giants-wp
date: 2026-07-31
track: Track 1 — session 2 (Tasks 6 + 1 closed, 2 built, 3 blocked)
status: Tasks 6 + 1 CLOSED and pushed; Task 2 built but uncommitted; Task 3 blocked; Task 5 baselined
note: "Second Track-1 session of 2026-07-31. The FIRST is memory/session-2026-07-31-track1.md (D428) and remains the authority for Tasks 1-6 briefs. This file holds session 2's detail so LEDGER.md stays under its byte cap."
---

# Track 1 — session 2 record (2026-07-31, D429)

#### ⭐ SECOND Track-1 session, same day (D429) — Tasks 6 + 1 CLOSED, 2 built, 3 blocked
`98ff88df` feature-parity gate ARMED in prebuild · **`e8c72f7a` the oracle fix** · `2f471678` triage.
Report: **`reports/2026-07-31-oracle-attribution-and-probe-target.md`**. D429 in `decisions.md`.

**Task 1 DONE.** Cells are now measured on their OWN element, not the section root. Ground-truth
control **73 → 0** against the artefact committed at `b1a2f30f` and deliberately NOT regenerated.
LANDED 31→55 (floor was 31). **11 real transfer failures surfaced, then TRIAGED: 8 GAPs (no attr
exists — converter cannot fix), 1 genuine routing defect (`sgs-card-grid` `cardRadius` 12→18px),
1 PROBE ARTEFACT of this session's own making.**
⛔ **Still do NOT arm `--with-landed`** — 8 of 11 are impossible-by-construction; it would block
every build.
**Quote `measurable_rate_pct` (46.3%), never `attribution_rate_pct` (99.6%)** — attributing a cell
you cannot measure is not progress. 266 of 499 target element tokens the DB has no record of.
**Known limit, follow-up owed:** the probe matches by BEM class, which assumes the token denotes
the same KIND of element on both sides. When draft and clone differ by TAG (draft `__photo` is an
`<img>`, the clone's is a wrapper `<div>`) a CORRECT clone reads as a defect. Carry the draft tag
and flag a mismatch instead of scoring it.

**Task 2 (nav dropdown) BUILT, harness-green, deliberately NOT COMMITTED.** Walker + render branch +
scoped CSS + 8 attrs + editor controls; `mega-disclosure.js` gained a dropdown geometry branch that
reads its kind from the DOM (`data-sgs-nav-disclosure`) so all FIVE `repositionPanel` call sites stay
byte-identical. 25/25 in `.claude/scratch/nav-submenu-harness-2026-07-31.php` (locates the class by
its own delimiters — the old harness sliced by hard-coded line numbers and had gone stale).
phpcs 0 errors; 6 prebuild gates green. Held back because the visual-diff gate correctly wants a
deploy first. **Do not revert `nav-menu/{render.php,edit.js,block.json}` or `mega-disclosure.js`.**
Also fixed a PRE-EXISTING gap found by probing: nav-menu declared object-shaped
`paddingTablet`/`paddingMobile` but no `supports.sgs.boxFamilies`, so it had ZERO `box_family` rows.

**⛔ Task 3 DEPLOY IS BLOCKED — not by Track 1.** `P-CANARY-2085-UNDECLARED-ATTRS-BLOCK-ALL-DEPLOYS`.
`oldshape-audit` aborts on 8 NEW HIGH findings, all canary post **2085**, all `sgs/buybox` +
`sgs/google-reviews` carrying undeclared attrs (D338 class). **Blocks EVERY deploy by EVERY track.**
Track 1 has zero findings of its own (verified: 0 nav-menu hits; the build altered no generated
roster). Fix the stored content first.

**Task 5 (Spec 35 Part L) baseline RE-DERIVED and all four inherited figures HELD:** `group` 4/81 ·
`StateToggleControl` 3/81 · `hideExtensions` 26/81 · ToolsPanel 20/81; roster confirmed 81, byte-
identical on regeneration. **True scope is smaller than the raw gaps:** 43 of the 78 blocks missing
`StateToggleControl` are legitimately exempt (no hover attrs at all) → ~35 real; only 18 of the 55
missing `hideExtensions` are animation-eligible candidates. Bean's ruling stands: living status, NOT
`parking.md`. Brief = Task 5 in that record.

## Commits

| SHA | What |
|---|---|
| `98ff88df` | Feature-parity gate armed in `prebuild` (Task 6). Built + self-tested last session, never wired because `package.json` was dirty; it was clean today. |
| `e8c72f7a` | The oracle fix (Task 1) — attribution + probe target, 9 files. |
| `2f471678` | Triage of the 11 findings + the canary deploy blocker parked. |

## Council record (3 raters, pre-commit, blub.db 255)

Five findings acted on before `e8c72f7a` landed; **two were live false-LANDED paths**:
1. `getComputedStyle(el,'::before')` on an element with NO `::before` returns a full declaration of
   initial values — never null, never throws — so a coinciding draft value scored LANDED for a box
   the clone never rendered. Guarded on computed `content`.
2. An empty draft value vs `''` from an unset custom property compared equal → LANDED. Now
   `written=False` at attribution rather than a patch to the frozen §6 verdict contract.
3. The control recorded `probe_targets` but `cmd_check` never READ them — the probe half shipped
   unchecked. Now asserted 96/96 and **fails closed** without the field.
4. `cmd_check` joined without the selector — a cell never attributed could read PASS on another
   cell's identical values. `CellInput.source_selector` added (provenance only).
5. `derived_selector` comma chains (`.sgs-hero__headline, h1, h2`) compared as raw strings forced
   every hero/cta headline typography rule UNVERIFIED. Measurable 220 → 231.

Re-ran the live batch after: totals IDENTICAL, so 1 and 2 closed reachable-but-unexercised paths.

## Methodology earned this session

- **A diagnostic that re-implements the thing it measures reports on its own copy.**
  `decompose_unattributed.py` duplicated the attributor's reject branches, so after the fix it still
  printed "393 / 21.2%" — following the brief's own "re-run it and compare" would have concluded the
  fix did nothing. No test fails, because nothing disagrees.
- **Regenerating a control is moving the goalposts unless you prove otherwise.** 98 rows compared
  field-by-field against `git show HEAD:…`; 0 pre-existing expectations changed, 98 gained the new
  field.
- **Fact-check your own findings before quoting them.** 1 of the 11 "defects" was a probe artefact
  of this session's own making — the draft's `__photo` is an `<img>`, the clone's is a wrapper
  `<div>`, and the real image IS correct.
- **Python `write_text()` on Windows rewrites a whole file to CRLF.** Silently converted three files;
  caught by lint, reverted with `newline='
'`.
- **A grep's blind spot is the shape of the grep** — two harness assertions failed because
  `sgs-nav-menu__link-text` contains `sgs-nav-menu__link`. The tests were wrong, not the code;
  proved that before changing anything.
- **`--allow-dirty` is safe only when you have listed what is dirty IN DEPLOY SCOPE.** Here:
  exactly the 4 nav files, none of the co-active track's.
