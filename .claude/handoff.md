---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-01
session_tag: small-giants-wp-2026-05-01-recogniser-deploy-iter
recommended_model: sonnet
---

# Session Handoff — 2026-05-01 (recogniser deploy + visual diff iteration)

## Completed This Session

1. Decision-B fixes shipped on `feat/recogniser-v1` (PR #10): hero `eyebrow` attribute (`c95d34e`), trust-badges prompt example + rule 8 in `tools/recogniser/prompts/recogniser-prompt.md`, surgical patches to `reports/recogniser-decisions-2026-05-01.json` re-routing trust-bar → `sgs/trust-badges` and ingredients → `core/group` + 4 emoji `sgs/icon-block` cards (`e182bde`).
2. Re-emitted Modules 5 + 6 against the patched decisions; new tier distribution 5 full / 1 partial / 2 fallback / 1 deferred.
3. Two production deploys: `palestine-lives.org/mamas-munches-homepage-test/` page 283 with active variation `indus-foods` (`6981bd4`); clean substrate on `sandybrown-nightingale-600381.hostingersite.com` after `wp db reset` + fresh install + `mamas-munches` variation + `Halimahs.jpeg` SCP'd to `wp-content/uploads/mamas/` (`0cc1265`).
4. Sandybrown homepage set as static front (`page_on_front=5`) so the test renders at `/`.
5. Playwright captures at 375 / 768 / 1440px on both deploys. Diff vs mockup: 45–48% (palestine) and 48–52% (sandybrown). Page heights 1370–1765px vs mockup 4500–7800px.
6. Local WP Playground attempted twice; both runs errno 28 during WP-install phase — confirms `feedback_playground_not_useful.md` for SGS visual QA.
7. **Diagnosis corrected by Bean (post-deploy):** the visible-content gap is NOT framework rendering. The block editor shows "Block contains unexpected or invalid content" on the deployed page — root cause is `feedback_block_validation_recovery.md`. Module 5 (serialiser) emits hand-crafted HTML for static core blocks that doesn't match WP core's `save()` output exactly. WP marks the blocks invalid and falls back to stored HTML (which is the same broken HTML), so most content renders as bare or empty divs.

## Current State

- **Branch:** `feat/recogniser-v1` at `0cc1265` (PR #10, 16 commits ahead of `main`)
- **Tests:** no test suite (WP block plugin)
- **Build:** clean — `cd plugins/sgs-blocks && npm run build` exits 0
- **Uncommitted changes:** none related to this session; long-standing untracked subproject scaffolds remain
- **Live test page:** https://sandybrown-nightingale-600381.hostingersite.com/ (homepage) — clean mamas-munches substrate; visibly broken due to the validation-error issue above
- **Stash:** `pre-recogniser-branch-stash` on `main` holds pre-session uncommitted changes

## Known Issues / Blockers

1. **Block validation errors on the deployed page (root cause).** The serialiser's output for static core blocks (`core/heading`, `core/paragraph`, `core/image`, `core/quote`, `core/buttons`, `core/button`, `core/columns`, `core/column`, `core/group`) doesn't match what WP core's `save()` would generate verbatim. Per `feedback_block_validation_recovery.md`: invalid blocks fall back to stored HTML, ignoring new attributes — this IS the "barely anything is consistent" symptom. Editor shows the error explicitly.
2. **Hero missing background image.** Recogniser didn't extract `backgroundImage` from the mockup hero. The cold prompt has no example showing `<picture>` / `<img>` extraction into `backgroundImage: { url, id }` — needs adding to `tools/recogniser/prompts/recogniser-prompt.md`. Then either re-extract the hero section (one CLI call) or surgically patch the decisions JSON.
3. **`sgs/notice-banner` v3 deprecation needs verification.** Gap fix 2 added a v3 deprecation, but the deployed markup uses attributes (`icon`, `iconValue`, `text`, `linkText`, `linkUrl`) — confirm v3 covers exactly that shape, otherwise notice-banner instances also fail validation.
4. **`sgs/feature-grid` + `sgs/testimonial` — likely render OK but invisible because containing core blocks fail validation around them.** Re-evaluate AFTER fix 1 lands; may already be solved.
5. **Default `theme/sgs-theme/parts/footer.html` carries Indus-shaped placeholders.** "Quick Links: Certifications/Trade/Brands…" leak into every variation. Lower priority — variation-pattern decision.

## Next Priorities (in order)

1. **Verify the validation-error diagnosis FIRST.** Open the test page in the WP block editor on sandybrown (`/wp-admin/post.php?post=5&action=edit`). Screenshot the validation errors. Click "Attempt Block Recovery" on each — does that bring back ingredient titles, gift cards, testimonials? If yes, diagnosis confirmed and the fix path is correct.
2. **Fix Module 5 serialiser for static core blocks.** Three viable paths to evaluate via `/brainstorming`: (a) Run `parse_blocks()` + `serialize_blocks()` server-side via `wp eval` after `wp post create` so WP regenerates correct save HTML; (b) Rewrite the serialiser to emit only block-comment markers (no inner HTML) and trigger WP-side re-save once via a small PHP script; (c) Reduce reliance on static core blocks by routing more sections to dynamic SGS blocks where possible (recogniser-decision tweak). Path (a) is simplest and most local; pick that unless brainstorming surfaces a strong reason against.
3. **Add hero `backgroundImage` extraction to the cold prompt + re-extract just the hero section.** Edit `tools/recogniser/prompts/recogniser-prompt.md` with a `<picture>`/`<img>`-in-hero example. Run one `claude -p --print "..." --output-format json` call against just the hero HTML fragment. Patch `reports/recogniser-decisions-2026-05-01.json`. Re-emit + redeploy. SCP the hero photo too.
4. **Verify `sgs/notice-banner` v3 deprecation against the deployed shape.** Read `plugins/sgs-blocks/src/blocks/notice-banner/deprecated.js`. Confirm v3's attributes object exactly matches `{icon, iconValue, text, linkText, linkUrl, ...}` from the deployed markup. If not, fix the deprecation (NOT the new save).
5. **Re-deploy + re-capture + re-diff.** Once 1–4 land, redeploy to sandybrown, recapture at 3 viewports, run the PIL diff script. Realistic v1.1 target: < 20%. Update PR #10 body.

## Files Modified

| File | What changed |
|---|---|
| `plugins/sgs-blocks/src/blocks/hero/{block.json,edit.js,render.php}` | Added `eyebrow` attribute (Decision-B fix 1); RichText control above headline; renders `<span class="sgs-hero__label">` |
| `tools/recogniser/prompts/recogniser-prompt.md` | Added trust-badges example + rule 8; quick-reference correction |
| `reports/recogniser-decisions-2026-05-01.json` | Manual patches: trust-bar → sgs/trust-badges full; ingredients → core/group with 4 sgs/icon-block emoji cards; hero eyebrow set |
| `reports/mamas-homepage-blocks.html` | Re-serialised against patched decisions |
| `reports/mamas-munches-page-content.html` | Re-emitted by Module 6 |
| `reports/mamas-munches-page-content-sandybrown.html` | Same content with `Halimahs.jpeg` path rewritten to absolute sandybrown uploads URL |
| `theme/sgs-theme/parts/{header,footer}-mamas-munches.html` + `theme/sgs-theme/patterns/{header,footer}-mamas-munches.php` | Re-emitted |
| `reports/visual-diff/{capture.js,capture-sandybrown.js,capture-root.js}` | Playwright capture scripts |
| `reports/recogniser-v1-qc.md` | Added "Final" + "Final²" sections; documented gate adjustment, deploy outcomes (note: root-cause diagnosis in QC report needs updating to point at validation errors, not framework rendering) |
| `.claude/state.md` | `current_phase` shifted to `framework-rendering-fidelity`; blockers updated |
| `.claude/handoff-prev.md` | Previous session's handoff preserved here |
| `.claude/specs/common-wp-styling-errors.md` | Added row B4: synthesised-markup pipelines hit static-block validation failures; canonical fix is `parse_blocks` + `serialize_blocks` round-trip via `wp eval-file`. Mandatory for the recogniser going forward. |
| `.claude/mistakes.md` | Updated `block-validation-recovery` row with the 2026-05-01 synthesised-markup extension and the codified prevention pattern. |
| `~/.claude/projects/.../memory/feedback_block_validation_recovery.md` | Appended "2026-05-01 extension" section documenting the synthesised-pipeline manifestation and the mandatory round-trip + verify pattern. |

## Notes for Next Session

- **Bean caught the wrong diagnosis live.** Initial assumption was framework-rendering issues (theme.json defaults, render.php robustness). Real cause is block validation errors per the captured lesson `feedback_block_validation_recovery.md`. Always check the editor for validation errors FIRST when "I changed the attribute but nothing happened on the frontend." The handoff text in `state.md` says `framework-rendering-fidelity` — that label is slightly off; the real phase is `serialiser-validation-correctness`. Adjust during the next session if helpful.
- **The captured lesson exists for a reason — read MEMORY.md before declaring a diagnosis.** Specifically `feedback_block_validation_recovery.md` and `feedback_use_devtools_first.md`. They cover both this exact failure mode and the right debug order.
- **Module 3 is expensive (~57min full run).** For the hero `backgroundImage` re-extraction, run the prompt against ONLY the hero HTML fragment (one CLI call, ~30 sec).
- **`feedback_playground_not_useful.md` confirmed twice.** Don't try Playground for SGS visual QA — use sandybrown.
- **Don't update the QC report's diagnosis section yet.** It currently attributes the visible-content gap to framework rendering. Next session should fix the diagnosis after confirming the validation-error theory by opening the editor on sandybrown.

## Next Session Prompt

~~~
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
~~~


---


