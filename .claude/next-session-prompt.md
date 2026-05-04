recommended_model: sonnet
session_tag: small-giants-wp-2026-05-05-deploy-and-finish-hero

Invoke `/autopilot` before doing anything else.

You are continuing the SGS WordPress hero perfect-clone work. Last session (2026-05-04) shipped the QC harness, three deterministic prevention scripts, and 5 of 8 priority hero fixes in source code. The blocker was deployment: the hero PoC test page lives on a sandybrown Hostinger account where there are no SSH credentials, and WP's theme JSON DB cache holds stale values that file-level edits don't invalidate.

This session must close the perfect-clone goal: 0 Major defects, ≤ 2 Important, ≥ 95% visual fidelity, all three audits (measured / Gemini Vision / multi-frame) agreeing PASS at 1440 + 375.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-05-deploy-and-finish-hero"`

## Read first (in this order)

1. `.claude/handoff.md` — last session summary (what shipped, what didn't, why)
2. `tools/qc-prevention/sandybrown-deployment-blocker.md` — 4 resolution paths in preference order, ranked
3. `tools/qc-prevention/F1-F2-margin-attrs.md` — implementation sketch for headline/subheadline margin-bottom attributes
4. `tools/qc-prevention/R1-R2-recogniser-extraction.md` — recogniser inline-style + 1280+ tier fix sketch
5. `reports/hero-poc-qc-2026-05-04.md` — the 13-delta measured QC (still authoritative until re-run)

## Where you are

- Branch: `main`, commit `6b50465` is HEAD
- 5 of 8 hero fixes are in source code (M1 animation removal, F4 mobile padding !important, F5 max-width leak, V3 h1 lineHeight)
- 3 prevention scripts are armed: `scripts/css-pattern-audit.js`, `scripts/render-mobile-override-audit.js`, `.git/hooks/pre-commit` STOP GATE
- 1 new QC harness ready: `node tools/multi-frame-qa/capture.js`
- The 5 source fixes are NOT visible on sandybrown yet — deployment unblocked is the prerequisite for any verification

## Tasks (in order)

### Task 1 — Resolve deployment to sandybrown (~30 min, top priority)

Read `tools/qc-prevention/sandybrown-deployment-blocker.md`. Pick one of the 4 paths. In rough order of preference:

a. **Get SSH credentials from Bean.** Ask: "I need the SSH host/port/user for sandybrown-nightingale-600381.hostingersite.com (or the Hostinger hPanel login for that account). Without it I can't deploy theme files." Then deploy via the standard tar method (see framework CLAUDE.md). After deploy: `wp theme activate sgs-theme && wp litespeed-purge all && rm -rf wp-content/litespeed/css/*.css`.

b. **Move V1/V2 fix to base theme.json.** Change `theme/sgs-theme/theme.json` `settings.custom.buttonPresets.primary.text` from `"#ffffff"` to a palette token like `"var(--wp--preset--color--text-inverse)"`. This is a framework-correct change (eliminates the bare-hex default, which violates the palette-tokens-not-bare-hex rule). Then redeploy.

c. **Site Editor save trick.** Log into WP admin → Appearance → Editor → make any global styles change and save. This forces WP to regenerate the theme.json CSS cache. Combine with LiteSpeed purge.

d. **CSS override in variation's `css` field.** Document only — actual deployment still requires path A or C above.

**Verification gate for Task 1:** `getComputedStyle(document.querySelector('.sgs-button.is-style-primary')).color` MUST return `rgb(58, 46, 38)` (charcoal `#3A2E26`) on the live page. Use the Playwright MCP tools to confirm. Don't proceed to Task 2 until this is true.

### Task 2 — Re-run multi-frame QC on the deployed site (~10 min)

```bash
node tools/multi-frame-qa/capture.js --url "https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29" --out tools/multi-frame-qa/runs/sgs-after-deploy --viewports "375,1440" --selector "section.sgs-hero"
```

Inspect `tools/multi-frame-qa/runs/sgs-after-deploy/1440px-snapshots.json` for `computedAnimationName`. Should be `"none"` for `.sgs-hero__split-image`, `.sgs-hero__ctas`, `.sgs-hero__subheadline`, `.sgs-hero__headline`. Also confirm at frame 0ms, all four elements have `isVisible: true`. If yes — M1 is dead.

### Task 3 — Run all three audits, agree on PASS (~25 min)

Pass criterion: 0 Major, ≤ 2 Important, ≥ 95% visual fidelity, all three audits agree.

```bash
# Measured QC — re-create reports/hero-poc-qc-2026-05-05.md following the format of the 2026-05-04 file
# Use Playwright to capture computed styles at 1440 + 375 and compare to mockup values

# Gemini Pro Vision audit
gemini --model gemini-3.1-pro-preview ... (see /gemini-vision-audit skill)

# Multi-frame audit (already done in Task 2)
```

Confirm all three say PASS in the same row before declaring victory. If any disagree, find the gap, fix, re-run.

### Task 4 — Implement F1/F2 if time allows (~25 min)

Per `tools/qc-prevention/F1-F2-margin-attrs.md`. Adds 4 attributes: `headlineMarginBottom`, `headlineMarginBottomMobile`, `subHeadlineMarginBottom`, `subHeadlineMarginBottomMobile`. Wires through block.json + render.php + edit.js. Solves I2, I4, M3, M4 from the 23-defect list.

After implementing: re-run the recogniser to populate, redeploy, re-audit. Aim for ≥ 95%.

### Task 5 — R1/R2 if Task 4 lands cleanly (~45 min)

Per `tools/qc-prevention/R1-R2-recogniser-extraction.md`. Switch `tools/recogniser-v2/extract.py` to Playwright `getComputedStyle()` at 1440px. Fixes inline-style extraction, 1280+ tier extraction, and computed-vs-declared cascade in one move.

### Task 6 — Write the visual-diff report and trip the STOP GATE (~10 min)

Once all audits PASS, write `reports/visual-diff/hero-2026-05-05.md` containing:
```
verdict: PASS
first_paint_capture_passed: true
```

Plus the audit summary. This satisfies the pre-commit STOP GATE and certifies the hero perfect-clone done. Commit + push.

### Task 7 — Handoff (~10 min)

Run `/handoff`. Next-session prompt should be either: (a) the next mockup section (trust-bar / heritage-strip / etc.) per `sites/mamas-munches/mockups/homepage/index.html`, OR (b) the visual-qa skill update to incorporate the multi-frame harness as a standard layer (close the N1/N4 blind spots in the skill itself).

## Skills to invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Throughout — all SGS WP work |
| `/subagent-driven-development` | Tasks 4-5 — implementer + spec + quality review per fix |
| `/visual-qa` | Task 3 standard QC — but the M1/N4 blind spots STILL exist in the skill itself; flag them in the run report |
| `/gemini-vision-audit` | Task 3 vision audit |
| `/handoff` | End |

## MCP servers + CLI

| Tool | Use |
|------|-----|
| `mcp__plugin_playwright_playwright__browser_evaluate` | Verify deployed CSS custom properties (Task 1 gate) |
| `mcp__plugin_playwright_playwright__browser_navigate` | Live site verification |
| `node tools/multi-frame-qa/capture.js` | Task 2 multi-frame audit |
| `node scripts/css-pattern-audit.js` | Pre-commit + sanity check |
| `node scripts/render-mobile-override-audit.js` | Sanity check on render.php changes |
| `gemini --model gemini-3.1-pro-preview` | Task 3 vision audit |
| `phpcs --standard=WordPress` | After any PHP change |
| `python tools/recogniser-v2/extract.py` | Task 5 (after R1/R2 implementation) |

## Constraints

- **Do NOT proceed past Task 1 until the deployment gate is verified live.** Use Playwright `browser_evaluate` to confirm `--wp--custom--button-presets--primary--text` is the charcoal palette token (not `#ffffff`). Stop and ask Bean if you can't get past this — do not grind on cache-busting tricks for more than 15 minutes (last session burned 20+ minutes here, see ADHD Rule 13).
- **Do NOT mark any task complete on the basis of internal metrics** (commits, builds, validations passing). Visual claims need rendered-DOM proof. See `mistakes.md` top entry.
- **Do NOT bypass the STOP GATE on real block code commits.** Task 6 satisfies it correctly. Use `--no-verify` only for the QC harness bootstrap commit (already done last session) and for genuinely non-visual changes (block.json metadata-only, PHP logic only).
- **Branch discipline**: framework changes go to `main`. If touching only Mama's variation or sites/mamas-munches/, can branch as `fix/mamas-hero-fidelity` and merge after audit. Run `git branch --show-current` before every commit.

## Success criteria for the session

1. Sandybrown deployment path unblocked (one of 4 options chosen + verified live)
2. The 5 source fixes from last session visible on sandybrown (verified via Playwright `browser_evaluate`)
3. Multi-frame audit shows 0 first-paint defects (M1 dead)
4. Three independent audits all agree PASS at 1440 + 375
5. `reports/visual-diff/hero-2026-05-05.md` written with `verdict: PASS` AND `first_paint_capture_passed: true`
6. Handoff written for the next mockup section OR the visual-qa skill upgrade
