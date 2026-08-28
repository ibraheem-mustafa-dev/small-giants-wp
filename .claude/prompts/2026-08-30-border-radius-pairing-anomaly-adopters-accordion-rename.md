# Next session — radius pairing, ANOMALY adopters, accordion rename, then close the track

Invoke `/autopilot` before anything else.

**Read D881 in `.claude/decisions.md` first** — it carries the mechanism for everything here. Do not
ask for it to be restated. Spec 35 §14 now opens with an `AMENDED 2026-08-29` box; read that before
touching any border control, because the rest of §14 still describes the pre-migration UI.

---

## What closed on 2026-08-29 — do not re-open

Shape A: 10 blocks on `SgsBorderControl` (`button`, `container`, `heading`, `icon-list`,
`option-picker`, `process-steps`, `product-card`, `quote`, `text`, `timeline`).
`PRIVATE_NEEDS_SWAP 8 → 0`, `PRIVATE_DONE 2 → 10`. ⚠ **`NATIVE_FULL` (38) and `ANOMALY` (7) are
UNCHANGED — 45 blocks are still outside this shape. "Shape A closed" is not "borders done".**

Also closed: the codemod's dropped-`linked` and missing-import defects; `linked` restored on
product-card + quote; the palette-token colour defect in `sgs_border_states_css()`; the
`colourBorder*` stored-content rename on pages 2742/2849/2884; the control reshaped to the native
pair.

⛔ **Per-device border WIDTH is CANCELLED, not deferred** (Bean, 2026-08-29). Plumbing removed at
`f5c9b66ae`. Spec 35's "Promotion trigger" for it is explicitly overruled in the amendment box —
**do not cite that trigger as authority to rebuild it.**

---

## Task 1 — Pair the native radius into `SgsBorderControl`, per block

The component renders `ResponsiveBorderRadiusControl` as the pair's second control **when the caller
passes `onRadiusChange`**. No block wires it yet; all 10 still mount their own separate radius
control. Move each block's existing radius call into the `SgsBorderControl` mount and delete the
standalone one.

⚠ **Radius storage is NOT uniform — read each block before editing.** Some route to
`style.border.radius` base-only; `icon-list` also writes `borderRadiusTablet`/`borderRadiusMobile`;
`whatsapp-cta` has its own tier objects. Preserve each block's storage exactly; only the mount moves.

⚠ **Three radius attrs are already flagged as untriaged** and sit in this task's blast radius —
`.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md:98-99,124`: `multi-button.childBtnBorderRadius`
(new flat box scalar), `mega-panel.borderRadius` (blocked on Track 2), `product-card.ctaBorderRadius`
(detector attribution gap). Also `:105-107`: **`check-box-flat` is wired into prebuild but its exit
code is NOT propagated**, so radius-shape regressions sit behind a passing suite.

10 blocks ⇒ **build the detector first** (`.claude/THE-MIGRATION-METHOD.md`). Extend
`scripts/migrate-border-control.js` with a radius-pairing pass; add fixtures and a negative control
as its existing 18 assertions do.

## Task 2 — The 3 ANOMALY adopters

Exclusions are settled and must not be revisited: `filter-search` (border belongs to its inner
`<input>`) and `social-icons` (border belongs to a repeated item, only under the `outlined` style).

⛔ **SECURITY, do this before adding any `borderStyle` attr.**
`.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md:96`: free-text keyword attrs
(`borderStyle`, `textTransform`) must be filtered `[^a-zA-Z-]` before CSS concatenation; it is
applied at 2 call sites and **9 `render.php` reference `borderStyle` directly and are unaudited**,
with **no gate**. Task 2 adds a 10th. Audit the 9 and gate it, or you are widening a known hole.
Checklist item: `.claude/plans/block-migration-DONE-checklist.md:48`.

⚠ **Decide the gradient-border routing FIRST.** `sgs_border_gradient_css()` has **21 callers** and
covers gradient borders only (`.claude/plans/2026-08-18-inspector-enforcement-programme.md:46-49`) —
a second, parallel border-colour path the composite has never met. `mega-aside` declares
`asideBorderColourGradient`, so they collide in this task. Decide whether gradient border colour
routes through `SgsBorderControl` or stays separate **before** building.

Order (ascending work):
1. **`mega-aside`** — already has `asideBorderWidth`/`asideBorderColour`/`asideBorderColourGradient`
   on the root; only `borderStyle` is missing and `render.php:109` hardcodes `border-style:solid`.
2. **`label`** — has `borderRadius` only. ⚠ Its box CSS comes from the SHARED
   `sgs_label_box_css_rule()`, also used by `sgs/product-card`'s trial tag — so adopting here
   **retro-changes a block already declared closed and live-proven**. That is a re-verification
   obligation on product-card, not just a coupling check.
3. **`whatsapp-cta`** — radius only; the `<a>` IS the block root, and `style.css:13` sets
   `border:none`, so the composite's rules must come from the higher-specificity `.uid` rule.

## Task 3 — `sgs/accordion`'s `style` collision (Bean approved)

**Verified 2026-08-29:** `accordion/block.json` declares `"style"` as a **string**
(`default:"bordered"`) while ALSO declaring `__experimentalBorder`. The string wins, so
`$attributes['style']` is `"bordered"` and every `isset($attributes['style']['color']['text'])`-shaped
read evaluates a non-numeric string offset → `false`. **Its border, colour AND typography supports
have never rendered.** Bean approved renaming the preset attr to free the native `style` object.

- Re-check the live count first (was 31 posts containing `wp:sgs/accordion`, 0 authoring any border)
  and migrate the stored preset value for every one.
- The rename is NOT length-preserving, so the zero-byte assertion used for the button rename does not
  apply — assert on parsed attributes, and back every post up to `.claude/backups/` first.
- ⛔ Never write `post_content` without `--user=1` (KSES strips CSS); never to a page open in the editor.
- `sgs/accordion-item` has the identical `__experimentalBorder` but no `style` string, so ITS native
  path is live. Out of scope; it will be inconsistent with its parent afterwards — flag it.

## Task 4 — Close the two blocks that are NOT live-proven

`sgs/container` and `sgs/option-picker`. The probe measures the OUTERMOST `.wp-block-sgs-<name>`, so
on container it matches the page header's container; option-picker returned NOT RUN.

⚠ **This is the THIRD recurrence of an already-tripled defence** — `STOP-CATALOGUE.md:2352-2360`,
`:2505-2511` and `mistakes.md:253-256` all say: scope every live-DOM query to `.entry-content` or the
block's own uid class, never a bare block-type class. The probe was built without consulting them.
Fix the probe to scope by uid, then close both blocks. **NOT RUN is not a pass.**

## Task 5 — Shape B: reconcile the count and get the gate signed

⚠ **A Rule-7 design gate for this already exists and was never signed:**
`.claude/plans/2026-08-08-element-driven-inspector-design.md:6` — `status: DESIGN — awaiting Bean
sign-off, nothing built`. Its §5 (`:190-200`) mandates a **capability audit before any native strip**:
enumerate what each native support provides, confirm the SGS equivalent exists, strip ONE block,
verify live, then roll out — *"Anything native offers that SGS lacks is built before the strip."*

⚠ **The counts disagree: that doc says 48 blocks declare `__experimentalBorder`; the census says 38
`NATIVE_FULL`.** (38 is that doc's *colour* figure.) Reconcile before sizing Shape B. Note the 48
includes `sgs/accordion`, whose supports never render — so the denominator is inflated and
Spec 35 `:811-812`/`:1342`'s "border builder coverage unverified (1 file against 48 blocks)" rests on it.

⚠ **The duplicate-Border-panel exit condition is unmet and Task 1 does not resolve it.** Same doc,
`:246`: *"Done means: … no duplicate Color/Border panel."* All 10 Shape-A blocks now mount
`SgsBorderControl` **and still declare native border supports** — that IS the duplicate panel. Only
the native strip closes it.

## Task 6 — Doc debt this rollout left

- **4 of the 10 migrated blocks have NO row in the Block Build Status table at all**: `button`,
  `quote`, `text`, `timeline` (`plugins/sgs-blocks/CLAUDE.md:502-546`).
- **5 rows exist but do not mention the migration**: Container (`:504`), Icon List (`:509`), Process
  Steps (`:512`), Option Picker (`:533`), Heading (`:543`). Container is also one of the two
  `sgs_border_states_css()` callers AND the block the probe cannot verify — its row says neither.
- **Accordion's row** (`:520`) is `| Accordion + Accordion Item | Deployed |` — affirmatively
  misleading given Task 3's finding.
- **The Border-controls section** (`:630+`) omits: `PRIVATE_DONE 10` / `NATIVE_FULL 38` / `ANOMALY 7`;
  that width is `ResponsiveBoxControl` with the switcher OFF; that `option-picker` returns NOT RUN;
  the probe's 16/16 self-test; and the sibling gate
  `scripts/check-border-style-without-width.py` (wired at `gates.json:682-683`).
- ⚠ **The probe is UNWIRED** — zero references in `package.json` and `gates.json`. This file warns
  about "built but never wired" three times (`:90-92`, `:121-125`, `:420`). Either wire it or say
  in the section that it is manual-only.
- **`dev-setup.md:1630`** — the `migrate-border-control.js` catalogue row begins mid-sentence
  ("*an already block-private border UI…*"), losing the verb and the component name, so a Step-1
  subject search returns an unreadable row. It also omits the script's hard Shape-B exclusion.
- **Spec 35 §14** fields 1/3, `:123`, `:651-654`, `:2373-2377` and the tier ruling all still describe
  the old UI. The amendment box at the top of §14 flags this; the fields themselves are untouched.

## Task 7 — STOP catalogue + mistakes

An audit classified 12 findings from 2026-08-29. **8 are NEW**, 2 already covered (a page-HTML grep
cannot see lifted CSS; a bare selector matches the first instance), 1 is a sharpening, 1 half-covered.

To **`STOP-CATALOGUE.md`** (uncapped; structural defences):
1. **A field a fixture carries but no assertion reads is untested surface pretending to be tested** —
   the fixture held `linked: true` through 14 green assertions. File beside E6 (`:2061-2078`).
2. **A historical reference is a valid oracle only for properties that reference was itself verified
   to have** — the proof replayed two commits that had both dropped `linked`. ⚠ This CORRECTS
   `STOP-14` (`:1174`) and `STOP-REBUILD-THE-TREE-…` (`:2441`), which currently prescribe the trap;
   file adjacent or they keep prescribing it. Also qualifies `THE-MIGRATION-METHOD.md:673-675`.
3. **Where a path resolves tokens, the TEST VALUE must be a token** — sharpen `:1022-1028`, which
   names the hex trap only as a parenthetical diagnosis, not an imperative.
4. **A guard must not go red because the work succeeded** (`FIXABLE_FLOOR`). Extends the 3-shape gate
   taxonomy at `THE-MIGRATION-METHOD.md:544-547` with a 4th (floor) shape, and contradicts `:284-286`.
   Cheapest fix: **run `--check` against the POST-apply state before registering it**, not only pre.
5. **`read_text` normalises CRLF; assert byte-preservation ON DISK** — an in-memory `len()` check
   where both operands passed the same normalising reader is self-satisfying. ⚠ File adjacent to
   `:223-234`, whose "normalise line endings" rule pointed the wrong way here.
6. **A directory pathspec commits a tracked deletion but skips an untracked addition** — file with
   the four existing pathspec STOPs (`:601`, `:784`, `:2261`, `:2620`), none of which covers it.
7. **`git index.lock` — retry, never delete** (two collisions on 2026-08-29). Zero hits today.
8. **A block declaring a key that collides with a core-reserved attribute silently disables the
   support** (accordion's `style`). Statically decidable; no gate catches it. File beside `:713-726`.

To **`mistakes.md`**: *a verification check that masks the region it should inspect* (the mask-and-compare
that hid the corruption it existed to detect). ⚠ **`mistakes.md` is at 35 entries against its own ~30
target** and its header says so without acting; 2 of the oldest are verbatim duplicates of STOP entries
(`:268-271`, `:288-291`) and 7 remain in the retired stub shape — 2 of those written AFTER the
convention was retired.

To **`THE-MIGRATION-METHOD.md`**: extend the write-side hazards (`:715-723`) — `ensure_ascii` is not
mentioned anywhere and it MUTATES VALUES, not just whitespace; and the JSON-round-trip hazard is
scoped to files, not to attribute JSON inside `post_content` where the blast radius is client data.

## Task 8 — FINAL TASK, after everything above: collapse this track's LEDGER section

Bean's instruction (2026-08-29): once the tasks above are done, **collapse
`## ▶ MAMA'S CLONE TRACK + TASK 0` in `.claude/LEDGER.md` to a pointer**, matching how the finished
tracks are represented (e.g. `## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)` — one line,
"nothing pending", detail single-sourced to its D-number).

Target shape: heading + closure date + `Detail: D881 (+ whatever D-numbers this session adds)` +
one line naming any still-open work and where it lives. Everything else goes; the detail already
lives in `decisions.md`. This frees ~2KB of a file that runs within ~150 bytes of its 24,576 cap.

⛔ **Do this LAST.** Collapsing before the work is done removes the only in-LEDGER pointer to it.
⛔ **Trim only THIS track's section.** The file went over cap twice on 2026-08-29 because other
tracks grew it; the rule is to trim your own, never theirs.

---

## Cross-track items — RAISE with Bean, do not action unilaterally

Both belong to other tracks and were found by audit, not by working on them:
1. **The client-controls track has TWO prompts.** `prompts/2026-08-29-recovery-residuals-and-the-root-filter-nogo.md:3`
   states it *"Supersedes `2026-08-28-rollout-detectors-and-the-null-element-tail.md`"*, but both
   files are still on disk — the exact duplication the one-prompt-per-track rule prevents.
2. **`.claude/plans/2026-08-24-stack-layout-rebuild.md` is archivable** — `status: COMPLETE`, all three
   tasks carry commit SHAs, QC-inline 7/7, and a repo-wide grep finds zero references, so moving it to
   `plans/archive/` breaks no living-doc pointer.

⚠ **There is no border-control PLAN document anywhere** (`grep -rn "SgsBorderControl\|border-control"
.claude/plans/` → zero hits across 40 live plans and the archive). This whole programme exists only in
`decisions.md` and prompts. If Shape B proceeds, it needs a plan doc, not another prompt.

---

## Standing hazards — carried forward, never subtract (D101)

1. `main` is shared. `git commit -- <explicit FILE paths>`; never a bare commit, never `--amend`, and
   **never a directory pathspec** — it commits tracked deletions but skips untracked additions.
2. **`index.lock` collisions are frequent.** Retry in a bounded loop; NEVER delete the lock.
3. Never write `post_content` to a page Bean has open in the editor.
4. `wp post update` without `--user=1` silently strips CSS from block attributes.
5. A deploy can report `[ABORTED]` while its payload landed — check the server.
6. Git Bash can show a stale view on Windows; confirm via PowerShell.
7. **A page-HTML grep cannot prove CSS absence** — block CSS is lifted into `uploads/sgs-css/`.
8. **Python `read_text` normalises CRLF.** Use `newline=""` on read AND write; assert on-disk bytes.
9. **`json.dumps` reformats.** Never re-serialise stored block attributes to change a key.
10. Verify subagent and tooling claims against ground truth. On 2026-08-29 an audit agent reported the
    LEDGER as 1,712 bytes OVER cap; the gate itself said 24,523/24,576 and PASSED. Run the gate.
11. A dispatched agent's "completed" status is not proof; check for an artefact.
12. Two commit-gate layers: `[gates-ok:<reason>]` for the session hook, `--no-verify` for git's native one.
13. **D851 still does not reproduce.** Do not cite page 2884 as evidence of anything.

## Environment notes

- A built deploy worktree is at `C:/tmp/sgs-deploy-wt` (`vendor/` copied in) — reuse it to skip a
  ~5-min `npm ci`. NOT auto-cleaned; check out the commit you intend to deploy and rebuild first.
- Deploys currently need `--payload plugins/sgs-blocks/includes/extension-attributes.generated.php`
  (motion committed `fx` sources without regenerating it) and `--skip-gate-full` (two `grayscaleHover`
  converter tests fail at the pre-session commit — proven, not inherited). **Re-prove both.**
- `.claude/secrets/sandybrown.env` was recovered 2026-08-29 from
  `.claude/worktrees/product-archive-p2/`. If it vanishes again, that is the copy.
- ⚠ **D875's gradient fix is largely reverted in the shared DB** — its own gate reports 74 unfixed
  rows, higher than the pre-fix figures. Effect proven, cause NOT. Not this track's to fix.
