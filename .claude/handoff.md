---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-05
recommended_model: opus
session_tag: small-giants-wp-2026-05-06-framework-qc-hardening
---

# Session Handoff — 2026-05-05 (hero perfect-clone closed; 7 hardening gaps captured for Opus session)

## Headline

Three days of work closed: hero PoC is **end-to-end verified live on sandybrown post 29** with every measurable mockup property matched. Multi-frame QC harness, mockup parity validator, recogniser v3, global-styles-reset script, visual-qa skill upgrade (B 92% → A 96%), 4 prevention scripts + pre-commit STOP GATE all shipped. Bean caught 4 visible defects via human-eye comparison that the validator's classifier had wrongly dismissed as "structural noise" — those are fixed AND the lesson is captured as a binding rule.

7 architecture/UX/structural gaps captured for next session: inspector reorganisation, image/media padding redundancy, video-everywhere feature, brand-source pink validation, classifier-trap structural enforcement, block-validation replaceBlock workaround, framework full-bleed pattern replacement.

**Next session is Opus, dedicated to closing every gap so QC catches what Bean's eye does and scripts never fail silently.**

## Sessions completed in this 3-day sequence

| Day | Headline | Commits |
|-----|----------|---------|
| 2026-05-04 part 1 | Hero PoC declared "structural success" + measured QC + Gemini Vision + Bean's live observation found 23 defects + invisible-image-on-load bug | 6b50465 (multi-frame harness + 3 prevention scripts + 5 hero fixes) |
| 2026-05-04 part 2 | wp_global_styles cache lesson + Fraunces silent font-load lesson + variation deploy procedure cracked | c7093ae, 1a0057b (recogniser v3 + parity validator + B2 + B4 + lessons) |
| 2026-05-05 part 1 | F1/F2 margin attrs + button line-height + parity validator filters | b784af4, b9e3bda (final mobile parity fixes) |
| 2026-05-05 part 2 | Visual-qa skill upgrade via /lifecycle (B 92% → A) + global-styles-reset.js + capture.js auto-detect | 6459d75, b9cf0b8 |
| 2026-05-05 part 3 | Bean's eye caught 4 visible defects validator dismissed as "structural noise" — classifier-trap lesson captured (Section Q binding rule) + 3 visible fixes shipped | 239980e, 37e0db9 |
| 2026-05-05 part 4 | Final 2 visible bugs (mobile button gap + desktop full-bleed instance) + 7 H-entries captured in parking | 22df0a6 |

Total commits to main: 11 over 3 sessions. Hero is now closed.

## Live verification (sandybrown post 29)

**Every measurable property matches mockup:**

| Property | Mockup | SGS now | Status |
|---|---|---|---|
| Hero background | rgb(245, 194, 200) #F5C2C8 | matches exactly | ✅ |
| Primary button bg | rgb(230, 138, 149) #E68A95 | matches exactly | ✅ |
| Primary button text | charcoal #3A2E26 | matches exactly | ✅ |
| Secondary button border | rgb(230, 138, 149) | matches exactly | ✅ |
| Headline font-size | 52px | 52px | ✅ |
| Headline line-height | 59.8px (1.15) | 59.8px | ✅ |
| Headline margin-bottom | 16px / 14px (mob) | 16 / 14 | ✅ |
| Subheadline font-size | 18px / 16px (mob) | 18 / 16 | ✅ |
| Subheadline font-weight | 400 | 400 | ✅ |
| Subheadline margin-bottom | 28px / 24px (mob) | 28 / 24 | ✅ |
| Label line-height | 19.2px (1.6) | 19.2px | ✅ |
| Content padding | 72px 64px | 72 / 64 | ✅ |
| Buttons inline @ 1440 | side-by-side | inline ✓ | ✅ |
| Buttons stacked @ 375 | column with 10px gap | column 10px gap | ✅ |
| Hero image full-bleed | reaches viewport edge | x=0, right=1425 (matches .entry-content full width) | ✅ |
| Hero entrance animation | none | none (M1 dead) | ✅ |
| Fraunces document.fonts | loaded | loaded | ✅ |
| WP page-title leak | hidden | hidden | ✅ |

## QC infrastructure shipped this sequence

| Tool / Skill | Purpose |
|---|---|
| `tools/multi-frame-qa/capture.js` | First-paint defect detection at 0/200/500/1000/3000ms; auto-detect selector flag |
| `scripts/css-pattern-audit.js` | M1 critical (animation-fill-mode:both + delay) |
| `scripts/render-mobile-override-audit.js` | F4 (inline desktop beats mobile @media without !important) |
| `scripts/font-source-audit.js` | O2 (external CDN font src in theme.json) |
| `scripts/mockup-parity-validator.js` | Computed-style diff between mockup + SGS at all viewports + document.fonts assertion |
| `scripts/global-styles-reset.js` | 7-step automation of post-deploy reset+reapply+cache+OPcache reset |
| `tools/recogniser-v2/extract.py` | Playwright getComputedStyle extraction; auto-derives from block.json |
| `.git/hooks/pre-commit` (SGS Visual QC STOP GATE) | Blocks block-src commits without passing visual-diff report |
| `~/.claude/skills/visual-qa/` | 9-layer pipeline incl. L9 mockup parity validator (A grade) |

## Lessons captured (durable, bound into specs + skill)

1. **Multi-frame screenshots are mandatory** — single post-load screenshot misses M1-class first-paint defects (mistakes.md, common-wp-styling-errors.md M1-M4 + N1-N5)
2. **wp_global_styles is the actual cache layer** — file changes don't propagate without REST API reset+reapply (Section O1)
3. **Webfont silent failures need document.fonts assertion** — `getComputedStyle().fontFamily` lies (Section O2)
4. **CSS specificity beats theme.json typography** — block CSS must NOT hardcode element typography (Section O3)
5. **Variation `var(--wp--custom--*)` deeply-nested merge can fail** — use direct palette tokens (Section O4)
6. **Authenticated Playwright context shows admin-bar offsets** — canonical QC tools are fresh-Chromium scripts (Section P1)
7. **Validator deltas dismissed as "structural noise" need screenshot evidence** — Bean's eye saw 4 visible defects in 55 deltas the classifier dismissed (Section Q + binding classifier rule). This is the most important lesson — see mistakes.md top entry.

## Outstanding gaps (parking.md H-1 through H-7)

All targeted at next session (Opus, dedicated framework hardening):

| # | Gap | Effort | Priority |
|---|-----|--------|----------|
| H-5 | Classifier human-eye gate (screenshot-diff helper + requires_screenshot_review flag + bake Section Q into skill) | ~55 min | **CRITICAL** — the single biggest QC reliability gap |
| H-7 | Replace negative-margin full-bleed framework pattern with viewport-aware solution | ~45 min | High — currently each client variation needs manual override |
| H-1 + H-2 | Hero block inspector reorganised by element (Container, Eyebrow, Headline, Subheadline, Image, Badges, Buttons) instead of by CSS-rule. Image vs media padding redundancy clarified. | ~75 min | High — Bean's repeated UX complaint |
| H-6 | replaceBlock helper script (`scripts/wp-update-block-attrs.js`) — bake the block-validation workaround | ~50 min | Medium |
| H-3 | Video-everywhere-image foundation (MediaPicker component + render helper + hero proof) | ~90 min | Medium-Large — multi-block feature |
| H-4 | Brand-source pink shade validation (sample brand PNG vs mockup pinks) | ~30 min | Low — may not be a real defect, Bean to confirm |

## Files shipped this sequence

### Tools / Scripts (live):
- `tools/multi-frame-qa/capture.js` — multi-frame capture (~390 lines)
- `tools/recogniser-v2/extract.py` — Playwright extraction upgrade
- `scripts/css-pattern-audit.js` — M1 audit (~300 lines)
- `scripts/render-mobile-override-audit.js` — F4 audit (~230 lines)
- `scripts/font-source-audit.js` — O2 audit (~80 lines)
- `scripts/mockup-parity-validator.js` — L9 parity (~410 lines, with 4 filters)
- `scripts/global-styles-reset.js` — O1 automation (~480 lines, 7 steps)

### Hero block (framework + variation):
- `plugins/sgs-blocks/src/blocks/hero/{block.json, render.php, edit.js, style.css}` — F1/F2 margin attrs + animation removal + max-width leak fix
- `plugins/sgs-blocks/src/blocks/button/{block.json, render.php, edit.js}` — minHeight responsive variants
- `theme/sgs-theme/styles/mamas-munches.json` — palette + variation CSS overrides (button colours, line-height, mobile gap, full-bleed page-id-29 instance)
- `theme/sgs-theme/assets/fonts/fraunces/Fraunces[opsz,wght].woff2` — self-hosted Fraunces (67KB)

### Visual-QA skill upgrade:
- `~/.claude/skills/visual-qa/SKILL.md` — Step 0.5 references global-styles-reset; 9-layer pipeline; L9 mockup parity
- `~/.claude/skills/visual-qa/references/{worked-example-report.md, layer-details.md, run-checklist.md, backlog.md}` — full operator docs

### Documentation:
- `.claude/mistakes.md` — top sections: classifier-trap, wp_global_styles cache, Fraunces silent font-load, single-frame screenshots
- `.claude/specs/common-wp-styling-errors.md` — Sections M, N, O, P, Q (5 new sections, ~25 defect types)
- `.claude/parking.md` — H-1 through H-7 next-session backlog
- `.claude/state.md` — phase = framework-qc-hardening
- `reports/visual-diff/hero-{2026-05-04, 2026-05-04-final, 2026-05-05, 2026-05-05-v2, hero-audit-2026-05-05}.md` — visual diff history
- `reports/parity/hero-*.md` + `.json` — parity validator runs
- `tools/qc-prevention/{F1-F2-margin-attrs, R1-R2-recogniser-extraction, sandybrown-deployment-blocker, full-bleed-pattern-replacement, media-slot-migration}.md` — TODO/spec files

## Notes for next session

- **SSH:** `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`. Domain: `domains/sandybrown-nightingale-600381.hostingersite.com/public_html/`
- **WP admin:** `Claude` / `MigrationSweep2026!` (Mama's). The shared WP app password for REST API is in `~/.openclaw/.secrets/wp-app-passwords.env` as `WP_APP_PWD_MAMAS` (current value may need rotation per H-4 / H-6 verifications)
- **Hero PoC test page:** sandybrown post 29 — `https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29`
- **Mockup:** `python -m http.server 8765` from `sites/mamas-munches/mockups/homepage/`, then `http://localhost:8765/index.html`
- **For variation deploys:** `node scripts/global-styles-reset.js --site sandybrown-nightingale-600381.hostingersite.com --theme sgs-theme --variation mamas-munches` (will need `WP_USER` + `WP_APP_PASSWORD` env vars)
- **For block-attr changes on existing posts:** use Playwright + `wp.blocks.createBlock` + `wp.data.dispatch.replaceBlock` (NOT `updateBlockAttributes` — silently rejected when block has save.js validation error). Will be packaged as `scripts/wp-update-block-attrs.js` per H-6.

## Session reflection

The hero PoC is closed. The QC infrastructure is durable. The framework gaps are captured.

The biggest learning: **automated parity measurements are reliable; classifier passes that reduce severity without screenshot evidence are NOT reliable.** The 2026-05-04 classifier confidently called 50+ deltas "structural noise" and was wrong on at least 4 of them. Bean's eye was the better validator.

The Opus session's mission: bake that lesson into the pipeline structurally so the classifier can never repeat the mistake. Combined with the other 6 hardening tasks, the next 6 hours of focused Opus work should produce a QC pipeline reliable enough for every future client clone to hit 99% on the first pass.
