---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-11
thread: page-8 discrepancy programme — 9 remaining fixes (Cause 1 borders + Cause 2a heights SHIPPED as D306)
---

# NEXT SESSION — finish the page-8 discrepancy programme (9 remaining, all scoped)

Invoke `/autopilot` first. D306 shipped the two biggest causes (all 8 black borders + equal-height cards + brand button). This session executes the **9 remaining fixes**, each with a proven cause + precise scope already in the register — no fresh diagnosis needed. Bean-directed: root-cause-verified, universal, Spec-31-aligned, no cheats; every fix LANDED-proven before it's "done".

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md` — **THE register: all 22 items + the "PRECISE FIX SCOPES for the 9 remaining" section** (file:lines, DB findings, per-fix approach). This is your work-list.
2. `.claude/handoff.md` (D306) + `.claude/decisions.md` head (D306 + D305).
3. **Spec 31 IN FULL** (Bean-locked every session) — esp. §3.A CSS routing, §3 F-fork, §13.4 FR-31-5.1 (absent→initial), FR-31-5.2, §13.5 FR-31-20 (variant/preset detection), §13.6 composite-mirror + D294 clarification, §7b (verify vs draft), AND the cheat catalogue.
4. Spec 32 §6.1 (box-object / no-inline contract) — for the label + inline-styles work.

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's)
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `npm run build` (PowerShell); `python -m pytest plugins/sgs-blocks/scripts/converter/tests -q --import-mode=importlib` (440 pass, 1 skip).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache reset + **CDN clear (`hosting_clearWebsiteCacheV1`, user u945238940, domain sandybrown-…hostingersite.com)** + live computed-style at 375/768/1440. A stale CDN copy misled measures repeatedly.
- **STOP-static-vs-live** — for any "does this class/style land?" use the LIVE DOM (Playwright computed-style / matched-rule enumeration), NEVER static PHP/CSS parsing.
- **STOP-D228** — a framework default (block/theme/wrapper) that overrides the draft's faithfully-ABSENT value is a CHEAT to REMOVE/GATE (emit the draft's effective value, else CSS-initial). Universal, never per-block carve-out (R-31-9).
- **STOP-WP-CORE-SERIALISATION (NEW, D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core's style engine if the property's style-engine definition lacks `css_vars` (proven: shorthand `border-color` drops `var:preset|color|`). When a lifted style value doesn't render, check the WP-core `class-wp-style-engine.php` definition, not just our converter. Fix = emit a form WP serialises (direct `var(...)` / concrete).
- **STOP-VERIFY-CLAIM (NEW, D306)** — do NOT state "X isn't recognised / isn't a button / doesn't target Y" from a failed grep or an inference. Bean caught two such false claims this session (find-out-more IS a button; iconSize IS universal). Verify against the emitted markup / block editor / render code before asserting.
- **STOP-60** — a converter change adding new attrs to cloned output changes conformance goldens. Re-run the suite; re-seed deliberately + LANDED-cited, never blanket.
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; the signal = direct Playwright content-matched computed-style + Bean's eye. IGNORE header/footer + the accepted testimonial static-grid→slider.
- **STOP-67** — pre-commit visual-diff gate BLOCKS the commit without `reports/visual-diff/<block>-<date>.md` (EXACT name, `verdict: PASS` + `first_paint_capture_passed: true`) per CHANGED block (a block whose `src/` changed). Non-visual/logic-only changes: `git commit --no-verify` is the sanctioned bypass.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **safecss strips functional colours** — any INLINE colour VALUE must be hex/named/var (D302); the scoped `<style>` channel is not filtered.
- **Harness/node via PowerShell** (nvm4w shim broken in Git Bash). Python works in Bash.
- **Path-scoped commits** — `git commit -m <msg> -- <paths>`; `git add <file>` for NEW files. Never `git add -A`. No version bumps / deprecations (pre-production). No co-author line. Verify branch (`main`) + D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) before commit.
- **DB seed not in git** — a new block.json attr/`css_property` needs `/sgs-update --stage 1` to reach the DB.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin first: `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty`.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | fix-shape design for the shared-surface changes (hover-typography helper, label pill-style detection) |
| `/gap-analysis` | grade before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | if a fix needs gold-standard reference (auto-routes tier) |
| `/strategic-plan` | order the 9 fixes + shared-surface design-gates |
| `/systematic-debugging` | prove each remaining cause on the live DOM before fixing |
| `/qc-council` | shared-surface fixes (converter / shared wrapper / shared typography helper) before dispatch (blub.db 255) |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (variant_slots, css_property, block schema) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | live computed-style 375/768/1440 + matched-rule enumeration (THE landed gate) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN edge cache — mandatory before a live CSS measure (user u945238940) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env file has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | parallel read-only traces (no browser — Playwright is single-instance); SOLO for coding (one writer) |
| feature-dev:code-reviewer | pre-commit review on converter/shared-surface fixes |

## Tasks (each scope + file:lines in the register's "PRECISE FIX SCOPES" section)

### Task 1 — product-card buttons (2 items; highest visibility)
**What:** featured CTA white text → route to shared `--wp--custom--button-presets--*` channel (`product-card/style.css:238-248`); trial CTA primary→secondary → lift `--secondary` modifier → `ctaPreset` (`array_content.py:148,176`, DB `inherit_style_presets()`) + emit `sgs-button--{$ctaPreset}` (`product-card/render.php:530`).
**Orchestration:** inline (Opus) design + SOLO coding subagent; `/qc-council` the shared-channel change. **Acceptance:** featured button dark-on-token, trial button secondary style, live at 3 breakpoints.

### Task 2 — emoji size (1-row DB seed)
**What:** seed `sgs/icon.iconSize.css_property='font-size'` (block.json declaration → `/sgs-update --stage 1`), so the converter routes the draft `.sgs-info-box__icon{font-size:32px}` → `iconSize`. **Orchestration:** inline. **Acceptance:** emojis render 32px live (matches draft).

### Task 3 — labels (gift + trial; 2 items)
**What:** converter detects a padded-box label (draft bg+padding+radius) → set the pill block-style (`is-style-pill-fill` full-width trial / `is-style-pill-wrap` capsule gift, `label/render.php:96-105` pill-gate) + transfer real padding/bg/radius as attrs. **Orchestration:** `/brainstorming` fix-shape (block-style detection) + SOLO coding. **Acceptance:** trial label full-width, gift labels padded rounded box, live.

### Task 4 — brand + info-box margins (2 items)
**What:** trace why the converter emits `sgs/text` margins over the draft's `*{margin:0}` reset (mis-lift vs default); stop the gap-spacing double-count. **Orchestration:** `/systematic-debugging` on the live DOM + converter trace first. **Acceptance:** brand para + info-box text spacing matches draft.

### Task 5 — announcement hover + disclaimer box + option-picker tick + trustpilot padding (4 items)
**What:** (a) hover: add hover typography to the shared `helpers-typography.php` (universal, Bean-directed) + converter lifts draft `:hover` typography onto the hover attrs; (b) disclaimer: recognise as a container/box (bg+border), not sgs/text; (c) option-picker: keep tick, redesign `::before` so unselected pills don't reserve space (`option-picker/style.css:106-130`); (d) trustpilot: transfer draft padding `18px 24px`. **Orchestration:** each SOLO; `/qc-council` the shared-helper hover addition. **Acceptance:** each verified live vs draft.

### Task 6 — inline-styles architecture (Bean's SEPARATE concern; AFTER the fixes)
**What:** investigate the various `<style>`/style-id/section-style emissions Bean flagged as "still inline, just relocated" — distinguish legitimate scoped `<style>` (Spec 32 §6.1 contract) from genuine inline `style="…"`. Do NOT change anything until precisely classified. **Orchestration:** read-only investigation + present to Bean.

## Dependency graph
```
Task 1 (product-card buttons) ──┐
Task 2 (emoji seed) ────────────┤  (independent; batch code changes)
Task 3 (labels) ────────────────┤
Task 4 (margins) ───────────────┘
        ↓  ONE deploy + reclone + CDN clear
   LANDED verify all at 375/768/1440  →  visual-diff reports  →  commit (D307)
        ↓
Task 5 (hover/disclaimer/tick/trustpilot)  →  deploy + verify  →  commit
        ↓
Task 6 (inline-styles investigation — separate, present to Bean)
```

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Root cause before instance fix; group by shared cause.
- Deploy + OPcache + **CDN clear** + live computed-style BEFORE any measure (STOP-21).
- Design-gate + `/qc-council` on shared-surface changes (converter / shared wrapper / shared typography helper) before building.
- Branch `main`; path-scoped commits; no version bumps / deprecations; no co-author line.
- Every fix universal (R-31-9), no cheat (Spec 31 catalogue). Verify the LIVE painted value (STOP-44), on the REAL draft node (STOP-34). Bean's eye co-authoritative (R-31-13). Never assert a fact from a failed grep/inference (STOP-VERIFY-CLAIM).
