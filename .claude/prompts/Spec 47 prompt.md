Invoke /autopilot before doing anything else.

CONTEXT

Spec 47's "computed route" is the measuring tool that renders a Claude Design draft, walks the live SGS
WordPress site for client Eye Care, and classifies every difference it finds: **F** means a candidate framework
gap (the framework has no setting that could close it) and **W** means explained, so not a gap. Its Session C2
cleanup is COMPLETE. This prompt is the whole of the route's remaining work, which Bean has assigned to one
owner — not a single task.

Branch `main`, HEAD `edd8b54fe`, pushed, 0 ahead / 0 behind. Route suite **592 of 592** green on a quiet host,
route lint and `check-no-client-names.py` exit 0, handoff preflight 4 of 4.

READ FIRST
- `.claude/reports/2026-10-06-session-c2/CANVAS-SETTABLE-CONFIRMATION.md` — the canvas instrument, all 63
  verdicts, the measured root cause, and the guards. Read before touching task 1.
- `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` §5 "Residual" — what is open, including CR6.
- `.claude/plans/2026-10-02-eye-care-fix-register.md` — the CR rows in tasks 2 to 5 live here.

ALREADY CLOSED — do not redo any of these
- **`benchmark.mjs --noise`**: ran in full, 10 runs on a quiet host. 5 of 5 scored cases caught (case `a` is
  unscorable because the draft shares the gap, though the walker still emitted a row, so it detected 6 of 6 and
  is scored on 5 of 5). Noise settled at **5 rows, every one a PHASE artefact** — a draft view-swap fade, the
  `sgs/trust-bar` marquee's scroll phase, and one `box-shadow` read at t≈0.999. **Host load is EXCLUDED, not
  confirmed**, and so is detector flakiness. A run reading 0 was never evidence of absence, because every cause
  is phase-dependent. **Do not re-run it.** `BENCHMARK-NOISE-RESULT.md`.
- **`mobile-menu` pairing**: all 17 surfaces carry `handScope`, and the data is now IN GIT (it previously
  existed only in the working tree, so a clean clone had the gate covering 1 of 17).
- **`sgs/hero`'s three undetermined calibration settings.** `maxWidth` is a REAL framework gap (see guardrails);
  the two tier background images are explained, with one candidate live gap left to confirm.
- **Register alias modelling.** `lib/register-sweep.mjs::registerItems` now reads a Fix cell that is NOTHING BUT
  a pointer as `aliasOf` and feeds `covers`, so an alias stops counting as independent work. Exactly 3 aliases
  across 201 items: `3`→17, `61`→59, `N8`→N2B. **Any open-work figure that counted those three separately is
  over by three.** Whole-cell match only, three tests.

---

TASK 1 — reclassify the canvas-settable rows (~30 min, no host needed)

**The measurement is DONE; only the reclassification is owed.** All 63 families were confirmed live on one SHA
(2026-10-07, remote, after peer d8's deploy): **22 REFUTED + 37 NO-RULE = 59 refuted (164 claims), 4 CONFIRMED
(4 claims), 0 ABSENT.** 3,907 stylesheets read, 0 skipped.

Why they are refuted, measured not inferred: `lib/triage.mjs::reachesElement` **FAILS OPEN** — when
`emissionOf` cannot determine where a setting emits its CSS it returns `true`, and it returned null for every
refuted citation. So those rows were classed W on a citation that was never tested, which is exactly what
R-47-12 requires be tested. `reachabilityVerified` now records which citations were actually assessed, and
**no row was reclassified by that**, deliberately.

⚠️ **The 4 CONFIRMED are "not refuted", NOT "proven".** One is sound (`sgs/trust-bar::columns`, whose matching
rule names the cited instance's own uid). The other three matched only because the winning rule is scoped by
`.sgs-shop-filters`, a class the cited container carries — that proves the block's class SCOPES the rule, not
that the SETTING drives it. Treat them as unresolved; do not cite them as counter-examples.

DONE when the 59 refuted families' rows move W → F in `sites/eye-care-ward-end/build/qa/triage/*.json`.
**Apply it ONCE over all 63, never in halves** — F is 173 today and a half-applied move makes that figure mean
two different things in one document. **Prefer fixing the gate over hand-editing verdicts:** supply
`ctx.emissionFor`, which `emissionOf` reads at `lib/triage.mjs`:367 and **no caller sets**, then re-run triage
so the classification follows from the code.

Verification: the three commit gates, and compare sweep-over-sweep on
`lib/issue-classes.mjs::normalisedIssueKey`, NEVER the raw `issueKey` — a cosmetic path change re-keys rows
wholesale with no verdict change, and `issueKey` itself must stay byte-identical.

---

TASK 2 — the re-calibration group: CR3, CR7, CR10, CR11, CR17 (~40 min, needs a QUIET HOST)

**The route is already fixed for each of these. They need a quiet host, not a decision — and they are now
UNBLOCKED:** both blocking reseeds (peer d8's typography reseed and peer 23's cart reseed) have landed.

| Row | State |
|---|---|
| CR3 | accordion + accordion-item already re-calibrated after S5 |
| CR7 | every box-shaped corner-radius read dead; fixed in the route (`4ea7e489f`), 54 of 55 blocks re-calibrated |
| CR10 | aspect-ratio never measured; route done, 7 blocks' re-calibration open |
| CR11 | a border style alone read dead on ~50 blocks; fixed in the route (`3b36515ff`), re-calibration open |
| CR17 | `sgs/business-info` text-before-value; fixture updated (`f4d5fa0fe`), the run timed out twice |

Run `calibrate.mjs` per block. **Re-read any count from the framework DB rather than a doc** — two reseeds
landed tonight, `block_attributes` is 12,140 and the DB is the source of truth. Message peers before any host
work.

---

TASK 3 — CR6, the box zero-fill: A MIGRATION, NOT A FOCUSED FIX (scope decision for Bean first)

**Read this before estimating it.** The LEDGER once framed CR6 as "awkward rather than large". It is both, and
the measurement replaces that framing:

- The defect is `plugins/sgs-blocks/includes/helpers-box.php::sgs_box_object_shorthand`, which builds a
  four-value CSS **shorthand** and fills any unset side with `'0'` (its lines 184-187). A shorthand inherently
  sets all four sides, so setting one side really does zero the other three. `sgs_corner_object_shorthand` has
  the same shape for corners.
- `lib/resolve.mjs::seedSides` is the route's **workaround** for it — its own comment says "an unset side there
  prints 0, CR6". It back-fills the other three sides from calibration paint. **Fix the PHP and `seedSides`
  becomes actively harmful**, freezing values the client never chose, which is why they must land together.
- **Scope, measured: 178 call sites across 56 files** under `src/` and `includes/` (342 counting `build/`), and
  **no per-side helper exists.** The fix changes the helper's contract from "return a shorthand string" to "emit
  only the sides that are set", so every caller moves. CLAUDE.md requires the detector first and
  `.claude/THE-MIGRATION-METHOD.md` before the fourth such edit.

**Put the options to Bean before starting; do not re-estimate it as small:**
1. **Full migration** — detector, then convert in batches. Removes a defect that silently zeroes three sides of
   any box a client half-sets.
2. **Park it**, with this scope recorded so nobody re-estimates it from the old framing.
3. **Narrow it** — add a per-side helper and convert only the blocks where CR6 actually bites, leaving the rest
   on the shorthand. Cheaper, but leaves two paths in one helper.

---

TASK 4 — still to prove: CR1 with CR9, then CR2, CR4, CR5 (~30 min to triage)

No owner is needed yet; these need evidence before they need a fix. **CR9 is explicitly CR1's pattern, so prove
them together.** CR1/CR9: per-device gap and content width reach 375 and 1440 but not 768. CR2: a header's
scrolled background and text colours show no change. CR4: large dead sets to triage (nav-bar-menu 77,
product-card 56, cart 50, mega-panel 30, nav-drawer 28, icon-list 28). CR5: not calibrated at all (brand-strip
times out, heading shrunk size, nav-drawer hover). Use `/systematic-debugging`.

TASK 5 — partly fixed, needs finishing

CR14 (`e383cdef6`): Solve cannot write a setting on an element no walker pair measures. CR18: Solve saw only the
elements a hand-written walker config names — About and Contact are done, **Lenses and the rest still need
re-pairing.**

NOT YOURS — do not pick up without Bean

**CR12, the dark-mode toggle.** Bean's read is post-launch, so record it as **parked-pending-Bean, not open**.
Correct the record while you are there: dark mode **IS implemented** —
`theme/sgs-theme/assets/css/dark-mode.css` (4.4 KB) and `theme/sgs-theme/assets/js/dark-mode.js` (5.1 KB) both
exist. CR12 is not an unbuilt feature; it is that the toggle renders nothing for current clients.

---

INPUTS THAT CHANGED TONIGHT — read as deliberate, not as defects

1. **`sgsBlockLinkAuto` no longer exists on `sgs/product-card`** (`3db77f090`). `supports.sgs.blockLinkAutoUrl`
   was replaced by a `blockLinkAlways` flag, because Bean ruled the whole-card link must not be switchable off.
   **Gone deliberately, not lost.**
2. **`sgs/cart::countPopAnimation` changed type**, boolean → string enum (`off` / `change` / `load-and-change`).
   `header.tree.json` held `true` against the new enum, which would have coerced to `off` and made the fix a
   silent no-op; it was migrated to `"load-and-change"`.
3. **Two new `sgs/cart` attributes**: `freeDeliveryFillDuration` (`css_property = transition-duration`) and
   `freeDeliveryFillEasing` (`transition-timing-function`), seeded.

4. ⚠️ **THOSE TWO WILL READ DEAD IN CALIBRATION — but NOT for the reason you may be told.** The claim handed
   over was "`markersFor` has no `transition,*` branch, so no transition row calibrates anywhere". **That is
   stale and wrong.** P4 added one: `lib/calibrate-markers.mjs::transitionMarker` exists and is wired into
   `markersFor` at line 219, and the specs roster records that transition rows DO calibrate.

   The real cause is a **NAMING-CONVENTION mismatch**, which is both narrower and fixable. `transitionMarker`
   gates on the attribute NAME with `/(^|[a-z])Transition(Duration)$|^transitionDuration$/` (and the `Easing`
   twin). `freeDeliveryFillDuration` and `freeDeliveryFillEasing` do not contain "Transition", so the name gate
   fails and no marker is produced — even though their `css_property` half of the gate passes. Verified against
   the DB after the reseed.

   Two ways to close it, and this is a real choice: **rename** the attributes to `…TransitionDuration` /
   `…TransitionEasing` to follow the convention, or **widen the gate** to key on `css_property` alone, which it
   already checks, rather than requiring the name pattern. The second is the better fix if any other block has
   the same shape — check before choosing. These two are the first test cases either way.

---

TWO AUTHORING RULES WORTH KEEPING (both from gate failures, both generalisable)

- **A CSS shorthand that consumes two custom properties makes both backing attributes declare the same
  `css_property`, and the resolver cannot disambiguate them.** `transition: width var(--duration) var(--easing)`
  made two attributes seed as `css_property = transition`, identical on every routing axis, and db-consistency
  Check #1 and Check #8 both failed correctly with no baseline. **Fix at the source: split the shorthand into
  longhands** (`transition-property` / `transition-duration` / `transition-timing-function`) so each attribute
  owns one real property. Adding a `css_element` is the weaker fix, because the resolver reads `css_property`
  and `css_element` is inert until recalibration.
- **A marker gate that keys on an attribute NAME silently excludes correctly-authored attributes.** See input 4.
  A gate keyed on the DB fact (`css_property`) survives naming drift; one keyed on a name convention does not.

---

GUARDRAILS

- Three gates before any commit: `node --test "scripts/computed-route/tests/*.test.mjs"` (**592** plus anything
  you add), `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`
  (exit 0 — it refuses an undocumented route file or export), `python scripts/check-no-client-names.py --check`.
- `tests/tree.test.mjs` legitimately FAILS via the R-47-11 quiet-host guard while any peer runs a deploy or
  reseed. Check `ps -ef | grep -E "[s]gs-update|[b]uild-deploy"` before believing a failure, and **never call a
  failure a flake without a cause** — that mistake was made and corrected twice on 2026-10-06.
- **Never cache a DB-derived count in a test or a doc.** `tests/db.test.mjs` pinned the enum discovery pool at
  exactly 633 and broke on a legitimate reseed at 635. It now asserts a floor plus named members, because a
  DECREASE is the R-47-10 hazard while an INCREASE is ordinary schema growth. Do not re-pin it.
- `solve.mjs` DEFAULTS TO 3 WRITE ROUNDS. Any measurement needs `--rounds 0`, then prove it wrote nothing:
  `git status --porcelain -- 'sites/eye-care-ward-end/build/*.tree.json'` must be empty.
- Every fix ships BOTH halves of its negative control: a test red on revert AND one proving it does not
  over-suppress. **A unit test cannot see a wiring gap**, so a new optional parameter or export needs a
  SOURCE-LEVEL detector on the call site, proved red by planting the old call.
- **A generated artefact a gate reads can live only in the working tree.** `handScope` was absent at HEAD for 16
  of 17 surfaces while every local signal said the gate covered all 17. Run
  `git status --porcelain -- <the artefact>` before claiming a gate covers anything.
- `.claude/LEDGER.md` has **65 bytes** against its 24,576 cap. Cut a finished item before adding, and run
  `python .claude/hooks/handoff-preflight.py --check` BEFORE pushing, not after.
- Serialise host work and message peers first. Peers `small-giants-wp-e6` and `small-giants-wp-d8` are closed;
  `small-giants-wp-23` owns the client-visible register rows and was completing a deploy. A reseed rewrites the
  shared framework DB, so **re-read any DB count rather than trusting a doc**.
- Do NOT delete `.claude/prompts/63 Item Categorisation Work Prompt.md` — session 23 owns that track.
- Do NOT "fix" `section.sgs-hero { max-width: none }`. Hero's `maxWidth` IS a real framework gap — the wrapper
  emits the base value on `.uid` (0-1-0) and that rule is (0-1-1), so it wins; proven live by inserting each
  selector into the page's CSSOM, with a container control showing a one-class rule is not inherently powerless.
  But removing the rule re-breaks D725's 24px-off-screen case, proven live by a 2026-09-08 council. The better
  precedent is wrapping a block stylesheet's own defaults in `:where()` so the control always outranks them.
  Shared-wrapper, design-gate work — not a drive-by.
