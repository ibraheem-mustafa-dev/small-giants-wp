---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-11
session: D306 — page-8 discrepancy programme: full 22-item diagnosis + Cause 1 (borders) + Cause 2a (equal-height) shipped
---

# Session Handoff — 2026-07-11 (D306)

## Completed This Session

1. **Full evidence-based diagnosis of Bean's 22 page-8 discrepancies** — every item root-caused with live DOM (Playwright computed-style) + code + (for borders) WordPress-core source. Collapse to **3 universal causes** exactly as Bean predicted. Register: `.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md` (includes precise, ready-to-implement scopes for the 9 remaining).
2. **Cause 1 — black borders (8 sections) FIXED + LANDED + pushed.** Root cause is WP-core (not our converter, answering Bean's architecture worry): WP 7.0.1 style-engine drops a `var:preset|color|` value for shorthand `border-color` (no `css_vars`). Fix: `root_supports.py` emits `style.border.color` as a direct `var(--wp--preset--color--{slug})`. Live: #E8D5C0 / #F5D050 accurate on featured/trial/info-box/testimonial.
3. **Cause 2a — unequal cards + brand button FIXED + LANDED.** Flipped `container` `verticalAlign` default `start`→`''` + wrapper fallback → CSS-initial stretch (FR-31-5.1). Cards 495/495; brand button full-width centred.
4. **Re-cloned page 8 twice** (pre-fix baseline, then post-fix); OPcache + CDN cleared each time; verified at 800/1440.
5. **Answered Bean's 3 architecture questions with DB/code ground truth** (Q1 pill-gating, Q2 hover-typography-only gap, Q3 iconSize `css_property=None`). Corrected two of my own earlier sloppy claims (find-out-more IS a button; iconSize IS universal) — Bean caught both.

## Current State
- **Branch:** `main` at `0908ff92` (D306 pushed).
- **Tests:** converter suite **440 pass, 1 skip**. **Build:** green (all prebuild gates).
- **Deploy:** sandybrown plugin deployed; page 8 = fresh clone with D306 fixes LANDED.
- **Uncommitted changes:** handoff docs (this commit) + pre-existing untracked `plugins/sgs-framework.db` / `sgs-framework.db` (DB, gitignored-style, not committed) + a few stale `reports/phase4-*.txt` (pre-existing, unrelated).

## Known Issues / Blockers
- None block the next session. 9 discrepancy items remain, each with a proven cause + precise scope in the register.

## Next Priorities (in order)
1. **Featured button white text + trial button preset** (product-card CTAs) — route product-card CTA colour to the shared button-preset token channel; lift `--secondary` modifier → `ctaPreset` + emit the class.
2. **Emoji size** — seed `sgs/icon.iconSize.css_property='font-size'` (one DB row via block.json → `/sgs-update`).
3. **Labels (gift + trial)** — converter detects a padded-box label → set the pill block-style (`is-style-pill-fill`/`pill-wrap`) + transfer real padding/bg/radius.
4. **Brand + info-box margins** — trace why converter emits `sgs/text` margins over the draft's `*{margin:0}` reset; stop the gap-spacing double-count.
5. **Announcement hover + disclaimer box + option-picker tick-space + trustpilot padding** — the smaller remaining items (see register scopes).

## Files Modified
| File | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/converter/services/root_supports.py` | Cause 1: border-color → direct css var (WP-core serialisation fix) |
| `plugins/sgs-blocks/src/blocks/container/block.json` | Cause 2a: `verticalAlign` default `start`→`''` |
| `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` | Cause 2a: wrapper fallback `?? 'start'`→`?? ''` |
| `reports/visual-diff/{container,border-color-and-vertical-align}-2026-07-11.md` (NEW) | LANDED reports |
| `.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md` (NEW) | full register + per-fix scopes |
| `.claude/{decisions.md,state.md,handoff.md,next-session-prompt.md}` | D306 records |

## Notes for Next Session
- **Cause 1 is a WP-core limitation, NOT a converter/theme bug** — do not "re-fix" it elsewhere; the direct-var emit is the load-bearing fix. Bean asked whether hex-fallback should be used instead (theme-var chosen for theme-faithfulness — swap to hex is a one-liner if he prefers).
- **The 9 remaining are converter routing/lift gaps + one shared-helper addition (hover typography)** — the block capabilities + no-hardcoding audit are intact; the pipeline just isn't feeding these values through.
- **Bean-directed on labels:** transfer CSS as attributes, not force a variant — BUT the label padding is structurally pill-gated, so the pill block-style IS required (combined with real value transfer).
- **STOP-21 discipline held:** every LANDED claim = deploy + OPcache + `hosting_clearWebsiteCacheV1` (CDN) + live computed-style. Never trust emit-green.

## Next Session Prompt
See `.claude/next-session-prompt.md`.
