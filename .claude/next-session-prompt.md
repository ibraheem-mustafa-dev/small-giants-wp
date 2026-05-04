recommended_model: sonnet
session_tag: small-giants-wp-2026-05-05-finish-hero-and-trust-bar

Invoke `/autopilot` before doing anything else.

You are closing out the SGS hero perfect-clone (~99% → 100%) and beginning the next mockup section. Last session shipped the recogniser v3 (Playwright getComputedStyle), the mockup parity validator, the font source audit script, the B2 button responsive min-height attrs, and B4 self-hosted Fraunces — all verified live on sandybrown post 29. Every defect from the original 13-delta measured QC is fixed. The QC infrastructure is now durable: 3 prevention scripts + 1 multi-frame capture + 1 mockup parity validator + 1 pre-commit STOP GATE.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-05-finish-hero-and-trust-bar"`

## Read first (in this order)

1. `.claude/handoff.md` — last session summary (what's done, what remains)
2. `reports/visual-diff/hero-2026-05-04-final.md` — verdict: PASS report + breakdown of remaining ~1% gap
3. `reports/parity/sandybrown-2026-05-04-final.md` — parity validator output with the 128 deltas (mostly noise — see categorization in the hero-final report)
4. `tools/qc-prevention/F1-F2-margin-attrs.md` — implementation sketch for F1/F2 (kept for this session)
5. `.claude/mistakes.md` top sections + `.claude/specs/common-wp-styling-errors.md` Sections O + P — the lessons to keep applying

## Where you are

- Branch: `main`, head `1a0057b` pushed
- Hero PoC at ~99% visual fidelity. All major defects fixed and live.
- 5 commits this session sequence. Pre-commit STOP GATE works correctly (tripped + passed twice).
- SSH to sandybrown is the same as palestine-lives: `u945238940@141.136.39.73:65002` with `~/.ssh/id_ed25519`. Domain path: `domains/sandybrown-nightingale-600381.hostingersite.com/public_html/`.

## Tasks (in order)

### Task 1 — Close out the hero to ~100% (~30 min)

Three small fixes complete the perfect-clone:

**1a. F1/F2 — sub/headline marginBottomMobile + tabletmargin attrs** (~25 min)
Implementation sketch in `tools/qc-prevention/F1-F2-margin-attrs.md`. Adds 4 attrs on the hero block (`headlineMarginBottom`, `headlineMarginBottomMobile`, `subHeadlineMarginBottom`, `subHeadlineMarginBottomMobile`). Wires through block.json + render.php (with !important on mobile per F4) + edit.js (ResponsiveControl in inspector under Typography).

After implementing: re-build, deploy, then via Playwright + WP block editor, do a final `replaceBlock` on post 29 with the new attrs set per Mama's mockup values:
- `headlineMarginBottom: 16` desktop / `headlineMarginBottomMobile: 14`
- `subHeadlineMarginBottom: 28` desktop / `subHeadlineMarginBottomMobile: 24`

**1b. Button line-height 1.6** (~5 min)
Mockup buttons: `line-height: 1.6` (24px on 15px). SGS buttons: 1.2 (18px). Either:
- Update the SGS Button block's `style.css` to use `line-height: 1.6` as default (framework change — affects all clients)
- OR add a `lineHeight` attribute to sgs/button block.json + edit.js + render.php (per-instance, more flexible)
- OR override on Mama's variation buttonPresets `line-height` field

Recommendation: update Mama's variation `buttonPresets.primary.line-height: "1.6"` and same for secondary — keeps the framework default flexible.

After: re-deploy + reset+reapply global-styles + verify live.

**Verification gate:** Run `node scripts/mockup-parity-validator.js` and confirm the real-defect count (filtering false positives manually if validator filters aren't in yet — see Task 2) drops to 0.

### Task 2 — Mockup parity validator: filter false positives (~30 min)

The validator currently reports 128 deltas, ~120 of which are noise. Add filters in `scripts/mockup-parity-validator.js`:

**2a. Skip `display:none` ancestors** (~10 min)
When matching a fingerprint selector, walk up the DOM checking `getComputedStyle(ancestor).display !== 'none'`. If any ancestor is hidden, the matched element isn't visible — skip it for the "first visible match" rule. This solves the `.hero-content h1` (in `.hero-mobile` display:none at 1440) returning mobile font-size 34px when the visible element is `.hero-copy h1` (52px desktop).

**2b. Treat fontFamily fallback-stack as equivalent if primary family matches** (~10 min)
Parse fontFamily strings into a list (split on `,`, trim, strip quotes). If the FIRST family matches and is loaded via document.fonts on both sides, declare equivalent. Severity Minor at most, not Major. Removes ~14 false positives.

**2c. CSS-keyword equivalents** (~10 min)
Add an equivalence table:
- `textAlign: start ↔ left` (for LTR — they render identically)
- `minWidth: 0 ↔ auto` and `minHeight: 0 ↔ auto`
- `display: block` parent vs `display: grid/flex` parent — if the visual output positions are equivalent (out of scope for v1; defer)

After these filters: validator should report ~6 real deltas instead of 128. Re-run on the post-Task-1 sandybrown state. Expected verdict: PASS or near-PASS with all real defects identified.

### Task 3 — Verify hero at ~100% with all three audits (~15 min)

Pass criterion: 0 Major defects, ≤ 2 Important, ≥ 99% visual fidelity, all three audits agree.

```bash
# Multi-frame
node tools/multi-frame-qa/capture.js \
  --url "https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29&fresh=$(date +%s)" \
  --out tools/multi-frame-qa/runs/sgs-hero-final \
  --viewports "375,1440" \
  --selector "section.sgs-hero"

# Mockup parity (post Task 2 filters)
python -m http.server 8765 (background, from sites/mamas-munches/mockups/homepage/)
node scripts/mockup-parity-validator.js \
  --mockup http://localhost:8765/index.html \
  --sgs https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29 \
  --viewports 375,1440 \
  --fingerprint sites/mamas-munches/research/hero-parity-fingerprint.json \
  --out reports/parity/sandybrown-2026-05-05.md

# Gemini Pro Vision (independent)
gemini --model gemini-3.1-pro-preview ... (see /gemini-vision-audit skill)
```

Write `reports/visual-diff/hero-2026-05-05.md` (NEW DATE per the STOP GATE) with verdict PASS once all three agree.

### Task 4 — Move to next mockup section: trust-bar (~45 min)

Once hero is officially done, start the trust-bar at `sites/mamas-munches/mockups/homepage/index.html` — find the next section (likely `.trust-strip` or similar after the `.hero` section).

Steps (all the infrastructure now exists):
1. Run `python tools/recogniser-v2/extract.py --mockup ... --section "section.trust-bar" --block sgs/trust-bar --media-map ... --out sites/mamas-munches/research/trust-bar-extracted.json`
2. Inspect the extracted attrs + block markup
3. If the existing `sgs/trust-bar` block lacks needed attrs, document them in `tools/qc-prevention/<defect-id>.md` and add via subagent-driven-development
4. Update post 29 (or a new post) with the trust-bar block via `wp.blocks.createBlock` + `replaceBlock` over Playwright
5. Deploy + cache flush + global-styles reset+reapply + OPcache reset
6. Run mockup parity validator targeting the trust-bar selector
7. Iterate until PASS

### Task 5 — /handoff (~10 min)

Run `/handoff`. Either continue building down the homepage section by section OR begin batching: load the homepage mockup as a whole, build N pattern containers per the mockup's section structure, batch-deploy, run a whole-page parity audit. Bean to choose direction.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Throughout |
| `/subagent-driven-development` | Tasks 1, 2, 4 — implementer + spec + quality review per fix |
| `/dispatching-parallel-agents` | If tasks have independent file paths (e.g. F1/F2 hero work doesn't share files with parity validator filter work — could parallelize) |
| `/wp-blocks` `/sgs-db` `/library-docs` | As needed |
| `/visual-qa` | Task 3 standard QC pass — note M1/N4 blind spots |
| `/gemini-vision-audit` | Task 3 vision audit |
| `/handoff` | End |

## MCP servers + CLI

| Tool | Use |
|---|---|
| `mcp__plugin_playwright_playwright__browser_evaluate` | wp.data.dispatch.replaceBlock for post attr updates |
| `mcp__plugin_playwright_playwright__browser_navigate` | WP admin + REST API for global-styles |
| `node tools/multi-frame-qa/capture.js` | First-paint defect capture |
| `node scripts/mockup-parity-validator.js` | Computed-style parity (post Task 2 filters) |
| `node scripts/css-pattern-audit.js` | Pre-commit M1 check |
| `node scripts/render-mobile-override-audit.js` | F4 check on render.php edits |
| `node scripts/font-source-audit.js` | Pre-commit external-CDN font check |
| `python tools/recogniser-v2/extract.py` | Auto-derive block markup from mockup section |
| SSH `u945238940@141.136.39.73:65002` (`-i ~/.ssh/id_ed25519`) | Server access for deploy + cache management |
| `phpcs --standard=WordPress` | After any PHP change |

## Constraints

- **The wp_global_styles reset+reapply procedure is MANDATORY after any variation file change.** See handoff.md "deployment procedure validated end-to-end". Without it, file changes won't propagate to the live site.
- **Use `wp.blocks.createBlock` + `replaceBlock` for post attribute updates**, NOT `updateBlockAttributes`. The latter silently fails when the block has a save.js validation error (which any pre-existing post will have if the block schema has changed).
- **Do NOT use `wp eval` or `wp post update`** for global styles or post_content — both blocked by `wp-content-guard.py` correctly. Use Playwright + REST API + `wp.data.dispatch` instead.
- **Visual claims need rendered-DOM proof.** `getComputedStyle()` lies for fonts (always reports declared fontFamily even if load failed) — also check `document.fonts` status. The mistakes.md lessons keep firing; keep applying them.
- **Branch discipline**: framework changes go to `main`. Run `git branch --show-current` before every commit.
- **Time estimates default LOW.** Estimates above are optimistic; that's the right framing per the rules. Live-calibrate downward when steps finish faster than estimated.

## Success criteria for the session

1. F1/F2 attrs implemented + deployed + verified live on post 29 (margin-bottom mobile/tablet values match mockup)
2. Button line-height matches mockup (1.6 → 24px on 15px font)
3. Mockup parity validator filters added (display:none ancestor skip, fontFamily fallback equivalent, CSS keyword equivalents) — validator reports ≤ 6 real deltas
4. Three independent audits all agree PASS at 1440 + 375 — write `reports/visual-diff/hero-2026-05-05.md` with verdict PASS
5. Hero PoC marked complete; next mockup section (trust-bar) extracted + scaffolded OR /handoff written for batched homepage build
