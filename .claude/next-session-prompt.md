recommended_model: opus
session_tag: small-giants-wp-2026-05-06-framework-qc-hardening

Invoke `/autopilot` before doing anything else.

You are running a **dedicated framework QC hardening session on Opus** to close every gap captured this past 3-day hero perfect-clone sequence. The hero PoC is DONE (verified live on sandybrown post 29 — every measurable property matches mockup). What remains is structural debt + UX issues + one binding lesson where Bean's eye caught visible defects that the validator had dismissed as "structural noise."

The mission this session: **make the SGS QC pipeline reliable enough that scripts never fail silently and QC catches every visible defect Bean's eye does.** No more classifier-trap incidents.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-06-framework-qc-hardening"`

## Read first (in this order)

1. `.claude/handoff.md` — last session summary (3-day hero sequence, what's done, what's deferred)
2. `.claude/parking.md` H-1 through H-7 — your **session backlog**. Each entry is a self-contained spec.
3. `.claude/mistakes.md` top section — the classifier-trap lesson (Bean's eye saw 4 visible defects in 55 deltas the classifier dismissed)
4. `.claude/specs/common-wp-styling-errors.md` Sections M, N, O, P, Q — defect taxonomy this session has built up
5. `reports/visual-diff/hero-audit-2026-05-05.md` — the visual audit that confirmed validator > classifier
6. `~/.claude/skills/visual-qa/SKILL.md` + `references/*.md` — the skill you'll be hardening (currently B 92% / A 96%; gaps in backlog)

## Where you are

- Branch: `main`, head `22df0a6` pushed
- Hero PoC complete and live on sandybrown post 29
- 7 hardening tasks captured in parking.md as H-1 through H-7
- Visual-QA skill at A grade (with H-5 binding rule attached)
- 4 prevention scripts armed: css-pattern-audit, render-mobile-override-audit, font-source-audit, mockup-parity-validator
- Pre-commit STOP GATE working (tripped + passed cleanly multiple times)
- Multi-frame harness, recogniser v3, global-styles-reset script all operational

## Tasks (in order — Opus session, ~4-6 hours total)

### Task 1 — H-5 first: Classifier human-eye gate (~55 min) — CRITICAL

This is the single biggest QC reliability gap. The 2026-05-04 classifier wrongly dismissed real defects. Fix structurally so it never recurs.

**1a. Build `scripts/screenshot-diff-helper.js` (~30 min)** — takes mockup + SGS URLs + viewport + selector, outputs:
- Side-by-side composite PNG (mockup left, SGS right, both at same scale)
- Pixel-diff heatmap PNG (red = mismatch, alpha by intensity)
- JSON: pixel-mismatch percentage, dominant-colour deltas, max-region-size
- Use `pixelmatch` npm package (already idiomatic for this) OR sharp + manual diff

**1b. Add `requires_screenshot_review: true` flag to mockup-parity-validator.js (~10 min)** — for any delta in the Q1-Q4 patterns (padding/margin >5px, display:flex/block on container with multiple children, negative-margin, backgroundColor child-vs-parent), set the flag. Operator + skill MUST review screenshot before reducing severity.

**1c. Bake Section Q rule into `~/.claude/skills/visual-qa/SKILL.md` programmatically via /lifecycle (~15 min)** — currently the rule is in common-wp-styling-errors.md (docs). Move into the skill's L9 layer description as an enforceable check: "Before reducing any delta severity, run `node scripts/screenshot-diff-helper.js` and attach output. No screenshot output, severity stays."

### Task 2 — H-7: Replace negative-margin full-bleed pattern (~45 min)

`plugins/sgs-blocks/src/blocks/hero/style.css` currently has `section.sgs-hero { margin: 0 -24px }` which only works if parent padding is exactly 24px. Replace with viewport-aware full-bleed:

```css
section.sgs-hero {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  max-width: none;
  /* On Windows, 100vw includes 15px scrollbar — guard with overflow-x:hidden on body if needed */
}
```

Test on:
1. Mac (no scrollbar)
2. Windows (15px scrollbar — the problem case)
3. Mobile 375px
4. Pages with custom wrapper padding (default 8px) AND 24px AND 0px

If `100vw` causes scrollbar overflow, fall back to JS-set `--viewport-width` CSS custom property updated on resize. Add to `theme/sgs-theme/assets/js/viewport-width.js` — use `document.documentElement.clientWidth` (excludes scrollbar).

After fix, remove the page-id-29 instance-level override from `mamas-munches.json` — it should no longer be needed.

### Task 3 — H-1 + H-2 — Hero block inspector reorganisation (~75 min)

Per parking.md H-1, reorganise the hero block's inspector panels by element, not by CSS-rule. Use /subagent-driven-development for this.

**3a. Audit current panels (~10 min)** — read `plugins/sgs-blocks/src/blocks/hero/edit.js`, list every `<PanelBody>` and which attributes it controls. Compare against H-1's preferred organisation (Container, Eyebrow, Headline, Subheadline, Image, Badges, Buttons).

**3b. Rewrite edit.js inspector (~50 min)** — single agent. Move attributes into element-grouped panels. Preserve all existing controls (don't remove any). Use `useInnerBlocksProps` patterns where appropriate.

**3c. Address H-2 image/media padding inline (~15 min)** — in the new "Image" panel, either:
- Rename: `imagePadding*` → "Inner padding (on the image element)", `mediaPadding*` → "Outer padding (on the media wrapper)"
- OR add help text via `<HelpText>` describing what each does

**3d. Verify** — load post 29 in WP admin via Playwright. Inspect that all controls still appear and saving still produces correct render. Build clean, no regressions.

### Task 4 — H-6: replaceBlock helper script (~50 min)

Per parking.md H-6, package the `wp.blocks.createBlock + replaceBlock` workaround as a reusable script:

`scripts/wp-update-block-attrs.js` — takes (post-id, block-name, new-attrs-json) and:
1. Logs into WP via env-var auth (same pattern as global-styles-reset.js)
2. Navigates to post edit screen via Playwright
3. Finds block by name (recursive into innerBlocks)
4. Calls `wp.blocks.createBlock` + `replaceBlock` to bypass save.js validation
5. Awaits save completion + verifies via REST API that post_content reflects new attrs
6. Reports success/failure with exit code

Fold into the visual-qa skill as a deploy step: after any source-block-attrs change, the skill auto-runs this script to apply attrs without manual operator orchestration.

### Task 5 — H-3: Video-everywhere-image foundation (~90 min)

Per parking.md H-3, this is a multi-block feature. Don't try to do all 12 affected blocks this session — build the foundation + 1 proof block (hero):

**5a. Shared `MediaPicker` component (~30 min)** — `plugins/sgs-blocks/src/components/MediaPicker.js`. Wraps `MediaUpload` from `@wordpress/block-editor`. Accepts both image + video mime types. Returns `{ url, type ('image'|'video'), id, alt, mime }`.

**5b. Render helper (~20 min)** — `plugins/sgs-blocks/includes/render-helpers.php` add `sgs_render_media($attrs, $context = 'block-name')` that emits `<img>` for images and `<video autoplay loop muted playsinline>` for videos.

**5c. Migrate hero block as proof (~30 min)** — replace `splitImage` (image-only) with `splitMedia` (media-slot accepting image OR video). Add deprecation for backward compat. Update edit.js to use `MediaPicker`.

**5d. Document the migration pattern (~10 min)** — write `tools/qc-prevention/media-slot-migration.md` so subsequent block migrations follow the same recipe.

Defer migrating the other 11 blocks to a separate session — too much scope for one go.

### Task 6 — H-4: Brand-source pink shade validation (~30 min)

Per parking.md H-4, sample dominant colours from `sites/mamas-munches/research/brand/`:
1. Use Python PIL: open the PNG, get the dominant pink pixel cluster (e.g. via k-means clustering on the colour distribution)
2. Compare to mockup `--surface-pink: #F5C2C8` and `--primary: #E68A95`
3. If the brand source uses different pinks, decide with Bean: update Mama's variation to match brand, OR keep it matching the mockup brief

If brand differs, also sample: cookie-brown, accent-yellow, charcoal — full palette validation, not just the 2 pinks.

### Task 7 — Re-audit + close out (~30 min)

After all 6 tasks landed:

1. Run `/visual-qa --mode full` on the hero — confirm 0 visible defects with the new screenshot-helper integration
2. Run `node scripts/mockup-parity-validator.js` — confirm any flagged "structural noise" deltas now have `requires_screenshot_review` flag enabled, classifier walks through them
3. Verify hero block inspector is reorganised and operator-tested
4. Verify replaceBlock helper works end-to-end
5. Verify video-on-hero proof works (upload a 5MB sample video, set as splitMedia, verify renders correctly)
6. Write `reports/visual-diff/hero-2026-05-06-final.md` with `verdict: PASS` if all 7 tasks closed

### Task 8 — /handoff for next-next session (~15 min)

If the framework hardening lands cleanly, the next-next session moves to **trust-bar / heritage-strip / next mockup section**. Write that as the next prompt. If anything didn't land (e.g. Task 5 needed more time), defer to the next-next session.

## Skills + tools to use

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Throughout |
| `/subagent-driven-development` | Tasks 3 + 4 + 5 — multiple file paths, parallelisable in places |
| `/dispatching-parallel-agents` | Tasks 1a + 1b are independent file paths (helper script vs validator flag); Task 2 + Task 6 have no overlap |
| `/wp-block-development` | Task 3 (edit.js reorg) + Task 5 (block schema migration) |
| `/lifecycle` | Task 1c (skill update — gated, mandatory) |
| `/visual-qa` | Task 7 final audit |
| `/handoff` | Task 8 |

| Tool | Use |
|---|---|
| `node tools/multi-frame-qa/capture.js` | First-paint capture (already operational) |
| `node scripts/mockup-parity-validator.js` | Computed-style diff (Task 1b: add requires_screenshot_review flag) |
| `node scripts/css-pattern-audit.js` | M1 prevention (already operational) |
| `node scripts/render-mobile-override-audit.js` | F4 prevention (already operational) |
| `node scripts/font-source-audit.js` | O2 prevention (already operational) |
| `node scripts/global-styles-reset.js` | Variation deploy (already operational) |
| `node scripts/screenshot-diff-helper.js` | NEW (Task 1a) |
| `node scripts/wp-update-block-attrs.js` | NEW (Task 4) |
| `python tools/recogniser-v2/extract.py` | Re-extract if mockup changes |
| `mcp__plugin_playwright_playwright__*` | Browser automation (NOT for measurement-of-record per P1) |
| SSH `u945238940@141.136.39.73:65002` | Server access |

## Constraints

- **Use Opus for the heavy thinking, dispatch Sonnet subagents for mechanical implementation.** Each task above is well-spec'd — Sonnet can execute. Opus's role is orchestration + design decisions on H-3 (video) + H-4 (brand-pink-vs-mockup) where there's a real call to make.
- **Bake every fix into the QC pipeline structurally** — not as docs that need to be remembered. If it's not a script that runs automatically, it doesn't count.
- **Time-estimate default LOW** — these are quoted optimistic. Live-calibrate downward as steps finish faster.
- **Per-instance fixes (variation CSS) only when framework fixes are blocked.** Tasks 2 + 5 are framework-level — the right scope.
- **Pre-commit STOP GATE will catch any block-src commit without a passing visual-diff report.** Write reports as you go.
- **`wp_global_styles` reset+reapply is mandatory after any variation change.** Use `node scripts/global-styles-reset.js` (Task 4 may extend its capabilities).
- **Don't dismiss any parity-validator delta as 'structural noise' without screenshot evidence.** That's the binding rule from this session.

## Success criteria for the session

1. Tasks 1, 2, 4, 7, 8 complete (H-5, H-7, H-6, audit, handoff)
2. Task 3 (H-1 + H-2 inspector reorg) complete on hero; pattern documented for cascade to other blocks
3. Task 5 (H-3 video) foundation + hero proof complete; remaining 11 blocks deferred
4. Task 6 (H-4 brand pink) decided with Bean
5. Hero re-audit shows 0 visible defects with the new screenshot-helper integration; classifier-trap pattern can't recur
6. All 7 H-entries in parking.md moved to Resolved (or have a dated next-session deferred note)
7. Pre-commit STOP GATE accepts the final commit
8. Handoff written for next-next session (trust-bar OR continued framework work depending on what landed)

## Why this matters

Bean is launching a business. The hero PoC took 3 days because of recurring QC failures. With this hardening session, future client clones (Mama's full homepage, Indus Foods, HelpingDoctors, Workwear Now, etc.) should hit ~99% on the first pass without iteration. The cumulative ROI of these 6 hours is measured in tens of hours saved across future client work.
