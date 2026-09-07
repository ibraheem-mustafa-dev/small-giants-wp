---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-07
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**The colour work is finished.** Every colour control in the framework now offers a normal and
a hover state, and a gradient as well as a flat colour, wherever that makes sense. The checker
that tracks it reports zero outstanding rows for the first time, and it is now wired into the
build so it cannot quietly slip backwards.

**A real bug was found by looking at the editor rather than at a report.** The shadow panel
showed a "Hover" tab on about ten blocks where clicking anything in it did nothing at all — a
client could set a hover shadow shape and silently get nothing. It was proven on the real canary
page, not inferred. Fixed two ways: the panel no longer offers controls a block cannot actually
save, and the blocks that should have had the capability are getting it.

**Two things I got wrong this session and corrected.** I first reported a detector's raw finding
count as if it were a workload, when most of those rows were deliberate designs that had simply
never been recorded as such — Bean pushed back and was right. And I reported the shadow redesign
as "not landed" when two of its four parts had in fact landed; found by reading the file instead
of trusting my earlier search.

**Accessibility:** five places where an active or selected item was shown only by a colour change
now carry a second, non-colour signal, so they work for anyone who cannot distinguish the colours.

## Shipped this session (2026-09-07)

| What | Where |
|---|---|
| **Colour census CLOSED** — 9 rows migrated; `classify-end-shape.js --check` PASSES | `2786debad` |
| **Census gate wired** — the tool driving the migration now protects it (`gates.json` fast tier) | `2786debad` |
| **Spec 32 §5 security NFR CLOSED** — `check-style-blob-sanitisation` promoted advisory → blocking (68/68 passing; its one-cycle probation had expired) | `2786debad` |
| **Rule 31 narrowed to the editor-side gap** (Bean-ruled) — 43 findings → 2; ratchet 167 → 2 | `2786debad` |
| **Rule 43 (WCAG 1.4.1) → 0** — non-colour cue added to 5 colour-only state indicators | `2786debad` |
| **3 detector bugs fixed** — `isCanvasOnly()` traced the attr name where only the custom property appears; terminal shapes excluded from the gate; rule 31's census overlap dropped | `2786debad` |
| **ShadowControl: dead Hover tab closed** — a state that cannot write a shape no longer renders shape controls | `b70ef0e4f` |
| **`architecture.md` rewritten from scratch** — was 48KB, stale since 2026-07-13, cited D590 against a live ceiling | `2de0663e8` |
| **`goals.md` refreshed** — 3 duplicate "Active goals" tables collapsed to 1 | `2786debad` |
| **Spec 39 seed: Bean's quality bar + the motion-cloning gap measured** | `94d15bc6b` |
| **`CLAUDE.md`: 3 plugins listed, 5 exist** — `sgs-accessibility`/`sgs-configurator-pro` missing ~5 months | `2786debad` |
| 4 colour plan docs archived; all live referrers repointed | this session |

## Blockers

**None.**

## THE FRONT — what to pick up next

### 1. Cloning-pipeline rework (Spec 39) — the big one

**Read `.claude/plans/spec-39-seed-requirements.md` IN FULL**, including the new "Bean's quality
bar" section at the end.

**The measured gap, re-runnable:** the framework declares **2,745 motion/FX attributes across 44
blocks**, and **880 already carry a `css_property`** — but the converter contains **zero**
references to any of them and does not read `animation`/`transition`/`transform` CSS at all. So
motion cloning is a routing-CONSUMPTION problem, not a modelling one: the vocabulary is already
seeded, the converter simply never reads it.

R1–R7 of that seed doc are about attribute SHAPE only. A pipeline built to them alone would clone
a faithful, well-shaped, **completely static** page. R8/R9/R10 (added this session) carry the
motion requirement, the per-capability coverage method, and the routing precondition.

### 2. Mama's Munches go-live

Canary homepage is page **2742** (`/`), posts page **2741** (`/blog/`). Page 144 is DELETED —
verify any post ID exists before pointing anything at it.

### 3. Spec 36/37 — nav/header/footer

Goal C in `goals.md`. Open: the 10-clone reference proof gate, Spec 33 Part 2, and plain
(non-mega) dropdowns (`nav-menu/render.php` flattens submenu children, FR-36-4).

### 4. Shadow hover-shape — partially done, one part BLOCKED

`cta-section`/`site-header`/`brand-strip`/`before-after` are getting a hover shadow shape.
⛔ **`container`, `physics-canvas`, `hero` (main) and `trust-bar` (main) are BLOCKED**: their
shadow is emitted by `SGS_Container_Wrapper`, and a THIRD session has 44 uncommitted lines in
`includes/class-sgs-container-wrapper.php` (a minHeight/content-band flex-fill fix measured on
page 3389). Do not edit that file until it lands.

## Open — real, not blocking

- **Visual verification owed** for the 15 blocks committed under a scoped visual-gate skip this
  session (logged in `reports/visual-diff/manual-skips.log`). No verdict was claimed for any.
- **3 gates fail on `main` and are nobody's current work** — verified by running each against a
  clean HEAD worktree: `check-fx-list-drift` (the generative-background session's uncommitted fx
  files), `check-element-manifest-conformance` (`sgs/breadcrumbs`, 3 element-manifest orphans),
  `check-hover-state-classification` (`sgs/product-faq.backgroundColourHover`,
  `css_property=position` on a colour attr).
- **12 advisory inspector findings**, grouped: 5 rule-34 on `sgs/team-member` (typography attrs
  declared by `f7cb3ba36` but not consumed on render); 2 rule-45 (`counter`/`quote` still declare
  native `supports.typography` — see the ruling collision below); 2 rule-31 (`sgs/tabs` needs 3
  states, has 2 — the genuine editor-side residue); 1 rule-41 (`breadcrumbs` manifest gap); 2
  rule-03 (density suggestions, not defects).
- ⚠ **LIVE RULING COLLISION — Bean's call, neither session touching it.** D972 settled
  DOUBLE-WRITER CONFLICT for `counter`/`quote` typography (different elements, no conflict). The
  2026-09-05 full-replacement ruling is a SEPARATE test: that a native `supports.typography`
  declaration is a violation on its own. Only the first was ever answered. The old LEDGER line
  "counter/quote stay native-typography holdouts by design (D972)" over-read it.
- **`nav-menu.underlineColour`** has no live fixture (`check-colour-gradient-roundtrip.js`
  `KNOWN_SKIPPED` — needs a real assigned WP menu). Code-side closed, live-probe debt stands.
- **Deferred colour families** out of the census by construction: shadow, repeater-item, and
  media-atom colours.
- **`push-theme-snapshot.py`** — last known 2026-08-18: aborts safely for mamas-munches, refuses
  to write `wp_global_styles` without a verified backup. NOT re-verified since.
- **5 blocks missing `:focus-visible`** on `:hover`: `hero`, `icon-list`, `mega-panel`,
  `process-steps`, `testimonial`.
- **`box-shape`/`overlay` `:hover` rules unguarded against touch-hover-stuck** —
  `scripts/hover-guard/` never scans `assets/css/media-atoms/*.css`.
- **A shared-fallback gate gap** (raised by a peer session, D998): `check-media-atom-purity.js`
  bans `initial`/`unset`/`revert` as custom-property fallbacks by literal keyword, so `none` and
  `auto` pass while doing identical damage — that is how a `max-width: var(--x, none)` shipped
  and beat core's `img{max-width:100%}`. The honest widening is not "ban more keywords" but "flag
  a fallback on a property whose initial value is not that fallback".

## Methodology guardrails (carried forward — all still true)

- ⛔ **`git grep` only, never `grep -r`** — stale worktrees inflate counts massively.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first. *(Bit again this
  session: a failed `git rebase` piped to `tail` returned 0 and let the chained push run.)*
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.**
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.**
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling.**
- ⛔ **A name-mention is not a usage.** Real call-detection, not string match.
- ⛔ **A subagent must never mutate a repo file as a test fixture.**
- ⛔ **Metadata is not evidence.** Filename, line count, grep-hit count — open the file.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately, not at session
  end.**
- **Commit straight to `main`; never a PR, never a stash; integrate after every task.**
- **`build-deploy.py --dry-run` is NOT dry** — it builds, packages, SCPs and installs for real
  and only skips the gates.
- **`build-deploy.py` isolates by DEFAULT** (D993) and does NOT abort on dirty files it is not
  shipping — `should_isolate()` logs and proceeds, because a worktree at HEAD cannot carry them.
  A dirty shared checkout is not a reason to hold a deploy.
- **A Playwright MCP browser profile is SHARED across sessions.** If locked, report
  COULDN'T-TEST or use `chrome-devtools-mcp` (own profile) — never kill the lock-holder.
- **NEW (2026-09-07): a commit flushes the WHOLE index, not just your pathspec.** Verify with
  `git diff --cached --name-only` first on this shared tree. `--amend` is worse — it once swept
  89 staged files.
- **NEW (2026-09-07): a raw detector count is an UPPER BOUND, not a workload.** Dedupe to rows,
  and check how many sit on surfaces another tool already calls complete, before quoting one.
- **NEW (2026-09-07): a gate that can never go green is a defect in the gate.** A terminal
  classification (canvas-not-css, outline-not-gradientable) must be excluded from a completeness
  check, not counted as outstanding.
- **NEW (2026-09-07): an exact-name exemption set must never become a pattern.** Add names, and
  keep the over-match self-test that proves it did not.
- **NEW (2026-09-07): at least THREE sessions hold uncommitted work in this checkout.** Do not
  attribute an unfamiliar change to the one other session you know about — check `git diff`.

## State Snapshot

- **Branch:** `main`, at `b70ef0e4f`, pushed. Re-check yourself — 150+ sessions share this tree.
- **D-ceiling:** **D1000** (D999 rule-31 narrowing, D1000 ShadowControl) — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Gates:** 92 of 95 fast gates pass. The 3 failures are listed under "Open" and none is this
  session's work (each verified against a clean HEAD worktree).
- **Colour census:** `classify-end-shape.js --check` → **PASS**.
- **Inspector scan:** 0 gating findings, 12 advisory.
- **Canary:** sandybrown, WP 7.1. Homepage page **2742**. **NOT deployed this session** — the
  Wave E deploy + live verification has not run.

## Pointers

| For | Read |
|---|---|
| Cloning-pipeline rework (the front) | `plans/spec-39-seed-requirements.md` (read the 2026-09-07 quality-bar section) |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` (rewritten 2026-09-07) |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
