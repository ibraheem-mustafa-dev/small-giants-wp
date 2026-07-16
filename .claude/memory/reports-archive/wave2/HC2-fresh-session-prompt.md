# Fresh-session prompt — HC2 dead-control cleanup workstream

Paste everything below the line into a fresh session (Opus). It is self-contained.

---

**Invoke `/autopilot` before doing anything else** (live skill routing + ADHD support for the whole session).

## What this is (plain English)

The SGS block editor has **34 "dead controls"** — settings a client can change in the editor that do **nothing** to the rendered page. They were left behind when blocks moved their rendering to child blocks (the FR-22-6 InnerBlocks migration) or to WordPress native colour supports, but the old parent controls were never removed or rewired. A client tweaks "heading colour" on info-box, nothing happens — that erodes trust in the builder. This task makes every editor control either **work** or **disappear**, and adds a guard so it can't regress.

## The authoritative input (READ FIRST)

`.claude/reports/wave2/HC2-dead-control-library-audit.md` — the full register: 34 dead controls across 8 blocks, ~20 orphan attrs, with exact `file:line` evidence (block.json + edit.js + render.php). Do NOT re-discover; this audit is ground truth. Spot-check a few citations against the real files to confirm, then proceed.

## The task

For **each** dead control in the register, decide **WIRE** or **REMOVE**, using this heuristic:
- **WIRE** (implement the missing render) if the **parent block is the natural place** to set this property and no child block already exposes it. Emit the attr's effect in `render.php` (CSS var / inline style on the correct element), matching how sibling live attrs in the same block already render.
- **REMOVE** (delete the control + the attr from block.json + the destructure in edit.js) if a **child InnerBlock already owns** that capability (e.g. testimonial colours now belong to child `sgs/quote` / `sgs/star-rating`). Removing a duplicate control is correct — do not create two controls for one property.
- When genuinely 50/50, default to **WIRE** (clients expect a visible control to work). Record the call per attr.

**Also handle:** the ~20 orphan attrs (no control, no render) — delete from block.json (schema cruft). The 2 vestigial destructures (`placeholder` in form-field-checkbox/radio; `showPendingInEditor` in trust-bar) — remove. The feature-grid `columnsDesktop` double-declaration schema bug — fix (keep the `default:4` entry).

**COORDINATION FLAG:** `hero.textAlignDesktop/Mobile/Tablet` is ALSO the subject of cloning Wave-2 issue **H-C** (the converter wants to emit explicit text-align). Do NOT remove these without checking the H-C solution in `.claude/reports/wave2/01-hero.md` — WIRE them (emit responsive `text-align` on `.sgs-hero__content`) so the cloning fix has a live target. Same for any attr that a cloning fix depends on.

## Structural guard (Rule 10 — non-negotiable, do this too)

Add a build-time check that walks every block: for each attr with an editor control in `edit.js`, assert it is consumed in `render.php` / `save.js` / a known shared wrapper (`class-sgs-container-wrapper.php`). Fail (or warn) the build on a new dead control. Model it on the existing `plugins/sgs-blocks/scripts/generate-extension-attributes.js --check` pre-commit gate. Wire it into the prebuild step. This is what stops the next migration re-introducing the problem — without it, trust-by-discipline fails.

## Sequence (highest client-impact first)

1. **info-box** (10 dead) — biggest offender.
2. **testimonial + testimonial-slider** (10 dead) — REMOVE-heavy (child blocks own colour).
3. **hero** (7 dead) — WIRE textAlign (see coordination flag) + ctaGap (emit gap on the `.sgs-hero__ctas` row; currently hardcoded to `--wp--preset--spacing--30` in style.css).
4. **post-grid** (3), **announcement-bar** (2), **product-card** (1 — `innerPadding` is shown via shared ContainerWrapperControls but absent from product-card schema; either add the attr+render or suppress the control for this block), **google-reviews** (1).
5. Orphans + vestigial + feature-grid schema bug.
6. The build-time guard.

## Tooling

| Skill / invoke when | Purpose |
|---|---|
| `/autopilot` (FIRST) | live skill routing + ADHD support |
| `/sgs-wp-engine` | SGS framework block-dev context, QA pipeline; has the SGS DB |
| `/wp-block-development` (at each block) | block.json / attributes / render contract |
| `/systematic-debugging` | if a "wire" doesn't take effect, root-cause before re-trying |
| `/adversarial-council` (pre-commit, per the batch) | stress-test the wire-vs-remove calls + the guard before shipping |
| `/verify-loop` | 2-attestation per block: editor control now changes rendered output |
| `/handoff` (session close) | summary + update state/decisions |

| Agent | Use |
|---|---|
| `wp-sgs-developer` | delegate the heavy per-block wiring/removal (this is its speciality) |

| Tool / CLI | Use |
|---|---|
| `python ~/.claude/hooks/wp-blocks.py dump` (`/wp-blocks`) | confirm a block's live attr schema before editing |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` (`/sgs-db`) | query block_attributes / supports |
| Playwright MCP | log into the canary editor, toggle each rewired control, confirm the frontend changes (the real verification) |
| `npm run build` in `plugins/sgs-blocks` | build (PowerShell, not Bash — broken node wrapper) |

## Verify (per block, before commit)

1. `npm run build` clean.
2. Deploy block set to canary (sandybrown) — see CLAUDE.md deploy one-liner; OPcache reset via HTTP.
3. Playwright: log into canary editor (creds in `.claude/secrets/sandybrown.env` — `WP_USER_SANDYBROWN`/`WP_PWD_SANDYBROWN`), open a page with the block, change the rewired control, save, load frontend, confirm the change renders. For REMOVED controls: confirm the control is gone and no PHP notice/regression.
4. The guard script: run it, confirm it reports zero dead controls after the pass, and that it FAILS on a deliberately-reintroduced dead control (prove it works).

## Commit discipline (shared `main` — strict)

- **Path-scoped commits only:** `git commit -- <explicit paths>` (a co-active session may have other files staged — a bare `git commit` sweeps them in). Check `git diff --cached --stat` first.
- One commit per block (or per logical group), message citing what was wired vs removed.
- **Never** add `Co-Authored-By`. UK English in all code/comments/strings.
- Core block changes go to `main` (these are framework blocks).

## Done-when

All 34 dead controls are WIRED or REMOVED, orphans deleted, the feature-grid schema bug fixed, the build-time guard added + proven, every change verified on the canary editor+frontend, adversarial-council passed, committed per-block to main, `/handoff` written. Report back: the wire-vs-remove decision table (attr → decision → reason), the guard's pass/fail proof, and any attr deferred with reason.
