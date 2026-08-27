# Next session — build the two rollout detectors, then clear the NULL-element tail

**Written 2026-08-27.** Supersedes and replaces `2026-08-28-check-a-backlog-and-the-settled-designs.md`, which was executed and deleted. Nothing below is blocked on Bean.

Invoke `/autopilot` first. Bean is QC-only: batch every open question into one message at the start, then work without interrupting him.

---

## Read before you touch anything

**Several tracks share `main`.** Commit with explicit paths (`git commit -- <paths>`), never `git add -A`, and re-check the branch in the same command. A bare commit flushes the whole index and sweeps another track's staged work.

⛔ **Never `--allow-dirty` or `--skip-verify` on a deploy** (D336: two client sites down 2.5h). Use `--payload <prefix>` instead — it scopes the dirty gate to your own wave and leaves another track's files blocking, which is the point.

⛔ **`/sgs-update` reseeds the shared database.** Announce it to live sessions first (`ListAgents`, then `SendMessage`), and prefer `--stage 1` over a full run.

⛔ **Untracked files are invisible to the deploy's dirty gate and visible to tar.** That is how 278MB of a competitor's plugin nearly shipped. If you add a directory under `plugins/sgs-blocks/`, gitignore it *and* check `TAR_EXCLUDES`.

**Bypass tokens** go in the COMMAND string: `[gates-ok:]`, `[repeat-ok:]`, `[batch-ok:]`, `[truncate-ok:]`, plus `SGS_VISUAL_GATE_SKIP=<block>` with a mandatory `SGS_VISUAL_GATE_REASON="…"`.

---

## ✅ CLOSED 2026-08-27 — do not redo

Nine commits, deployed and live-verified. Detail is single-sourced to **D855-D862** and the LEDGER — do NOT restate it.

Hero video/SVG media · block bindings in core's picker · CHECK A 238 → 206 · C14 order convention + inspector-scan rule 35 · C16 spacing presets (`sgs/container` pilot) · C19 media panel (`sgs/media` pilot) · two NULL `css_element` rows · five client spacing ladders · deploy 114MB → 29MB.

**Three findings worth carrying:**

- ⛔ **`css_element` is reseed-durable.** It is DERIVED from a classifier plus a hand-declared `block.json` `supports.sgs.elements[…].attrMap`. A hand-edited DB row looks fixed and is silently overwritten by the next `/sgs-update`. Fix the declaration, never the row.
- ⛔ **A hand-declared `attrMap` entry OUTRANKS selector derivation.** That asymmetry is diagnostic: when base attrs are stale and their Tablet/Mobile siblings are correct, the manifest is pinning the base ones.
- **An unchanged measurement is what a failed deploy looks like.** Always pair it with a positive control proving the new code is live on the server.

---

## Tasks 1 & 2 — ✅ ALREADY DONE by other sessions. DO NOT REBUILD.

⛔ **This prompt originally briefed the C16 and C19 rollouts as blocked and unbuilt. Both landed
while the handoff was being written.** Verified on disk 2026-08-27, not taken on trust:

**C16 — spacing presets: COMPLETE.**
- `18806e6b0` rolled the preset dropdown to 46 of the 47 remaining mounts. **All 48 blocks** that
  mount `ResponsiveBoxControl` now pass `presets`.
- The detector exists: `scripts/inspector-scan/rules/36-box-control-presets-missing.js`, registered
  advisory in `rules.json`.
- The migration script exists: `scripts/migrate-box-control-presets.py`.

**C19 — media size & crop panel: ROLLED OUT.** `MediaSizingPanel` is now mounted on `card-grid`,
`gallery`, `image-sequence`, `media` and `post-grid` — the full `aspectRatio` surface.

**What is genuinely left on these two — small, and worth checking rather than assuming:**
1. **C19 has NO detector and NO migrate script**, unlike C16. Confirm whether that is deliberate.
   ⛔ **RESOLVED, and it is worse than a missing script — see Task 7.**
2. **The 48th block.** `18806e6b0` says "46 of 47 remaining" — one was deliberately skipped.
   Find it, confirm the reason, and record it (a spacing ladder is wrong for a `borderRadius`
   box family, so a skip may well be correct).
3. Rule 36 is **advisory**. Once the backlog is genuinely 0, flip it blocking so it ratchets.

**The lesson, recorded because it cost real work:** this prompt asserted "no migration script
exists" and "the rollout is blocked" from a grep taken hours earlier, in a repo where six sessions
commit to one branch. On a shared branch, a claim about what EXISTS has a shelf life measured in
minutes. Re-verify before building.

## Task 3 — the 85 NULL `css_element` rows

⛔ **Do NOT bulk-script this.** Root cause is three separate causes, not one bug. Read `.claude/reports/2026-08-27-null-css-element-root-cause.md` in full first.

Two are genuine, fixable classifier gaps and are the right place to start, because each fixes many rows at once with no guessing:

- **Cause A** — `sgs_emit_state_colour_css()` (used in **21 files**) is not in the classifier's `_HELPER_SUFFIX_PROPS` allowlist, so its literal BEM selector argument is never read. Register it.
- **Cause B** — a selector built into a PHP variable in one statement and used by name later is untraced. The classifier already does this hop for CSS *property* chains; extend it to *selector* variables.

**Cause C** (root-scoped, no element token) needs a rule turning "selector textually reduces to the root variable" into a positive `wrapper`. ⛔ Evidence-gated only — never a blanket "assign wrapper when nothing found" default.

⚠ **A wrong element is worse than a NULL.** NULL reads as unknown; a wrong value reads as authoritative and misroutes cloned CSS silently. Only 6 of ~67 non-fx rows are individually confirmed — treat the rest as unverified.

**Done-when:** A and B are fixed in the classifier, the regenerated derived layer is diffed row by row, and the count drops by a *measured* amount you can name.

## Task 4 — the CHECK A backlog, 206

Re-measure first; do not trust this figure. The largest cluster is **colour / gradient / hover siblings, ~91 findings across ~36 blocks** — and the shared helpers already exist (`resolveTextColourPreviewStyle`, `resolveBackgroundPaintPreviewStyle` in `src/utils/tokens.js`), so this is wiring, not invention.

⚠ **Hover previews need no new mechanism.** A block's `style.css` `:hover` rule already loads in the editor canvas; only the client's custom hover custom-property is missing. An earlier triage claimed a `clientId`-keyed `<style>` injector was required — that claim is false.

⛔ The ceiling moves DOWN only. Re-measure and lower it after every drop.

## Task 5 — two owed items

- **Hero owes a visual-diff report.** It was bypassed when a deploy was impossible. The next commit touching `sgs/hero` owes a real one via `make-visual-diff-reports.py`.
- **`sgs/media`'s element manifest disagrees with its classifier** for the whole block: `objectFit`, `objectPosition`, `opacity` and `boxShadow` all resolve to `wrapper` while the manifest says `media`. They share `$id_sel` at `render.php:281`, a three-part selector list. Predates this work.

## Task 6 — the standing uniformity backlog (CARRIED, was nearly lost)

⛔ **This section was dropped from the LEDGER when I rewrote it on 2026-08-27 and restored only
after an independent QC caught it.** It is the D101 failure mode — a structural carry-forward
subtracted without justification. Do not compress it away again; if it needs to shrink, move it
to `parking.md` with Bean's say-so rather than deleting it.

⭐ **Scope register: `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md`** — 24 open items
surveyed against source (Spec 32: 5 · Spec 35: 19) plus the tier migration. Follows the project's
own ordering rule **D552: standard leads, pipeline follows.**

⛔ **SPEC 39 STILL DOES NOT EXIST AS A FILE** — verified 2026-08-27, absent from `specs/`. D554-C
names it THE PACING ITEM: `orchestrator/check_flat_tier_regression.py` blocks cloning for every
migrated property until it lands, and **37 conformance goldens sit `xfail(strict=True)`** naming
it (`converter/tests/test_css_pass_partition.py`). **Finishing more of the migration INCREASES the
blocked surface until Spec 39 ships.** That inversion is why it paces everything else.

Open steps, in the register's own order:

1. **Step 0 — fix the instruments first — ✅ CLOSED (`807ef4611`, D777).** `migrate-tier-object.py`'s
   3-family BLIND SPOT (`classify()` needed a BARE base, so it could not see a family whose base is
   `<name>Desktop` — `brand-strip.columns`, `hero.textAlign`, `whatsapp-cta.showOn`) is fixed:
   `_base_attr_spec()` (lines 182-205) now checks both `attrs.get(prop)` and
   `attrs.get(prop + 'Desktop')`. **True remaining scope is 37 families, not 34.** Still open: check
   whether `audit-inline-styling.js`'s 11 "tier-without-base" blocks share that cause before scoping
   Step 2's work.
2. **Step 2 — the mechanical sweep behind detectors:** 37 families · Spec 32 B1/B3/B5 · Spec 35
   C1-C11 (colour R2-R6, ToolsPanel 0/15, decorative-image 1/14, imageControls 2/15, border-builder
   1-of-48). `THE-MIGRATION-METHOD.md` applies to every one.
3. **Steps 3-4 — the two live passes** (a11y + element-first panel order) and the hex-literal triage.
4. **Step 5 — WRITE SPEC 39**, then the converter rework. Check first whether its scope is already
   settled across D276/D552/D554 — it may be transcription plus a design gate, not open design.

✅ Already closed, do not redo: Step 1 (the six Bean decisions C14-C19 are ANSWERED — do not
re-ask) and Step 6 (whole-file-diff detection shipped as the truncation gate,
`.claude/hooks/truncation-commit-gate.py`, `0fdfc7ea9`).

⚠ **`check-box-flat` was wired into `prebuild` with its exit code NOT propagated** — findings sat
behind a passing suite, which is how `multi-button::childBtnBorderRadius` went unnoticed. The npm
script is now `check:box-family` and `check-box-family-guard` DOES appear in `gates.json`.
**Re-verify the exit code actually propagates before trusting it** — the original defect was
precisely a gate that ran and could not fail.

### Anchored grades — round 4, 2026-08-27 (as EXERCISED)

working-change **C** · recoverability **D** (held) · governance **C** · durability **C** ·
first-attempt reach **C**. **Overall C+, was B−.** CONFIRMED 45 · PEDANTIC 6 · WRONG 3.
**Recoverability is the ceiling — 72 gates, none inspects diff shape.** This session is fresh
evidence for that grade: a structural carry-forward was silently dropped and only an independent
reviewer caught it.

## Task 7 — `detector-first-commit-gate.py` has a NAMED HOLE (design gate needed)

⛔ **Do not trust this gate to catch a component rollout until this is fixed.** Root-caused by a
peer session and independently verified here — the gate is wired, not bypassed, and its own
`--self-test` passes including its negative control. It simply cannot see the case.

**The hole, exactly — REPRODUCED with the gate's own semantics, not reasoned.**

`find_repeat()` has three gates in order. On C19's real rollout commit `1612c7b1e`:

    gate 1  code files with added lines = 6   vs MIN_FILES = 4          -> PASS
    gate 2  lines shared by >=4 files   = 1   vs MIN_SHARED_LINES = 3   -> STOP
    gate 3  never reached

**`MIN_SHARED_LINES = 3` is what let it through.** Its own comment says why it exists: *"ignore
trivial one-line sweeps"*. The single shared line was the import alias
`const ASPECT_RATIO_OPTIONS = MEDIA_SIZING_RATIO_OPTIONS;` — verified NOT a component mount.

⭐ **That is the strongest form of the finding: the one line four files happened to share was
INCIDENTAL. A rollout could share ZERO lines and be equally invisible.** So this is not "the
threshold is a bit too high" — the mechanism does not measure the thing the rule is about. Any fix
that only tunes `MIN_SHARED_LINES` down is treating the symptom.

**Why that is worse than it sounds.** A shared-component rollout is *structurally* a one-line
repeat: the component is mounted once per block, surrounded by per-block props. So the rule built
to ignore trivial sweeps cannot tell "a trivial one-line sweep" from "adopting a shared component
across N blocks" — and the second is precisely what THE MIGRATION METHOD exists to catch. The
contract counts FILES; the mechanism additionally demands three shared LINES, and nothing in the
contract hints at that.

⛔ **Two earlier explanations of this were WRONG and are corrected here.** (a) "the shapes differ
per call site" — they do not; one normalised shape IS shared by 4 files, which meets `MIN_FILES`.
(b) "the only shared lines were the `// C19 ratio-mode adoption` comments" — production STRIPS
comments (`staged_added_lines()` filters `//`, `#`, `*`, `/*`), so it never sees them. Both came
from replays that skipped production's filters. If you find either version quoted anywhere, it is
stale.

⚠ **This is not a small hole.** The gate exists because a hand-rolled colour-panel rollout cost 23
correction commits out of 71. Every future component rollout — the fx effects especially — is
exactly the adaptive shape it cannot see.

**Why it is NOT fixed here, deliberately:** it is a shared PreToolUse hook, nobody has established
what a broader rule costs in false positives, and **a gate that fires on every multi-file commit
is worse than one with a known hole** — it gets bypassed reflexively and then protects nothing.
This needs its own design gate with Bean, not a quick widening.

**Candidate direction to price, not implement blind.** Now the mechanism is known, the fix is
narrower and more defensible than "loosen the shape rule": **one shared line across >=4 files is
enough WHEN that line is a component mount or an import of a shared component.** That keeps
`MIN_SHARED_LINES` doing its real job on genuinely trivial sweeps while catching the case the
method exists for. Price the false-positive cost before building it.

⚠ **Whoever fixes this: add a fixture from `1612c7b1e` to the gate's `--self-test`.** The gate's
self-test passes today, including its own negative control — it proves the gate can fail, not that
it can see this. A real 4-file component rollout that MUST be denied is the missing case.

---

## Known instrument faults — do not rediscover these

⚠ **`node --check` is VACUOUS here.** It exits 0 on broken ES modules and errors on valid JSX. Parse with `@babel/core` + `@wordpress/babel-preset-default` resolved from `plugins/sgs-blocks/node_modules`, and prove the checker fails on a deliberately broken file first.

⚠ **`tar -tvf` columns are `perms owner group SIZE date`.** Two attempts to read the size by fixed index silently read the owner id `0` and printed "0.0MB" rows that named nothing. Anchor on the date field.

⚠ **`extract-signatures.py` runs a full extraction on `--help`** and rewrites `css-property-classifications.json`. That file is shared; check who else is mid-work before invoking it.

⚠ **SGS block CSS is lifted into `uploads/sgs-css/`** — grepping page HTML proves nothing. Measure `getComputedStyle` in a real browser, and identify the element by content or role (`document.querySelector` returns the first match, usually a header).

⚠ **wp-cli over SSH needs `--path=`.** Root is `/home/u945238940/domains/sandybrown-nightingale-600381.hostingersite.com/public_html`.

⚠ **Long base64 payloads break over SSH.** Pipe the file on stdin, one post at a time.

⚠ **A `cat > file <<'EOF'` heredoc through the Bash tool fails on long documents.** Use the Write tool for prose.

⚠ **Git Bash has a stale view of files written by Python or the Write tool.** Re-check before concluding a write failed.

⚠ **Theme CSS cache-busts off `Version:` in `theme/sgs-theme/style.css`.**

---

## Method that earned its keep

**Prove ownership before fixing a red gate.** Three gates failed this session that looked like ours and were not — and one that looked like another track's turned out to block everyone. `git status` on the flagged paths plus `git show HEAD:<file>` settles it in seconds.

**Test the instrument before trusting its output.** A tarball diagnostic was wrong twice, both times printing a confident, empty answer. A detector that cannot fail loudly is worse than none, because it reads as evidence.

**A peer session is a real reviewer.** The 278MB near-miss was caught by another session reading the tar excludes, and it flagged its own evidence as inferred rather than proven. Verifying it took one controlled fixture and two minutes.
