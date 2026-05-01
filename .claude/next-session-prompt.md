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

## Task 2: Add a deploy-time validation guard for synthesised post_content (new defence layer)

This is BOTH the fix for this session's symptom AND the procedural guard so the issue never recurs (Bean explicit ask).

**Existing source-level guard:** `plugins/sgs-blocks/scripts/audit-block-uniformity.py` runs as a pre-commit hook when any `block.json` is staged. It catches static-block source bugs (missing deprecations, `source: html` on dynamic blocks, etc.). It is correct and stays unchanged.

**New deploy-level guard required.** The audit hook fires on local `block.json` edits — it can't see WP-CLI calls that write synthesised `post_content` to a remote DB. The recogniser pipeline (and any future importer / migration script) operates at a layer the source audit doesn't reach. The next session must add a deploy-time defence:

**IMPORTANT — hook signal caught during this handoff write:** the project has a guard that blocks Bash commands containing the post_content-evaluation pattern (`wp eval-file` against post_content), with the message *"Never modify post_content directly. Use the Site Editor or `wp.data.dispatch()` via Playwright instead."* That's a stronger directive than the round-trip pattern in `specs/common-wp-styling-errors.md` B4. The canonical fix is therefore **Playwright-driven Site Editor recovery**, not server-side parse/reserialize.

After `/brainstorming` (decide: implement inside Module 6, as a new Module 7, as a post-deploy hook, as a `/deploy-check` rule, OR as a hybrid), build a guard with this preferred shape:

1. Write `tools/recogniser/playwright/recover-blocks.js` — Playwright script that opens `/wp-admin/post.php?post=$ID&action=edit`, waits for the editor, runs `wp.data.dispatch('core/block-editor').replaceBlocks(...)` (or scripts the per-block "Attempt Block Recovery" via `wp.data.select('core/block-editor').getBlocks()` + `attemptValidation()` per the @wordpress/blocks API), then `wp.data.dispatch('core/editor').savePost()`. WordPress's editor logic regenerates correct save HTML from attributes, and the save persists through the normal flow — no direct DB writes.
2. Write `tools/recogniser/playwright/verify-no-validation-errors.js` — opens the editor, asserts zero ".block-editor-warning" elements present, and zero `wp.data.select('core').isResolving` issues. Fails loud if any block shows the invalid-content warning.
3. Update Module 6 (`tools/recogniser/output_router.py`) so its emitted deploy sequence is now: `wp post create --porcelain` → `node tools/recogniser/playwright/recover-blocks.js --post-id=$ID --site=$URL --user=$USER --password=$PASS` → `node tools/recogniser/playwright/verify-no-validation-errors.js --post-id=$ID`. The third step is a **hard gate** — non-zero exit aborts the deploy.
4. Update `/deploy-check` (or add a new SGS-deploy-check rule) so any deploy that includes synthesised post_content runs the Playwright recovery + verify automatically.
5. Update `specs/common-wp-styling-errors.md` B4 to note the canonical fix is Playwright-driven Site Editor recovery (NOT server-side parse/reserialize, which is blocked by the project's post_content guard); reference the implementation files.
6. Capture the prevention pattern itself in a new auto-memory entry `feedback_synth_markup_must_roundtrip.md` so it survives across sessions and surfaces in MEMORY.md. Include the hook-signal context — explain WHY the server-side approach is blocked (single source of truth = the editor flow).
7. **Decide the layer relationship explicitly:** the deploy-time guard is *additive* to `audit-block-uniformity.py`, not a replacement. Document the two-layer model (source-time audit + deploy-time Playwright recovery + verify) in the deploy-check skill so future sessions don't accidentally collapse the layers or remove either one.

If `/brainstorming` surfaces a strong reason to use the server-side parse/reserialize pattern despite the hook block (e.g. the hook is overly broad), surface it to Bean for review — don't silently bypass with `--no-verify` or rephrasing to evade the guard.

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
