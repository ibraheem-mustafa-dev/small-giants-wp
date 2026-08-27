# Next session — the CHECK A backlog, hero's media gap, and four settled designs

**Written 2026-08-27.** Supersedes and replaces every earlier prompt on this track
(`the-remaining-client-controls`, `the-container-gap-and-the-remaining-controls`,
`check-a-blind-spot-and-the-first-controls`, `council-the-burn-down-method`) — all four were
executed and have been deleted. Nothing below is blocked on Bean.

Invoke `/autopilot` first. Bean is QC-only: batch every open question into one message at the
start, then work without interrupting him until something genuinely needs his eye.

---

## Read before you touch anything

**Five tracks share `main`.** Commit with explicit paths (`git commit -- <paths>`), never
`git add -A`, and re-check the branch in the same command as the commit. A bare commit flushes
the whole index and sweeps another track's staged work.

⛔ **Concurrent edits inside your own files are normal here.** Last session three target files
picked up another track's live edits mid-work. The rule that held: never revert or sweep their
hunks — commit only what is yours, and if a file's hunks are genuinely entangled, leave it and
say so. It cost nothing; their own commit later carried the work in cleanly.

⛔ **A gate that fails on another track's uncommitted work is not yours to fix or baseline.**
Prove whose it is (`git show HEAD:<file>` against the working tree), state the evidence, use
the scoped bypass, and leave their debt to them.

⛔ **Never `--allow-dirty` or `--skip-verify` on a deploy** (D336: two client sites down 2.5h).

**Verified bypass tokens** go in the COMMAND string: `[gates-ok:]`, `[repeat-ok:]`,
`[batch-ok:]`, `[truncate-ok:]`, plus `SGS_VISUAL_GATE_SKIP=<block>[,<block>]` with a
mandatory `SGS_VISUAL_GATE_REASON="…"`. Read the gate's own error text before using one.

---

## ✅ CLOSED 2026-08-27 — do not redo

**The duplicate spacing panel is gone from all 5 blocks**, deployed and live-verified.
`multi-button`, `physics-canvas`, `site-footer`, `site-header`, `trust-bar` now own their
`padding`/`margin` instead of borrowing WordPress's. The column-shape picker is on all three
approved blocks. Canary `post_content` was migrated too (13 posts, 15 block instances).

Detail is single-sourced — do NOT restate it: LEDGER + the commits `fa11f794c`, `71a5d4d42`,
`09c13d180`, `e90a1b313` + `plugins/sgs-blocks/scripts/migrate-off-native-spacing.py`.

**Three findings worth carrying, because each was nearly missed:**

- ⛔ **`check-dead-pattern-attrs.py` CANNOT gate a native-support removal.** It *detects* one,
  but `compute_exit_code()` excludes that finding class, so it prints an advisory and exits 0.
  A *partial* removal is invisible to it entirely. Never close on its green run.
- ⛔ **`migrate-off-native-spacing.py --check` reads the WORKING TREE, not the commit.** It
  reported PASS while `main` was split (edit.js committed, block.json not). When the question is
  "what shipped", verify with `git show HEAD:<file>`.
- **The footer's 0px padding is CORRECT, not a bug.** The live footer renders from the
  `sgs_footer` CPT (post 1571, three rows) — not the two-row template part or pattern — and its
  block only ever carried `{"align":"full"}`. Proven by row-structure match. Do not "fix" it.

⚠ **FIVE visual-diff manual skips are owed real reports** — `multi-button`, `physics-canvas`,
`site-footer`, `site-header`, `trust-bar`. They render identically by design and the header was
computed-style verified live (16px/24px, painted by exactly ONE CSS rule), but the other four
were never individually captured. **The next commit touching each block owes a real report.**
`reports/visual-diff/manual-skips.log` is a permanent audit record, not a queue to clear.

---

## 1. The CHECK A backlog — the biggest remaining win

CHECK A reports 238 net-new against a ceiling of 238, blind spot fixed. Triage stands at
**REAL 186 · ARTEFACT 22 · DETECTOR BUG 0** — it under-reports, it never cries wolf.

Those 186 collapse to roughly seven shared-mechanism fixes, of which **two are already done**:
background preview (`11228c3e0`) and spacing preview (`756341482`). All share one shape: a
shared inspector panel writes attributes the PHP wrapper paints, and only `sgs/container` ever
built the JS mirror — so the editor canvas silently disagrees with the front end.

**Remaining panels:** `GridItemDefaultsPanel`, `LayoutPanel`, `ResponsiveBoxControls`, and the
`bgSvg*` family.

Per-finding evidence: `reports/2026-08-26-check-a-triage-group-a.md` and `-group-b.md`.

⛔ The ceiling moves DOWN only. Re-measure and lower it after every drop.
⚠ `LayoutPanel.js` is rendered by `ContainerWrapperControls` for **~20 blocks** — treat any
change there as shared-mechanism (Rule 7), and prefer an additive opt-in prop defaulting OFF.
That pattern is already established in that file twice: `showLayout` and, as of this session,
`enableColumnShapePicker`. Copy it rather than inventing a third shape.

## 2. `sgs/hero` split media — video and SVG tiers have no controls

`hero` emits the whole `splitMedia*` family (object-fit, object-position, border, radius,
height) but the CSS is scoped to `.sgs-hero__split-image` — a class only the IMAGE type gets
(`hero/render.php:1279`). `splitMediaType` / `…Tablet` / `…Mobile` already select
`image | video | svg` per tier (`render.php:129-131`), so the video and SVG tiers currently
paint none of it.

Done-when: a tier set to video or SVG honours the same splitMedia controls as image, verified
live at 375/768/1440 — not merely emitted into the stylesheet.

⚠ `hero/edit.js` builds gradient attribute names through `gradientOverlayAttrKeys(...)`. If a
detector reports `mediaBackgroundGradient`/`mediaOverlayGradient` as orphans, **they are not
orphans and must not be deleted** — `audit-block-file-consistency` was taught that helper at
`f7ec0b5a6`. Re-check before believing a fresh orphan report.

## 3. Three settled designs, ready to build (do NOT re-litigate)

- **C14 — panel order.** Element order follows the DOM; WordPress-native ordering at root.
  Advanced always last, Visibility conditions second from last. Record in Spec 35, **then gate
  it** — an ordering convention with no detector drifts back within days.
- **C16 — spacing presets.** Keep the responsive box control, add presets. Selecting a preset
  changes the value AND the measurement type when the units differ. **The unit switch is the
  hard part** — that is where this will go wrong, not the preset list.
- **C19 — sizing-mode picker.** `Auto` · `Fixed height` · `Aspect ratio`, mutually exclusive.
  Default `sgs/image-sequence` to `16 / 9` — `image-sequence/render.php:50` already emits
  exactly that as its fallback, so this aligns the control to the render rather than inventing
  a default.
  ⚠ `hero.splitMediaHeight` is a TIER OBJECT — keep it responsive per tier, do not flatten it.
  ⛔ The converter side touches `converter/` — read Spec 31 §13 IN FULL first.

## 4. C15 — Block Bindings

Four items Bean adopted. **Report:
`.claude/reports/2026-08-28-c15-block-bindings-scope-proposal.md`** — note the `.claude/`
prefix; an earlier prompt cited it at the repo root, where no such file exists. Scope summary
also at `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md` lines 139-154.

The headline is **C15-2 / C15-3**: register the source in JS and supply `getFieldsList()`, so
core's own picker lists SGS fields and the client selects "Phone" from a dropdown instead of
typing an attribute key. **C15-5** (widen past 3 blocks) crosses the detector-first threshold —
build the detector, and raise it with Bean when it starts.

---

## Known instrument faults — do not rediscover these

⚠ **`node --check` is VACUOUS here.** It exits 0 on broken ES modules and errors on valid JSX.
Parse with the project's own toolchain: `@babel/core` + `@wordpress/babel-preset-default`,
resolved from `plugins/sgs-blocks/node_modules` — the checker script must live inside that tree
or `require` fails. **Prove the checker works on a deliberately broken file before trusting a
green run**: a mis-invoked parser reported nine healthy files as failing last session, and a
`/tmp` copy silently passed a file it never read.

⚠ **A CSS rule walker must check `r.style` BEFORE `r.cssRules`.** With CSS Nesting every
`CSSStyleRule` also carries `.cssRules`, so branching on `if (r.cssRules)` treats every style
rule as a group and reads no declarations. Validate any scanner with a negative control.

⚠ **`document.querySelector` returns the first match** — usually a header/footer instance, not
your probe. Identify the test element by its content or role.

⚠ **SGS block CSS is lifted into `uploads/sgs-css/`** — grepping page HTML for a rule proves
nothing. Measure `getComputedStyle` in a real browser, and count matching rules when you need to
prove a single emitter (that is how the multi-button double-emission fix was verified).

⚠ **wp-cli over SSH needs `--path=`.** A bare `cd` into the site root does not stick, and the
error ("not a WordPress installation") reads like a broken site. Root is
`/home/u945238940/domains/sandybrown-nightingale-600381.hostingersite.com/public_html`.

⚠ **Long base64 payloads break `echo "$b64" | base64 -d`** over SSH (argument length). Pipe the
file on stdin, one post at a time.

⚠ **Git Bash has a stale view of files written by Python or the Write tool.** A file can exist
and still report "No such file" for a moment — re-check before concluding it wasn't written.

⚠ **A `cat > file <<'EOF'` heredoc through the Bash tool failed twice on long documents.** Use
the Write tool for prose files; do not burn a third attempt on it.

⚠ **Theme CSS cache-busts off `Version:` in `theme/sgs-theme/style.css`.** Without a bump, a CSS
fix reaches no browser.

---

## Method that earned its keep

**"Not cause A" is exculpatory for A, never inculpatory for B.** Three confident diagnoses were
wrong last session: another track was blamed for a build break that was really a transient
mid-write read; a reviewer declared a real, git-tracked commit gate "fiction" because it searched
`.githooks/` instead of Claude Code's PreToolUse hooks; and the footer's 0px padding looked like
a regression until row-structure proved it came from an entirely different source. Each took
minutes to check and would have cost hours to act on wrongly.

**Fact-check your own instrument before your conclusion.** Three detector bugs surfaced in one
session — an `attrMap` lookup at the wrong nesting depth that confidently reported a clean tree,
a comment-matching rule that made a gate permanently unsatisfiable, and a key-vs-object offset
that silently no-opped a third of the work while printing success. All three now have regression
guards in `--self-test`. A census that reads the wrong path gives the most dangerous answer an
instrument can produce: "nothing is wrong".

**Verify the effect landed, not the exit code.** A success message, a green gate and a passing
build all coexisted with a real split on `main` for twenty minutes.
