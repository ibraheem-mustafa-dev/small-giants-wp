recommended_model: sonnet
session_tag: small-giants-wp-2026-05-05-deferred-hero-fixes

Invoke `/autopilot` before doing anything else.

You are continuing the SGS WordPress hero perfect-clone work. Last session (2026-05-04) shipped the QC harness, three deterministic prevention scripts, and 5 of 8 priority hero fixes — verified live on sandybrown. Multi-frame audit shows 0 first-paint defects. Visual fidelity moved from ~50% → ~80%. To hit ≥95% pass criterion: implement the deferred F1/F2 margin attributes + R1/R2 recogniser improvements (~70 min total, well-spec'd).

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-05-deferred-hero-fixes"`

## Read first (in this order)

1. `.claude/handoff.md` — last session summary (5 fixes verified live, deployment cracked)
2. `reports/visual-diff/hero-2026-05-04.md` — measurement evidence + STOP GATE compliance + remaining defects
3. `tools/qc-prevention/F1-F2-margin-attrs.md` — full implementation sketch for margin attrs
4. `tools/qc-prevention/R1-R2-recogniser-extraction.md` — full implementation sketch for recogniser
5. `reports/hero-poc-qc-2026-05-04.md` — original 13-delta measured QC (still authoritative for deltas not yet fixed)

## Where you are

- Branch: `main`, head `c7093ae` pushed
- 5 of 8 priority hero fixes verified live on sandybrown (V1, V2, M1, F4, F5, V3 — the V3 covers both h1 lineHeight and the .sgs-hero__headline inheritance fix)
- 3 prevention scripts armed (CSS pattern audit, render.php audit, pre-commit STOP GATE)
- The deployment procedure is now documented end-to-end (handoff.md "deployment lesson" section) — variation changes need a `wp_global_styles` post reset+reapply via REST API
- SSH to sandybrown is the SAME credentials as palestine-lives (`u945238940@141.136.39.73:65002`, `~/.ssh/id_ed25519`, domain path `domains/sandybrown-nightingale-600381.hostingersite.com/public_html/`)

## Tasks (in order)

### Task 1 — Implement F1/F2 margin-bottom attributes (~25 min)

Per `tools/qc-prevention/F1-F2-margin-attrs.md`. Adds 4 attributes:
- `headlineMarginBottom`, `headlineMarginBottomMobile`
- `subHeadlineMarginBottom`, `subHeadlineMarginBottomMobile`

Wires through:
1. `plugins/sgs-blocks/src/blocks/hero/block.json` — attribute declarations
2. `plugins/sgs-blocks/src/blocks/hero/render.php` — emit as scoped @media CSS rules with !important on mobile (per the F4 pattern — see `scripts/render-mobile-override-audit.js`)
3. `plugins/sgs-blocks/src/blocks/hero/edit.js` — ResponsiveControl in inspector under Typography panel (mirror existing `headlineFontSize` pattern)

Solves I2/I4/M3/M4 from the original 23-defect list (4 typography rhythm misses).

After implementing: `npm run build` (from plugins/sgs-blocks/), then run `node scripts/render-mobile-override-audit.js --block hero` to check no new mobile-cascade defects introduced. Then re-extract Mama's hero with the recogniser (Task 2 will improve this) and deploy.

### Task 2 — Implement R1/R2 recogniser improvements (~45 min)

Per `tools/qc-prevention/R1-R2-recogniser-extraction.md`. Switch `tools/recogniser-v2/extract.py` to use Playwright `getComputedStyle()` at 1440px viewport for all desktop measurements. This single move fixes:
- **R1** — inline `style="..."` attribute extraction (the mockup's `style="font-size:52px"` etc. are silently dropped right now)
- **R2** — `@media (min-width: 1280px)` tier (currently dropped because recogniser only handles base/tablet/mobile)
- **R3** — computed-vs-declared cascade (currently extracts CSS-rule values, not browser-resolved values)

Implementation sketch is in the TODO file. The key change: use Playwright async API to load the mockup, navigate at 1440px viewport, and read `getComputedStyle(el)` for every fingerprinted selector. Map computed pixel values back to block attributes.

Solves C3 (52px headline), C4 (72/64 padding), I5 (1.6 label line-height) from the original 23-defect list.

### Task 3 — Re-extract Mama's hero + redeploy (~10 min)

```bash
python tools/recogniser-v2/extract.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --section "section.hero" \
  --block sgs/hero \
  --media-map sites/mamas-munches/research/sandybrown-media-map.json \
  --out sites/mamas-munches/research/sandybrown-hero-extracted-v3.json
```

Inspect the output. Confirm `headlineFontSize: 52`, `contentPaddingTop: 72`, `contentPaddingRight: 64`, `labelLineHeight: 1.6` (the exact values that were missing pre-R1/R2).

Use the extracted attrs to update post 29 on sandybrown via Playwright + the WP block editor (via wp.data.dispatch — NOT direct post_content edits, the hook blocks that).

Then deploy theme + plugin via the standard tar method, run the wp_global_styles reset + reapply procedure (see handoff.md "deployment lesson"), and verify live.

### Task 4 — Run all three audits, agree on PASS (~25 min)

```bash
# Multi-frame
node tools/multi-frame-qa/capture.js \
  --url "https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29&fresh=$(date +%s)" \
  --out tools/multi-frame-qa/runs/sgs-final \
  --viewports "375,1440" \
  --selector "section.sgs-hero"

# Measured QC — re-create reports/hero-poc-qc-2026-05-05.md following the
# 2026-05-04 file's structure. Use Playwright browser_evaluate to capture
# computed styles at 1440 and 375 viewports for every QC delta from
# the original report. Compare to mockup served via
# python -m http.server 8765 from sites/mamas-munches/mockups/homepage/.

# Gemini Pro Vision audit
gemini --model gemini-3.1-pro-preview ... (see /gemini-vision-audit skill — the
script handles the screenshot capture and prompt construction)
```

Pass criterion: 0 Major defects, ≤ 2 Important, visual-fidelity ≥ 95%, all three audits agree.

### Task 5 — Write the final visual-diff report + commit (~10 min)

Create `reports/visual-diff/hero-2026-05-05.md` with:
```yaml
---
verdict: PASS
first_paint_capture_passed: true
block: sgs/hero
date: 2026-05-05
test_url: https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29
viewports_tested: [375, 1440]
---
```

Plus the audit summary (mirror the structure of `reports/visual-diff/hero-2026-05-04.md`). Commit Task 1-2 source code + the report — the STOP GATE will accept it because the report exists and has `verdict: PASS`.

If pre-commit hook isn't already installed on this clone (it's per-clone, not committed), reinstall it from the previous session's commit history or recreate it from the spec in `handoff.md`.

### Task 6 — Mark hero PoC done, update projects.md, /handoff (~10 min)

Run `/handoff`. Next-session prompt should be either:
- (a) The next mockup section build — likely the trust-bar in `sites/mamas-munches/mockups/homepage/index.html` lines 314-380
- (b) `/visual-qa` skill upgrade to bake in the multi-frame harness as a default L1.5 (closes N1/N4 blind spots permanently in the SGS workflow)

Recommendation: (b) first — closes the methodology gap so future block work is protected by default. (a) is normal feature work that doesn't need a special session.

## Skills to invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Throughout — all SGS WP work |
| `/subagent-driven-development` | Tasks 1-2 — implementer + spec + quality review per fix |
| `/visual-qa` | Task 4 standard QC — flag the M1/N4 blind spots in the run report (still present) |
| `/gemini-vision-audit` | Task 4 vision audit |
| `/handoff` | End |

## MCP servers + CLI

| Tool | Use |
|------|-----|
| `mcp__plugin_playwright_playwright__browser_evaluate` | Live verification at every step |
| `mcp__plugin_playwright_playwright__browser_navigate` | Site editor for wp_global_styles reapplication |
| `node tools/multi-frame-qa/capture.js` | Task 4 multi-frame audit |
| `node scripts/css-pattern-audit.js` | Pre-commit + sanity checks |
| `node scripts/render-mobile-override-audit.js` | Sanity check on render.php changes (Task 1) |
| `gemini --model gemini-3.1-pro-preview` | Task 4 vision audit |
| `phpcs --standard=WordPress` | After any PHP change |
| `python tools/recogniser-v2/extract.py` | Task 2-3 |
| `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73` | Server access for deploy |

## Constraints

- **The wp_global_styles reset+reapply procedure is mandatory after any variation change.** Don't skip it. See handoff.md "deployment lesson". Without it, file changes don't propagate to the live site.
- **Do NOT use `wp eval` or `wp post update`** for global styles — both are blocked by the WP content guard hook (correctly). Use the REST API via Playwright instead. The exact code worked last session — copy it.
- **Visual claims need rendered-DOM proof.** Use `browser_evaluate` to capture computed styles. Don't claim a fix works because the source code looks right. The `feedback_verify_rendered_output_not_internal_metrics` lesson keeps firing — keep applying it.
- **Branch discipline**: framework changes go to `main`. Run `git branch --show-current` before every commit.

## Success criteria for the session

1. F1/F2 implemented end-to-end (block.json + render.php + edit.js + build green)
2. R1/R2 implemented in recogniser (Playwright-based extraction, validated against Mama's hero with computed styles matching mockup)
3. Re-deploy verified live: headline 52px, content padding 72/64, label line-height 1.6 (the previously-missed values)
4. All three audits agree PASS at 1440 + 375 (0 Major, ≤2 Important, ≥95% fidelity)
5. `reports/visual-diff/hero-2026-05-05.md` written with PASS verdict, STOP GATE accepts the commit
6. Hero PoC marked complete; handoff written for either next mockup section or /visual-qa skill upgrade
