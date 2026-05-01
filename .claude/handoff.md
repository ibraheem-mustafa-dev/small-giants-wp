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

### Conditional Step 11 — Propagate the canonical pattern across all five lateral applications (RUN ONLY IF Step 4 quick verification passes)

The same canonicalise-at-build pattern fixes five problem areas, not just the recogniser. **If the Step 4 verification on sandybrown shows zero validation errors,** propagate the pattern to every doc + spec + skill that touches one of these workflows so it's locked in across the framework, not rediscovered next time:

**Five lateral applications (one pattern, one doc update each):**

| # | Application | Canonical doc to update |
|---|---|---|
| 1 | `/wp-site-extraction` skill — Astra/Spectra/Squarespace site → SGS replication | `~/.claude/skills/wp-site-extraction/SKILL.md` (add a "Canonicalisation gate" section requiring Layer A on extracted block markup before it hits `wp post create`) |
| 2 | AI page generation — any future "describe a page, build it" feature | `.claude/architecture.md` (add a "Synthesised content invariants" section noting any future synthesiser MUST emit through Layer A) |
| 3 | Bulk client onboarding (Wix / Squarespace / hand-coded HTML → SGS) | Same `wp-site-extraction` skill + a new bullet in `.claude/architecture.md` under client-onboarding flow |
| 4 | SGS block plugin updates that change `save()` shape | `plugins/sgs-blocks/CLAUDE.md` (note that any save.js shape change requires the matching deprecation AND that Layer B's auto-recovery JS is the runtime safety net) |
| 5 | Pattern library imports — synced patterns + reusable blocks pushed via WP-CLI | `theme/sgs-theme/CLAUDE.md` patterns section + add Layer A to any pattern-import script under `tools/` |

**Cross-cutting docs that need the unifying frame** (regardless of which application surfaced first):
- `.claude/mistakes.md` — extend the `block-validation-recovery` row to enumerate the five lateral applications so future sessions see the full coverage, not just the recogniser context.
- `.claude/specs/common-wp-styling-errors.md` row B4 — reframe from "recogniser-specific" to "any synthesised-markup pipeline"; reference the five applications.
- `~/.claude/skills/autopilot/references/correction-ledger.md` — append a correction noting "synthesised block markup must always pass Layer A canonicalisation"; this is what autopilot reads at Stage 0 step 2 to adjust before classifying tasks. Without this, the next session that hits "I'm writing a script that builds block markup" might re-derive the failure from scratch.
- `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_synth_markup_canonicalise_at_build.md` — NEW auto-memory entry capturing the canonical pattern (referenced earlier in step 9 — make sure this gets created, not just edited into the existing block-validation-recovery file). Title and description should make it triggerable on any future synthesised-markup work.
- `~/.claude/projects/.../memory/MEMORY.md` index — add a one-line entry pointing at the new feedback file under "Critical Behavioural Rules".

**Architecture-level entry:** `.claude/architecture.md` should grow a short "Synthesised content lifecycle" section that documents the source → build → deploy → runtime layer model. This is the cross-cutting frame the five applications inherit from.

**Order of operations for Step 11:** do a single grep to confirm where each application is currently mentioned in the codebase (`rg -l "wp-site-extraction\|AI page generation\|client onboarding\|pattern import"` etc.), then update each with a 1-2 sentence reference back to the canonical pattern in `specs/common-wp-styling-errors.md` B4. Don't duplicate the full explanation; link to it. Then commit `docs(propagation): canonical-block-markup pattern enumerated across five lateral applications` and push.

**Skip Step 11 if Step 4 verification fails** — propagating a pattern that hasn't been validated wastes coverage across the framework. If verification fails, surface the specific edge case (which static block, what attribute, what diff) and re-research before propagation.

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
- **If Step 4 verification passes:** Step 11 (lateral-application propagation) shipped — all five applications + cross-cutting docs updated; correction ledger entry added; new auto-memory feedback file written and indexed in MEMORY.md
- Morning handoff written via `/handoff`
~~~


---


