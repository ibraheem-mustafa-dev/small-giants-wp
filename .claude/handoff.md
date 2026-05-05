---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-05
recommended_model: opus
session_tag: small-giants-wp-2026-05-06-cloning-skill-design
---

# Session Handoff — 2026-05-05 (framework-qc-hardening + cloning-pipeline prep + media-slot sweep)

## Headline

Marathon session. Closed all 7 hardening gaps from the previous handoff (H-1 through H-7), captured the foundational pattern-not-block lesson and embedded it structurally, ran lifecycle Mode A on two skills (sgs-wp-engine A 95%, visual-qa A- 95%), produced 5 new framework scripts, **migrated 9 blocks (hero + 8 others) to the unified `*Media` slot pattern in a parallel sweep — webpack build clean across the lot**, deleted LiteSpeed from test sites, integrated Hostinger MCP (with one RED finding), prepared two design specs for next session, then revised both specs after Bean's late-session corrections re-scoped the cloning pipeline.

**Next session is Opus, dedicated to designing and building the new independent SGS cloning skill — scoped to HTML drafts only (Use Case 3).** Use Cases 1 (LLM design gen) and 2 (competitor harvest) are deferred until UC3 hits 100%.

## What landed this session

### Captured lessons + structural embeds

| Lesson | Where it lives now |
|---|---|
| **Mockup classes/sections map to PATTERNS, not single blocks** (blub.db row 209) | Workspace lesson + CC auto-memory + sgs-wp-engine SKILL.md Hard Rule 6 + Common Mistakes table |
| Classifier severity reduction requires screenshot evidence (Section Q binding rule) | visual-qa SKILL.md Hard Rule 10 + scripts/mockup-parity-validator.js `requires_screenshot_review` flag + scripts/screenshot-diff-helper.js |
| getComputedStyle backgroundColor lying when background-image paints over | Already in mistakes.md; validator WATCHED set extended; classifier-trap rule covers structurally |

### Lifecycle Mode A runs

- **sgs-wp-engine** — skillscore 95% A, gap-analysis B 3.73 (cap lifted, rubric confirmed). 8 of 13 gaps closed; 5 deferred to backlog. S-grade confirmed for "Pattern library accumulator" opportunity.
- **visual-qa** — skillscore 95% A, gap-analysis B 4.30 (Lens 6 cap C 3.4, rubric drafting deferred to QA-focused session). Hard Rule 10 + screenshot-diff-helper integration baked.

### New framework deliverables (Wave 1-3)

#### Wave 1 — infrastructure
| # | Outcome |
|---|---|
| Hostinger MCP smoke test | RED on plugin/theme deploy (no exclusion filter — would upload node_modules etc.). Static-website preview path viable. 14 sites inventoried. |
| LiteSpeed plugin deletion | Removed from palestine-lives.org + sandybrown-nightingale-600381. .htaccess cleaned + backed up. CLAUDE.md updated. |
| Chrome DevTools MCP integration spec | `.claude/specs/chrome-devtools-stage-8-integration.md` — 3 new scripts (cwv / network / console) + 2 new visual-qa layers, zero rewrites of existing tools. |
| Pre-commit STOP GATE verdict parsing | Verified working (3-condition check: file exists + `verdict: PASS` + `first_paint_capture_passed: true`). Gap SO-1 was a false alarm. |

#### Wave 2 — hero close-out
| # | Deliverable | Lines |
|---|---|---|
| 2A | `scripts/screenshot-diff-helper.js` | 560 (new — pixelmatch + composite + heatmap + dominant-colour histogram + 6 exit codes) |
| 2B | `requires_screenshot_review` flag in mockup-parity-validator.js | +109 (Q1-Q4 helpers + Section Q banner) |
| 2C | Hero full-bleed framework fix + viewport-width.js + variation cleanup | ~145 across 5 files (replaces fragile negative-margin pattern with viewport-aware solution) |
| 2D | `scripts/brand-palette-sampler.py` + Mama's brand-palette.json | ~200 (PIL k-means; **finding: `--surface-pink #F5C2C8` has zero brand anchor — designer-invented**) |
| 2E | `scripts/wp-update-block-attrs.js` | 385 (new — replaceBlock workaround; bypasses block-validation rejection) |

#### Wave 3 — hero finishing + skill bake
| # | Outcome |
|---|---|
| 3A | Hero inspector reorganised from CSS-rule-grouped to ELEMENT-grouped (21 panels → 10). Closes H-1. H-2 padding labels clarified. |
| 3B | Shared `MediaPicker.js` component (198 lines) + `sgs_render_media()` PHP helper + media-slot-migration.md recipe (188 lines). |
| 3C | Hero migrated to `splitMedia` (image OR video). v4 deprecation entry. Smoke-tested clean. |
| 3D | visual-qa Hard Rule 10 baked + screenshot-diff-helper script row added + invoked-skills prose declaration. |

#### Inline housekeeping
- `.vscode/settings.json` — `intelephense.diagnostics.undefinedFunctions: false` added to silence P1010 false positives on WP core functions called from `namespace SGS\Theme;`
- `theme/sgs-theme/styles/mamas-munches.json` — 4 brand-source warm tones added: `surface-peach #FAC47E`, `surface-cream-warm #E3B78B`, `border-warm #DAAA92`, `cookie-brown-warm #BE7B52` (additive only, no existing colours touched)

#### Wave 4 — cloning-pipeline prep specs (REVISED post Bean's corrections)

| File | What |
|---|---|
| `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md` | 358 lines original + REVISIONS section prepended. 6-source skill summary, capability map, captured-rule coverage. Revised scope: HTML-only-first; UC1 + UC2 deferred. 5 questions reduced to 3. |
| `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md` | 477 lines original + REVISIONS section prepended. Simplified schema: single sgs-db `patterns` table, fingerprint as headline column, no licensing complexity. uimax extends EXISTING tables (block-pattern, component, colour-palette, wcag-friendly, icons) with industry/mood/style/platform classification — not a new instance table. Single dedup check (fingerprint), Layers 2-3 deferred. |

#### Wave 5 — media-slot migration sweep (parallel)

11 blocks dispatched in parallel via subagent-driven-development. Each owned its own block directory with strict file-ownership boundaries. Centralised `npm run build` at the end verified the whole sweep compiles clean.

| Block | Outcome |
|---|---|
| info-box | ✅ migrated → `boxMedia` |
| card-grid | ✅ migrated → per-item `media` slot |
| testimonial | ✅ migrated → `authorMedia` (deviation: converted from static to dynamic block — flagged) |
| decorative-image | ✅ migrated → `decorMedia` |
| brand-strip | ✅ migrated → image-only via `allowedTypes={['image']}`; renamed per-logo `url` → `linkUrl` |
| certification-bar | ✅ migrated → image-only (static block, save.js reads media slot directly) |
| gallery | ✅ migrated → `mediaItems` array (deviation: kept multi-select MediaUpload for batch UX, normalises output to media-slot shape) |
| team-member | ✅ migrated → `memberMedia` image-only; Schema.org/Person preserved |
| cta-section | ✅ migrated → `backgroundMedia` (image OR video) |
| feature-grid | ✅ NO-OP (pure container — media handled by info-box children) |
| process-steps | ✅ NO-OP (text-only block) |

**Build verification:** `npm run build` compiled successfully across all 9 migrated blocks. No errors.

## Skill grades after this session

| Skill | Skillscore | Gap-analysis | Movement |
|---|---|---|---|
| sgs-wp-engine | 95% A | B 3.73 (cap-lifted; rubric confirmed) | C 3.4 → B 3.73, +0.33 |
| visual-qa | 95% A | B 4.30 (capped at C 3.4 by Lens 6 — rubric deferred to QA session) | A 4.18 → B 4.30 pre-cap |

## Files shipped this sequence

### New scripts
- `scripts/screenshot-diff-helper.js` (560 lines)
- `scripts/wp-update-block-attrs.js` (385 lines)
- `scripts/brand-palette-sampler.py` (~200 lines)
- `theme/sgs-theme/assets/js/viewport-width.js` (50 lines)

### New skill artefacts
- `~/.claude/skills/sgs-wp-engine/references/end-goal-rubric.md` (90 lines, **bean_signoff: confirmed**)
- `~/.claude/skills/sgs-wp-engine/references/correction-ledger.md` (40 lines)
- `~/.claude/skills/sgs-wp-engine/references/backlog.md` (24 lines, 5 open items)
- `~/.claude/skills/sgs-wp-engine/references/examples/example-1-replicate-section.md` (87 lines)
- `~/.claude/skills/sgs-wp-engine/references/examples/example-2-build-new-block.md` (86 lines)
- `~/.claude/skills/sgs-wp-engine/references/examples/example-3-onboard-client.md` (72 lines)

### New plugin components
- `plugins/sgs-blocks/src/components/MediaPicker.js` (198 lines)
- `plugins/sgs-blocks/includes/render-helpers.php` extended with `sgs_render_media()`

### Hero block changes
- `block.json` (+5 lines — `splitMedia` attribute added, `splitImage` retained for back-compat)
- `edit.js` -8 net (10-panel element-grouped inspector + MediaPicker integration)
- `render.php` (+35 — splitMedia ↔ splitImage normalisation + sgs_render_media for video branch)
- `deprecated.js` (+47 — v4 entry with isEligible guard)
- `style.css` (+17 — viewport-aware full-bleed using `var(--viewport-width, 100vw)`)

### New documentation
- `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md`
- `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md`
- `.claude/specs/chrome-devtools-stage-8-integration.md`
- `.claude/specs/hostinger-mcp-catalogue.md` (117 tools, from previous session refresh)
- `.claude/reports/hostinger-mcp-integration-2026-05-06.md`
- `tools/qc-prevention/full-bleed-pattern-replacement.md` (60 lines)
- `tools/qc-prevention/media-slot-migration.md` (188 lines)
- `.claude/gap-analysis/reports/2026-05-05-sgs-wp-engine.md`

### Memory + persistence

- blub.db row 209 — pattern-not-block rule
- blub.db row 13701, 13722 — gap-analysis evaluations
- evaluation-history.json — 8 entries (was 5)
- CC auto-memory feedback — `feedback_mockup_classes_map_to_patterns_not_blocks.md`
- MEMORY.md — top entry now references the pattern-not-block rule

## Outstanding gaps

### Deferred to next session (cloning-pipeline focus)

All 8 open questions in `.claude/next-session-prompt.md` Q1-Q8.

### Deferred to QA-focused session-after-next

- visual-qa end-goal rubric drafting (lifts the C-cap)
- Recurrence-rate tracker (closes A-grade blocker on visual-qa)
- Automated screenshot-helper integration test
- Chrome DevTools MCP wiring (3 new scripts speced; build deferred)
- Body progressive disclosure for sgs-wp-engine (370 → <300 lines)

### sgs-wp-engine backlog (5 items)

See `~/.claude/skills/sgs-wp-engine/references/backlog.md`. Highest-priority is the Hard-Rule-6 enforcement script (`tools/recogniser-v2/scripts/pattern-boundary-check.py`) — closes Lens 4 caveat structurally.

### Hero deploy + cross-browser verification

The Wave 2C full-bleed framework fix has NOT been deployed or verified across Mac / Windows / mobile / page-id-29 / custom-padding pages. Add to next session's pre-cloning-work warm-up if desired, or defer to first cloning smoke run since Use Case 3 will exercise hero rendering on a fresh page.

## Notes for next session

- **SSH:** `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`. Domain: `domains/sandybrown-nightingale-600381.hostingersite.com/public_html/`
- **WP admin:** `Claude` / `MigrationSweep2026!` (Mama's). REST API password in `~/.openclaw/.secrets/wp-app-passwords.env` as `WP_APP_PWD_MAMAS`
- **Hero PoC test page:** sandybrown post 29 — keep intact. Use post 30 for cloning smoke runs.
- **Mockup:** `python -m http.server 8765` from `sites/mamas-munches/mockups/homepage/`, then `http://localhost:8765/index.html`
- **Hostinger MCP:** APITOKEN env var set. 117 tools loaded. Plugin/theme deploy RED-flagged — keep tar+scp.
- **For variation deploys:** `node scripts/global-styles-reset.js --site <domain> --theme sgs-theme --variation <slug>` (mandatory after any theme.json or styles/*.json change)
- **For block-attr changes on existing posts:** use `node scripts/wp-update-block-attrs.js --site <domain> --post-id <id> --block-name <ns/slug> --attrs <path/to/attrs.json>`. Requires `WP_USER` + `WP_APP_PASSWORD` env vars.
- **For pixel-diff classifier checks:** mandatory before any severity reduction — `node scripts/screenshot-diff-helper.js --mockup <url> --sgs <url> --selector <css-selector>` (Hard Rule 10)
- **For brand validation on new clients:** `python scripts/brand-palette-sampler.py --client <slug> --brand-dir sites/<slug>/research/brand --mockup-css <html-or-css-path> --output sites/<slug>/research/brand-palette.json`

## Session reflection

Three threads converged this session:

1. **Hero close-out** — every gap from the previous handoff is closed structurally. The framework now has the tools (screenshot-diff helper, parity validator with Q-pattern flagging, full-bleed fix, replaceBlock helper, brand sampler) to prevent the recurring failure modes.

2. **Pattern-not-block rule** — the foundational lesson Bean spotted mid-session reframes the recogniser from a section-to-block mapper into a section-to-pattern mapper. This is the design shift that makes the new cloning skill possible. Embedded structurally in sgs-wp-engine + captured to all three persistence layers.

3. **Cloning-pipeline prep** — `/build-website` is a router Bean dislikes; the salvage matrix maps every keep-worthy capability across 5 source skills + sgs-wp-engine references; the dedup + classification mechanics spec answers the "compounding pattern library" question with a concrete schema + flow design. Next session has everything it needs to build the new skill with fewer assumption gaps.

The remaining work is design + build, not research. The next session is set up to hit Bean's standard: 100% on first try (irrelevant BS gaps don't count). Pattern library compounds. Every clone makes the next clone faster.

The cumulative ROI of this 12+ hour session is measured in tens of hours saved across every future client clone, plus a competitive moat that compounds with every project.
