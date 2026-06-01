# Session Handoff — 2026-06-03 (CLONING PIPELINE thread)

> Cloning thread. The theme/blocks thread runs in a parallel session (shared branch) → `.claude/handoff-theme.md` + `.claude/next-session-prompt-theme.md`. Prior handoffs in git history + `decisions.md`.

## Completed This Session
1. **Editor "invalid content" / "cannot be previewed" — root-caused from the runtime + FULLY FIXED + live-DOM verified (D141).** Playwright editor investigation found 2 issues in 2 layers: (a) 10 text-only leaf elements wrapped as `sgs/container`; (b) `sgs/media` `ReferenceError: imageId` in edit.js. Fixes: media `imageId` destructure; §FR-22-4.1 content-leaf step (tag-authoritative routing); compound prefix-strip (`card-tag`→label); `disclaimer`→`sgs/notice-banner` slot; badge repoint; chrome-skip header/footer. Editor store post-fix: 0 invalid blocks, 0 console errors.
2. **is-style carry + tag-authoritative content-leaf routing (D145, `b93a3b51`).** Drafts can request a block style (`is-style-*`) on a recognised block; the node's own tag is authoritative for content-type (img→media, etc.).
3. **`sgs/button` REPLACES `core/button` everywhere + WP-mirror `sgs/multi-button` grouping — P-9 COMPLETE (D146, `270cd995`).** 2-rater qc-council "P-9 COMPLETE: YES".
4. **Theme-wide button PRESETS (D147, `603cbaaf`).** `.sgs-button--primary/--secondary/--outline/--ghost` (+ element slots) → `sgs/button` with `inheritStyle` set → follows the theme preset. New `slots.standalone_block_default_attrs` column (also closes the parked subheading→heading need). qc-council caught + fixed a boolean-attr corruption bug (Finding 5).
5. **`<video>`/`<iframe>` → `sgs/media` (D147, `603cbaaf`)** + **`sgs/star-rating` Trustpilot style variations (D147, `6f7abca6`)** (flat-green + official-badge; REST-verified) — the social-proof trustpilot-bar can now clone via real components.
6. **Cart-block research (`/research-check`)** → architecture (Store API + Interactivity API, not cart-fragments) + a full theme-thread build prompt at `.claude/scratch/2026-06-03-prompt-sgs-cart-and-icon-enhancements.md`.

## Current State
- **Branch:** `feat/fr22-4-1-universal-wrapper` at `603cbaaf` — pushed. **Shared with the parallel theme thread** (its commits interleave). **NOT merged** (merge-prep gate: R-22-5 per-block split + R-22-13 Bean visual sign-off pending).
- **Tests:** no pytest in env; `db_lookup.py` equivalent_block_for smoke PASS; converter imports clean; all targeted unit + regression tests pass.
- **Build:** n/a for converter (Python). Block changes (media, star-rating) built + deployed to canary.
- **Uncommitted changes:** none (code committed; DB changes live in `sgs-framework.db`, not git-tracked).
- **Canary page 144** reflects the editor-fix re-clone (run `mamas-munches-homepage-2026-06-01-170153`).

## Known Issues / Blockers
- **CSS-transfer fidelity (the 4-gap D136 audit) is still unfixed** — it is the next priority (the pipeline's core job). Gap-4 brand premise was wrong (corrected: draft brand grid is `1fr 1fr`, no bug; only trust-bar grid is real).
- **Branch unmerged** — accumulating commits from two threads; merge-prep increasingly overdue.
- **Outcome check (Gate 3.5):** items 1–6 are OUTCOME ACHIEVED (editor errors gone — verified; button/preset/video/star-rating shipped + verified). The session's *editor-error + button* outcomes landed; the *CSS-transfer fidelity* outcome was NOT this session's scope and remains pending.

## Next Priorities (in order)
1. **Faithful CSS transfer (the 4-gap audit, D136)** — gap 1 (theme-CSS by position) + gap 2 (fold must stop dropping `__inner`), paired; then gap 3 (hero gradient) + gap 4 (trust-bar grid only). Design via /brainstorming + /qc-council first (sensitive).
2. **Real image sideload (media-map)** — hero/product images dry-run 404; biggest pixel lever once structure is faithful.
3. **Merge-prep → main** — split per-block (R-22-5) + Bean visual sign-off (R-22-13).
4. Variant-routing rollout (modifier-class mechanism, D135); video/iframe→media is done so a future media-video clone can use it.

## Files Modified
| File | What changed |
|------|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | content-leaf routing, button grouping, is-style carry, slot-default-attrs apply, modifier→inheritStyle (string-gated), video/iframe `_atomic_attrs_for` |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | prefix-strip Path 2b; `_slot_alias_to_default_attrs`/`slot_default_attrs_for`/`inherit_style_presets` helpers |
| `plugins/sgs-blocks/src/blocks/button/block.json` | `replaces: core/button` |
| `plugins/sgs-blocks/src/blocks/media/edit.js` | destructure `imageId` (editor crash fix) |
| `plugins/sgs-blocks/src/blocks/star-rating/{block.json,render.php}` | Trustpilot style variations |
| `.claude/decisions.md`, `state.md`, `next-session-prompt.md` | D147 + state + prompt update (STOP catalogue 36→38) |
| `sgs-framework.db` (live, not git) | `slots.standalone_block_default_attrs` column; button-preset slots + hyphenated aliases; `disclaimer` slot; badge repoint; video/iframe `html_tag_to_core_block` rows |

## Notes for Next Session
- **DB changes survive `/sgs-update`** (slots not rebuilt; Stage 1 reconciles `blocks.replaces` from block.json). Bean ran `/sgs-update` in the parallel session — verified it kept all this session's slot work intact.
- **Faithful transfer ≠ converter detect-mode hacks** (STOP #33) — the CSS-transfer fix belongs in the D0/D1/D2 transfer layer or a theme-CSS-by-position rule, never a per-section walker conditional.
- **Shared branch** — coordinate doc edits with the theme thread (decisions.md / state.md / parking.md get concurrent writes; D-numbers are claimed across both threads — D141/D145/D146 cloning, D142/D143/D144 theme, D147 cloning).
- A temp admin password was set then **restored** to the documented `.claude/secrets/sandybrown.env` value — that credential is valid.

## Next Session Prompt

The full orchestration plan lives in `.claude/next-session-prompt.md` (cloning thread) — read it end-to-end (warm start mandatory: STOP catalogue #1–38 + pre-flight ritual + mandatory reading list). Opener = faithful CSS transfer (the 4-gap D136 audit). Summary of mandatory tooling:

### Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST (auto-injected) — live routing + ADHD support |
| `/brainstorming` | Design the transfer-layer fix (sensitive: fold + theme-CSS) before coding |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | If a transfer approach needs the gold standard |
| `/strategic-plan` | Order the 4-gap fixes |
| `/systematic-debugging` | Root-cause each gap from artefacts + draft-diff |
| `/qc-council` | MANDATORY before every converter/block commit (blub.db 255) |

### MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | Serve the mockup on localhost + draft-vs-clone computed-style diff (`file://` blocked); live-DOM verification |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Schema enumeration before any "missing X" |
| `/sgs-db` (read) + `sqlite3` (writes) | DB ground truth |

### Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy converter / theme-CSS / fold build |
| `design-reviewer` | Visual parity draft-vs-clone after the transfer fix |

### Guardrails
- Deploy before measure (`build-deploy.py --blocks-only` + OPcache reset). Draft-diff, not pixel-diff, for layout. `--converter-v2` on orchestrator runs; `WP_DEBUG_DISPLAY` false on staging. `/qc-council` before every converter/block commit. Branch stays open until merge-prep + Bean sign-off.
