# Client-controls track — the uniformity sweep

**Written 2026-08-29.** Invoke `/autopilot` first. Bean is QC-only: batch every open question
into one message at the start, then work without interrupting him.

The hover work is closed. This prompt carries only live work.

---

## First action

`git status`. Five tracks share this checkout, and neither a deploy nor a reseed is safe while
another has files in flight. Then read the two docs below. **Do not edit anything first.**

## Mandatory READING

| Read | Why |
|---|---|
| `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **in full** | Bean-locked. Issues surface mid-work in sections you did not plan to touch; without the whole spec in context you diagnose them blind. Navigate via its index, but read it end to end. |
| `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md` | The register for Task 2 — the 24 open items. |
| `.claude/THE-MIGRATION-METHOD.md` | Before the fourth file edit of any sweep. Non-negotiable. |
| `.claude/STOP-CATALOGUE.md` | 270 recorded failure patterns. Skim the newest; they are dated. |
| `.claude/plans/spec-39-seed-requirements.md` | Before writing anything about Spec 39's status. |

## Tool bindings

| Work | Tool |
|---|---|
| SGS block / theme / client-site build or fix | `/sgs-wp-engine` |
| Heavy WP build (blocks, templates, migrations) | `wp-sgs-developer` agent |
| Schema check BEFORE any "missing X" claim | `python ~/.claude/hooks/wp-blocks.py dump` |
| DB query (read-only) | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` |
| Deploy | `build-deploy.py --target sandybrown` — the ONE path. Never hand-roll tar/scp. |
| Live DOM / hover verification | Playwright MCP, or `/superpowers-chrome:browsing` if Playwright's browser is locked by a peer session |
| Multi-rater review before a converter/pipeline/block commit | `/qc-council` |
| Root-cause investigation | `/systematic-debugging` |
| Gate roster (never grep `package.json`) | `npm run gate:list` · `npm run gate:wired` |
| Session close | `/handoff` |

---

## READ THIS BEFORE ANYTHING ELSE

**Five tracks share `main`, and they commit while you work.** During the last session `main`
moved five times and `index.lock` collided twice.

- Commit with explicit paths: `git commit -- <paths>`. Never `git add -A`.
- Re-check the branch in the same command as the commit.
- `git commit --amend` flushes the WHOLE index, ignoring your original pathspec.
- On `index.lock`, retry in a loop. Never delete the lock.

⛔ **Never `git stash` here.** A peer's stash once swept every session's uncommitted work.

⛔ **`git status` before any deploy or reseed.** Both read the whole tree, so both are unsafe
while another track has files in flight. `build-deploy.py` refuses a dirty tree — that refusal
is correct, and `--allow-dirty` is what took two client sites down (D336).

⛔ **Long prose through a `cat <<EOF` heredoc fails in the Bash tool.** Use the Write tool, or
write the commit message to a file and use `git commit -F`.

⛔ **Two commit-gate layers, different bypasses.** `[gates-ok:<reason>]` in the message clears
the session hook; git's native `.githooks/pre-commit` needs `--no-verify` and discards
gitleaks, F5, F6 and cheat-gate with it. The visual-diff gate takes a third, scoped form:
`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="..."`. A skip is a DEBT logged to
`reports/visual-diff/manual-skips.log`. Pay it with a real report.

---

## ⛔ SPEC 39 IS NOT YOURS TO BUILD, AND IT BLOCKS NOTHING

Read this before writing anything about Spec 39's status. The LEDGER carried the opposite claim
for weeks and it propagated into two handoffs.

**The rule is D552: the block standard LEADS, the cloning pipeline is reworked AFTERWARDS.**
The converter's inability to emit a new shape is scheduled work, never a precondition.
**Become uniform first. Spec 39 is then built on that uniformity as its foundation.**

Your job is to CAPTURE prioritised points for whoever writes it. The inputs are already
collected in `.claude/plans/spec-39-seed-requirements.md` (status: "SEED — do NOT treat as a
spec") and `.claude/plans/spec-35-capability-routing-doctrine.md`. Add to them as the sweep
surfaces pipeline implications.

The old claim's evidence was false, and one grep disproves it: **0** xfails anywhere in the
plugin reference Spec 39 (17 exist in total, so the grep does find them), and
`check_flat_tier_regression.py` lives in `orchestrator/` — the pipeline, exactly where D552
puts it.

---

## Task 1 — Hand the timeline XSS to the motion track (5 min, do first)

**What:** `plugins/sgs-blocks/src/blocks/timeline/edit.js` renders `entry.svg` through
`dangerouslySetInnerHTML` with no sanitiser.

**Why it is real.** `entry.svg` comes from a plain `TextareaControl`, so anyone who can edit the
block pastes arbitrary SVG. The frontend runs `wp_kses` with `sgs_allowed_svg_tags`; the editor
runs nothing. A Contributor saves a draft containing `<svg><script>`, an Editor or Admin opens
it, and the script executes in the wp-admin origin under their session. That is privilege
escalation, not an admin attacking themselves. The control's help text — "Scripts and event
handlers are stripped when it renders" — is true on the frontend and false in the editor, so it
actively misleads the operator.

⛔ **Do not fix it yourself unless the motion track's timeline files are clean.** All five were
dirty when this was found. Check `git status -- plugins/sgs-blocks/src/blocks/timeline/` first.

**Fix shape if it falls to you:** sanitise before injection (DOMPurify with the SVG profile), or
render inside `<iframe sandbox="">`. Correct the help text in the same change.

## Task 2 — The uniformity sweep (the main work)

**Register:** `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md` — 24 open items
(Spec 32: 5 · Spec 35: 19) plus the tier migration.

⛔ **More than 3 blocks? Build the detector first.** Read `.claude/THE-MIGRATION-METHOD.md`
before the fourth file edit. The triad is one tool: `--survey` (census, before the design) →
`--fix` (parameterised codemod) → `--check` (the gate).

**Step 0 is CLOSED** (`807ef4611`, D777).

**Step 2 — the mechanical sweep.** Spec 32 B1/B3/B5 · Spec 35 C1-C11 (colour R2-R6, ToolsPanel
0/15, decorative-image 1/14, imageControls 2/15, border-builder 1-of-48).

⚠ **Re-measure the family count before scoping.** The inherited "37 families" figure is wrong:
a live `--all-properties --survey` reports **27 migratable properties** across **37 block-touches**
(26 properties touch 1-2 blocks; `backgroundOverlayOpacity` touches 8). 37 is the TOUCH count.
Also check whether `audit-inline-styling.js`'s 11 "tier-without-base" blocks share that cause.

**Steps 3-4** — the two live passes (a11y + element-first panel order) and hex-literal triage.

**Step 5 — capture, do not build.** Write what the sweep implies for the pipeline into the
Spec 39 seed doc. See the Spec 39 box above.

## Task 3 — The detector-gate hole (design gate, needs Bean)

⛔ **Do not trust `detector-first-commit-gate.py` to catch a component rollout.** Verified
unchanged: `MIN_SHARED_LINES = 3`. On C19's real rollout commit `1612c7b1e`, gate 1 passes
(6 files) and gate 2 stops it (1 shared line vs 3 required). ⭐ **A rollout could share ZERO
lines and be equally invisible**, so tuning the threshold treats the symptom, not the cause.

It is not fixed because it is a shared PreToolUse hook, nobody has priced the false-positive
cost, and a gate that fires on every multi-file commit gets bypassed reflexively and then
protects nothing. **Bring Bean a design gate, not a patch.** Whoever fixes it: add a fixture
from `1612c7b1e` to `--self-test` — the current self-test proves the gate can fail, not that it
can see this case.

## Task 4 — Carried, unverified

- **Batch-A findings are UNVERIFIED.** That agent was killed having traced nothing, yet detailed
  findings were reported from it 90 seconds later, and a council caught one as false.
- **CHECK A is now 177** (another track lowered it from 207, verified in source). It moves DOWN
  only.

---

## Instrument faults — do not rediscover these

⚠ **`computed-parity.js` is hover-blind.** Measured: `grep -c -i hover` returns **0**. It scores
resting styles only, so a correct hover fix and a broken one both come back green. Measure hover
by hand.

⚠ **A computed-style check cannot see a zero-effect animation.** `background-size` resolves
perfectly on an element that never moves. Prove motion by sampling the live `transform` matrix
at two times, and open the screenshots.

⚠ **When measuring a state-dependent style, park the pointer AND assert the state in the same
evaluation.** A resting reading taken under an accidental hover is indistinguishable from a
broken resting rule. This cost real time last session.

⚠ **A grep returning 0 is a hypothesis, not a finding.** Pair it with a positive control from
the same file. A selector built by concatenation (`$sel . ':hover'`) never appears as a literal —
that returned a confident false "not deployed" on a fix that was live.

⚠ **SGS block CSS is lifted into `uploads/sgs-css/`.** Grepping page HTML proves nothing.

⚠ **`inspector-scan/run.js --json` non-deterministically drops the last 2-3 rules.** Re-run.

⚠ **The element manifest is converter-facing only** — 0 PHP consumers, 0 JS. Declaring an entry
renders nothing.

⚠ **A deploy can print `[ABORTED] … Nothing was uploaded` while its wrapper exits 0.** Read the
output, never the exit code. Then confirm the deployed file contains your change.

⚠ **`gap_writer` does not persist to `attribute_gap_candidates`** — its docstring says
persistence is "a step-3 concern". A test asserting that table at resolver level returns an
empty set while the resolver is behaving correctly. Assert the resolver's return value.

⚠ **Clearing a `css_property` in an override needs `css_layer` cleared too.** F6 compares the
pair, and the derived layer sets `OUTER`.

⚠ **`npm run gate:list`, not grep.** Every gate kept a standalone `check:*` alias in
`package.json` after the chain moved to `scripts/gates.json`, so a grep hit proves the alias
exists, not that the gate runs.
