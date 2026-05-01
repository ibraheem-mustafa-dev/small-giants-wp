recommended_model: sonnet
session_tag: small-giants-wp-2026-05-02-serialiser-validation-correctness

You are a senior WordPress block framework engineer specialising in the SGS Framework, Gutenberg block validation, and the WordPress block save/parse lifecycle. Your goal this session is to fix the block-validation-error root cause that's making the recogniser-deployed homepage render mostly empty.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-02-serialiser-validation-correctness"

Read in this order before doing anything:
1. `MEMORY.md` (auto memory) — note `feedback_block_validation_recovery.md` and `feedback_use_devtools_first.md` — these are the captured lessons that diagnose the live issue
2. `.claude/handoff.md` (this session's summary) — Known Issues #1 is the root cause
3. `.claude/state.md`
4. `reports/recogniser-v1-qc.md` (the "Final²" section)
5. `CLAUDE.md`

The live test page is https://sandybrown-nightingale-600381.hostingersite.com/. Open `/wp-admin/post.php?post=5&action=edit` on it FIRST — confirm the "Block contains unexpected or invalid content" error before touching code.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decision: which of the three serialiser-fix paths (parse+reserialize via wp eval / block-comment-only output / dynamic-block routing) — Task 2 |
| `/gap-analysis` | Grade visual-diff improvement after each fix lands |
| `/lifecycle` | Only if any new skill / agent / pipeline is needed |
| `/research` | If WP block-validation lifecycle / parse_blocks behaviour needs a refresher |
| `/strategic-plan` | Order the 4 fixes — they have dependencies (validation fix lands before redeploy + diff) |
| `/sgs-wp-engine` | All SGS block + theme work; sgs-db.py introspection |
| `/wp-block-development` | Per-block save() output and deprecation work on `sgs/notice-banner` |
| `/wp-wpcli-and-ops` | `wp eval` patterns for the parse + serialize round-trip approach |
| `/playwright` | Visual capture at 3 viewports after each fix |
| `/deploy-check` | Pre-deploy checklist before each tar push |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Capture sandybrown after each fix; also use to navigate `/wp-admin/post.php?post=5&action=edit` and screenshot the validation errors |
| `sgs-db.py` CLI | Inspect block attribute shapes — `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/notice-banner` etc. |
| WP-CLI via SSH | Sandybrown WP root: `ssh -p 65002 -i ~/.ssh/id_ed25519 u945238940@141.136.39.73`, then `cd ~/domains/sandybrown-nightingale-600381.hostingersite.com/public_html`. Use `wp eval-file` with the parse + serialize PHP script for fix path (a) |
| Claude CLI subprocess | Re-extract just the hero section's `backgroundImage` via one `claude -p --print "..." --output-format json` call |
| GitHub MCP | Update PR #10 with new screenshots + diff numbers |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All framework changes — serialiser fix, notice-banner deprecation verification, hero backgroundImage support |
| `feature-dev:code-reviewer` | After each fix ships — review diff before redeploy |
| `design-reviewer` | After visual-diff capture — surface remaining layout discrepancies vs mockup |
| `test-and-explain` | Final session run-through — plain-English status for Bean |

## Research Approach

Use `/research-check` for WP-conventions questions: `parse_blocks()` + `serialize_blocks()` round-trip behaviour, dynamic-vs-static block save() expectations. Don't deep-research — these are well-documented APIs.

---

## Task 1: Confirm the diagnosis (≤10 min)

Open `https://sandybrown-nightingale-600381.hostingersite.com/wp-admin/post.php?post=5&action=edit` (use Playwright; admin user is `Claude`, password is whatever `wp core install` set during the previous session — reset via `ssh -p 65002 ... wp user update Claude --user_pass=NEWPASS` if you need to). Screenshot the editor and note which blocks show "Block contains unexpected or invalid content." Save the screenshot to `reports/visual-diff/editor-validation-errors.png`. Click "Attempt Block Recovery" on the first invalid block, save, and reload the frontend. Does ingredient content appear? If yes, diagnosis confirmed.

## Task 2: Add a build-time canonicalisation step + runtime safety net (per 2026-05-01 research-buddies finding)

**Diagnosis updated post-handoff (research at `reports/research/2026-05-01-block-validation-prevention-canonical-pattern.md`).** The Playwright-recovery approach this section originally proposed is the wrong layer — it's a deploy-time fix to a build-time problem. The canonical pattern used by every major block plugin is build-time canonicalisation + runtime safety net.

**Existing source-level guard:** `plugins/sgs-blocks/scripts/audit-block-uniformity.py` runs as a pre-commit hook when any `block.json` is staged. It catches static-block source bugs. It stays unchanged.

**New layers required (three of them, additive):**

### Layer A — Build-time canonicalisation (the actual fix)

Before any `wp post create`, run `@wordpress/blocks` parse+serialize as a Node step on the recogniser's serialised markup. This is the same JS code the editor uses internally; running it locally produces canonical markup the editor accepts on first open, with zero validation errors.

1. Add `@wordpress/blocks` to `plugins/sgs-blocks/package.json` if not already a transitive dep.
2. Write `tools/recogniser/node/canonicalise-blocks.js`:
   ```js
   #!/usr/bin/env node
   const { parse, serialize } = require('@wordpress/blocks');
   const fs = require('fs');
   const raw = fs.readFileSync(process.argv[2] || '/dev/stdin', 'utf8');
   process.stdout.write(serialize(parse(raw)));
   ```
3. Update `tools/recogniser/output_router.py` to pipe its `mamas-munches-page-content.html` through `node tools/recogniser/node/canonicalise-blocks.js` before emitting the WP-CLI command. Output goes into the file SCP'd up + read by `wp post create --post_content="$(cat ~/page-content.html)"`.
4. **Quick verification** (Bean's first move next session, ~10 min): run the canonicaliser on the existing `reports/mamas-munches-page-content.html`, diff old-vs-new, then create one test page on sandybrown and open in the editor. Zero validation errors confirms the assumption (~95% confidence per Round 1 research). If edge cases remain, Layer B catches them.

### Layer B — Runtime safety net

Install `auto-block-recovery` (https://wordpress.org/plugins/auto-block-recovery/) on every SGS client site, or fork its ~100 lines of JS into the sgs-blocks plugin directly (Spectra's pattern — see `brainstormforce/wp-spectra/blocks-config/uagb-controls/autoBlockRecovery.js`). It silently runs `createBlock(name, attrs, innerBlocks)` on every editor load, throwing away stale stored HTML and rebuilding from attributes. Lossless as long as attributes are the source of truth.

5. Decide via `/brainstorming`: bundle `auto-block-recovery` as a recommended plugin in the SGS deploy-check, OR fork the recovery JS into sgs-blocks (preferred — fewer dependencies, controllable). If fork: drop the JS into `plugins/sgs-blocks/src/auto-recovery/index.js`, register it as an editor asset via `enqueue_block_editor_assets`.

### Layer C — Long-term structural

6. Audit all 59 SGS blocks via `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/<name>` (or query the DB directly). Flag any block where `block_type = 'static'` AND `save.js` returns non-null markup. Convert each to `save: () => null` + `render.php`, with a deprecation entry covering the old save shape. Eliminates the entire class of validation errors caused by future SGS plugin updates.

### Documentation + procedural guard

7. Update `specs/common-wp-styling-errors.md` B4 to reflect the three-layer pattern (the current entry already mentions Playwright as a fallback; correct it to reflect Layer A as the canonical fix and Layer B as the safety net).
8. Update `.claude/mistakes.md` `block-validation-recovery` row similarly.
9. Capture the canonical pattern as `feedback_synth_markup_canonicalise_at_build.md` in auto-memory so future sessions surface it via MEMORY.md.
10. Add a `/deploy-check` rule: if a deploy invokes `wp post create --post_content`, the upstream content MUST have been piped through `canonicalise-blocks.js`. Verify by checking the output file's hash against a build manifest, OR by running the canonicaliser as a no-op (idempotent — second run = same output) before deploy and aborting if the diff is non-empty.

The two-layer source/deploy model from the previous handoff still holds: `audit-block-uniformity.py` (source-time) + canonicalise-blocks.js (build-time) + auto-recovery JS (runtime) = three layers of defence, all additive.

**Why this beats the Playwright approach the previous handoff proposed:** Playwright recovery is deploy-time (per-page admin login + editor automation, slow, flaky, requires maintained credentials). Canonicalisation is build-time (pure local Node, idempotent, scriptable, no admin context). Bean's safety hook is also satisfied — no `wp eval-file` post_content writes, no direct DB modification, the markup just IS canonical from birth.

## Task 3: Add hero backgroundImage extraction

Edit `tools/recogniser/prompts/recogniser-prompt.md`. Add an Example showing `<section class="hero">` containing `<picture>` / `<img>` → `extracted_attrs.backgroundImage = { url, id: null, alt }`. Re-extract just the hero via one `claude -p` call against the hero HTML fragment from the mockup. Manually patch `reports/recogniser-decisions-2026-05-01.json` with the result. SCP the hero photo to sandybrown's uploads dir; rewrite the URL in page content. Re-emit Modules 5 + 6.

## Task 4: Verify sgs/notice-banner v3 deprecation

Read `plugins/sgs-blocks/src/blocks/notice-banner/deprecated.js`. Confirm `v3.attributes` matches the deployed shape `{icon, iconValue, text, linkText, linkUrl, ...}` exactly. If a key is missing or its type is wrong, fix the deprecation. Don't change the new `save.js`.

## Task 5: Redeploy, recapture, re-diff, update PR

After Tasks 2–4 ship: tar deploy → OPcache reset → `wp post create` (or update existing post 5) → reserialize via the new wp-eval-file step → Playwright captures at 375 / 768 / 1440 → PIL diff vs mockup. Realistic target: < 20%. Update PR #10 body with screenshots + numbers. Run `/handoff` at the end.

## Guardrails

- All framework changes go to `feat/recogniser-v1`, never `main`
- Build via `cd plugins/sgs-blocks && npm run build` after any source-code edit
- Tar deploy method per `CLAUDE.md` — never `scp -r`
- HTTP-method OPcache reset (CLI reset is a separate pool)
- Verify on sandybrown (clean mamas-munches substrate), not palestine-lives
- < 20% visual diff is the realistic v1.1 target — don't chase < 5% this session
- Re-run full Module 3 only if absolutely necessary; surgical patches are cheaper

## Acceptance for this session

- Editor screenshot showing validation errors before any fix (`reports/visual-diff/editor-validation-errors.png`)
- Tasks 2–4 shipped, each with its own commit
- After redeploy: editor shows zero validation errors on the test page
- Sandybrown homepage shows ingredient titles + descriptions, hero background image, gift cards, and testimonials all visible
- Playwright diff < 20% at all 3 viewports (informational target)
- PR #10 updated with new screenshots + diff numbers
- Morning handoff written via `/handoff`
